import { CodeExecutor } from './code-executor';
import type { PluginTaskRequest, PluginTaskResponse } from './plugin-types';

/**
 * Canal WebSocket entre la sandbox Penpot et le backend.
 *
 * Flux principal :
 * 1) `connect()` ouvre la socket vers le backend Spring.
 * 2) `onmessage` parse la tâche (`PluginTaskRequest`) et délègue au `CodeExecutor`.
 * 3) Le résultat est renvoyé au backend en `PluginTaskResponse`.
 *
 * Résilience :
 * - reconnexion automatique exponentielle (1s, 2s, 4s... max 30s)
 * - arrêt explicite de la reconnexion lors d'une fermeture manuelle (`disconnect`)
 *
 * Important :
 * - ce client ne persiste pas les messages si la socket est fermée.
 * - les payloads invalides sont rejetés; si un `id` existe, une erreur corrélable est renvoyée.
 */
export class WebSocketClient {
    private ws: WebSocket | null = null;
    private readonly executor = new CodeExecutor();

    private reconnectAttempts = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private manuallyClosed = false;

    constructor(private readonly url: string) {}

    /**
     * Ouvre la connexion WebSocket si aucune connexion n'est déjà ouverte/en cours.
     * Réinitialise le mode "fermeture manuelle" pour autoriser la reconnexion auto.
     */
    connect(): void {
        if (this.isOpenOrConnecting()) {
            return;
        }

        this.manuallyClosed = false;
        this.clearReconnectTimer();

        try {
            console.log(`[WebSocketClient] Connecting to ${this.url}`);
            this.ws = new WebSocket(this.url);
            this.registerHandlers(this.ws);
        } catch (error) {
            console.error('[WebSocketClient] Failed to initialize WebSocket:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * Ferme explicitement la socket et désactive les tentatives de reconnexion.
     * À utiliser lors de la fermeture du plugin Penpot.
     */
    disconnect(): void {
        this.manuallyClosed = true;
        this.clearReconnectTimer();

        if (this.ws) {
            try {
                this.ws.close();
            } catch (error) {
                console.error('[WebSocketClient] Error while closing WebSocket:', error);
            }
        }

        this.ws = null;
    }

    /**
     * Attache tous les handlers WebSocket à une instance donnée.
     * - `onopen`: reset du compteur de retry
     * - `onmessage`: traitement de tâche
     * - `onerror` / `onclose`: planification de reconnexion
     */
    private registerHandlers(socket: WebSocket): void {

        socket.onopen = () => {
        console.log('[WebSocketClient] WebSocket connection established');
        this.reconnectAttempts = 0;
        };

        socket.onmessage = (event: MessageEvent<string>) => {
            void this.handleIncomingMessage(event.data);
        };

        socket.onerror = (event: Event) => {
            console.error('[WebSocketClient] WebSocket error:', event);
            this.scheduleReconnect();
        };

        socket.onclose = () => {
            console.warn('[WebSocketClient] WebSocket connection closed');
            this.ws = null;

            if (!this.manuallyClosed) {
                this.scheduleReconnect();
            }
        };
    }

    /**
     * Traite un message brut reçu du backend :
     * - parse JSON
     * - validation de structure
     * - exécution via CodeExecutor
     * - réponse sérialisable renvoyée au backend
     */
    private async handleIncomingMessage(rawMessage: string): Promise<void> {
        let payload: unknown;

        try {
            payload = JSON.parse(rawMessage) as unknown;
        } catch (error) {
            console.error('[WebSocketClient] Invalid JSON received:', error);

            // Ici on ne peut pas répondre correctement sans id fiable.
            return;
        }

        if (!this.isValidTaskRequest(payload)) {
            console.error('[WebSocketClient] Invalid PluginTaskRequest payload:', payload);

            if (this.hasTaskId(payload)) {
                this.send({
                    id: payload.id,
                    success: false,
                    error: 'Invalid PluginTaskRequest payload',
                });
            }

            return;
        }

        const task = payload;
        const executionResult = await this.executor.execute(task);

        const response: PluginTaskResponse = {
            id: task.id,
            success: executionResult.success,
            data: executionResult.data,
            error: executionResult.error,
        };

        this.send(response);
    }

    /**
     * Envoie une réponse d'exécution au backend si la socket est ouverte.
     * Les erreurs de sérialisation/envoi sont journalisées mais ne crashent pas le plugin.
     */
    private send(response: PluginTaskResponse): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('[WebSocketClient] Cannot send response: socket is not open');
            return;
        }

        try {
            const payload = JSON.stringify(response);
            this.ws.send(payload);
        } catch (error) {
            console.error('[WebSocketClient] Failed to send response:', error);
        }
    }

    /**
     * Planifie une tentative de reconnexion avec backoff exponentiel plafonné à 30s.
     * N'exécute rien si :
     * - la fermeture est manuelle
     * - un timer existe déjà
     * - une connexion est déjà en cours
     */
    private scheduleReconnect(): void {
        if (this.manuallyClosed || this.reconnectTimer) {
            return;
        }

        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            return;
        }

        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);

        console.log(
            `[WebSocketClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`
        );

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.reconnectAttempts += 1;
            this.connect();
        }, delay);
    }

    /**
     * Annule le timer de reconnexion s'il existe.
     */
    private clearReconnectTimer(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    /**
     * Indique si la socket est déjà ouverte ou en cours d'ouverture.
     */
    private isOpenOrConnecting(): boolean {
        return (
            this.ws !== null &&
            (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
        );
    }

    /**
     * Type guard du payload attendu depuis le backend.
     * Exige au minimum un `id` string et `params.code` string.
     */
    private isValidTaskRequest(task: unknown): task is PluginTaskRequest {
        if (typeof task !== 'object' || task === null) {
            return false;
        }

        const candidate = task as Partial<PluginTaskRequest>;

        return (
            typeof candidate.id === 'string' &&
            (candidate.task === undefined || typeof candidate.task === 'string') &&
            typeof candidate.params === 'object' &&
            candidate.params !== null &&
            typeof candidate.params.code === 'string'
        );
    }

    /**
     * Type guard minimal pour extraire un `id` corrélable
     * même si le payload complet est invalide.
     */
    private hasTaskId(payload: unknown): payload is { id: string } {
        if (typeof payload !== 'object' || payload === null) {
            return false;
        }

        return 'id' in payload && typeof payload.id === 'string';
    }
}

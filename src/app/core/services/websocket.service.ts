import { Injectable, inject, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { PluginTaskRequest, TaskResponseEnvelope } from '../models';
import { PluginBridgeService, SessionStore, ReconnectionManager } from '.';
import { WEBSOCKET_URL } from '../tokens/api.tokens';

/**
 * Service de transport WebSocket entre l'UI Angular et le backend Spring Boot.
 *
 * Ce service est le **seul point de contact** avec l'API WebSocket native du
 * navigateur. Il gère le cycle de vie complet de la connexion et délègue
 * toute logique d'état ou de routage à ses collaborateurs (principe SRP).
 *
 * ### Responsabilités
 * 1. Ouvrir et maintenir la connexion WS vers Spring Boot.
 * 2. Mettre à jour le statut de connexion dans {@link PluginBridgeService}
 *    (source unique de vérité).
 * 3. Stocker le `sessionId` reçu du backend dans {@link SessionStore}.
 * 4. Recevoir les tâches du backend et les transmettre à `plugin.ts`
 *    via {@link PluginBridgeService.send}.
 * 5. Écouter {@link PluginBridgeService.taskResult$} et renvoyer les résultats
 *    au backend encapsulés dans un {@link TaskResponseEnvelope}.
 * 6. Gérer la reconnexion automatique avec backoff exponentiel
 *    via {@link ReconnectionManager}.
 *
 * ### Contrainte sandbox Penpot
 * Le worker `plugin.ts` s'exécute dans un sandbox isolé qui n'a pas accès
 * aux APIs browser natives (`WebSocket`, `fetch`, etc.). La connexion WS
 * doit donc impérativement vivre dans cette iframe Angular.
 *
 * @public
 * @since 1.0.0
 * @see {@link WEBSOCKET_URL} Token fournissant l'URL de connexion.
 * @see {@link PluginBridgeService} Transport postMessage vers plugin.ts.
 * @see {@link SessionStore} Store du sessionId partagé avec ChatFacadeService.
 * @see {@link ReconnectionManager} Stratégie de reconnexion exponentielle.
 */
@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {

    // ── Dépendances ───────────────────────────────────────────────────────────

    /** URL WebSocket résolue au build depuis les variables d'environnement. */
    private readonly _wsUrl = inject(WEBSOCKET_URL);

    /** Bridge postMessage - reçoit les mises à jour de statut et les tâches à relayer. */
    private readonly _bridge = inject(PluginBridgeService);

    /** Store partagé du sessionId WebSocket, lu par ChatFacadeService pour les requêtes HTTP. */
    private readonly _session = inject(SessionStore);

    // ── État interne ──────────────────────────────────────────────────────────

    /** Instance WebSocket native courante. `null` avant la première connexion. */
    private _ws: WebSocket | null = null;

    /** Subject de destruction, complété dans `ngOnDestroy` pour terminer les Observables internes. */
    private readonly destroy$ = new Subject<void>();

    /**
     * Gestionnaire de reconnexion avec backoff exponentiel.
     *
     * Configuré avec :
     * - 10 tentatives maximum
     * - Délai de base de 1 000 ms (doublé à chaque tentative, plafonné à 30 s)
     * - Callback qui appelle {@link connect} à chaque tentative
     */
    private readonly reconnection = new ReconnectionManager(
        10,
        1_000,
        (attempt) => {
            console.log(`[OllMark WS] Reconnect attempt ${attempt}/10`);
            this._connect();
        }
    );

    // ── Cycle de vie ──────────────────────────────────────────────────────────

    /**
     * Ouvre la connexion WebSocket et démarre l'écoute des résultats de tâches.
     *
     * L'initialisation est volontairement effectuée dans le constructeur
     * (et non dans `ngOnInit`) car `WebSocketService` est `providedIn: 'root'`
     * et doit établir la connexion dès son instanciation, avant même qu'un
     * composant ne soit rendu.
     */
    constructor() {
        this._connect();
        this._listenForTaskResults();
    }

    /**
     * Libère toutes les ressources à la destruction du service.
     *
     * - Complète `destroy$` pour terminer le `takeUntil` de `listenForTaskResults`.
     * - Ferme le WebSocket natif proprement.
     * - Annule le timer de reconnexion en cours s'il existe.
     */
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this._ws?.close();
        this.reconnection.destroy();
    }

    // ── API publique ──────────────────────────────────────────────────────────

    /**
     * Sérialise et envoie un objet JSON au backend Spring Boot via WebSocket.
     *
     * Si le WebSocket n'est pas dans l'état `OPEN`, le message est abandonné
     * et un avertissement est loggué. Cette méthode ne lève jamais d'exception.
     *
     * @param msg - Objet à sérialiser et envoyer. Doit être sérialisable en JSON.
     *
     * @example
     * ```typescript
     * // Envoi d'une TaskResponseEnvelope
     * this.send({
     *   type: 'task-response',
     *   response: { id: '...', success: true, data: { result: null, log: '' } },
     * });
     * ```
     *
     * @public
     */
    send(msg: object): void {
        if (this._ws?.readyState === WebSocket.OPEN) {
            this._ws.send(JSON.stringify(msg));
        } else {
            console.warn('[OllMark WS] Cannot send: WebSocket not open');
        }
    }

    /**
     * Ouvre la connexion WebSocket et enregistre les handlers d'événements.
     *
     * ### Guard d'idempotence
     * Si une connexion est déjà en cours ou établie (`readyState <= OPEN`),
     * la méthode retourne immédiatement sans ouvrir une seconde connexion.
     *
     * ### Handlers d'événements
     *
     * | Événement   | Action                                                          |
     * |-------------|------------------------------------------------------------------|
     * | `onopen`    | Réinitialise le compteur de reconnexion, passe le statut à `'connected'` |
     * | `onmessage` | Parse le JSON et route vers `session.set()` ou `handleBackendMessage()` |
     * | `onclose`   | Vide le `sessionId`, passe le statut à `'disconnected'`, planifie une reconnexion |
     * | `onerror`   | Passe le statut à `'error'`                                      |
     *
     * @private
     */
    private _connect(): void {
        if (this._ws && this._ws.readyState <= WebSocket.OPEN) return;
        this._bridge.setConnectionStatus('connecting');

        try {
            this._ws = new WebSocket(this._wsUrl);
        } catch (err) {
            console.error('[OllMark WS] Failed to create WebSocket:', err);
            this._bridge.setConnectionStatus('disconnected');
            return;
        }

        this._ws.onopen = () => {
            console.log('[OllMark WS] Connected to', this._wsUrl);
            this.reconnection.reset();
            this._bridge.setConnectionStatus('connected');
        };

        this._ws.onmessage = ({ data }: MessageEvent) => {
            try {
                const payload = JSON.parse(data as string);

                if (payload.type === 'session-id') {
                    this._session.set(payload.sessionId);
                    console.log('[OllMark WS] Session ID stored:', payload.sessionId);
                    return;
                }

                this._handleBackendMessage(payload as PluginTaskRequest);
            } catch (err) {
                console.error('[OllMark WS] Failed to parse message:', err);
            }
        };

        this._ws.onclose = ({ code, reason }: CloseEvent) => {
            console.warn('[OllMark WS] Closed', code, reason);
            this._session.clear();
            this._bridge.setConnectionStatus('disconnected');
            if (!this.reconnection.schedule()) {
                console.error('[OllMark WS] Max reconnect attempts reached');
            }
        };

        this._ws.onerror = () => {
            console.error('[OllMark WS] Error');
            this._bridge.setConnectionStatus('error');
        };
    }

    /**
     * Route un message reçu du backend Spring Boot vers `plugin.ts`.
     *
     * Reçoit un {@link PluginTaskRequest} et le transmet à `plugin.ts` via
     * {@link PluginBridgeService.send} sous la forme d'un message `'execute-task'`.
     * Les messages malformés (sans `id` ou sans `task`) sont ignorés silencieusement.
     *
     * @param payload - Tâche reçue du backend, attendue comme un {@link PluginTaskRequest}.
     *
     * @private
     * @see {@link PluginBridgeService.send} Méthode qui envoie le message à `plugin.ts`.
     */
    private _handleBackendMessage(payload: PluginTaskRequest): void {
        if (!payload?.id || !payload?.task) return;
        console.log('[OllMark WS] Task received:', payload.task, payload.id);
        this._bridge.send({
            type: 'execute-task',
            taskId: payload.id,
            task: payload.task,
            params: payload.params,
        });
    }

    /**
     * Souscrit à `taskResult$` et renvoie chaque résultat au backend via WebSocket.
     *
     * Chaque résultat de tâche émis par {@link PluginBridgeService.taskResult$}
     * est encapsulé dans un {@link TaskResponseEnvelope} et envoyé au backend
     * via {@link send}. Le backend (handler `PluginWebSocketHandler`) attend
     * ce format pour corréler la réponse avec la tâche d'origine.
     *
     * L'Observable est automatiquement complété par `takeUntil(this.destroy$)`
     * lors de la destruction du service, évitant les fuites mémoire.
     *
     * @private
     * @see {@link PluginBridgeService.taskResult$} Source du flux de résultats.
     * @see {@link TaskResponseEnvelope} Format attendu par le backend.
     */
    private _listenForTaskResults(): void {
        this._bridge.taskResult$
            .pipe(takeUntil(this.destroy$))
            .subscribe((result) => {
            const envelope: TaskResponseEnvelope = {
                type: 'task-response',
                response: {
                    id: result.taskId,
                    success: result.success,
                    data: result.data ?? null,
                    error: result.error ?? null,
                },
            };
            this.send(envelope);
        });
    }
}
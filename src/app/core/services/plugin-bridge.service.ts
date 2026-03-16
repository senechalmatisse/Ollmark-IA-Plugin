import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { Subject, fromEvent, takeUntil } from 'rxjs';
import { PluginMessage, ConnectionStatus } from '../models';
import { PENPOT_ORIGIN } from '../tokens/api.tokens';

/**
 * Résultat d'une tâche exécutée par `plugin.ts`, émis sur {@link PluginBridgeService.taskResult$}.
 *
 * Ce type est la forme interne normalisée du variant `'task-result'` de
 * l'union {@link PluginMessage}. Il est consommé par {@link WebSocketService}
 * pour construire l'enveloppe {@link TaskResponseEnvelope} renvoyée au backend.
 *
 * @internal
 * @see {@link PluginBridgeService.taskResult$} Subject qui émet ces objets.
 */
interface TaskResult {

    /** Identifiant de la tâche d'origine, permettant la corrélation côté backend. */
    taskId: string;

    /** `true` si la tâche s'est exécutée sans erreur dans `plugin.ts`. */
    success: boolean;

    /** Données retournées par la tâche. `null` en cas d'échec. */
    data: unknown;

    /** Message d'erreur. `null` si `success` est `true`. */
    error: string | null;
}

/**
 * Service de transport `postMessage` entre l'iframe Angular et le worker `plugin.ts`.
 *
 * Ce service est le **seul point de contact** avec l'API `postMessage` de Penpot.
 * Il masque la complexité de `window.addEventListener('message', ...)` et
 * `window.parent.postMessage(...)` derrière une interface typée et réactive
 * (pattern Facade).
 *
 * ### Responsabilités
 * 1. Écouter les messages entrants depuis `plugin.ts` via `window.message`.
 * 2. Router les messages reçus vers les signaux ou Subjects appropriés.
 * 3. Poster des messages typés vers `plugin.ts` via `window.parent.postMessage`.
 * 4. Exposer `setConnectionStatus()` pour que {@link WebSocketService} mette
 *    à jour la source unique de vérité du statut WS.
 * 5. Émettre `taskResult$` lorsque `plugin.ts` complète une tâche.
 *
 * ### Ce service ne fait PAS
 * - Appels HTTP
 * - Chargement d'historique
 * - Logique métier
 *
 * @public
 * @since 1.0.0
 * @see {@link PENPOT_ORIGIN} Token fournissant l'origine cible sécurisée.
 * @see {@link WebSocketService} Consommateur de `taskResult$` et appelant de `setConnectionStatus`.
 * @see {@link ChatFacadeService} Réagit au signal `projectId` pour déclencher l'historique.
 * @see {@link PluginMessage} Union discriminée des messages échangés.
 */
@Injectable({ providedIn: 'root' })
export class PluginBridgeService implements OnDestroy {

    // ── État réactif public ───────────────────────────────────────────────────

    /**
     * Signal contenant l'identifiant de la page Penpot active.
     * Initialisé à `null` ; mis à jour lors de la réception du message
     * `'project-response'` en provenance de `plugin.ts`.
     *
     * La valeur `null` indique que le handshake initial n'est pas encore complété.
     */
    readonly projectId = signal<string | null>(null);

    /**
     * Signal contenant l'état courant de la connexion WebSocket.
     * Source unique de vérité pour le statut WS dans toute l'application.
     * Mis à jour exclusivement par {@link WebSocketService} via {@link setConnectionStatus}.
     *
     * @defaultValue `'disconnected'`
     */
    readonly connectionStatus = signal<ConnectionStatus>('disconnected');

    /**
     * Signal contenant le thème Penpot actif (`'light'` | `'dark'`).
     * Initialisé depuis le paramètre `?theme=` de l'URL de l'iframe
     * (injecté par `plugin.ts` lors de `penpot.ui.open(..., \`?theme=${penpot.theme}\`)`).
     * Mis à jour à chaque réception du message `'theme'` de `plugin.ts`.
     */
    readonly theme = signal<'light' | 'dark'>(this._readThemeFromUrl());

    /**
     * Subject émettant les résultats des tâches exécutées par `plugin.ts`.
     * Consommé par {@link WebSocketService} pour renvoyer le résultat au backend
     * Spring Boot via WebSocket (encapsulé dans {@link TaskResponseEnvelope}).
     *
     * Le Subject est complété dans {@link ngOnDestroy} pour libérer les abonnements.
     */
    readonly taskResult$ = new Subject<TaskResult>();

    // ── État privé ────────────────────────────────────────────────────────────

    /** Subject de destruction, complété dans `ngOnDestroy` pour terminer les Observables internes. */
    private readonly destroy$ = new Subject<void>();

    /** Origine cible résolue depuis {@link PENPOT_ORIGIN}, utilisée dans chaque `postMessage`. */
    private readonly targetOrigin = inject(PENPOT_ORIGIN);

    // ── Cycle de vie ──────────────────────────────────────────────────────────

    /**
     * Initialise l'écoute des messages entrants et déclenche le handshake initial.
     *
     * L'envoi de `'get-project'` au constructeur est intentionnel : il demande
     * à `plugin.ts` l'identifiant de la page active dès que l'iframe est prête.
     * `plugin.ts` répond avec `'project-response'`, ce qui alimente le signal
     * `projectId` et déclenche le chargement de l'historique via `ChatFacadeService`.
     */
    constructor() {
        this._listenToPluginMessages();
        this.send({ type: 'get-project' });
    }

    /**
     * Libère toutes les ressources à la destruction du service.
     *
     * - Complète `destroy$` pour terminer le `fromEvent` de `listenToPluginMessages`.
     * - Complète `taskResult$` pour signaler la fin du flux aux abonnés.
     */
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.taskResult$.complete();
    }

    // ── API publique ──────────────────────────────────────────────────────────

    /**
     * Poste un message typé vers le worker `plugin.ts`.
     *
     * L'origine cible est résolue depuis {@link PENPOT_ORIGIN} au runtime,
     * garantissant que les messages ne sont jamais envoyés avec le wildcard `'*'`.
     *
     * @param message - Message à envoyer, typé par l'union {@link PluginMessage}.
     *
     * @example
     * ```typescript
     * // Handshake initial
     * this.bridge.send({ type: 'get-project' });
     *
     * // Transmission d'une tâche backend
     * this.bridge.send({
     *   type:   'execute-task',
     *   taskId: 'facd809e-...',
     *   task:   'executeCode',
     *   params: { code: 'const rect = penpot.createRectangle(); ...' },
     * });
     * ```
     *
     * @public
     * @see {@link PENPOT_ORIGIN} Token fournissant l'origine cible sécurisée.
     */
    send(message: PluginMessage): void {
        window.parent.postMessage(message, this.targetOrigin);
    }

    /**
     * Met à jour le signal `connectionStatus`.
     *
     * Cette méthode est le seul point d'entrée autorisé pour modifier l'état
     * de connexion WS. Elle est appelée exclusivement par {@link WebSocketService}
     * lors des événements `onopen`, `onclose` et `onerror` du WebSocket.
     *
     * Ce design évite la duplication d'un signal de connexion dans
     * `WebSocketService` et maintient `PluginBridgeService` comme source unique
     * de vérité pour l'état de connexion.
     *
     * @param status - Nouveau statut de connexion à appliquer.
     *
     * @public
     * @see {@link WebSocketService} Seul appelant autorisé de cette méthode.
     * @see {@link ConnectionStatus} Type des valeurs acceptées.
     */
    setConnectionStatus(status: ConnectionStatus): void {
        this.connectionStatus.set(status);
    }

    /**
     * Lit le paramètre `?theme=` depuis l'URL de l'iframe.
     *
     * `plugin.ts` injecte ce paramètre lors de l'ouverture du panneau :
     * `penpot.ui.open(..., \`?theme=${penpot.theme}\`)`.
     * Cette lecture synchrone au constructeur permet d'initialiser le signal
     * `theme` avant le premier rendu, évitant un flash de thème incorrect.
     *
     * @returns `'light'` si le paramètre vaut exactement `'light'`, `'dark'` dans tous les autres cas.
     *
     * @private
     */
    private _readThemeFromUrl(): 'light' | 'dark' {
        try {
            const theme = new URLSearchParams(globalThis.location.search).get('theme');
            return theme === 'light' ? 'light' : 'dark';
        } catch {
            return 'dark';
        }
    }

    /**
     * Souscrit aux événements `message` de la fenêtre et délègue le routage
     * à {@link routeMessage}.
     *
     * L'Observable est automatiquement complété par `takeUntil(this.destroy$)`
     * lors de la destruction du service, évitant les fuites mémoire.
     * Les messages sans propriété `type` sont ignorés silencieusement.
     *
     * @private
     */
    private _listenToPluginMessages(): void {
        fromEvent<MessageEvent>(globalThis, 'message')
            .pipe(takeUntil(this.destroy$))
            .subscribe((event) => {
                const msg = event.data as PluginMessage;
                if (!msg?.type) return;
                this._routeMessage(msg);
            });
    }

    /**
     * Route un message entrant vers le signal ou Subject correspondant.
     *
     * Seuls les types définis dans l'union {@link PluginMessage} sont traités.
     * Les types inconnus tombent dans le `default` et sont ignorés silencieusement.
     *
     * | `type`               | Action                                              |
     * |----------------------|-----------------------------------------------------|
     * | `'project-response'` | Met à jour le signal `projectId`                    |
     * | `'theme'`            | Met à jour le signal `theme`                        |
     * | `'task-result'`      | Émet sur `taskResult$` pour relai vers le backend   |
     *
     * @param msg - Message reçu, déjà validé (propriété `type` présente).
     *
     * @private
     */
    private _routeMessage(msg: PluginMessage): void {
        switch (msg.type) {
            case 'project-response':
                this.projectId.set(msg.id);
                break;
            case 'theme':
                this.theme.set(msg.theme);
                break;
            case 'task-result':
                this.taskResult$.next({
                    taskId: msg.taskId,
                    success: msg.success,
                    data: msg.data,
                    error: msg.error,
                });
                break;
            default:
                break;
        }
    }
}
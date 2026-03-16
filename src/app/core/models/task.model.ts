/**
 * Requête de tâche envoyée par le backend Spring Boot à l'UI Angular via WebSocket.
 *
 * Le backend envoie ce payload lorsqu'il doit déléguer une opération Penpot
 * au worker `plugin.ts` (ex : exécuter du code JavaScript généré par l'IA,
 * inspecter la structure de la page, etc.).
 *
 * ### Flux complet
 * ```
 * Spring Boot → WebSocket → WebSocketService.handleBackendMessage()
 *             → PluginBridgeService.send({ type: 'execute-task', ... })
 *             → plugin.ts TASK_HANDLERS[task]()
 *             → PluginBridgeService.taskResult$
 *             → WebSocketService → WebSocket → Spring Boot
 * ```
 *
 * @example
 * ```typescript
 * const request: PluginTaskRequest = {
 *   id:     'facd809e-196d-4a90-9b44-8da7226c3cd0',
 *   task:   'executeCode',
 *   params: { code: 'const rect = penpot.createRectangle(); ...' },
 * };
 * ```
 *
 * @public
 * @since 1.0.0
 * @see {@link WebSocketService} Service qui reçoit et route ce payload.
 */
export interface PluginTaskRequest {
    /** Identifiant unique de la tâche, généré par le backend (UUID v4). */
    id: string;

    /**
     * Nom de la tâche à exécuter, correspondant à une clé du registre
     * `TASK_HANDLERS` dans `plugin.ts`.
     *
     * @example `'executeCode'` | `'fetchStructure'`
     */
    task: string;

    /** Paramètres spécifiques à la tâche, dont le contenu varie selon `task`. */
    params: Record<string, unknown>;
}

/**
 * Réponse renvoyée par `plugin.ts` au backend Spring Boot après l'exécution
 * d'une tâche demandée via `PluginTaskRequest`.
 *
 * @typeParam T - Type des données retournées par la tâche.
 *               Varie selon la nature de la tâche (ex : `ExecuteCodeResultData`
 *               pour `executeCode`, structure JSON pour `fetchStructure`).
 *
 * @example
 * ```typescript
 * // Succès
 * const ok: PluginTaskResponse<ExecuteCodeResultData> = {
 *   id:      'facd809e-...',
 *   success: true,
 *   data:    { result: 'bf76e8b7-...', log: '' },
 * };
 *
 * // Échec
 * const ko: PluginTaskResponse = {
 *   id:      'facd809e-...',
 *   success: false,
 *   error:   'No active Penpot page',
 *   data:    null,
 * };
 * ```
 *
 * @public
 * @since 1.0.0
 * @see {@link TaskResponseEnvelope} Wrapper qui encapsule ce type pour le transport WS.
 */
export interface PluginTaskResponse<T = unknown> {
    /** Identifiant de la tâche d'origine, permet la corrélation côté backend. */
    id: string;

    /** `true` si la tâche s'est exécutée sans erreur dans `plugin.ts`. */
    success: boolean;

    /**
     * Message d'erreur en cas d'échec.
     * `null` ou absent si `success` est `true`.
     */
    error?: string | null;

    /**
     * Données retournées par la tâche.
     * `null` ou absent en cas d'échec.
     */
    data?: T | null;
}

/**
 * Enveloppe WebSocket encapsulant une `PluginTaskResponse` pour le transport
 * vers le handler Spring Boot (`PluginWebSocketHandler`).
 *
 * Le champ `type: 'task-response'` permet au backend de distinguer ce message
 * des autres types de payload WebSocket (ex : `session-id`).
 *
 * @typeParam T - Type des données de la réponse imbriquée.
 *
 * @example
 * ```typescript
 * const envelope: TaskResponseEnvelope = {
 *   type: 'task-response',
 *   response: {
 *     id:      'facd809e-...',
 *     success: true,
 *     data:    { result: null, log: 'Rectangle created' },
 *   },
 * };
 * // Sérialisé et envoyé via WebSocket.send(JSON.stringify(envelope))
 * ```
 *
 * @public
 * @since 1.0.0
 * @see {@link PluginTaskResponse} Type de la réponse imbriquée.
 * @see {@link WebSocketService.listenForTaskResults} Méthode qui produit ces enveloppes.
 */
export interface TaskResponseEnvelope<T = unknown> {
    /** Discriminant de type, toujours `'task-response'`. */
    type: 'task-response';

    /** Réponse de la tâche exécutée par `plugin.ts`. */
    response: PluginTaskResponse<T>;
}

/**
 * Union discriminée des messages échangés entre l'UI Angular (iframe) et
 * le worker `plugin.ts` via `postMessage` / `penpot.ui.onMessage`.
 *
 * ### Convention de nommage
 * - **UI → plugin** : verbes impératifs (`'get-project'`, `'execute-task'`)
 * - **plugin → UI** : noms / passé passif (`'project-response'`, `'task-result'`, `'theme'`)
 *
 * ### Membres de l'union
 *
 * | `type`              | Direction       | Description                                        |
 * |---------------------|-----------------|----------------------------------------------------|
 * | `'theme'`           | plugin → UI     | Relaie le thème Penpot courant (`light` / `dark`)  |
 * | `'get-project'`     | UI → plugin     | Demande l'ID de la page active                     |
 * | `'project-response'`| plugin → UI     | Retourne l'ID de la page active                    |
 * | `'execute-task'`    | UI → plugin     | Transmet une tâche backend à `plugin.ts`           |
 * | `'task-result'`     | plugin → UI     | Retourne le résultat d'une tâche exécutée          |
 *
 * @example
 * ```typescript
 * // Envoi depuis PluginBridgeService
 * bridge.send({ type: 'get-project' });
 * bridge.send({ type: 'execute-task', taskId: '...', task: 'executeCode', params: { code: '...' } });
 *
 * // Réception dans routeMessage()
 * switch (msg.type) {
 *   case 'project-response': this.projectId.set(msg.id); break;
 *   case 'task-result':      this.taskResult$.next({ ... }); break;
 * }
 * ```
 *
 * @public
 * @since 1.0.0
 * @see {@link PluginBridgeService} Service qui envoie et reçoit ces messages.
 */
export type PluginMessage =
    /** Relaie le changement de thème émis par `penpot.on('themechange', ...)`. */
    | { type: 'theme'; theme: 'light' | 'dark' }

    /** Demande à `plugin.ts` l'identifiant de la page Penpot active. */
    | { type: 'get-project' }

    /**
     * Réponse de `plugin.ts` contenant l'ID de la page active.
     * Déclenche le chargement de l'historique via `ChatFacadeService`.
     */
    | { type: 'project-response'; id: string }

    /**
     * Transmet une tâche backend à `plugin.ts` pour exécution.
     * Émis par `WebSocketService` après réception d'un `PluginTaskRequest`.
     */
    | { type: 'execute-task'; taskId: string; task: string; params: Record<string, unknown> }

    /**
     * Résultat d'une tâche exécutée par `plugin.ts`.
     * Consommé par `PluginBridgeService.taskResult$`, puis renvoyé au backend
     * par `WebSocketService` encapsulé dans un `TaskResponseEnvelope`.
     */
    | { type: 'task-result'; taskId: string; success: boolean; data: unknown; error: string | null };
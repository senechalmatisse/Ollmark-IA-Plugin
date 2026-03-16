/**
 * Message affiché dans la conversation entre l'utilisateur et l'assistant IA.
 *
 * Chaque message possède un identifiant unique généré côté client (`crypto.randomUUID()`),
 * ce qui permet au state store de le cibler pour le résoudre ou le marquer en erreur
 * sans recourir à un index fragile.
 *
 * ### États possibles d'un message assistant
 * - `isLoading: true`  → placeholder affiché pendant l'inférence IA
 * - `isError: true`    → la requête a échoué ; `content` contient le message d'erreur
 * - aucun flag         → message résolu, `content` contient la réponse finale
 *
 * @example
 * ```typescript
 * // Message utilisateur
 * const userMsg: ChatMessage = {
 *   id: crypto.randomUUID(),
 *   role: 'user',
 *   content: 'Crée un rectangle bleu',
 *   timestamp: new Date(),
 * };
 *
 * // Placeholder de chargement
 * const loadingMsg: ChatMessage = {
 *   id: crypto.randomUUID(),
 *   role: 'assistant',
 *   content: '',
 *   timestamp: new Date(),
 *   isLoading: true,
 * };
 * ```
 *
 * @public
 * @since 1.0.0
 * @see {@link ChatStateService} Service qui gère la liste des messages.
 */
export interface ChatMessage {
    /** Identifiant unique du message, généré via `crypto.randomUUID()`. */
    id: string;

    /** Auteur du message : `'user'` pour l'humain, `'assistant'` pour l'IA. */
    role: 'user' | 'assistant';

    /**
     * Contenu textuel du message.
     * Vide (`''`) tant que `isLoading` est `true`.
     * Contient le message d'erreur si `isError` est `true`.
     */
    content: string;

    /** Date et heure de création du message, utilisée pour l'affichage horodaté. */
    timestamp: Date;

    /**
     * Indique que l'assistant est en cours de génération.
     * Lorsque `true`, le composant `BubbleMessageComponent` affiche
     * l'animation de chargement à la place de `content`.
     *
     * @defaultValue `undefined` (falsy)
     */
    isLoading?: boolean;

    /**
     * Indique que la requête a échoué.
     * Lorsque `true`, `content` contient le message d'erreur et le composant
     * applique le style destructif (`bubble--error`).
     *
     * @defaultValue `undefined` (falsy)
     */
    isError?: boolean;
}

/**
 * Corps de la requête HTTP envoyée à `POST /api/ai/chat`.
 *
 * Le `projectId` est l'identifiant de la page Penpot active, résolu par
 * `plugin.ts` et transmis via `PluginBridgeService`. Il sert de clé de
 * conversation côté backend (table `conversations`).
 *
 * Le `sessionId` est l'identifiant de la connexion WebSocket courante,
 * lu depuis `SessionStore`. Il permet au backend de corréler la requête HTTP
 * avec la session WebSocket active pour renvoyer les tâches plugin au bon client.
 *
 * @example
 * ```typescript
 * const body: ChatRequest = {
 *   projectId: 'ddc4a96c-d2ad-80ac-8007-b6f8a1ae8d41',
 *   message:   'Crée un rectangle bleu en 100,100',
 *   sessionId: '2da7d5ee-7236-2075-e628-69a02aa27338',
 * };
 * ```
 *
 * @public
 * @since 1.0.0
 * @see {@link ChatApiService.sendMessage} Méthode qui consomme ce type.
 */
export interface ChatRequest {
    /** Identifiant de la page Penpot active, utilisé comme clé de conversation. */
    projectId: string;

    /** Message saisi par l'utilisateur, envoyé tel quel au modèle IA. */
    message: string;

    /**
     * Identifiant de la session WebSocket courante.
     * Optionnel : absent lors des tests ou si la connexion WS n'est pas encore établie.
     */
    sessionId?: string;
}

/**
 * Réponse retournée par `POST /api/ai/chat`.
 *
 * Si `success` est `false`, `error` contient le message d'erreur du backend
 * et `response` peut être absent ou vide.
 *
 * @example
 * ```typescript
 * // Succès
 * const ok: ChatResponse = {
 *   success:   true,
 *   projectId: 'ddc4a96c-...',
 *   response:  'Le rectangle bleu a été créé avec succès !',
 * };
 *
 * // Échec
 * const ko: ChatResponse = {
 *   success:   false,
 *   projectId: 'ddc4a96c-...',
 *   response:  '',
 *   error:     'Session plugin inactive',
 * };
 * ```
 *
 * @public
 * @since 1.0.0
 * @see {@link ChatApiService.sendMessage} Méthode qui retourne ce type.
 * @see {@link ChatFacadeService.sendMessage} Méthode qui consomme ce type.
 */
export interface ChatResponse {
    /** `true` si le backend a traité la requête sans erreur. */
    success: boolean;

    /** Identifiant du projet Penpot concerné, renvoyé tel quel par le backend. */
    projectId: string;

    /** Réponse textuelle générée par le modèle IA. Vide en cas d'erreur. */
    response: string;

    /**
     * Message d'erreur fourni par le backend.
     * Présent uniquement si `success` est `false`.
     */
    error?: string;
}

/**
 * État de la connexion WebSocket entre l'UI Angular et le backend Spring Boot.
 *
 * | Valeur           | Description                                              |
 * |------------------|----------------------------------------------------------|
 * | `'connecting'`   | Tentative de connexion en cours                          |
 * | `'connected'`    | Connexion établie et opérationnelle                      |
 * | `'disconnected'` | Connexion fermée (normalement ou après timeout)          |
 * | `'error'`        | Connexion perdue suite à une erreur réseau               |
 *
 * Ce type est utilisé comme source unique de vérité dans `PluginBridgeService`
 * (signal `connectionStatus`).
 *
 * @public
 * @since 1.0.0
 * @see {@link PluginBridgeService.connectionStatus} Signal qui détient la valeur courante.
 * @see {@link WebSocketService} Service qui met à jour ce statut.
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
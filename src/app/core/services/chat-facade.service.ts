import { Injectable, effect, inject, untracked } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import {
    ChatApiService,
    ChatStateService,
    PluginBridgeService,
    HistoryLoaderService,
    SessionStore
} from '.';

/**
 * Couche d'orchestration centrale du chat (pattern Facade).
 *
 * Point d'entrée **unique** pour les composants feature : ils n'ont besoin
 * d'injecter que ce service pour accéder à l'état du chat, déclencher des
 * actions et lire le statut de connexion.
 *
 * ### Responsabilités
 * - Coordonne {@link ChatStateService}, {@link ChatApiService},
 *   {@link PluginBridgeService} et {@link SessionStore}.
 * - Réagit à l'arrivée du `projectId` pour déclencher le chargement
 *   de l'historique via {@link HistoryLoaderService}.
 * - Expose les signaux d'état nécessaires aux templates sans en dupliquer
 *   les sources (pas d'alias redondants).
 *
 * ### Principe Open/Closed
 * Pour ajouter une capacité (prévisualisation, …), étendre
 * cette façade sans toucher aux composants consommateurs.
 *
 * @public
 * @since 1.0.0
 * @see {@link ChatStateService} Store d'état pur (messages, isLoading).
 * @see {@link ChatApiService} Gateway HTTP vers Spring Boot.
 * @see {@link PluginBridgeService} Transport postMessage vers plugin.ts.
 * @see {@link SessionStore} État partagé du sessionId WebSocket.
 */
@Injectable({ providedIn: 'root' })
export class ChatFacadeService {
    private readonly _api = inject(ChatApiService);
    private readonly _state = inject(ChatStateService);
    private readonly _bridge = inject(PluginBridgeService);
    private readonly _session = inject(SessionStore);
    private readonly _historyLoader = inject(HistoryLoaderService);

    // ── Signaux d'état du chat ────────────────────────────────────────────────

    /**
     * Signal en lecture seule contenant la liste des messages de la conversation.
     * Délégué à {@link ChatStateService.messages}.
     */
    readonly messages = this._state.messages;

    /**
     * Signal indiquant si une requête d'inférence est en cours.
     * `true` entre l'envoi du message et la réception de la réponse IA.
     * Délégué à {@link ChatStateService.isLoading}.
     */
    readonly isLoading = this._state.isLoading;

    /**
     * Signal calculé : `true` si au moins un message est présent.
     * Utilisé par le template pour conditionner l'affichage du bouton
     * « Réinitialiser » et de la barre de contexte.
     * Délégué à {@link ChatStateService.hasMessages}.
     */
    readonly hasMessages = this._state.hasMessages;

    // ── Signaux de transport / contexte ──────────────────────────────────────

    /**
     * Signal contenant l'identifiant de la page Penpot active.
     * `null` tant que le handshake avec `plugin.ts` n'est pas complété.
     * Délégué à {@link PluginBridgeService.projectId}.
     */
    readonly projectId = this._bridge.projectId;

    /**
     * Initialise la façade et enregistre l'effet de chargement d'historique.
     *
     * L'`effect()` réagit à chaque changement du signal `projectId`.
     * Dès qu'un ID devient disponible, {@link HistoryLoaderService.loadHistory}
     * est appelé via `untracked()` pour éviter que les lectures internes
     * à `loadHistory` soient enregistrées comme dépendances de l'effet.
     */
    constructor() {
        effect(() => {
            const id = this._bridge.projectId();
            if (id) untracked(() => this._historyLoader.loadHistory(id));
        });
    }

    /**
     * Envoie le message de l'utilisateur à l'IA et met à jour l'état de la conversation.
     *
     * ### Flux d'exécution
     * 1. Ajoute le message utilisateur à l'état (`ChatStateService`).
     * 2. Ajoute un placeholder de chargement pour la réponse de l'assistant.
     * 3. Passe `isLoading` à `true`.
     * 4. Envoie la requête HTTP via `ChatApiService.sendMessage()`.
     * 5a. Succès : résout le placeholder avec la réponse textuelle.
     * 5b. Échec métier (`success: false`) : marque le placeholder en erreur.
     * 5c. Erreur réseau / exception : marque le placeholder en erreur.
     * 6. Repasse `isLoading` à `false` dans tous les cas (`finally`).
     *
     * > **Pas de timeout** : l'inférence IA peut légitimement prendre plusieurs
     * > minutes sur du matériel contraint. Le loader reste affiché jusqu'à la réponse.
     *
     * @param content - Texte saisi par l'utilisateur. Ignoré s'il est vide après trim.
     * @returns Promesse résolue une fois l'état mis à jour (succès ou erreur).
     *
     * @example
     * ```typescript
     * // Dans ChatContainerComponent
     * protected onMessageSent(text: string): void {
     *   this.facade.sendMessage(text);
     * }
     * ```
     *
     * @public
     * @see {@link ChatApiService.sendMessage} Appel HTTP sous-jacent.
     * @see {@link ChatStateService.resolveMessage} Mise à jour en cas de succès.
     * @see {@link ChatStateService.markMessageAsError} Mise à jour en cas d'erreur.
     */
    async sendMessage(content: string): Promise<void> {
        const projectId = this._resolveProjectId();
        if (!projectId || !content.trim()) return;

        const sessionId = this._session.sessionId() ?? undefined;

        this._state.addUserMessage(content.trim());
        const loadingId = this._state.addLoadingMessage();
        this._state.setLoading(true);

        try {
            const response = await firstValueFrom(
                this._api.sendMessage(projectId, content.trim(), sessionId)
            );

            if (response.success) {
                this._state.resolveMessage(loadingId, response.response);
            } else {
                this._state.markMessageAsError(
                    loadingId,
                    response.error ?? 'Erreur inconnue du serveur'
                );
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erreur de communication';
            console.warn('[OllMark Facade] sendMessage error:', message);
            this._state.markMessageAsError(loadingId, `${message}`);
        } finally {
            this._state.setLoading(false);
        }
    }

    /**
     * Réinitialise complètement la conversation : vide l'état local
     * **et** supprime les données persistées côté backend.
     *
     * ### Ordre des appels backend
     * 1. `clearConversation()` - vide `spring_ai_chat_memory` (mémoire volatile du modèle).
     * 2. `deleteProjectConversations()` - supprime `conversations` + `messages` en cascade.
     *    Sans cet appel, les messages réapparaîtraient à la réouverture du plugin.
     * 3. `startNewConversation()` - prépare un nouveau contexte de session backend.
     *
     * ### Stratégie best-effort
     * L'état local (`clearMessages`) est vidé **avant** les appels serveur.
     * Si un appel échoue, l'UI reste vide et l'erreur est loguée - l'utilisateur
     * n'est pas bloqué par un échec réseau ponctuel.
     *
     * @returns Promesse résolue une fois toutes les opérations terminées.
     *
     * @example
     * ```typescript
     * // Dans ChatContainerComponent
     * protected onConversationCleared(): void {
     *   this.facade.resetConversation();
     * }
     * ```
     *
     * @public
     * @see {@link ChatApiService.clearConversation} Vidage de spring_ai_chat_memory.
     * @see {@link ChatApiService.deleteProjectConversations} Suppression des données persistées.
     * @see {@link ChatApiService.startNewConversation} Initialisation de la nouvelle session.
     */
    async resetConversation(): Promise<void> {
        const projectId = this._resolveProjectId();
        if (!projectId) return;

        this._state.clearMessages();

        try {
            await firstValueFrom(
                this._api.clearConversation(projectId).pipe(timeout(10_000))
            );
            await firstValueFrom(
                this._api.deleteProjectConversations(projectId).pipe(timeout(10_000))
            );
            await firstValueFrom(
                this._api.startNewConversation(projectId).pipe(timeout(10_000))
            );
        } catch (err) {
            console.warn(
                '[OllMark Facade] server call failed:',
                err instanceof Error ? err.message : err
            );
        }
    }

    /**
     * Retourne le libellé de connexion localisé correspondant au statut courant.
     *
     * Centralise la traduction des valeurs de {@link ConnectionStatus} en
     * chaînes affichables, évitant de dupliquer cette logique dans les templates.
     *
     * @returns Libellé en français du statut courant.
     *
     * @example
     * ```html
     * <!-- chat-container.component.html -->
     * {{ facade.connectionLabel() }}
     * ```
     *
     * @public
     */
    private _resolveProjectId(): string | null {
        const id = this._bridge.projectId();
        if (!id) this._bridge.send({ type: 'get-project' });
        return id;
    }
}
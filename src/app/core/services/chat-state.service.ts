import { Injectable, computed, signal } from '@angular/core';
import { ChatMessage } from '../models';

/**
 * Store d'état pur de la conversation (pattern State Store).
 *
 * Ce service est la **seule source de vérité** pour les messages et le statut
 * de chargement de l'UI chat. Il ne contient aucun appel HTTP, aucun accès au
 * DOM et aucune dépendance vers d'autres services (principe SRP).
 *
 * ### Accès à l'état
 * L'état est exposé via des signaux Angular en **lecture seule** pour les
 * consommateurs. Toute mutation passe exclusivement par les méthodes publiques
 * de ce service.
 *
 * @public
 * @since 1.0.0
 * @see {@link ChatFacadeService} Seul orchestrateur autorisé à muter cet état.
 * @see {@link ChatMessage} Modèle de données des messages.
 */
@Injectable({ providedIn: 'root' })
export class ChatStateService {

    /** Liste interne des messages, muée uniquement via les méthodes publiques. */
    private readonly _messages = signal<ChatMessage[]>([]);

    /** Flag de chargement interne, actif pendant une inférence IA. */
    private readonly _isLoading = signal(false);

    /**
     * Signal en lecture seule contenant la liste ordonnée des messages.
     * Les composants se lient à ce signal pour un rendu réactif (OnPush).
     */
    readonly messages = this._messages.asReadonly();

    /**
     * Signal en lecture seule indiquant si une inférence IA est en cours.
     * `true` entre l'appel à {@link setLoading}`(true)` et {@link setLoading}`(false)`.
     */
    readonly isLoading = this._isLoading.asReadonly();

    /**
     * Signal calculé : `true` si la liste des messages contient au moins un élément.
     * Utilisé par `ChatContainerComponent` pour conditionner l'affichage du bouton
     * « Réinitialiser » et de la barre de contexte.
     */
    readonly hasMessages = computed(() => this._messages().length > 0);

    /**
     * Ajoute un message de l'utilisateur à la fin de la liste et retourne son ID.
     *
     * L'ID retourné n'est pas utilisé directement ici, mais il est préservé
     * pour symétrie avec {@link addLoadingMessage} dont l'ID est nécessaire
     * pour les mutations ultérieures.
     *
     * @param content - Texte du message utilisateur (déjà trimé par l'appelant).
     * @returns L'identifiant UUID v4 du message ajouté.
     *
     * @example
     * ```typescript
     * const id = this.state.addUserMessage('Crée un rectangle bleu');
     * ```
     *
     * @public
     */
    addUserMessage(content: string): string {
        const id = crypto.randomUUID();
        this._messages.update((msgs) => [
            ...msgs,
            { id, role: 'user', content, timestamp: new Date() },
        ]);
        return id;
    }

    /**
     * Ajoute un placeholder de chargement pour la réponse de l'assistant
     * et retourne son ID.
     *
     * Le placeholder a `isLoading: true` et `content: ''`. Il sera mis à jour
     * par {@link resolveMessage} ou {@link markMessageAsError} une fois la
     * réponse reçue.
     *
     * L'ID retourné est **indispensable** : il permet aux méthodes de résolution
     * de cibler exactement ce placeholder sans recourir à un index fragile.
     *
     * @returns L'identifiant UUID v4 du placeholder ajouté.
     *
     * @example
     * ```typescript
     * const loadingId = this.state.addLoadingMessage();
     * // … après réception de la réponse :
     * this.state.resolveMessage(loadingId, response.response);
     * ```
     *
     * @public
     * @see {@link resolveMessage} Résolution du placeholder en cas de succès.
     * @see {@link markMessageAsError} Résolution du placeholder en cas d'erreur.
     */
    addLoadingMessage(): string {
        const id = crypto.randomUUID();
        this._messages.update((msgs) => [
            ...msgs,
            { id, role: 'assistant', content: '', timestamp: new Date(), isLoading: true },
        ]);
        return id;
    }

    /**
     * Résout un placeholder de chargement avec la réponse finale de l'assistant.
     *
     * Remplace `content` par la réponse textuelle et passe `isLoading` à `false`.
     * Les autres messages de la liste sont inchangés.
     *
     * @param id - Identifiant du placeholder à résoudre, retourné par {@link addLoadingMessage}.
     * @param content - Réponse textuelle générée par le modèle IA.
     *
     * @example
     * ```typescript
     * this.state.resolveMessage(loadingId, 'Le rectangle bleu a été créé avec succès !');
     * ```
     *
     * @public
     * @see {@link addLoadingMessage} Méthode qui crée le placeholder.
     */
    resolveMessage(id: string, content: string): void {
        this._messages.update((msgs) =>
            msgs.map((m) => (m.id === id ? { ...m, content, isLoading: false } : m))
        );
    }

    /**
     * Marque un placeholder de chargement comme erroné.
     *
     * Remplace `content` par le message d'erreur, passe `isLoading` à `false`
     * et `isError` à `true`. Le composant `BubbleMessageComponent` applique
     * alors le style destructif (`bubble--error`).
     *
     * @param id    - Identifiant du placeholder à marquer, retourné par {@link addLoadingMessage}.
     * @param error - Message d'erreur à afficher à l'utilisateur.
     *
     * @example
     * ```typescript
     * this.state.markMessageAsError(loadingId, 'Erreur de communication');
     * ```
     *
     * @public
     * @see {@link addLoadingMessage} Méthode qui crée le placeholder.
     */
    markMessageAsError(id: string, error: string): void {
        this._messages.update((msgs) =>
            msgs.map((m) =>
                m.id === id ? { ...m, content: error, isLoading: false, isError: true } : m
            )
        );
    }

    /**
     * Vide la liste des messages.
     *
     * Appelé par {@link ChatFacadeService.resetConversation} comme première
     * étape du reset (optimistic update) pour vider l'UI immédiatement, avant
     * même que les appels backend soient complétés.
     *
     * @public
     */
    clearMessages(): void {
        this._messages.set([]);
    }

    /**
     * Met à jour le flag de chargement global.
     *
     * `true` → une inférence IA est en cours (désactive la saisie, affiche
     * le loader dans le bouton d'envoi).
     * `false` → l'UI est prête à recevoir un nouveau message.
     *
     * @param value - Nouvelle valeur du flag de chargement.
     *
     * @public
     */
    setLoading(value: boolean): void {
        this._isLoading.set(value);
    }

    /**
     * Hydrate l'état avec l'historique chargé depuis le backend au démarrage.
     *
     * ### Guard d'idempotence
     * Si la liste contient déjà des messages (ex : l'utilisateur a envoyé un
     * message avant que l'historique soit chargé), l'hydratation est ignorée
     * pour éviter d'écraser des données en cours d'utilisation.
     *
     * ### Conversion des IDs
     * Les messages de l'historique backend n'ont pas d'ID client : un UUID v4
     * est généré pour chacun via `crypto.randomUUID()`, cohérent avec
     * {@link addUserMessage} et {@link addLoadingMessage}.
     *
     * @param items - Tableau de `{ role, content }` retourné par
     *                `GET /api/ai/chat/{projectId}/history`. Les rôles non
     *                reconnus sont normalisés en `'assistant'`.
     *
     * @example
     * ```typescript
     * // Dans HistoryLoaderService
     * this.state.hydrateHistory([
     *   { role: 'user', content: 'Crée un rectangle bleu' },
     *   { role: 'assistant', content: 'Le rectangle a été créé !' },
     * ]);
     * ```
     *
     * @public
     * @see {@link HistoryLoaderService} Service qui appelle cette méthode au démarrage.
     */
    hydrateHistory(items: { role: string; content: string }[]): void {
        if (this._messages().length > 0) return;
        if (!items?.length) return;

        const messages: ChatMessage[] = items.map((item) => ({
            id: crypto.randomUUID(),
            role: item.role === 'user' ? 'user' : 'assistant',
            content: item.content,
            timestamp: new Date(),
        }));

        this._messages.set(messages);
    }
}
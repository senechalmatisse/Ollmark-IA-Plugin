import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../tokens/api.tokens';
import { ChatRequest, ChatResponse } from '../models';

/**
 * Gateway HTTP unique entre l'UI Angular et le backend Spring Boot.
 *
 * Ce service est la seule classe autorisée à émettre des requêtes HTTP vers
 * l'API `/api/ai/*`. Il ne contient ni état, ni logique métier, ni effets
 * de bord au-delà des appels HTTP eux-mêmes (principe SRP).
 *
 * L'URL de base est résolue au démarrage depuis le token {@link API_BASE_URL},
 * lui-même alimenté par la variable d'environnement `VITE_API_BASE_URL`.
 *
 * Toutes les méthodes retournent un `Observable` froid : aucune requête n'est
 * émise tant que l'Observable n'est pas souscrit (généralement via
 * `firstValueFrom()` dans `ChatFacadeService`).
 *
 * @public
 * @since 1.0.0
 * @see {@link API_BASE_URL} Token d'injection fournissant l'URL de base.
 * @see {@link ChatFacadeService} Seul consommateur autorisé de ce service.
 */
@Injectable({ providedIn: 'root' })
export class ChatApiService {
    private readonly _http = inject(HttpClient);
    private readonly _baseUrl = inject(API_BASE_URL);

    /**
     * Envoie le message de l'utilisateur au modèle IA et retourne sa réponse.
     *
     * Le backend peut, en réponse à cet appel, envoyer une ou plusieurs tâches
     * à `plugin.ts` via WebSocket (ex : inspecter la page, exécuter du code)
     * avant de retourner la réponse textuelle finale.
     *
     * @param projectId - Identifiant de la page Penpot active, utilisé comme
     *                    clé de conversation côté backend.
     * @param message   - Message saisi par l'utilisateur.
     * @param sessionId - Identifiant de la session WebSocket courante, permettant
     *                    au backend de corréler la requête HTTP avec le client WS.
     *                    Optionnel : absent si la connexion WS n'est pas encore établie.
     * @returns Observable émettant la {@link ChatResponse} du backend.
     *
     * @example
     * ```typescript
     * this.api.sendMessage('ddc4a96c-...', 'Crée un rectangle bleu', '2da7d5ee-...')
     *   .subscribe(response => console.log(response.response));
     * ```
     *
     * @public
     * @see {@link ChatFacadeService.sendMessage} Méthode orchestrant cet appel.
     */
    sendMessage(
        projectId: string,
        message: string,
        sessionId?: string
    ): Observable<ChatResponse> {
        const body: ChatRequest = { projectId, message, sessionId };
        return this._http
            .post<ChatResponse>(`${this._baseUrl}/api/ai/chat`, body)
            .pipe(catchError((err) => this._handleError(err)));
    }

    /**
     * Vide la mémoire conversationnelle Spring AI (`spring_ai_chat_memory`)
     * pour le projet donné.
     *
     * **Important** : cet appel ne supprime pas les messages persistés dans
     * la table `messages`. Pour un reset complet (y compris l'historique
     * affiché à la réouverture), appeler également
     * {@link deleteProjectConversations}.
     *
     * @param projectId - Identifiant du projet dont la mémoire doit être vidée.
     * @returns Observable qui complète sans émettre de valeur en cas de succès.
     *
     * @public
     * @see {@link deleteProjectConversations} Suppression des données persistées.
     * @see {@link ChatFacadeService.resetConversation} Orchestration du reset complet.
     */
    clearConversation(projectId: string): Observable<void> {
        return this._http
            .delete<void>(`${this._baseUrl}/api/ai/chat/${projectId}`)
            .pipe(catchError((err) => this._handleError(err)));
    }

    /**
     * Supprime toutes les conversations et leurs messages persistés pour le
     * projet donné (tables `conversations` et `messages` en cascade).
     *
     * C'est cet appel qui empêche les messages de réapparaître lors de la
     * réouverture du plugin, car l'historique est rechargé depuis la table
     * `messages` au démarrage via {@link getChatHistory}.
     *
     * La suppression en cascade est gérée par la contrainte SQL
     * `ON DELETE CASCADE` sur `fk_messages_conversation` - aucun code Java
     * supplémentaire n'est nécessaire côté backend.
     *
     * @param projectId - Identifiant du projet dont les conversations doivent être supprimées.
     * @returns Observable qui complète sans émettre de valeur en cas de succès.
     *
     * @public
     * @see {@link clearConversation} Vidage de la mémoire volatile Spring AI.
     * @see {@link ChatFacadeService.resetConversation} Orchestration du reset complet.
     */
    deleteProjectConversations(projectId: string): Observable<void> {
        return this._http
            .delete<void>(`${this._baseUrl}/api/ai/conversations/project/${projectId}`)
            .pipe(catchError((err) => this._handleError(err)));
    }

    /**
     * Notifie le backend du démarrage d'une nouvelle conversation pour le projet.
     *
     * Appelé en dernière étape du reset, après {@link clearConversation} et
     * {@link deleteProjectConversations}, pour que le backend initialise
     * un nouveau contexte de session.
     *
     * @param projectId - Identifiant du projet pour lequel démarrer une nouvelle conversation.
     * @returns Observable émettant un objet `{ success, projectId }` en cas de succès.
     *
     * @example
     * ```typescript
     * this.api.startNewConversation('ddc4a96c-...')
     *   .subscribe(({ success }) => console.log('New conversation:', success));
     * ```
     *
     * @public
     * @see {@link ChatFacadeService.resetConversation} Méthode orchestrant cet appel.
     */
    startNewConversation(
        projectId: string
    ): Observable<{ success: boolean; projectId: string }> {
        return this._http
            .post<{ success: boolean; projectId: string }>(
                `${this._baseUrl}/api/ai/chat/new`,
                { projectId }
            )
            .pipe(catchError((err) => this._handleError(err)));
    }

    /**
     * Récupère les N derniers messages persistés pour le projet donné.
     *
     * Cet endpoint lit depuis la table `messages` (et non depuis
     * `spring_ai_chat_memory`) via `MessageService` côté backend. C'est
     * la source utilisée par {@link HistoryLoaderService} pour hydrater
     * l'état au démarrage du plugin.
     *
     * @param projectId - Identifiant du projet dont l'historique est demandé.
     * @param limit     - Nombre maximum de messages à retourner.
     *                    Appliqué côté backend avec `ORDER BY created_at DESC`.
     * @returns Observable émettant un tableau de `{ role, content }` triés
     *          par ordre chronologique croissant après réception.
     *
     * @example
     * ```typescript
     * this.api.getChatHistory('ddc4a96c-...', 20)
     *   .subscribe(history => console.log(`${history.length} messages chargés`));
     * ```
     *
     * @public
     * @see {@link HistoryLoaderService} Service qui consomme cet appel au démarrage.
     */
    getChatHistory(
        projectId: string,
        limit = 20
    ): Observable<{ role: string; content: string }[]> {
        return this._http
            .get<{ role: string; content: string }[]>(
                `${this._baseUrl}/api/ai/chat/${projectId}/history`,
                { params: { limit: limit.toString() } }
            )
            .pipe(catchError((err) => this._handleError(err)));
    }

    /**
     * Normalise les erreurs HTTP en une `Error` avec un message lisible.
     *
     * Ordre de résolution du message d'erreur :
     * 1. `err.error.error` — champ `error` du corps JSON retourné par le backend
     * 2. `err.message`     — message natif de `HttpErrorResponse`
     * 3. Fallback générique `'Une erreur réseau est survenue'`
     *
     * @param err - L'erreur HTTP interceptée par l'opérateur `catchError`.
     * @returns Observable qui émet immédiatement une erreur (`throwError`).
     *
     * @private
     */
    private _handleError(err: HttpErrorResponse): Observable<never> {
        const message =
            err.error?.error ?? err.message ?? 'Une erreur réseau est survenue';
        return throwError(() => new Error(message));
    }
}
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';
import { ChatApiService, ChatStateService } from '.';

/**
 * Service de chargement ponctuel de l'historique de conversation au démarrage.
 *
 * Ce service a une responsabilité unique et bien délimitée : récupérer les
 * messages persistés côté backend et hydrater l'état local une seule fois
 * à l'ouverture du plugin. Il n'écoute aucun Observable continu et ne réagit
 * à aucun événement après l'hydratation initiale.
 *
 * ### Déclenchement
 * {@link ChatFacadeService} appelle {@link loadHistory} via un `effect()` Angular
 * dès que le signal `projectId` devient non-nul, c'est-à-dire après la réception
 * du message `'project-response'` de `plugin.ts`.
 *
 * ### Robustesse
 * - Un timeout de {@link _TIMEOUT_MS} ms est appliqué sur l'appel HTTP pour éviter
 *   qu'une lenteur réseau ne bloque indéfiniment l'UI.
 * - Toutes les erreurs sont absorbées et loguées : un échec de chargement
 *   d'historique ne doit jamais empêcher l'utilisateur d'interagir avec le plugin.
 *
 * @public
 * @since 1.0.0
 * @see {@link ChatFacadeService} Seul déclencheur de ce service.
 * @see {@link ChatApiService.getChatHistory} Source des données historiques.
 * @see {@link ChatStateService.hydrateHistory} Destination des données chargées.
 */
@Injectable({ providedIn: 'root' })
export class HistoryLoaderService {

    private readonly _api = inject(ChatApiService);
    private readonly _state = inject(ChatStateService);

    /**
     * Délai maximum accordé à l'appel `GET /api/ai/chat/{projectId}/history`.
     *
     * Après ce délai, une `TimeoutError` RxJS est levée et l'UI continue sans
     * historique plutôt que de rester bloquée en attente d'une réponse serveur.
     *
     * @internal
     */
    private static readonly _TIMEOUT_MS = 8_000;

    /**
     * Charge les derniers messages persistés pour le projet donné et hydrate
     * l'état local via {@link ChatStateService.hydrateHistory}.
     *
     * ### Comportement
     * - Si le backend retourne un tableau vide, l'état reste inchangé et un log
     *   informatif est émis.
     * - Si le backend répond dans les délais avec des données, {@link ChatStateService.hydrateHistory}
     *   est appelé. Le guard d'idempotence du state store garantit que les messages
     *   existants ne seront jamais écrasés.
     * - Si l'appel dépasse {@link _TIMEOUT_MS} ms, un avertissement est loggué et
     *   l'UI continue sans historique.
     * - Toute autre erreur (réseau, parsing…) est également absorbée et loguée.
     *
     * ### Pas de propagation d'erreur
     * Cette méthode ne lève jamais d'exception. Les erreurs sont intentionnellement
     * absorbées car l'historique est une fonctionnalité de confort : son absence
     * ne doit pas bloquer l'utilisateur.
     *
     * @param projectId - Identifiant UUID de la page Penpot active, utilisé comme
     *                    clé pour récupérer les messages côté backend.
     * @returns Promesse résolue une fois l'hydratation terminée (ou l'erreur absorbée).
     *
     * @example
     * ```typescript
     * // Dans ChatFacadeService (déclenché par effect sur projectId)
     * effect(() => {
     *   const id = this.bridge.projectId();
     *   if (id) untracked(() => this.historyLoader.loadHistory(id));
     * });
     * ```
     *
     * @public
     * @see {@link ChatApiService.getChatHistory} Appel HTTP sous-jacent.
     * @see {@link ChatStateService.hydrateHistory} Méthode d'hydratation du state store.
     */
    async loadHistory(projectId: string): Promise<void> {
        try {
            const history = await firstValueFrom(
                this._api.getChatHistory(projectId, 20).pipe(
                    timeout(HistoryLoaderService._TIMEOUT_MS)
                )
            );

            if (!history?.length) {
                console.log('[OllMark History] No history found for project:', projectId);
                return;
            }

            this._state.hydrateHistory(history);
            console.log(`[OllMark History] Hydrated ${history.length} message(s) for project:`, projectId);
        } catch (err) {
            if (err instanceof TimeoutError) {
                console.warn(
                    `[OllMark History] Timeout after ${HistoryLoaderService._TIMEOUT_MS}ms.`
                );
            } else {
                console.warn(
                    '[OllMark History] Could not load history for project:', projectId,
                    '-', err instanceof Error ? err.message : err
                );
            }
        }
    }
}
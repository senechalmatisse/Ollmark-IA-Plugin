import { Injectable, signal } from '@angular/core';

/**
 * Store partagé de l'identifiant de session WebSocket.
 *
 * Ce service résout le couplage qui existait entre `WebSocketService`
 * et `ChatFacadeService` : sans ce store, la façade métier aurait dû injecter
 * directement le service de transport pour lire le `sessionId`.
 *
 * ### Séparation des responsabilités
 * - {@link WebSocketService}  → **écrit** via {@link set} et {@link clear}.
 * - {@link ChatFacadeService} → **lit** via le signal readonly {@link sessionId}.
 *
 * Les deux services ne se connaissent plus mutuellement - `SessionStore` est
 * l'unique point de couplage entre la couche transport et la couche métier.
 *
 * @public
 * @since 1.0.0
 * @see {@link WebSocketService} Seul service autorisé à écrire dans ce store.
 * @see {@link ChatFacadeService} Seul service autorisé à lire ce store.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {

    /** Valeur interne mutable du sessionId. */
    private readonly _sessionId = signal<string | null>(null);

    /**
     * Signal en lecture seule contenant l'identifiant de session WebSocket courant.
     *
     * `null` tant qu'aucune session n'a été établie, ou après une déconnexion.
     * Sa valeur est transmise au backend comme corrélation entre la requête HTTP
     * et la session WebSocket active (champ `sessionId` de `ChatRequest`).
     */
    readonly sessionId = this._sessionId.asReadonly();

    /**
     * Enregistre l'identifiant de session reçu du backend Spring Boot.
     *
     * Appelé par {@link WebSocketService} à la réception du message
     * `{ type: 'session-id', sessionId: '...' }` lors de l'ouverture
     * de la connexion WebSocket.
     *
     * @param id - Identifiant de session UUID envoyé par le backend.
     *
     * @example
     * ```typescript
     * // Dans WebSocketService.onmessage
     * if (payload.type === 'session-id') {
     *   this.session.set(payload.sessionId);
     * }
     * ```
     *
     * @public
     */
    set(id: string): void {
        this._sessionId.set(id);
    }

    /**
     * Efface l'identifiant de session lors de la fermeture de la connexion.
     *
     * Appelé par {@link WebSocketService} dans le handler `onclose` du WebSocket.
     * Repasse `sessionId` à `null`, ce qui indique à `ChatFacadeService` que la
     * session n'est plus valide et que les prochaines requêtes seront envoyées
     * sans `sessionId`.
     *
     * @example
     * ```typescript
     * // Dans WebSocketService.onclose
     * this.session.clear();
     * ```
     *
     * @public
     */
    clear(): void {
        this._sessionId.set(null);
    }
}
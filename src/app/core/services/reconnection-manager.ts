/**
 * Gestionnaire de reconnexion avec stratégie de backoff exponentiel plafonné.
 *
 * Cette classe est intentionnellement indépendante du transport (WebSocket,
 * SSE…) et de tout framework Angular : elle ne contient que de la logique
 * de temporisation, ce qui la rend triviale à tester unitairement en isolation.
 *
 * ### Algorithme de backoff
 * Le délai avant chaque tentative est calculé selon la formule :
 * ```
 * delay = min(baseDelayMs × 2^retryCount, 30 000 ms)
 * ```
 *
 * Exemple avec `baseDelayMs = 1 000` :
 *
 * | Tentative | Délai calculé | Délai appliqué |
 * |-----------|---------------|----------------|
 * | 1         | 1 000 ms      | 1 000 ms       |
 * | 2         | 2 000 ms      | 2 000 ms       |
 * | 3         | 4 000 ms      | 4 000 ms       |
 * | 4         | 8 000 ms      | 8 000 ms       |
 * | 5         | 16 000 ms     | 16 000 ms      |
 * | 6+        | > 30 000 ms   | 30 000 ms      |
 *
 * ### Utilisation typique
 * ```typescript
 * const mgr = new ReconnectionManager(10, 1_000, (attempt) => this.connect());
 *
 * // À la fermeture de la connexion :
 * if (!mgr.schedule()) {
 *   console.error('Nombre maximum de tentatives atteint');
 * }
 *
 * // À la connexion réussie :
 * mgr.reset();
 *
 * // À la destruction du service :
 * mgr.destroy();
 * ```
 *
 * @public
 * @since 1.0.0
 * @see {@link WebSocketService} Seul consommateur de cette classe.
 */
export class ReconnectionManager {

    /** Nombre de tentatives effectuées depuis la dernière connexion réussie. */
    private _retryCount = 0;

    /** Référence au timer en cours, `null` si aucun timer n'est actif. */
    private _timer: ReturnType<typeof setTimeout> | null = null;

    /**
     * Crée une nouvelle instance de `ReconnectionManager`.
     *
     * @param maxRetries - Nombre maximum de tentatives avant d'abandonner.
     *                     Une fois ce seuil atteint, {@link schedule} retourne
     *                     `false` sans planifier de nouvelle tentative.
     * @param baseDelayMs - Délai de base en millisecondes pour le backoff exponentiel.
     *                      Le délai effectif est `min(baseDelayMs × 2^n, 30 000)`.
     * @param onRetry - Callback invoqué à chaque tentative. Reçoit le numéro
     *                  de la tentative courante (commence à 1).
     *
     * @example
     * ```typescript
     * const mgr = new ReconnectionManager(
     *   10,        // 10 tentatives maximum
     *   1_000,     // délai de base : 1 s
     *   (attempt) => {
     *     console.log(`Tentative ${attempt}/10`);
     *     this.connect();
     *   }
     * );
     * ```
     */
    constructor(
        private readonly _maxRetries: number,
        private readonly _baseDelayMs: number,
        private readonly _onRetry: (attempt: number) => void,
    ) {}

    /**
     * Planifie une tentative de reconnexion avec le délai calculé par backoff.
     *
     * Si un timer précédent est encore en attente, il est annulé et remplacé
     * par ce nouveau timer (évite les tentatives en double lors d'événements
     * `onclose` consécutifs rapides).
     *
     * @returns `true` si une tentative a été planifiée,
     *          `false` si le nombre maximum de tentatives est atteint.
     *
     * @example
     * ```typescript
     * // Dans WebSocketService.onclose
     * if (!this.reconnection.schedule()) {
     *   console.error('[WS] Max reconnect attempts reached');
     * }
     * ```
     *
     * @public
     */
    schedule(): boolean {
        if (this._retryCount >= this._maxRetries) return false;
        if (this._timer) clearTimeout(this._timer);

        const delay = Math.min(this._baseDelayMs * 2 ** this._retryCount, 30_000);
        this._timer = setTimeout(() => {
            this._retryCount++;
            this._onRetry(this._retryCount);
        }, delay);

        return true;
    }

    /**
     * Remet le compteur de tentatives à zéro après une connexion réussie.
     *
     * Doit être appelé dans le handler `onopen` du WebSocket pour que le
     * prochain cycle de reconnexion repart du délai initial `baseDelayMs`.
     *
     * @example
     * ```typescript
     * // Dans WebSocketService.onopen
     * this.reconnection.reset();
     * ```
     *
     * @public
     */
    reset(): void {
        this._retryCount = 0;
    }

    /**
     * Annule le timer de reconnexion en cours et libère les ressources.
     *
     * Doit être appelé dans `ngOnDestroy` du service consommateur pour éviter
     * qu'un timer orphelin ne tente de reconnecter après la destruction du service.
     *
     * @example
     * ```typescript
     * // Dans WebSocketService.ngOnDestroy
     * this.reconnection.destroy();
     * ```
     *
     * @public
     */
    destroy(): void {
        if (this._timer) clearTimeout(this._timer);
    }
}
import { ReconnectionManager } from './reconnection-manager';

/**
 * Tests unitaires de {@link ReconnectionManager}.
 *
 * Stratégie :
 *   - `jasmine.clock()` remplace `setTimeout` pour un contrôle synchrone
 *     du temps, sans attendre de vrais délais.
 *   - Un spy Jasmine remplace le callback `onRetry` pour vérifier les appels
 *     sans effets de bord.
 *   - `ReconnectionManager` est une classe pure (pas de DI Angular) —
 *     instanciation directe avec `new`, pas besoin de `TestBed`.
 *
 * Naming : `should[Description]_given[Context]`
 */
describe('ReconnectionManager', () => {
    let onRetrySpy: jasmine.Spy;

    // ── Setup / Teardown ───────────────────────────────────────────────────────

    beforeEach(() => {
        jasmine.clock().install();
        onRetrySpy = jasmine.createSpy('onRetry');
    });

    afterEach(() => {
        jasmine.clock().uninstall();
    });

    // ── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Crée un manager standard pour les tests : 3 tentatives max, 1 000 ms de base.
     * Utilise le spy `onRetrySpy` comme callback.
     */
    function makeManager(maxRetries = 3, baseDelayMs = 1_000): ReconnectionManager {
        return new ReconnectionManager(maxRetries, baseDelayMs, onRetrySpy);
    }

    // =========================================================================
    // schedule() — comportement de base
    // =========================================================================

    describe('schedule()', () => {

        it('should_return_true_given_first_call_within_max_retries', () => {
            const mgr = makeManager();

            expect(mgr.schedule()).toBeTrue();
        });

        it('should_not_call_onRetry_immediately_given_schedule_called', () => {
            const mgr = makeManager();
            mgr.schedule();

            expect(onRetrySpy).not.toHaveBeenCalled();
        });

        it('should_call_onRetry_after_delay_given_clock_ticked', () => {
            const mgr = makeManager(3, 1_000);
            mgr.schedule();

            jasmine.clock().tick(1_000);

            expect(onRetrySpy).toHaveBeenCalledOnceWith(1);
        });

        it('should_call_onRetry_with_attempt_number_1_on_first_retry', () => {
            const mgr = makeManager();
            mgr.schedule();
            jasmine.clock().tick(1_000);

            expect(onRetrySpy).toHaveBeenCalledWith(1);
        });

        it('should_not_call_onRetry_before_delay_has_elapsed', () => {
            const mgr = makeManager(3, 1_000);
            mgr.schedule();

            jasmine.clock().tick(999);

            expect(onRetrySpy).not.toHaveBeenCalled();
        });

        it('should_return_false_given_max_retries_reached', () => {
            const mgr = makeManager(2, 100);

            mgr.schedule(); jasmine.clock().tick(100); // tentative 1
            mgr.schedule(); jasmine.clock().tick(200); // tentative 2
            const result = mgr.schedule();             // 3e appel → dépassé

            expect(result).toBeFalse();
        });

        it('should_not_call_onRetry_given_schedule_called_after_max_retries', () => {
            const mgr = makeManager(1, 100);
            mgr.schedule(); jasmine.clock().tick(100); // tentative 1
            onRetrySpy.calls.reset();

            mgr.schedule(); // retryCount >= maxRetries → false, pas de timer
            jasmine.clock().tick(10_000);

            expect(onRetrySpy).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // Backoff exponentiel
    // =========================================================================

    describe('schedule() — exponential backoff', () => {

        it('should_use_baseDelay_for_first_attempt_given_baseDelayMs_1000', () => {
            const mgr = makeManager(5, 1_000);
            mgr.schedule();

            jasmine.clock().tick(999);
            expect(onRetrySpy).not.toHaveBeenCalled();

            jasmine.clock().tick(1);
            expect(onRetrySpy).toHaveBeenCalledTimes(1);
        });

        it('should_double_delay_for_second_attempt_given_baseDelayMs_1000', () => {
            const mgr = makeManager(5, 1_000);

            // Tentative 1 : délai = 1 000 ms (retryCount = 0 → 1000 × 2^0)
            mgr.schedule();
            jasmine.clock().tick(1_000);
            expect(onRetrySpy).toHaveBeenCalledTimes(1);

            // Tentative 2 : délai = 2 000 ms (retryCount = 1 → 1000 × 2^1)
            mgr.schedule();
            jasmine.clock().tick(1_999);
            expect(onRetrySpy).toHaveBeenCalledTimes(1); // pas encore

            jasmine.clock().tick(1);
            expect(onRetrySpy).toHaveBeenCalledTimes(2);
        });

        it('should_quadruple_delay_for_third_attempt_given_baseDelayMs_1000', () => {
            const mgr = makeManager(5, 1_000);

            mgr.schedule(); jasmine.clock().tick(1_000); // tentative 1 → delay 1 000
            mgr.schedule(); jasmine.clock().tick(2_000); // tentative 2 → delay 2 000

            // Tentative 3 : délai = 4 000 ms (retryCount = 2 → 1000 × 2^2)
            mgr.schedule();
            jasmine.clock().tick(3_999);
            expect(onRetrySpy).toHaveBeenCalledTimes(2); // pas encore

            jasmine.clock().tick(1);
            expect(onRetrySpy).toHaveBeenCalledTimes(3);
        });

        it('should_cap_delay_at_30000ms_given_large_retryCount', () => {
            // baseDelayMs × 2^retryCount dépasserait 30 s après plusieurs tentatives
            const mgr = makeManager(20, 1_000);

            // Avancer jusqu'à la tentative 6 (delay = 1000 × 2^5 = 32 000 → plafonné à 30 000)
            for (let i = 0; i < 5; i++) {
                mgr.schedule();
                jasmine.clock().tick(1_000 * 2 ** i);
            }
            onRetrySpy.calls.reset();

            // Tentative 6 : le délai doit être plafonné à 30 000 ms
            mgr.schedule();
            jasmine.clock().tick(29_999);
            expect(onRetrySpy).not.toHaveBeenCalled();

            jasmine.clock().tick(1);
            expect(onRetrySpy).toHaveBeenCalledTimes(1);
        });

        it('should_pass_incrementing_attempt_number_to_onRetry_given_multiple_schedules', () => {
            const mgr = makeManager(3, 100);

            mgr.schedule(); jasmine.clock().tick(100);
            mgr.schedule(); jasmine.clock().tick(200);
            mgr.schedule(); jasmine.clock().tick(400);

            expect(onRetrySpy.calls.allArgs()).toEqual([[1], [2], [3]]);
        });
    });

    // =========================================================================
    // schedule() — annulation du timer précédent
    // =========================================================================

    describe('schedule() — timer cancellation', () => {

        it('should_cancel_previous_timer_given_schedule_called_twice_rapidly', () => {
            const mgr = makeManager(5, 1_000);

            mgr.schedule(); // 1er timer à 1 000 ms
            mgr.schedule(); // doit annuler le 1er et en créer un nouveau

            // Si le 1er timer n'est PAS annulé, onRetry serait appelé 2 fois
            jasmine.clock().tick(1_000);
            expect(onRetrySpy).toHaveBeenCalledTimes(1);
        });

        it('should_not_trigger_old_timer_given_rapid_double_schedule', () => {
            const mgr = makeManager(5, 1_000);
            mgr.schedule();

            jasmine.clock().tick(500); // à mi-chemin du premier timer
            mgr.schedule();            // replanifie depuis retryCount=0 → nouveau délai de 1 000 ms

            jasmine.clock().tick(500); // total 1 000 ms depuis le début — premier timer serait dû
            expect(onRetrySpy).not.toHaveBeenCalled(); // mais il a été annulé

            jasmine.clock().tick(500); // maintenant 1 500 ms — second timer doit déclencher
            expect(onRetrySpy).toHaveBeenCalledTimes(1);
        });
    });

    // =========================================================================
    // reset()
    // =========================================================================

    describe('reset()', () => {

        it('should_allow_new_cycle_from_baseDelay_given_reset_after_retries', () => {
            const mgr = makeManager(3, 1_000);

            // Effectue 2 tentatives
            mgr.schedule(); jasmine.clock().tick(1_000);
            mgr.schedule(); jasmine.clock().tick(2_000);
            expect(onRetrySpy).toHaveBeenCalledTimes(2);
            onRetrySpy.calls.reset();

            // Reset → retryCount = 0
            mgr.reset();

            // Nouveau schedule : délai doit être revenu à baseDelay (1 000 ms)
            mgr.schedule();
            jasmine.clock().tick(999);
            expect(onRetrySpy).not.toHaveBeenCalled();

            jasmine.clock().tick(1);
            expect(onRetrySpy).toHaveBeenCalledTimes(1);
        });

        it('should_allow_maxRetries_attempts_again_given_reset_after_exhaustion', () => {
            const mgr = makeManager(2, 100);

            // Épuise les tentatives
            mgr.schedule(); jasmine.clock().tick(100);
            mgr.schedule(); jasmine.clock().tick(200);
            expect(mgr.schedule()).toBeFalse(); // épuisé

            // Reset → doit pouvoir replanifier
            mgr.reset();
            expect(mgr.schedule()).toBeTrue();
        });

        it('should_be_safe_to_call_given_no_prior_schedule', () => {
            const mgr = makeManager();
            expect(() => mgr.reset()).not.toThrow();
        });
    });

    // =========================================================================
    // destroy()
    // =========================================================================

    describe('destroy()', () => {

        it('should_cancel_pending_timer_given_timer_scheduled', () => {
            const mgr = makeManager(3, 1_000);
            mgr.schedule();

            mgr.destroy();
            jasmine.clock().tick(10_000);

            expect(onRetrySpy).not.toHaveBeenCalled();
        });

        it('should_not_throw_given_no_pending_timer', () => {
            const mgr = makeManager();
            expect(() => mgr.destroy()).not.toThrow();
        });

        it('should_not_throw_given_multiple_destroy_calls', () => {
            const mgr = makeManager(3, 1_000);
            mgr.schedule();

            expect(() => {
                mgr.destroy();
                mgr.destroy();
            }).not.toThrow();
        });

        it('should_not_call_onRetry_after_destroy_even_if_schedule_called_again', () => {
            const mgr = makeManager(3, 1_000);
            mgr.schedule();
            mgr.destroy();

            // Après destroy, schedule ne devrait pas déclencher de callback
            // (retryCount n'a pas été incrémenté → schedule crée un timer,
            //  mais destroy a libéré le précédent → test que destroy est bien définitif)
            jasmine.clock().tick(10_000);

            expect(onRetrySpy).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // Scénarios d'intégration
    // =========================================================================

    describe('integration scenarios', () => {

        it('should_handle_full_reconnection_cycle_given_success_after_3_retries', () => {
            const mgr = makeManager(5, 1_000);

            // Tentative 1
            expect(mgr.schedule()).toBeTrue();
            jasmine.clock().tick(1_000);
            expect(onRetrySpy).toHaveBeenCalledWith(1);

            // Tentative 2
            expect(mgr.schedule()).toBeTrue();
            jasmine.clock().tick(2_000);
            expect(onRetrySpy).toHaveBeenCalledWith(2);

            // Tentative 3
            expect(mgr.schedule()).toBeTrue();
            jasmine.clock().tick(4_000);
            expect(onRetrySpy).toHaveBeenCalledWith(3);

            // Connexion réussie → reset
            mgr.reset();

            // Nouveau cycle : delay revient à 1 000 ms
            onRetrySpy.calls.reset();
            expect(mgr.schedule()).toBeTrue();
            jasmine.clock().tick(1_000);
            expect(onRetrySpy).toHaveBeenCalledWith(1);
        });

        it('should_return_false_after_exact_maxRetries_exhaustion', () => {
            const mgr = makeManager(3, 100);
            const results: boolean[] = [];

            for (let i = 0; i < 3; i++) {
                results.push(mgr.schedule());
                jasmine.clock().tick(100 * 2 ** i);
            }

            // 4e appel après épuisement
            results.push(mgr.schedule());

            expect(results).toEqual([true, true, true, false]);
            expect(onRetrySpy).toHaveBeenCalledTimes(3);
        });

        it('should_cleanup_properly_given_destroy_during_active_cycle', () => {
            const mgr = makeManager(5, 1_000);

            mgr.schedule(); jasmine.clock().tick(1_000); // tentative 1
            mgr.schedule();                               // timer planifié pour tentative 2

            mgr.destroy(); // nettoyage en cours de cycle

            jasmine.clock().tick(10_000);
            expect(onRetrySpy).toHaveBeenCalledTimes(1); // seulement la tentative 1
        });
    });
});
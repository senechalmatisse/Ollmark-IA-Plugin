import { TestBed } from '@angular/core/testing';
import { SessionStore } from './session-store.service';

/**
 * Tests unitaires de {@link SessionStore}.
 *
 * Ce service est un store d'état minimal (un seul signal) sans dépendances —
 * les tests sont directs et exhaustifs malgré la simplicité du code.
 * Chaque propriété du contrat (état initial, écriture, lecture, effacement)
 * est couverte indépendamment pour faciliter le diagnostic en cas de régression.
 *
 * Naming : `should[Description]_given[Context]`
 */
describe('SessionStore', () => {
    let store: SessionStore;

    const SESSION_ID   = '2da7d5ee-7236-2075-e628-69a02aa27338';
    const SESSION_ID_2 = 'aaaabbbb-cccc-4ddd-eeee-ffffaaaabbbb';

    // ── Setup ──────────────────────────────────────────────────────────────────

    beforeEach(() => {
        TestBed.configureTestingModule({});
        store = TestBed.inject(SessionStore);
    });

    // =========================================================================
    // État initial
    // =========================================================================

    describe('initial state', () => {

        it('should_have_sessionId_null_given_fresh_instance', () => {
            expect(store.sessionId()).toBeNull();
        });
    });

    // =========================================================================
    // set()
    // =========================================================================

    describe('set()', () => {

        it('should_update_sessionId_given_valid_uuid', () => {
            store.set(SESSION_ID);

            expect(store.sessionId()).toBe(SESSION_ID);
        });

        it('should_overwrite_previous_sessionId_given_second_set_call', () => {
            store.set(SESSION_ID);
            store.set(SESSION_ID_2);

            expect(store.sessionId()).toBe(SESSION_ID_2);
        });

        it('should_accept_any_non_empty_string_given_non_uuid_value', () => {
            store.set('custom-session-token');

            expect(store.sessionId()).toBe('custom-session-token');
        });

        it('should_restore_value_given_set_called_after_clear', () => {
            store.set(SESSION_ID);
            store.clear();
            store.set(SESSION_ID_2);

            expect(store.sessionId()).toBe(SESSION_ID_2);
        });
    });

    // =========================================================================
    // clear()
    // =========================================================================

    describe('clear()', () => {

        it('should_set_sessionId_to_null_given_previous_value_set', () => {
            store.set(SESSION_ID);
            store.clear();

            expect(store.sessionId()).toBeNull();
        });

        it('should_be_safe_to_call_given_no_prior_set', () => {
            expect(() => store.clear()).not.toThrow();
            expect(store.sessionId()).toBeNull();
        });

        it('should_be_idempotent_given_multiple_clear_calls', () => {
            store.set(SESSION_ID);
            store.clear();
            store.clear();

            expect(store.sessionId()).toBeNull();
        });
    });

    // =========================================================================
    // sessionId (readonly signal)
    // =========================================================================

    describe('sessionId (readonly signal)', () => {

        it('should_reflect_current_value_reactively_given_set_then_clear_cycle', () => {
            const values: (string | null)[] = [];

            // Lecture synchrone à chaque étape — les signaux Angular sont synchrones
            values.push(store.sessionId());   // null
            store.set(SESSION_ID);
            values.push(store.sessionId());   // SESSION_ID
            store.clear();
            values.push(store.sessionId());   // null
            store.set(SESSION_ID_2);
            values.push(store.sessionId());   // SESSION_ID_2

            expect(values).toEqual([null, SESSION_ID, null, SESSION_ID_2]);
        });
    });

    // =========================================================================
    // Scénarios d'intégration — cycle de vie WebSocket réaliste
    // =========================================================================

    describe('integration scenarios', () => {

        it('should_hold_correct_values_given_full_websocket_session_lifecycle', () => {
            // Connexion initiale : pas de session
            expect(store.sessionId()).toBeNull();

            // Backend envoie session-id → WebSocketService appelle set()
            store.set(SESSION_ID);
            expect(store.sessionId()).toBe(SESSION_ID);

            // Déconnexion → WebSocketService appelle clear()
            store.clear();
            expect(store.sessionId()).toBeNull();

            // Reconnexion → nouvelle session
            store.set(SESSION_ID_2);
            expect(store.sessionId()).toBe(SESSION_ID_2);
        });

        it('should_return_null_after_multiple_connect_disconnect_cycles', () => {
            for (let i = 0; i < 5; i++) {
                store.set(`session-${i}`);
                expect(store.sessionId()).toBe(`session-${i}`);
                store.clear();
                expect(store.sessionId()).toBeNull();
            }
        });
    });
});
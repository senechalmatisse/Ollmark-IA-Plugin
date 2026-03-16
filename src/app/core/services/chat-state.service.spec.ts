import { TestBed } from '@angular/core/testing';
import { ChatStateService } from './chat-state.service';

/**
 * Tests unitaires de {@link ChatStateService}.
 *
 * Ce service est un store d'état pur (pas de HTTP, pas de DOM) —
 * chaque test crée une instance fraîche via `TestBed` pour garantir
 * l'isolation complète entre les cas.
 *
 * Naming : `should[Description]_given[Context]`
 */
describe('ChatStateService', () => {
    let service: ChatStateService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(ChatStateService);
    });

    // =========================================================================
    // État initial
    // =========================================================================

    describe('initial state', () => {

        it('should_have_empty_messages_given_fresh_instance', () => {
            expect(service.messages()).toEqual([]);
        });

        it('should_have_isLoading_false_given_fresh_instance', () => {
            expect(service.isLoading()).toBeFalse();
        });

        it('should_have_hasMessages_false_given_fresh_instance', () => {
            expect(service.hasMessages()).toBeFalse();
        });
    });

    // =========================================================================
    // addUserMessage()
    // =========================================================================

    describe('addUserMessage()', () => {

        it('should_add_user_message_to_list_given_content', () => {
            service.addUserMessage('Crée un rectangle bleu');

            const msgs = service.messages();
            expect(msgs.length).toBe(1);
            expect(msgs[0].role).toBe('user');
            expect(msgs[0].content).toBe('Crée un rectangle bleu');
        });

        it('should_return_uuid_id_given_any_content', () => {
            const id = service.addUserMessage('Hello');

            expect(id).toBeTruthy();
            expect(typeof id).toBe('string');
            // UUID v4 format
            expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        });

        it('should_set_message_id_matching_returned_id_given_content', () => {
            const id = service.addUserMessage('Test');

            expect(service.messages()[0].id).toBe(id);
        });

        it('should_set_timestamp_to_current_date_given_content', () => {
            const before = Date.now();
            service.addUserMessage('Test');
            const after = Date.now();

            const ts = service.messages()[0].timestamp.getTime();
            expect(ts).toBeGreaterThanOrEqual(before);
            expect(ts).toBeLessThanOrEqual(after);
        });

        it('should_append_messages_in_order_given_multiple_calls', () => {
            service.addUserMessage('Premier');
            service.addUserMessage('Second');

            const msgs = service.messages();
            expect(msgs.length).toBe(2);
            expect(msgs[0].content).toBe('Premier');
            expect(msgs[1].content).toBe('Second');
        });

        it('should_set_hasMessages_true_given_message_added', () => {
            service.addUserMessage('Hello');

            expect(service.hasMessages()).toBeTrue();
        });

        it('should_not_set_isLoading_or_isError_given_user_message', () => {
            service.addUserMessage('Test');

            const msg = service.messages()[0];
            expect(msg.isLoading).toBeFalsy();
            expect(msg.isError).toBeFalsy();
        });
    });

    // =========================================================================
    // addLoadingMessage()
    // =========================================================================

    describe('addLoadingMessage()', () => {

        it('should_add_assistant_loading_placeholder_given_call', () => {
            service.addLoadingMessage();

            const msgs = service.messages();
            expect(msgs.length).toBe(1);
            expect(msgs[0].role).toBe('assistant');
            expect(msgs[0].content).toBe('');
            expect(msgs[0].isLoading).toBeTrue();
        });

        it('should_return_unique_uuid_given_multiple_calls', () => {
            const id1 = service.addLoadingMessage();
            const id2 = service.addLoadingMessage();

            expect(id1).not.toBe(id2);
        });

        it('should_set_message_id_matching_returned_id_given_call', () => {
            const id = service.addLoadingMessage();

            const msg = service.messages().find((m) => m.id === id);
            expect(msg).toBeDefined();
        });

        it('should_not_set_isError_given_loading_message', () => {
            service.addLoadingMessage();

            expect(service.messages()[0].isError).toBeFalsy();
        });
    });

    // =========================================================================
    // resolveMessage()
    // =========================================================================

    describe('resolveMessage()', () => {

        it('should_update_content_and_clear_isLoading_given_valid_id', () => {
            const id = service.addLoadingMessage();

            service.resolveMessage(id, 'Rectangle créé avec succès !');

            const msg = service.messages().find((m) => m.id === id)!;
            expect(msg.content).toBe('Rectangle créé avec succès !');
            expect(msg.isLoading).toBeFalse();
        });

        it('should_not_modify_other_messages_given_valid_id', () => {
            const userId = service.addUserMessage('Demande');
            const loadId = service.addLoadingMessage();

            service.resolveMessage(loadId, 'Réponse IA');

            const userMsg = service.messages().find((m) => m.id === userId)!;
            expect(userMsg.content).toBe('Demande');
            expect(userMsg.role).toBe('user');
        });

        it('should_leave_list_unchanged_given_unknown_id', () => {
            service.addUserMessage('Message');
            const before = service.messages();

            service.resolveMessage('unknown-id', 'Contenu');

            expect(service.messages()).toEqual(before);
        });

        it('should_not_set_isError_given_resolved_message', () => {
            const id = service.addLoadingMessage();
            service.resolveMessage(id, 'OK');

            expect(service.messages().find((m) => m.id === id)!.isError).toBeFalsy();
        });
    });

    // =========================================================================
    // markMessageAsError()
    // =========================================================================

    describe('markMessageAsError()', () => {

        it('should_set_content_isError_true_and_isLoading_false_given_valid_id', () => {
            const id = service.addLoadingMessage();

            service.markMessageAsError(id, 'Erreur de communication');

            const msg = service.messages().find((m) => m.id === id)!;
            expect(msg.content).toBe('Erreur de communication');
            expect(msg.isError).toBeTrue();
            expect(msg.isLoading).toBeFalse();
        });

        it('should_not_modify_other_messages_given_valid_id', () => {
            const userId = service.addUserMessage('Demande');
            const loadId = service.addLoadingMessage();

            service.markMessageAsError(loadId, 'Erreur');

            const userMsg = service.messages().find((m) => m.id === userId)!;
            expect(userMsg.isError).toBeFalsy();
        });

        it('should_leave_list_unchanged_given_unknown_id', () => {
            service.addUserMessage('Message');
            const before = service.messages();

            service.markMessageAsError('unknown-id', 'Erreur');

            expect(service.messages()).toEqual(before);
        });
    });

    // =========================================================================
    // clearMessages()
    // =========================================================================

    describe('clearMessages()', () => {

        it('should_empty_messages_list_given_messages_present', () => {
            service.addUserMessage('Message 1');
            service.addLoadingMessage();

            service.clearMessages();

            expect(service.messages()).toEqual([]);
        });

        it('should_set_hasMessages_false_given_messages_were_present', () => {
            service.addUserMessage('Hello');
            service.clearMessages();

            expect(service.hasMessages()).toBeFalse();
        });

        it('should_be_no_op_given_empty_list', () => {
            service.clearMessages();

            expect(service.messages()).toEqual([]);
        });
    });

    // =========================================================================
    // setLoading()
    // =========================================================================

    describe('setLoading()', () => {

        it('should_set_isLoading_true_given_true', () => {
            service.setLoading(true);

            expect(service.isLoading()).toBeTrue();
        });

        it('should_set_isLoading_false_given_false_after_true', () => {
            service.setLoading(true);
            service.setLoading(false);

            expect(service.isLoading()).toBeFalse();
        });

        it('should_not_affect_messages_given_any_value', () => {
            service.addUserMessage('Test');
            const before = service.messages();

            service.setLoading(true);
            service.setLoading(false);

            expect(service.messages()).toEqual(before);
        });
    });

    // =========================================================================
    // hasMessages (computed)
    // =========================================================================

    describe('hasMessages (computed)', () => {

        it('should_be_false_given_empty_list', () => {
            expect(service.hasMessages()).toBeFalse();
        });

        it('should_be_true_given_at_least_one_message', () => {
            service.addUserMessage('Hello');

            expect(service.hasMessages()).toBeTrue();
        });

        it('should_return_false_given_messages_cleared_after_addition', () => {
            service.addUserMessage('Hello');
            service.clearMessages();

            expect(service.hasMessages()).toBeFalse();
        });
    });

    // =========================================================================
    // hydrateHistory()
    // =========================================================================

    describe('hydrateHistory()', () => {

        const HISTORY = [
            { role: 'user',      content: 'Crée un rectangle bleu' },
            { role: 'assistant', content: 'Rectangle créé avec succès !' },
        ];

        it('should_populate_messages_given_empty_state_and_valid_items', () => {
            service.hydrateHistory(HISTORY);

            expect(service.messages().length).toBe(2);
        });

        it('should_map_roles_correctly_given_user_and_assistant_items', () => {
            service.hydrateHistory(HISTORY);

            const msgs = service.messages();
            expect(msgs[0].role).toBe('user');
            expect(msgs[1].role).toBe('assistant');
        });

        it('should_map_content_correctly_given_valid_items', () => {
            service.hydrateHistory(HISTORY);

            const msgs = service.messages();
            expect(msgs[0].content).toBe('Crée un rectangle bleu');
            expect(msgs[1].content).toBe('Rectangle créé avec succès !');
        });

        it('should_normalize_unknown_role_to_assistant_given_unknown_role', () => {
            service.hydrateHistory([{ role: 'system', content: 'Contexte' }]);

            expect(service.messages()[0].role).toBe('assistant');
        });

        it('should_assign_uuid_to_each_message_given_valid_items', () => {
            service.hydrateHistory(HISTORY);

            const msgs = service.messages();
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            expect(msgs[0].id).toMatch(uuidPattern);
            expect(msgs[1].id).toMatch(uuidPattern);
            expect(msgs[0].id).not.toBe(msgs[1].id);
        });

        it('should_not_overwrite_existing_messages_given_messages_already_present', () => {
            service.addUserMessage('Message existant');
            const before = service.messages();

            service.hydrateHistory(HISTORY);

            expect(service.messages()).toEqual(before);
        });

        it('should_be_no_op_given_empty_items_array', () => {
            service.hydrateHistory([]);

            expect(service.messages()).toEqual([]);
        });

        it('should_be_no_op_given_null_or_undefined_items', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            service.hydrateHistory(null as any);

            expect(service.messages()).toEqual([]);
        });

        it('should_set_hasMessages_true_given_successful_hydration', () => {
            service.hydrateHistory(HISTORY);

            expect(service.hasMessages()).toBeTrue();
        });
    });

    // =========================================================================
    // Scénarios d'intégration
    // =========================================================================

    describe('integration scenarios', () => {

        it('should_handle_full_message_lifecycle_given_send_resolve_cycle', () => {
            // 1. Utilisateur envoie
            service.addUserMessage('Crée un cercle jaune');

            // 2. Placeholder de chargement ajouté
            const loadId = service.addLoadingMessage();
            service.setLoading(true);

            expect(service.messages().length).toBe(2);
            expect(service.messages()[1].isLoading).toBeTrue();
            expect(service.isLoading()).toBeTrue();

            // 3. Réponse reçue
            service.resolveMessage(loadId, 'Cercle jaune créé !');
            service.setLoading(false);

            const msgs = service.messages();
            expect(msgs.length).toBe(2);
            expect(msgs[1].content).toBe('Cercle jaune créé !');
            expect(msgs[1].isLoading).toBeFalse();
            expect(service.isLoading()).toBeFalse();
        });

        it('should_handle_error_lifecycle_given_send_error_cycle', () => {
            service.addUserMessage('Action impossible');
            const loadId = service.addLoadingMessage();
            service.setLoading(true);

            service.markMessageAsError(loadId, 'Erreur de communication');
            service.setLoading(false);

            const msg = service.messages().find((m) => m.id === loadId)!;
            expect(msg.isError).toBeTrue();
            expect(msg.content).toBe('Erreur de communication');
            expect(service.isLoading()).toBeFalse();
        });

        it('should_clear_all_state_and_allow_hydration_after_reset_given_prior_messages', () => {
            service.addUserMessage('Message avant reset');
            service.addLoadingMessage();

            service.clearMessages();
            service.hydrateHistory([
                { role: 'user',      content: 'Ancien message' },
                { role: 'assistant', content: 'Ancienne réponse' },
            ]);

            expect(service.messages().length).toBe(2);
            expect(service.messages()[0].content).toBe('Ancien message');
        });

        it('should_preserve_independent_messages_given_multiple_concurrent_loading_messages', () => {
            service.addUserMessage('Premier');
            const loadId1 = service.addLoadingMessage();
            service.addUserMessage('Second');
            const loadId2 = service.addLoadingMessage();

            service.resolveMessage(loadId1, 'Réponse 1');
            service.markMessageAsError(loadId2, 'Erreur 2');

            const msg1 = service.messages().find((m) => m.id === loadId1)!;
            const msg2 = service.messages().find((m) => m.id === loadId2)!;
            expect(msg1.content).toBe('Réponse 1');
            expect(msg1.isError).toBeFalsy();
            expect(msg2.content).toBe('Erreur 2');
            expect(msg2.isError).toBeTrue();
        });
    });
});
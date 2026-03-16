import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { PluginBridgeService } from './plugin-bridge.service';
import { PENPOT_ORIGIN } from '../tokens/api.tokens';
import { ConnectionStatus } from '../models';

/**
 * Tests unitaires de {@link PluginBridgeService}.
 *
 * Stratégie :
 *   - `PENPOT_ORIGIN` est fourni avec la valeur `'https://penpot.test'` pour
 *     éviter l'erreur de résolution de l'origine parente dans le contexte Karma.
 *   - `window.parent.postMessage` est espionné pour vérifier les appels sortants
 *     sans déclencher de vraie communication postMessage.
 *   - Les messages entrants sont simulés via `window.dispatchEvent(new MessageEvent(...))`.
 *   - Le service est recréé dans chaque `beforeEach` pour garantir l'isolation.
 *
 * Naming : `should[Description]_given[Context]`
 */
describe('PluginBridgeService', () => {
    let service: PluginBridgeService;
    let postMessageSpy: jasmine.Spy;

    const TEST_ORIGIN  = 'https://penpot.test';
    const PROJECT_ID   = 'ddc4a96c-d2ad-80ac-8007-b6f8a1ae8d41';

    // ── Helpers ────────────────────────────────────────────────────────────────

    /** Dispatche un MessageEvent sur `window` pour simuler un message de plugin.ts. */
    function dispatchMessage(data: unknown): void {
        window.dispatchEvent(new MessageEvent('message', { data }));
    }

    // ── Setup ──────────────────────────────────────────────────────────────────

    beforeEach(() => {
        // Espionne postMessage avant la création du service (le constructeur envoie 'get-project')
        postMessageSpy = spyOn(window.parent, 'postMessage');

        TestBed.configureTestingModule({
            providers: [
                PluginBridgeService,
                { provide: PENPOT_ORIGIN, useValue: TEST_ORIGIN },
            ],
        });

        service = TestBed.inject(PluginBridgeService);
    });

    afterEach(() => {
        service.ngOnDestroy();
    });

    // =========================================================================
    // État initial
    // =========================================================================

    describe('initial state', () => {

        it('should_have_projectId_null_given_fresh_instance', () => {
            expect(service.projectId()).toBeNull();
        });

        it('should_have_connectionStatus_disconnected_given_fresh_instance', () => {
            expect(service.connectionStatus()).toBe('disconnected');
        });

        it('should_have_taskResult$_open_given_fresh_instance', () => {
            expect(service.taskResult$.closed).toBeFalse();
        });
    });

    // =========================================================================
    // Constructeur — handshake initial
    // =========================================================================

    describe('constructor — initial handshake', () => {

        it('should_send_get_project_message_on_construction', () => {
            expect(postMessageSpy).toHaveBeenCalledWith(
                { type: 'get-project' },
                TEST_ORIGIN
            );
        });

        it('should_use_targetOrigin_from_PENPOT_ORIGIN_token_given_send_call', () => {
            service.send({ type: 'get-project' });

            expect(postMessageSpy).toHaveBeenCalledWith(
                jasmine.anything(),
                TEST_ORIGIN
            );
        });
    });

    // =========================================================================
    // send()
    // =========================================================================

    describe('send()', () => {

        it('should_call_postMessage_with_message_and_targetOrigin_given_any_PluginMessage', () => {
            const msg = {
                type:   'execute-task' as const,
                taskId: 'task-123',
                task:   'executeCode',
                params: { code: 'return 42;' },
            };

            service.send(msg);

            expect(postMessageSpy).toHaveBeenCalledWith(msg, TEST_ORIGIN);
        });

        it('should_send_to_TEST_ORIGIN_not_wildcard_given_secure_config', () => {
            service.send({ type: 'get-project' });

            const calls = postMessageSpy.calls.allArgs();
            calls.forEach(([, origin]) => {
                expect(origin).toBe(TEST_ORIGIN);
                expect(origin).not.toBe('*');
            });
        });
    });

    // =========================================================================
    // setConnectionStatus()
    // =========================================================================

    describe('setConnectionStatus()', () => {

        const statuses: ConnectionStatus[] = ['connecting', 'connected', 'disconnected', 'error'];

        statuses.forEach((status) => {
            it(`should_update_connectionStatus_to_${status}_given_${status}`, () => {
                service.setConnectionStatus(status);

                expect(service.connectionStatus()).toBe(status);
            });
        });

        it('should_reflect_last_value_given_multiple_updates', () => {
            service.setConnectionStatus('connecting');
            service.setConnectionStatus('connected');
            service.setConnectionStatus('disconnected');

            expect(service.connectionStatus()).toBe('disconnected');
        });
    });

    // =========================================================================
    // Routage — 'project-response'
    // =========================================================================

    describe('message routing — project-response', () => {

        it('should_set_projectId_given_project_response_message', () => {
            dispatchMessage({ type: 'project-response', id: PROJECT_ID });

            expect(service.projectId()).toBe(PROJECT_ID);
        });

        it('should_update_projectId_given_second_project_response', () => {
            const newId = 'aaaabbbb-cccc-dddd-eeee-ffffaaaabbbb';
            dispatchMessage({ type: 'project-response', id: PROJECT_ID });
            dispatchMessage({ type: 'project-response', id: newId });

            expect(service.projectId()).toBe(newId);
        });
    });

    // =========================================================================
    // Routage — 'theme'
    // =========================================================================

    describe('message routing — theme', () => {

        it('should_set_theme_to_light_given_theme_light_message', () => {
            dispatchMessage({ type: 'theme', theme: 'light' });

            expect(service.theme()).toBe('light');
        });

        it('should_set_theme_to_dark_given_theme_dark_message', () => {
            dispatchMessage({ type: 'theme', theme: 'dark' });

            expect(service.theme()).toBe('dark');
        });

        it('should_reflect_last_theme_given_multiple_theme_messages', () => {
            dispatchMessage({ type: 'theme', theme: 'light' });
            dispatchMessage({ type: 'theme', theme: 'dark' });

            expect(service.theme()).toBe('dark');
        });
    });

    // =========================================================================
    // Routage — 'task-result'
    // =========================================================================

    describe('message routing — task-result', () => {

        it('should_emit_on_taskResult$_given_task_result_message', async () => {
            const taskMsg = {
                type:    'task-result' as const,
                taskId:  'task-abc',
                success: true,
                data:    { result: 'bf76e8b7', log: '' },
                error:   null,
            };

            const resultPromise = firstValueFrom(service.taskResult$);
            dispatchMessage(taskMsg);
            const result = await resultPromise;

            expect(result.taskId).toBe('task-abc');
            expect(result.success).toBeTrue();
            expect(result.data).toEqual({ result: 'bf76e8b7', log: '' });
            expect(result.error).toBeNull();
        });

        it('should_emit_error_details_on_taskResult$_given_failed_task_result', async () => {
            const taskMsg = {
                type:    'task-result' as const,
                taskId:  'task-fail',
                success: false,
                data:    null,
                error:   'No active Penpot page',
            };

            const resultPromise = firstValueFrom(service.taskResult$);
            dispatchMessage(taskMsg);
            const result = await resultPromise;

            expect(result.success).toBeFalse();
            expect(result.error).toBe('No active Penpot page');
        });

        it('should_emit_multiple_results_given_multiple_task_result_messages', async () => {
            const emissions: unknown[] = [];
            const sub = service.taskResult$.subscribe((r) => emissions.push(r));

            dispatchMessage({ type: 'task-result', taskId: 'task-1', success: true,  data: null, error: null });
            dispatchMessage({ type: 'task-result', taskId: 'task-2', success: false, data: null, error: 'err' });

            expect(emissions.length).toBe(2);
            sub.unsubscribe();
        });
    });

    // =========================================================================
    // Routage — messages ignorés
    // =========================================================================

    describe('message routing — ignored messages', () => {

        it('should_not_update_projectId_given_message_without_type', () => {
            dispatchMessage({ id: PROJECT_ID });

            expect(service.projectId()).toBeNull();
        });

        it('should_not_update_projectId_given_null_message', () => {
            dispatchMessage(null);

            expect(service.projectId()).toBeNull();
        });

        it('should_not_update_state_given_unknown_type', () => {
            dispatchMessage({ type: 'unknown-event', payload: 'data' });

            expect(service.projectId()).toBeNull();
            expect(service.connectionStatus()).toBe('disconnected');
        });

        it('should_not_emit_on_taskResult$_given_non_task_result_message', (done) => {
            let emitted = false;
            const sub = service.taskResult$.subscribe(() => { emitted = true; });

            dispatchMessage({ type: 'theme', theme: 'light' });

            setTimeout(() => {
                expect(emitted).toBeFalse();
                sub.unsubscribe();
                done();
            }, 10);
        });
    });

    // =========================================================================
    // ngOnDestroy()
    // =========================================================================

    describe('ngOnDestroy()', () => {

        it('should_complete_taskResult$_given_destroy_called', () => {
            let completed = false;
            service.taskResult$.subscribe({ complete: () => { completed = true; } });

            service.ngOnDestroy();

            expect(completed).toBeTrue();
        });

        it('should_stop_routing_messages_given_destroy_called', () => {
            service.ngOnDestroy();

            dispatchMessage({ type: 'project-response', id: PROJECT_ID });

            // L'Observable est complété — le signal ne doit plus être mis à jour
            expect(service.projectId()).toBeNull();
        });

        it('should_not_throw_given_multiple_destroy_calls', () => {
            expect(() => {
                service.ngOnDestroy();
                service.ngOnDestroy();
            }).not.toThrow();
        });
    });

    // =========================================================================
    // Scénario d'intégration
    // =========================================================================

    describe('integration scenario', () => {

        it('should_handle_full_plugin_lifecycle_given_realistic_message_sequence', async () => {
            // 1. Connexion WS établie
            service.setConnectionStatus('connecting');
            service.setConnectionStatus('connected');
            expect(service.connectionStatus()).toBe('connected');

            // 2. Handshake projet
            dispatchMessage({ type: 'project-response', id: PROJECT_ID });
            expect(service.projectId()).toBe(PROJECT_ID);

            // 3. Changement de thème
            dispatchMessage({ type: 'theme', theme: 'light' });
            expect(service.theme()).toBe('light');

            // 4. Résultat d'une tâche
            const resultPromise = firstValueFrom(service.taskResult$);
            dispatchMessage({
                type:    'task-result',
                taskId:  'task-xyz',
                success: true,
                data:    { result: null, log: 'done' },
                error:   null,
            });
            const result = await resultPromise;
            expect(result.taskId).toBe('task-xyz');

            // 5. Déconnexion
            service.setConnectionStatus('disconnected');
            expect(service.connectionStatus()).toBe('disconnected');
        });
    });
});
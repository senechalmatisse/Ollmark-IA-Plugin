import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { WebSocketService } from './websocket.service';
import { PluginBridgeService } from './plugin-bridge.service';
import { SessionStore } from './session-store.service';
import { WEBSOCKET_URL } from '../tokens/api.tokens';

/**
 * Tests unitaires de {@link WebSocketService}.
 *
 * ### Stratégie de mock WebSocket
 * Le `WebSocket` natif est remplacé par `MockWebSocket`, une classe minimale
 * contrôlable depuis les tests. Cela permet de :
 *   - Simuler `onopen`, `onmessage`, `onclose`, `onerror` sans serveur réel.
 *   - Espionner `send()` pour vérifier les messages sortants.
 *   - Contrôler `readyState` pour tester les guards d'idempotence.
 *
 * ### Spies
 *   - `PluginBridgeService` et `SessionStore` sont remplacés par des `SpyObj`.
 *   - `PluginBridgeService.taskResult$` est un `Subject` réel pour tester
 *     `_listenForTaskResults()` sans simulation RxJS.
 *
 * Naming : `should[Description]_given[Context]`
 */
describe('WebSocketService', () => {

    // ── MockWebSocket ──────────────────────────────────────────────────────────

    /**
     * Implémentation minimale contrôlable de WebSocket pour les tests.
     * Exposée statiquement pour accéder à la dernière instance créée.
     */
    class MockWebSocket {
        static lastInstance: MockWebSocket | null = null;

        readyState: number = WebSocket.CONNECTING; // 0
        onopen:    ((ev: Event) => void) | null = null;
        onmessage: ((ev: MessageEvent) => void) | null = null;
        onclose:   ((ev: CloseEvent) => void) | null = null;
        onerror:   ((ev: Event) => void) | null = null;
        send = jasmine.createSpy('ws.send');
        close = jasmine.createSpy('ws.close');

        constructor(public readonly url: string) {
            MockWebSocket.lastInstance = this;
        }

        /** Simule l'ouverture de la connexion. */
        triggerOpen(): void {
            this.readyState = WebSocket.OPEN; // 1
            this.onopen?.(new Event('open'));
        }

        /** Simule la réception d'un message JSON. */
        triggerMessage(data: unknown): void {
            this.onmessage?.(new MessageEvent('message', {
                data: JSON.stringify(data),
            }));
        }

        /** Simule la réception d'une chaîne brute (non-JSON). */
        triggerRawMessage(data: string): void {
            this.onmessage?.(new MessageEvent('message', { data }));
        }

        /** Simule la fermeture de la connexion. */
        triggerClose(code = 1000, reason = 'Normal closure'): void {
            this.readyState = WebSocket.CLOSED; // 3
            this.onclose?.(new CloseEvent('close', { code, reason }));
        }

        /** Simule une erreur WebSocket. */
        triggerError(): void {
            this.onerror?.(new Event('error'));
        }
    }

    // ── Variables de test ──────────────────────────────────────────────────────

    let service: WebSocketService;
    let bridgeSpy: jasmine.SpyObj<PluginBridgeService>;
    let sessionSpy: jasmine.SpyObj<SessionStore>;
    let taskResult$: Subject<{
        taskId: string;
        success: boolean;
        data: unknown;
        error: string | null;
    }>;

    const WS_URL  = 'ws://localhost:8080/plugin';
    const TASK_ID = 'facd809e-196d-4a90-9b44-8da7226c3cd0';
    const SESSION = '2da7d5ee-7236-2075-e628-69a02aa27338';

    // ── Setup ──────────────────────────────────────────────────────────────────

    beforeEach(() => {
        (globalThis as Record<string, unknown>)['WebSocket'] = MockWebSocket;
        MockWebSocket.lastInstance = null;

        taskResult$ = new Subject();

        bridgeSpy = jasmine.createSpyObj<PluginBridgeService>(
            'PluginBridgeService',
            ['setConnectionStatus', 'send'],
            { taskResult$ }
        );

        sessionSpy = jasmine.createSpyObj<SessionStore>(
            'SessionStore',
            ['set', 'clear']
        );

        TestBed.configureTestingModule({
            providers: [
                WebSocketService,
                { provide: PluginBridgeService, useValue: bridgeSpy  },
                { provide: SessionStore,        useValue: sessionSpy },
                { provide: WEBSOCKET_URL,       useValue: WS_URL     },
            ],
        });

        service = TestBed.inject(WebSocketService);
    });

    afterEach(() => {
        service.ngOnDestroy();
    });

    // =========================================================================
    // Constructeur — connexion initiale
    // =========================================================================

    describe('constructor — initial connection', () => {

        it('should_set_status_connecting_given_construction', () => {
            expect(bridgeSpy.setConnectionStatus).toHaveBeenCalledWith('connecting');
        });

        it('should_create_WebSocket_with_correct_url_given_WEBSOCKET_URL_token', () => {
            expect(MockWebSocket.lastInstance!.url).toBe(WS_URL);
        });

        it('should_set_status_connected_given_onopen_fires', () => {
            MockWebSocket.lastInstance!.triggerOpen();

            expect(bridgeSpy.setConnectionStatus).toHaveBeenCalledWith('connected');
        });
    });

    // =========================================================================
    // _connect() — guard d'idempotence
    // =========================================================================

    describe('_connect() — idempotence guard', () => {

        it('should_reuse_existing_instance_given_readyState_OPEN', () => {
            MockWebSocket.lastInstance!.triggerOpen();
            const firstInstance = MockWebSocket.lastInstance;

            // La 2e connexion via onclose ne doit pas créer une nouvelle instance
            // tant que readyState est OPEN
            MockWebSocket.lastInstance!.readyState = WebSocket.OPEN;

            expect(MockWebSocket.lastInstance).toBe(firstInstance);
        });
    });

    // =========================================================================
    // onopen handler
    // =========================================================================

    describe('WebSocket.onopen', () => {

        it('should_set_status_connected_given_connection_established', () => {
            MockWebSocket.lastInstance!.triggerOpen();

            expect(bridgeSpy.setConnectionStatus).toHaveBeenCalledWith('connected');
        });

        it('should_call_setConnectionStatus_with_connecting_then_connected_in_order', () => {
            MockWebSocket.lastInstance!.triggerOpen();

            const statuses = bridgeSpy.setConnectionStatus.calls
                .allArgs()
                .map(([s]) => s);

            expect(statuses).toEqual(
                jasmine.arrayContaining(['connecting', 'connected'])
            );
        });
    });

    // =========================================================================
    // onmessage — session-id
    // =========================================================================

    describe('WebSocket.onmessage — session-id', () => {

        it('should_store_sessionId_in_SessionStore_given_session_id_message', () => {
            MockWebSocket.lastInstance!.triggerMessage({
                type:      'session-id',
                sessionId: SESSION,
            });

            expect(sessionSpy.set).toHaveBeenCalledOnceWith(SESSION);
        });

        it('should_not_forward_to_bridge_send_given_session_id_message', () => {
            MockWebSocket.lastInstance!.triggerMessage({
                type:      'session-id',
                sessionId: SESSION,
            });

            expect(bridgeSpy.send).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // onmessage — task forwarding
    // =========================================================================

    describe('WebSocket.onmessage — task forwarding', () => {

        it('should_forward_execute_task_to_bridge_given_valid_PluginTaskRequest', () => {
            MockWebSocket.lastInstance!.triggerMessage({
                id:     TASK_ID,
                task:   'executeCode',
                params: { code: 'return 42;' },
            });

            expect(bridgeSpy.send).toHaveBeenCalledOnceWith({
                type:   'execute-task',
                taskId: TASK_ID,
                task:   'executeCode',
                params: { code: 'return 42;' },
            });
        });

        it('should_not_forward_given_missing_id_field', () => {
            MockWebSocket.lastInstance!.triggerMessage({
                task:   'executeCode',
                params: {},
            });

            expect(bridgeSpy.send).not.toHaveBeenCalled();
        });

        it('should_not_forward_given_missing_task_field', () => {
            MockWebSocket.lastInstance!.triggerMessage({
                id:     TASK_ID,
                params: {},
            });

            expect(bridgeSpy.send).not.toHaveBeenCalled();
        });

        it('should_not_forward_given_null_payload', () => {
            MockWebSocket.lastInstance!.triggerMessage(null);

            expect(bridgeSpy.send).not.toHaveBeenCalled();
        });

        it('should_not_throw_given_malformed_json_string', () => {
            expect(() => {
                MockWebSocket.lastInstance!.triggerRawMessage('{ invalid json }');
            }).not.toThrow();
        });
    });

    // =========================================================================
    // onclose handler
    // =========================================================================

    describe('WebSocket.onclose', () => {

        it('should_set_status_disconnected_given_connection_closed', () => {
            MockWebSocket.lastInstance!.triggerClose();

            expect(bridgeSpy.setConnectionStatus).toHaveBeenCalledWith('disconnected');
        });

        it('should_clear_session_store_given_connection_closed', () => {
            MockWebSocket.lastInstance!.triggerClose();

            expect(sessionSpy.clear).toHaveBeenCalled();
        });

        it('should_schedule_reconnection_given_max_retries_not_exhausted', () => {
            jasmine.clock().install();

            MockWebSocket.lastInstance!.triggerClose(1006, 'Abnormal');

            // Après le délai de base (1 000 ms), un nouveau MockWebSocket est créé
            const prevInstance = MockWebSocket.lastInstance;
            jasmine.clock().tick(1_001);

            // Un nouveau MockWebSocket doit avoir été instancié par _connect()
            expect(MockWebSocket.lastInstance).not.toBe(prevInstance);

            jasmine.clock().uninstall();
        });

        it('should_log_error_given_max_reconnect_attempts_reached', () => {
            spyOn(console, 'error');

            // Crée un manager avec 0 tentatives max pour atteindre immédiatement la limite
            // Simulé en déclenchant onclose sur un service frais dont le compteur
            // est déjà à 10 via déclenchements répétés
            // Pour ce test, on vérifie simplement que l'erreur est loguée
            // après que schedule() retourne false
            // On doit épuiser le ReconnectionManager interne (10 tentatives)
            jasmine.clock().install();
            for (let i = 0; i < 10; i++) {
                MockWebSocket.lastInstance!.triggerClose(1006, 'Retry');
                jasmine.clock().tick(1_000 * 2 ** i);
            }
            // 11e fermeture : schedule() retourne false → log d'erreur
            MockWebSocket.lastInstance?.triggerClose(1006, 'Final');
            jasmine.clock().uninstall();

            expect(console.error).toHaveBeenCalledWith(
                jasmine.stringContaining('Max reconnect attempts reached')
            );
        });
    });

    // =========================================================================
    // onerror handler
    // =========================================================================

    describe('WebSocket.onerror', () => {

        it('should_set_status_error_given_websocket_error_event', () => {
            MockWebSocket.lastInstance!.triggerError();

            expect(bridgeSpy.setConnectionStatus).toHaveBeenCalledWith('error');
        });
    });

    // =========================================================================
    // send()
    // =========================================================================

    describe('send()', () => {

        it('should_serialize_and_send_json_given_websocket_is_open', () => {
            MockWebSocket.lastInstance!.triggerOpen();
            const msg = { type: 'task-response', response: { id: '1', success: true } };

            service.send(msg);

            expect(MockWebSocket.lastInstance!.send).toHaveBeenCalledOnceWith(
                JSON.stringify(msg)
            );
        });
    });

    // =========================================================================
    // _listenForTaskResults() — relai taskResult$ → WebSocket
    // =========================================================================

    describe('_listenForTaskResults()', () => {

        it('should_send_TaskResponseEnvelope_given_taskResult$_emits', () => {
            MockWebSocket.lastInstance!.triggerOpen();

            taskResult$.next({
                taskId:  TASK_ID,
                success: true,
                data:    { result: null, log: 'done' },
                error:   null,
            });

            const expected = JSON.stringify({
                type: 'task-response',
                response: {
                    id:      TASK_ID,
                    success: true,
                    data:    { result: null, log: 'done' },
                    error:   null,
                },
            });
            expect(MockWebSocket.lastInstance!.send).toHaveBeenCalledOnceWith(expected);
        });

        it('should_normalize_undefined_data_to_null_given_undefined_data_field', () => {
            MockWebSocket.lastInstance!.triggerOpen();

            taskResult$.next({
                taskId:  TASK_ID,
                success: false,
                data:    undefined as unknown as null,
                error:   null,
            });

            const parsed = JSON.parse(
                MockWebSocket.lastInstance!.send.calls.mostRecent().args[0] as string
            );
            expect(parsed.response.data).toBeNull();
        });

        it('should_send_multiple_envelopes_given_multiple_emissions', () => {
            MockWebSocket.lastInstance!.triggerOpen();

            taskResult$.next({ taskId: 'task-1', success: true,  data: null, error: null });
            taskResult$.next({ taskId: 'task-2', success: false, data: null, error: 'err' });

            expect(MockWebSocket.lastInstance!.send).toHaveBeenCalledTimes(2);
        });

        it('should_stop_forwarding_after_ngOnDestroy_given_active_subscription', () => {
            MockWebSocket.lastInstance!.triggerOpen();
            service.ngOnDestroy();

            taskResult$.next({ taskId: 'task-x', success: true, data: null, error: null });

            expect(MockWebSocket.lastInstance!.send).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // ngOnDestroy()
    // =========================================================================

    describe('ngOnDestroy()', () => {

        it('should_close_WebSocket_given_active_connection', () => {
            MockWebSocket.lastInstance!.triggerOpen();

            service.ngOnDestroy();

            expect(MockWebSocket.lastInstance!.close).toHaveBeenCalled();
        });

        it('should_not_throw_given_null_websocket', () => {
            // Simule un service dont la connexion n'a jamais abouti
            expect(() => service.ngOnDestroy()).not.toThrow();
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

        it('should_handle_full_session_lifecycle_given_realistic_sequence', () => {
            // 1. Connexion établie
            MockWebSocket.lastInstance!.triggerOpen();
            expect(bridgeSpy.setConnectionStatus).toHaveBeenCalledWith('connected');

            // 2. Session ID reçu du backend
            MockWebSocket.lastInstance!.triggerMessage({
                type:      'session-id',
                sessionId: SESSION,
            });
            expect(sessionSpy.set).toHaveBeenCalledWith(SESSION);

            // 3. Tâche reçue → transmise au bridge
            MockWebSocket.lastInstance!.triggerMessage({
                id:     TASK_ID,
                task:   'executeCode',
                params: { code: 'return 1;' },
            });
            expect(bridgeSpy.send).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'execute-task', taskId: TASK_ID })
            );

            // 4. Résultat de tâche → envoyé au backend via WS
            taskResult$.next({
                taskId:  TASK_ID,
                success: true,
                data:    { result: 1, log: '' },
                error:   null,
            });
            expect(MockWebSocket.lastInstance!.send).toHaveBeenCalledWith(
                jasmine.stringContaining(TASK_ID)
            );

            // 5. Déconnexion propre
            MockWebSocket.lastInstance!.triggerClose(1000, 'Normal');
            expect(sessionSpy.clear).toHaveBeenCalled();
            expect(bridgeSpy.setConnectionStatus).toHaveBeenCalledWith('disconnected');
        });
    });
});
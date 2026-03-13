import { WebSocketClient } from './websocket-client';
import { CodeExecutor } from './code-executor';
import type { ExecutionResult, PluginTaskRequest } from './plugin-types';

/**
 * Tests unitaires de {@link WebSocketClient}.
 *
 * Objectifs :
 * - vérifier l'ouverture de la connexion WebSocket
 * - vérifier le traitement d'un message entrant valide
 * - vérifier l'envoi du PluginTaskResponse au backend
 * - vérifier la robustesse face aux payloads invalides
 * - vérifier la reconnexion automatique après fermeture
 * - vérifier l'arrêt propre lors d'une fermeture manuelle
 *
 * Ces tests utilisent un mock du constructeur WebSocket et un spy sur CodeExecutor.
 */
describe('WebSocketClient', () => {
    let originalWebSocket: typeof WebSocket | undefined;
    let mockSocket: MockWebSocketInstance;
    let mockWebSocketConstructor: jasmine.Spy;
    let sendSpy: jasmine.Spy;
    let closeSpy: jasmine.Spy;
    let executeSpy: jasmine.Spy<(task: PluginTaskRequest) => Promise<ExecutionResult>>;

    interface MockWebSocketInstance {
        readyState: number;
        send: jasmine.Spy;
        close: jasmine.Spy;
        onopen: ((event?: Event) => void) | null;
        onmessage: ((event: MessageEvent<string>) => void | Promise<void>) | null;
        onerror: ((event?: Event) => void) | null;
        onclose: ((event?: CloseEvent) => void) | null;
    }

    beforeEach(() => {
        originalWebSocket = globalThis.WebSocket;

        sendSpy = jasmine.createSpy('send');
        closeSpy = jasmine.createSpy('close');

        executeSpy = spyOn(CodeExecutor.prototype, 'execute');

        mockSocket = {
        readyState: 1,
        send: sendSpy,
        close: closeSpy,
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
        };

        mockWebSocketConstructor = jasmine
        .createSpy('WebSocket')
        .and.callFake(function() {
            return mockSocket;
        });

        /**
         * On reproduit explicitement les constantes statiques natives
         * utilisées dans l'implémentation :
         * - CONNECTING = 0
         * - OPEN = 1
         * - CLOSING = 2
         * - CLOSED = 3
         */
        Object.assign(mockWebSocketConstructor, {
        CONNECTING: 0,
        OPEN: 1,
        CLOSING: 2,
        CLOSED: 3,
        });

        (globalThis as typeof globalThis & { WebSocket: typeof WebSocket }).WebSocket =
        mockWebSocketConstructor as unknown as typeof WebSocket;
    });

    afterEach(() => {
        try {
        jasmine.clock().uninstall();
        } catch {
        // ignore if not installed in a given test
        }

        if (originalWebSocket) {
        globalThis.WebSocket = originalWebSocket;
        }
    });

    it('should open a websocket connection on connect', () => {
        const client = new WebSocketClient('ws://localhost:50050/plugin');

        client.connect();

        expect(globalThis.WebSocket).toHaveBeenCalledWith('ws://localhost:50050/plugin');
    });

    it('should not reconnect when connect is called while socket is already connecting/open', () => {
        const client = new WebSocketClient('ws://localhost:50050/plugin');

        client.connect();
        expect(globalThis.WebSocket).toHaveBeenCalledTimes(1);

        client.connect();
        expect(globalThis.WebSocket).toHaveBeenCalledTimes(1);
    });

    it('should execute a received task and send a success response', async () => {
        executeSpy.and.resolveTo({
        success: true,
        data: 42,
        });

        const client = new WebSocketClient('ws://localhost:50050/plugin');
        client.connect();

        await mockSocket.onmessage?.({
        data: JSON.stringify({
            id: 'task-1',
            task: 'executeCode',
            params: { code: 'return 42;' },
        }),
        } as MessageEvent<string>);

        expect(executeSpy).toHaveBeenCalled();
        expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
            id: 'task-1',
            success: true,
            data: 42,
        })
        );
    });

    it('should execute a received task and send an error response when execution fails', async () => {
        executeSpy.and.resolveTo({
        success: false,
        error: 'boom',
        });

        const client = new WebSocketClient('ws://localhost:50050/plugin');
        client.connect();

        await mockSocket.onmessage?.({
        data: JSON.stringify({
            id: 'task-2',
            task: 'executeCode',
            params: { code: 'throw new Error("boom");' },
        }),
        } as MessageEvent<string>);

        expect(executeSpy).toHaveBeenCalled();
        expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
            id: 'task-2',
            success: false,
            error: 'boom',
        })
        );
    });

    it('should ignore invalid json payloads without throwing', async () => {
        const client = new WebSocketClient('ws://localhost:50050/plugin');
        client.connect();

        await expectAsync(
        Promise.resolve(
            mockSocket.onmessage?.({
            data: 'not-json',
            } as MessageEvent<string>)
        )
        ).toBeResolved();

        expect(executeSpy).not.toHaveBeenCalled();
        expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should send an error response when task payload is invalid but id is present', async () => {
        const client = new WebSocketClient('ws://localhost:50050/plugin');
        client.connect();

        await mockSocket.onmessage?.({
        data: JSON.stringify({
            id: 'task-3',
            task: 'executeCode',
            params: {},
        }),
        } as MessageEvent<string>);

        expect(executeSpy).not.toHaveBeenCalled();
        expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
            id: 'task-3',
            success: false,
            error: 'Invalid PluginTaskRequest payload',
        })
        );
    });

    it('should not send anything when task payload is invalid and id is missing', async () => {
        const client = new WebSocketClient('ws://localhost:50050/plugin');
        client.connect();

        await mockSocket.onmessage?.({
        data: JSON.stringify({
            task: 'executeCode',
            params: { code: 'return 1;' },
        }),
        } as MessageEvent<string>);

        expect(executeSpy).not.toHaveBeenCalled();
        expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should close websocket on disconnect', () => {
        const client = new WebSocketClient('ws://localhost:50050/plugin');
        client.connect();

        client.disconnect();

        expect(closeSpy).toHaveBeenCalled();
    });

    it('should handle close errors during disconnect without throwing', () => {
        closeSpy.and.callFake(() => {
            throw new Error('close failed');
        });

        const client = new WebSocketClient('ws://localhost:50050/plugin');
        client.connect();

        expect(() => client.disconnect()).not.toThrow();
    });

    it('should schedule reconnection after close', () => {
        jasmine.clock().install();

        const client = new WebSocketClient('ws://localhost:50050/plugin');
        client.connect();

        expect(globalThis.WebSocket).toHaveBeenCalledTimes(1);

        mockSocket.onclose?.();

        jasmine.clock().tick(1000);

        expect(globalThis.WebSocket).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff for reconnection attempts', () => {
        jasmine.clock().install();

        const client = new WebSocketClient('ws://localhost:50050/plugin');
        client.connect();

        expect(globalThis.WebSocket).toHaveBeenCalledTimes(1);

        mockSocket.onclose?.();
        jasmine.clock().tick(999);
        expect(globalThis.WebSocket).toHaveBeenCalledTimes(1);

        jasmine.clock().tick(1);
        expect(globalThis.WebSocket).toHaveBeenCalledTimes(2);

        mockSocket.onclose?.();
        jasmine.clock().tick(1999);
        expect(globalThis.WebSocket).toHaveBeenCalledTimes(2);

        jasmine.clock().tick(1);
        expect(globalThis.WebSocket).toHaveBeenCalledTimes(3);
    });

    it('should not reconnect after a manual disconnect', () => {
        jasmine.clock().install();

        const client = new WebSocketClient('ws://localhost:50050/plugin');
        client.connect();

        client.disconnect();
        mockSocket.onclose?.();

        jasmine.clock().tick(30000);

        expect(globalThis.WebSocket).toHaveBeenCalledTimes(1);
    });

    it('should clear pending reconnect timer when disconnect is called', () => {
        jasmine.clock().install();

        const client = new WebSocketClient('ws://localhost:50050/plugin');
        client.connect();

        mockSocket.onclose?.();
        client.disconnect();

        jasmine.clock().tick(1000);

        expect(globalThis.WebSocket).toHaveBeenCalledTimes(1);
    });

    it('should schedule reconnect when websocket emits an error', () => {
        jasmine.clock().install();

        const client = new WebSocketClient('ws://localhost:50050/plugin');
        client.connect();

        // Simule une socket déjà fermée: connect() peut alors recréer une nouvelle instance.
        mockSocket.readyState = 3;
        mockSocket.onerror?.({} as Event);
        jasmine.clock().tick(1000);

        expect(globalThis.WebSocket).toHaveBeenCalledTimes(2);
    });

    it('should not schedule reconnect on error while socket is still connecting', () => {
        jasmine.clock().install();

        const client = new WebSocketClient('ws://localhost:50050/plugin');
        client.connect();

        mockSocket.readyState = 0;
        mockSocket.onerror?.({} as Event);
        jasmine.clock().tick(30000);

        expect(globalThis.WebSocket).toHaveBeenCalledTimes(1);
    });

    it('should not schedule duplicate reconnect timers', () => {
        jasmine.clock().install();

        const client = new WebSocketClient('ws://localhost:50050/plugin');
        client.connect();

        mockSocket.onclose?.();
        mockSocket.onerror?.({} as Event);

        jasmine.clock().tick(1000);
        expect(globalThis.WebSocket).toHaveBeenCalledTimes(2);

        jasmine.clock().tick(1000);
        expect(globalThis.WebSocket).toHaveBeenCalledTimes(2);
    });

    it('should reset reconnect attempts on open', () => {
        jasmine.clock().install();

        const client = new WebSocketClient('ws://localhost:50050/plugin');
        client.connect();

        mockSocket.onclose?.();
        jasmine.clock().tick(1000);
        expect(globalThis.WebSocket).toHaveBeenCalledTimes(2);

        mockSocket.onopen?.();

        mockSocket.onclose?.();
        jasmine.clock().tick(1000);
        expect(globalThis.WebSocket).toHaveBeenCalledTimes(3);
    });

    it('should recover from websocket constructor failure by reconnecting later', () => {
        jasmine.clock().install();

        let attempts = 0;
        mockWebSocketConstructor.and.callFake(() => {
            attempts += 1;
            if (attempts === 1) {
                throw new Error('ctor failed');
            }
            return mockSocket;
        });

        const client = new WebSocketClient('ws://localhost:50050/plugin');
        client.connect();

        expect(globalThis.WebSocket).toHaveBeenCalledTimes(1);

        jasmine.clock().tick(1000);
        expect(globalThis.WebSocket).toHaveBeenCalledTimes(2);
    });

    it('should ignore non-object payloads', async () => {
        const client = new WebSocketClient('ws://localhost:50050/plugin');
        client.connect();

        await mockSocket.onmessage?.({
            data: 'null',
        } as MessageEvent<string>);

        expect(executeSpy).not.toHaveBeenCalled();
        expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should not send responses while socket is not open', async () => {
        executeSpy.and.resolveTo({
            success: true,
            data: 42,
        });

        const client = new WebSocketClient('ws://localhost:50050/plugin');
        client.connect();
        mockSocket.readyState = 0;

        await mockSocket.onmessage?.({
            data: JSON.stringify({
                id: 'task-not-open',
                task: 'executeCode',
                params: { code: 'return 42;' },
            }),
        } as MessageEvent<string>);

        expect(executeSpy).toHaveBeenCalled();
        expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should handle JSON serialization failures when sending responses', async () => {
        const circular: { self?: unknown } = {};
        circular.self = circular;

        executeSpy.and.resolveTo({
            success: true,
            data: circular,
        });

        const client = new WebSocketClient('ws://localhost:50050/plugin');
        client.connect();

        await mockSocket.onmessage?.({
            data: JSON.stringify({
                id: 'task-circular',
                task: 'executeCode',
                params: { code: 'return 1;' },
            }),
        } as MessageEvent<string>);

        expect(executeSpy).toHaveBeenCalled();
        expect(sendSpy).not.toHaveBeenCalled();
    });
});

import { autoBootstrap, bootstrapPlugin, PLUGIN_NAME } from './plugin';

/**
 * Tests unitaires du point d'entrée sandbox `plugin.ts`.
 *
 * Objectifs :
 * - vérifier l'ouverture de l'UI Penpot
 * - vérifier l'appel à `connect()` au démarrage
 * - vérifier l'enregistrement du handler `finish`
 * - vérifier l'appel à `disconnect()` lorsque le plugin se ferme
 *
 * Remarque :
 * On teste ici la fonction `bootstrapPlugin()` pour éviter les problèmes
 * liés au mocking des exports ES modules en lecture seule.
 */
describe('plugin entry point', () => {
    let openSpy: jasmine.Spy;
    let onSpy: jasmine.Spy;
    let connectSpy: jasmine.Spy;
    let disconnectSpy: jasmine.Spy;
    let finishHandler: (() => void) | undefined;

    interface MockPenpot {
        ui: {
            open: jasmine.Spy;
            onMessage: jasmine.Spy;
            sendMessage: jasmine.Spy;
        };
        on: jasmine.Spy;
        currentFile?: { id: string };
    }

    beforeEach(() => {
        finishHandler = undefined; // Keep this as it's part of the original test setup logic

        openSpy = jasmine.createSpy('open');
        onSpy = jasmine.createSpy('on').and.callFake((event: string, handler: () => void) => {
            if (event === 'finish') {
                finishHandler = handler;
            }
        });

        connectSpy = jasmine.createSpy('connect');
        disconnectSpy = jasmine.createSpy('disconnect');

        const mockPenpot: MockPenpot = {
            ui: {
                open: openSpy,
                onMessage: jasmine.createSpy('onMessage'),
                sendMessage: jasmine.createSpy('sendMessage'),
            },
            on: onSpy,
        };

        (globalThis as unknown as Record<string, unknown>)['penpot'] = mockPenpot;
    });

    afterEach(() => {
        delete (globalThis as unknown as Record<string, unknown>)['penpot'];
    });

    it('should open the Penpot UI on startup', () => {
        bootstrapPlugin({
            connect: connectSpy,
            disconnect: disconnectSpy,
        });

        expect(openSpy).toHaveBeenCalledWith(PLUGIN_NAME, '/', {
            width: 500,
            height: 800,
        });
    });

    it('should connect the WebSocket client on startup', () => {
        bootstrapPlugin({
            connect: connectSpy,
            disconnect: disconnectSpy,
        });

        expect(connectSpy).toHaveBeenCalled();
    });

    it('should send fileId when ready message is received', () => {
        let messageHandler: ((msg: Record<string, unknown>) => void) | undefined;
        const penpot = (globalThis as unknown as Record<string, MockPenpot>)['penpot'];
        penpot.ui.onMessage.and.callFake((handler: (msg: Record<string, unknown>) => void) => {
            messageHandler = handler;
        });
        penpot.currentFile = { id: 'test-file-id' };

        bootstrapPlugin({
            connect: connectSpy,
            disconnect: disconnectSpy,
        });

        expect(messageHandler).toBeDefined();
        messageHandler?.({ type: 'ready' });

        expect(penpot.ui.sendMessage).toHaveBeenCalledWith({
            type: 'fileId',
            fileId: 'test-file-id',
        });
    });

    it('should register a finish event handler', () => {
        bootstrapPlugin({
            connect: connectSpy,
            disconnect: disconnectSpy,
        });

        expect(onSpy).toHaveBeenCalledWith('finish', jasmine.any(Function));
        expect(finishHandler).toEqual(jasmine.any(Function));
    });

    it('should disconnect the WebSocket client when finish event is triggered', () => {
        bootstrapPlugin({
            connect: connectSpy,
            disconnect: disconnectSpy,
        });

        expect(finishHandler).toBeDefined();

        finishHandler?.();

        expect(disconnectSpy).toHaveBeenCalled();
    });

    it('should auto bootstrap when penpot runtime is available', () => {
        const createClient = jasmine.createSpy('createClient').and.returnValue({
            connect: connectSpy,
            disconnect: disconnectSpy,
        });

        autoBootstrap(createClient);

        expect(createClient).toHaveBeenCalled();
        expect(openSpy).toHaveBeenCalledWith(PLUGIN_NAME, '/', {
            width: 500,
            height: 800,
        });
        expect(connectSpy).toHaveBeenCalled();
    });

    it('should skip auto bootstrap when penpot runtime is missing', () => {
        delete (globalThis as unknown as Record<string, unknown>)['penpot'];

        const createClient = jasmine.createSpy('createClient').and.returnValue({
            connect: connectSpy,
            disconnect: disconnectSpy,
        });

        autoBootstrap(createClient);

        expect(createClient).not.toHaveBeenCalled();
        expect(openSpy).not.toHaveBeenCalled();
        expect(connectSpy).not.toHaveBeenCalled();
    });
});

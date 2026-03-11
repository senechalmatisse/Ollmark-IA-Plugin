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

    beforeEach(() => {
        finishHandler = undefined;

        openSpy = jasmine.createSpy('open');
        onSpy = jasmine.createSpy('on').and.callFake((event: string, handler: () => void) => {
            if (event === 'finish') {
                finishHandler = handler;
            }
        });

        connectSpy = jasmine.createSpy('connect');
        disconnectSpy = jasmine.createSpy('disconnect');

        (globalThis as typeof globalThis & { penpot: unknown }).penpot = {
            ui: {
                open: openSpy,
            },
            on: onSpy,
        };
    });

    afterEach(() => {
        delete (globalThis as typeof globalThis & { penpot?: unknown }).penpot;
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
        delete (globalThis as typeof globalThis & { penpot?: unknown }).penpot;

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

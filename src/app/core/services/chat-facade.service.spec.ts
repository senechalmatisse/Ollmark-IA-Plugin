import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

import { ChatFacadeService } from './chat-facade.service';
import { ChatApiService } from './chat-api.service';
import { ChatStateService } from './chat-state.service';
import { PluginBridgeService } from './plugin-bridge.service';
import { HistoryLoaderService } from './history-loader.service';
import { SessionStore } from './session-store.service';
import { PENPOT_ORIGIN } from '../tokens/api.tokens';
import { ChatResponse } from '../models';

/**
 * Tests unitaires de {@link ChatFacadeService}.
 *
 * Stratégie :
 *   - Tous les collaborateurs sont remplacés par des spies Jasmine.
 *   - Les signaux Angular (`projectId`, `sessionId`) sont simulés
 *     via de vrais signaux writable pour que l'`effect()` du constructeur
 *     fonctionne dans le contexte TestBed.
 *   - `PENPOT_ORIGIN` est fourni pour éviter l'erreur de résolution
 *     de PluginBridgeService dans TestBed.
 *
 * Naming : `should[Description]_given[Context]`
 */
describe('ChatFacadeService', () => {
    let service: ChatFacadeService;

    // ── Signals partagés entre les spies ────────────────────────────────────
    let projectIdSignal: ReturnType<typeof signal<string | null>>;
    let sessionIdSignal: ReturnType<typeof signal<string | null>>;

    // ── Spy objects ─────────────────────────────────────────────────────────
    let apiSpy:     jasmine.SpyObj<ChatApiService>;
    let stateSpy:   jasmine.SpyObj<ChatStateService>;
    let bridgeSpy:  jasmine.SpyObj<PluginBridgeService>;
    let loaderSpy:  jasmine.SpyObj<HistoryLoaderService>;
    let sessionSpy: jasmine.SpyObj<SessionStore>;

    const PROJECT_ID = 'ddc4a96c-d2ad-80ac-8007-b6f8a1ae8d41';
    const SESSION_ID = '2da7d5ee-7236-2075-e628-69a02aa27338';
    const LOADING_ID = 'loading-placeholder-uuid';

    const OK_RESPONSE: ChatResponse = {
        success:   true,
        projectId: PROJECT_ID,
        response:  'Rectangle créé avec succès !',
    };

    const ERR_RESPONSE: ChatResponse = {
        success:   false,
        projectId: PROJECT_ID,
        response:  '',
        error:     'Session plugin inactive',
    };

    // ── Setup ────────────────────────────────────────────────────────────────

    beforeEach(() => {
        projectIdSignal = signal<string | null>(null);
        sessionIdSignal = signal<string | null>(null);

        apiSpy = jasmine.createSpyObj<ChatApiService>('ChatApiService', [
            'sendMessage',
            'clearConversation',
            'deleteProjectConversations',
            'startNewConversation',
        ]);

        stateSpy = jasmine.createSpyObj<ChatStateService>(
    'ChatStateService',
    [
        'addUserMessage',
        'addLoadingMessage',
        'resolveMessage',
        'markMessageAsError',
        'clearMessages',
        'setLoading',
    ],
    {
        messages: signal<ChatResponse[]>([]) as unknown as ChatStateService['messages'],
        isLoading: signal(false) as unknown as ChatStateService['isLoading'],
        hasMessages: signal(false) as unknown as ChatStateService['hasMessages'],
    }
);

        // jasmine.createSpyObj attend des WritableSignal pour les propriétés typées.
        // On passe les signaux writables directement (sans .asReadonly()) —
        // à l'exécution un WritableSignal satisfait parfaitement l'interface Signal,
        // et le cast `as any` évite l'erreur TS due à l'incompatibilité structurelle.
        bridgeSpy = jasmine.createSpyObj<PluginBridgeService>(
    'PluginBridgeService',
    ['send', 'setConnectionStatus'],
    {
        projectId: projectIdSignal as unknown as PluginBridgeService['projectId'],
        connectionStatus: signal('disconnected') as unknown as PluginBridgeService['connectionStatus'],
        theme: signal('dark') as unknown as PluginBridgeService['theme'],
        taskResult$: jasmine.createSpyObj('Subject', ['subscribe', 'complete']) as unknown as PluginBridgeService['taskResult$'],
    }
);

        loaderSpy = jasmine.createSpyObj<HistoryLoaderService>('HistoryLoaderService', [
            'loadHistory',
        ]);
        loaderSpy.loadHistory.and.returnValue(Promise.resolve());

        sessionSpy = jasmine.createSpyObj<SessionStore>(
    'SessionStore',
    [],
    {
        sessionId: sessionIdSignal as unknown as SessionStore['sessionId'],
    }
);

        stateSpy.addUserMessage.and.returnValue('user-msg-id');
        stateSpy.addLoadingMessage.and.returnValue(LOADING_ID);

        // Defaults pour reset
        apiSpy.clearConversation.and.returnValue(of(undefined));
        apiSpy.deleteProjectConversations.and.returnValue(of(undefined));
        apiSpy.startNewConversation.and.returnValue(
            of({ success: true, projectId: PROJECT_ID })
        );

        TestBed.configureTestingModule({
            providers: [
                ChatFacadeService,
                { provide: ChatApiService,      useValue: apiSpy     },
                { provide: ChatStateService,    useValue: stateSpy   },
                { provide: PluginBridgeService, useValue: bridgeSpy  },
                { provide: HistoryLoaderService, useValue: loaderSpy },
                { provide: SessionStore,        useValue: sessionSpy },
                { provide: PENPOT_ORIGIN,       useValue: 'https://penpot.test' },
            ],
        });

        service = TestBed.inject(ChatFacadeService);
    });

    // =========================================================================
    // Signaux exposés
    // =========================================================================

    describe('exposed signals', () => {

        it('should_expose_messages_from_state_given_instantiation', () => {
            expect(service.messages).toBe(stateSpy.messages);
        });

        it('should_expose_isLoading_from_state_given_instantiation', () => {
            expect(service.isLoading).toBe(stateSpy.isLoading);
        });

        it('should_expose_hasMessages_from_state_given_instantiation', () => {
            expect(service.hasMessages).toBe(stateSpy.hasMessages);
        });

        it('should_expose_projectId_from_bridge_given_instantiation', () => {
            expect(service.projectId).toBe(bridgeSpy.projectId);
        });
    });

    // =========================================================================
    // effect() — chargement automatique de l'historique
    // =========================================================================

    describe('constructor effect — history loading', () => {

        it('should_call_loadHistory_given_projectId_becomes_non_null', () => {
            // Muter le signal puis flush les effets Angular synchronement
            projectIdSignal.set(PROJECT_ID);
            TestBed.flushEffects();

            expect(loaderSpy.loadHistory).toHaveBeenCalledWith(PROJECT_ID);
        });

        it('should_not_call_loadHistory_given_projectId_is_null', () => {
            // projectId reste null — l'effect ne doit pas déclencher loadHistory
            TestBed.flushEffects();

            expect(loaderSpy.loadHistory).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // sendMessage() — garde « pas de projectId »
    // =========================================================================

    describe('sendMessage() — no projectId guard', () => {

        it('should_not_call_api_given_projectId_is_null', async () => {
            projectIdSignal.set(null);

            await service.sendMessage('Crée un rectangle');

            expect(apiSpy.sendMessage).not.toHaveBeenCalled();
        });

        it('should_send_get_project_to_bridge_given_projectId_is_null', async () => {
            projectIdSignal.set(null);

            await service.sendMessage('Crée un rectangle');

            expect(bridgeSpy.send).toHaveBeenCalledWith({ type: 'get-project' });
        });

        it('should_not_call_api_given_empty_content_after_trim', async () => {
            projectIdSignal.set(PROJECT_ID);

            await service.sendMessage('   ');

            expect(apiSpy.sendMessage).not.toHaveBeenCalled();
        });

        it('should_not_mutate_state_given_empty_content', async () => {
            projectIdSignal.set(PROJECT_ID);

            await service.sendMessage('');

            expect(stateSpy.addUserMessage).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // sendMessage() — cas nominal (success)
    // =========================================================================

    describe('sendMessage() — success', () => {

        beforeEach(() => {
            projectIdSignal.set(PROJECT_ID);
            apiSpy.sendMessage.and.returnValue(of(OK_RESPONSE));
        });

        it('should_add_user_message_to_state_given_valid_content', async () => {
            await service.sendMessage('Crée un rectangle bleu');

            expect(stateSpy.addUserMessage).toHaveBeenCalledWith('Crée un rectangle bleu');
        });

        it('should_add_loading_message_to_state_given_valid_content', async () => {
            await service.sendMessage('Crée un rectangle');

            expect(stateSpy.addLoadingMessage).toHaveBeenCalled();
        });

        it('should_set_loading_true_before_api_call_given_valid_content', async () => {
            await service.sendMessage('Crée un rectangle');

            expect(stateSpy.setLoading).toHaveBeenCalledWith(true);
        });

        it('should_call_api_with_projectId_and_trimmed_content_given_valid_inputs', async () => {
            await service.sendMessage('  Crée un rectangle  ');

            expect(apiSpy.sendMessage).toHaveBeenCalledWith(
                PROJECT_ID,
                'Crée un rectangle',
                undefined // sessionId null → undefined
            );
        });

        it('should_call_api_with_sessionId_given_session_active', async () => {
            sessionIdSignal.set(SESSION_ID);

            await service.sendMessage('Crée un rectangle');

            expect(apiSpy.sendMessage).toHaveBeenCalledWith(
                PROJECT_ID,
                'Crée un rectangle',
                SESSION_ID
            );
        });

        it('should_resolve_loading_message_with_response_given_success', async () => {
            await service.sendMessage('Crée un rectangle');

            expect(stateSpy.resolveMessage).toHaveBeenCalledWith(
                LOADING_ID,
                'Rectangle créé avec succès !'
            );
        });

        it('should_set_loading_false_in_finally_given_success', async () => {
            await service.sendMessage('Crée un rectangle');

            expect(stateSpy.setLoading).toHaveBeenCalledWith(false);
        });

        it('should_not_mark_message_as_error_given_success', async () => {
            await service.sendMessage('Crée un rectangle');

            expect(stateSpy.markMessageAsError).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // sendMessage() — success: false (erreur métier)
    // =========================================================================

    describe('sendMessage() — backend success: false', () => {

        beforeEach(() => {
            projectIdSignal.set(PROJECT_ID);
            apiSpy.sendMessage.and.returnValue(of(ERR_RESPONSE));
        });

        it('should_mark_message_as_error_with_backend_error_message_given_success_false', async () => {
            await service.sendMessage('Message');

            expect(stateSpy.markMessageAsError).toHaveBeenCalledWith(
                LOADING_ID,
                'Session plugin inactive'
            );
        });

        it('should_mark_message_as_error_with_fallback_given_no_error_field', async () => {
            apiSpy.sendMessage.and.returnValue(of({
                success: false, projectId: PROJECT_ID, response: '',
            }));

            await service.sendMessage('Message');

            expect(stateSpy.markMessageAsError).toHaveBeenCalledWith(
                LOADING_ID,
                'Erreur inconnue du serveur'
            );
        });

        it('should_set_loading_false_in_finally_given_success_false', async () => {
            await service.sendMessage('Message');

            expect(stateSpy.setLoading).toHaveBeenCalledWith(false);
        });
    });

    // =========================================================================
    // sendMessage() — erreur réseau / exception
    // =========================================================================

    describe('sendMessage() — network error', () => {

        beforeEach(() => {
            projectIdSignal.set(PROJECT_ID);
        });

        it('should_mark_message_as_error_given_api_throws_Error', async () => {
            apiSpy.sendMessage.and.returnValue(throwError(() => new Error('Network failure')));

            await service.sendMessage('Message');

            expect(stateSpy.markMessageAsError).toHaveBeenCalledWith(
                LOADING_ID,
                'Network failure'
            );
        });

        it('should_mark_message_as_error_with_generic_message_given_non_Error_thrown', async () => {
            apiSpy.sendMessage.and.returnValue(throwError(() => 'raw string error'));

            await service.sendMessage('Message');

            expect(stateSpy.markMessageAsError).toHaveBeenCalledWith(
                LOADING_ID,
                'Erreur de communication'
            );
        });

        it('should_warn_to_console_given_network_error', async () => {
            spyOn(console, 'warn');
            apiSpy.sendMessage.and.returnValue(throwError(() => new Error('Timeout')));

            await service.sendMessage('Message');

            expect(console.warn).toHaveBeenCalledWith(
                '[OllMark Facade] sendMessage error:',
                'Timeout'
            );
        });

        it('should_set_loading_false_in_finally_given_network_error', async () => {
            apiSpy.sendMessage.and.returnValue(throwError(() => new Error('err')));

            await service.sendMessage('Message');

            expect(stateSpy.setLoading).toHaveBeenCalledWith(false);
        });
    });

    // =========================================================================
    // resetConversation() — garde « pas de projectId »
    // =========================================================================

    describe('resetConversation() — no projectId guard', () => {

        it('should_not_call_any_api_given_projectId_is_null', async () => {
            projectIdSignal.set(null);

            await service.resetConversation();

            expect(apiSpy.clearConversation).not.toHaveBeenCalled();
            expect(apiSpy.deleteProjectConversations).not.toHaveBeenCalled();
            expect(apiSpy.startNewConversation).not.toHaveBeenCalled();
        });

        it('should_not_clear_messages_given_projectId_is_null', async () => {
            projectIdSignal.set(null);

            await service.resetConversation();

            expect(stateSpy.clearMessages).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // resetConversation() — cas nominal
    // =========================================================================

    describe('resetConversation() — success', () => {

        beforeEach(() => {
            projectIdSignal.set(PROJECT_ID);
        });

        it('should_clear_messages_before_api_calls_given_valid_projectId', async () => {
            await service.resetConversation();

            expect(stateSpy.clearMessages).toHaveBeenCalled();
        });

        it('should_call_clearConversation_given_valid_projectId', async () => {
            await service.resetConversation();

            expect(apiSpy.clearConversation).toHaveBeenCalledWith(PROJECT_ID);
        });

        it('should_call_deleteProjectConversations_given_valid_projectId', async () => {
            await service.resetConversation();

            expect(apiSpy.deleteProjectConversations).toHaveBeenCalledWith(PROJECT_ID);
        });

        it('should_call_startNewConversation_given_valid_projectId', async () => {
            await service.resetConversation();

            expect(apiSpy.startNewConversation).toHaveBeenCalledWith(PROJECT_ID);
        });

        it('should_call_api_methods_in_correct_order_given_valid_projectId', async () => {
            const callOrder: string[] = [];
            apiSpy.clearConversation.and.callFake(() => { callOrder.push('clear'); return of(undefined); });
            apiSpy.deleteProjectConversations.and.callFake(() => { callOrder.push('delete'); return of(undefined); });
            apiSpy.startNewConversation.and.callFake(() => { callOrder.push('start'); return of({ success: true, projectId: PROJECT_ID }); });

            await service.resetConversation();

            expect(callOrder).toEqual(['clear', 'delete', 'start']);
        });
    });

    // =========================================================================
    // resetConversation() — erreur best-effort
    // =========================================================================

    describe('resetConversation() — best-effort on error', () => {

        beforeEach(() => {
            projectIdSignal.set(PROJECT_ID);
        });

        it('should_still_clear_messages_given_api_throws', async () => {
            apiSpy.clearConversation.and.returnValue(throwError(() => new Error('Server down')));

            await service.resetConversation();

            expect(stateSpy.clearMessages).toHaveBeenCalled();
        });

        it('should_warn_to_console_given_api_throws_Error', async () => {
            spyOn(console, 'warn');
            apiSpy.clearConversation.and.returnValue(throwError(() => new Error('Server down')));

            await service.resetConversation();

            expect(console.warn).toHaveBeenCalledWith(
                '[OllMark Facade] server call failed:',
                'Server down'
            );
        });

        it('should_warn_with_raw_error_given_non_Error_thrown', async () => {
            spyOn(console, 'warn');
            const rawError = { code: 500 };
            apiSpy.clearConversation.and.returnValue(throwError(() => rawError));

            await service.resetConversation();

            expect(console.warn).toHaveBeenCalledWith(
                '[OllMark Facade] server call failed:',
                rawError
            );
        });

        it('should_resolve_without_throwing_given_api_throws', async () => {
            apiSpy.clearConversation.and.returnValue(throwError(() => new Error('err')));

            await expectAsync(service.resetConversation()).toBeResolved();
        });
    });

    // =========================================================================
    // Scénario d'intégration
    // =========================================================================

    describe('integration scenarios', () => {

        it('should_handle_full_send_resolve_cycle_given_active_session', async () => {
            projectIdSignal.set(PROJECT_ID);
            sessionIdSignal.set(SESSION_ID);
            apiSpy.sendMessage.and.returnValue(of(OK_RESPONSE));

            await service.sendMessage('Crée un rectangle bleu');

            expect(stateSpy.addUserMessage).toHaveBeenCalledWith('Crée un rectangle bleu');
            expect(stateSpy.addLoadingMessage).toHaveBeenCalled();
            expect(stateSpy.setLoading).toHaveBeenCalledWith(true);
            expect(apiSpy.sendMessage).toHaveBeenCalledWith(PROJECT_ID, 'Crée un rectangle bleu', SESSION_ID);
            expect(stateSpy.resolveMessage).toHaveBeenCalledWith(LOADING_ID, OK_RESPONSE.response);
            expect(stateSpy.setLoading).toHaveBeenCalledWith(false);
        });

        it('should_handle_full_reset_cycle_given_valid_projectId', async () => {
            projectIdSignal.set(PROJECT_ID);

            await service.resetConversation();

            expect(stateSpy.clearMessages).toHaveBeenCalled();
            expect(apiSpy.clearConversation).toHaveBeenCalledWith(PROJECT_ID);
            expect(apiSpy.deleteProjectConversations).toHaveBeenCalledWith(PROJECT_ID);
            expect(apiSpy.startNewConversation).toHaveBeenCalledWith(PROJECT_ID);
        });
    });
});
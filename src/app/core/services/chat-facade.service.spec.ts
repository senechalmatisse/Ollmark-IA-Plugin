import { TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { signal } from '@angular/core';

import { ChatFacadeService } from './chat-facade.service';
import { ChatApiService } from './chat-api.service';
import { ChatStateService } from './chat-state.service';
import { PluginBridgeService } from './plugin-bridge.service';
import { HistoryLoaderService } from './history-loader.service';
import { SessionStore } from './session-store.service';
import { PENPOT_ORIGIN } from '../tokens/api.tokens';
import { BufferPreviewPayload, ChatMessage, ChatResponse } from '../models';
import { ApiError } from '../models/api-error.model';

/**
 * Tests unitaires de {@link ChatFacadeService}.
 *
 * Stratégie :
 *   - Tous les collaborateurs sont remplacés par des spies Jasmine.
 *   - Les signaux Angular sont simulés via de vrais signaux writables.
 *   - Les Subjects buffer sont de vrais Subject<> pour tester _listenToBufferEvents.
 *
 * Naming : should[Description]_given[Context]
 */
describe('ChatFacadeService', () => {
  let service: ChatFacadeService;

  let projectIdSignal: ReturnType<typeof signal<string | null>>;
  let sessionIdSignal: ReturnType<typeof signal<string | null>>;

  let apiSpy: jasmine.SpyObj<ChatApiService>;
  let stateSpy: jasmine.SpyObj<ChatStateService>;
  let bridgeSpy: jasmine.SpyObj<PluginBridgeService>;
  let loaderSpy: jasmine.SpyObj<HistoryLoaderService>;
  let sessionSpy: jasmine.SpyObj<SessionStore>;

  // Vrais Subjects pour tester _listenToBufferEvents
  let bufferPreview$: Subject<BufferPreviewPayload>;
  let bufferPreviewUpdate$: Subject<{ bufferPageId: string; pngDataUrl: string }>;
  let bufferAccepted$: Subject<string>;
  let bufferRejected$: Subject<string>;
  let bufferError$: Subject<{ bufferPageId: string; error: string }>;

  const PROJECT_ID = 'ddc4a96c-d2ad-80ac-8007-b6f8a1ae8d41';
  const SESSION_ID = '2da7d5ee-7236-2075-e628-69a02aa27338';
  const LOADING_ID = 'loading-placeholder-uuid';
  const BUFFER_ID = 'buf-001';

  const OK_RESPONSE: ChatResponse = {
    success: true,
    projectId: PROJECT_ID,
    response: 'Rectangle créé avec succès !',
  };

  const ERR_RESPONSE: ChatResponse = {
    success: false,
    projectId: PROJECT_ID,
    response: '',
    error: 'Session plugin inactive',
  };

  function makePreviewPayload(overrides: Partial<BufferPreviewPayload> = {}): BufferPreviewPayload {
    return {
      pngDataUrl: 'data:image/png;base64,abc',
      bufferPageId: BUFFER_ID,
      originalPageId: 'orig-001',
      taskId: 'task-001',
      code: 'penpot.createRectangle()',
      ...overrides,
    };
  }

  // ── Setup ──────────────────────────────────────────────────────────────────

  beforeEach(() => {
    projectIdSignal = signal<string | null>(null);
    sessionIdSignal = signal<string | null>(null);

    bufferPreview$ = new Subject();
    bufferPreviewUpdate$ = new Subject();
    bufferAccepted$ = new Subject();
    bufferRejected$ = new Subject();
    bufferError$ = new Subject();

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
        'addPreviewMessage',
        'updatePreviewPng',
        'setPreviewStatus',
        'removePendingPreviews',
      ],
      {
        messages: signal<ChatMessage[]>([]) as unknown as ChatStateService['messages'],
        isLoading: signal(false) as unknown as ChatStateService['isLoading'],
        hasMessages: signal(false) as unknown as ChatStateService['hasMessages'],
      },
    );

    bridgeSpy = jasmine.createSpyObj<PluginBridgeService>(
      'PluginBridgeService',
      ['send', 'setConnectionStatus'],
      {
        projectId: projectIdSignal as unknown as PluginBridgeService['projectId'],
        connectionStatus: signal(
          'disconnected',
        ) as unknown as PluginBridgeService['connectionStatus'],
        theme: signal('dark') as unknown as PluginBridgeService['theme'],
        userName: signal('unknown') as unknown as PluginBridgeService['userName'],
        taskResult$: jasmine.createSpyObj('Subject', [
          'subscribe',
          'complete',
        ]) as unknown as PluginBridgeService['taskResult$'],
        bufferPreview$: bufferPreview$ as unknown as PluginBridgeService['bufferPreview$'],
        bufferPreviewUpdate$:
          bufferPreviewUpdate$ as unknown as PluginBridgeService['bufferPreviewUpdate$'],
        bufferAccepted$: bufferAccepted$ as unknown as PluginBridgeService['bufferAccepted$'],
        bufferRejected$: bufferRejected$ as unknown as PluginBridgeService['bufferRejected$'],
        bufferError$: bufferError$ as unknown as PluginBridgeService['bufferError$'],
      },
    );

    loaderSpy = jasmine.createSpyObj<HistoryLoaderService>('HistoryLoaderService', ['loadHistory']);
    loaderSpy.loadHistory.and.returnValue(Promise.resolve());

    sessionSpy = jasmine.createSpyObj<SessionStore>('SessionStore', [], {
      sessionId: sessionIdSignal as unknown as SessionStore['sessionId'],
    });

    stateSpy.addUserMessage.and.returnValue('user-msg-id');
    stateSpy.addLoadingMessage.and.returnValue(LOADING_ID);

    apiSpy.clearConversation.and.returnValue(of(undefined));
    apiSpy.deleteProjectConversations.and.returnValue(of(undefined));
    apiSpy.startNewConversation.and.returnValue(of({ success: true, projectId: PROJECT_ID }));

    TestBed.configureTestingModule({
      providers: [
        ChatFacadeService,
        { provide: ChatApiService, useValue: apiSpy },
        { provide: ChatStateService, useValue: stateSpy },
        { provide: PluginBridgeService, useValue: bridgeSpy },
        { provide: HistoryLoaderService, useValue: loaderSpy },
        { provide: SessionStore, useValue: sessionSpy },
        { provide: PENPOT_ORIGIN, useValue: 'https://penpot.test' },
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
      projectIdSignal.set(PROJECT_ID);
      TestBed.flushEffects();
      expect(loaderSpy.loadHistory).toHaveBeenCalledWith(PROJECT_ID);
    });

    it('should_not_call_loadHistory_given_projectId_is_null', () => {
      TestBed.flushEffects();
      expect(loaderSpy.loadHistory).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // sendMessage() — gardes
  // =========================================================================

  describe('sendMessage() — guards', () => {
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
  // sendMessage() — set-operation-type
  // =========================================================================

  describe('sendMessage() — set-operation-type', () => {
    beforeEach(() => {
      projectIdSignal.set(PROJECT_ID);
      apiSpy.sendMessage.and.returnValue(of(OK_RESPONSE));
    });

    it('should_send_set_operation_type_to_bridge_given_create_prompt', async () => {
      await service.sendMessage('crée un rectangle');
      expect(bridgeSpy.send).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: 'set-operation-type', operationType: 'create' }),
      );
    });

    it('should_send_set_operation_type_to_bridge_given_add_prompt', async () => {
      await service.sendMessage('ajoute un cercle');
      expect(bridgeSpy.send).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: 'set-operation-type', operationType: 'add' }),
      );
    });

    it('should_send_set_operation_type_before_api_call_given_valid_prompt', async () => {
      const callOrder: string[] = [];
      bridgeSpy.send.and.callFake((msg: { type: string }) => {
        if (msg.type === 'set-operation-type') callOrder.push('set-op');
      });
      apiSpy.sendMessage.and.callFake(() => {
        callOrder.push('api');
        return of(OK_RESPONSE);
      });

      await service.sendMessage('crée un rectangle');

      expect(callOrder[0]).toBe('set-op');
      expect(callOrder[1]).toBe('api');
    });
  });

  // =========================================================================
  // sendMessage() — succès
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

    it('should_trim_content_before_adding_user_message_given_whitespace', async () => {
      await service.sendMessage('  Crée un rectangle  ');
      expect(stateSpy.addUserMessage).toHaveBeenCalledWith('Crée un rectangle');
    });

    it('should_add_loading_message_to_state_given_valid_content', async () => {
      await service.sendMessage('Crée un rectangle');
      expect(stateSpy.addLoadingMessage).toHaveBeenCalled();
    });

    it('should_set_loading_true_given_valid_content', async () => {
      await service.sendMessage('Crée un rectangle');
      expect(stateSpy.setLoading).toHaveBeenCalledWith(true);
    });

    it('should_call_api_with_projectId_trimmed_content_and_undefined_session_given_no_session', async () => {
      await service.sendMessage('  Crée un rectangle  ');
      expect(apiSpy.sendMessage).toHaveBeenCalledWith(PROJECT_ID, 'Crée un rectangle', undefined);
    });

    it('should_call_api_with_sessionId_given_session_active', async () => {
      sessionIdSignal.set(SESSION_ID);
      await service.sendMessage('Crée un rectangle');
      expect(apiSpy.sendMessage).toHaveBeenCalledWith(PROJECT_ID, 'Crée un rectangle', SESSION_ID);
    });

    it('should_resolve_loading_message_with_response_given_success', async () => {
      await service.sendMessage('Crée un rectangle');
      expect(stateSpy.resolveMessage).toHaveBeenCalledWith(
        LOADING_ID,
        'Rectangle créé avec succès !',
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

    it('should_send_finalize_preview_in_finally_given_success', async () => {
      await service.sendMessage('crée un rectangle');
      expect(bridgeSpy.send).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: 'finalize-preview', operationType: 'create' }),
      );
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
        'Session plugin inactive',
      );
    });

    it('should_mark_message_as_error_with_fallback_given_no_error_field', async () => {
      apiSpy.sendMessage.and.returnValue(
        of({ success: false, projectId: PROJECT_ID, response: '' }),
      );
      await service.sendMessage('Message');
      expect(stateSpy.markMessageAsError).toHaveBeenCalledWith(
        LOADING_ID,
        'Erreur inconnue du serveur',
      );
    });

    it('should_set_loading_false_in_finally_given_success_false', async () => {
      await service.sendMessage('Message');
      expect(stateSpy.setLoading).toHaveBeenCalledWith(false);
    });

    it('should_send_finalize_preview_in_finally_given_success_false', async () => {
      await service.sendMessage('crée un rectangle');
      expect(bridgeSpy.send).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: 'finalize-preview' }),
      );
    });
  });

  // =========================================================================
  // sendMessage() — erreurs réseau et ApiError
  // =========================================================================

  describe('sendMessage() — errors', () => {
    beforeEach(() => {
      projectIdSignal.set(PROJECT_ID);
    });

    it('should_mark_message_as_error_given_api_throws_generic_Error', async () => {
      apiSpy.sendMessage.and.returnValue(throwError(() => new Error('Network failure')));
      await service.sendMessage('Message');
      expect(stateSpy.markMessageAsError).toHaveBeenCalledWith(LOADING_ID, 'Network failure');
    });

    it('should_mark_message_as_error_with_fallback_given_non_Error_thrown', async () => {
      apiSpy.sendMessage.and.returnValue(throwError(() => 'raw string error'));
      await service.sendMessage('Message');
      expect(stateSpy.markMessageAsError).toHaveBeenCalledWith(
        LOADING_ID,
        'Erreur de communication',
      );
    });

    it('should_mark_message_as_error_with_ApiError_message_given_ApiError_thrown', async () => {
      const apiError = new ApiError('Backend injoignable', 'network');
      apiSpy.sendMessage.and.returnValue(throwError(() => apiError));
      await service.sendMessage('Message');
      expect(stateSpy.markMessageAsError).toHaveBeenCalledWith(LOADING_ID, 'Backend injoignable');
    });

    it('should_set_loading_false_in_finally_given_any_error', async () => {
      apiSpy.sendMessage.and.returnValue(throwError(() => new Error('err')));
      await service.sendMessage('Message');
      expect(stateSpy.setLoading).toHaveBeenCalledWith(false);
    });

    it('should_send_finalize_preview_in_finally_given_error', async () => {
      apiSpy.sendMessage.and.returnValue(throwError(() => new Error('err')));
      await service.sendMessage('crée un rectangle');
      expect(bridgeSpy.send).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: 'finalize-preview' }),
      );
    });
  });

  // =========================================================================
  // acceptPreview() / rejectPreview()
  // =========================================================================

  describe('acceptPreview()', () => {
    it('should_send_accept_buffer_to_bridge_given_bufferPageId_and_code', () => {
      service.acceptPreview(BUFFER_ID, 'penpot.createRectangle()');
      expect(bridgeSpy.send).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: 'accept-buffer',
          bufferPageId: BUFFER_ID,
          code: 'penpot.createRectangle()',
        }),
      );
    });

    it('should_send_accept_buffer_with_empty_code_given_empty_string', () => {
      service.acceptPreview(BUFFER_ID, '');
      expect(bridgeSpy.send).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: 'accept-buffer', bufferPageId: BUFFER_ID, code: '' }),
      );
    });
  });

  describe('rejectPreview()', () => {
    it('should_send_reject_buffer_to_bridge_given_bufferPageId', () => {
      service.rejectPreview(BUFFER_ID);
      expect(bridgeSpy.send).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: 'reject-buffer', bufferPageId: BUFFER_ID }),
      );
    });
  });

  // =========================================================================
  // resetConversation() — gardes
  // =========================================================================

  describe('resetConversation() — guards', () => {
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

    it('should_send_reset_staging_to_bridge_given_valid_projectId', async () => {
      await service.resetConversation();
      expect(bridgeSpy.send).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: 'reset-staging' }),
      );
    });

    it('should_clear_messages_given_valid_projectId', async () => {
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
      apiSpy.clearConversation.and.callFake(() => {
        callOrder.push('clear');
        return of(undefined);
      });
      apiSpy.deleteProjectConversations.and.callFake(() => {
        callOrder.push('delete');
        return of(undefined);
      });
      apiSpy.startNewConversation.and.callFake(() => {
        callOrder.push('start');
        return of({ success: true, projectId: PROJECT_ID });
      });

      await service.resetConversation();

      expect(callOrder).toEqual(['clear', 'delete', 'start']);
    });
  });

  // =========================================================================
  // resetConversation() — best-effort on error
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
        'Server down',
      );
    });

    it('should_warn_with_raw_error_given_non_Error_thrown', async () => {
      spyOn(console, 'warn');
      apiSpy.clearConversation.and.returnValue(throwError(() => 'raw error'));
      await service.resetConversation();
      expect(console.warn).toHaveBeenCalledWith(
        '[OllMark Facade] server call failed:',
        'raw error',
      );
    });

    it('should_resolve_without_throwing_given_api_throws', async () => {
      apiSpy.clearConversation.and.returnValue(throwError(() => new Error('err')));
      await expectAsync(service.resetConversation()).toBeResolved();
    });
  });

  // =========================================================================
  // _listenToBufferEvents — bufferPreview$
  // =========================================================================

  describe('buffer events — bufferPreview$', () => {
    it('should_call_addPreviewMessage_given_bufferPreview$_emits', () => {
      const payload = makePreviewPayload();
      bufferPreview$.next(payload);
      expect(stateSpy.addPreviewMessage).toHaveBeenCalledWith(payload);
    });

    it('should_call_addPreviewMessage_multiple_times_given_multiple_emissions', () => {
      bufferPreview$.next(makePreviewPayload({ bufferPageId: 'buf-001' }));
      bufferPreview$.next(makePreviewPayload({ bufferPageId: 'buf-002' }));
      expect(stateSpy.addPreviewMessage).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // _listenToBufferEvents — bufferPreviewUpdate$
  // =========================================================================

  describe('buffer events — bufferPreviewUpdate$', () => {
    it('should_call_updatePreviewPng_given_bufferPreviewUpdate$_emits', () => {
      bufferPreviewUpdate$.next({
        bufferPageId: BUFFER_ID,
        pngDataUrl: 'data:image/png;base64,new',
      });
      expect(stateSpy.updatePreviewPng).toHaveBeenCalledWith(
        BUFFER_ID,
        'data:image/png;base64,new',
      );
    });
  });

  // =========================================================================
  // _listenToBufferEvents — bufferAccepted$
  // =========================================================================

  describe('buffer events — bufferAccepted$', () => {
    it('should_set_preview_status_accepted_given_bufferAccepted$_emits', () => {
      bufferAccepted$.next(BUFFER_ID);
      expect(stateSpy.setPreviewStatus).toHaveBeenCalledWith(BUFFER_ID, 'accepted');
    });
  });

  // =========================================================================
  // _listenToBufferEvents — bufferRejected$
  // =========================================================================

  describe('buffer events — bufferRejected$', () => {
    it('should_set_preview_status_rejected_given_bufferRejected$_emits', () => {
      bufferRejected$.next(BUFFER_ID);
      expect(stateSpy.setPreviewStatus).toHaveBeenCalledWith(BUFFER_ID, 'rejected');
    });
  });

  // =========================================================================
  // _listenToBufferEvents — bufferError$
  // =========================================================================

  describe('buffer events — bufferError$', () => {
    it('should_set_preview_status_rejected_given_bufferError$_emits', () => {
      bufferError$.next({ bufferPageId: BUFFER_ID, error: 'Navigation failed' });
      expect(stateSpy.setPreviewStatus).toHaveBeenCalledWith(BUFFER_ID, 'rejected');
    });

    it('should_warn_to_console_given_bufferError$_emits', () => {
      spyOn(console, 'warn');
      bufferError$.next({ bufferPageId: BUFFER_ID, error: 'Navigation failed' });
      expect(console.warn).toHaveBeenCalledWith(
        '[OllMark Facade] buffer error:',
        'Navigation failed',
      );
    });
  });

  // =========================================================================
  // Scénarios d'intégration
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
      expect(apiSpy.sendMessage).toHaveBeenCalledWith(
        PROJECT_ID,
        'Crée un rectangle bleu',
        SESSION_ID,
      );
      expect(stateSpy.resolveMessage).toHaveBeenCalledWith(LOADING_ID, OK_RESPONSE.response);
      expect(stateSpy.setLoading).toHaveBeenCalledWith(false);
    });

    it('should_handle_full_reset_cycle_given_valid_projectId', async () => {
      projectIdSignal.set(PROJECT_ID);

      await service.resetConversation();

      expect(bridgeSpy.send).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: 'reset-staging' }),
      );
      expect(stateSpy.clearMessages).toHaveBeenCalled();
      expect(apiSpy.clearConversation).toHaveBeenCalledWith(PROJECT_ID);
      expect(apiSpy.deleteProjectConversations).toHaveBeenCalledWith(PROJECT_ID);
      expect(apiSpy.startNewConversation).toHaveBeenCalledWith(PROJECT_ID);
    });

    it('should_handle_full_preview_lifecycle_given_buffer_events_sequence', () => {
      const payload = makePreviewPayload();

      // 1. Preview reçue
      bufferPreview$.next(payload);
      expect(stateSpy.addPreviewMessage).toHaveBeenCalledWith(payload);

      // 2. Mise à jour PNG
      bufferPreviewUpdate$.next({
        bufferPageId: BUFFER_ID,
        pngDataUrl: 'data:image/png;base64,v2',
      });
      expect(stateSpy.updatePreviewPng).toHaveBeenCalledWith(BUFFER_ID, 'data:image/png;base64,v2');

      // 3. Accepté
      bufferAccepted$.next(BUFFER_ID);
      expect(stateSpy.setPreviewStatus).toHaveBeenCalledWith(BUFFER_ID, 'accepted');
    });
  });
});

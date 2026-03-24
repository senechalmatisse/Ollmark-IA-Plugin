import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { PluginBridgeService } from './plugin-bridge.service';
import { PENPOT_ORIGIN } from '../tokens/api.tokens';
import { BufferPreviewPayload, ConnectionStatus } from '../models';

/**
 * Tests unitaires de {@link PluginBridgeService}.
 *
 * Stratégie :
 *   - PENPOT_ORIGIN est fourni avec 'https://penpot.test'.
 *   - window.parent.postMessage est espionné pour les appels sortants.
 *   - Les messages entrants sont simulés via window.dispatchEvent(new MessageEvent(...)).
 *   - Le service est recréé dans chaque beforeEach pour garantir l'isolation.
 *
 * Naming : should[Description]_given[Context]
 */
describe('PluginBridgeService', () => {
  let service: PluginBridgeService;
  let postMessageSpy: jasmine.Spy;

  const TEST_ORIGIN = 'https://penpot.test';
  const PROJECT_ID = 'ddc4a96c-d2ad-80ac-8007-b6f8a1ae8d41';
  const BUFFER_ID = 'buf-001';

  // ── Helpers ────────────────────────────────────────────────────────────────

  function dispatchMessage(data: unknown): void {
    window.dispatchEvent(new MessageEvent('message', { data }));
  }

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
    postMessageSpy = spyOn(window.parent, 'postMessage');

    TestBed.configureTestingModule({
      providers: [PluginBridgeService, { provide: PENPOT_ORIGIN, useValue: TEST_ORIGIN }],
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

    it('should_have_userName_unknown_given_fresh_instance', () => {
      expect(service.userName()).toBe('unknown');
    });

    it('should_have_taskResult$_open_given_fresh_instance', () => {
      expect(service.taskResult$.closed).toBeFalse();
    });

    it('should_have_bufferPreview$_open_given_fresh_instance', () => {
      expect(service.bufferPreview$.closed).toBeFalse();
    });

    it('should_have_bufferPreviewUpdate$_open_given_fresh_instance', () => {
      expect(service.bufferPreviewUpdate$.closed).toBeFalse();
    });

    it('should_have_bufferAccepted$_open_given_fresh_instance', () => {
      expect(service.bufferAccepted$.closed).toBeFalse();
    });

    it('should_have_bufferRejected$_open_given_fresh_instance', () => {
      expect(service.bufferRejected$.closed).toBeFalse();
    });

    it('should_have_bufferError$_open_given_fresh_instance', () => {
      expect(service.bufferError$.closed).toBeFalse();
    });
  });

  // =========================================================================
  // Constructeur — handshake initial
  // =========================================================================

  describe('constructor — initial handshake', () => {
    it('should_send_get_project_message_on_construction', () => {
      expect(postMessageSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: 'get-project' }),
        TEST_ORIGIN,
      );
    });

    it('should_use_targetOrigin_from_PENPOT_ORIGIN_token_given_send_call', () => {
      service.send({ type: 'get-project' });
      expect(postMessageSpy).toHaveBeenCalledWith(jasmine.anything(), TEST_ORIGIN);
    });
  });

  // =========================================================================
  // send() — enrichissement userId
  // =========================================================================

  describe('send()', () => {
    it('should_call_postMessage_with_targetOrigin_given_any_PluginMessage', () => {
      const msg = {
        type: 'execute-task' as const,
        taskId: 'task-123',
        task: 'executeCode',
        params: { code: 'return 42;' },
      };
      service.send(msg);
      expect(postMessageSpy).toHaveBeenCalledWith(jasmine.objectContaining(msg), TEST_ORIGIN);
    });

    it('should_enrich_message_with_userId_unknown_given_no_project_response_yet', () => {
      service.send({ type: 'get-project' });
      const call = postMessageSpy.calls.mostRecent();
      expect(call.args[0].userId).toBe('unknown');
    });

    it('should_enrich_message_with_userName_given_project_response_received', () => {
      dispatchMessage({ type: 'project-response', id: PROJECT_ID, userName: 'alice_uuid-001' });
      service.send({ type: 'get-project' });
      const call = postMessageSpy.calls.mostRecent();
      expect(call.args[0].userId).toBe('alice_uuid-001');
    });

    it('should_never_use_wildcard_origin_given_secure_config', () => {
      service.send({ type: 'get-project' });
      postMessageSpy.calls.allArgs().forEach(([, origin]) => {
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
      it(`should_update_connectionStatus_to_${status}`, () => {
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

    it('should_set_userName_given_project_response_with_userName', () => {
      dispatchMessage({ type: 'project-response', id: PROJECT_ID, userName: 'bob_uuid-002' });
      expect(service.userName()).toBe('bob_uuid-002');
    });

    it('should_keep_userName_unknown_given_project_response_without_userName', () => {
      dispatchMessage({ type: 'project-response', id: PROJECT_ID });
      expect(service.userName()).toBe('unknown');
    });

    it('should_update_userName_given_second_project_response_with_different_userName', () => {
      dispatchMessage({ type: 'project-response', id: PROJECT_ID, userName: 'alice_001' });
      dispatchMessage({ type: 'project-response', id: PROJECT_ID, userName: 'bob_002' });
      expect(service.userName()).toBe('bob_002');
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
    it('should_emit_on_taskResult$_given_successful_task_result', async () => {
      const resultPromise = firstValueFrom(service.taskResult$);
      dispatchMessage({
        type: 'task-result',
        taskId: 'task-abc',
        success: true,
        data: { result: 'bf76e8b7', log: '' },
        error: null,
      });
      const result = await resultPromise;
      expect(result.taskId).toBe('task-abc');
      expect(result.success).toBeTrue();
      expect(result.data).toEqual({ result: 'bf76e8b7', log: '' });
      expect(result.error).toBeNull();
    });

    it('should_emit_error_details_on_taskResult$_given_failed_task_result', async () => {
      const resultPromise = firstValueFrom(service.taskResult$);
      dispatchMessage({
        type: 'task-result',
        taskId: 'task-fail',
        success: false,
        data: null,
        error: 'No active Penpot page',
      });
      const result = await resultPromise;
      expect(result.success).toBeFalse();
      expect(result.error).toBe('No active Penpot page');
    });

    it('should_emit_multiple_results_given_multiple_task_result_messages', () => {
      const emissions: unknown[] = [];
      const sub = service.taskResult$.subscribe((r) => emissions.push(r));
      dispatchMessage({
        type: 'task-result',
        taskId: 'task-1',
        success: true,
        data: null,
        error: null,
      });
      dispatchMessage({
        type: 'task-result',
        taskId: 'task-2',
        success: false,
        data: null,
        error: 'err',
      });
      expect(emissions.length).toBe(2);
      sub.unsubscribe();
    });
  });

  // =========================================================================
  // Routage — 'buffer-preview'
  // =========================================================================

  describe('message routing — buffer-preview', () => {
    it('should_emit_on_bufferPreview$_given_buffer_preview_message', async () => {
      const payload = makePreviewPayload();
      const previewPromise = firstValueFrom(service.bufferPreview$);
      dispatchMessage({ type: 'buffer-preview', payload });
      const received = await previewPromise;
      expect(received).toEqual(payload);
    });

    it('should_emit_pngDataUrl_on_bufferPreview$_given_valid_payload', async () => {
      const payload = makePreviewPayload({ pngDataUrl: 'data:image/png;base64,xyz' });
      const previewPromise = firstValueFrom(service.bufferPreview$);
      dispatchMessage({ type: 'buffer-preview', payload });
      const received = await previewPromise;
      expect(received.pngDataUrl).toBe('data:image/png;base64,xyz');
    });

    it('should_emit_readonly_flag_on_bufferPreview$_given_readonly_payload', async () => {
      const payload = makePreviewPayload({ readonly: true, code: '' });
      const previewPromise = firstValueFrom(service.bufferPreview$);
      dispatchMessage({ type: 'buffer-preview', payload });
      const received = await previewPromise;
      expect(received.readonly).toBeTrue();
    });
  });

  // =========================================================================
  // Routage — 'buffer-preview-update'
  // =========================================================================

  describe('message routing — buffer-preview-update', () => {
    it('should_emit_on_bufferPreviewUpdate$_given_buffer_preview_update_message', async () => {
      const updatePromise = firstValueFrom(service.bufferPreviewUpdate$);
      dispatchMessage({
        type: 'buffer-preview-update',
        bufferPageId: BUFFER_ID,
        pngDataUrl: 'data:image/png;base64,new',
      });
      const received = await updatePromise;
      expect(received.bufferPageId).toBe(BUFFER_ID);
      expect(received.pngDataUrl).toBe('data:image/png;base64,new');
    });
  });

  // =========================================================================
  // Routage — 'buffer-accepted'
  // =========================================================================

  describe('message routing — buffer-accepted', () => {
    it('should_emit_bufferPageId_on_bufferAccepted$_given_buffer_accepted_message', async () => {
      const acceptedPromise = firstValueFrom(service.bufferAccepted$);
      dispatchMessage({ type: 'buffer-accepted', bufferPageId: BUFFER_ID });
      const received = await acceptedPromise;
      expect(received).toBe(BUFFER_ID);
    });
  });

  // =========================================================================
  // Routage — 'buffer-rejected'
  // =========================================================================

  describe('message routing — buffer-rejected', () => {
    it('should_emit_bufferPageId_on_bufferRejected$_given_buffer_rejected_message', async () => {
      const rejectedPromise = firstValueFrom(service.bufferRejected$);
      dispatchMessage({ type: 'buffer-rejected', bufferPageId: BUFFER_ID });
      const received = await rejectedPromise;
      expect(received).toBe(BUFFER_ID);
    });
  });

  // =========================================================================
  // Routage — 'buffer-error'
  // =========================================================================

  describe('message routing — buffer-error', () => {
    it('should_emit_on_bufferError$_given_buffer_error_message', async () => {
      const errorPromise = firstValueFrom(service.bufferError$);
      dispatchMessage({
        type: 'buffer-error',
        bufferPageId: BUFFER_ID,
        error: 'Navigation failed',
      });
      const received = await errorPromise;
      expect(received.bufferPageId).toBe(BUFFER_ID);
      expect(received.error).toBe('Navigation failed');
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
      const sub = service.taskResult$.subscribe(() => {
        emitted = true;
      });
      dispatchMessage({ type: 'theme', theme: 'light' });
      setTimeout(() => {
        expect(emitted).toBeFalse();
        sub.unsubscribe();
        done();
      }, 10);
    });

    it('should_not_emit_on_bufferPreview$_given_non_preview_message', (done) => {
      let emitted = false;
      const sub = service.bufferPreview$.subscribe(() => {
        emitted = true;
      });
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
      service.taskResult$.subscribe({
        complete: () => {
          completed = true;
        },
      });
      service.ngOnDestroy();
      expect(completed).toBeTrue();
    });

    it('should_complete_bufferPreview$_given_destroy_called', () => {
      let completed = false;
      service.bufferPreview$.subscribe({
        complete: () => {
          completed = true;
        },
      });
      service.ngOnDestroy();
      expect(completed).toBeTrue();
    });

    it('should_complete_bufferAccepted$_given_destroy_called', () => {
      let completed = false;
      service.bufferAccepted$.subscribe({
        complete: () => {
          completed = true;
        },
      });
      service.ngOnDestroy();
      expect(completed).toBeTrue();
    });

    it('should_complete_bufferRejected$_given_destroy_called', () => {
      let completed = false;
      service.bufferRejected$.subscribe({
        complete: () => {
          completed = true;
        },
      });
      service.ngOnDestroy();
      expect(completed).toBeTrue();
    });

    it('should_complete_bufferError$_given_destroy_called', () => {
      let completed = false;
      service.bufferError$.subscribe({
        complete: () => {
          completed = true;
        },
      });
      service.ngOnDestroy();
      expect(completed).toBeTrue();
    });

    it('should_stop_routing_messages_given_destroy_called', () => {
      service.ngOnDestroy();
      dispatchMessage({ type: 'project-response', id: PROJECT_ID });
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
      // 1. Connexion
      service.setConnectionStatus('connecting');
      service.setConnectionStatus('connected');
      expect(service.connectionStatus()).toBe('connected');

      // 2. Handshake projet avec userName
      dispatchMessage({ type: 'project-response', id: PROJECT_ID, userName: 'alice_uuid-001' });
      expect(service.projectId()).toBe(PROJECT_ID);
      expect(service.userName()).toBe('alice_uuid-001');

      // 3. send() enrichit bien avec le userName reçu
      service.send({ type: 'get-project' });
      const lastCall = postMessageSpy.calls.mostRecent();
      expect(lastCall.args[0].userId).toBe('alice_uuid-001');

      // 4. Changement de thème
      dispatchMessage({ type: 'theme', theme: 'light' });
      expect(service.theme()).toBe('light');

      // 5. Résultat tâche
      const resultPromise = firstValueFrom(service.taskResult$);
      dispatchMessage({
        type: 'task-result',
        taskId: 'task-xyz',
        success: true,
        data: { result: null, log: 'done' },
        error: null,
      });
      const result = await resultPromise;
      expect(result.taskId).toBe('task-xyz');

      // 6. Preview buffer
      const previewPromise = firstValueFrom(service.bufferPreview$);
      const payload = makePreviewPayload();
      dispatchMessage({ type: 'buffer-preview', payload });
      const preview = await previewPromise;
      expect(preview.bufferPageId).toBe(BUFFER_ID);

      // 7. Accept buffer
      const acceptedPromise = firstValueFrom(service.bufferAccepted$);
      dispatchMessage({ type: 'buffer-accepted', bufferPageId: BUFFER_ID });
      const accepted = await acceptedPromise;
      expect(accepted).toBe(BUFFER_ID);

      // 8. Déconnexion
      service.setConnectionStatus('disconnected');
      expect(service.connectionStatus()).toBe('disconnected');
    });
  });
});

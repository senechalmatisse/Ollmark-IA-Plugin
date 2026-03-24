import { TestBed } from '@angular/core/testing';
import { ChatStateService } from './chat-state.service';
import { BufferPreviewPayload } from '../models';

/**
 * Tests unitaires des méthodes preview-buffer de {@link ChatStateService}.
 * Les méthodes de base (addUserMessage, resolveMessage, etc.) sont couvertes
 * dans le fichier de tests existant — seules les méthodes OLM-preview sont ici.
 *
 * Naming : should[Description]_given[Context]
 */
describe('ChatStateService — preview buffer', () => {
  let service: ChatStateService;

  const BUFFER_ID = 'buf-001';
  const BUFFER_ID2 = 'buf-002';

  // ── Helpers ────────────────────────────────────────────────────────────────

  function makePayload(overrides: Partial<BufferPreviewPayload> = {}): BufferPreviewPayload {
    return {
      pngDataUrl: 'data:image/png;base64,abc',
      bufferPageId: BUFFER_ID,
      originalPageId: 'orig-001',
      taskId: 'task-001',
      code: 'penpot.createRectangle()',
      ...overrides,
    };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatStateService);
  });

  // =========================================================================
  // addPreviewMessage()
  // =========================================================================

  describe('addPreviewMessage()', () => {
    it('should_add_assistant_preview_message_given_valid_payload', () => {
      service.addPreviewMessage(makePayload());

      const msgs = service.messages();
      expect(msgs.length).toBe(1);
      expect(msgs[0].role).toBe('assistant');
      expect(msgs[0].bufferPageId).toBe(BUFFER_ID);
    });

    it('should_set_previewStatus_pending_given_new_payload', () => {
      service.addPreviewMessage(makePayload());
      expect(service.messages()[0].previewStatus).toBe('pending');
    });

    it('should_set_previewPngUrl_from_payload_given_valid_payload', () => {
      service.addPreviewMessage(makePayload({ pngDataUrl: 'data:image/png;base64,xyz' }));
      expect(service.messages()[0].previewPngUrl).toBe('data:image/png;base64,xyz');
    });

    it('should_set_previewCode_from_payload_given_valid_payload', () => {
      service.addPreviewMessage(makePayload({ code: 'penpot.createEllipse()' }));
      expect(service.messages()[0].previewCode).toBe('penpot.createEllipse()');
    });

    it('should_set_originalPageId_from_payload_given_valid_payload', () => {
      service.addPreviewMessage(makePayload({ originalPageId: 'orig-999' }));
      expect(service.messages()[0].originalPageId).toBe('orig-999');
    });

    it('should_set_content_to_empty_string_given_new_preview_message', () => {
      service.addPreviewMessage(makePayload());
      expect(service.messages()[0].content).toBe('');
    });

    it('should_generate_unique_id_given_new_preview_message', () => {
      service.addPreviewMessage(makePayload());
      const id = service.messages()[0].id;
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
    });

    it('should_append_after_existing_messages_given_prior_user_message', () => {
      service.addUserMessage('Bonjour');
      service.addPreviewMessage(makePayload());

      expect(service.messages().length).toBe(2);
      expect(service.messages()[1].bufferPageId).toBe(BUFFER_ID);
    });

    it('should_set_hasMessages_true_given_preview_message_added', () => {
      service.addPreviewMessage(makePayload());
      expect(service.hasMessages()).toBeTrue();
    });

    it('should_update_existing_pending_message_given_same_bufferPageId', () => {
      service.addPreviewMessage(makePayload({ pngDataUrl: 'data:image/png;base64,v1' }));
      const firstId = service.messages()[0].id;

      service.addPreviewMessage(makePayload({ pngDataUrl: 'data:image/png;base64,v2' }));

      const msgs = service.messages();
      expect(msgs.length).toBe(1); // pas de doublon
      expect(msgs[0].id).toBe(firstId); // même message
      expect(msgs[0].previewPngUrl).toBe('data:image/png;base64,v2'); // mis à jour
    });

    it('should_update_previewCode_on_existing_pending_message_given_same_bufferPageId', () => {
      service.addPreviewMessage(makePayload({ code: 'code-v1' }));
      service.addPreviewMessage(makePayload({ code: 'code-v2' }));

      expect(service.messages().length).toBe(1);
      expect(service.messages()[0].previewCode).toBe('code-v2');
    });

    it('should_add_new_message_given_different_bufferPageId', () => {
      service.addPreviewMessage(makePayload({ bufferPageId: BUFFER_ID }));
      service.addPreviewMessage(makePayload({ bufferPageId: BUFFER_ID2 }));

      expect(service.messages().length).toBe(2);
    });

    it('should_add_new_message_given_same_bufferPageId_but_non_pending_status', () => {
      service.addPreviewMessage(makePayload());
      service.setPreviewStatus(BUFFER_ID, 'accepted');

      // Nouveau cycle — même bufferPageId mais plus pending
      service.addPreviewMessage(makePayload({ pngDataUrl: 'data:image/png;base64,v2' }));

      expect(service.messages().length).toBe(2);
    });
  });

  // =========================================================================
  // updatePreviewPng()
  // =========================================================================

  describe('updatePreviewPng()', () => {
    it('should_update_previewPngUrl_given_matching_bufferPageId', () => {
      service.addPreviewMessage(makePayload());
      service.updatePreviewPng(BUFFER_ID, 'data:image/png;base64,updated');

      expect(service.messages()[0].previewPngUrl).toBe('data:image/png;base64,updated');
    });

    it('should_not_modify_other_messages_given_matching_bufferPageId', () => {
      service.addUserMessage('Hello');
      service.addPreviewMessage(makePayload());

      service.updatePreviewPng(BUFFER_ID, 'data:image/png;base64,updated');

      expect(service.messages()[0].content).toBe('Hello');
      expect(service.messages()[0].previewPngUrl).toBeUndefined();
    });

    it('should_leave_messages_unchanged_given_unknown_bufferPageId', () => {
      service.addPreviewMessage(makePayload());
      const before = service.messages()[0].previewPngUrl;

      service.updatePreviewPng('unknown-buf', 'data:image/png;base64,new');

      expect(service.messages()[0].previewPngUrl).toBe(before);
    });

    it('should_only_update_matching_message_given_multiple_previews', () => {
      service.addPreviewMessage(makePayload({ bufferPageId: BUFFER_ID }));
      service.addPreviewMessage(
        makePayload({ bufferPageId: BUFFER_ID2, pngDataUrl: 'data:image/png;base64,buf2' }),
      );

      service.updatePreviewPng(BUFFER_ID, 'data:image/png;base64,updated');

      const msgs = service.messages();
      expect(msgs[0].previewPngUrl).toBe('data:image/png;base64,updated');
      expect(msgs[1].previewPngUrl).toBe('data:image/png;base64,buf2');
    });
  });

  // =========================================================================
  // setPreviewStatus()
  // =========================================================================

  describe('setPreviewStatus()', () => {
    it('should_set_previewStatus_accepted_given_accepted', () => {
      service.addPreviewMessage(makePayload());
      service.setPreviewStatus(BUFFER_ID, 'accepted');

      expect(service.messages()[0].previewStatus).toBe('accepted');
    });

    it('should_set_previewStatus_rejected_given_rejected', () => {
      service.addPreviewMessage(makePayload());
      service.setPreviewStatus(BUFFER_ID, 'rejected');

      expect(service.messages()[0].previewStatus).toBe('rejected');
    });

    it('should_not_modify_other_messages_given_matching_bufferPageId', () => {
      service.addUserMessage('Hello');
      service.addPreviewMessage(makePayload());

      service.setPreviewStatus(BUFFER_ID, 'accepted');

      const userMsg = service.messages()[0];
      expect(userMsg.previewStatus).toBeUndefined();
    });

    it('should_leave_messages_unchanged_given_unknown_bufferPageId', () => {
      service.addPreviewMessage(makePayload());
      service.setPreviewStatus('unknown-buf', 'accepted');

      expect(service.messages()[0].previewStatus).toBe('pending');
    });

    it('should_only_update_matching_message_given_multiple_previews', () => {
      service.addPreviewMessage(makePayload({ bufferPageId: BUFFER_ID }));
      service.addPreviewMessage(makePayload({ bufferPageId: BUFFER_ID2 }));

      service.setPreviewStatus(BUFFER_ID, 'accepted');

      const msgs = service.messages();
      expect(msgs[0].previewStatus).toBe('accepted');
      expect(msgs[1].previewStatus).toBe('pending');
    });
  });

  // =========================================================================
  // removePendingPreviews()
  // =========================================================================

  describe('removePendingPreviews()', () => {
    it('should_remove_pending_preview_messages_given_pending_present', () => {
      service.addPreviewMessage(makePayload());
      service.removePendingPreviews();

      expect(service.messages().length).toBe(0);
    });

    it('should_keep_non_preview_messages_given_mixed_messages', () => {
      service.addUserMessage('Hello');
      service.addPreviewMessage(makePayload());

      service.removePendingPreviews();

      const msgs = service.messages();
      expect(msgs.length).toBe(1);
      expect(msgs[0].content).toBe('Hello');
    });

    it('should_keep_accepted_preview_messages_given_accepted_status', () => {
      service.addPreviewMessage(makePayload());
      service.setPreviewStatus(BUFFER_ID, 'accepted');

      service.removePendingPreviews();

      expect(service.messages().length).toBe(1);
      expect(service.messages()[0].previewStatus).toBe('accepted');
    });

    it('should_keep_rejected_preview_messages_given_rejected_status', () => {
      service.addPreviewMessage(makePayload());
      service.setPreviewStatus(BUFFER_ID, 'rejected');

      service.removePendingPreviews();

      expect(service.messages().length).toBe(1);
      expect(service.messages()[0].previewStatus).toBe('rejected');
    });

    it('should_remove_only_pending_given_mixed_preview_statuses', () => {
      service.addPreviewMessage(makePayload({ bufferPageId: BUFFER_ID }));
      service.addPreviewMessage(makePayload({ bufferPageId: BUFFER_ID2 }));
      service.setPreviewStatus(BUFFER_ID, 'accepted');
      // BUFFER_ID2 reste pending

      service.removePendingPreviews();

      const msgs = service.messages();
      expect(msgs.length).toBe(1);
      expect(msgs[0].bufferPageId).toBe(BUFFER_ID);
    });

    it('should_be_no_op_given_no_pending_previews', () => {
      service.addUserMessage('Hello');
      service.removePendingPreviews();

      expect(service.messages().length).toBe(1);
    });

    it('should_be_no_op_given_empty_messages', () => {
      service.removePendingPreviews();
      expect(service.messages()).toEqual([]);
    });

    it('should_set_hasMessages_false_given_only_pending_previews_removed', () => {
      service.addPreviewMessage(makePayload());
      service.removePendingPreviews();

      expect(service.hasMessages()).toBeFalse();
    });
  });

  // =========================================================================
  // Scénarios d'intégration preview
  // =========================================================================

  describe('integration — preview lifecycle', () => {
    it('should_handle_full_preview_accept_cycle_given_realistic_sequence', () => {
      // 1. Utilisateur envoie un prompt
      service.addUserMessage('Ajoute un cercle vert');

      // 2. Preview reçue
      service.addPreviewMessage(makePayload({ pngDataUrl: 'data:image/png;base64,v1' }));
      expect(service.messages().length).toBe(2);
      expect(service.messages()[1].previewStatus).toBe('pending');

      // 3. Mise à jour de la preview (2ème rendu)
      service.updatePreviewPng(BUFFER_ID, 'data:image/png;base64,v2');
      expect(service.messages()[1].previewPngUrl).toBe('data:image/png;base64,v2');

      // 4. Utilisateur accepte
      service.setPreviewStatus(BUFFER_ID, 'accepted');
      expect(service.messages()[1].previewStatus).toBe('accepted');

      // 5. État final cohérent
      expect(service.messages().length).toBe(2);
      expect(service.hasMessages()).toBeTrue();
    });

    it('should_handle_full_preview_reject_cycle_given_realistic_sequence', () => {
      service.addUserMessage('Supprime le cercle');
      service.addPreviewMessage(makePayload());
      service.setPreviewStatus(BUFFER_ID, 'rejected');

      expect(service.messages()[1].previewStatus).toBe('rejected');
      expect(service.messages().length).toBe(2);
    });

    it('should_clean_pending_and_allow_new_prompt_given_new_cycle_starts', () => {
      service.addUserMessage('Premier prompt');
      service.addPreviewMessage(makePayload());

      // Nouveau prompt → nettoyage pending
      service.removePendingPreviews();
      service.addUserMessage('Deuxième prompt');
      service.addPreviewMessage(makePayload({ bufferPageId: BUFFER_ID2 }));

      const msgs = service.messages();
      expect(msgs.length).toBe(3); // user1 + user2 + preview2
      expect(msgs.find((m) => m.bufferPageId === BUFFER_ID)).toBeUndefined();
      expect(msgs.find((m) => m.bufferPageId === BUFFER_ID2)).toBeDefined();
    });

    it('should_update_same_preview_on_multi_step_given_same_bufferPageId', () => {
      service.addPreviewMessage(
        makePayload({ pngDataUrl: 'data:image/png;base64,step1', code: 'code1' }),
      );
      service.addPreviewMessage(
        makePayload({ pngDataUrl: 'data:image/png;base64,step2', code: 'code2' }),
      );
      service.addPreviewMessage(
        makePayload({ pngDataUrl: 'data:image/png;base64,step3', code: 'code3' }),
      );

      expect(service.messages().length).toBe(1);
      expect(service.messages()[0].previewPngUrl).toBe('data:image/png;base64,step3');
      expect(service.messages()[0].previewCode).toBe('code3');
    });
  });
});

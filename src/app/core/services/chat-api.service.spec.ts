import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { ChatApiService } from './chat-api.service';
import { API_BASE_URL } from '../tokens/api.tokens';
import { ChatResponse } from '../models';
import { ApiError } from '../models/api-error.model';

/**
 * Tests unitaires de {@link ChatApiService}.
 *
 * Conventions :
 *   - HttpTestingController intercepte toutes les requêtes HTTP réelles.
 *   - Chaque test flush/vérifie les requêtes dans afterEach.
 *   - firstValueFrom() est utilisé pour consommer les Observables dans les tests async.
 *
 * Naming : should[Description]_given[Context]
 */
describe('ChatApiService', () => {
  let service: ChatApiService;
  let httpMock: HttpTestingController;

  const BASE_URL = 'http://localhost:8080';
  const PROJECT_ID = 'ddc4a96c-d2ad-80ac-8007-b6f8a1ae8d41';
  const SESSION_ID = '2da7d5ee-7236-2075-e628-69a02aa27338';

  // ── Setup ──────────────────────────────────────────────────────────────────

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ChatApiService, { provide: API_BASE_URL, useValue: BASE_URL }],
    });
    service = TestBed.inject(ChatApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // =========================================================================
  // sendMessage()
  // =========================================================================

  describe('sendMessage()', () => {
    it('should_POST_to_correct_url_given_valid_params', async () => {
      const mockResponse: ChatResponse = {
        success: true,
        projectId: PROJECT_ID,
        response: 'Rectangle bleu créé.',
      };
      const promise = firstValueFrom(
        service.sendMessage(PROJECT_ID, 'Crée un rectangle bleu', SESSION_ID),
      );

      const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);

      expect(await promise).toEqual(mockResponse);
    });

    it('should_include_sessionId_in_body_given_sessionId_provided', async () => {
      const promise = firstValueFrom(service.sendMessage(PROJECT_ID, 'Message', SESSION_ID));

      const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat`);
      expect(req.request.body).toEqual({
        projectId: PROJECT_ID,
        message: 'Message',
        sessionId: SESSION_ID,
      });
      req.flush({ success: true, projectId: PROJECT_ID, response: 'OK' });

      await promise;
    });

    it('should_omit_sessionId_in_body_given_no_sessionId', async () => {
      const promise = firstValueFrom(service.sendMessage(PROJECT_ID, 'Message sans session'));

      const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat`);
      expect(req.request.body.projectId).toBe(PROJECT_ID);
      expect(req.request.body.sessionId).toBeUndefined();
      req.flush({ success: true, projectId: PROJECT_ID, response: 'OK' });

      await promise;
    });

    it('should_return_success_response_given_backend_returns_200', async () => {
      const mockResponse: ChatResponse = { success: true, projectId: PROJECT_ID, response: 'OK' };
      const promise = firstValueFrom(service.sendMessage(PROJECT_ID, 'msg'));

      const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat`);
      req.flush(mockResponse);

      expect(await promise).toEqual(mockResponse);
    });

    it('should_throw_ApiError_with_backend_message_given_500_with_json_error_body', async () => {
      const promise = firstValueFrom(service.sendMessage(PROJECT_ID, 'Message'));

      const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat`);
      req.flush(
        { error: 'Session plugin inactive' },
        { status: 500, statusText: 'Internal Server Error' },
      );

      await expectAsync(promise).toBeRejectedWithError('Session plugin inactive');
    });

    it('should_throw_ApiError_instance_given_any_http_error', (done) => {
      service.sendMessage(PROJECT_ID, 'msg').subscribe({
        next: () => fail('Should not emit a value'),
        error: (err: unknown) => {
          expect(err).toBeInstanceOf(ApiError);
          done();
        },
      });
      const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat`);
      req.flush({ error: 'Boom' }, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should_throw_error_given_network_error', async () => {
      const promise = firstValueFrom(service.sendMessage(PROJECT_ID, 'Message'));

      const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat`);
      req.error(new ProgressEvent('network error'));

      await expectAsync(promise).toBeRejectedWith(
        jasmine.objectContaining({ message: jasmine.any(String) }),
      );
    });
  });

  // =========================================================================
  // clearConversation()
  // =========================================================================

  describe('clearConversation()', () => {
    it('should_DELETE_to_correct_url_given_valid_projectId', async () => {
      const promise = firstValueFrom(service.clearConversation(PROJECT_ID));

      const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat/${PROJECT_ID}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);

      await promise;
    });

    it('should_throw_error_given_server_returns_500', async () => {
      const promise = firstValueFrom(service.clearConversation(PROJECT_ID));

      const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat/${PROJECT_ID}`);
      req.flush({ error: 'Failed to clear' }, { status: 500, statusText: 'Internal Server Error' });

      await expectAsync(promise).toBeRejectedWithError('Failed to clear');
    });
  });

  // =========================================================================
  // deleteProjectConversations()
  // =========================================================================

  describe('deleteProjectConversations()', () => {
    it('should_DELETE_to_correct_url_given_valid_projectId', async () => {
      const promise = firstValueFrom(service.deleteProjectConversations(PROJECT_ID));

      const req = httpMock.expectOne(`${BASE_URL}/api/ai/conversations/project/${PROJECT_ID}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);

      await promise;
    });

    it('should_throw_error_given_server_returns_404', async () => {
      const promise = firstValueFrom(service.deleteProjectConversations(PROJECT_ID));

      const req = httpMock.expectOne(`${BASE_URL}/api/ai/conversations/project/${PROJECT_ID}`);
      req.flush({ error: 'Project not found' }, { status: 404, statusText: 'Not Found' });

      await expectAsync(promise).toBeRejectedWithError('Project not found');
    });
  });

  // =========================================================================
  // startNewConversation()
  // =========================================================================

  describe('startNewConversation()', () => {
    it('should_POST_to_correct_url_and_return_success_given_valid_projectId', async () => {
      const mockResponse = { success: true, projectId: PROJECT_ID };
      const promise = firstValueFrom(service.startNewConversation(PROJECT_ID));

      const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat/new`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ projectId: PROJECT_ID });
      req.flush(mockResponse);

      expect(await promise).toEqual(mockResponse);
    });

    it('should_throw_error_given_server_error', async () => {
      const promise = firstValueFrom(service.startNewConversation(PROJECT_ID));

      const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat/new`);
      req.flush(
        { error: 'Could not create conversation' },
        { status: 500, statusText: 'Internal Server Error' },
      );

      await expectAsync(promise).toBeRejectedWithError('Could not create conversation');
    });
  });

  // =========================================================================
  // getChatHistory()
  // =========================================================================

  describe('getChatHistory()', () => {
    it('should_GET_to_correct_url_with_default_limit_given_no_limit_param', async () => {
      const mockHistory = [
        { role: 'user', content: 'Crée un rectangle bleu' },
        { role: 'assistant', content: 'Rectangle créé avec succès !' },
      ];
      const promise = firstValueFrom(service.getChatHistory(PROJECT_ID));

      const req = httpMock.expectOne(
        (r) => r.url === `${BASE_URL}/api/ai/chat/${PROJECT_ID}/history`,
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('limit')).toBe('20');
      req.flush(mockHistory);

      expect(await promise).toEqual(mockHistory);
    });

    it('should_GET_with_custom_limit_given_limit_param_provided', async () => {
      const promise = firstValueFrom(service.getChatHistory(PROJECT_ID, 5));

      const req = httpMock.expectOne(
        (r) => r.url === `${BASE_URL}/api/ai/chat/${PROJECT_ID}/history`,
      );
      expect(req.request.params.get('limit')).toBe('5');
      req.flush([]);

      await promise;
    });

    it('should_return_empty_array_given_no_history', async () => {
      const promise = firstValueFrom(service.getChatHistory(PROJECT_ID));

      const req = httpMock.expectOne(
        (r) => r.url === `${BASE_URL}/api/ai/chat/${PROJECT_ID}/history`,
      );
      req.flush([]);

      expect(await promise).toEqual([]);
    });

    it('should_throw_error_given_server_returns_500', async () => {
      const promise = firstValueFrom(service.getChatHistory(PROJECT_ID));

      const req = httpMock.expectOne(
        (r) => r.url === `${BASE_URL}/api/ai/chat/${PROJECT_ID}/history`,
      );
      req.flush(
        { error: 'Database unavailable' },
        { status: 500, statusText: 'Internal Server Error' },
      );

      await expectAsync(promise).toBeRejectedWithError('Database unavailable');
    });
  });

  // =========================================================================
  // _handleError() + _classifyError() — via sendMessage
  // =========================================================================

  describe('_handleError() + _classifyError() (via sendMessage)', () => {
    it('should_classify_as_network_given_status_0', (done) => {
      service.sendMessage(PROJECT_ID, 'msg').subscribe({
        error: (err: ApiError) => {
          expect(err.type).toBe('network');
          expect(err.status).toBe(0);
          done();
        },
      });
      const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat`);
      req.error(new ProgressEvent('error'));
    });

    it('should_classify_as_server_given_status_500', (done) => {
      service.sendMessage(PROJECT_ID, 'msg').subscribe({
        error: (err: ApiError) => {
          expect(err.type).toBe('server');
          expect(err.status).toBe(500);
          done();
        },
      });
      const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat`);
      req.flush({ error: 'Server down' }, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should_classify_as_client_given_status_400', (done) => {
      service.sendMessage(PROJECT_ID, 'msg').subscribe({
        error: (err: ApiError) => {
          expect(err.type).toBe('client');
          expect(err.status).toBe(400);
          done();
        },
      });
      const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat`);
      req.flush({ error: 'Bad request' }, { status: 400, statusText: 'Bad Request' });
    });

    it('should_classify_as_client_given_status_404', (done) => {
      service.sendMessage(PROJECT_ID, 'msg').subscribe({
        error: (err: ApiError) => {
          expect(err.type).toBe('client');
          done();
        },
      });
      const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat`);
      req.flush({ error: 'Not found' }, { status: 404, statusText: 'Not Found' });
    });

    it('should_use_backend_error_field_as_message_given_json_error_body', async () => {
      const promise = firstValueFrom(service.sendMessage(PROJECT_ID, 'msg'));
      const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat`);
      req.flush({ error: 'Custom backend error' }, { status: 400, statusText: 'Bad Request' });
      await expectAsync(promise).toBeRejectedWithError('Custom backend error');
    });

    it('should_use_backend_message_field_as_message_given_json_message_body', async () => {
      const promise = firstValueFrom(service.sendMessage(PROJECT_ID, 'msg'));
      const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat`);
      req.flush({ message: 'Message from backend' }, { status: 400, statusText: 'Bad Request' });
      await expectAsync(promise).toBeRejectedWithError('Message from backend');
    });

    it('should_use_generic_fallback_message_given_no_json_body', async () => {
      const promise = firstValueFrom(service.sendMessage(PROJECT_ID, 'msg'));
      const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat`);
      req.flush('', { status: 503, statusText: 'Service Unavailable' });
      await expectAsync(promise).toBeRejected();
    });

    it('should_emit_ApiError_observable_given_any_http_error', (done) => {
      service.sendMessage(PROJECT_ID, 'msg').subscribe({
        next: () => fail('Should not emit a value'),
        error: (err: unknown) => {
          expect(err).toBeInstanceOf(ApiError);
          expect((err as ApiError).message).toBeTruthy();
          done();
        },
      });
      const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat`);
      req.flush({ error: 'Boom' }, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should_set_status_on_ApiError_given_http_error_with_status', (done) => {
      service.sendMessage(PROJECT_ID, 'msg').subscribe({
        error: (err: ApiError) => {
          expect(err.status).toBe(422);
          done();
        },
      });
      const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat`);
      req.flush({ error: 'Unprocessable' }, { status: 422, statusText: 'Unprocessable Entity' });
    });
  });
});

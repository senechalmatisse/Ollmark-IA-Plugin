import { TestBed } from '@angular/core/testing';
import {
    HttpClientTestingModule,
    HttpTestingController,
} from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { ChatApiService } from './chat-api.service';
import { API_BASE_URL } from '../tokens/api.tokens';
import { ChatResponse } from '../models';

/**
 * Tests unitaires de {@link ChatApiService}.
 *
 * Conventions :
 *   - `HttpTestingController` intercepte toutes les requêtes HTTP réelles.
 *   - Chaque test flush/verifie les requêtes dans `afterEach`.
 *   - `firstValueFrom()` est utilisé pour consommer les Observables dans les tests async.
 *
 * Naming : `should[Description]_given[Context]`
 */
describe('ChatApiService', () => {
    let service: ChatApiService;
    let httpMock: HttpTestingController;

    const BASE_URL   = 'http://localhost:8080';
    const PROJECT_ID = 'ddc4a96c-d2ad-80ac-8007-b6f8a1ae8d41';
    const SESSION_ID = '2da7d5ee-7236-2075-e628-69a02aa27338';

    // ── Setup ──────────────────────────────────────────────────────────────────

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [
                ChatApiService,
                { provide: API_BASE_URL, useValue: BASE_URL },
            ],
        });

        service  = TestBed.inject(ChatApiService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        // Vérifie qu'aucune requête inattendue n'est restée en suspens
        httpMock.verify();
    });

    // =========================================================================
    // sendMessage()
    // =========================================================================

    describe('sendMessage()', () => {

        it('should_POST_to_correct_url_given_valid_params', async () => {
            const mockResponse: ChatResponse = {
                success:   true,
                projectId: PROJECT_ID,
                response:  'Rectangle bleu créé.',
            };

            const promise = firstValueFrom(
                service.sendMessage(PROJECT_ID, 'Crée un rectangle bleu', SESSION_ID)
            );

            const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat`);
            expect(req.request.method).toBe('POST');
            req.flush(mockResponse);

            const result = await promise;
            expect(result).toEqual(mockResponse);
        });

        it('should_include_sessionId_in_body_given_sessionId_provided', async () => {
            const promise = firstValueFrom(
                service.sendMessage(PROJECT_ID, 'Message', SESSION_ID)
            );

            const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat`);
            expect(req.request.body).toEqual({
                projectId: PROJECT_ID,
                message:   'Message',
                sessionId: SESSION_ID,
            });
            req.flush({ success: true, projectId: PROJECT_ID, response: 'OK' });

            await promise;
        });

        it('should_omit_sessionId_in_body_given_no_sessionId', async () => {
            const promise = firstValueFrom(
                service.sendMessage(PROJECT_ID, 'Message sans session')
            );

            const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat`);
            // sessionId undefined est inclus dans le body mais reste undefined
            expect(req.request.body.projectId).toBe(PROJECT_ID);
            expect(req.request.body.sessionId).toBeUndefined();
            req.flush({ success: true, projectId: PROJECT_ID, response: 'OK' });

            await promise;
        });

        it('should_throw_error_with_backend_message_given_server_error_with_json_body', async () => {
            const promise = firstValueFrom(
                service.sendMessage(PROJECT_ID, 'Message')
            );

            const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat`);
            req.flush(
                { error: 'Session plugin inactive' },
                { status: 500, statusText: 'Internal Server Error' }
            );

            await expectAsync(promise).toBeRejectedWithError('Session plugin inactive');
        });

        it('should_throw_generic_error_given_network_error', async () => {
            const promise = firstValueFrom(
                service.sendMessage(PROJECT_ID, 'Message')
            );

            const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat`);
            req.error(new ProgressEvent('network error'));

            await expectAsync(promise).toBeRejectedWith(
                jasmine.objectContaining({ message: jasmine.any(String) })
            );
        });
    });

    // =========================================================================
    // clearConversation()
    // =========================================================================

    describe('clearConversation()', () => {

        it('should_DELETE_to_correct_url_given_valid_projectId', async () => {
            const promise = firstValueFrom(
                service.clearConversation(PROJECT_ID)
            );

            const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat/${PROJECT_ID}`);
            expect(req.request.method).toBe('DELETE');
            req.flush(null);

            await promise;
            // Aucune valeur émise — la promesse se résout simplement
        });

        it('should_throw_error_given_server_returns_500', async () => {
            const promise = firstValueFrom(
                service.clearConversation(PROJECT_ID)
            );

            const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat/${PROJECT_ID}`);
            req.flush(
                { error: 'Failed to clear' },
                { status: 500, statusText: 'Internal Server Error' }
            );

            await expectAsync(promise).toBeRejectedWithError('Failed to clear');
        });
    });

    // =========================================================================
    // deleteProjectConversations()
    // =========================================================================

    describe('deleteProjectConversations()', () => {

        it('should_DELETE_to_correct_url_given_valid_projectId', async () => {
            const promise = firstValueFrom(
                service.deleteProjectConversations(PROJECT_ID)
            );

            const req = httpMock.expectOne(
                `${BASE_URL}/api/ai/conversations/project/${PROJECT_ID}`
            );
            expect(req.request.method).toBe('DELETE');
            req.flush(null);

            await promise;
        });

        it('should_throw_error_given_server_returns_404', async () => {
            const promise = firstValueFrom(
                service.deleteProjectConversations(PROJECT_ID)
            );

            const req = httpMock.expectOne(
                `${BASE_URL}/api/ai/conversations/project/${PROJECT_ID}`
            );
            req.flush(
                { error: 'Project not found' },
                { status: 404, statusText: 'Not Found' }
            );

            await expectAsync(promise).toBeRejectedWithError('Project not found');
        });
    });

    // =========================================================================
    // startNewConversation()
    // =========================================================================

    describe('startNewConversation()', () => {

        it('should_POST_to_correct_url_and_return_success_given_valid_projectId', async () => {
            const mockResponse = { success: true, projectId: PROJECT_ID };

            const promise = firstValueFrom(
                service.startNewConversation(PROJECT_ID)
            );

            const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat/new`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ projectId: PROJECT_ID });
            req.flush(mockResponse);

            const result = await promise;
            expect(result).toEqual(mockResponse);
        });

        it('should_throw_error_given_server_error', async () => {
            const promise = firstValueFrom(
                service.startNewConversation(PROJECT_ID)
            );

            const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat/new`);
            req.flush(
                { error: 'Could not create conversation' },
                { status: 500, statusText: 'Internal Server Error' }
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
                { role: 'user',      content: 'Crée un rectangle bleu' },
                { role: 'assistant', content: 'Rectangle créé avec succès !' },
            ];

            const promise = firstValueFrom(
                service.getChatHistory(PROJECT_ID)
            );

            const req = httpMock.expectOne(
                (r) => r.url === `${BASE_URL}/api/ai/chat/${PROJECT_ID}/history`
            );
            expect(req.request.method).toBe('GET');
            expect(req.request.params.get('limit')).toBe('20');
            req.flush(mockHistory);

            const result = await promise;
            expect(result).toEqual(mockHistory);
        });

        it('should_GET_with_custom_limit_given_limit_param_provided', async () => {
            const promise = firstValueFrom(
                service.getChatHistory(PROJECT_ID, 5)
            );

            const req = httpMock.expectOne(
                (r) => r.url === `${BASE_URL}/api/ai/chat/${PROJECT_ID}/history`
            );
            expect(req.request.params.get('limit')).toBe('5');
            req.flush([]);

            await promise;
        });

        it('should_return_empty_array_given_no_history', async () => {
            const promise = firstValueFrom(
                service.getChatHistory(PROJECT_ID, 20)
            );

            const req = httpMock.expectOne(
                (r) => r.url === `${BASE_URL}/api/ai/chat/${PROJECT_ID}/history`
            );
            req.flush([]);

            const result = await promise;
            expect(result).toEqual([]);
        });

        it('should_throw_error_given_server_returns_500', async () => {
            const promise = firstValueFrom(
                service.getChatHistory(PROJECT_ID)
            );

            const req = httpMock.expectOne(
                (r) => r.url === `${BASE_URL}/api/ai/chat/${PROJECT_ID}/history`
            );
            req.flush(
                { error: 'Database unavailable' },
                { status: 500, statusText: 'Internal Server Error' }
            );

            await expectAsync(promise).toBeRejectedWithError('Database unavailable');
        });
    });

    // =========================================================================
    // _handleError() — comportement via les méthodes publiques
    // =========================================================================

    describe('_handleError() (via sendMessage)', () => {

        it('should_use_err_error_error_field_given_backend_json_error_body', async () => {
            const promise = firstValueFrom(service.sendMessage(PROJECT_ID, 'msg'));

            const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat`);
            req.flush(
                { error: 'Custom backend error' },
                { status: 400, statusText: 'Bad Request' }
            );

            await expectAsync(promise).toBeRejectedWithError('Custom backend error');
        });

        it('should_use_err_message_given_no_json_error_body', async () => {
            const promise = firstValueFrom(service.sendMessage(PROJECT_ID, 'msg'));

            const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat`);
            // Corps vide — err.error.error sera undefined, fallback sur err.message
            req.flush('', { status: 503, statusText: 'Service Unavailable' });

            await expectAsync(promise).toBeRejected();
        });

        it('should_emit_error_observable_given_any_http_error', (done) => {
            service.sendMessage(PROJECT_ID, 'msg').subscribe({
                next: () => fail('Should not emit a value'),
                error: (err: Error) => {
                    expect(err).toBeInstanceOf(Error);
                    expect(err.message).toBeTruthy();
                    done();
                },
            });

            const req = httpMock.expectOne(`${BASE_URL}/api/ai/chat`);
            req.flush(
                { error: 'Boom' },
                { status: 500, statusText: 'Internal Server Error' }
            );
        });
    });
});
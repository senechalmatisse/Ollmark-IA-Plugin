import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { Service } from './service';
import { ChatHistoryError, RawChatEntry } from '../models/raw-message.model';
import { Message } from '../../../core/models/message.model';
import { environment } from '../../../environments/environment';

// ─── Constants ────────────────────────────────────────────────────────────────

const CONVERSATION_ID = '11111111-1111-1111-1111-111111111111';
const ENTRY_URL      = `${environment.apiUrl}/message/conversation/${CONVERSATION_ID}`;
const HISTORY_URL    = `${environment.apiUrl}/message/conversation/${CONVERSATION_ID}/last`;
const DEFAULT_LIMIT  = 20;

// ─── Mock factory ─────────────────────────────────────────────────────────────

const mockEntry = (overrides: Partial<RawChatEntry> = {}): RawChatEntry => ({
  id: 'aaaaaaaa-0000-0000-0000-000000000001',
  project_id: 'bbbbbbbb-0000-0000-0000-000000000001',
  conversation_id: CONVERSATION_ID,
  content_user: 'Explain dependency injection.',
  content_ai: 'Dependency injection is a design pattern...',
  created_at: '2024-03-11T10:00:00.000Z',
  ...overrides,
});

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Service', () => {
  let service: Service;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        Service,
      ],
    });

    service  = TestBed.inject(Service);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ── getConversation ────────────────────────────────────────────────────────

  describe('getConversation()', () => {

    it('should call GET on the correct entry URL', () => {
      service.getConversation(CONVERSATION_ID).subscribe();

      const req = httpMock.expectOne(ENTRY_URL);
      expect(req.request.method).toBe('GET');
      req.flush(mockEntry());
    });

    it('should return a [user, ai] message pair from a full entry', () => {
      let result: Message[] = [];

      service.getConversation(CONVERSATION_ID).subscribe((msgs) => (result = msgs));
      httpMock.expectOne(ENTRY_URL).flush(mockEntry());

      expect(result.length).toBe(2);
      expect(result[0]).toEqual(jasmine.objectContaining<Message>({
        id: 'aaaaaaaa-0000-0000-0000-000000000001_user',
        sender: 'user',
        content: 'Explain dependency injection.',
        timestamp: new Date('2024-03-11T10:00:00.000Z'),
      }));
      expect(result[1]).toEqual(jasmine.objectContaining<Message>({
        id: 'aaaaaaaa-0000-0000-0000-000000000001_ai',
        sender: 'ai',
        content: 'Dependency injection is a design pattern...',
        timestamp: new Date('2024-03-11T10:00:00.000Z'),
      }));
    });

    it('should return only the user message when content_ai is null', () => {
      let result: Message[] = [];

      service.getConversation(CONVERSATION_ID).subscribe((msgs) => (result = msgs));
      httpMock.expectOne(ENTRY_URL).flush(mockEntry({ content_ai: null }));

      expect(result.length).toBe(1);
      expect(result[0].sender).toBe('user');
    });

    it('should return only the ai message when content_user is null', () => {
      let result: Message[] = [];

      service.getConversation(CONVERSATION_ID).subscribe((msgs) => (result = msgs));
      httpMock.expectOne(ENTRY_URL).flush(mockEntry({ content_user: null }));

      expect(result.length).toBe(1);
      expect(result[0].sender).toBe('ai');
    });

    it('should return an empty array when both contents are null', () => {
      let result: Message[] = [];

      service.getConversation(CONVERSATION_ID).subscribe((msgs) => (result = msgs));
      httpMock.expectOne(ENTRY_URL).flush(mockEntry({ content_user: null, content_ai: null }));

      expect(result.length).toBe(0);
    });
  });

  // ── getHistory ─────────────────────────────────────────────────────────────

  describe('getHistory()', () => {

    it(`should call GET with default limit=${DEFAULT_LIMIT}`, () => {
      service.getHistory(CONVERSATION_ID).subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === HISTORY_URL && r.params.get('limit') === `${DEFAULT_LIMIT}`,
      );
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should forward a custom limit as a query param', () => {
      service.getHistory(CONVERSATION_ID, 10).subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === HISTORY_URL && r.params.get('limit') === '10',
      );
      req.flush([]);
    });

    it('should flatten N entries into a [user, ai, user, ai, ...] message list', () => {
      const entries: RawChatEntry[] = [
        mockEntry({ id: 'entry-1', content_user: 'Question 1', content_ai: 'Answer 1' }),
        mockEntry({ id: 'entry-2', content_user: 'Question 2', content_ai: 'Answer 2' }),
        mockEntry({ id: 'entry-3', content_user: 'Question 3', content_ai: 'Answer 3' }),
      ];

      let result: Message[] = [];
      service.getHistory(CONVERSATION_ID).subscribe((msgs) => (result = msgs));

      httpMock.expectOne((r) => r.url === HISTORY_URL).flush(entries);

      expect(result.length).toBe(6);
      expect(result.map((m) => m.sender)).toEqual(['user', 'ai', 'user', 'ai', 'user', 'ai']);
      expect(result[0].content).toBe('Question 1');
      expect(result[1].content).toBe('Answer 1');
      expect(result[4].id).toBe('entry-3_user');
    });

    it('should return an empty array when the backend returns []', () => {
      let result: Message[] = [{ id: 'x', sender: 'user', content: 'x', timestamp: new Date() }];

      service.getHistory(CONVERSATION_ID).subscribe((msgs) => (result = msgs));
      httpMock.expectOne((r) => r.url === HISTORY_URL).flush([]);

      expect(result.length).toBe(0);
    });
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  describe('Error handling', () => {

    it('should emit a ChatHistoryError with status 404', () => {
      let error!: ChatHistoryError;

      service.getConversation(CONVERSATION_ID).subscribe({ error: (e) => (error = e) });
      httpMock
        .expectOne(ENTRY_URL)
        .flush({ message: 'Conversation not found' }, { status: 404, statusText: 'Not Found' });

      expect(error.status).toBe(404);
      expect(error.message).toContain('Conversation not found');
    });

    it('should emit a ChatHistoryError with status 500', () => {
      let error!: ChatHistoryError;

      service.getHistory(CONVERSATION_ID).subscribe({ error: (e) => (error = e) });
      httpMock
        .expectOne((r) => r.url === HISTORY_URL)
        .flush({ message: 'Internal Server Error' }, { status: 500, statusText: 'Server Error' });

      expect(error.status).toBe(500);
    });

    it('should emit a network error (status 0) when the server is unreachable', () => {
      let error!: ChatHistoryError;

      service.getConversation(CONVERSATION_ID).subscribe({ error: (e) => (error = e) });
      httpMock
        .expectOne(ENTRY_URL)
        .error(new ProgressEvent('Network error'));

      expect(error.status).toBe(0);
      expect(error.message).toContain('Network error');
    });
  });
});
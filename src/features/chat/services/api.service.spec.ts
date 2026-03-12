import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService]
    });
    service = TestBed.inject(ApiService);
    // Mock global fetch
    spyOn(window, 'fetch');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initConversation', () => {
    it('should return conversationId on success', async () => {
      (window.fetch as jasmine.Spy).and.resolveTo({
        ok: true,
        json: () => Promise.resolve({ conversationId: 'conv-123' })
      } as Response);

      const result = await service.initConversation();
      expect(result).toBe('conv-123');
      expect(window.fetch).toHaveBeenCalledWith(jasmine.stringMatching('/chat/new'), jasmine.any(Object));
    });

    it('should throw error when response is not ok', async () => {
      (window.fetch as jasmine.Spy).and.resolveTo({ ok: false, status: 500 } as Response);
      await expectAsync(service.initConversation()).toBeRejectedWithError('Init failed: HTTP 500');
    });
  });

  describe('sendMessage', () => {
    it('should parse SSE chunks correctly', (done) => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: chunk1\ndata: chunk2\ndata: [DONE]\n'));
          controller.close();
        }
      });

      (window.fetch as jasmine.Spy).and.resolveTo({
        ok: true,
        body: mockStream
      } as Response);

      const chunks: string[] = [];
      service.sendMessage('hello', 'conv-123').subscribe({
        next: (val) => chunks.push(val),
        complete: () => {
          expect(chunks).toEqual(['chunk1', 'chunk2']);
          done();
        }
      });
    });

    it('should handle fetch errors', (done) => {
      (window.fetch as jasmine.Spy).and.rejectWith(new Error('Network Error'));
      service.sendMessage('hello', 'conv-123').subscribe({
        error: (err) => {
          expect(err.message).toBe('Network Error');
          done();
        }
      });
    });
  });
});
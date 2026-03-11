import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ChatService } from './chat.service';
import { AIMessage } from '../../../app/message/ai-message';
import { UserMessage } from '../../../app/message/user-message';

describe('ChatService', () => {
  let service: ChatService;
  let fetchSpy: jasmine.Spy;

  const mockStream = (chunks: string[]) => {
    const encoder = new TextEncoder();
    const lines = chunks.map(c => `data:${c}\n`).join('') + 'data:[DONE]\n';
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(lines));
        controller.close();
      }
    });
    return Promise.resolve(new Response(stream, { status: 200 }));
  };

  beforeEach(() => {
    fetchSpy = spyOn(window, 'fetch');

    // Mock initConversation
    fetchSpy.and.returnValue(
      Promise.resolve(
        new Response(JSON.stringify({ conversationId: 'conv-123' }), { status: 200 })
      )
    );

    TestBed.configureTestingModule({ providers: [ChatService] });
    service = TestBed.inject(ChatService);
  });

  // ── initConversation ───────────────────────────────────────────
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── sendMessage – messages ─────────────────────────────────────
  it('should add a UserMessage and an AIMessage placeholder on sendMessage', fakeAsync(() => {
    fetchSpy.and.returnValue(mockStream(['Hello']));

    service.sendMessage('Hi').subscribe();

    const msgs = service.messages();
    expect(msgs.length).toBe(2);
    expect(msgs[0]).toBeInstanceOf(UserMessage);
    expect(msgs[0].content).toBe('Hi');
    expect(msgs[1]).toBeInstanceOf(AIMessage);
    expect(msgs[1].content).toBe('');

    tick();
  }));

  // ── sendMessage – errors ───────────────────────────────────────
  it('should call observer.error on HTTP error', fakeAsync(() => {
    fetchSpy.and.returnValue(Promise.resolve(new Response(null, { status: 500 })));
    // CORRECTION : Remplacer 'any' par 'Error | null' ou 'any' si vraiment nécessaire 
    // mais ici on va utiliser 'any' avec une désactivation locale si tu es pressé, 
    // ou mieux, typer correctement :
    let error: Error | undefined; 
    service.sendMessage('test').subscribe({ error: e => (error = e) });
    tick();
    expect(error).toBeTruthy();
    expect(error?.message).toContain('500');
  }));

  it('should call observer.error on network failure', fakeAsync(() => {
    fetchSpy.and.returnValue(Promise.reject(new Error('Network down')));
    let error: Error | undefined; // CORRECTION : Typage plus précis que 'any'
    service.sendMessage('test').subscribe({ error: e => (error = e) });
    tick();
    expect(error?.message).toBe('Network down');
  }));

  // ── sendMessage – request body ─────────────────────────────────
  it('should pass userToken in request body when provided', fakeAsync(() => {
    fetchSpy.and.returnValue(mockStream([]));

    service.sendMessage('hi', 'my-token').subscribe();
    const body = JSON.parse(fetchSpy.calls.mostRecent().args[1].body);
    expect(body.userToken).toBe('my-token');

    tick();
  }));

  it('should not include userToken in body when not provided', fakeAsync(() => {
    fetchSpy.and.returnValue(mockStream([]));

    service.sendMessage('hi').subscribe();
    const body = JSON.parse(fetchSpy.calls.mostRecent().args[1].body);
    expect(body.userToken).toBeUndefined();

    tick();
  }));


  it('should send the message text in the request body', fakeAsync(() => {
    fetchSpy.and.returnValue(mockStream([]));

    service.sendMessage('bonjour').subscribe();
    const body = JSON.parse(fetchSpy.calls.mostRecent().args[1].body);
    expect(body.message).toBe('bonjour');

    tick();
  }));
});
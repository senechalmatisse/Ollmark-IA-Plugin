import { TestBed } from '@angular/core/testing';
import { ConversationStateService } from './conversationState.service';
import { Message } from '../../../core/models/message.model';

/** Unit tests for signal-based conversation state container. */
describe('ConversationStateService', () => {
  let service: ConversationStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConversationStateService);
  });

  /** Verifies message append behavior. */
  it('should add a message', () => {
    const msg: Message = { id: '1', sender: 'user', content: 'Hi', timestamp: new Date() };
    service.addMessage(msg);
    expect(service.messages().length).toBe(1);
    expect(service.messages()[0]).toEqual(msg);
  });

  /** Verifies chunk concatenation on the last AI message. */
  it('should update the last AI message content', () => {
    service.addMessage({ id: '1', sender: 'user', content: 'Hi', timestamp: new Date() });
    service.addMessage({ id: '2', sender: 'ai', content: 'Hello', timestamp: new Date() });

    service.updateLastAiMessage(' world');
    
    const messages = service.messages();
    expect(messages[1].content).toBe('Hello world');
  });

  /** Ensures user messages are not altered by AI chunk updates. */
  it('should not update if the last message is not from AI', () => {
    service.addMessage({ id: '1', sender: 'user', content: 'Hi', timestamp: new Date() });
    service.updateLastAiMessage('test');
    expect(service.messages()[0].content).toBe('Hi');
  });

  /** Verifies streaming signal mutation. */
  it('should update streaming status', () => {
    service.setStreaming(true);
    expect(service.isStreaming()).toBeTrue();
  });
});

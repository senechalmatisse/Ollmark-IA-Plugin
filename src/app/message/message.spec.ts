import { AIMessage } from './ai-message';
import { UserMessage } from './user-message';

describe('UserMessage', () => {
  it('should create with type "user"', () => {
    const msg = new UserMessage('1', 'Hello!');
    expect(msg.id).toBe('1');
    expect(msg.content).toBe('Hello!');
    expect(msg.type).toBe('user');
    expect(msg.timestamp).toBeInstanceOf(Date);
  });
});

describe('AIMessage', () => {
  it('should create with type "ai"', () => {
    const msg = new AIMessage('1', 'How can I help you?');
    expect(msg.id).toBe('1');
    expect(msg.content).toBe('How can I help you?');
    expect(msg.type).toBe('ai');
    expect(msg.timestamp).toBeInstanceOf(Date);
  });
});

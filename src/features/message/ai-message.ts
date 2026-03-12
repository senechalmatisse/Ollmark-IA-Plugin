import { Message } from './message';

/** Represents a message sent by the AI in a conversation. */
export class AIMessage extends Message {
  /**
   * @param id - Unique identifier for the message.
   * @param content - The text content of the AI's response.
   */
  constructor(id: string, content: string) {
    super(id, content, 'ai');
  }
}

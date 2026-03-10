import { Message } from './message';

/** Represents a message sent by the user in a conversation. */
export class UserMessage extends Message {
  /**
   * @param id - Unique identifier for the message.
   * @param content - The text content of the user's message.
   */
  constructor(id: string, content: string) {
    super(id, content, 'user');
  }
}


/**
 * Represents a single message within the chat system.
 * Contains information about the sender, content, and state of the message.
 */
export interface Message {
  /** Unique identifier for the message. */
  id: string;
  /** The origin of the message: 'user' for human input, 'ai' for system generated response. */
  sender: 'user' | 'ai';
  /** The textual content of the message. */
  content: string;
  /** The date and time when the message was sent. */
  timestamp: Date;

}

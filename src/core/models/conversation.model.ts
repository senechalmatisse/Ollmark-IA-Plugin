import { Message } from './message.model';

/**
 * Represents a complete chat conversation.
 * Groups together messages and tracks metadata like creation date.
 */
export interface Conversation {
  /** Unique identifier for the conversation. */
  id: string;
  /** List of messages associated with this conversation history. */
  messages: Message[];
  /** The date and time when the conversation was first created. */
  createdAt: Date;
}

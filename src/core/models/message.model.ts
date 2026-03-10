import { PreviewState } from './preview-state.enum';

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
  /** 
   * (Optional) Indicates if the message contains generated code.
   * Useful for triggering code-specific UI components.
   */
  hasGeneratedCode?: boolean;
  /**
   * (Optional) The current state of the preview zone associated with this message.
   * Managed via the {@link PreviewState} enum.
   */
  previewState?: PreviewState;
}

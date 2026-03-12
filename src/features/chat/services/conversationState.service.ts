import { Injectable, signal } from '@angular/core';
import { Message } from '../../../core/models/message.model';

/**
 * Stores chat conversation state as Angular signals.
 * Centralizes message history, streaming flag, and error side-effects.
 */
@Injectable({ providedIn: 'root' })
export class ConversationStateService {
  /** Indicates whether assistant response is currently streaming. */
  public isStreaming = signal<boolean>(false);

  /** Internal mutable message signal. */
  private messagesSignal = signal<Message[]>([]);
  /** Readonly message stream exposed to consumers. */
  public messages = this.messagesSignal.asReadonly();

  /** Appends one message to the conversation history. */
  addMessage(message: Message): void {
    this.messagesSignal.update(msgs => [...msgs, message]);
  }

  /** Concatenates a text chunk to the current last AI message. */
  updateLastAiMessage(chunk: string): void {
    this.messagesSignal.update(messages => {
      if (messages.length === 0) return messages;
      const lastIdx = messages.length - 1;
      const last = messages[lastIdx];
      if (last.sender !== 'ai') return messages;
      const updated = [...messages];
      updated[lastIdx] = { ...last, content: last.content + chunk };
      return updated;
    });
  }

  /** Updates streaming flag. */
  setStreaming(value: boolean): void {
    this.isStreaming.set(value);
  }

  /** Clears conversation history in memory. */
  clearMessages(): void {
    this.messagesSignal.set([]);
  }

  /** Handles stream errors and ensures streaming flag is reset. */
  handleError(error: unknown): void {
    console.error('[State] Erreur flux:', error);
    this.setStreaming(false);
  }
}

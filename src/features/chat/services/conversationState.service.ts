import { Injectable, signal } from '@angular/core';
import { Message } from '../../../core/models/message.model';
@Injectable({ providedIn: 'root' })
export class ConversationStateService {
  public isStreaming = signal<boolean>(false);

  private messagesSignal = signal<Message[]>([]);
  public messages = this.messagesSignal.asReadonly();

  addMessage(message: Message): void {
    this.messagesSignal.update(msgs => [...msgs, message]);
  }

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

  setStreaming(value: boolean): void {
    this.isStreaming.set(value);
  }

  clearMessages(): void {
    this.messagesSignal.set([]);
  }

  handleError(error: unknown): void {
    console.error('[State] Erreur flux:', error);
    this.setStreaming(false);
  }
}

import { Injectable, inject, computed } from '@angular/core';
import { IMessage } from '../../message/message';
import { Message } from '../../../core/models/message.model';
import { ConversationStateService } from './conversationState.service';
import { ChatStreamService } from './chatStream.service';
import { IConversationService } from './IConversation.service';
import { IApiService } from './IApi.service';

@Injectable({ providedIn: 'root' })
/**
 * High-level conversation facade used by UI components.
 * Manages conversation bootstrap, outgoing messages, and reset behavior.
 */
export class ConversationService implements IConversationService {
  private apiService = inject(IApiService);
  private stateService = inject(ConversationStateService);
  private streamService = inject(ChatStreamService);

  /** UI-facing messages mapped to the `IMessage` contract. */
  public messages = computed<readonly IMessage[]>(() =>
    this.stateService.messages().map(msg => ({
      id: msg.id,
      content: msg.content,
      type: msg.sender as 'user' | 'ai',
      timestamp: msg.timestamp,
    }))
  );

  /** Streaming state exposed to input/components. */
  public isStreaming = this.stateService.isStreaming;

  /** Current backend conversation identifier. */
  private conversationId = '';

  constructor() {
    this.initializeConversation();
  }

  /** Pushes user message + assistant placeholder, then starts streaming. */
  sendMessage(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    const aiPlaceholder: Message = {
      id: (Date.now() + 1).toString(),
      sender: 'ai',
      content: '',
      timestamp: new Date(),
    };

    this.stateService.addMessage(userMsg);
    this.stateService.addMessage(aiPlaceholder);
    this.streamService.streamResponse(trimmed, this.conversationId);
  }

  /** Clears local history and creates a new backend conversation. */
  resetConversation(): void {
    this.stateService.clearMessages();
    this.initializeConversation();
  }

  /** Initializes conversation ID at startup and after reset. */
  private initializeConversation(): void {
    this.apiService.initConversation()
      .then(id => { this.conversationId = id; })
      .catch(err => console.error('[Conversation] Init échouée :', err));
  }
}

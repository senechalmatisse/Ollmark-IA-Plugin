import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

import { Message } from '../../../../core/models/message.model';
import { ChatInput } from '../chat-input';
import { ChatHistoryComponent } from '../chat-history/chat-history.component';
import { IConversationService } from '../../services/IConversation.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, ChatHistoryComponent, ChatInput],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent {
  private readonly conversationService = inject(IConversationService);

  readonly messages = computed<readonly Message[]>(() =>
    this.conversationService.messages().map((message) => ({
      id: message.id,
      sender: message.type,
      content: message.content,
      timestamp: message.timestamp,
    })),
  );

  readonly isLoadingHistory = signal(false);

  resetConversation(): void {
    this.conversationService.resetConversation();
  }
}

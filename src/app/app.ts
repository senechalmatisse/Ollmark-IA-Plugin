import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule, AsyncPipe } from '@angular/common';

import { ButtonComponent } from '../shared/components/button/button.component';
import { MessageComponent, Message } from '../features/message/message';
import { AIMessage } from '../features/message/ai-message';
import { UserMessage } from '../features/message/user-message';

// Services et composants supplémentaires
import { Penpot } from '../core/services/penpot/penpot';
import { ChatInput } from '../features/chat/components/chat-input';
import { IConversationService } from '../features/chat/services/IConversation.service';
import { ConversationService } from '../features/chat/services/conversation.service';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    ButtonComponent,
    MessageComponent,
    ChatInput,
    CommonModule,
    AsyncPipe
  ],
  providers: [
    { provide: IConversationService, useExisting: ConversationService }
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {
  public readonly title = 'Ollmark-plugin-ia';
  
  // Injection des services
  public penpot = inject(Penpot);
  public conversationService = inject(IConversationService);
  public messages = this.conversationService.messages;
  public messagesTest: Message[] = [
    new AIMessage('1', 'Bonjour ! Comment puis-je vous aider ?'),
    new UserMessage('2', "Qu'est-ce que TypeScript ?"),
    new AIMessage('3', 'TypeScript est un sur-ensemble typé de JavaScript.'),
  ];
}
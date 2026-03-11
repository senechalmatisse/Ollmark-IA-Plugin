import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

// Tes imports d'origine
import { ButtonComponent } from '../shared/components/button/button.component';
import { MessageComponent, Message } from './message/message';
import { AIMessage } from './message/ai-message';
import { UserMessage } from './message/user-message';

// Les imports nécessaires pour ton nouveau travail
import { ChatInput } from '../features/chat/components/chat-input';
import { ChatService } from '../features/chat/services/chat.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, 
    ButtonComponent, 
    MessageComponent, 
    ChatInput, 
    CommonModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  public readonly title: string = 'Ollmark-plugin-ia';

  public chatService = inject(ChatService);

  messages: Message[] = [
    new AIMessage('1', 'Bonjour ! Comment puis-je vous aider ?'),
    new UserMessage('2', "Qu'est-ce que TypeScript ?"),
    new AIMessage('3', 'TypeScript est un sur-ensemble typé de JavaScript.'),
  ];
}
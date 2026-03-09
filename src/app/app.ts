import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonComponent } from '../shared/components/button/button.component';
import { MessageComponent, Message } from './message/message';
import { AIMessage } from './message/ai-message';
import { UserMessage } from './message/user-message';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ButtonComponent,MessageComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  public readonly title = 'Ollmark-plugin-ia';

  messages: Message[] = [
    new AIMessage('1', 'Bonjour ! Comment puis-je vous aider ?'),
    new UserMessage('2', "Qu'est-ce que TypeScript ?"),
    new AIMessage('3', 'TypeScript est un sur-ensemble typé de JavaScript.'),
  ];
}

import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { ButtonComponent } from '../shared/components/button/button.component';
import { MessageComponent, Message } from './message/message';
import { AIMessage } from './message/ai-message';
import { UserMessage } from './message/user-message';
import { Penpot } from './core/services/penpot/penpot';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ButtonComponent, MessageComponent, AsyncPipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  public readonly title:string = 'Ollmark-plugin-ia';
  public penpot = inject(Penpot);

  messages: Message[] = [
    new AIMessage('1', 'Bonjour ! Comment puis-je vous aider ?'),
    new UserMessage('2', "Qu'est-ce que TypeScript ?"),
    new AIMessage('3', 'TypeScript est un sur-ensemble typé de JavaScript.'),
  ];
}

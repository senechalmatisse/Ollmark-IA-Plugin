import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';

import { Penpot } from '../core/services/penpot/penpot';
import { ChatComponent } from '../features/chat/components/chat/chat.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AsyncPipe, ChatComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly penpot = inject(Penpot);
}

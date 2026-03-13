import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';

import { Message } from '../../../../core/models/message.model';
import { MessageBubbleComponent } from '../message-bubble/message-bubble.component';

@Component({
  selector: 'app-chat-history',
  standalone: true,
  imports: [CommonModule, MessageBubbleComponent],
  templateUrl: './chat-history.component.html',
  styleUrl: './chat-history.component.css',
})
export class ChatHistoryComponent implements AfterViewChecked {
  @Input({ required: true }) messages: readonly Message[] = [];

  @ViewChild('historyContainer')
  private historyContainer?: ElementRef<HTMLDivElement>;

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    const element = this.historyContainer?.nativeElement;

    if (!element) {
      return;
    }

    element.scrollTop = element.scrollHeight;
  }
}

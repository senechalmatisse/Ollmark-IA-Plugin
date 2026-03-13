import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { Message } from '../../../../core/models/message.model';
import { TimestampFormatPipe } from '../../../../shared/pipes/timestamp-format.pipe';

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  imports: [CommonModule, TimestampFormatPipe],
  templateUrl: './message-bubble.component.html',
  styleUrl: './message-bubble.component.css',
})
export class MessageBubbleComponent {
  @Input({ required: true }) message!: Message;

  get isUser(): boolean {
    return this.message.sender === 'user';
  }
}

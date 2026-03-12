import { Component, signal, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IConversationService } from '../services/IConversation.service';


@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-input.html',
  styleUrls: ['./chat-input.css']
})
export class ChatInput {
  private conversationService = inject(IConversationService);

  currentValue = signal('');
  isFocused    = signal(false);

  // isLoading est dérivé directement du service — plus de signal local dupliqué
  isLoading = this.conversationService.isStreaming;

  @ViewChild('textarea') textarea!: ElementRef<HTMLTextAreaElement>;

  onSend(): void {
    const message = this.currentValue().trim();
    if (!message || this.isLoading()) return;

    this.conversationService.sendMessage(message);
    this.resetInput();
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }

  autoResize(event: Event): void {
    const element = event.target as HTMLTextAreaElement;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }

  private resetInput(): void {
    this.currentValue.set('');

    if (this.textarea) {
      this.textarea.nativeElement.style.height = 'auto';
    }
  }
}

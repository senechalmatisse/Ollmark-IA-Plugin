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
/**
 * Input component for composing and submitting chat messages.
 * Handles send behavior, keyboard shortcuts, and textarea resizing.
 */
export class ChatInput {
  private conversationService = inject(IConversationService);

  /** Current textarea content. */
  currentValue = signal('');
  /** Focus state used by the template for styling. */
  isFocused    = signal(false);

  /** Loading state mirrored from the conversation service streaming signal. */
  isLoading = this.conversationService.isStreaming;

  /** Reference to the textarea element for dynamic height reset. */
  @ViewChild('textarea') textarea!: ElementRef<HTMLTextAreaElement>;

  /** Sends a message if input is non-empty and no stream is currently active. */
  onSend(): void {
    const message = this.currentValue().trim();
    if (!message || this.isLoading()) return;

    this.conversationService.sendMessage(message);
    this.resetInput();
  }

  /** Sends on `Enter` and keeps line breaks on `Shift+Enter`. */
  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }

  /** Auto-resizes the textarea height to fit its content. */
  autoResize(event: Event): void {
    const element = event.target as HTMLTextAreaElement;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }

  /** Resets input value and textarea height after a successful send. */
  private resetInput(): void {
    this.currentValue.set('');

    if (this.textarea) {
      this.textarea.nativeElement.style.height = 'auto';
    }
  }
}

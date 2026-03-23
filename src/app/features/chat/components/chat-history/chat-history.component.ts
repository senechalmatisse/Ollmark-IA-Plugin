import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { ChatMessage } from '../../../../core/models';
import { BubbleMessageComponent } from '../bubble-message/bubble-message.component';

@Component({
  selector: 'app-chat-history',
  standalone: true,
  imports: [BubbleMessageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat-history.component.html',
  styleUrls: ['./chat-history.component.scss'],
})
export class ChatHistoryComponent implements OnChanges {
  @Input({ required: true }) messages: ChatMessage[] = [];
  @Input() isAiLoading = false;
  @Output() previewAccepted = new EventEmitter<{ bufferPageId: string; code: string }>();
  @Output() previewRejected = new EventEmitter<string>();
  @ViewChild('scrollContainer') private readonly _scrollContainer!: ElementRef<HTMLElement>;

  private _previousMessageCount = 0;

  protected get hasMessages(): boolean {
    return this.messages.length > 0;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['messages']) {
      const newCount = this.messages.length;
      if (newCount > this._previousMessageCount) {
        this._previousMessageCount = newCount;
        setTimeout(() => this._scrollToBottomIfNearBottom(), 50);
      }
    }
  }

  private _scrollToBottomIfNearBottom(): void {
    const el = this._scrollContainer?.nativeElement;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }
}

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MessageComponent } from '../message/message.component';
import { PreviewCardComponent } from '../preview-card/preview-card.component';

@Component({
  selector: 'app-bubble-message',
  standalone: true,
  imports: [PreviewCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bubble-message.component.html',
  styleUrls: ['./bubble-message.component.scss'],
})
export class BubbleMessageComponent extends MessageComponent {
  @Input() isAiLoading = false;

  @Output() previewAccepted = new EventEmitter<{ bufferPageId: string; code: string }>();
  @Output() previewRejected = new EventEmitter<string>();

  get isPreviewMessage(): boolean {
    return !!this.message.bufferPageId && this.message.previewStatus !== undefined;
  }

  get hasPreviewImage(): boolean {
    return !!this.message.previewPngUrl;
  }

  onPreviewAccepted(): void {
    if (this.message.bufferPageId) {
      this.previewAccepted.emit({
        bufferPageId: this.message.bufferPageId,
        code: this.message.previewCode ?? '',
      });
    }
  }

  onPreviewRejected(): void {
    if (this.message.bufferPageId) {
      this.previewRejected.emit(this.message.bufferPageId);
    }
  }
}

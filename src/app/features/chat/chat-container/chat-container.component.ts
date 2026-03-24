import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ChatFacadeService } from '../../../core/services';
import { ChatHistoryComponent, ChatInputComponent } from '../components';
import { GenericButtonComponent } from '../../../shared/components';

@Component({
  selector: 'app-chat-container',
  standalone: true,
  imports: [ChatHistoryComponent, ChatInputComponent, GenericButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat-container.component.html',
  styleUrls: ['./chat-container.component.scss'],
})
export class ChatContainerComponent {
  protected readonly facade = inject(ChatFacadeService);
  protected onMessageSent(text: string): void {
    this.facade.sendMessage(text);
  }
  protected onConversationCleared(): void {
    this.facade.resetConversation();
  }

  protected onPreviewAccepted(event: { bufferPageId: string; code: string }): void {
    this.facade.acceptPreview(event.bufferPageId, event.code);
  }

  protected onPreviewRejected(bufferPageId: string): void {
    this.facade.rejectPreview(bufferPageId);
  }
}

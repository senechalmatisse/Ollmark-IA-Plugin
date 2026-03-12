import { Signal } from '@angular/core';
import { Message } from '../../message/message';

export abstract class IConversationService {
    abstract messages: Signal<readonly Message[]>;
    abstract isStreaming: Signal<boolean>;
    abstract sendMessage(text: string): void;
    abstract resetConversation(): void;
  }

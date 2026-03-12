import { Signal } from '@angular/core';
import { Message } from '../../message/message';

/** UI-facing contract for conversation state and actions. */
export abstract class IConversationService {
    /** Readonly list of display-ready chat messages. */
    abstract messages: Signal<readonly Message[]>;
    /** Indicates whether a response stream is currently active. */
    abstract isStreaming: Signal<boolean>;
    /** Sends a user message. */
    abstract sendMessage(text: string): void;
    /** Resets local conversation state and starts a new session. */
    abstract resetConversation(): void;
  }

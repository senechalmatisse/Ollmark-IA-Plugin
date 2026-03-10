import { Component, input } from '@angular/core';

/** Represents the type of message in a conversation. */
export type MessageType = 'user' | 'ai';

/** Defines the contract for all chat messages. */
export interface IMessage {
  /** Unique identifier for the message. */
  id: string;
  /** The text content of the message. */
  content: string;
  /** The type of the message. */
  type: MessageType;
  /** The date and time the message was created. */
  timestamp: Date;
}

/**
 * Abstract base class for all chat messages.
 * Use {@link AIMessage} or {@link UserMessage} instead of instantiating directly.
 */
export abstract class Message implements IMessage {
  /** The date and time the message was created. */
  readonly timestamp = new Date();

  /**
   * @param id - Unique identifier for the message.
   * @param content - The text content of the message.
   * @param type - The type of the message (`'user'` or `'ai'`).
   */
  constructor(
    public readonly id: string,
    public readonly content: string,
    public readonly type: MessageType,
  ) {}
}

/** Displays a single chat message bubble, aligned by role. */
@Component({
  selector: 'app-message',
  templateUrl: './message.html',
  styleUrl: './message.css',
})
export class MessageComponent {
  /** The message data to display. */
  message = input.required<IMessage>();

  /** Optional icon URL or path rendered alongside the message bubble. */
  icon = input<string>();
}

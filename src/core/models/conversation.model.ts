import { Message } from './message.model';

export interface Conversation {
  id: string;
  messages: Message[];
  createdAt: Date;
}

import { RawChatEntry } from './../models/raw-message.model';
import { Message } from '../../../core/models/message.model';




/**
 * Pure mapping layer — no side-effects, no DI, fully unit-testable.
 *
 * Core responsibility:
 *   One RawChatEntry (user prompt + assistant reply) → Message[]
 *
 * Mapping rules:
 *   content_user      → sender: 'user'
 *   content_assistant → sender: 'ai'
 *
 * A null slot is simply skipped — never emit an empty message.
 */
export class ChatMessageMapper {

   /**
   * Converts a single entry into an ordered [user, ai] message pair.
   * Null slots are filtered — partial entries are handled gracefully.
   */
    static toMessages(entry: RawChatEntry): Message[] {
        const timestamp = new Date(entry.created_at);
        const messages: Message[] = [];
        if (entry.content_user) {
            messages.push({
                id: `${entry.id}_user`,
                sender: 'user',
                content: entry.content_user,
                timestamp,
            });
        }
        if (entry.content_ai) {
            messages.push({
                id: `${entry.id}_ai`,
                sender: 'ai',
                content: entry.content_ai,
                timestamp,
            });
    }
        return messages;
    }
     /**
   * Flattens an array of entries into a chronological message list.
   *
   * Input : [entry1, entry2, ...]
   * Output: [user_1, ai_1, user_2, ai_2, ...]
   */

    static toMessageList(entries: RawChatEntry[]): Message[]{
        return entries.flatMap(ChatMessageMapper.toMessages);
    }
  

}
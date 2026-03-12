import { Observable } from 'rxjs';

/**
 * Contrat pour les appels API de chat.
 * Permet de découpler la logique de streaming du transport (Fetch/SSE).
 */
export abstract class IApiService {
  /**
   * Sends a chat message and returns a stream of assistant chunks.
   * @param content User message content.
   * @param conversationId Conversation identifier.
   * @param userToken Optional token to forward to backend.
   */
  abstract sendMessage(content: string, conversationId: string, userToken?: string): Observable<string>;
  /** Initializes and returns a new conversation identifier. */
  abstract initConversation(): Promise<string>;
}

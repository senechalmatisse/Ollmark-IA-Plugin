import { Observable } from 'rxjs';

/**
 * Contrat pour les appels API de chat.
 * Permet de découpler la logique de streaming du transport (Fetch/SSE).
 */
export abstract class IApiService {
  /** Envoie un message et retourne un flux de chunks (string) */
  abstract sendMessage(content: string, conversationId: string, userToken?: string): Observable<string>;
  /** Initialise une nouvelle session de conversation */
  abstract initConversation(): Promise<string>;
}
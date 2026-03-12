import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError } from 'rxjs/internal/operators/catchError';
import { map } from 'rxjs/internal/operators/map';
import { Observable, throwError } from 'rxjs';
import { ChatMessageMapper } from '../mappers/mapper';
import { RawChatEntry, ChatHistoryError } from '../models/raw-message.model';
import { Message } from '../../../core/models/message.model';
import { environment } from '../../../environments/environment';
export interface ChatError {
  status: number;
  message: string;
}


@Injectable({
  providedIn: 'root',
})
export class Service {
  private http = inject(HttpClient);

  /**
   * Base URL of the Spring Boot backend.
   * Override via environment files in real projects:
   *   `private readonly baseUrl = environment.apiUrl`
   */
  private readonly baseUrl = environment.apiURL;

  /**
   * Fetches the **single entry** for a given conversation ID
   * and returns it as an ordered [user, ai] Message pair.
   *
   * GET /api/chat-memory/:conversationId
   */
  getConversation(conversationID: string) : Observable<Message[]>{
    return this.http.get<RawChatEntry>(`${this.baseUrl}/conversation/${conversationID}`)
      .pipe(
        map(ChatMessageMapper.toMessages),
        catchError(this.handleError),
      );
  }

  /**
   * Fetches the **N last messages** of a conversation.
   * 
   * GET /api/conversations/:conversationId/messages?limit=N
   * @param conversationId -- UUID of the conversation
   * @param limit -- Number of messages to fetch (default: 20)
   */
  getHistory(conversationId:string, limit = 20): Observable<Message[]>{
    const params = new HttpParams().set('limit',limit );
    return this.http.get<RawChatEntry[]>(`${this.baseUrl}/conversation/${conversationId}/last`, { params })
      .pipe(
        map(ChatMessageMapper.toMessageList),
        catchError(this.handleError),
      );
  }

// Error Handling
       private handleError(error: HttpErrorResponse): Observable<never> {
    const chatError: ChatHistoryError =
      error.status === 0
        ? { status: 0, message: 'Network error: unable to reach the server.' }
        : {
            status: error.status,
            message: error.error?.message ?? `Server error ${error.status}: ${error.statusText}`,
          };

    console.error('[ChatHistoryService]', chatError);
    return throwError(() => chatError);
  }
  }

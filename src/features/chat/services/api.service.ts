import { Injectable, inject, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IApiService } from './IApi.service';


@Injectable({ providedIn: 'root' })
export class ApiService extends IApiService {
  private readonly API_BASE = environment.apiUrl;
  private ngZone = inject(NgZone);

  async initConversation(): Promise<string> {
    const res = await fetch(`${this.API_BASE}/chat/new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!res.ok) throw new Error(`Init failed: HTTP ${res.status}`);
    const data = await res.json();
    return data?.conversationId ?? '';
  }

  sendMessage(content: string, conversationId: string, userToken?: string): Observable<string> {
    return new Observable<string>(observer => {
      fetch(`${this.API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: content,
          ...(userToken ? { userToken } : {})
        })
      })
        .then(async (response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const reader = response.body?.getReader();
          if (!reader) throw new Error('ReadableStream non supporté');
          const decoder = new TextDecoder();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const raw = decoder.decode(value, { stream: true });
              for (const line of raw.split('\n')) {
                if (!line.startsWith('data:')) continue;
                const chunk = line.replace('data:', '').trim();
                if (!chunk || chunk === '[DONE]') continue;
                this.ngZone.run(() => observer.next(chunk));
              }
            }
          } catch (e) {
            this.ngZone.run(() => observer.error(e));
          } finally {
            reader.releaseLock();
            this.ngZone.run(() => observer.complete());
          }
        })
        .catch(err => this.ngZone.run(() => observer.error(err)));
    });
  }
}
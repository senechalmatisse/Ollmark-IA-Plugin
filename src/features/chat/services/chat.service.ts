import { Injectable, signal, inject, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Message } from '../../message/message';
import { AIMessage } from '../../message/ai-message';
import { UserMessage } from '../../message/user-message';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly API_BASE = environment.apiUrl;
  private ngZone = inject(NgZone);

  messages = signal<Message[]>([]);
  conversationId = signal<string>('');

  constructor() {
    this.initConversation();
  }

  private initConversation(): void {
    fetch(`${this.API_BASE}/chat/new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
      .then(res => {
        if (!res.ok) throw new Error(`Init failed: HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data?.conversationId) {
          this.ngZone.run(() => this.conversationId.set(data.conversationId));
        }
      })
      .catch(err => console.error('Erreur init conversation :', err));
  }

  sendMessage(text: string, userToken?: string): Observable<string> {
    const userMsg = new UserMessage(Date.now().toString(), text);
    const aiPlaceholder = new AIMessage((Date.now() + 1).toString(), '');

    this.messages.update(msgs => [...msgs, userMsg, aiPlaceholder]);

    return new Observable<string>(observer => {
      fetch(`${this.API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: this.conversationId(),
          message: text,
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

              const chunk = decoder.decode(value, { stream: true });

              for (const line of chunk.split('\n')) {
                if (!line.startsWith('data:')) continue;

                const content = line.replace('data:', '').trim();
                if (content === '[DONE]' || !content) continue;

                this.ngZone.run(() => {
                  this.appendContent(content);
                  observer.next(content);
                });
              }
            }
          } catch (e) {
            this.ngZone.run(() => observer.error(e));
          } finally {
            this.ngZone.run(() => observer.complete());
            reader.releaseLock();
          }
        })
        .catch(err => this.ngZone.run(() => observer.error(err)));
    });
  }

  private appendContent(content: string): void {
    this.messages.update(msgs => {
      const updated = [...msgs];
      const last = updated[updated.length - 1];
      if (last instanceof AIMessage) {
        // @ts-expect-error - On force la mise à jour du contenu pour le stream
        last.content += content;
      }
      return updated;
    });
  }
}
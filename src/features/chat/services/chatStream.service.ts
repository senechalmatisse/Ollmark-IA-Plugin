import { Injectable, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { ConversationStateService } from './conversationState.service';
import { ISseChunkInterpreter, SseInterpretation } from './interpreters/ISseChunkInterpreter';
import { ActionSignalInterpreter } from './interpreters/actionSignalInterpreter';
import { TextChunkInterpreter } from './interpreters/textChunkInterpreter';
import { IApiService } from './IApi.service';

@Injectable({ providedIn: 'root' })
export class ChatStreamService {
  private apiService = inject(IApiService);
  private stateService = inject(ConversationStateService);

  // Ordre important : ActionSignal avant Text (Text est le fallback)
  private readonly interpreters: ISseChunkInterpreter[] = [
    new ActionSignalInterpreter(),
    new TextChunkInterpreter(),
  ];

  public streamResponse(content: string, conversationId: string, userToken?: string): void {
    this.stateService.setStreaming(true);

    this.apiService
      .sendMessage(content, conversationId, userToken)
      .pipe(finalize(() => this.stateService.setStreaming(false)))
      .subscribe({
        next: (chunk) => this.processChunk(chunk),
        error: (err) => this.stateService.handleError(err),
      });
  }

  private processChunk(chunk: string): void {
    for (const interpreter of this.interpreters) {
      const interpretation = interpreter.interpret(chunk);
      if (interpretation !== null) {
        this.dispatch(interpretation);
        return;
      }
    }
  }

  private dispatch(interpretation: SseInterpretation): void {
    switch (interpretation.type) {
      case 'text':
        // On vérifie que le payload est bien une string avant de l'envoyer au state
        if (typeof interpretation.payload === 'string') {
          this.stateService.updateLastAiMessage(interpretation.payload);
        }
        break;
      case 'error':
        this.stateService.handleError(interpretation.payload);
        break;
      case 'actionPerformed':
        console.log('[ChatStream] Signal Penpot : action effectuée');
        break;
    }
  }
}
import { Injectable, inject } from '@angular/core';
import { finalize } from 'rxjs';

import { ConversationStateService } from './conversationState.service';
import { ISseChunkInterpreter, SseInterpretation } from './interpreters/ISseChunkInterpreter';
import { ActionSignalInterpreter } from './interpreters/actionSignalInterpreter';
import { TextChunkInterpreter } from './interpreters/textChunkInterpreter';
import { IApiService } from './IApi.service';

@Injectable({ providedIn: 'root' })
/**
 * Orchestrates streaming lifecycle:
 * - opens API stream
 * - interprets each chunk
 * - updates conversation state
 */
export class ChatStreamService {
  private apiService = inject(IApiService);
  private stateService = inject(ConversationStateService);

  /** Interpreter order matters: action signals first, text fallback last. */
  private readonly interpreters: ISseChunkInterpreter[] = [
    new ActionSignalInterpreter(),
    new TextChunkInterpreter(),
  ];

  /**
   * Starts response streaming for a user message.
   * Streaming flag is set before subscribing and cleared on finalize.
   */
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

  /** Resolves a chunk using the first interpreter that can handle it. */
  private processChunk(chunk: string): void {
    for (const interpreter of this.interpreters) {
      const interpretation = interpreter.interpret(chunk);
      if (interpretation !== null) {
        this.dispatch(interpretation);
        return;
      }
    }
  }

  /** Dispatches interpreted events to the proper state side-effect. */
  private dispatch(interpretation: SseInterpretation): void {
    switch (interpretation.type) {
      case 'text':
        // Runtime guard for dynamic payload coming from interpreters.
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

import { ISseChunkInterpreter, SseInterpretation } from './ISseChunkInterpreter';

/**
 * Interprets backend control signals indicating that an external action
 * (for example in Penpot) has been completed.
 */
export class ActionSignalInterpreter implements ISseChunkInterpreter {
  /** Backend marker emitted when an action has been performed. */
  private readonly SIGNAL = '[ACTION_DONE]';

  /** Returns an `actionPerformed` interpretation when the signal is matched. */
  interpret(chunk: string): SseInterpretation | null {
    if (chunk.trim() === this.SIGNAL) {
      return {
        type: 'actionPerformed'
      };
    }

    return null;
  }
}

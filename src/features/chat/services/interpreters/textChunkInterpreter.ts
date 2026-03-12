import { ISseChunkInterpreter, SseInterpretation } from './ISseChunkInterpreter';

/**
 * Fallback interpreter that treats non-empty chunks as plain text.
 * This interpreter should stay last in the interpreter chain.
 */
export class TextChunkInterpreter implements ISseChunkInterpreter {
  /** Maps a chunk to a `text` interpretation when content is present. */
  interpret(chunk: string): SseInterpretation | null {
    if (!chunk) return null;

    return {
      type: 'text',
      payload: chunk
    };
  }
}

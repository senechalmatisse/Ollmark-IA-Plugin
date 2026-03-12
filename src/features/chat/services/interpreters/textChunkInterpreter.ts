import { ISseChunkInterpreter, SseInterpretation } from './ISseChunkInterpreter';

export class TextChunkInterpreter implements ISseChunkInterpreter {
  /**
   * Cette stratégie accepte n'importe quel chunk texte.
   * Elle doit être placée en dernière position dans la liste des interpréteurs.
   */
  interpret(chunk: string): SseInterpretation | null {
    if (!chunk) return null;

    return {
      type: 'text',
      payload: chunk
    };
  }
}
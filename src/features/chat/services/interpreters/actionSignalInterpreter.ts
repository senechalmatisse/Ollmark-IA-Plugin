import { ISseChunkInterpreter, SseInterpretation } from './ISseChunkInterpreter';

export class ActionSignalInterpreter implements ISseChunkInterpreter {
    //signal spécifique envoyé par le backend indiquant qu'une action Penpot a été exécutée
  private readonly SIGNAL = '[ACTION_DONE]';

  interpret(chunk: string): SseInterpretation | null {
    // Si le chunk contient exactement le signal
    if (chunk.trim() === this.SIGNAL) {
      return {
        type: 'actionPerformed'
      };
    }

    // Sinon, on retourne null pour que le service teste l'interpréteur suivant
    return null;
  }
}
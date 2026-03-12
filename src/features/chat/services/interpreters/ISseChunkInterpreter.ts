/**
 * Représente le résultat d'une interprétation d'un chunk SSE.
 */
export interface SseInterpretation {
    // 'text' pour le contenu de l'IA, 'actionPerformed' pour le signal Penpot, 'error' pour les soucis
    type: 'text' | 'actionPerformed' | 'error';
    // Le contenu brut ou les données extraites du chunk
    payload?: any;
  }
  
  /**
   * Interface Strategy pour l'interprétation des chunks SSE.
   * Chaque implémentation est responsable de détecter un format spécifique.
   */
  export interface ISseChunkInterpreter {
    /**
     * Analyse un chunk et retourne une interprétation s'il correspond à la stratégie.
     * @param chunk Le fragment de texte reçu du backend.
     * @returns SseInterpretation si détecté, sinon null pour passer à l'interpréteur suivant.
     */
    interpret(chunk: string): SseInterpretation | null;
  }
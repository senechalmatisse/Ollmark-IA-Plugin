/**
 * Requête envoyée par le backend vers la sandbox plugin.
 */
export interface PluginTaskRequest {
    id: string;
    task?: string;
    params: {
        code: string;
        [key: string]: unknown;
    };
}

/**
 * Résultat brut de l'exécution locale du code.
 */
export interface ExecutionResult {
    success: boolean;
    data?: unknown;
    error?: string;
}

/**
 * Réponse renvoyée au backend après exécution.
 */
export interface PluginTaskResponse {
    id: string;
    success: boolean;
    data?: unknown;
    error?: string;
}

/**
 * Catégories d'erreur HTTP possibles pour les appels vers le backend.
 *
 * - `network`  : serveur injoignable, réseau coupé, CORS (status 0)
 * - `server`   : erreur interne côté backend (5xx)
 * - `client`   : requête invalide côté frontend (4xx)
 * - `timeout`  : délai d'attente dépassé (status 408 ou 504)
 * - `unknown`  : tout ce qui ne rentre pas dans les catégories précédentes
 */
export type ApiErrorType = 'network' | 'server' | 'client' | 'timeout' | 'unknown';

/**
 * Erreur HTTP enrichie exposant un type sémantique et un message utilisateur.
 *
 * Produite par `ChatApiService._handleError()` et consommée par
 * `ChatFacadeService._resolveErrorFeedback()` pour un traitement conditionnel
 * sans parsing de chaînes de caractères.
 */

export class ApiError extends Error {
    constructor(
        message: string,
        readonly type: ApiErrorType,
        readonly status?: number
    ){
        super(message);
        this.name = 'ApiError';
    }
}
/**
 * Messages utilisateur lisibles indexés par type d'erreur.
 * Centralisés ici pour modification sans toucher au service.
 */
export const API_ERROR_MESSAGES: Record<ApiErrorType, string> = {
    network: 'Impossible de joindre le serveur. Vérifiez votre connexion.',
    server: 'Le serveur a rencontré une erreur. Veuillez réessayer plus tard.',
    timeout: 'Le serveur a mis trop de temps à répondre. Veuillez réessayer.',
    client: 'Une erreur est survenue. Veuillez vérifier votre requête.',
    unknown: 'Une erreur inattendue est survenue. Veuillez réessayer.',
};
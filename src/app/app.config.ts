import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

/**
 * Configuration de l'application Angular (standalone API).
 *
 * Ce fichier centralise tous les providers racine de l'application.
 * Il est passé à `bootstrapApplication()` dans `main.ts` et constitue
 * l'équivalent standalone du `NgModule` racine traditionnel.
 *
 * ### Providers configurés
 *
 * #### `provideZoneChangeDetection`
 * Active la détection de changements basée sur Zone.js avec
 * `eventCoalescing: true`. Cette option regroupe plusieurs événements
 * déclenchés dans la même tâche micro-task en un seul cycle de détection,
 * réduisant le nombre de rendus inutiles (particulièrement bénéfique
 * dans une iframe où les événements postMessage peuvent être fréquents).
 *
 * #### `provideHttpClient`
 * Configure le client HTTP Angular avec `withInterceptorsFromDi()`,
 * ce qui permet d'enregistrer des intercepteurs HTTP via le système
 * d'injection de dépendances classique (`HTTP_INTERCEPTORS`).
 * Utilisé par {@link ChatApiService} pour toutes les requêtes vers Spring Boot.
 *
 * ### Surcharge d'environnement
 * Pour surcharger l'URL de l'API en production ou en test :
 * ```typescript
 * import { API_BASE_URL } from './core/tokens/api.tokens';
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     // ...providers existants...
 *     { provide: API_BASE_URL, useValue: 'https://ollmark.company.io' },
 *   ],
 * };
 * ```
 *
 * @public
 * @since 1.0.0
 * @see {@link API_BASE_URL} Token surchargeant l'URL de l'API REST.
 * @see {@link WEBSOCKET_URL} Token surchargeant l'URL WebSocket.
 * @see {@link PENPOT_ORIGIN} Token surchargeant l'origine postMessage.
 * @see {@link ChatApiService} Consommateur principal de `HttpClient`.
 */
export const appConfig: ApplicationConfig = {
    providers: [
        /**
         * Zone.js avec coalescence des événements.
         * Réduit les cycles de détection superflus dans l'iframe Penpot.
         */
        provideZoneChangeDetection({ eventCoalescing: true }),

        /**
         * Client HTTP avec support des intercepteurs DI.
         * Requis par ChatApiService pour les appels REST vers Spring Boot.
         */
        provideHttpClient(withInterceptorsFromDi()),

        // ── Surcharges d'environnement ───────────
        // { provide: API_BASE_URL, useValue: 'https://ollmark.company.io' },
        // { provide: WEBSOCKET_URL, useValue: 'wss://ollmark.company.io/plugin' },
        // { provide: PENPOT_ORIGIN, useValue: 'https://penpot.app' },
    ],
};
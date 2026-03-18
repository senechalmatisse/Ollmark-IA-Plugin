import { InjectionToken } from '@angular/core';

/**
 * Token Angular d'injection pour l'URL de base de l'API REST Spring Boot.
 * La valeur est fournie par app.config.ts depuis le fichier environment actif.
 *
 * @public
 * @since 1.0.0
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
    providedIn: 'root',
    factory: () => 'http://localhost:8080',
});

/**
 * Token Angular d'injection pour l'URL WebSocket vers le backend Spring Boot.
 * La valeur est fournie par app.config.ts depuis le fichier environment actif.
 *
 * @public
 * @since 1.0.0
 */
export const WEBSOCKET_URL = new InjectionToken<string>('WEBSOCKET_URL', {
    providedIn: 'root',
    factory: () => 'ws://localhost:8080/plugin',
});

/**
 * Token Angular d'injection pour l'origine cible des appels postMessage
 * vers le worker plugin.ts de Penpot.
 *
 * ### Stratégie de résolution
 * 1. ancestorOrigins[0]  — Chrome / Edge / Safari
 * 2. document.referrer   — Firefox
 * 3. Erreur explicite    — jamais de fallback vers '*'
 *
 * @throws {Error} Si l'origine parente ne peut être déterminée.
 * @public
 * @since 1.0.0
 */
export const PENPOT_ORIGIN = new InjectionToken<string>('PENPOT_ORIGIN', {
    providedIn: 'root',
    factory: (): string => {
        const fromAncestor = globalThis.location?.ancestorOrigins?.[0];
        if (fromAncestor) return fromAncestor;

        if (document.referrer) {
            try {
                return new URL(document.referrer).origin;
            } catch {
                // Ignore; fallthrough to error below
            }
        }

        throw new Error("Impossible de déterminer l'origine parente.");
    },
});
/// <reference types="vite/client" />
import { InjectionToken } from '@angular/core';

/**
 * Constante de build injectée par Vite via la clé `define` de `vite.config.ts`.
 *
 * Sa valeur est construite au moment du build à partir des variables
 * d'environnement `PENPOT_SERVER_ADDRESS` et `PENPOT_WEBSOCKET_PORT`.
 * Elle n'est **pas** préfixée `VITE_` et n'est donc jamais exposée à
 * `import.meta.env` - elle reste une constante de compilation uniquement.
 *
 * @internal
 * @see {@link WEBSOCKET_URL} Token Angular qui consomme cette constante.
 */
declare const PENPOT_WEBSOCKET_URL: string;

/**
 * Token Angular d'injection pour l'URL de base de l'API REST Spring Boot.
 *
 * La valeur est lue depuis `import.meta.env.VITE_API_BASE_URL`, variable
 * définie dans `.env` et exposée au code client par Vite (préfixe `VITE_`
 * obligatoire).
 *
 * ### Priorité de résolution
 * 1. `VITE_API_BASE_URL` définie dans `.env` (ou `.env.local`, `.env.[mode]`)
 * 2. Fallback `'http://localhost:8080'` si la variable est absente
 *    (tests unitaires, environnement sans fichier `.env`)
 *
 * ### Surcharge en production
 * ```typescript
 * // app.config.ts
 * providers: [
 *   { provide: API_BASE_URL, useValue: 'https://ollmark.company.io' }
 * ]
 * ```
 *
 * @example
 * ```typescript
 * @Injectable({ providedIn: 'root' })
 * export class ChatApiService {
 *   private readonly baseUrl = inject(API_BASE_URL);
 * }
 * ```
 *
 * @public
 * @since 1.0.0
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
    providedIn: 'root',
    factory: () =>
        (import.meta.env['VITE_API_BASE_URL'] as string | undefined) ?? 'http://localhost:8080',
});

/**
 * Token Angular d'injection pour l'URL WebSocket vers le backend Spring Boot.
 *
 * La valeur est résolue au **moment du build** par Vite (`define` dans
 * `vite.config.ts`) à partir des variables d'environnement non-`VITE_` :
 * - `PENPOT_SERVER_ADDRESS` - adresse réseau du serveur
 * - `PENPOT_WEBSOCKET_PORT` - port du endpoint WebSocket
 *
 * Ces variables ne sont pas exposées à `import.meta.env` (pas de préfixe
 * `VITE_`) ; elles sont uniquement disponibles dans `vite.config.ts` au
 * build et injectées via la constante de compilation {@link PENPOT_WEBSOCKET_URL}.
 *
 * ### Résolution à l'exécution
 * La factory vérifie la présence de `PENPOT_WEBSOCKET_URL` sur `globalThis`
 * via une clé string pour éviter un `ReferenceError` dans les environnements
 * de test où Vite ne remplace pas les constantes `define`.
 *
 * ### Priorité de résolution
 * 1. `PENPOT_WEBSOCKET_URL` injectée par Vite au build
 * 2. Fallback `'ws://localhost:8080/plugin'` en l'absence de la constante
 *
 * @example
 * ```typescript
 * @Injectable({ providedIn: 'root' })
 * export class WebSocketService {
 *   private readonly wsUrl = inject(WEBSOCKET_URL);
 * }
 * ```
 *
 * @public
 * @since 1.0.0
 * @see {@link PENPOT_WEBSOCKET_URL} Constante de build source de la valeur.
 */
export const WEBSOCKET_URL = new InjectionToken<string>('WEBSOCKET_URL', {
    providedIn: 'root',
    factory: () =>
        (globalThis as Record<string, unknown>)['PENPOT_WEBSOCKET_URL'] === undefined
            ? 'ws://localhost:8080/plugin'
            : PENPOT_WEBSOCKET_URL,
});

/**
 * Token Angular d'injection pour l'origine cible des appels `postMessage`
 * vers le worker `plugin.ts` de Penpot.
 *
 * Utiliser `'*'` comme origine dans `postMessage` est une faille de sécurité
 * documentée (XSS). Ce token résout l'origine réelle de la frame parente
 * à l'exécution sans jamais recourir au wildcard.
 *
 * ### Stratégie de résolution (par ordre de priorité)
 * 1. `globalThis.location.ancestorOrigins[0]` — API standard disponible sur
 *    Chrome, Edge et Safari ; retourne l'origine du parent immédiat de l'iframe.
 * 2. `new URL(document.referrer).origin` — fallback pour Firefox, qui ne
 *    supporte pas `ancestorOrigins` mais renseigne `document.referrer`.
 * 3. **Erreur explicite** si aucune source n'est disponible, forçant une
 *    configuration manuelle plutôt qu'une dégradation silencieuse vers `'*'`.
 *
 * ### Surcharge explicite (production, tests)
 * ```typescript
 * // app.config.ts
 * providers: [
 *   { provide: PENPOT_ORIGIN, useValue: 'https://penpot.app' }
 * ]
 * ```
 *
 * @example
 * ```typescript
 * @Injectable({ providedIn: 'root' })
 * export class PluginBridgeService {
 *   private readonly targetOrigin = inject(PENPOT_ORIGIN);
 *
 *   send(message: PluginMessage): void {
 *     window.parent.postMessage(message, this.targetOrigin);
 *   }
 * }
 * ```
 *
 * @throws {Error} Si l'origine parente ne peut être déterminée de façon sûre.
 *
 * @public
 * @since 1.0.0
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Location/ancestorOrigins ancestorOrigins MDN}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage postMessage MDN}
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
                // Ignore invalid URL errors; fallthrough to error below
            }
        }

        throw new Error("Impossible de déterminer l'origine parente.");
    },
});
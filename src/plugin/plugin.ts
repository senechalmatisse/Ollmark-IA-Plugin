/// <reference types="@penpot/plugin-types" />

import { WebSocketClient } from './websocket-client';

/**
 * Point d'entrée sandbox du plugin Penpot.
 *
 * Responsabilités :
 * - ouvrir l'UI du plugin
 * - démarrer la connexion WebSocket vers le backend
 * - fermer proprement la socket quand le plugin est fermé
 */

export const PLUGIN_NAME = 'OllMark';
export const WS_URL = 'ws://localhost:4401/plugin';

/**
 * Initialise la sandbox Penpot du plugin.
 *
 * Cette fonction est exportée pour faciliter les tests unitaires
 * du point d'entrée sans dépendre uniquement des effets de bord
 * au chargement du module.
 *
 * @param client Instance de WebSocketClient à utiliser
 */
export function bootstrapPlugin(client: Pick<WebSocketClient, 'connect' | 'disconnect'>): void {
    console.log('[Plugin] Starting OllMark sandbox');

    penpot.ui.open(PLUGIN_NAME, '/', {
        width: 500,
        height: 800,
    });

    client.connect();

    penpot.on('finish', () => {
        console.log('[Plugin] Finishing OllMark sandbox');
        client.disconnect();
    });
}

function hasPenpotRuntime(): boolean {
    return typeof (globalThis as typeof globalThis & { penpot?: unknown }).penpot !== 'undefined';
}

export function autoBootstrap(createClient: () => Pick<WebSocketClient, 'connect' | 'disconnect'>): void {
    if (hasPenpotRuntime()) {
        bootstrapPlugin(createClient());
    }
}

autoBootstrap(() => new WebSocketClient(WS_URL));

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

const PLUGIN_NAME = 'OllMark';
const WS_URL = 'ws://localhost:4401/plugin';

console.log('[Plugin] Starting OllMark sandbox');

penpot.ui.open(PLUGIN_NAME, '/', {
    width: 500,
    height: 800,
});

const client = new WebSocketClient(WS_URL);
client.connect();

penpot.on('finish', () => {
    console.log('[Plugin] Finishing OllMark sandbox');
    client.disconnect();
});

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
export const WS_URL = 'ws://10.130.163.57:50050/plugin';

/**
 * Retrieves the current file ID and sends it to the UI (Angular iframe).
 */
const sendFileId = () => {
    const currentFileId = penpot.currentFile ? penpot.currentFile.id : null;
    console.log('[Plugin] Sending fileId:', currentFileId);
    penpot.ui.sendMessage({
        type: 'fileId',
        fileId: currentFileId,
    });
};

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

    // Listen for the 'ready' handshake from the Angular UI
    penpot.ui.onMessage<{ type: string }>((msg) => {
        if (msg.type === 'ready') {
            console.log('[Plugin] UI ready, sending initial fileId');
            sendFileId();
        }
    });

    // Update the UI whenever the file or page changes
    penpot.on('filechange', () => {
        console.log('[Plugin] File changed, updating UI');
        sendFileId();
    });

    penpot.on('pagechange', () => {
        console.log('[Plugin] Page changed, updating UI');
        sendFileId();
    });

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

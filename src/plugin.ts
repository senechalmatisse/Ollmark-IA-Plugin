/// <reference types="@penpot/plugin-types" />

/**
 * Entry point for the Penpot plugin background script.
 * This script runs in the Penpot main thread and has access to the design API.
 */

// Open the plugin UI modal
penpot.ui.open("Ollmark AI Generation", "", {
  width: 600,
  height: 800,
});

/**
 * Retrieves the current file ID and sends it to the UI (Angular iframe).
 */
const sendFileId = () => {
  const currentFileId = penpot.currentFile ? penpot.currentFile.id : null;
  penpot.ui.sendMessage({
    type: 'fileId',
    fileId: currentFileId
  });
};

/**
 * Listen for messages from the UI (Angular).
 * Handles the 'ready' handshake and 'cancel' actions.
 */
penpot.ui.onMessage<any>((msg) => {
  if (msg.type === 'ready') {
    sendFileId();
  }
  if (msg.type === 'cancel') {
    penpot.closePlugin();
  }
});

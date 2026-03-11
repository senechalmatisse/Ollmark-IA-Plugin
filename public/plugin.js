"use strict";
(() => {
  // src/plugin.ts
  penpot.ui.open("Ollmark AI Generation", "", {
    width: 600,
    height: 800
  });
  var sendFileId = () => {
    const currentFileId = penpot.currentFile ? penpot.currentFile.id : null;
    penpot.ui.sendMessage({
      type: "fileId",
      fileId: currentFileId
    });
  };
  penpot.ui.onMessage((msg) => {
    if (msg.type === "ready") {
      sendFileId();
    }
    if (msg.type === "cancel") {
      penpot.closePlugin();
    }
  });
})();

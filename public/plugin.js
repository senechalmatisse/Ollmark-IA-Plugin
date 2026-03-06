"use strict";
(() => {
  // src/plugin.ts
  penpot.ui.open("OllMark Generation", "index.html", {
    width: 420,
    height: 550
  });
  function notifyUI(content) {
    const msg = { type: "notify", content };
    penpot.ui.sendMessage(msg);
  }
  function getCanvasParent() {
    const currentPage = penpot.currentPage;
    if (currentPage) return currentPage;
    const root = penpot.root;
    if (root && typeof root === "object" && "type" in root) {
      const type = root.type;
      if (type === "page" || type === "board") {
        return root;
      }
    }
    return null;
  }
  function getStartingPosition() {
    if (penpot.selection.length === 0) {
      const viewCenterX = penpot.viewport.center.x;
      const viewCenterY = penpot.viewport.center.y;
      return {
        x: viewCenterX - 100,
        y: viewCenterY - 200,
        targetBoard: null
      };
    }
    const selected = penpot.selection[0];
    const startX = selected.x + 30;
    let startY = selected.y + 30;
    let targetBoard = null;
    if (selected.type === "board") {
      targetBoard = selected;
      let maxBottom = startY;
      const children = "children" in targetBoard ? targetBoard.children : [];
      for (const child of children) {
        const childBottom = child.y + child.height;
        if (childBottom > maxBottom) {
          maxBottom = childBottom;
        }
      }
      if (maxBottom > startY) {
        startY = maxBottom + 40;
      }
    }
    return { x: startX, y: startY, targetBoard };
  }
  var globalCursorX = 0;
  var globalCursorY = 0;
  var globalTargetBoard = null;
  var isCursorInitialized = false;
  penpot.ui.onMessage(async (message) => {
    if (message.type === "close") {
      penpot.closePlugin();
      return;
    }
    if (message.type === "notify") {
      notifyUI(message.content);
      if (message.content === "G\xE9n\xE9ration de la s\xE9lection termin\xE9e avec succ\xE8s !") {
        penpot.ui.sendMessage({ type: "generation-success" });
        isCursorInitialized = false;
      }
      return;
    }
    const parent = getCanvasParent();
    if (!parent) {
      notifyUI("Impossible d\u2019ajouter des \xE9l\xE9ments : aucune page/contexte actif.");
      return;
    }
    if (message.type === "quick-import-direct") {
      const { data } = message;
      const startPos = getStartingPosition();
      const currentX = startPos.x;
      let currentY = startPos.y;
      const board = startPos.targetBoard;
      const addText = (textContent) => {
        const textNode = penpot.createText(textContent);
        if (textNode) {
          textNode.x = currentX;
          textNode.y = currentY;
          if (board) board.appendChild(textNode);
          currentY += 40;
        }
      };
      if (data.shopLabel) addText(`Nom : ${data.shopLabel}`);
      if (data.address) addText(`Adresse : ${data.address}`);
      if (data.url) addText(`URL : ${data.url}`);
      if (data.category) addText(`Cat\xE9gorie : ${data.category}`);
      currentY += 20;
      if (data.photos && data.photos.length > 0) {
        for (const photoUrl of data.photos) {
          const rect = penpot.createRectangle();
          if (rect) {
            rect.resize(200, 200);
            rect.x = currentX;
            rect.y = currentY;
            if (board) board.appendChild(rect);
            currentY += 220;
            try {
              const imageData = await penpot.uploadMediaUrl("plugin-image", photoUrl);
              if (imageData) {
                rect.fills = [{ fillOpacity: 1, fillImage: imageData }];
              }
            } catch (error) {
              console.error("Erreur lors du t\xE9l\xE9chargement de la photo", error);
            }
          }
        }
      }
      notifyUI("Import rapide termin\xE9 avec succ\xE8s !");
      penpot.ui.sendMessage({ type: "import-success" });
      return;
    }
    if (!isCursorInitialized && (message.type === "create-text" || message.type === "create-rectangle-with-image")) {
      const startPos = getStartingPosition();
      globalCursorX = startPos.x;
      globalCursorY = startPos.y;
      globalTargetBoard = startPos.targetBoard;
      isCursorInitialized = true;
    }
    if (message.type === "create-text") {
      const textNode = penpot.createText(message.content);
      if (!textNode) {
        notifyUI("Impossible de cr\xE9er le texte.");
        return;
      }
      textNode.x = globalCursorX;
      textNode.y = globalCursorY;
      if (globalTargetBoard) globalTargetBoard.appendChild(textNode);
      globalCursorY += 40;
      penpot.ui.sendMessage({ type: "done", action: "create-text" });
      return;
    }
    if (message.type === "create-rectangle-with-image") {
      const rect = penpot.createRectangle();
      if (!rect) {
        notifyUI("Impossible de cr\xE9er le rectangle.");
        return;
      }
      rect.resize(200, 200);
      rect.x = globalCursorX;
      rect.y = globalCursorY;
      if (globalTargetBoard) globalTargetBoard.appendChild(rect);
      globalCursorY += 220;
      try {
        const imageData = await penpot.uploadMediaUrl("plugin-image", message.content);
        if (imageData) {
          rect.fills = [{ fillOpacity: 1, fillImage: imageData }];
        }
        penpot.ui.sendMessage({ type: "done", action: "create-rectangle-with-image" });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
        notifyUI(`Erreur lors de l\u2019importation de l\u2019image : ${errorMessage}`);
      }
    }
  });
})();

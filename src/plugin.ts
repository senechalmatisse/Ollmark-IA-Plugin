import {Board, Page} from '@penpot/plugin-types';

type UIToPluginMessage =
  | { type: 'create-text'; content: string }
  | { type: 'create-rectangle-with-image'; content: string }
  | { type: 'notify'; content: string }
  | { type: 'close' }
  | {
  type: 'quick-import-direct';
  data: {
    shopLabel: string | null;
    address: string | null;
    url: string | null;
    category: string | null;
    photos: string[];
  }
};

type PluginToUIMessage =
  | { type: 'notify'; content: string }
  | { type: 'done'; action: UIToPluginMessage['type'] }
  | { type: 'import-success' }
  | { type: 'generation-success' };

penpot.ui.open('OllMark Generation', 'index.html', {
  width: 500,
  height: 900,
});

function notifyUI(content: string): void {
  const msg: PluginToUIMessage = {type: 'notify', content};
  penpot.ui.sendMessage(msg);
}

function getCanvasParent(): Board | Page | null {
  const currentPage = penpot.currentPage;
  if (currentPage) return currentPage;

  const root = penpot.root as unknown;
  if (root && typeof root === 'object' && 'type' in root) {
    const type = (root as { type: string }).type;
    if (type === 'page' || type === 'board') {
      return root as Page | Board;
    }
  }
  return null;
}


function getStartingPosition(): { x: number, y: number, targetBoard: Board | null } {
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
  let targetBoard: Board | null = null;

  if (selected.type === 'board') {
    targetBoard = selected as Board;
    let maxBottom = startY;


    const children = 'children' in targetBoard
      ? (targetBoard as unknown as { children: { y: number, height: number }[] }).children
      : [];
    for (const child of children) {
      const childBottom = child.y + child.height;
      if (childBottom > maxBottom) {
        maxBottom = childBottom;
      }
    }

    // Si on a trouvé des éléments, on se place 40 pixels en dessous du plus bas !
    if (maxBottom > startY) {
      startY = maxBottom + 40;
    }
  }

  return {x: startX, y: startY, targetBoard};
}

// Variables globales pour l'import de masse ("Sélectionnés")
let globalCursorX = 0;
let globalCursorY = 0;
let globalTargetBoard: Board | null = null;
let isCursorInitialized = false;

penpot.ui.onMessage<UIToPluginMessage>(async (message) => {
  if (message.type === 'close') {
    penpot.closePlugin();
    return;
  }

  if (message.type === 'notify') {
    notifyUI(message.content);
    if (message.content === 'Génération de la sélection terminée avec succès !') {
      penpot.ui.sendMessage({type: 'generation-success'});
      isCursorInitialized = false;
    }
    return;
  }

  const parent = getCanvasParent();
  if (!parent) {
    notifyUI('Impossible d’ajouter des éléments : aucune page/contexte actif.');
    return;
  }


  if (message.type === 'quick-import-direct') {
    const {data} = message;

    // On calcule la position idéale (sous les éléments existants s'il y en a)
    const startPos = getStartingPosition();
    const currentX = startPos.x;
    let currentY = startPos.y;
    const board = startPos.targetBoard;

    const addText = (textContent: string) => {
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
    if (data.category) addText(`Catégorie : ${data.category}`);

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
            const imageData = await penpot.uploadMediaUrl('plugin-image', photoUrl);
            if (imageData) {
              rect.fills = [{fillOpacity: 1, fillImage: imageData}];
            }
          } catch (error) {
            console.error('Erreur lors du téléchargement de la photo', error);
          }
        }
      }
    }

    notifyUI('Import rapide terminé avec succès !');
    penpot.ui.sendMessage({type: 'import-success'});
    return;
  }


  if (!isCursorInitialized && (message.type === 'create-text' || message.type === 'create-rectangle-with-image')) {
    const startPos = getStartingPosition();
    globalCursorX = startPos.x;
    globalCursorY = startPos.y;
    globalTargetBoard = startPos.targetBoard;
    isCursorInitialized = true;
  }

  if (message.type === 'create-text') {
    const textNode = penpot.createText(message.content);
    if (!textNode) {
      notifyUI('Impossible de créer le texte.');
      return;
    }

    textNode.x = globalCursorX;
    textNode.y = globalCursorY;
    if (globalTargetBoard) globalTargetBoard.appendChild(textNode);
    globalCursorY += 40;

    penpot.ui.sendMessage({type: 'done', action: 'create-text'} as PluginToUIMessage);
    return;
  }

  if (message.type === 'create-rectangle-with-image') {
    const rect = penpot.createRectangle();
    if (!rect) {
      notifyUI('Impossible de créer le rectangle.');
      return;
    }

    rect.resize(200, 200);
    rect.x = globalCursorX;
    rect.y = globalCursorY;
    if (globalTargetBoard) globalTargetBoard.appendChild(rect);
    globalCursorY += 220;

    try {
      const imageData = await penpot.uploadMediaUrl('plugin-image', message.content);
      if (imageData) {
        rect.fills = [{fillOpacity: 1, fillImage: imageData}];
      }

      penpot.ui.sendMessage({type: 'done', action: 'create-rectangle-with-image'} as PluginToUIMessage);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      notifyUI(`Erreur lors de l’importation de l’image : ${errorMessage}`);
    }
  }
});

"use strict";
(() => {
  // src/plugin.ts
  penpot.ui.open("OllMark - Assistant IA", `?theme=${penpot.theme}`, {
    width: 400,
    height: 650
  });
  var sessions = /* @__PURE__ */ new Map();
  function getSession(userId) {
    if (!sessions.has(userId)) {
      sessions.set(userId, {
        userId,
        originalPageId: null,
        originalPageRef: null,
        page1ShapesCache: [],
        page1ReconstructionCode: "",
        bufferPageId: null,
        bufferRef: null,
        bufferCreationInProgress: false,
        bufferNeedsReseeding: false,
        currentOperationType: "add",
        // défaut le plus sûr
        previewSent: false,
        accumulatedAiCode: [],
        isProcessingAccept: false,
        isProcessingReject: false
      });
    }
    return sessions.get(userId);
  }
  function resetGenerationState(session) {
    session.previewSent = false;
    session.accumulatedAiCode = [];
    session.currentOperationType = "add";
  }
  function sendToUi(msg) {
    penpot.ui.sendMessage(msg);
  }
  function sendTaskResult(taskId, success, data, error) {
    sendToUi({ type: "task-result", taskId, success, data: data ?? null, error: error ?? null });
  }
  function toErrorMessage(err) {
    if (err instanceof Error) return err.message;
    if (typeof err === "object" && err !== null) return JSON.stringify(err);
    return String(err);
  }
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  function findPageById(pageId) {
    const pages = penpot.pages;
    if (!pages) return void 0;
    return pages.find((p) => p.id === pageId);
  }
  async function waitForPage(targetId, maxWaitMs = 5e3) {
    const interval = 100;
    let elapsed = 0;
    while (elapsed < maxWaitMs) {
      if (penpot.currentPage?.id === targetId) return true;
      await delay(interval);
      elapsed += interval;
    }
    return penpot.currentPage?.id === targetId;
  }
  async function openPageById(pageId, directRef) {
    if (penpot.currentPage?.id === pageId) return true;
    const ref = directRef ?? findPageById(pageId);
    if (!ref) {
      sendToUi({ type: "debug", step: "openPageById-not-found", pageId });
      return false;
    }
    penpot.openPage(ref);
    const ok = await waitForPage(pageId, 5e3);
    sendToUi({
      type: "debug",
      step: "openPageById-result",
      pageId,
      ok,
      currentPage: penpot.currentPage?.id
    });
    return ok;
  }
  async function clearCurrentPageShapes() {
    const page = penpot.currentPage;
    if (!page) return;
    const all = page.findShapes();
    if (!all.length) return;
    const pageRootId = page.root?.id;
    const roots = all.filter((s) => {
      const parentId = s.parent?.id;
      return !parentId || parentId === page.id || pageRootId !== void 0 && parentId === pageRootId;
    });
    sendToUi({
      type: "debug",
      step: "clear-page-start",
      totalShapes: all.length,
      rootShapes: roots.length
    });
    for (const s of roots.slice().reverse()) {
      try {
        s.remove();
        await delay(30);
      } catch {
      }
    }
    sendToUi({ type: "debug", step: "clear-page-done", shapesLeft: page.findShapes().length });
  }
  function readFill(s) {
    try {
      const shape = s;
      const fills = shape["fills"];
      if (!fills || fills === "mixed") return "none";
      if (Array.isArray(fills) && fills.length > 0) {
        const f = fills[0];
        if (typeof f["fillColor"] === "string") return f["fillColor"];
        if (typeof f["color"] === "string") return f["color"];
      }
    } catch {
    }
    return "none";
  }
  function readStroke(s) {
    try {
      const shape = s;
      const strokes = shape["strokes"];
      if (Array.isArray(strokes) && strokes.length > 0) {
        const st = strokes[0];
        return {
          color: st["strokeColor"] ?? st["color"] ?? "none",
          w: st["strokeWidth"] ?? st["width"] ?? 1
        };
      }
    } catch {
    }
    return { color: "none", w: 0 };
  }
  function readNumber(s, key, fallback) {
    try {
      const val = s[key];
      if (typeof val === "number") return val;
    } catch {
    }
    return fallback;
  }
  function serializePage() {
    const page = penpot.currentPage;
    if (!page) return [];
    const out = [];
    for (const s of page.findShapes()) {
      const st = readStroke(s);
      let textContent = s.name;
      if (s.type === "text") {
        try {
          const ts = s;
          textContent = ts.characters ?? ts.content ?? s.name ?? "Text";
        } catch {
        }
      }
      out.push({
        type: s.type,
        x: s.x,
        y: s.y,
        width: s.width,
        height: s.height,
        fill: readFill(s),
        stroke: st.color,
        strokeW: st.w,
        opacity: readNumber(s, "opacity", 1),
        name: textContent,
        rx: readNumber(s, "borderRadius", 0) || readNumber(s, "r1", 0)
      });
    }
    return out;
  }
  function generateReconstructionCode(shapes) {
    if (!shapes.length) return "// Page vide";
    const lines = [];
    for (const s of shapes) {
      const fillLine = s.fill !== "none" ? `_s.fills = [{ fillColor: ${JSON.stringify(s.fill)} }];` : "_s.fills = [];";
      const strokeLine = s.stroke !== "none" ? `_s.strokes = [{ strokeColor: ${JSON.stringify(s.stroke)}, strokeWidth: ${s.strokeW} }];` : "";
      const opacityLine = s.opacity < 1 ? `_s.opacity = ${s.opacity};` : "";
      const nameLine = `_s.name = ${JSON.stringify(s.name)};`;
      if (s.type === "rect" || s.type === "rectangle") {
        const rxLine = s.rx > 0 ? `_s.borderRadius = ${s.rx};` : "";
        lines.push(`{
  const _s = penpot.createRectangle();
  ${nameLine}
  _s.x = ${s.x}; _s.y = ${s.y};
  _s.resize(${s.width}, ${s.height});
  ${fillLine}
  ${strokeLine}
  ${opacityLine}
  ${rxLine}
}`);
      } else if (s.type === "ellipse" || s.type === "circle") {
        lines.push(`{
  const _s = penpot.createEllipse();
  ${nameLine}
  _s.x = ${s.x}; _s.y = ${s.y};
  _s.resize(${s.width}, ${s.height});
  ${fillLine}
  ${strokeLine}
  ${opacityLine}
}`);
      } else if (s.type === "text") {
        lines.push(`{
  const _s = penpot.createText(${JSON.stringify(s.name || "Text")});
  _s.x = ${s.x}; _s.y = ${s.y};
  ${fillLine}
  ${opacityLine}
}`);
      }
    }
    return lines.filter(Boolean).join("\n");
  }
  function esc(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }
  function shapeToSvg(s) {
    const fill = s.fill !== "none" ? s.fill : "transparent";
    const strokeAttr = s.stroke !== "none" ? ` stroke="${s.stroke}" stroke-width="${s.strokeW}"` : "";
    const opAttr = s.opacity < 1 ? ` opacity="${s.opacity}"` : "";
    const rxAttr = s.rx > 0 ? ` rx="${s.rx}" ry="${s.rx}"` : "";
    if (s.type === "circle" || s.type === "ellipse") {
      const cx = s.x + s.width / 2;
      const cy = s.y + s.height / 2;
      return `<ellipse cx="${cx}" cy="${cy}" rx="${s.width / 2}" ry="${s.height / 2}" fill="${fill}"${strokeAttr}${opAttr}/>`;
    }
    if (s.type === "text") {
      const w = Math.max(s.width, 40);
      const h = Math.max(s.height, 18);
      const fs = Math.min(h * 0.7, 16);
      const textFill = fill !== "transparent" ? fill : "#333333";
      return `<rect x="${s.x}" y="${s.y}" width="${w}" height="${h}" fill="transparent"${opAttr}/><text x="${s.x + 4}" y="${s.y + fs}" font-family="sans-serif" font-size="${fs}" fill="${textFill}"${opAttr}>${esc(s.name || "Text")}</text>`;
    }
    return `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" fill="${fill}"${rxAttr}${strokeAttr}${opAttr}/>`;
  }
  function buildSvgFromBuffer(shapes) {
    if (!shapes.length) {
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300"><rect width="400" height="300" fill="#FFFFFF"/><text x="10" y="155" font-family="sans-serif" font-size="14" fill="#999">Aucune forme</text></svg>';
    }
    const boards = shapes.filter((s) => s.type === "board" || s.type === "frame");
    const hasBoard = boards.length > 0;
    let canvasX, canvasY, canvasW, canvasH;
    if (hasBoard) {
      canvasX = Math.min(...boards.map((b) => b.x));
      canvasY = Math.min(...boards.map((b) => b.y));
      const canvasMaxX = Math.max(...boards.map((b) => b.x + b.width));
      const canvasMaxY = Math.max(...boards.map((b) => b.y + b.height));
      canvasW = canvasMaxX - canvasX;
      canvasH = canvasMaxY - canvasY;
    } else {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const s of shapes) {
        if (s.x < minX) minX = s.x;
        if (s.y < minY) minY = s.y;
        if (s.x + s.width > maxX) maxX = s.x + s.width;
        if (s.y + s.height > maxY) maxY = s.y + s.height;
      }
      if (!isFinite(minX)) return "";
      const pad = 20;
      canvasX = minX - pad;
      canvasY = minY - pad;
      canvasW = maxX - minX + pad * 2;
      canvasH = maxY - minY + pad * 2;
    }
    if (canvasW <= 0 || canvasH <= 0) return "";
    const bg = `<rect x="${canvasX}" y="${canvasY}" width="${canvasW}" height="${canvasH}" fill="#FFFFFF"/>`;
    const sorted = [
      ...shapes.filter((s) => s.type === "board" || s.type === "frame"),
      ...shapes.filter((s) => s.type !== "board" && s.type !== "frame")
    ];
    const svgShapes = sorted.map((s) => shapeToSvg(s)).join("");
    const maxDim = 2e3;
    let sw = canvasW, sh = canvasH;
    if (canvasW > canvasH) {
      if (canvasW > maxDim) {
        sw = maxDim;
        sh = Math.round(canvasH / canvasW * maxDim);
      }
    } else {
      if (canvasH > maxDim) {
        sh = maxDim;
        sw = Math.round(canvasW / canvasH * maxDim);
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${canvasX} ${canvasY} ${canvasW} ${canvasH}" width="${Math.round(sw)}" height="${Math.round(sh)}">${bg}${svgShapes}</svg>`;
  }
  async function runCode(code, logs) {
    const captureLog = (...args) => {
      logs.push(args.map(String).join(" "));
    };
    const pendingRemovals = [];
    function wrapShape(shape) {
      return new Proxy(shape, {
        get(target, prop) {
          if (prop === "remove") {
            return () => {
              pendingRemovals.push({ id: target.id });
            };
          }
          const val = target[prop];
          return typeof val === "function" ? val.bind(target) : val;
        }
      });
    }
    function wrapPage(page) {
      return new Proxy(page, {
        get(target, prop) {
          if (prop === "findShapes") {
            return (criteria) => target.findShapes(criteria).map(wrapShape);
          }
          if (prop === "getShapeById") {
            return (id) => {
              const s = target.getShapeById(id);
              return s ? wrapShape(s) : null;
            };
          }
          const val = target[prop];
          return typeof val === "function" ? val.bind(target) : val;
        }
      });
    }
    const penpotProxy = new Proxy(penpot, {
      get(target, prop) {
        if (prop === "currentPage") {
          const p = target.currentPage;
          return p ? wrapPage(p) : p;
        }
        const val = target[prop];
        return typeof val === "function" ? val.bind(target) : val;
      }
    });
    const fn = new Function("penpot", "console", `"use strict"; return (async () => { ${code} })()`);
    const result = await fn(penpotProxy, { log: captureLog, warn: captureLog, error: captureLog });
    if (pendingRemovals.length > 0) {
      const page = penpot.currentPage;
      if (page) {
        const all = page.findShapes();
        for (const { id } of [...pendingRemovals].reverse()) {
          const shape = all.find((s) => s.id === id);
          if (shape) {
            try {
              shape.remove();
              await delay(30);
            } catch {
            }
          }
        }
      }
    }
    return result;
  }
  async function seedBuffer(session) {
    if (!session.page1ReconstructionCode || session.page1ReconstructionCode === "// Page vide") {
      session.bufferNeedsReseeding = false;
      return;
    }
    const logs = [];
    await runCode(session.page1ReconstructionCode, logs);
    const count = penpot.currentPage?.findShapes()?.length ?? 0;
    sendToUi({ type: "debug", step: "buffer-seeded", userId: session.userId, shapesOnBuffer: count });
    session.bufferNeedsReseeding = false;
  }
  async function createBuffer(session) {
    if (session.originalPageId) {
      const onPage1 = await openPageById(session.originalPageId, session.originalPageRef);
      if (!onPage1) {
        sendToUi({ type: "debug", step: "createBuffer-cannot-go-page1", userId: session.userId });
        return false;
      }
    }
    if (session.page1ShapesCache.length === 0) {
      session.page1ShapesCache = serializePage();
      session.page1ReconstructionCode = generateReconstructionCode(session.page1ShapesCache);
      sendToUi({
        type: "debug",
        step: "createBuffer-serialized",
        userId: session.userId,
        count: session.page1ShapesCache.length
      });
    }
    const bp = penpot.createPage();
    if (!bp) {
      sendToUi({ type: "debug", step: "createBuffer-createPage-failed", userId: session.userId });
      return false;
    }
    session.bufferPageId = bp.id;
    session.bufferRef = bp;
    bp.name = `__buffer_${session.userId}`;
    session.bufferNeedsReseeding = false;
    sendToUi({ type: "debug", step: "createBuffer-created", userId: session.userId, id: bp.id });
    penpot.openPage(bp);
    const reached = await waitForPage(session.bufferPageId, 5e3);
    sendToUi({ type: "debug", step: "createBuffer-navigation", userId: session.userId, reached });
    if (!reached) {
      session.bufferPageId = null;
      session.bufferRef = null;
      return false;
    }
    if (session.currentOperationType === "create") {
      sendToUi({ type: "debug", step: "createBuffer-empty-for-create", userId: session.userId });
    } else {
      await seedBuffer(session);
    }
    return true;
  }
  function isCreationCode(code) {
    const kw = [
      // Création de shapes
      "createRectangle",
      "createEllipse",
      "createText",
      "createFrame",
      "createPath",
      "createGroup",
      "createBool",
      "createShapeFromSvg",
      // Propriétés visuelles
      ".fills =",
      ".strokes =",
      ".opacity =",
      ".borderRadius =",
      // Géométrie (modify : déplacement, redimensionnement)
      ".x =",
      ".y =",
      ".resize(",
      // Suppression
      ".remove()",
      // Renommage
      ".name ="
    ];
    return kw.some((k) => code.includes(k));
  }
  async function handleExecuteCode(taskId, userId, params) {
    const code = params["code"];
    if (!code) {
      sendTaskResult(taskId, false, null, "Missing required param: code");
      return;
    }
    const session = getSession(userId);
    const logs = [];
    const creation = isCreationCode(code);
    if (!creation) {
      try {
        const result = await runCode(code, logs);
        sendTaskResult(taskId, true, { result: result ?? null, log: logs.join("\n") });
      } catch (err) {
        sendTaskResult(taskId, false, null, toErrorMessage(err));
      }
      return;
    }
    try {
      sendToUi({
        type: "debug",
        step: "operation-type",
        userId,
        operationType: session.currentOperationType
      });
      if (!session.originalPageId) {
        session.originalPageId = penpot.currentPage?.id ?? null;
        session.originalPageRef = penpot.currentPage;
        sendToUi({ type: "debug", step: "1-save-page1", userId, id: session.originalPageId });
      }
      if (!session.bufferPageId) {
        if (session.bufferCreationInProgress) {
          let waited = 0;
          while (session.bufferCreationInProgress && waited < 1e4) {
            await delay(200);
            waited += 200;
          }
        }
        if (!session.bufferPageId) {
          session.bufferCreationInProgress = true;
          try {
            const ok = await createBuffer(session);
            if (!ok) {
              sendTaskResult(taskId, false, null, "Failed to create buffer for user " + userId);
              return;
            }
          } finally {
            session.bufferCreationInProgress = false;
          }
        }
      } else {
        const onBuffer = await openPageById(session.bufferPageId, session.bufferRef);
        sendToUi({
          type: "debug",
          step: "2-buffer-reused",
          userId,
          onBuffer,
          operationType: session.currentOperationType
        });
        if (onBuffer) {
          if (session.currentOperationType === "create") {
            await clearCurrentPageShapes();
            session.bufferNeedsReseeding = false;
            sendToUi({ type: "debug", step: "2-buffer-cleared-for-create", userId });
          } else if (session.bufferNeedsReseeding) {
            sendToUi({ type: "debug", step: "2-reseeding-buffer", userId });
            if (session.page1ShapesCache.length === 0 && session.originalPageId) {
              const onPage1 = await openPageById(session.originalPageId, session.originalPageRef);
              if (onPage1) {
                session.page1ShapesCache = serializePage();
                session.page1ReconstructionCode = generateReconstructionCode(
                  session.page1ShapesCache
                );
                await openPageById(session.bufferPageId, session.bufferRef);
              }
            }
            await seedBuffer(session);
          }
        }
      }
      if (penpot.currentPage?.id !== session.bufferPageId) {
        sendToUi({
          type: "debug",
          step: "3-NOT-ON-BUFFER",
          userId,
          current: penpot.currentPage?.id,
          expected: session.bufferPageId
        });
        sendTaskResult(taskId, false, null, "Not on buffer \u2014 generation aborted");
        return;
      }
      sendToUi({ type: "debug", step: "3-confirmed", userId, currentPage: penpot.currentPage?.id });
      const result = await runCode(code, logs);
      session.accumulatedAiCode.push(code);
      sendTaskResult(taskId, true, { result: result ?? null, log: logs.join("\n") });
      await delay(1e3);
      let liveShapes = penpot.currentPage?.findShapes() ?? [];
      if (liveShapes.length === 0) {
        await delay(1e3);
        liveShapes = penpot.currentPage?.findShapes() ?? [];
      }
      sendToUi({ type: "debug", step: "7-buffer-shapes", userId, count: liveShapes.length });
      const serialized = liveShapes.map((s) => {
        const st = readStroke(s);
        let textContent = s.name;
        if (s.type === "text") {
          try {
            const ts = s;
            textContent = ts.characters ?? ts.content ?? s.name ?? "Text";
          } catch {
          }
        }
        return {
          type: s.type,
          x: s.x,
          y: s.y,
          width: s.width,
          height: s.height,
          fill: readFill(s),
          stroke: st.color,
          strokeW: st.w,
          opacity: readNumber(s, "opacity", 1),
          name: textContent,
          rx: readNumber(s, "borderRadius", 0) || readNumber(s, "r1", 0)
        };
      });
      const svgRaw = buildSvgFromBuffer(serialized);
      let previewDataUrl = "";
      if (svgRaw) {
        try {
          previewDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgRaw)))}`;
        } catch {
          previewDataUrl = `data:image/svg+xml,${encodeURIComponent(svgRaw)}`;
        }
      } else {
        previewDataUrl = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%23FFFFFF"/%3E%3Ctext x="10" y="155" fill="%23999"%3EAucune forme%3C/text%3E%3C/svg%3E';
      }
      if (!session.previewSent && session.originalPageId && session.bufferPageId) {
        session.previewSent = true;
        sendToUi({
          type: "buffer-preview",
          payload: {
            pngDataUrl: previewDataUrl,
            bufferPageId: session.bufferPageId,
            originalPageId: session.originalPageId,
            taskId,
            userId,
            code: session.accumulatedAiCode.join("\n")
          }
        });
      } else if (session.previewSent && previewDataUrl && session.bufferPageId) {
        sendToUi({
          type: "buffer-preview-update",
          bufferPageId: session.bufferPageId,
          pngDataUrl: previewDataUrl,
          userId
        });
      }
    } catch (err) {
      if (session.originalPageId) {
        try {
          await openPageById(session.originalPageId, session.originalPageRef);
        } catch {
        }
      }
      sendTaskResult(taskId, false, null, toErrorMessage(err));
    }
  }
  function handleFetchStructure(taskId) {
    try {
      const page = penpot.currentPage;
      if (!page) {
        sendTaskResult(taskId, false, null, "No active Penpot page");
        return;
      }
      const shapes = page.findShapes().map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        x: s.x,
        y: s.y,
        width: s.width,
        height: s.height,
        parentId: s.parent?.id ?? null
      }));
      sendTaskResult(taskId, true, { shapes, pageId: page.id });
    } catch (err) {
      sendTaskResult(taskId, false, null, toErrorMessage(err));
    }
  }
  async function handleAcceptBuffer(userId, bufferPageId) {
    const session = getSession(userId);
    if (session.isProcessingAccept) {
      sendToUi({ type: "debug", step: "accept-already-processing", userId });
      return;
    }
    session.isProcessingAccept = true;
    try {
      const origId = session.originalPageId;
      const buffId = session.bufferPageId ?? bufferPageId;
      if (!origId) throw new Error("No original page for user " + userId);
      const onBuffer = await openPageById(buffId, session.bufferRef);
      if (!onBuffer) throw new Error("Cannot navigate to buffer for user " + userId);
      const bufferShapes = serializePage();
      const bufferReconstructionCode = generateReconstructionCode(bufferShapes);
      sendToUi({
        type: "debug",
        step: "accept-buffer-serialized",
        userId,
        count: bufferShapes.length
      });
      await clearCurrentPageShapes();
      session.bufferNeedsReseeding = true;
      sendToUi({ type: "debug", step: "accept-buffer-cleared-for-reuse", userId });
      const onPage1 = await openPageById(origId, session.originalPageRef);
      if (!onPage1) throw new Error("Cannot navigate to original page for user " + userId);
      sendToUi({ type: "debug", step: "accept-on-page1", userId });
      await clearCurrentPageShapes();
      if (bufferReconstructionCode && bufferReconstructionCode !== "// Page vide") {
        await runCode(bufferReconstructionCode, []);
        sendToUi({
          type: "debug",
          step: "accept-reconstructed",
          userId,
          shapes: penpot.currentPage?.findShapes()?.length ?? 0
        });
      }
      session.page1ShapesCache = serializePage();
      session.page1ReconstructionCode = generateReconstructionCode(session.page1ShapesCache);
      sendToUi({
        type: "debug",
        step: "accept-updated-cache",
        userId,
        count: session.page1ShapesCache.length
      });
      resetGenerationState(session);
      sendToUi({ type: "buffer-accepted", bufferPageId: buffId, userId });
    } catch (err) {
      sendToUi({ type: "debug", step: "accept-error", userId, error: toErrorMessage(err) });
      if (session.originalPageId) {
        try {
          await openPageById(session.originalPageId, session.originalPageRef);
        } catch {
        }
      }
      sendToUi({ type: "buffer-error", bufferPageId, userId, error: toErrorMessage(err) });
      resetGenerationState(session);
    } finally {
      session.isProcessingAccept = false;
    }
  }
  async function handleRejectBuffer(userId, bufferPageId) {
    const session = getSession(userId);
    if (session.isProcessingReject) {
      sendToUi({ type: "debug", step: "reject-already-processing", userId });
      return;
    }
    session.isProcessingReject = true;
    try {
      const buffId = session.bufferPageId ?? bufferPageId;
      const origId = session.originalPageId;
      if (buffId) {
        const onBuffer = await openPageById(buffId, session.bufferRef);
        if (onBuffer) {
          await clearCurrentPageShapes();
          session.bufferNeedsReseeding = true;
          sendToUi({ type: "debug", step: "reject-buffer-cleared", userId });
        }
      }
      if (origId) {
        await openPageById(origId, session.originalPageRef);
      }
      resetGenerationState(session);
      sendToUi({ type: "buffer-rejected", bufferPageId: buffId, userId });
    } catch (err) {
      sendToUi({ type: "buffer-error", bufferPageId, userId, error: toErrorMessage(err) });
      resetGenerationState(session);
    } finally {
      session.isProcessingReject = false;
    }
  }
  var TASK_HANDLERS = {
    executeCode: (id, userId, params) => handleExecuteCode(id, userId, params),
    fetchStructure: (id) => {
      handleFetchStructure(id);
      return;
    }
  };
  async function handleTask(envelope) {
    const { taskId, task, params } = envelope;
    let userId = envelope.userId ?? "unknown";
    if (!userId || userId === "unknown") {
      try {
        const name = penpot.currentUser?.name ?? "unknown";
        const uid = penpot.currentUser?.id ?? "unknown";
        userId = `${name}_${uid}`;
      } catch {
        userId = "unknown";
      }
    }
    sendToUi({ type: "debug", step: "handleTask-userId", userId, task });
    const handler = TASK_HANDLERS[task];
    if (handler) await handler(taskId, userId, params);
    else sendTaskResult(taskId, false, null, `Unknown task: ${task}`);
  }
  penpot.ui.onMessage((msg) => {
    if (!msg?.type) return;
    const userId = msg["userId"] ?? (() => {
      try {
        return penpot.currentUser?.id ?? "unknown";
      } catch {
        return "unknown";
      }
    })();
    switch (msg.type) {
      case "get-project": {
        const id = penpot.currentPage?.id;
        if (!id) return;
        let userKey = "unknown";
        try {
          const name = penpot.currentUser?.name ?? "unknown";
          const uid = penpot.currentUser?.id ?? "unknown";
          userKey = `${name}_${uid}`;
        } catch {
          userKey = "unknown";
        }
        sendToUi({ type: "project-response", id, userName: userKey });
        break;
      }
      case "set-operation-type": {
        const session = getSession(userId);
        const opType = msg["operationType"];
        if (opType === "create" || opType === "add" || opType === "modify" || opType === "delete") {
          session.currentOperationType = opType;
        } else {
          session.currentOperationType = "add";
        }
        sendToUi({
          type: "debug",
          step: "set-operation-type",
          userId,
          operationType: session.currentOperationType
        });
        break;
      }
      case "execute-task":
        handleTask(msg);
        break;
      case "accept-buffer":
        handleAcceptBuffer(userId, msg["bufferPageId"]);
        break;
      case "reject-buffer":
        handleRejectBuffer(userId, msg["bufferPageId"]);
        break;
      default:
        break;
    }
  });
  penpot.on("themechange", (theme) => {
    sendToUi({ type: "theme", theme });
  });
})();

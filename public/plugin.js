"use strict";
(() => {
  // src/plugin.ts
  penpot.ui.open("OllMark - Assistant IA", `?theme=${penpot.theme}`, {
    width: 400,
    height: 650
  });
  var OFFSET = 5e4;
  var HALF_OFFSET = 25e3;
  var MAX_STRUCTURE = 150;
  var sessions = /* @__PURE__ */ new Map();
  function getSession(uid) {
    let s = sessions.get(uid);
    if (!s) {
      s = {
        userId: uid,
        originalPageId: null,
        opType: "add",
        previewSent: false,
        aiCode: [],
        processing: false,
        origRootIds: /* @__PURE__ */ new Set(),
        origAllIds: /* @__PURE__ */ new Set(),
        stagedRootIds: /* @__PURE__ */ new Set(),
        stagedAllIds: /* @__PURE__ */ new Set(),
        stagingId: null,
        mode: "create"
      };
      sessions.set(uid, s);
    }
    return s;
  }
  function resetSession(s) {
    s.previewSent = false;
    s.aiCode = [];
    s.opType = "add";
    s.originalPageId = null;
    s.processing = false;
    s.origRootIds = /* @__PURE__ */ new Set();
    s.origAllIds = /* @__PURE__ */ new Set();
    s.stagedRootIds = /* @__PURE__ */ new Set();
    s.stagedAllIds = /* @__PURE__ */ new Set();
    s.stagingId = null;
    s.mode = "create";
  }
  function sendToUi(msg) {
    penpot.ui.sendMessage(msg);
  }
  function sendResult(tid, ok, data, err) {
    sendToUi({
      type: "task-result",
      taskId: tid,
      success: ok,
      data: data ?? null,
      error: err ?? null
    });
  }
  function errStr(e) {
    if (e instanceof Error) return e.message;
    if (typeof e === "string") return e;
    try {
      return JSON.stringify(e);
    } catch {
      return "Unknown error";
    }
  }
  function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
  function getDirectChildren() {
    const page = penpot.currentPage;
    if (!page) return [];
    try {
      const root = page.root;
      if (root?.children && Array.isArray(root.children)) return [...root.children];
    } catch {
    }
    const all = page.findShapes();
    const rid = page.root?.id;
    return all.filter((s) => {
      const pid = s.parent?.id;
      return pid === rid || pid === page.id || !pid;
    });
  }
  function getVisibleRoots() {
    return getDirectChildren().filter((s) => s.x < HALF_OFFSET && s.y < HALF_OFFSET);
  }
  function getStagedRoots(session) {
    return getDirectChildren().filter((s) => session.stagedRootIds.has(s.id));
  }
  function allIds() {
    return new Set(penpot.currentPage?.findShapes().map((s) => s.id) ?? []);
  }
  function descIds(shape) {
    const ids = [shape.id];
    try {
      const ch = shape.children;
      if (Array.isArray(ch)) for (const c of ch) ids.push(...descIds(c));
    } catch {
    }
    return ids;
  }
  function snapshotOriginals(session) {
    for (const s of getVisibleRoots()) {
      session.origRootIds.add(s.id);
      for (const id of descIds(s)) session.origAllIds.add(id);
    }
  }
  async function cloneAllToStaging(session) {
    const roots = getVisibleRoots();
    if (!roots.length) return;
    const before = allIds();
    let cloned = 0;
    for (const shape of roots) {
      try {
        const clone = shape.clone();
        clone.x += OFFSET;
        clone.y += OFFSET;
        cloned++;
      } catch (err) {
        sendToUi({
          type: "debug",
          step: "clone-err",
          shapeName: shape.name,
          shapeType: shape.type,
          error: errStr(err)
        });
      }
      await wait(50);
    }
    await wait(500);
    registerClones(session, before);
    sendToUi({
      type: "debug",
      step: "clone-done",
      userId: session.userId,
      originals: roots.length,
      cloned,
      stagedRoots: session.stagedRootIds.size
    });
  }
  function registerClones(session, before) {
    const after = allIds();
    const newIds = /* @__PURE__ */ new Set();
    for (const id of after) {
      if (!before.has(id)) newIds.add(id);
    }
    if (newIds.size === 0) return;
    const directNew = getDirectChildren().filter(
      (s) => newIds.has(s.id) && (s.x >= HALF_OFFSET || s.y >= HALF_OFFSET)
    );
    for (const s of directNew) {
      session.stagedRootIds.add(s.id);
    }
    session.stagedAllIds = /* @__PURE__ */ new Set();
    for (const s of directNew) {
      for (const id of descIds(s)) session.stagedAllIds.add(id);
    }
  }
  async function deleteByIds(ids) {
    const targets = getDirectChildren().filter((s) => ids.has(s.id));
    for (const s of targets) {
      try {
        s.remove();
      } catch {
      }
      await wait(100);
    }
    await wait(300);
  }
  function unstage(shapes) {
    for (const s of shapes) {
      s.x -= OFFSET;
      s.y -= OFFSET;
    }
  }
  async function cleanupStaging(session) {
    if (session.stagedRootIds.size > 0) await deleteByIds(session.stagedRootIds);
    resetSession(session);
  }
  var _hideIds = /* @__PURE__ */ new Set();
  var _translate = false;
  var _stagingReady = null;
  var _cleanupDone = null;
  var FONT_WEIGHT_MAP = {
    bold: "700",
    normal: "400",
    regular: "400",
    light: "300",
    thin: "100",
    medium: "500",
    semibold: "600",
    extrabold: "800",
    black: "900"
  };
  function rgbaToHex(rgba) {
    const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(rgba);
    if (!m) return rgba;
    const hex = (n) => n.toString(16).padStart(2, "0");
    return `#${hex(Number(m[1]))}${hex(Number(m[2]))}${hex(Number(m[3]))}`;
  }
  function sanitizeFillEntry(f) {
    const color = f["fillColor"] ?? f["color"];
    if (color?.startsWith("rgb")) {
      f["fillColor"] = rgbaToHex(color);
      delete f["color"];
    }
    if (color) {
      const am = /rgba?\([^)]*,\s*([\d.]+)\s*\)/i.exec(color);
      if (am && f["fillOpacity"] === void 0) {
        f["fillOpacity"] = Number.parseFloat(am[1]);
      }
    }
    return f;
  }
  function sanitizeValue(key, value) {
    if (key === "fontWeight" && typeof value === "string") {
      return FONT_WEIGHT_MAP[value.toLowerCase()] ?? value;
    }
    if (key === "fills" && Array.isArray(value)) {
      return value.map((f) => sanitizeFillEntry({ ...f }));
    }
    if (key === "strokes" && Array.isArray(value)) {
      return value.map((s) => {
        const entry = { ...s };
        const sc = entry["strokeColor"] ?? entry["color"];
        if (sc?.startsWith("rgb")) {
          entry["strokeColor"] = rgbaToHex(sc);
          delete entry["color"];
        }
        return entry;
      });
    }
    return value;
  }
  function isInStaging(target) {
    return target.x >= HALF_OFFSET || target.y >= HALF_OFFSET;
  }
  function wrapShapeTr(shape, rm) {
    return new Proxy(shape, {
      get(target, prop) {
        if (prop === "remove")
          return () => {
            rm.push({ id: target.id });
          };
        if (_translate && prop === "x" && isInStaging(target)) return target.x - OFFSET;
        if (_translate && prop === "y" && isInStaging(target)) return target.y - OFFSET;
        const v = target?.[prop];
        return typeof v === "function" ? v.bind(target) : v;
      },
      set(target, prop, value) {
        const key = prop;
        const shouldTranslate = _translate && (key === "x" || key === "y");
        const sanitized = sanitizeValue(key, value);
        const actual = shouldTranslate ? sanitized + OFFSET : sanitized;
        target[prop] = actual;
        return true;
      }
    });
  }
  function wrapPageTr(page, rm) {
    return new Proxy(page, {
      get(t, p) {
        if (p === "findShapes")
          return (c) => {
            const all = t.findShapes(c);
            const filtered = _hideIds.size > 0 ? all.filter((s) => !_hideIds.has(s.id)) : all;
            return filtered.map((s) => wrapShapeTr(s, rm));
          };
        if (p === "getShapeById")
          return (id) => {
            if (_hideIds.has(id)) return null;
            const s = t.getShapeById(id);
            return s ? wrapShapeTr(s, rm) : null;
          };
        const v = t?.[p];
        return typeof v === "function" ? v.bind(t) : v;
      }
    });
  }
  function offsetNewShape(s) {
    s.x += OFFSET;
    s.y += OFFSET;
    return s;
  }
  function interceptCreate(t, rm, p) {
    if (p === "createRectangle") return () => wrapShapeTr(offsetNewShape(t.createRectangle()), rm);
    if (p === "createEllipse") return () => wrapShapeTr(offsetNewShape(t.createEllipse()), rm);
    if (p === "createBoard") return () => wrapShapeTr(offsetNewShape(t.createBoard()), rm);
    if (p === "createText")
      return ((txt) => {
        const s = t.createText(txt);
        return s ? wrapShapeTr(offsetNewShape(s), rm) : s;
      });
    if (p === "createShapeFromSvg")
      return ((svg) => {
        const s = t.createShapeFromSvg(svg);
        return s ? wrapShapeTr(offsetNewShape(s), rm) : s;
      });
    return null;
  }
  function makeProxy(rm) {
    const transit = /* @__PURE__ */ new Map();
    return new Proxy(penpot, {
      get(t, p) {
        if (transit.has(p)) return transit.get(p);
        if (p === "currentPage") {
          const pg = t.currentPage;
          return pg ? wrapPageTr(pg, rm) : pg;
        }
        if (_translate) {
          const fn = interceptCreate(t, rm, p);
          if (fn) return fn;
        }
        const v = t[p];
        return typeof v === "function" ? v.bind(t) : v;
      },
      defineProperty(t, p, d) {
        if (typeof p === "string" && p.startsWith("transit$")) {
          transit.set(p, d.value);
          return true;
        }
        return Reflect.defineProperty(t, p, d);
      },
      getOwnPropertyDescriptor(t, p) {
        if (transit.has(p))
          return { value: transit.get(p), writable: true, enumerable: true, configurable: true };
        return Reflect.getOwnPropertyDescriptor(t, p);
      }
    });
  }
  async function processRemovals(rm) {
    const page = penpot.currentPage;
    if (!page) return;
    for (const { id } of [...rm].reverse()) {
      const s = page.findShapes().find((sh) => sh.id === id);
      if (s) {
        try {
          s.remove();
        } catch {
        }
      }
      await wait(100);
    }
    await wait(300);
  }
  async function runCode(code, logs) {
    const log = (...a) => {
      logs.push(a.map(String).join(" "));
    };
    const rm = [];
    const fn = new Function("penpot", "console", `"use strict"; return (async () => { ${code} })()`);
    const result = await fn(makeProxy(rm), { log, warn: log, error: log });
    if (rm.length > 0) await processRemovals(rm);
    return result;
  }
  function isCreation(code) {
    return [
      "createRectangle",
      "createEllipse",
      "createText",
      "createBoard",
      "createPath",
      "createGroup",
      "createBool",
      "createShapeFromSvg",
      ".fills =",
      ".strokes =",
      ".opacity =",
      ".borderRadius =",
      ".x =",
      ".y =",
      ".resize(",
      ".remove()",
      ".name ="
    ].some((k) => code.includes(k));
  }
  function readFill(s) {
    try {
      const fills = s["fills"];
      if (!fills || fills === "mixed") return "none";
      if (Array.isArray(fills) && fills.length > 0) {
        const f = fills[0];
        return (typeof f["fillColor"] === "string" ? f["fillColor"] : f["color"]) ?? "none";
      }
    } catch {
    }
    return "none";
  }
  function readStroke(s) {
    try {
      const strokes = s["strokes"];
      if (Array.isArray(strokes) && strokes.length > 0) {
        const st = strokes[0];
        return {
          c: st["strokeColor"] ?? st["color"] ?? "none",
          w: st["strokeWidth"] ?? st["width"] ?? 1
        };
      }
    } catch {
    }
    return { c: "none", w: 0 };
  }
  function readNum(s, k, d) {
    try {
      const v = s[k];
      if (typeof v === "number") return v;
    } catch {
    }
    return d;
  }
  function pathToD(content) {
    const parts = [];
    for (const i of content) {
      const c = i;
      const v = c["params"] ?? {};
      switch (c["command"]) {
        case "move-to":
          parts.push(`M${v["x"]} ${v["y"]}`);
          break;
        case "line-to":
          parts.push(`L${v["x"]} ${v["y"]}`);
          break;
        case "curve-to":
          parts.push(`C${v["c1x"]} ${v["c1y"]} ${v["c2x"]} ${v["c2y"]} ${v["x"]} ${v["y"]}`);
          break;
        case "close-path":
          parts.push("Z");
          break;
        default:
          break;
      }
    }
    return parts.join(" ");
  }
  function toShapeData(s) {
    const st = readStroke(s);
    let text = s.name;
    if (s.type === "text")
      try {
        text = s?.characters ?? s.name ?? "Text";
      } catch {
      }
    let svgD;
    if (s.type === "path")
      try {
        const c = s["content"];
        if (Array.isArray(c)) svgD = pathToD(c);
      } catch {
      }
    return {
      type: s.type,
      x: s.x,
      y: s.y,
      width: s.width,
      height: s.height,
      fill: readFill(s),
      stroke: st.c,
      strokeW: st.w,
      opacity: readNum(s, "opacity", 1),
      name: text,
      rx: readNum(s, "borderRadius", 0) || readNum(s, "r1", 0),
      svgD
    };
  }
  function esc(s) {
    return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
  }
  function renderEllipse(s, fill, sa, oa) {
    return `<ellipse cx="${s.x + s.width / 2}" cy="${s.y + s.height / 2}" rx="${s.width / 2}" ry="${s.height / 2}" fill="${fill}"${sa}${oa}/>`;
  }
  function renderText(s, fill, oa) {
    const fs = Math.min(Math.max(s.height, 18) * 0.7, 16);
    const tf = fill === "transparent" ? "#333" : fill;
    return `<rect x="${s.x}" y="${s.y}" width="${Math.max(s.width, 40)}" height="${Math.max(s.height, 18)}" fill="transparent"${oa}/><text x="${s.x + 4}" y="${s.y + fs}" font-family="sans-serif" font-size="${fs}" fill="${tf}"${oa}>${esc(s.name || "Text")}</text>`;
  }
  function shapeToSvg(s) {
    if (s.svgExport) {
      const u = s.svgExport.startsWith("__PNG__") ? s.svgExport.slice(7) : s.svgExport;
      return `<image x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" href="${u}"/>`;
    }
    const isContainer = s.type === "frame" || s.type === "board" || s.type === "group" || s.type === "bool";
    const fill = s.fill === "none" ? isContainer ? "#FFFFFF" : "transparent" : s.fill;
    const defaultBorder = isContainer && s.stroke === "none" ? ' stroke="#E0E0E0" stroke-width="0.5"' : "";
    const sa = s.stroke === "none" ? defaultBorder : ` stroke="${s.stroke}" stroke-width="${s.strokeW}"`;
    const oa = s.opacity < 1 ? ` opacity="${s.opacity}"` : "";
    const ra = s.rx > 0 ? ` rx="${s.rx}" ry="${s.rx}"` : "";
    if (s.type === "ellipse") return renderEllipse(s, fill, sa, oa);
    if (s.type === "text") return renderText(s, fill, oa);
    if (s.type === "path" && s.svgD) return `<path d="${s.svgD}" fill="${fill}"${sa}${oa}/>`;
    return `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" fill="${fill}"${ra}${sa}${oa}/>`;
  }
  function toDataUrl(svg) {
    try {
      const e = encodeURIComponent(svg).replaceAll(
        /%([0-9A-F]{2})/g,
        (_, h) => String.fromCodePoint(Number.parseInt(h, 16))
      );
      return `data:image/svg+xml;base64,${btoa(e)}`;
    } catch {
      return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }
  }
  function buildPreviewUrl(shapes) {
    if (!shapes.length)
      return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Cdefs%3E%3Cpattern id="g" width="24" height="24" patternUnits="userSpaceOnUse"%3E%3Cpath d="M24 0H0v24" fill="none" stroke="%23f0f0f0" stroke-width="0.5"/%3E%3C/pattern%3E%3C/defs%3E%3Crect width="400" height="300" fill="%23fafafa"/%3E%3Crect width="400" height="300" fill="url(%23g)"/%3E%3Crect x="20" y="20" width="360" height="260" rx="12" fill="none" stroke="%23e0e0e0" stroke-width="1" stroke-dasharray="6 4"/%3E%3Ccircle cx="200" cy="120" r="24" fill="none" stroke="%23ccc" stroke-width="1.2"/%3E%3Cpath d="M192 120h16M200 112v16" stroke="%23ccc" stroke-width="1.2" stroke-linecap="round"/%3E%3Ctext x="200" y="170" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="500" fill="%23999"%3EAucun %C3%A9l%C3%A9ment g%C3%A9n%C3%A9r%C3%A9%3C/text%3E%3Ctext x="200" y="190" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="%23bbb"%3ELe r%C3%A9sultat appara%C3%AEtra ici%3C/text%3E%3C/svg%3E';
    let x0 = shapes[0].x, y0 = shapes[0].y, x1 = x0 + shapes[0].width, y1 = y0 + shapes[0].height;
    for (const s of shapes) {
      if (s.x < x0) x0 = s.x;
      if (s.y < y0) y0 = s.y;
      if (s.x + s.width > x1) x1 = s.x + s.width;
      if (s.y + s.height > y1) y1 = s.y + s.height;
    }
    const pad = 20, cw = x1 - x0 + pad * 2, ch = y1 - y0 + pad * 2, cx = x0 - pad, cy = y0 - pad;
    if (cw <= 0 || ch <= 0) return "";
    let sw = cw, sh = ch;
    if (cw >= ch && cw > 2e3) {
      sw = 2e3;
      sh = Math.round(ch / cw * 2e3);
    } else if (ch > cw && ch > 2e3) {
      sh = 2e3;
      sw = Math.round(cw / ch * 2e3);
    }
    return toDataUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${cx} ${cy} ${cw} ${ch}" width="${Math.round(sw)}" height="${Math.round(sh)}"><rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" fill="#F0F0F0"/>${shapes.map(shapeToSvg).join("")}</svg>`
    );
  }
  async function exportRootPng(shape) {
    try {
      const bytes = await Promise.race([
        shape.export({ type: "png", scale: 1 }),
        wait(5e3).then(() => null)
      ]);
      if (!bytes?.length) return "";
      const CH = 16384;
      let bin = "";
      for (let i = 0; i < bytes.length; i += CH)
        bin += String.fromCodePoint(...bytes.subarray(i, Math.min(i + CH, bytes.length)));
      return `data:image/png;base64,${btoa(bin)}`;
    } catch {
      return "";
    }
  }
  async function buildPreview(session) {
    if (session.stagedRootIds.size === 0) return "";
    const staged = getStagedRoots(session);
    if (staged.length === 0) return "";
    const pngs = [];
    for (const shape of staged) {
      const png = await exportRootPng(shape);
      if (png) {
        pngs.push({
          url: png,
          x: shape.x - OFFSET,
          y: shape.y - OFFSET,
          w: shape.width,
          h: shape.height
        });
      }
    }
    if (pngs.length > 0) {
      let x0 = pngs[0].x, y0 = pngs[0].y;
      let x1 = x0 + pngs[0].w, y1 = y0 + pngs[0].h;
      for (const p of pngs) {
        if (p.x < x0) x0 = p.x;
        if (p.y < y0) y0 = p.y;
        if (p.x + p.w > x1) x1 = p.x + p.w;
        if (p.y + p.h > y1) y1 = p.y + p.h;
      }
      const pad = 20;
      const vx = x0 - pad, vy = y0 - pad;
      const vw = x1 - x0 + pad * 2, vh = y1 - y0 + pad * 2;
      const images = pngs.map((p) => `<image x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" href="${p.url}"/>`).join("");
      return toDataUrl(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}" width="${Math.min(vw, 2e3)}" height="${Math.min(vh, 2e3)}"><rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="#F0F0F0"/>${images}</svg>`
      );
    }
    const page = penpot.currentPage;
    if (!page) return "";
    const allShapes = page.findShapes();
    const results = [];
    for (const s of allShapes) {
      if (s.x >= HALF_OFFSET || s.y >= HALF_OFFSET) {
        if (session.origAllIds.has(s.id)) continue;
        const d = toShapeData(s);
        d.x -= OFFSET;
        d.y -= OFFSET;
        results.push(d);
      }
    }
    return buildPreviewUrl(results);
  }
  function emitLoadingPreview(s, tid, uid) {
    if (s.previewSent || !s.stagingId || !s.originalPageId) return;
    s.previewSent = true;
    sendToUi({
      type: "buffer-preview",
      payload: {
        pngDataUrl: "",
        bufferPageId: s.stagingId,
        originalPageId: s.originalPageId,
        taskId: tid,
        userId: uid,
        code: ""
      }
    });
  }
  function emitRealPreview(s, uid, url) {
    if (!s.stagingId || !url) return;
    let viewportZoom = 1;
    let viewportCenterX = 0;
    let viewportCenterY = 0;
    try {
      const vp = penpot.viewport;
      viewportZoom = vp.zoom ?? 1;
      viewportCenterX = vp.center.x ?? 0;
      viewportCenterY = vp.center.y ?? 0;
    } catch {
    }
    sendToUi({
      type: "buffer-preview-update",
      bufferPageId: s.stagingId,
      pngDataUrl: url,
      userId: uid,
      viewportZoom,
      viewportCenterX,
      viewportCenterY
    });
  }
  function initCycle(s, uid) {
    s.originalPageId = penpot.currentPage?.id ?? null;
    s.stagingId = `stg_${Date.now()}`;
    s.mode = s.opType === "create" ? "create" : "clone";
    snapshotOriginals(s);
    sendToUi({
      type: "debug",
      step: "init",
      userId: uid,
      mode: s.mode,
      opType: s.opType,
      origRoots: s.origRootIds.size
    });
  }
  function trackNewShapes(session, newIds) {
    const newIdSet = new Set(newIds);
    const newRoots = getDirectChildren().filter((s) => newIdSet.has(s.id));
    for (const r of newRoots) {
      session.stagedRootIds.add(r.id);
      for (const id of descIds(r)) session.stagedAllIds.add(id);
    }
    for (const id of newIds) session.stagedAllIds.add(id);
  }
  function buildHideIds(session) {
    const hide = new Set(session.origAllIds);
    if (session.mode === "create") {
      for (const id of session.stagedAllIds) hide.add(id);
    }
    return hide;
  }
  async function handleExec(tid, uid, params) {
    const code = params["code"];
    if (!code) {
      sendResult(tid, false, null, "Missing param: code");
      return;
    }
    if (_stagingReady !== null) {
      await _stagingReady;
      _stagingReady = null;
    }
    const session = getSession(uid);
    const logs = [];
    const needsStaging = isCreation(code);
    const isCloneOp = session.opType !== "create";
    if (!needsStaging && !isCloneOp && !session.originalPageId) {
      try {
        const r = await runCode(code, logs);
        sendResult(tid, true, { result: r ?? null, log: logs.join("\n") });
      } catch (e) {
        sendResult(tid, false, null, errStr(e));
      }
      return;
    }
    try {
      if (!session.originalPageId) {
        initCycle(session, uid);
      }
      emitLoadingPreview(session, tid, uid);
      const snap = allIds();
      _hideIds = buildHideIds(session);
      _translate = true;
      const result = await runCode(code, logs);
      if (needsStaging) session.aiCode.push(code);
      _hideIds = /* @__PURE__ */ new Set();
      _translate = false;
      sendResult(tid, true, { result: result ?? null, log: logs.join("\n") });
      await wait(500);
      const newIds = [...allIds()].filter((id) => !snap.has(id));
      if (newIds.length > 0) trackNewShapes(session, newIds);
      sendToUi({
        type: "debug",
        step: "done",
        userId: uid,
        newShapes: newIds.length,
        staged: session.stagedRootIds.size
      });
      await wait(300);
      emitRealPreview(session, uid, await buildPreview(session));
    } catch (e) {
      _hideIds = /* @__PURE__ */ new Set();
      _translate = false;
      sendResult(tid, false, null, errStr(e));
    }
  }
  async function handleAccept(uid) {
    const s = getSession(uid);
    if (s.processing) return;
    s.processing = true;
    try {
      const sid = s.stagingId;
      if (s.origRootIds.size > 0) await deleteByIds(s.origRootIds);
      const staged = getStagedRoots(s);
      unstage(staged);
      sendToUi({ type: "debug", step: "accept", userId: uid, moved: staged.length });
      await wait(300);
      resetSession(s);
      sendToUi({ type: "buffer-accepted", bufferPageId: sid, userId: uid });
    } catch (e) {
      sendToUi({
        type: "buffer-error",
        bufferPageId: s.stagingId ?? "",
        userId: uid,
        error: errStr(e)
      });
      resetSession(s);
    } finally {
      s.processing = false;
    }
  }
  async function handleReject(uid) {
    const s = getSession(uid);
    if (s.processing) return;
    s.processing = true;
    try {
      const sid = s.stagingId;
      await deleteByIds(s.stagedRootIds);
      sendToUi({ type: "debug", step: "reject", userId: uid, deleted: s.stagedRootIds.size });
      resetSession(s);
      sendToUi({ type: "buffer-rejected", bufferPageId: sid, userId: uid });
    } catch (e) {
      sendToUi({
        type: "buffer-error",
        bufferPageId: s.stagingId ?? "",
        userId: uid,
        error: errStr(e)
      });
      resetSession(s);
    } finally {
      s.processing = false;
    }
  }
  async function handleResetStaging(uid) {
    const s = getSession(uid);
    if (s.stagedRootIds.size > 0) {
      const sid = s.stagingId;
      await cleanupStaging(s);
      if (sid) sendToUi({ type: "buffer-rejected", bufferPageId: sid, userId: uid });
      sendToUi({ type: "staging-cleared", userId: uid });
    } else {
      resetSession(s);
    }
  }
  async function handleFinalizePreview(uid, opType) {
    const s = getSession(uid);
    const isCloneOp = opType === "add" || opType === "modify" || opType === "delete";
    if (isCloneOp) {
      if (s.aiCode.length > 0) return;
      if (s.stagedRootIds.size > 0) {
        if (_stagingReady !== null) {
          await _stagingReady;
          _stagingReady = null;
        }
        const sid = s.stagingId;
        await deleteByIds(s.stagedRootIds);
        resetSession(s);
        if (sid) sendToUi({ type: "buffer-rejected", bufferPageId: sid, userId: uid });
        sendToUi({ type: "debug", step: "finalize-auto-reject", userId: uid });
      }
      return;
    }
    if (s.stagedRootIds.size > 0) return;
    if (s.previewSent) {
      const sid = s.stagingId;
      resetSession(s);
      if (sid) sendToUi({ type: "buffer-rejected", bufferPageId: sid, userId: uid });
      sendToUi({ type: "debug", step: "finalize-close-empty", userId: uid });
      return;
    }
    resetSession(s);
    sendToUi({ type: "debug", step: "finalize-no-preview", userId: uid });
  }
  function handleStructure(tid) {
    try {
      const page = penpot.currentPage;
      if (!page) {
        sendResult(tid, false, null, "No page");
        return;
      }
      const all = page.findShapes().filter((s) => s.x < HALF_OFFSET && s.y < HALF_OFFSET);
      const limited = all.length > MAX_STRUCTURE ? all.slice(0, MAX_STRUCTURE) : all;
      const shapes = limited.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        x: Math.round(s.x),
        y: Math.round(s.y),
        width: Math.round(s.width),
        height: Math.round(s.height),
        parentId: s.parent?.id ?? null
      }));
      sendResult(tid, true, {
        shapes,
        pageId: page.id,
        total: all.length,
        truncated: all.length > MAX_STRUCTURE
      });
    } catch (e) {
      sendResult(tid, false, null, errStr(e));
    }
  }
  var HANDLERS = {
    executeCode: (id, uid, p) => handleExec(id, uid, p),
    fetchStructure: (id) => {
      handleStructure(id);
    }
  };
  async function handleTask(env) {
    let uid = env.userId || "unknown";
    if (uid === "unknown") {
      try {
        uid = `${penpot.currentUser?.name ?? "u"}_${penpot.currentUser?.id ?? "0"}`;
      } catch {
        uid = "unknown";
      }
    }
    const h = HANDLERS[env.task];
    if (h) await h(env.taskId, uid, env.params);
    else sendResult(env.taskId, false, null, `Unknown task: ${env.task}`);
  }
  penpot.ui.onMessage((msg) => {
    if (!msg?.type) return;
    const uid = msg["userId"] ?? (() => {
      try {
        return `${penpot.currentUser?.name ?? "u"}_${penpot.currentUser?.id ?? "0"}`;
      } catch {
        return "unknown";
      }
    })();
    switch (msg.type) {
      case "get-project": {
        const id = penpot.currentPage?.id;
        if (!id) return;
        let uk = "unknown";
        try {
          uk = `${penpot.currentUser?.name ?? "u"}_${penpot.currentUser?.id ?? "0"}`;
        } catch {
          uk = "unknown";
        }
        sendToUi({ type: "project-response", id, userName: uk });
        break;
      }
      case "set-operation-type": {
        const s = getSession(uid);
        const op = msg["operationType"];
        if (s.stagedRootIds.size > 0) {
          const oldSid = s.stagingId;
          const oldIds = new Set(s.stagedRootIds);
          resetSession(s);
          _cleanupDone = deleteByIds(oldIds).then(() => {
            if (oldSid) sendToUi({ type: "buffer-rejected", bufferPageId: oldSid, userId: uid });
            _cleanupDone = null;
          });
        } else {
          _cleanupDone = null;
        }
        s.opType = op === "create" || op === "add" || op === "modify" || op === "delete" ? op : "add";
        sendToUi({ type: "debug", step: "set-op", userId: uid, opType: s.opType });
        if (s.opType === "create") {
          _stagingReady = null;
        } else {
          _stagingReady = (async () => {
            if (_cleanupDone !== null) await _cleanupDone;
            initCycle(s, uid);
            await cloneAllToStaging(s);
            if (s.stagedRootIds.size === 0) {
              s.mode = "create";
              sendToUi({ type: "debug", step: "clone-fallback", userId: uid });
              return;
            }
            const fakeTid = `pre_${Date.now()}`;
            emitLoadingPreview(s, fakeTid, uid);
            const url = await buildPreview(s);
            emitRealPreview(s, uid, url);
          })();
        }
        break;
      }
      case "execute-task":
        handleTask(msg);
        break;
      case "accept-buffer":
        handleAccept(uid);
        break;
      case "reject-buffer":
        handleReject(uid);
        break;
      case "reset-staging":
        handleResetStaging(uid);
        break;
      case "finalize-preview":
        handleFinalizePreview(uid, msg["operationType"]);
        break;
      default:
        break;
    }
  });
  penpot.on("themechange", (theme) => {
    sendToUi({ type: "theme", theme });
  });
})();

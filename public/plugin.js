"use strict";
(() => {
  // src/plugin.ts
  penpot.ui.open("OllMark", `?theme=${penpot.theme}`, { width: 380, height: 620 });
  function sendToUi(msg) {
    penpot.ui.sendMessage(msg);
  }
  penpot.ui.onMessage((msg) => {
    if (!msg?.type) return;
    switch (msg.type) {
      /**
       * get-project
       * Demandé par PluginBridgeService au démarrage.
       * On utilise currentPage.id comme identifiant de conversation.
       */
      case "get-project": {
        const id = penpot.currentPage?.id ?? crypto.randomUUID();
        sendToUi({ type: "project-response", id });
        break;
      }
      /**
       * execute-task
       * WebSocketService reçoit une tâche du backend Spring Boot,
       * la transmet ici via postMessage, et attend `task-result` en retour.
       */
      case "execute-task": {
        handleTask(msg);
        break;
      }
      default:
        break;
    }
  });
  async function handleTask(envelope) {
    const { taskId, task, params } = envelope;
    switch (task) {
      case "executeCode":
        await handleExecuteCode(taskId, params);
        break;
      case "fetchStructure":
        handleFetchStructure(taskId);
        break;
      default:
        sendTaskResult(taskId, false, null, `Unknown task: ${task}`);
    }
  }
  async function handleExecuteCode(taskId, params) {
    const code = params["code"];
    if (!code) {
      sendTaskResult(taskId, false, null, "Missing required param: code");
      return;
    }
    const logs = [];
    const captureLog = (...args) => logs.push(args.map(String).join(" "));
    try {
      const fn = new Function(
        "penpot",
        "console",
        `"use strict"; return (async () => { ${code} })()`
      );
      const result = await fn(penpot, {
        log: captureLog,
        warn: captureLog,
        error: captureLog
      });
      sendTaskResult(taskId, true, { result: result ?? null, log: logs.join("\n") });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[OllMark plugin] executeCode error:", message);
      sendTaskResult(taskId, false, null, message);
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
      const message = err instanceof Error ? err.message : String(err);
      sendTaskResult(taskId, false, null, message);
    }
  }
  function sendTaskResult(taskId, success, data, error) {
    sendToUi({
      type: "task-result",
      taskId,
      success,
      data: data ?? null,
      error: error ?? null
    });
  }
  penpot.on("themechange", (theme) => {
    sendToUi({ type: "theme", theme });
  });
})();

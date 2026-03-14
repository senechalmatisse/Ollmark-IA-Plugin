"use strict";
(() => {
  // src/plugin/code-executor.ts
  var CodeExecutor = class {
    async execute(task) {
      const code = task.params.code;
      if (typeof code !== "string" || code.trim().length === 0) {
        return {
          success: false,
          error: "Missing or empty task.params.code"
        };
      }
      try {
        const penpotApi = globalThis.penpot;
        const fn = new Function(
          "penpot",
          `
            "use strict";
            return (function () {
            ${code}
            })();
            `
        );
        const result = await Promise.resolve(fn(penpotApi));
        return {
          success: true,
          data: result
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  };

  // src/plugin/websocket-client.ts
  var WebSocketClient = class {
    constructor(url) {
      this.url = url;
    }
    ws = null;
    executor = new CodeExecutor();
    reconnectAttempts = 0;
    reconnectTimer = null;
    manuallyClosed = false;
    /**
     * Ouvre la connexion WebSocket si aucune connexion n'est déjà ouverte/en cours.
     * Réinitialise le mode "fermeture manuelle" pour autoriser la reconnexion auto.
     */
    connect() {
      if (this.isOpenOrConnecting()) {
        return;
      }
      this.manuallyClosed = false;
      this.clearReconnectTimer();
      try {
        console.log(`[WebSocketClient] Connecting to ${this.url}`);
        this.ws = new WebSocket(this.url);
        this.registerHandlers(this.ws);
      } catch (error) {
        console.error("[WebSocketClient] Failed to initialize WebSocket:", error);
        this.scheduleReconnect();
      }
    }
    /**
     * Ferme explicitement la socket et désactive les tentatives de reconnexion.
     * À utiliser lors de la fermeture du plugin Penpot.
     */
    disconnect() {
      this.manuallyClosed = true;
      this.clearReconnectTimer();
      if (this.ws) {
        try {
          this.ws.close();
        } catch (error) {
          console.error("[WebSocketClient] Error while closing WebSocket:", error);
        }
      }
      this.ws = null;
    }
    /**
     * Attache tous les handlers WebSocket à une instance donnée.
     * - `onopen`: reset du compteur de retry
     * - `onmessage`: traitement de tâche
     * - `onerror` / `onclose`: planification de reconnexion
     */
    registerHandlers(socket) {
      socket.onopen = () => {
        console.log("[WebSocketClient] WebSocket connection established");
        this.reconnectAttempts = 0;
      };
      socket.onmessage = (event) => {
        void this.handleIncomingMessage(event.data);
      };
      socket.onerror = (event) => {
        console.error("[WebSocketClient] WebSocket error:", event);
        this.scheduleReconnect();
      };
      socket.onclose = () => {
        console.warn("[WebSocketClient] WebSocket connection closed");
        this.ws = null;
        if (!this.manuallyClosed) {
          this.scheduleReconnect();
        }
      };
    }
    /**
     * Traite un message brut reçu du backend :
     * - parse JSON
     * - validation de structure
     * - exécution via CodeExecutor
     * - réponse sérialisable renvoyée au backend
     */
    async handleIncomingMessage(rawMessage) {
      let payload;
      try {
        payload = JSON.parse(rawMessage);
      } catch (error) {
        console.error("[WebSocketClient] Invalid JSON received:", error);
        return;
      }
      if (!this.isValidTaskRequest(payload)) {
        console.error("[WebSocketClient] Invalid PluginTaskRequest payload:", payload);
        if (this.hasTaskId(payload)) {
          this.send({
            id: payload.id,
            success: false,
            error: "Invalid PluginTaskRequest payload"
          });
        }
        return;
      }
      const task = payload;
      const executionResult = await this.executor.execute(task);
      const response = {
        id: task.id,
        success: executionResult.success,
        data: executionResult.data,
        error: executionResult.error
      };
      this.send(response);
    }
    /**
     * Envoie une réponse d'exécution au backend si la socket est ouverte.
     * Les erreurs de sérialisation/envoi sont journalisées mais ne crashent pas le plugin.
     */
    send(response) {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        console.error("[WebSocketClient] Cannot send response: socket is not open");
        return;
      }
      try {
        const payload = JSON.stringify(response);
        this.ws.send(payload);
      } catch (error) {
        console.error("[WebSocketClient] Failed to send response:", error);
      }
    }
    /**
     * Planifie une tentative de reconnexion avec backoff exponentiel plafonné à 30s.
     * N'exécute rien si :
     * - la fermeture est manuelle
     * - un timer existe déjà
     * - une connexion est déjà en cours
     */
    scheduleReconnect() {
      if (this.manuallyClosed || this.reconnectTimer) {
        return;
      }
      if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
        return;
      }
      const delay = Math.min(1e3 * 2 ** this.reconnectAttempts, 3e4);
      console.log(
        `[WebSocketClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`
      );
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.reconnectAttempts += 1;
        this.connect();
      }, delay);
    }
    /**
     * Annule le timer de reconnexion s'il existe.
     */
    clearReconnectTimer() {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    }
    /**
     * Indique si la socket est déjà ouverte ou en cours d'ouverture.
     */
    isOpenOrConnecting() {
      return this.ws !== null && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING);
    }
    /**
     * Type guard du payload attendu depuis le backend.
     * Exige au minimum un `id` string et `params.code` string.
     */
    isValidTaskRequest(task) {
      if (typeof task !== "object" || task === null) {
        return false;
      }
      const candidate = task;
      return typeof candidate.id === "string" && (candidate.task === void 0 || typeof candidate.task === "string") && typeof candidate.params === "object" && candidate.params !== null && typeof candidate.params.code === "string";
    }
    /**
     * Type guard minimal pour extraire un `id` corrélable
     * même si le payload complet est invalide.
     */
    hasTaskId(payload) {
      if (typeof payload !== "object" || payload === null) {
        return false;
      }
      return "id" in payload && typeof payload.id === "string";
    }
  };

  // src/plugin/plugin.ts
  var PLUGIN_NAME = "OllMark";
  var WS_URL = "ws://10.130.163.57:50050/plugin";
  var sendFileId = () => {
    const currentFileId = penpot.currentFile ? penpot.currentFile.id : null;
    console.log("[Plugin] Sending fileId:", currentFileId);
    penpot.ui.sendMessage({
      type: "fileId",
      fileId: currentFileId
    });
  };
  function bootstrapPlugin(client) {
    console.log("[Plugin] Starting OllMark sandbox");
    penpot.ui.open(PLUGIN_NAME, "/", {
      width: 500,
      height: 800
    });
    client.connect();
    penpot.ui.onMessage((msg) => {
      if (msg.type === "ready") {
        console.log("[Plugin] UI ready, sending initial fileId");
        sendFileId();
      }
    });
    penpot.on("filechange", () => {
      console.log("[Plugin] File changed, updating UI");
      sendFileId();
    });
    penpot.on("pagechange", () => {
      console.log("[Plugin] Page changed, updating UI");
      sendFileId();
    });
    penpot.on("finish", () => {
      console.log("[Plugin] Finishing OllMark sandbox");
      client.disconnect();
    });
  }
  function hasPenpotRuntime() {
    return typeof globalThis.penpot !== "undefined";
  }
  function autoBootstrap(createClient) {
    if (hasPenpotRuntime()) {
      bootstrapPlugin(createClient());
    }
  }
  autoBootstrap(() => new WebSocketClient(WS_URL));
})();

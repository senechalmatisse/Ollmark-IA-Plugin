# ✨ OllMark-AI-Plugin

<div align="center">

**AI-powered design assistant directly inside Penpot**

Built with **Angular 20 + Vite** — seamlessly connected to `penpot-ai-server`

![AI Demo](./docs/assets/demo_carousel.gif)

</div>

---

## 📦 Overview

**OllMark** is a Penpot plugin that embeds a **conversational AI assistant** directly into the design interface.

It enables users to:

* 🧠 Generate designs using natural language
* 🎨 Modify existing elements dynamically
* 🔍 Inspect and analyze layouts in real-time

➡️ The plugin communicates with the backend via:

* **REST API** (`/api/ai/*`)
* **WebSocket** (`/plugin`)

---

## 🏗️ Architecture Overview

```id="arch-frontend"
┌───────────────────────────────────────────────────────────────┐
│                     Penpot Designer                           │
│                                                               │
│   ┌──────────────────────────────────────────────────────┐    │
│   │          plugin.ts (sandboxed environment)           │    │
│   │  • Penpot API (createRectangle, findShapes…)         │    │
│   │  • TASK_HANDLERS (executeCode, fetchStructure)       │    │
│   │  ← postMessage →                                     │    │
│   └────────────────────────┬─────────────────────────────┘    │
│                            │ penpot.ui messaging              │
│   ┌────────────────────────▼─────────────────────────────┐    │
│   │         Angular iframe (this project)                │    │
│   │                                                      │    │
│   │      PluginBridgeService ↔ postMessage               │    │
│   │        WebSocketService  ↔ ws://backend/plugin       │    │
│   │       ChatFacadeService  ↔ HTTP /api/ai/*            │    │
│   │                                                      │    │
│   │      ChatContainerComponent                          │    │
│   │         ├── ChatHistoryComponent                     │    │
│   │         └── ChatInputComponent                       │    │
│   └──────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
                            │ WebSocket
                            ▼
                  penpot-ai-server :8080
```

> ⚠️ **Penpot sandbox constraint**
> `plugin.ts` runs in an isolated environment without access to browser APIs (`fetch`, `WebSocket`, `localStorage`).
> All network communication must go through the Angular iframe.

---

## 🧱 Prerequisites

| Tool               | Version | Notes                          |
| ------------------ | ------- | ------------------------------ |
| Node.js            | 20 LTS  | Required for Angular 20        |
| npm                | 10+     | Bundled with Node              |
| Penpot             | —       | Cloud or self-hosted           |
| `penpot-ai-server` | —       | Must be running and accessible |

---

## ⚡ Quick Start

### 1. Clone the repository

```bash id="clone"
git clone <repository-url>
cd ollmark-plugin
```

---

### 2. Install dependencies

```bash id="install"
npm install
```

---

### 3. Configure environments

Environment files are located in `src/environments/`.

**Local development:**

```ts id="env-local"
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080',
  websocketUrl: 'ws://localhost:8080/plugin',
  wsAuthToken: 'YOUR_TOKEN',
};
```

**Remote development:**

```ts id="env-remote"
export const environment = {
  production: false,
  apiBaseUrl: 'http://<remote-host>',
  websocketUrl: 'ws://<remote-host>/plugin',
  wsAuthToken: 'YOUR_TOKEN',
};
```

> The `wsAuthToken` must match backend validation.
> Invalid tokens result in WebSocket error **1008 (POLICY_VIOLATION)**.

---

### 4. Build the plugin (`plugin.js`)

```bash id="build-plugin"
npm run build-plugin
```

* Output: `public/plugin.js`
* Built with **esbuild**
* Required **before loading the plugin in Penpot**

---

### 5. Start the development server

```bash id="start"
npm run start
```

Other modes:

```bash
npm run start:development
npm run start:preprod
```

App runs at: **[http://localhost:4200](http://localhost:4200)**

---

### 6. Load the plugin in Penpot

1. Open Penpot
2. Open a design file
3. Menu (☰) → **Plugins → Manage plugins**
4. Click **Add plugin**
5. Paste:

```
http://localhost:4200/manifest.json
```

6. Open **OllMark - AI Assistant**

---

### 7. Verify everything works

| Step              | Expected                 |
| ----------------- | ------------------------ |
| Plugin opened     | Chat UI visible          |
| Connection status | `connected` (green)      |
| Send message      | User bubble appears      |
| AI response       | Assistant reply rendered |
| Action executed   | Shape appears on canvas  |

If not working:

* Backend is not running
* Invalid `wsAuthToken`
* CORS misconfiguration

---

## ⚙️ Available Configurations

| Mode    | Command                     | Target         |
| ------- | --------------------------- | -------------- |
| Local   | `npm run start`             | localhost      |
| Dev     | `npm run start:development` | remote server  |
| Preprod | `npm run start:preprod`     | env-based      |
| Prod    | `npm run start:prod`        | nginx / hosted |

---

## 🔑 Environment Variables

### Core

| Variable       | Description                |
| -------------- | -------------------------- |
| `apiBaseUrl`   | REST API base URL          |
| `websocketUrl` | WebSocket endpoint         |
| `wsAuthToken`  | Auth token (`?userToken=`) |

---

### Vite Proxy (Dev only)

```bash id="proxy"
BACKEND_TARGET=http://localhost:8080 npm run start:development
```

---

## 🧠 Internal Architecture

### 🔄 Full Communication Flow

```id="flow"
User → ChatInput
     → ChatFacade
     → HTTP API (/chat)
     → Backend (LLM)
     → WebSocket → plugin.ts
     → Penpot API execution
     → WebSocket → Backend
     → HTTP response
     → UI update
```

---

### 🧩 Angular Services Layer

| Service                | Responsibility                 |
| ---------------------- | ------------------------------ |
| `PluginBridgeService`  | postMessage bridge with plugin |
| `WebSocketService`     | WS connection + reconnection   |
| `SessionStore`         | Shared session ID              |
| `ChatFacadeService`    | Main orchestrator              |
| `ChatStateService`     | State management               |
| `ChatApiService`       | HTTP layer                     |
| `HistoryLoaderService` | Initial history loading        |

---

### 🎨 UI Components

```
AppComponent
└── ChatContainerComponent
    ├── ChatHistoryComponent
    │   └── BubbleMessageComponent
    ├── ChatInputComponent
    └── GenericButtonComponent
```

---

## 🏗️ Production Build

```bash id="prod"
npm run build-plugin
npm run build:prod
```

Output: `dist/`

Serve with nginx or any static server.

---

### Example nginx config

```nginx id="nginx"
server {
    listen 80;
    root /var/www/ollmark/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /plugin.js {
        add_header Cache-Control "public, max-age=3600";
    }
}
```

---

## 🧪 Tests

```bash id="tests"
npm test
npm run test:coverage
```

---

## 📚 Documentation

Generate documentation with **Compodoc**:

```bash id="docs"
npm run docs
```

Output: `documentation/index.html`
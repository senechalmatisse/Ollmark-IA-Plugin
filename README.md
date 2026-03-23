# OllMark — Plugin IA Penpot (Frontend)

Plugin Penpot propulsé par Angular 20 et Vite, permettant d'interagir avec
le backend `penpot-ai-server` via un assistant conversationnel directement
intégré dans l'interface de design.

---

## Sommaire

1. [Vue d'ensemble de l'architecture](#vue-densemble-de-larchitecture)
2. [Prérequis](#prérequis)
3. [Guide utilisateur — démarrage rapide](#guide-utilisateur--démarrage-rapide)
   - [3.1 Cloner le dépôt](#31-cloner-le-dépôt)
   - [3.2 Installer les dépendances](#32-installer-les-dépendances)
   - [3.3 Configurer les environnements](#33-configurer-les-environnements)
   - [3.4 Builder le plugin (`plugin.js`)](#34-builder-le-plugin-pluginjs)
   - [3.5 Lancer le serveur de développement](#35-lancer-le-serveur-de-développement)
   - [3.6 Charger le plugin dans Penpot](#36-charger-le-plugin-dans-penpot)
   - [3.7 Vérifier le bon fonctionnement](#37-vérifier-le-bon-fonctionnement)
4. [Configurations disponibles](#configurations-disponibles)
5. [Variables d'environnement](#variables-denvironnement)
6. [Architecture interne](#architecture-interne)
   - [Flux de communication complet](#flux-de-communication-complet)
   - [Couche de services Angular](#couche-de-services-angular)
   - [Composants UI](#composants-ui)
7. [Build de production](#build-de-production)
8. [Tests](#tests)
9. [Documentation technique](#documentation-technique)
10. [Pistes d'amélioration suggérées](#pistes-damélioration-suggérées)

---

## Vue d'ensemble de l'architecture

```
┌───────────────────────────────────────────────────────────────┐
│                     Penpot Designer                           │
│                                                               │
│   ┌──────────────────────────────────────────────────────┐    │
│   │             plugin.ts (sandbox isolé)                │    │
│   │  • API Penpot (createRectangle, findShapes…)         │    │
│   │  • TASK_HANDLERS (executeCode, fetchStructure)       │    │
│   │  ← postMessage →                                     │    │
│   └──────────────┬───────────────────────────────────────┘    │
│                  │ penpot.ui.onMessage / sendMessage          │
│   ┌──────────────▼───────────────────────────────────────┐    │
│   │         iframe Angular (ce projet)                   │    │
│   │                                                      │    │
│   │  PluginBridgeService ←→ postMessage                  │    │
│   │  WebSocketService    ←→ ws://backend/plugin          │    │
│   │  ChatFacadeService   ←→ HTTP /api/ai/*               │    │
│   │                                                      │    │
│   │  ChatContainerComponent                              │    │
│   │     ├── ChatHistoryComponent (messages)              │    │
│   │     └── ChatInputComponent   (saisie)                │    │
│   └──────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
                        │ WebSocket
                        ▼
              penpot-ai-server :8080
```

> **Contrainte sandbox Penpot** : `plugin.ts` s'exécute dans un contexte
> isolé sans accès aux APIs browser (`WebSocket`, `fetch`, `localStorage`).
> Toute communication réseau doit passer par l'iframe Angular.

---

## Prérequis

| Outil | Version minimale | Notes |
|-------|-----------------|-------|
| Node.js | 20 LTS | Requis par Angular CLI 20 |
| npm | 10+ | Inclus avec Node 20 |
| Penpot | Instance accessible | Cloud (`design.penpot.app`) ou self-hosted |
| `penpot-ai-server` | — | Backend Spring Boot démarré et accessible |

---

## Guide utilisateur — démarrage rapide

### 3.1 Cloner le dépôt

```bash
git clone <url-du-dépôt>
cd ollmark-plugin   # ou le nom du dossier
```

### 3.2 Installer les dépendances

```bash
npm install
```

### 3.3 Configurer les environnements

Les fichiers d'environnement se trouvent dans `src/environments/`.  
Modifiez le fichier correspondant à votre configuration cible :

**`src/environments/environment.ts`** (développement local) :

```typescript
export const environment = {
    production: false,
    apiBaseUrl: 'http://localhost:8080',         // URL du backend Spring Boot
    websocketUrl: 'ws://localhost:8080/plugin',  // URL WebSocket du backend
    wsAuthToken: 'VOTRE_TOKEN_ICI',              // Token d'authentification WS
};
```

**`src/environments/environment.development.ts`** (développement sur serveur distant) :

```typescript
export const environment = {
    production: false,
    apiBaseUrl: 'http://10.130.163.57:50030',
    websocketUrl: 'ws://10.130.163.57:50030/plugin',
    wsAuthToken: 'VOTRE_TOKEN_ICI',
};
```

> **Note :** Le `wsAuthToken` doit correspondre à un token accepté par
> `PluginWebSocketHandler` côté backend. Une connexion refusée retourne
> le code WebSocket `1008` (POLICY_VIOLATION) et bloque toute reconnexion.

**Proxy Vite (développement uniquement)**

En mode `dev server`, Vite proxifie automatiquement `/api` et `/plugin`
vers le backend. L'URL cible est lue depuis la variable d'environnement
`BACKEND_TARGET` (défaut : `http://10.130.163.57:8080`) :

```bash
BACKEND_TARGET=http://localhost:8080 npm run start:development
```

### 3.4 Builder le plugin (`plugin.js`)

Le worker `plugin.ts` doit être compilé séparément **avant** de charger
le plugin dans Penpot. Ce fichier est servi statiquement depuis `public/`.

```bash
npm run build-plugin
```

Cela produit `public/plugin.js` via esbuild (bundle sans module bundler,
compatible avec le sandbox Penpot).

> **À faire à chaque modification de `plugin.ts`.** Le build Angular principal
> ne compile pas ce fichier.

### 3.5 Lancer le serveur de développement

```bash
# Profil local (pointe vers localhost:8080)
npm run start

# Profil développement (pointe vers le serveur distant)
npm run start:development

# Profil preprod
npm run start:preprod
```

L'application est accessible sur : **`http://localhost:4200`**

### 3.6 Charger le plugin dans Penpot

1. Ouvrez Penpot (`design.penpot.app` ou votre instance self-hosted)
2. Ouvrez un fichier de design
3. Cliquez sur le menu **hamburger** (☰) en haut à gauche
4. Sélectionnez **Plugins** → **Gérer les plugins**
5. Cliquez sur **Ajouter un plugin**
6. Collez l'URL du manifest :

```
http://localhost:4200/manifest.json
```

7. Confirmez — le plugin **OllMark - Assistant IA** apparaît dans la liste
8. Cliquez sur **Ouvrir** pour lancer le panneau latéral

> **En production** : remplacez `http://localhost:4200` par l'URL publique
> où le build est servi (nginx, CDN, etc.).

### 3.7 Vérifier le bon fonctionnement

Une fois le plugin ouvert dans Penpot :

| Étape | Attendu |
|-------|---------|
| Panneau ouvert | Interface de chat visible, thème synchronisé avec Penpot |
| Indicateur de connexion | Statut `connected` (vert) |
| Envoi d'un message | Bulle utilisateur + placeholder de chargement |
| Réponse reçue | Bulle assistant avec contenu |
| Élément créé | Forme visible sur le canvas Penpot |

Si l'indicateur reste `disconnected`, vérifiez que :
- Le backend `penpot-ai-server` est démarré et accessible
- Le `wsAuthToken` correspond entre le frontend et le backend
- Les CORS sont configurés pour accepter l'origine Penpot (`cors.allowed-origins` dans `application.yml`)

---

## Configurations disponibles

| Configuration | Commande | Backend cible | Usage |
|--------------|----------|---------------|-------|
| `development` | `npm run start:development` | `10.130.163.57:50030` | Dev sur serveur partagé |
| `preprod` | `npm run start:preprod` | Variable `BACKEND_TARGET` | Recette |
| `production` | `npm run start:prod` | `localhost:8080` | Prod (proxy nginx) |
| (défaut) | `npm run start` | `localhost:8080` | Dev local |

---

## Variables d'environnement

| Variable | Description | Défaut (`environment.ts`) |
|----------|-------------|--------------------------|
| `apiBaseUrl` | URL de base de l'API REST Spring Boot | `http://localhost:8080` |
| `websocketUrl` | URL WebSocket du backend | `ws://localhost:8080/plugin` |
| `wsAuthToken` | Token transmis en query param `?userToken=` à la connexion WS | — |

**Variable shell pour le proxy Vite :**

| Variable | Description | Défaut |
|----------|-------------|--------|
| `BACKEND_TARGET` | URL cible du proxy `/api` et `/plugin` | `http://10.130.163.57:8080` |

---

## Architecture interne

### Flux de communication complet

```
Utilisateur
    │ tape un message
    ▼
ChatInputComponent
    │ (messageSent)
    ▼
ChatContainerComponent
    │ facade.sendMessage(text)
    ▼
ChatFacadeService
    │ 1. state.addUserMessage()
    │ 2. state.addLoadingMessage() → loadingId
    │ 3. api.sendMessage(projectId, text, sessionId)
    ▼
ChatApiService  →  POST /api/ai/chat
                        │
              penpot-ai-server reçoit la requête
                        │
              LLM génère un tool call
                        │
              PluginBridgeAdapter envoie via WebSocket
                        │
    WebSocketService.onmessage ← WS message
                        │
                        ▼
PluginBridgeService.send({ type: 'execute-task', ... })
                        │ postMessage vers plugin.ts
                        ▼
plugin.ts : TASK_HANDLERS['executeCode'](taskId, params)
                        │ penpot.createRectangle() etc.
                        ▼
plugin.ts : sendTaskResult(taskId, true, { result, log })
                        │ postMessage vers l'iframe
                        ▼
PluginBridgeService.taskResult$
                        │
                        ▼
WebSocketService → WS → penpot-ai-server
                        │
              LLM reçoit le résultat, génère la réponse textuelle
                        │
              HTTP 200 { success: true, response: "..." }
                        │
                        ▼
                ChatFacadeService
                        │ state.resolveMessage(loadingId, response)
                        ▼
ChatStateService → signal → ChatHistoryComponent → rendu
```

### Couche de services Angular

| Service | Responsabilité |
|---------|---------------|
| `PluginBridgeService` | Transport `postMessage` ↔ `plugin.ts`. Source de vérité pour `projectId`, `theme`, `connectionStatus` |
| `WebSocketService` | Connexion WebSocket avec Spring Boot. Reconnexion exponentielle via `ReconnectionManager` |
| `SessionStore` | Store partagé du `sessionId` WebSocket entre transport et couche métier |
| `ChatFacadeService` | Orchestrateur pattern Facade. Seul point d'entrée pour les composants |
| `ChatStateService` | Store d'état pur (messages, isLoading). Aucun appel HTTP |
| `ChatApiService` | Gateway HTTP uniquement. Normalise les erreurs en `ApiError` |
| `HistoryLoaderService` | Chargement ponctuel de l'historique au démarrage (timeout 8 s, best-effort) |

### Composants UI

```
AppComponent                   ← shell, synchronise le thème Penpot
└── ChatContainerComponent     ← Smart Component, injecte ChatFacadeService
        ├── ChatHistoryComponent   ← Dumb, reçoit messages[], scroll auto
        │   └── BubbleMessageComponent ← Dumb, hérite MessageComponent
        ├── ChatInputComponent     ← Dumb, auto-resize, Enter pour envoyer
        └── GenericButtonComponent ← bouton réutilisable (primary/ghost/danger)
```

---

## Build de production

```bash
# Construire plugin.ts en premier
npm run build-plugin

# Build Angular de production
npm run build:prod
```

Les artefacts sont générés dans `dist/`. Servez ce dossier avec nginx ou
tout serveur de fichiers statiques en exposant le port attendu par Penpot.

**Exemple de configuration nginx minimale :**

```nginx
server {
    listen 80;
    root /var/www/ollmark/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /plugin.js {
        # plugin.ts compilé, mis en cache agressivement
        add_header Cache-Control "public, max-age=3600";
    }
}
```

---

## Tests

```bash
# Tests unitaires (Karma + Jasmine)
npm test

# Tests avec rapport de couverture
npm run test:coverage
```

---

## Documentation technique

La JSDoc est complète sur tous les services, composants et modèles.
Pour générer la documentation HTML avec Compodoc :

```bash
npm run docs
```

La documentation est générée dans `documentation/` et peut être ouverte
directement dans un navigateur (`documentation/index.html`).
/**
 * plugin.ts — Worker du plugin Penpot OllMark
 *
 * Ce fichier s'exécute dans le **sandbox isolé** de Penpot (`safeEvaluate`).
 * Il n'a accès à aucune API browser native : pas de `WebSocket`, `fetch`,
 * `localStorage`, ni de `window` global standard.
 *
 * ── Architecture de communication ──────────────────────────────────────────
 *
 * ```
 * Spring Boot <─ WebSocket ─> Angular UI (WebSocketService)
 *                                      ↕ postMessage
 *                              Angular UI (PluginBridgeService)
 *                                      ↕ penpot.ui.onMessage / sendMessage
 *                              plugin.ts  (ce fichier)
 *                                      ↓ API Penpot
 *                              penpot.currentPage, shapes…
 * ```
 *
 * ── Pattern Command (GoF Behavioural) ──────────────────────────────────────
 * Le dispatcher de tâches ({@link handleTask}) utilise une `Map` de handlers
 * ({@link TASK_HANDLERS}) plutôt qu'un `switch`. Ajouter une nouvelle tâche
 * = ajouter une entrée dans `TASK_HANDLERS` sans modifier le dispatcher.
 * → Principe Ouvert/Fermé (OCP).
 *
 * ── Messages supportés ─────────────────────────────────────────────────────
 *
 * | `type`               | Direction       | Description                         |
 * |----------------------|-----------------|-------------------------------------|
 * | `'get-project'`      | UI → plugin     | Demande l'ID de la page active      |
 * | `'project-response'` | plugin → UI     | Retourne l'ID de la page active     |
 * | `'execute-task'`     | UI → plugin     | Exécute une tâche backend           |
 * | `'task-result'`      | plugin → UI     | Retourne le résultat d'une tâche    |
 * | `'theme'`            | plugin → UI     | Relaie le thème Penpot courant      |
 *
 * @module plugin
 * @since 1.0.0
 */

// ── Ouverture du panneau UI ──────────────────────────────────────────────────
penpot.ui.open('OllMark - Assistant IA', `?theme=${penpot.theme}`, {
    width: 400,
    height: 650,
});

// ── Helpers de communication plugin → UI ────────────────────────────────────

/**
 * Poste un message sérialisé vers l'iframe Angular via l'API Penpot.
 *
 * @param msg - Objet à transmettre. Doit être sérialisable en JSON structuré clonable.
 *
 * @internal
 */
function sendToUi(msg: object): void {
    penpot.ui.sendMessage(msg);
}

/**
 * Construit et envoie un message `task-result` vers l'UI Angular.
 *
 * Ce message est consommé par `PluginBridgeService.taskResult$`, qui le
 * retransmet au backend Spring Boot via WebSocket encapsulé dans un
 * `TaskResponseEnvelope`.
 *
 * @param taskId  - Identifiant UUID de la tâche d'origine (corrélation backend).
 * @param success - `true` si la tâche s'est exécutée sans erreur.
 * @param data    - Données retournées par la tâche. `null` en cas d'échec.
 * @param error   - Message d'erreur. Absent ou `undefined` si `success` est `true`.
 *
 * @internal
 */
function sendTaskResult(
    taskId: string,
    success: boolean,
    data: unknown,
    error?: string
): void {
    sendToUi({
        type: 'task-result',
        taskId,
        success,
        data: data  ?? null,
        error: error ?? null,
    });
}

/**
 * Extrait un message d'erreur lisible depuis une valeur `unknown` capturée.
 *
 * Résout les deux règles SonarQube suivantes :
 * - **S3358** : ternaires imbriqués → remplacés par des `if/else` explicites.
 * - **S6551** : `String(obj)` sur un objet sans `toString()` → remplacé par
 *   `JSON.stringify()` pour les objets structurés, garantissant un message lisible.
 *
 * ### Ordre de résolution
 * 1. `err instanceof Error` → `err.message` (string garanti par le standard)
 * 2. `typeof err === 'object'` → `JSON.stringify(err)` (objets structurés)
 * 3. Fallback → `String(err)` (primitives : string, number, boolean…)
 *
 * @param err - Valeur capturée dans un bloc `catch`.
 * @returns Message d'erreur sous forme de chaîne lisible.
 *
 * @internal
 */
function toErrorMessage(err: unknown): string {
    if (err instanceof Error) {
        return err.message;
    }
    if (typeof err === 'object' && err !== null) {
        return JSON.stringify(err);
    }
    return String(err);
}

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Enveloppe d'un message `execute-task` reçu depuis l'UI Angular.
 * Correspond au message émis par `PluginBridgeService.send({ type: 'execute-task', ... })`.
 *
 * @internal
 */
interface TaskEnvelope {
    type: 'execute-task';
    taskId: string;
    task: string;
    params: Record<string, unknown>;
}

/**
 * Signature commune de tous les handlers de tâches enregistrés dans {@link TASK_HANDLERS}.
 *
 * @param taskId - Identifiant UUID de la tâche à exécuter.
 * @param params - Paramètres spécifiques à la tâche.
 *
 * @internal
 */
type TaskHandler = (
    taskId: string,
    params: Record<string, unknown>
) => void | Promise<void>;

// ── Handlers de tâches ────────────────────────────────────────────────────────

/**
 * Exécute du JavaScript généré par l'IA dans le contexte de l'API Penpot.
 *
 * Le code est exécuté via `new Function()` avec `penpot` et un `console`
 * de capture injectés comme paramètres. Les logs produits par le code
 * (`console.log`, `console.warn`, `console.error`) sont collectés et retournés
 * dans le champ `log` du résultat pour débogage côté backend.
 *
 * ### Sécurité sandbox
 * L'exécution est déjà confinée dans le sandbox Penpot (`safeEvaluate`).
 * `"use strict"` est appliqué dans le corps de la fonction pour lever
 * des erreurs explicites sur les affectations invalides.
 *
 * @param taskId - Identifiant UUID de la tâche, pour la corrélation du résultat.
 * @param params - Doit contenir `{ code: string }` — le code JavaScript à exécuter.
 * @returns Promesse résolue après exécution (succès ou erreur absorbée).
 *
 * @internal
 */
async function handleExecuteCode(
    taskId: string,
    params: Record<string, unknown>
): Promise<void> {
    const code = params['code'] as string | undefined;
    if (!code) {
        sendTaskResult(taskId, false, null, 'Missing required param: code');
        return;
    }

    const logs: string[] = [];
    const captureLog = (...args: unknown[]): void => {
        logs.push(args.map(String).join(' '));
    };

    try {
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const fn = new Function(
            'penpot',
            'console',
            `"use strict"; return (async () => { ${code} })()`
        );
        const result = await fn(penpot, {
            log: captureLog,
            warn: captureLog,
            error: captureLog,
        });
        sendTaskResult(taskId, true, { result: result ?? null, log: logs.join('\n') });
    } catch (err: unknown) {
        const message = toErrorMessage(err);
        console.error('[OllMark plugin] executeCode error:', message);
        sendTaskResult(taskId, false, null, message);
    }
}

/**
 * Retourne l'arbre aplati des formes de la page Penpot courante.
 *
 * Chaque forme est sérialisée avec ses propriétés de base (position,
 * dimensions, référence au parent). La structure retournée est plate :
 * elle ne représente pas la hiérarchie réelle des layers, qui doit être
 * interrogée via les tools d'inspection (`getChildrenFromShape`, etc.).
 *
 * @param taskId - Identifiant UUID de la tâche, pour la corrélation du résultat.
 *
 * @internal
 */
function handleFetchStructure(taskId: string): void {
    try {
        const page = penpot.currentPage;
        if (!page) {
            sendTaskResult(taskId, false, null, 'No active Penpot page');
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
            parentId: s.parent?.id ?? null,
        }));

        sendTaskResult(taskId, true, { shapes, pageId: page.id });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        sendTaskResult(taskId, false, null, message);
    }
}

// ── Registre des handlers ────────────────────────────

/**
 * Registre immuable associant chaque nom de tâche à son handler.
 *
 * ### Extension sans modification
 * Pour ajouter une nouvelle tâche, ajouter une entrée ici.
 * `handleTask()` n'a pas besoin d'être modifié.
 *
 * @example
 * ```typescript
 * // Ajout d'une tâche 'exportAsset'
 * const TASK_HANDLERS: Readonly<Record<string, TaskHandler>> = {
 *   executeCode:    (id, params) => handleExecuteCode(id, params),
 *   fetchStructure: (id)         => handleFetchStructure(id),
 *   exportAsset:    (id, params) => handleExportAsset(id, params), // ← nouveau
 * };
 * ```
 *
 * @internal
 */
const TASK_HANDLERS: Readonly<Record<string, TaskHandler>> = {
    executeCode: (id, params) => handleExecuteCode(id, params),
    fetchStructure: (id) => handleFetchStructure(id),
};

// ── Dispatcher de tâches ─────────────────────────────────────────────────────

/**
 * Route une tâche reçue vers le handler correspondant du registre.
 *
 * Si aucun handler ne correspond au nom de la tâche, un résultat d'erreur
 * est renvoyé immédiatement sans lever d'exception.
 *
 * @param envelope - Enveloppe complète du message `execute-task`.
 * @returns Promesse résolue après exécution du handler (ou envoi de l'erreur).
 *
 * @internal
 */
async function handleTask(envelope: TaskEnvelope): Promise<void> {
    const { taskId, task, params } = envelope;
    const handler = TASK_HANDLERS[task];
    if (handler) await handler(taskId, params);
    else sendTaskResult(taskId, false, null, `Unknown task: ${task}`);
}

// ── Écoute des messages UI → plugin ──────────────────────────────────────────

/**
 * Point d'entrée unique des messages entrants depuis l'iframe Angular.
 *
 * ### Messages traités
 *
 * | `type`           | Action                                                          |
 * |------------------|-----------------------------------------------------------------|
 * | `'get-project'`  | Retourne l'ID de la page active via `'project-response'`.      |
 * |                  | Ne répond PAS si `currentPage` est absent - l'UI reste en      |
 * |                  | état "pending" plutôt que de recevoir un ID fantôme.           |
 * | `'execute-task'` | Délègue à `handleTask()` pour l'exécution dans le registre.    |
 *
 * Les messages sans propriété `type` et les types inconnus sont ignorés.
 */
penpot.ui.onMessage<{ type: string; [key: string]: unknown }>((msg) => {
    if (!msg?.type) return;
    switch (msg.type) {
        case 'get-project': {
            const id = penpot.currentPage?.id;
            if (!id) {
                console.warn('[OllMark plugin] get-project: no active page — not responding');
                return;
            }
            sendToUi({ type: 'project-response', id });
            break;
        }

        case 'execute-task':
            handleTask(msg as unknown as TaskEnvelope);
            break;

        default:
            break;
    }
});

// ── Relay du thème Penpot ────────────────────────────────────────────────────

/**
 * Relaie les changements de thème Penpot vers l'UI Angular.
 *
 * L'événement `themechange` est émis par Penpot quand l'utilisateur bascule
 * entre thème clair et sombre dans l'interface Penpot.
 * `AppComponent` réagit à ce message pour mettre à jour l'attribut
 * `data-theme` sur `<html>` via le signal `PluginBridgeService.theme()`.
 */
penpot.on('themechange', (theme: 'light' | 'dark') => {
    sendToUi({ type: 'theme', theme });
});
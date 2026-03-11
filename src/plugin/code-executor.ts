import type { ExecutionResult, PluginTaskRequest } from './plugin-types';

/**
 * Exécute le code JavaScript reçu depuis le backend
 * dans un scope contrôlé où seul `penpot` est injecté.
 *
 * Utilise `new Function()` au lieu de `eval()` afin de limiter le scope.
 */
export class CodeExecutor {
    async execute(task: PluginTaskRequest): Promise<ExecutionResult> {
        const code = task.params.code;

        if (typeof code !== 'string' || code.trim().length === 0) {
        return {
            success: false,
            error: 'Missing or empty task.params.code',
        };
        }

        try {
        /**
         * Le runtime Penpot expose `penpot` globalement dans la sandbox.
         * Pour éviter une erreur TypeScript dans le contexte Angular/test,
         * on le lit via `globalThis`.
         */
        const penpotApi = (globalThis as typeof globalThis & { penpot?: unknown }).penpot;

        const fn = new Function(
            'penpot',
            `
            "use strict";
            return (function () {
            ${code}
            })();
            `
        ) as (penpotApi: unknown) => unknown;

        const result = await Promise.resolve(fn(penpotApi));

        return {
            success: true,
            data: result,
        };
        } catch (error: unknown) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
        }
    }
    }
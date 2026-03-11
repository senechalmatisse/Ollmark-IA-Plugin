import { CodeExecutor } from './code-executor';
import type { PluginTaskRequest } from './plugin-types';

/**
 * Tests unitaires de {@link CodeExecutor}.
 *
 * Objectifs :
 * - vérifier l'exécution correcte d'un code JavaScript valide
 * - vérifier l'injection de l'objet `penpot` dans le scope contrôlé
 * - vérifier la gestion des erreurs de validation
 * - vérifier la capture propre des erreurs runtime
 *
 * Remarque :
 * `CodeExecutor.execute()` retourne une Promise, les tests utilisent donc
 * `async/await`.
 */
describe('CodeExecutor', () => {
    let executor: CodeExecutor;

    beforeEach(() => {
        executor = new CodeExecutor();

        /**
         * Mock minimal du runtime Penpot injecté dans le scope d'exécution.
         * On l'attache à globalThis pour reproduire le comportement attendu
         * dans la sandbox plugin.
         */
        (globalThis as typeof globalThis & { penpot: unknown }).penpot = {
            theme: 'dark',
            currentPage: {
                id: 'page-1',
            },
        };
    });

    afterEach(() => {
        delete (globalThis as typeof globalThis & { penpot?: unknown }).penpot;
    });

    /**
     * Fabrique une tâche plugin minimale pour les tests.
     *
     * @param code Code JavaScript à exécuter dans le CodeExecutor
     * @returns Requête de tâche conforme au contrat PluginTaskRequest
     */
    function createTask(code: string): PluginTaskRequest {
        return {
        id: 'task-1',
        task: 'executeCode',
        params: { code },
        };
    }

    it('should return success and data when code executes correctly', async () => {
        const result = await executor.execute(createTask('return 42;'));

        expect(result.success).toBeTrue();
        expect(result.data).toBe(42);
        expect(result.error).toBeUndefined();
    });

    it('should inject penpot into the execution scope', async () => {
        const result = await executor.execute(createTask('return penpot.theme;'));

        expect(result.success).toBeTrue();
        expect(result.data).toBe('dark');
    });

    it('should access nested penpot properties when available', async () => {
        const result = await executor.execute(
        createTask('return penpot.currentPage.id;')
        );

        expect(result.success).toBeTrue();
        expect(result.data).toBe('page-1');
    });

    it('should return an error when code is empty', async () => {
        const result = await executor.execute(createTask(''));

        expect(result.success).toBeFalse();
        expect(result.error).toContain('Missing or empty');
        expect(result.data).toBeUndefined();
    });

    it('should return an error when code contains only whitespace', async () => {
        const result = await executor.execute(createTask('   \n   '));

        expect(result.success).toBeFalse();
        expect(result.error).toContain('Missing or empty');
    });

    it('should catch thrown errors', async () => {
        const result = await executor.execute(
        createTask('throw new Error("boom");')
        );

        expect(result.success).toBeFalse();
        expect(result.error).toBe('boom');
        expect(result.data).toBeUndefined();
    });

    it('should catch runtime javascript errors', async () => {
        const result = await executor.execute(
        createTask('return unknownVariable;')
        );

        expect(result.success).toBeFalse();
        expect(result.error).toBeTruthy();
        expect(result.data).toBeUndefined();
    });

    it('should support promise-like returned values', async () => {
        const result = await executor.execute(
        createTask('return Promise.resolve("async-result");')
        );

        expect(result.success).toBeTrue();
        expect(result.data).toBe('async-result');
    });
});
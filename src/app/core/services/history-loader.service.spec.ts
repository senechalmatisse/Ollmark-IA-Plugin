import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

import { HistoryLoaderService } from './history-loader.service';
import { ChatApiService } from './chat-api.service';
import { ChatStateService } from './chat-state.service';

/**
 * Tests unitaires de {@link HistoryLoaderService}.
 *
 * Stratégie :
 *   - `ChatApiService` et `ChatStateService` sont remplacés par des spies
 *     Jasmine pour isoler complètement `HistoryLoaderService`.
 *   - `jasmine.clock()` est utilisé pour simuler le timeout sans attendre
 *     8 secondes réelles.
 *   - Tous les tests vérifient que `loadHistory` ne rejette jamais
 *     (les erreurs sont intentionnellement absorbées).
 *
 * Naming : `should[Description]_given[Context]`
 */
describe('HistoryLoaderService', () => {
    let service: HistoryLoaderService;
    let apiSpy: jasmine.SpyObj<ChatApiService>;
    let stateSpy: jasmine.SpyObj<ChatStateService>;

    const PROJECT_ID = 'ddc4a96c-d2ad-80ac-8007-b6f8a1ae8d41';

    const HISTORY_ITEMS = [
        { role: 'user',      content: 'Crée un rectangle bleu' },
        { role: 'assistant', content: 'Rectangle créé avec succès !' },
    ];

    // ── Setup ──────────────────────────────────────────────────────────────────

    beforeEach(() => {
        apiSpy = jasmine.createSpyObj<ChatApiService>('ChatApiService', [
            'getChatHistory',
        ]);
        stateSpy = jasmine.createSpyObj<ChatStateService>('ChatStateService', [
            'hydrateHistory',
        ]);

        TestBed.configureTestingModule({
            providers: [
                HistoryLoaderService,
                { provide: ChatApiService,   useValue: apiSpy   },
                { provide: ChatStateService, useValue: stateSpy },
            ],
        });

        service = TestBed.inject(HistoryLoaderService);
    });

    // =========================================================================
    // Cas nominal — historique disponible
    // =========================================================================

    describe('loadHistory() — success cases', () => {

        it('should_call_getChatHistory_with_projectId_and_limit_20_given_valid_projectId', async () => {
            apiSpy.getChatHistory.and.returnValue(of(HISTORY_ITEMS));

            await service.loadHistory(PROJECT_ID);

            expect(apiSpy.getChatHistory).toHaveBeenCalledOnceWith(PROJECT_ID, 20);
        });

        it('should_call_hydrateHistory_with_items_given_non_empty_response', async () => {
            apiSpy.getChatHistory.and.returnValue(of(HISTORY_ITEMS));

            await service.loadHistory(PROJECT_ID);

            expect(stateSpy.hydrateHistory).toHaveBeenCalledOnceWith(HISTORY_ITEMS);
        });

        it('should_resolve_without_throwing_given_successful_response', async () => {
            apiSpy.getChatHistory.and.returnValue(of(HISTORY_ITEMS));

            await expectAsync(service.loadHistory(PROJECT_ID)).toBeResolved();
        });
    });

    // =========================================================================
    // Cas vide — historique absent
    // =========================================================================

    describe('loadHistory() — empty history', () => {

        it('should_not_call_hydrateHistory_given_empty_array_response', async () => {
            apiSpy.getChatHistory.and.returnValue(of([]));

            await service.loadHistory(PROJECT_ID);

            expect(stateSpy.hydrateHistory).not.toHaveBeenCalled();
        });

        it('should_not_call_hydrateHistory_given_null_response', async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            apiSpy.getChatHistory.and.returnValue(of(null as any));

            await service.loadHistory(PROJECT_ID);

            expect(stateSpy.hydrateHistory).not.toHaveBeenCalled();
        });

        it('should_resolve_without_throwing_given_empty_response', async () => {
            apiSpy.getChatHistory.and.returnValue(of([]));

            await expectAsync(service.loadHistory(PROJECT_ID)).toBeResolved();
        });

        it('should_log_no_history_found_given_empty_response', async () => {
            spyOn(console, 'log');
            apiSpy.getChatHistory.and.returnValue(of([]));

            await service.loadHistory(PROJECT_ID);

            expect(console.log).toHaveBeenCalledWith(
                jasmine.stringContaining('No history found'),
                PROJECT_ID
            );
        });
    });

    // =========================================================================
    // Cas d'erreur réseau
    // =========================================================================

    describe('loadHistory() — network error', () => {

        it('should_not_call_hydrateHistory_given_api_error', async () => {
            apiSpy.getChatHistory.and.returnValue(
                throwError(() => new Error('Network error'))
            );

            await service.loadHistory(PROJECT_ID);

            expect(stateSpy.hydrateHistory).not.toHaveBeenCalled();
        });

        it('should_resolve_without_throwing_given_api_error', async () => {
            apiSpy.getChatHistory.and.returnValue(
                throwError(() => new Error('Network error'))
            );

            await expectAsync(service.loadHistory(PROJECT_ID)).toBeResolved();
        });

        it('should_warn_with_error_message_given_Error_instance', async () => {
            spyOn(console, 'warn');
            apiSpy.getChatHistory.and.returnValue(
                throwError(() => new Error('Connection refused'))
            );

            await service.loadHistory(PROJECT_ID);

            expect(console.warn).toHaveBeenCalledWith(
                jasmine.stringContaining('Could not load history'),
                PROJECT_ID,
                '-',
                'Connection refused'
            );
        });

        it('should_warn_with_raw_error_given_non_Error_thrown', async () => {
            spyOn(console, 'warn');
            const rawError = { code: 503, detail: 'Unavailable' };
            apiSpy.getChatHistory.and.returnValue(
                throwError(() => rawError)
            );

            await service.loadHistory(PROJECT_ID);

            expect(console.warn).toHaveBeenCalledWith(
                jasmine.stringContaining('Could not load history'),
                PROJECT_ID,
                '-',
                rawError
            );
        });

        it('should_absorb_error_and_not_propagate_given_unexpected_exception', async () => {
            apiSpy.getChatHistory.and.returnValue(
                throwError(() => new TypeError('Unexpected type error'))
            );

            // Ne doit pas rejeter — `loadHistory` est best-effort
            await expectAsync(service.loadHistory(PROJECT_ID)).toBeResolved();
        });
    });

    // =========================================================================
    // Cas timeout
    // =========================================================================

    describe('loadHistory() — timeout', () => {

        beforeEach(() => jasmine.clock().install());
        afterEach(() => jasmine.clock().uninstall());

        it('should_warn_with_timeout_message_given_response_exceeds_8000ms', async () => {
            spyOn(console, 'warn');

            // Observable qui n'émet jamais (simule un serveur qui ne répond pas)
            apiSpy.getChatHistory.and.returnValue(
                of(HISTORY_ITEMS).pipe(delay(10_000))
            );

            const promise = service.loadHistory(PROJECT_ID);
            jasmine.clock().tick(8_001);
            await promise;

            expect(console.warn).toHaveBeenCalledWith(
                jasmine.stringContaining('Timeout after 8000ms')
            );
        });

        it('should_not_call_hydrateHistory_given_timeout', async () => {
            apiSpy.getChatHistory.and.returnValue(
                of(HISTORY_ITEMS).pipe(delay(10_000))
            );

            const promise = service.loadHistory(PROJECT_ID);
            jasmine.clock().tick(8_001);
            await promise;

            expect(stateSpy.hydrateHistory).not.toHaveBeenCalled();
        });

        it('should_resolve_without_throwing_given_timeout', async () => {
            apiSpy.getChatHistory.and.returnValue(
                of(HISTORY_ITEMS).pipe(delay(10_000))
            );

            const promise = service.loadHistory(PROJECT_ID);
            jasmine.clock().tick(8_001);

            await expectAsync(promise).toBeResolved();
        });

        it('should_complete_within_timeout_given_fast_response', async () => {
            // Réponse avant le timeout — ne doit PAS passer dans le catch TimeoutError
            spyOn(console, 'warn');
            apiSpy.getChatHistory.and.returnValue(of(HISTORY_ITEMS));

            await service.loadHistory(PROJECT_ID);

            expect(console.warn).not.toHaveBeenCalled();
            expect(stateSpy.hydrateHistory).toHaveBeenCalled();
        });
    });

    // =========================================================================
    // Invariant — ne jamais rejeter
    // =========================================================================

    describe('loadHistory() — never rejects invariant', () => {

        const errorCases: { label: string; error: unknown }[] = [
            { label: 'Error instance',   error: new Error('boom') },
            { label: 'TypeError',        error: new TypeError('type mismatch') },
            { label: 'plain object',     error: { code: 500 } },
            { label: 'string',           error: 'string error' },
            { label: 'null',             error: null },
        ];

        errorCases.forEach(({ label, error }) => {
            it(`should_resolve_without_throwing_given_${label.replace(/\s/g, '_')}`, async () => {
                apiSpy.getChatHistory.and.returnValue(throwError(() => error));

                await expectAsync(service.loadHistory(PROJECT_ID)).toBeResolved();
            });
        });
    });
});
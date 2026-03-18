import { Injectable, effect, inject, untracked } from '@angular/core';
import { firstValueFrom, timeout, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  ChatApiService,
  ChatStateService,
  PluginBridgeService,
  HistoryLoaderService,
  SessionStore,
} from '.';
import { ApiError } from '../models/api-error.model';
import { detectPromptIntent } from '../utils/prompt-intent.util';

/**
 * Couche d'orchestration centrale du chat (pattern Facade).
 *
 * Point d'entrée **unique** pour les composants feature : ils n'ont besoin
 * d'injecter que ce service pour accéder à l'état du chat, déclencher des
 * actions et lire le statut de connexion.
 *
 * ### Responsabilités
 * - Coordonne {@link ChatStateService}, {@link ChatApiService},
 *   {@link PluginBridgeService} et {@link SessionStore}.
 * - Réagit à l'arrivée du `projectId` pour déclencher le chargement
 *   de l'historique via {@link HistoryLoaderService}.
 * - Expose les signaux d'état nécessaires aux templates sans en dupliquer
 *   les sources (pas d'alias redondants).
 *
 * ### Principe Open/Closed
 * Pour ajouter une capacité (prévisualisation, …), étendre
 * cette façade sans toucher aux composants consommateurs.
 *
 * @public
 * @since 1.0.0
 * @see {@link ChatStateService} Store d'état pur (messages, isLoading).
 * @see {@link ChatApiService} Gateway HTTP vers Spring Boot.
 * @see {@link PluginBridgeService} Transport postMessage vers plugin.ts.
 * @see {@link SessionStore} État partagé du sessionId WebSocket.
 */
@Injectable({ providedIn: 'root' })
export class ChatFacadeService {
  private readonly _api = inject(ChatApiService);
  private readonly _state = inject(ChatStateService);
  private readonly _bridge = inject(PluginBridgeService);
  private readonly _session = inject(SessionStore);
  private readonly _historyLoader = inject(HistoryLoaderService);
  private readonly _destroy$ = new Subject<void>();

  readonly messages = this._state.messages;
  readonly isLoading = this._state.isLoading;
  readonly hasMessages = this._state.hasMessages;
  readonly projectId = this._bridge.projectId;

  constructor() {
    effect(() => {
      const id = this._bridge.projectId();
      if (id) untracked(() => this._historyLoader.loadHistory(id));
    });
    this._listenToBufferEvents();
  }

  async sendMessage(content: string): Promise<void> {
    const projectId = this._resolveProjectId();
    if (!projectId || !content.trim()) return;

    const sessionId = this._session.sessionId() ?? undefined;

    const operationType = detectPromptIntent(content.trim());
    console.log('[OllMark Facade] operationType:', operationType, '| prompt:', content.trim());

    this._bridge.send({ type: 'set-operation-type', operationType } as never);

    this._state.addUserMessage(content.trim());
    const loadingId = this._state.addLoadingMessage();
    this._state.setLoading(true);

    try {
      const response = await firstValueFrom(
        this._api.sendMessage(projectId, content.trim(), sessionId),
      );

      console.log('[OllMark Facade] HTTP response:', JSON.stringify(response).slice(0, 500));

            if (response.success) {
                this._state.resolveMessage(loadingId, response.response);
            } else {
                this._state.markMessageAsError(
                    loadingId,
                    response.error ?? 'Erreur inconnue du serveur'
                );
            }
        } catch (err: unknown) {
            const { message, shouldRetry } = this._resolveErrorFeedback(err, 'chat');
            this._state.markMessageAsError(loadingId, message);

            // Si le serveur est injoignable, on tente une reconnexion WS silencieuse
            if (shouldRetry) {
                console.warn('[OllMark Facade] Network error — backend may be down');
            }
        } finally {
            this._state.setLoading(false);
            // ★ Le plugin finalise la preview pour TOUS les opTypes :
            //   - create : 3 cas (shapes créées / inspection seule / texte seul)
            //   - add/modify/delete : auto-reject si l'IA n'a fait aucune modification
            this._bridge.send({ type: 'finalize-preview', operationType } as never);
        }
    }

  /**
   * Réinitialise complètement la conversation : vide l'état local
   * **et** supprime les données persistées côté backend.
   *
   * ### Ordre des appels backend
   * 1. `clearConversation()` - vide `spring_ai_chat_memory` (mémoire volatile du modèle).
   * 2. `deleteProjectConversations()` - supprime `conversations` + `messages` en cascade.
   *    Sans cet appel, les messages réapparaîtraient à la réouverture du plugin.
   * 3. `startNewConversation()` - prépare un nouveau contexte de session backend.
   *
   * ### Stratégie best-effort
   * L'état local (`clearMessages`) est vidé **avant** les appels serveur.
   * Si un appel échoue, l'UI reste vide et l'erreur est loguée - l'utilisateur
   * n'est pas bloqué par un échec réseau ponctuel.
   *
   * @returns Promesse résolue une fois toutes les opérations terminées.
   *
   * @example
   * ```typescript
   * // Dans ChatContainerComponent
   * protected onConversationCleared(): void {
   *   this.facade.resetConversation();
   * }
   * ```
   *
   * @public
   * @see {@link ChatApiService.clearConversation} Vidage de spring_ai_chat_memory.
   * @see {@link ChatApiService.deleteProjectConversations} Suppression des données persistées.
   * @see {@link ChatApiService.startNewConversation} Initialisation de la nouvelle session.
   */
  async resetConversation(): Promise<void> {
    const projectId = this._resolveProjectId();
    if (!projectId) return;
    this._cleanupPreviousStaging();
    this._state.clearMessages();
    try {
      await firstValueFrom(this._api.clearConversation(projectId).pipe(timeout(10_000)));
      await firstValueFrom(this._api.deleteProjectConversations(projectId).pipe(timeout(10_000)));
      await firstValueFrom(this._api.startNewConversation(projectId).pipe(timeout(10_000)));
    } catch (err) {
      console.warn(
        '[OllMark Facade] server call failed:',
        err instanceof Error ? err.message : err,
      );
    }
  }

  acceptPreview(bufferPageId: string, code: string): void {
    this._bridge.send({ type: 'accept-buffer', bufferPageId, code });
  }

  rejectPreview(bufferPageId: string): void {
    this._bridge.send({ type: 'reject-buffer', bufferPageId });
  }

  private _cleanupPreviousStaging(): void {
    this._bridge.send({ type: 'reset-staging' } as never);
  }

  private _listenToBufferEvents(): void {
    this._bridge.bufferPreview$.pipe(takeUntil(this._destroy$)).subscribe((payload) => {
      console.log('[OllMark Facade] Preview received');
      this._state.addPreviewMessage(payload);
    });

    this._bridge.bufferPreviewUpdate$
      .pipe(takeUntil(this._destroy$))
      .subscribe(({ bufferPageId, pngDataUrl }) => {
        this._state.updatePreviewPng(bufferPageId, pngDataUrl);
      });

    this._bridge.bufferAccepted$.pipe(takeUntil(this._destroy$)).subscribe((bufferPageId) => {
      this._state.setPreviewStatus(bufferPageId, 'accepted');
    });

    this._bridge.bufferRejected$.pipe(takeUntil(this._destroy$)).subscribe((bufferPageId) => {
      this._state.setPreviewStatus(bufferPageId, 'rejected');
    });

    this._bridge.bufferError$
      .pipe(takeUntil(this._destroy$))
      .subscribe(({ bufferPageId, error }) => {
        console.warn('[OllMark Facade] buffer error:', error);
        this._state.setPreviewStatus(bufferPageId, 'rejected');
      });
  }
    /**
     * Retourne le libellé de connexion localisé correspondant au statut courant.
     *
     * Centralise la traduction des valeurs de {@link ConnectionStatus} en
     * chaînes affichables, évitant de dupliquer cette logique dans les templates.
     *
     * @returns Libellé en français du statut courant.
     *
     * @example
     * ```html
     * <!-- chat-container.component.html -->
     * {{ facade.connectionLabel() }}
     * ```
     *
     * @public
     */
    private _resolveProjectId(): string | null {
        const id = this._bridge.projectId();
        if (!id) this._bridge.send({ type: 'get-project' });
        return id;
    }

    /**
     * Traduit une erreur capturée en feedback utilisateur et en signal de retry.
     *
     * Centralise la logique de présentation des erreurs : un seul endroit
     * à modifier pour changer les messages affichés à l'utilisateur.
     *
     * @param err     - L'erreur capturée (peut être `ApiError` ou `Error` générique).
     * @param context - Contexte d'appel pour enrichir le log ('chat' | 'reset').
     * @returns Un objet contenant le message utilisateur et un flag `shouldRetry`.
     */
    private _resolveErrorFeedback(
        err: unknown,
        context: 'chat' | 'reset'
    ): { message: string; shouldRetry: boolean  } {
         if (err instanceof ApiError) {
            console.warn(`[OllMark Facade] ${context} ApiError — type=${err.type}, status=${err.status}:`, err.message);
            return {
                message: err.message,
                shouldRetry: err.type === 'network' || err.type === 'timeout',
            };
        }

        // Erreur non HTTP (ex : TimeoutError de RxJS, erreur inattendue)
        const message = err instanceof Error ? err.message : 'Erreur de communication';
        console.warn(`[OllMark Facade] ${context} unexpected error:`, message);
        return { message, shouldRetry: false };
    }

}

import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { Subject, fromEvent, takeUntil } from 'rxjs';
import { PluginMessage, ConnectionStatus, BufferPreviewPayload } from '../models';
import { PENPOT_ORIGIN } from '../tokens/api.tokens';

interface TaskResult {
  taskId: string;
  success: boolean;
  data: unknown;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class PluginBridgeService implements OnDestroy {
  readonly projectId = signal<string | null>(null);
  readonly connectionStatus = signal<ConnectionStatus>('disconnected');
  readonly theme = signal<'light' | 'dark'>(this._readThemeFromUrl());

  /** Nom de l utilisateur courant Penpot — reçu dans project-response. */
  private readonly _userName = signal<string>('unknown');
  readonly userName = this._userName.asReadonly();

  readonly taskResult$ = new Subject<TaskResult>();
  readonly bufferPreview$ = new Subject<BufferPreviewPayload>();
  readonly bufferPreviewUpdate$ = new Subject<{ bufferPageId: string; pngDataUrl: string }>();
  readonly bufferAccepted$ = new Subject<string>();
  readonly bufferRejected$ = new Subject<string>();
  readonly bufferError$ = new Subject<{ bufferPageId: string; error: string }>();

  private readonly destroy$ = new Subject<void>();
  private readonly targetOrigin = inject(PENPOT_ORIGIN);

  constructor() {
    this._listenToPluginMessages();
    this.send({ type: 'get-project' });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.taskResult$.complete();
    this.bufferPreview$.complete();
    this.bufferPreviewUpdate$.complete();
    this.bufferAccepted$.complete();
    this.bufferRejected$.complete();
    this.bufferError$.complete();
  }

  /**
   * Envoie un message au plugin en enrichissant automatiquement chaque message
   * avec le userId (nom de l utilisateur courant).
   * Le plugin utilise userId pour router vers la bonne session utilisateur
   * et le bon buffer dédié.
   */
  send(message: PluginMessage): void {
    const enriched = {
      ...message,
      userId: this._userName(),
    };
    window.parent.postMessage(enriched, this.targetOrigin);
  }

  setConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus.set(status);
  }

  private _readThemeFromUrl(): 'light' | 'dark' {
    try {
      const theme = new URLSearchParams(globalThis.location.search).get('theme');
      return theme === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  }

  private _listenToPluginMessages(): void {
    fromEvent<MessageEvent>(globalThis, 'message')
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        const msg = event.data as PluginMessage;
        if (!msg?.type) return;
        this._routeMessage(msg);
      });
  }

  private _routeMessage(msg: PluginMessage): void {
    console.log('[OllMark Bridge] Received message:', msg.type);

    switch (msg.type) {
      case 'project-response': {
        const response = msg as { type: 'project-response'; id: string; userName?: string };
        this.projectId.set(response.id);
        if (response.userName) {
          this._userName.set(response.userName);
          console.log('[OllMark Bridge] userName set:', response.userName);
        }
        break;
      }
      case 'theme':
        this.theme.set(msg.theme);
        break;
      case 'task-result':
        this.taskResult$.next({
          taskId: msg.taskId,
          success: msg.success,
          data: msg.data,
          error: msg.error,
        });
        break;
      case 'buffer-preview':
        console.log(
          '[OllMark Bridge] buffer-preview received, PNG:',
          msg.payload.pngDataUrl ? 'yes' : 'no',
        );
        this.bufferPreview$.next(msg.payload);
        break;
      case 'buffer-preview-update':
        console.log(
          '[OllMark Bridge] buffer-preview-update received, PNG length:',
          msg.pngDataUrl.length,
        );
        this.bufferPreviewUpdate$.next({
          bufferPageId: msg.bufferPageId,
          pngDataUrl: msg.pngDataUrl,
        });
        break;
      case 'buffer-accepted':
        this.bufferAccepted$.next(msg.bufferPageId);
        break;
      case 'buffer-rejected':
        this.bufferRejected$.next(msg.bufferPageId);
        break;
      case 'buffer-error':
        this.bufferError$.next({ bufferPageId: msg.bufferPageId, error: msg.error });
        break;
      default:
        if ((msg as { type: string }).type === 'debug') {
          console.log('[OllMark Plugin Debug]', msg);
        }
        break;
    }
  }
}

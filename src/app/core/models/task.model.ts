import { BufferPreviewPayload } from './preview.model';

export interface PluginTaskRequest {
  id: string;
  task: string;
  params: Record<string, unknown>;
}
export interface PluginTaskResponse<T = unknown> {
  id: string;
  success: boolean;
  error?: string | null;
  data?: T | null;
}
export interface TaskResponseEnvelope<T = unknown> {
  type: 'task-response';
  response: PluginTaskResponse<T>;
}

export type PluginMessage =
  | { type: 'theme'; theme: 'light' | 'dark' }
  | { type: 'get-project' }
  | { type: 'project-response'; id: string; userName?: string }
  | { type: 'execute-task'; taskId: string; task: string; params: Record<string, unknown> }
  | { type: 'task-result'; taskId: string; success: boolean; data: unknown; error: string | null }
  | { type: 'buffer-preview'; payload: BufferPreviewPayload }
  | { type: 'buffer-preview-update'; bufferPageId: string; pngDataUrl: string }
  | { type: 'accept-buffer'; bufferPageId: string; code: string }
  | { type: 'reject-buffer'; bufferPageId: string }
  | { type: 'buffer-accepted'; bufferPageId: string }
  | { type: 'buffer-rejected'; bufferPageId: string }
  | { type: 'buffer-error'; bufferPageId: string; error: string };

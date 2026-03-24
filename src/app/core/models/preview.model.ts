export interface BufferPreviewPayload {
  pngDataUrl: string;
  bufferPageId: string;
  originalPageId: string;
  taskId: string;
  code: string;
  readonly?: boolean;
}

export type PreviewStatus = 'pending' | 'accepted' | 'rejected';

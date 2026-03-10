import { PreviewState } from './preview-state.enum';

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: Date;
  hasGeneratedCode?: boolean;
  previewState?: PreviewState;
}

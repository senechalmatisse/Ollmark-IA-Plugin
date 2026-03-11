/**
 * Raw response shape from the backend (mirrors the DB columns).
 * Keep this strictly aligned with the Spring AI schema — never mutate it.
 */
export interface RawChatEntry{
    id: string;
    project_id: string;
  conversation_id: string;
  content_user: string| null;
  content_ai:string |null;
  created_at: string; 
}

export interface ChatHistoryError {
    status: number;
    message?: string;
}
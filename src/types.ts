export interface DocumentRequestBody {
  externalId?: string;
  title?: string;
  content?: string;
}

export interface AskRequestBody {
  question?: string;
}

export interface DocumentInsertRow {
  id: number;
}

export interface DocumentListItem {
  id: number;
  title: string;
  created_at: string;
}

export interface ChunkRow {
  id: number;
  document_id: number;
  content: string;
  distance: number | string;
}

export interface RelevantChunk {
  document_id: number;
  content: string;
  distance: number | string;
}

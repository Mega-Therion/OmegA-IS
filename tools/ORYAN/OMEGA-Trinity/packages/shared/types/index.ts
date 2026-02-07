// Generated types from shared schemas (keep in sync with schemas/)

export type ResonanceHeader = {
  request_id: string;
  actor: string;
  ts: string; // ISO date-time
  version: string;
  idempotency_key?: string;
};

export type MemoryEntry = {
  id: string;
  namespace: string;
  content: string;
  ts: string;
  score?: number;
  meta?: Record<string, unknown>;
};

export type CouncilEvent = {
  header: ResonanceHeader;
  event_type: "council.open" | "council.submit" | "council.synthesis" | "council.ruling" | "council.close";
  payload: Record<string, unknown>;
};

export type PanelEvent = {
  header: ResonanceHeader;
  event_type: "panel.open" | "panel.submit" | "panel.summary" | "panel.close";
  payload: Record<string, unknown>;
};

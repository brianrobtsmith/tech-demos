import type { ProviderId } from "./providers";

/** NDJSON events streamed from /api/race. All times are server-measured ms. */
export type RaceEvent =
  | { type: "first"; ttftMs: number }
  | { type: "delta"; text: string }
  | { type: "usage"; inputTokens: number; outputTokens: number }
  | {
      type: "done";
      ttftMs: number | null;
      streamMs: number | null;
      totalMs: number | null;
    }
  | { type: "error"; message: string };

export interface ProviderStatus {
  id: ProviderId;
  name: string;
  hasKey: boolean;
  mock: boolean;
}

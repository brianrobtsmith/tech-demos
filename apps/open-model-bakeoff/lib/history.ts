import type { ProviderId } from "./providers";

export interface RunResult {
  ttftMs: number | null;
  tokPerSec: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  tokensEstimated: boolean;
  costUsd: number | null;
  error: string | null;
  mock: boolean;
  textSnippet: string;
}

export interface RunRecord {
  id: string;
  at: number;
  modelKey: string;
  prompt: string;
  results: Partial<Record<ProviderId, RunResult>>;
}

const KEY = "open-model-bakeoff-history-v1";
const MAX_RUNS = 10;

export function loadHistory(): RunRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as RunRecord[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRun(record: RunRecord): RunRecord[] {
  const next = [record, ...loadHistory()].slice(0, MAX_RUNS);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage full or unavailable; history is best-effort.
  }
  return next;
}

export function clearHistory(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

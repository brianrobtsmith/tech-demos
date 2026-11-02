const BANNED =
  /\b(plaid|webhooks?|realtime|mcp|waterfall)\b/gi;

export function scrubCopy(value: string): string {
  return value
    .replace(BANNED, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,])/g, "$1")
    .trim();
}

export function scrubDeep<T>(value: T): T {
  if (typeof value === "string") return scrubCopy(value) as T;
  if (Array.isArray(value)) return value.map((item) => scrubDeep(item)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = scrubDeep(item);
    }
    return out as T;
  }
  return value;
}

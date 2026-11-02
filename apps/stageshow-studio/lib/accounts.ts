import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { AccountsFile } from "./types";

export type AccountsLoad = {
  data: AccountsFile;
  source: "sample" | "local";
  localInvalid: boolean;
};

function isAccounts(value: unknown): value is AccountsFile {
  if (!value || typeof value !== "object") return false;
  const row = value as AccountsFile;
  return (
    typeof row.household?.label === "string" &&
    typeof row.household?.asOf === "string" &&
    typeof row.totals?.totalBalance === "number" &&
    Array.isArray(row.accounts) &&
    row.accounts.length > 0 &&
    typeof row.suggestedMove?.title === "string" &&
    Array.isArray(row.retirement) &&
    typeof row.cashFlow?.totalIn === "number" &&
    typeof row.cashFlow?.moneyOut?.total === "number"
  );
}

function readJson(file: string): unknown {
  const raw = readFileSync(file, "utf8");
  return JSON.parse(raw) as unknown;
}

/**
 * Prefer data/accounts.local.json when it is present and valid.
 * The local file is never logged, echoed in errors, or committed.
 */
export function loadAccounts(): AccountsLoad {
  const dir = path.join(process.cwd(), "data");
  const samplePath = path.join(dir, "accounts.sample.json");
  const localPath = path.join(dir, "accounts.local.json");
  const sample = readJson(samplePath);
  if (!isAccounts(sample)) {
    throw new Error("accounts.sample.json is missing required fields");
  }

  if (!existsSync(localPath)) {
    return { data: sample, source: "sample", localInvalid: false };
  }

  try {
    const local = readJson(localPath);
    if (!isAccounts(local)) {
      return { data: sample, source: "sample", localInvalid: true };
    }
    return { data: local, source: "local", localInvalid: false };
  } catch {
    return { data: sample, source: "sample", localInvalid: true };
  }
}

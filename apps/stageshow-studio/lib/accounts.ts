import { readFileSync } from "node:fs";
import path from "node:path";
import type { AccountsFile } from "./types";

export type AccountsLoad = {
  data: AccountsFile;
  source: "sample";
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

/**
 * Always read the committed fictional Park household.
 * There is no local override.
 */
export function loadAccounts(): AccountsLoad {
  const samplePath = path.join(process.cwd(), "data", "accounts.sample.json");
  const sample = JSON.parse(readFileSync(samplePath, "utf8")) as unknown;
  if (!isAccounts(sample)) {
    throw new Error("accounts.sample.json is missing required fields");
  }
  return { data: sample, source: "sample" };
}

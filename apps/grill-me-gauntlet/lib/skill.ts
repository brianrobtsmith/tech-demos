import { readFileSync } from "node:fs";
import path from "node:path";
import type { SkillInfo } from "@/lib/types";

export const SKILL_COMMIT = "4ae2317ddb22b046e26455e4f9c9b3aaaf62212d";

const FILES = [
  "grill-me/SKILL.md",
  "grill-me/agents/openai.yaml",
  "grilling/SKILL.md",
] as const;

function upstreamPath(file: string) {
  return path.join(process.cwd(), "skills", "upstream", file);
}

export function skillInfo(): SkillInfo {
  return {
    name: "grill-me",
    commit: SKILL_COMMIT,
    files: [...FILES],
  };
}

/** Read the vendored MIT skill text. Throws if a file is missing. */
export function loadSkillPrompt(): string {
  const grillMe = readFileSync(upstreamPath("grill-me/SKILL.md"), "utf8").trim();
  const grilling = readFileSync(upstreamPath("grilling/SKILL.md"), "utf8").trim();
  // Touch the agent manifest so a partial vendor fails closed.
  readFileSync(upstreamPath("grill-me/agents/openai.yaml"), "utf8");

  return [
    "You are running Matt Pocock's grill-me skill. The files below are the skill. Follow them.",
    "",
    "----- skills/productivity/grill-me/SKILL.md -----",
    grillMe,
    "",
    "----- skills/productivity/grilling/SKILL.md -----",
    grilling,
    "",
    "App session contract for this page. It does not replace the skill.",
    "- Reply with one JSON object and no other text.",
    "- Ask exactly one frontier question in that object. If several decisions are ready, ask only the one the others depend on.",
    '- status is "question" for a design decision, "confirm" when the frontier is empty and you need a shared-understanding check, and "spec" only after the user has accepted that check.',
    '- Word every question so "yes" accepts recommendation.',
    "- Before confirm, cover who it is for, the problem, what is in v1, an open risk, and what is a non-goal.",
    "- settled lists decisions already made, in the user's words.",
    "- remaining lists later branch labels and does not include the question you are asking. Use an empty array for confirm and spec.",
    "- Do not ask for account numbers, bank logins, real balances, or anything you could look up. Treat every person and dollar as fictional.",
    "- Do not write code.",
    "",
    'JSON shape: {"status":"question"|"confirm"|"spec","branch":string,"title":string,"body":string,"recommendation":string,"settled":[{"branch":string,"decision":string}],"remaining":string[],"spec":null|{"title":string,"problem":string,"users":string,"scope":string,"openRisks":string[],"nonGoals":string[]}}',
  ].join("\n");
}

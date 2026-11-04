import type { Decision, Spec } from "@/lib/types";

export function specToMarkdown(spec: Spec, idea: string, decisions: Decision[]): string {
  const risks = spec.openRisks.map((item) => `- ${item}`).join("\n");
  const nonGoals = spec.nonGoals.map((item) => `- ${item}`).join("\n");
  const log = decisions
    .map((item, index) => `${index + 1}. **${item.branch}.** ${item.decision}`)
    .join("\n");

  return [
    `# ${spec.title}`,
    "",
    `Starting idea: ${idea.trim()}`,
    "",
    "Grilled with [grill-me](https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me) by Matt Pocock (MIT). Fictional product notes only. No real personal or financial data.",
    "",
    "## Problem",
    "",
    spec.problem,
    "",
    "## Users",
    "",
    spec.users,
    "",
    "## Scope",
    "",
    spec.scope,
    "",
    "## Open risks",
    "",
    risks,
    "",
    "## Non-goals",
    "",
    nonGoals,
    "",
    "## Decisions",
    "",
    log || "_No decisions recorded._",
    "",
  ].join("\n");
}

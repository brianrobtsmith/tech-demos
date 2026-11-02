import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const SUMMARY = `Stageshow is a way to draw faux product UI as a still or a short animation. It should read as a real product, simplified to what the viewer needs, and framed on purpose.

Failures to avoid: too much detail in every row; a wireframe of gray blobs; a whole window shrunk inside a card with even margins; every object the same weight; a bland gray frame that ignores the product.

Do this instead: real words only on the focal balances, status, and the action (about 3 to 7 strings); quiet structure around them; one amount big; blue progress only; the window or phone large in the frame and running off an edge rather than floating with air on all four sides. A bento is one picture: one hero, and the other tiles are a stat, a sentence, or a single component — not four screenshots. Kind labels are plain gray text. Yields are targets. Shortfalls are gray. No emoji, no pills, no invented logos, no sparkles.`;

let cached: { text: string; source: "skill" | "summary" } | null = null;

export function stageshowGuidance(): { text: string; source: "skill" | "summary" } {
  if (cached) return cached;
  const candidates = [
    process.env.STAGESHOW_SKILL_PATH,
    path.join(os.homedir(), ".agents", "skills", "stageshow", "SKILL.md"),
    path.join(os.homedir(), ".cursor", "skills", "stageshow", "SKILL.md"),
  ].filter((item): item is string => Boolean(item));

  for (const file of candidates) {
    try {
      if (!existsSync(file)) continue;
      const raw = readFileSync(file, "utf8");
      const body = raw.replace(/^---[\s\S]*?---/, "").trim();
      if (body.length > 200) {
        cached = { text: body.slice(0, 7000), source: "skill" };
        return cached;
      }
    } catch {
      // Missing skill is fine: mock mode and the summary still run.
    }
  }

  cached = { text: SUMMARY, source: "summary" };
  return cached;
}

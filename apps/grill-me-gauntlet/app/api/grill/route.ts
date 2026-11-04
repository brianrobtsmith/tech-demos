import { connection } from "next/server";
import { errorMessage, nextLive } from "@/lib/live";
import { nextMock } from "@/lib/mock";
import { MODEL_LABEL, resolveMode } from "@/lib/providers";
import { loadSkillPrompt, skillInfo } from "@/lib/skill";
import { requestSchema, type GrillPayload, type Progress } from "@/lib/types";

export async function GET() {
  await connection();
  try {
    loadSkillPrompt();
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
  const runtime = resolveMode();
  return Response.json({
    mode: runtime.mode,
    reason: runtime.reason,
    provider: runtime.provider?.name ?? null,
    model: runtime.mode === "live" ? MODEL_LABEL : null,
    skill: skillInfo(),
  });
}

export async function POST(request: Request) {
  await connection();
  const json = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "Send an idea and the answers so far." },
      { status: 400 }
    );
  }

  let skill;
  try {
    loadSkillPrompt();
    skill = skillInfo();
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }

  const runtime = resolveMode();
  const { idea, turns } = parsed.data;

  try {
    if (runtime.mode === "mock" || !runtime.provider) {
      await new Promise((resolve) => setTimeout(resolve, 450));
      const mock = nextMock(idea, turns);
      const payload: GrillPayload = {
        step: mock.step,
        progress: mock.progress,
        mode: "mock",
        provider: null,
        model: null,
        skill,
      };
      return Response.json(payload);
    }

    const apiKey = process.env[runtime.provider.envVar]?.trim();
    if (!apiKey) {
      return Response.json({ error: `No ${runtime.provider.envVar} set.` }, { status: 400 });
    }
    const step = await nextLive(runtime.provider, apiKey, idea, turns);
    const total = Math.max(turns.length + 1, step.settled.length + step.remaining.length + 1);
    const index = step.status === "spec" ? total : turns.length + 1;
    const progress: Progress = {
      index,
      total,
      percent: step.status === "spec" ? 100 : Math.round(((index - 1) / total) * 100),
    };
    const payload: GrillPayload = {
      step,
      progress,
      mode: "live",
      provider: runtime.provider.name,
      model: MODEL_LABEL,
      skill,
    };
    return Response.json(payload);
  } catch (error) {
    const status = error instanceof Error && /does not match|arrived before/.test(error.message) ? 400 : 502;
    return Response.json({ error: errorMessage(error) }, { status });
  }
}

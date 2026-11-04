import OpenAI from "openai";
import type { ProviderConfig } from "@/lib/providers";
import { loadSkillPrompt } from "@/lib/skill";
import { stepSchema, type GrillStep, type Turn } from "@/lib/types";

function transcript(idea: string, turns: Turn[]) {
  const lines = [`Idea:\n"""${idea.trim()}"""`];
  if (turns.length === 0) {
    lines.push("Transcript: (no answers yet. Ask the first frontier question.)");
    return lines.join("\n\n");
  }
  const body = turns
    .map((turn, index) => {
      const how = turn.accepted ? "accepted the recommendation" : "answered in their own words";
      return [
        `Q${index + 1} [${turn.branch}] ${turn.title}`,
        turn.body,
        `Recommended: ${turn.recommendation}`,
        `They ${how}: ${turn.answer}`,
      ].join("\n");
    })
    .join("\n\n");
  lines.push(`Transcript:\n${body}`);
  return lines.join("\n\n");
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced?.[1] ?? trimmed).trim();
  try {
    return JSON.parse(body);
  } catch {
    const start = body.indexOf("{");
    const end = body.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(body.slice(start, end + 1));
    throw new Error("The model reply was not JSON.");
  }
}

function messageText(message: {
  content?: string | null;
  reasoning_content?: string | null;
} | undefined) {
  const content = message?.content?.trim() ?? "";
  if (content) return content;
  return message?.reasoning_content?.trim() ?? "";
}

async function complete(
  client: OpenAI,
  model: string,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
) {
  const base = {
    model,
    messages,
    temperature: 0.3,
    max_tokens: 2000,
  };
  try {
    return await client.chat.completions.create({
      ...base,
      response_format: { type: "json_object" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/response_format|json_object|unsupported/i.test(message)) throw error;
    return client.chat.completions.create(base);
  }
}

export async function nextLive(
  provider: ProviderConfig,
  apiKey: string,
  idea: string,
  turns: Turn[]
): Promise<GrillStep> {
  const client = new OpenAI({ apiKey, baseURL: provider.baseURL });
  const completion = await complete(client, provider.model, [
    { role: "system", content: loadSkillPrompt() },
    { role: "user", content: transcript(idea, turns) },
  ]);
  const message = completion.choices[0]?.message as
    | { content?: string | null; reasoning_content?: string | null }
    | undefined;
  const parsed = stepSchema.parse(extractJson(messageText(message)));
  const confirmed = turns.some((turn) => turn.branch === "Confirm" && turn.accepted);
  if (parsed.status === "spec" && !confirmed) {
    return stepSchema.parse({
      ...parsed,
      status: "confirm",
      branch: "Confirm",
      title: "Is this a shared understanding?",
      body: "The frontier looks closed. Saying yes writes the spec and stops the interview. If something is still wrong, say what to change.",
      recommendation: "Yes. Write the spec from these decisions.",
      spec: null,
      remaining: [],
    });
  }
  return parsed;
}

export function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "The interview failed.";
}

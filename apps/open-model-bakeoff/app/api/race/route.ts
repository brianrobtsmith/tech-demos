import OpenAI from "openai";
import { getProvider } from "@/lib/providers";
import { getModel } from "@/lib/models";
import type { RaceEvent } from "@/lib/race-types";

const MAX_OUTPUT_TOKENS = 512;

interface MockProfile {
  ttftMs: number;
  tokensPerSec: number;
}

// Deliberately different latency profiles so mock races look like real ones.
const MOCK_PROFILES: Record<string, MockProfile> = {
  together: { ttftMs: 210, tokensPerSec: 95 },
  fireworks: { ttftMs: 330, tokensPerSec: 72 },
  baseten: { ttftMs: 460, tokensPerSec: 58 },
};

const MOCK_TEXT =
  "[MOCK STREAM — no API key configured for this provider] " +
  "This panel is replaying a canned response with simulated provider latency so the " +
  "race UI, metrics, and winner badges can be demonstrated without real keys. " +
  "With a real key set in .env.local, this panel streams live tokens from the provider's " +
  "OpenAI-compatible chat completions endpoint, and TTFT, tokens/sec, token counts, and " +
  "estimated cost are measured from the actual stream. The bakeoff sends the same prompt " +
  "to every enabled provider at once and measures timing on the server so browser " +
  "rendering never skews the numbers.";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const providerId = body?.providerId as string | undefined;
  const modelKey = body?.modelKey as string | undefined;
  const prompt = body?.prompt as string | undefined;

  const provider = providerId ? getProvider(providerId) : undefined;
  const model = modelKey ? getModel(modelKey) : undefined;
  if (!provider || !model || !prompt?.trim()) {
    return Response.json({ error: "providerId, modelKey and prompt are required" }, { status: 400 });
  }
  const modelId = model.ids[provider.id];
  if (!modelId) {
    return Response.json({ error: `${provider.name} does not host ${model.key}` }, { status: 400 });
  }

  const apiKey = process.env[provider.envVar];
  const mockMode = !apiKey && process.env.MOCK_PROVIDERS === "1";
  if (!apiKey && !mockMode) {
    return Response.json({ error: `No ${provider.envVar} set` }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: RaceEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      try {
        if (mockMode) {
          await streamMock(provider.id, send);
        } else {
          await streamReal(apiKey!, provider.baseURL, modelId, prompt, send, req.signal);
        }
      } catch (err) {
        send({ type: "error", message: errorMessage(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function streamReal(
  apiKey: string,
  baseURL: string,
  modelId: string,
  prompt: string,
  send: (e: RaceEvent) => void,
  signal: AbortSignal
) {
  const client = new OpenAI({ apiKey, baseURL });
  const t0 = performance.now();
  let firstTokenAt: number | null = null;
  let lastTokenAt: number | null = null;

  const completion = await client.chat.completions.create(
    {
      model: modelId,
      messages: [{ role: "user", content: prompt }],
      stream: true,
      stream_options: { include_usage: true },
      max_tokens: MAX_OUTPUT_TOKENS,
    },
    { signal }
  );

  for await (const chunk of completion) {
    const delta = chunk.choices?.[0]?.delta as
      | { content?: string | null; reasoning_content?: string | null; reasoning?: string | null }
      | undefined;
    const content = delta?.content ?? "";
    // Reasoning models may think before emitting content; count that as the
    // first token so TTFT is comparable across providers.
    const reasoning = delta?.reasoning_content ?? delta?.reasoning ?? "";
    if (content || reasoning) {
      const now = performance.now();
      if (firstTokenAt === null) {
        firstTokenAt = now;
        send({ type: "first", ttftMs: now - t0 });
      }
      lastTokenAt = now;
      if (content) send({ type: "delta", text: content });
    }
    if (chunk.usage) {
      send({
        type: "usage",
        inputTokens: chunk.usage.prompt_tokens ?? 0,
        outputTokens: chunk.usage.completion_tokens ?? 0,
      });
    }
  }

  send({
    type: "done",
    ttftMs: firstTokenAt !== null ? firstTokenAt - t0 : null,
    streamMs: firstTokenAt !== null && lastTokenAt !== null ? lastTokenAt - firstTokenAt : null,
    totalMs: lastTokenAt !== null ? lastTokenAt - t0 : null,
  });
}

async function streamMock(providerId: string, send: (e: RaceEvent) => void) {
  const profile = MOCK_PROFILES[providerId] ?? { ttftMs: 300, tokensPerSec: 70 };
  const jitter = () => 0.85 + Math.random() * 0.3;
  const words = MOCK_TEXT.split(" ");

  const t0 = performance.now();
  await sleep(profile.ttftMs * jitter());
  const firstTokenAt = performance.now();
  send({ type: "first", ttftMs: firstTokenAt - t0 });

  // ~1.33 tokens per word keeps the simulated tok/s near the profile value.
  const msPerWord = (1000 / profile.tokensPerSec) * 1.33;
  for (const word of words) {
    send({ type: "delta", text: word + " " });
    await sleep(msPerWord * jitter());
  }
  const lastTokenAt = performance.now();

  send({
    type: "usage",
    inputTokens: 24,
    outputTokens: Math.round(words.length * 1.33),
  });
  send({
    type: "done",
    ttftMs: firstTokenAt - t0,
    streamMs: lastTokenAt - firstTokenAt,
    totalMs: lastTokenAt - t0,
  });
}

function errorMessage(err: unknown): string {
  if (err instanceof OpenAI.APIError) {
    return `${err.status ?? ""} ${err.message}`.trim();
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { getTopicById } from "@/lib/taxonomy";
import type { Topic } from "@/lib/types";

const RequestSchema = z.object({
  topicId: z.string(),
  childName: z.string().min(1).max(60),
  age: z.number().int().min(3).max(14),
});

const PracticeSchema = z.object({
  questions: z.array(z.string().min(1)).length(3),
  activity: z.string().min(1),
});

// US-hosted OpenAI-compatible providers serving OpenAI's open-weight
// gpt-oss-120b. First provider with a key set wins. No non-US models.
const PROVIDERS = [
  {
    name: "Together AI",
    envKey: "TOGETHER_API_KEY",
    baseURL: "https://api.together.xyz/v1",
    model: "openai/gpt-oss-120b",
  },
  {
    name: "Fireworks AI",
    envKey: "FIREWORKS_API_KEY",
    baseURL: "https://api.fireworks.ai/inference/v1",
    model: "accounts/fireworks/models/gpt-oss-120b",
  },
  {
    name: "Baseten",
    envKey: "BASETEN_API_KEY",
    baseURL: "https://inference.baseten.co/v1",
    model: "openai/gpt-oss-120b",
  },
] as const;

function mockPractice(topic: Topic, childName: string, age: number) {
  const evidence = topic.evidence;
  const questions = [
    `Can you show me an example of "${topic.name.toLowerCase()}"? ${
      evidence[0] ? `For instance: ${evidence[0].toLowerCase()}.` : ""
    }`.trim(),
    evidence[1]
      ? `Let's try together, ${childName}: ${evidence[1].toLowerCase()} — can you do one?`
      : `Tell me in your own words what "${topic.name.toLowerCase()}" means, ${childName}.`,
    evidence[2]
      ? `One more, ${childName}: ${evidence[2].toLowerCase()}.`
      : `Where might a ${age}-year-old use "${topic.name.toLowerCase()}" at home or outside?`,
  ];
  const activity = `Hands-on: with everyday objects (blocks, snacks, paper), set up a short game where ${childName} practices "${topic.name}". ${topic.description.split(";")[0]}. Keep it under 10 minutes and let ${childName} lead.`;
  return { questions, activity };
}

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = RequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { topicId, childName, age } = parsed;
  const topic = getTopicById(topicId);
  if (!topic) {
    return NextResponse.json({ error: "Unknown topic" }, { status: 404 });
  }

  const provider = PROVIDERS.find((p) => process.env[p.envKey]);
  const mockMode = process.env.MOCK_PROVIDERS === "1" || !provider;

  if (mockMode) {
    return NextResponse.json({
      ...mockPractice(topic, childName, age),
      provider: "Mock (no API key needed)",
      model: "canned output",
      mock: true,
    });
  }

  const client = new OpenAI({
    apiKey: process.env[provider.envKey],
    baseURL: provider.baseURL,
  });

  const prompt = [
    `You create short practice for a parent working with a child.`,
    `Child: ${childName}, age ${age}.`,
    `Concept: ${topic.name} (${topic.subject} › ${topic.domain}).`,
    `Description: ${topic.description}`,
    `Mastery evidence: ${topic.evidence.join(" | ")}`,
    ``,
    `Write exactly 3 age-appropriate practice questions the parent can ask aloud, plus 1 short hands-on activity using household items.`,
    `Respond with ONLY a JSON object: {"questions": ["q1","q2","q3"], "activity": "..."}`,
  ].join("\n");

  try {
    const completion = await client.chat.completions.create({
      model: provider.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1200,
    });
    const text = completion.choices[0]?.message?.content ?? "";
    const jsonText = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const practice = PracticeSchema.parse(JSON.parse(jsonText));
    return NextResponse.json({
      ...practice,
      provider: provider.name,
      model: provider.model,
      mock: false,
    });
  } catch (err) {
    console.error("practice generation failed", err);
    return NextResponse.json(
      { error: `Generation via ${provider.name} failed. Check your API key or set MOCK_PROVIDERS=1.` },
      { status: 502 },
    );
  }
}

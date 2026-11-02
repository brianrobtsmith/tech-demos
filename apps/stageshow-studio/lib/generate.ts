import { readFileSync } from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { z } from "zod";
import { loadAccounts } from "./accounts";
import { resolveProvider, type VendorId } from "./providers";
import { scrubDeep } from "./scrub";
import { stageshowGuidance } from "./skill-prompt";
import type {
  AccountsFile,
  IdeaScene,
  ShowResponse,
  SideCopy,
} from "./types";

const sideSchema = z.object({
  headline: z.string().min(1).max(220),
  captions: z.object({
    desktop: z.string().min(1).max(80),
    phone: z.string().min(1).max(80),
    cashflow: z.string().min(1).max(80),
    states: z.string().min(1).max(80),
  }),
});

const ideaRow = z.object({
  name: z.string().min(1).max(80),
  kind: z.string().max(80),
  value: z.string().min(1).max(32),
  barPct: z.number().min(0).max(100),
  status: z.string().max(140),
});

const ideaSceneSchema = z.object({
  productName: z.string().min(1).max(80),
  summary: z.string().min(1).max(220),
  stills: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        caption: z.string().min(1).max(80),
        frame: z.enum(["window", "phone"]),
        title: z.string().min(1).max(80),
        subtitle: z.string().max(120),
        heroLabel: z.string().max(40),
        heroValue: z.string().min(1).max(24),
        rows: z.array(ideaRow).min(2).max(5),
      }),
    )
    .min(2)
    .max(3),
  bento: z.object({
    statValue: z.string().min(1).max(24),
    statLabel: z.string().min(1).max(80),
    statement: z.string().min(1).max(140),
    bars: z
      .array(
        z.object({
          label: z.string().min(1).max(24),
          pct: z.number().min(0).max(100),
          value: z.string().min(1).max(24),
        }),
      )
      .length(2),
  }),
});

type FixtureSides = {
  withStageshow: SideCopy;
  withoutStageshow: SideCopy;
};

function readFixture<T>(name: string): T {
  const file = path.join(process.cwd(), "fixtures", name);
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

function hashIdea(idea: string): number {
  let h = 2166136261;
  for (const char of idea) {
    h ^= char.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function fillTemplate(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = tokens[key] ?? "";
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  });
}

function fillScene(scene: IdeaScene, tokens: Record<string, string>): IdeaScene {
  const json = fillTemplate(JSON.stringify(scene), tokens);
  return ideaSceneSchema.parse(JSON.parse(json));
}

export function ideaFromFixture(idea: string): {
  withStageshow: IdeaScene;
  withoutStageshow: IdeaScene;
} {
  const clean = idea.replace(/\s+/g, " ").trim().slice(0, 72);
  const focus = clean.split(" ").slice(0, 3).join(" ") || "Today";
  const n = hashIdea(clean || "idea");
  const tokens = {
    idea: clean || "Untitled",
    focus,
    hero: String(8 + (n % 18)),
    a: String(3 + (n % 6)),
    b: String(2 + ((n >> 3) % 5)),
    c: String(4 + ((n >> 6) % 7)),
    d: String(1 + ((n >> 9) % 4)),
  };
  const fixture = readFixture<{
    withStageshow: IdeaScene;
    withoutStageshow: IdeaScene;
  }>("freetext.json");
  return {
    withStageshow: scrubDeep(fillScene(fixture.withStageshow, tokens)),
    withoutStageshow: scrubDeep(fillScene(fixture.withoutStageshow, tokens)),
  };
}

const DESIGN_RULES = `Product rules for every faux screen:
- Progress bars are blue (#2563eb) only. Never green.
- Shortfalls are gray text. Never red.
- Kind labels are plain gray text. No emoji. No pills.
- Amounts are big and bold.
- Yields are labeled as targets, with the shared disclaimer that they are not a promise.
- Customer copy is plain language. Never write Plaid, webhook, Realtime, MCP, or waterfall.
- Tabs, when this is Setasides, are Accounts | Plans | Cash flow.`;

function briefForPreset(accounts: AccountsFile): string {
  return JSON.stringify({
    household: accounts.household,
    totals: accounts.totals,
    accounts: accounts.accounts.map((row) => ({
      role: row.role,
      name: row.name,
      balance: row.balance,
      target: row.target,
      status: row.status,
      targetYield: row.targetYield ?? null,
    })),
    suggestedMove: {
      title: accounts.suggestedMove.title,
      subtitle: accounts.suggestedMove.subtitle,
    },
    cashFlow: {
      totalIn: accounts.cashFlow.totalIn,
      totalOut: accounts.cashFlow.moneyOut.total,
      differenceLabel: accounts.cashFlow.differenceLabel,
    },
  });
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("no json");
  }
  return JSON.parse(text.slice(start, end + 1)) as unknown;
}

async function complete(opts: {
  vendor: VendorId;
  model: string;
  apiKey: string;
  baseURL?: string;
  system: string;
  user: string;
}): Promise<string> {
  if (opts.vendor === "anthropic") {
    const client = new Anthropic({ apiKey: opts.apiKey });
    const message = await client.messages.create({
      model: opts.model,
      max_tokens: 1800,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
    });
    return message.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("");
  }

  const client = new OpenAI({ apiKey: opts.apiKey, baseURL: opts.baseURL });
  const response = await client.chat.completions.create({
    model: opts.model,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
  });
  return response.choices[0]?.message?.content ?? "";
}

async function liveCaptions(
  provider: Extract<ReturnType<typeof resolveProvider>, { mode: "live" }>,
  accounts: AccountsFile,
): Promise<{ withStageshow: SideCopy; withoutStageshow: SideCopy } | null> {
  const skill = stageshowGuidance();
  const brief = briefForPreset(accounts);
  const shape = `Return JSON only: {"headline": string, "captions": {"desktop": string, "phone": string, "cashflow": string, "states": string}}. Captions are short labels. Do not invent balances.`;

  try {
    const [withRaw, withoutRaw] = await Promise.all([
      complete({
        ...provider,
        system: `${skill.text}\n\n${DESIGN_RULES}\nYou are writing the labels for a Stageshow still of this product. Restraint: one idea per label.`,
        user: `${shape}\nThe with-Stageshow labels should sound like a finished product shot.\nBrief:\n${brief}`,
      }),
      complete({
        ...provider,
        system: `You make generic product-mock captions. More words, equal weight, screenshot language. ${DESIGN_RULES}`,
        user: `${shape}\nThe without-Stageshow labels should sound like a boxed dashboard export.\nBrief:\n${brief}`,
      }),
    ]);
    return {
      withStageshow: scrubDeep(sideSchema.parse(extractJson(withRaw))),
      withoutStageshow: scrubDeep(sideSchema.parse(extractJson(withoutRaw))),
    };
  } catch {
    return null;
  }
}

async function liveIdea(
  provider: Extract<ReturnType<typeof resolveProvider>, { mode: "live" }>,
  idea: string,
): Promise<{ withStageshow: IdeaScene; withoutStageshow: IdeaScene } | null> {
  const skill = stageshowGuidance();
  const shape = `Return JSON only with productName, summary, stills (2 items: one frame "window" and one "phone"), and bento {statValue, statLabel, statement, bars: exactly 2 of {label, pct, value}}. Each still has id, caption, frame, title, subtitle, heroLabel, heroValue, and rows of {name, kind, value, barPct, status}. Kind is plain gray text, never a pill. Status that is a shortfall must be gray-worded, never alarmist. Bars are a 0-100 number the app draws in blue. No emoji.`;

  try {
    const [withRaw, withoutRaw] = await Promise.all([
      complete({
        ...provider,
        system: `${skill.text}\n\n${DESIGN_RULES}\nInvent a small believable product UI for the idea. With Stageshow: 3 rows on the window, short status, one hero value, summary under 90 characters.`,
        user: `${shape}\nIdea: ${idea}`,
      }),
      complete({
        ...provider,
        system: `Make a generic product mock for the idea. More rows (4 or 5 on the window), longer status strings, repeated helper text, dashboard wording. ${DESIGN_RULES}`,
        user: `${shape}\nIdea: ${idea}`,
      }),
    ]);
    return {
      withStageshow: scrubDeep(ideaSceneSchema.parse(extractJson(withRaw))),
      withoutStageshow: scrubDeep(ideaSceneSchema.parse(extractJson(withoutRaw))),
    };
  } catch {
    return null;
  }
}

export async function generateShow(input: {
  kind: "preset" | "idea";
  idea?: string;
}): Promise<ShowResponse> {
  const provider = resolveProvider();
  const fixture = readFixture<FixtureSides>("setasides-accounts.json");

  if (input.kind === "idea") {
    const idea = (input.idea ?? "").replace(/\s+/g, " ").trim();
    if (!idea) {
      throw new Error("Type a product idea, or switch back to Setasides Accounts.");
    }
    const fallback = ideaFromFixture(idea);
    let scenes = fallback;
    let notice: string | null = null;
    let mode: ShowResponse["mode"] = "mock";
    let providerName: string | null = null;
    let model: string | null = null;

    if (provider.mode === "live") {
      const live = await liveIdea(provider, idea);
      if (live) {
        scenes = live;
        mode = "live";
        providerName = provider.vendor;
        model = provider.model;
      } else {
        notice = "The model did not return a usable scene. Showing the mock layout for this idea.";
      }
    }

    return {
      mode,
      provider: providerName,
      model,
      dataSource: "none",
      kind: "idea",
      notice,
      withStageshow: {
        headline: scenes.withStageshow.summary,
        captions: {
          desktop: scenes.withStageshow.stills[0]?.caption ?? "Home",
          phone: scenes.withStageshow.stills[1]?.caption ?? "Phone",
          cashflow: "Cash flow",
          states: "States",
        },
      },
      withoutStageshow: {
        headline: scenes.withoutStageshow.summary,
        captions: {
          desktop: scenes.withoutStageshow.stills[0]?.caption ?? "Dashboard",
          phone: scenes.withoutStageshow.stills[1]?.caption ?? "Mobile",
          cashflow: "Cash flow",
          states: "States",
        },
      },
      accounts: null,
      idea: scenes,
    };
  }

  const loaded = loadAccounts();
  let sides = fixture;
  let notice: string | null = loaded.localInvalid
    ? "accounts.local.json could not be read. Showing the Park sample."
    : null;
  let mode: ShowResponse["mode"] = "mock";
  let providerName: string | null = null;
  let model: string | null = null;

  if (provider.mode === "live") {
    const live = await liveCaptions(provider, loaded.data);
    if (live) {
      sides = live;
      mode = "live";
      providerName = provider.vendor;
      model = provider.model;
    } else if (!notice) {
      notice = "The model did not return usable labels. Showing the mock stills.";
    }
  }

  return {
    mode,
    provider: providerName,
    model,
    dataSource: loaded.source,
    kind: "preset",
    notice,
    withStageshow: sides.withStageshow,
    withoutStageshow: sides.withoutStageshow,
    accounts: loaded.data,
    idea: null,
  };
}

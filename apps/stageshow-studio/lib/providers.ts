const BLOCKED =
  /deepseek|kimi|moonshot|qwen|\bglm\b|chatglm|baichuan|hunyuan|minimax|zhipu|doubao|yi-lightning/i;

export type VendorId =
  | "openai"
  | "anthropic"
  | "together"
  | "fireworks"
  | "baseten";

export type ResolvedProvider =
  | { mode: "mock"; reason: string }
  | {
      mode: "live";
      vendor: VendorId;
      model: string;
      apiKey: string;
      baseURL?: string;
    };

const ORDER: VendorId[] = [
  "openai",
  "anthropic",
  "together",
  "fireworks",
  "baseten",
];

const DEFAULTS: Record<
  VendorId,
  { env: string; modelEnv: string; model: string; baseURL?: string }
> = {
  openai: {
    env: "OPENAI_API_KEY",
    modelEnv: "OPENAI_MODEL",
    model: "gpt-4.1-mini",
  },
  anthropic: {
    env: "ANTHROPIC_API_KEY",
    modelEnv: "ANTHROPIC_MODEL",
    model: "claude-haiku-4-5",
  },
  together: {
    env: "TOGETHER_API_KEY",
    modelEnv: "TOGETHER_MODEL",
    model: "openai/gpt-oss-120b",
    baseURL: "https://api.together.xyz/v1",
  },
  fireworks: {
    env: "FIREWORKS_API_KEY",
    modelEnv: "FIREWORKS_MODEL",
    model: "accounts/fireworks/models/gpt-oss-120b",
    baseURL: "https://api.fireworks.ai/inference/v1",
  },
  baseten: {
    env: "BASETEN_API_KEY",
    modelEnv: "BASETEN_MODEL",
    model: "openai/gpt-oss-120b",
    baseURL: "https://inference.baseten.co/v1",
  },
};

function pickModel(override: string | undefined, fallback: string): string {
  if (override && !BLOCKED.test(override)) return override;
  return fallback;
}

export function resolveProvider(): ResolvedProvider {
  if (process.env.MOCK_PROVIDERS === "1") {
    return { mode: "mock", reason: "MOCK_PROVIDERS=1" };
  }

  const requested = process.env.MODEL_PROVIDER?.toLowerCase();
  const order =
    requested && ORDER.includes(requested as VendorId)
      ? [requested as VendorId, ...ORDER.filter((id) => id !== requested)]
      : ORDER;

  for (const vendor of order) {
    const spec = DEFAULTS[vendor];
    const apiKey = process.env[spec.env];
    if (!apiKey) continue;
    return {
      mode: "live",
      vendor,
      model: pickModel(process.env[spec.modelEnv], spec.model),
      apiKey,
      baseURL: spec.baseURL,
    };
  }

  return { mode: "mock", reason: "no API keys" };
}

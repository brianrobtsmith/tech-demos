export type ProviderId = "together" | "fireworks" | "baseten";

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  baseURL: string;
  envVar: string;
  model: string;
}

// Endpoints and the gpt-oss-120b ids match apps/open-model-bakeoff, which
// checked the three serverless catalogs on 2026-10-09. US-hosted open
// weights only. Do not add DeepSeek, Kimi, Qwen, GLM, or other Chinese-lab models.
export const PROVIDERS: ProviderConfig[] = [
  {
    id: "together",
    name: "Together AI",
    baseURL: "https://api.together.xyz/v1",
    envVar: "TOGETHER_API_KEY",
    model: "openai/gpt-oss-120b",
  },
  {
    id: "fireworks",
    name: "Fireworks",
    baseURL: "https://api.fireworks.ai/inference/v1",
    envVar: "FIREWORKS_API_KEY",
    model: "accounts/fireworks/models/gpt-oss-120b",
  },
  {
    id: "baseten",
    name: "Baseten",
    baseURL: "https://inference.baseten.co/v1",
    envVar: "BASETEN_API_KEY",
    model: "openai/gpt-oss-120b",
  },
];

export const MODEL_LABEL = "gpt-oss-120b";

export interface RuntimeMode {
  mode: "mock" | "live";
  provider: ProviderConfig | null;
  reason: string;
}

export function resolveMode(): RuntimeMode {
  if (process.env.MOCK_PROVIDERS === "1") {
    return { mode: "mock", provider: null, reason: "MOCK_PROVIDERS=1" };
  }
  const provider = PROVIDERS.find((item) => process.env[item.envVar]?.trim());
  if (!provider) {
    return { mode: "mock", provider: null, reason: "no API key set" };
  }
  return { mode: "live", provider, reason: provider.envVar };
}

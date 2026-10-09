import type { ProviderId } from "./providers";

export interface ModelEntry {
  key: string;
  label: string;
  /** Provider-specific model IDs. A provider missing here doesn't host the model. */
  ids: Partial<Record<ProviderId, string>>;
}

// IDs verified against Together, Fireworks, and Baseten serverless catalogs on
// 2026-10-09. The plan's original examples (DeepSeek V3.1, Llama 3.3 70B,
// Qwen3 235B) were dropped: they are no longer served by all three providers
// (e.g. Together moved DeepSeek V3.1 to dedicated-only).
export const MODELS: ModelEntry[] = [
  {
    key: "gpt-oss-120b",
    label: "gpt-oss-120B (OpenAI, open-weight)",
    ids: {
      together: "openai/gpt-oss-120b",
      fireworks: "accounts/fireworks/models/gpt-oss-120b",
      baseten: "openai/gpt-oss-120b",
    },
  },
  {
    key: "deepseek-v4.1-flash",
    label: "DeepSeek V4.1 Flash",
    ids: {
      together: "deepseek-ai/DeepSeek-V4.1-Flash",
      fireworks: "accounts/fireworks/models/deepseek-v4p1-flash",
      baseten: "deepseek-ai/DeepSeek-V4.1-Flash",
    },
  },
  {
    key: "kimi-k3",
    label: "Kimi K3 (Moonshot)",
    ids: {
      together: "moonshotai/Kimi-K3",
      fireworks: "accounts/fireworks/models/kimi-k3",
      baseten: "moonshotai/Kimi-K3",
    },
  },
];

export const DEFAULT_MODEL_KEY = "gpt-oss-120b";

export function getModel(key: string): ModelEntry | undefined {
  return MODELS.find((m) => m.key === key);
}

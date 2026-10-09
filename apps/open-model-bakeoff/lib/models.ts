import type { ProviderId } from "./providers";

export interface ModelEntry {
  key: string;
  label: string;
  /** Provider-specific model IDs. A provider missing here doesn't host the model. */
  ids: Partial<Record<ProviderId, string>>;
}

// US-origin open-weight models only (OpenAI, NVIDIA, Meta). IDs verified
// against Together, Fireworks, and Baseten serverless catalogs on 2026-10-09.
// gpt-oss-120B is currently the only US open model all three providers serve:
// Together retired Nemotron 3 Ultra from serverless (Sep 2026), and Fireworks
// removed Llama 3.3 70B (May 2026); Baseten's Model API catalog carries no
// Llama. Providers that don't host a model show as disabled in the UI.
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
    key: "nemotron-3-ultra",
    label: "NVIDIA Nemotron 3 Ultra 550B",
    ids: {
      fireworks: "accounts/fireworks/models/nemotron-3-ultra-nvfp4",
      baseten: "nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B",
    },
  },
  {
    key: "llama-3.3-70b",
    label: "Llama 3.3 70B Instruct (Meta)",
    ids: {
      together: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    },
  },
];

export const DEFAULT_MODEL_KEY = "gpt-oss-120b";

export function getModel(key: string): ModelEntry | undefined {
  return MODELS.find((m) => m.key === key);
}

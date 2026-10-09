import type { ProviderId } from "./providers";

/**
 * Hard-coded serverless prices, USD per 1M tokens (standard tier, not
 * priority/fast/batch). Checked against each provider's public pricing page.
 */
export const PRICES_AS_OF = "2026-10-09";

export interface Price {
  inputPerM: number;
  outputPerM: number;
}

export const PRICES: Record<ProviderId, Record<string, Price>> = {
  together: {
    "gpt-oss-120b": { inputPerM: 0.15, outputPerM: 0.6 },
    "llama-3.3-70b": { inputPerM: 1.04, outputPerM: 1.04 },
  },
  fireworks: {
    "gpt-oss-120b": { inputPerM: 0.15, outputPerM: 0.6 },
    "nemotron-3-ultra": { inputPerM: 0.6, outputPerM: 2.4 },
  },
  baseten: {
    "gpt-oss-120b": { inputPerM: 0.1, outputPerM: 0.5 },
    "nemotron-3-ultra": { inputPerM: 0.6, outputPerM: 2.4 },
  },
};

export function estimateCost(
  provider: ProviderId,
  modelKey: string,
  inputTokens: number,
  outputTokens: number
): number | null {
  const price = PRICES[provider]?.[modelKey];
  if (!price) return null;
  return (
    (inputTokens / 1_000_000) * price.inputPerM +
    (outputTokens / 1_000_000) * price.outputPerM
  );
}

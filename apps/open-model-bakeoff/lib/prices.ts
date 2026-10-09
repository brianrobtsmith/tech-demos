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
    "deepseek-v4.1-flash": { inputPerM: 0.3, outputPerM: 1.2 },
    "kimi-k3": { inputPerM: 2.7, outputPerM: 13.5 },
  },
  fireworks: {
    "gpt-oss-120b": { inputPerM: 0.15, outputPerM: 0.6 },
    "deepseek-v4.1-flash": { inputPerM: 0.3, outputPerM: 1.2 },
    "kimi-k3": { inputPerM: 3.0, outputPerM: 15.0 },
  },
  baseten: {
    "gpt-oss-120b": { inputPerM: 0.1, outputPerM: 0.5 },
    "deepseek-v4.1-flash": { inputPerM: 0.3, outputPerM: 1.2 },
    "kimi-k3": { inputPerM: 3.0, outputPerM: 15.0 },
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

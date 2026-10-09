export type ProviderId = "together" | "fireworks" | "baseten";

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  baseURL: string;
  envVar: string;
}

// Base URLs verified against provider docs on 2026-10-09.
export const PROVIDERS: ProviderConfig[] = [
  {
    id: "together",
    name: "Together AI",
    baseURL: "https://api.together.xyz/v1",
    envVar: "TOGETHER_API_KEY",
  },
  {
    id: "fireworks",
    name: "Fireworks",
    baseURL: "https://api.fireworks.ai/inference/v1",
    envVar: "FIREWORKS_API_KEY",
  },
  {
    id: "baseten",
    name: "Baseten",
    baseURL: "https://inference.baseten.co/v1",
    envVar: "BASETEN_API_KEY",
  },
];

export function getProvider(id: string): ProviderConfig | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

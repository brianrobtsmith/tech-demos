import { connection, NextResponse } from "next/server";
import { PROVIDERS } from "@/lib/providers";
import type { ProviderStatus } from "@/lib/race-types";

/** Reports which providers are usable. Never exposes key values. */
export async function GET() {
  await connection();
  const mockMode = process.env.MOCK_PROVIDERS === "1";
  const statuses: ProviderStatus[] = PROVIDERS.map((p) => {
    const hasKey = Boolean(process.env[p.envVar]);
    return { id: p.id, name: p.name, hasKey: hasKey || mockMode, mock: !hasKey && mockMode };
  });
  return NextResponse.json({ providers: statuses });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { generateShow } from "@/lib/generate";

const bodySchema = z.object({
  kind: z.enum(["preset", "idea"]),
  idea: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Send JSON with kind preset or idea." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Kind must be preset or idea." }, { status: 400 });
  }

  try {
    const show = await generateShow(parsed.data);
    return NextResponse.json(show, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.startsWith("Type a product")
        ? error.message
        : "Could not build the stills.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Handler for /api/cron/whatsapp-followups */
import { NextResponse } from "next/server";
import { processDueFollowUps } from "@/lib/whatsapp-follow-up";

export const dynamic = "force-dynamic";

/**
 * Call every few minutes (e.g. Vercel cron) so follow-ups send even without new webhooks.
 * Protect with CRON_SECRET in Authorization: Bearer <secret> or ?secret=
 */
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  if (expected) {
    const url = new URL(request.url);
    const q = url.searchParams.get("secret")?.trim();
    const auth = request.headers.get("authorization")?.trim();
    const bearer = auth?.startsWith("Bearer ")
      ? auth.slice(7).trim()
      : "";
    if (q !== expected && bearer !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const sent = await processDueFollowUps();
    return NextResponse.json({ ok: true, sent });
  } catch (error) {
    console.error("[cron/whatsapp-followups]", error);
    return NextResponse.json(
      { error: "Failed to process follow-ups" },
      { status: 500 }
    );
  }
}

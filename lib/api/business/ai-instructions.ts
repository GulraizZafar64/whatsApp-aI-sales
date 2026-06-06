/** Handler for /api/business/ai-instructions */
import { NextResponse } from "next/server";
import { Business } from "@/lib/models";
import { requireDashboardBusiness } from "@/lib/dashboard-business";
import type { AiInstructionsRecord } from "@/lib/ai-instructions";
import {
  mergeAiInstructions,
  parseAiInstructionsPatch,
  DEFAULT_AI_INSTRUCTIONS,
} from "@/lib/ai-instructions";
import { normalizeReplyTone } from "@/lib/reply-tone";

/** Optional business context fields (same columns as onboarding used to collect). */
function parseBusinessContextPatch(
  body: unknown
): { businessDescription?: string | null; replyTone?: string | null } | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const o = body as Record<string, unknown>;
  const out: { businessDescription?: string | null; replyTone?: string | null } =
    {};
  if ("businessDescription" in o) {
    const v = o.businessDescription;
    if (v === null || v === undefined) out.businessDescription = null;
    else if (typeof v === "string" && v.length <= 100_000)
      out.businessDescription = v;
    else return null;
  }
  if ("replyTone" in o) {
    const v = o.replyTone;
    if (v === null || v === undefined || v === "") out.replyTone = null;
    else if (typeof v === "string" && v.length <= 64) {
      out.replyTone = normalizeReplyTone(v);
    }
    else return null;
  }
  return Object.keys(out).length ? out : null;
}

export async function GET(request: Request) {
  const gate = await requireDashboardBusiness(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const instructions = mergeAiInstructions(gate.business.aiInstructions);
  return NextResponse.json({
    instructions,
    businessDescription: gate.business.businessDescription ?? "",
    replyTone: normalizeReplyTone(gate.business.replyTone),
  });
}

export async function PATCH(request: Request) {
  const gate = await requireDashboardBusiness(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch = parseAiInstructionsPatch(body);
  const contextPatch = parseBusinessContextPatch(body);
  if (!patch && !contextPatch) {
    return NextResponse.json(
      {
        error:
          "Send at least one of: whenUserArrives, howToDealWithUser, whenOrderComplete, whenUserWillNotBuy, businessDescription, or replyTone.",
      },
      { status: 400 }
    );
  }

  try {
    const row = await Business.findByPk(gate.business.id);
    if (!row) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const updates: {
      aiInstructions?: AiInstructionsRecord;
      businessDescription?: string | null;
      replyTone?: string | null;
    } = {};

    if (patch) {
      const current = mergeAiInstructions(row.aiInstructions);
      updates.aiInstructions = { ...current, ...patch };
    }
    if (contextPatch) {
      if ("businessDescription" in contextPatch) {
        updates.businessDescription = contextPatch.businessDescription;
      }
      if ("replyTone" in contextPatch) {
        updates.replyTone = contextPatch.replyTone;
      }
    }

    await row.update(updates);
    await row.reload();
    return NextResponse.json({
      instructions: mergeAiInstructions(row.aiInstructions),
      businessDescription: row.businessDescription ?? "",
      replyTone: normalizeReplyTone(row.replyTone),
    });
  } catch (error) {
    console.error("[api/business/ai-instructions PATCH]", error);
    return NextResponse.json(
      { error: "Failed to save instructions" },
      { status: 500 }
    );
  }
}

/** POST body `{ reset: true }` restores built-in defaults. */
export async function POST(request: Request) {
  const gate = await requireDashboardBusiness(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: { reset?: boolean };
  try {
    body = (await request.json()) as { reset?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.reset) {
    return NextResponse.json(
      { error: "Only supported action is { \"reset\": true }" },
      { status: 400 }
    );
  }

  try {
    const row = await Business.findByPk(gate.business.id);
    if (!row) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }
    await row.update({ aiInstructions: { ...DEFAULT_AI_INSTRUCTIONS } });
    await row.reload();
    return NextResponse.json({
      instructions: mergeAiInstructions(row.aiInstructions),
      businessDescription: row.businessDescription ?? "",
      replyTone: normalizeReplyTone(row.replyTone),
    });
  } catch (error) {
    console.error("[api/business/ai-instructions POST]", error);
    return NextResponse.json(
      { error: "Failed to reset instructions" },
      { status: 500 }
    );
  }
}

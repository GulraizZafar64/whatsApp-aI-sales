import { NextResponse } from "next/server";
import { BlockedContact } from "@/lib/models";
import { requireDashboardBusiness } from "@/lib/dashboard-business";
import { normalizeWaDigits } from "@/lib/phone-normalize";

export async function GET(request: Request) {
  const gate = await requireDashboardBusiness(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const rows = await BlockedContact.findAll({
      where: { businessId: gate.business.id },
      order: [["id", "DESC"]],
    });
    return NextResponse.json({
      blocked: rows.map((r) => ({
        id: r.id,
        phone: r.displayInput ?? r.normalizedWaId,
        normalizedWaId: r.normalizedWaId,
      })),
    });
  } catch (error) {
    console.error("[api/blacklist GET]", error);
    return NextResponse.json(
      { error: "Failed to load blacklist" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const gate = await requireDashboardBusiness(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: { phone?: string };
  try {
    body = (await request.json()) as { phone?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = typeof body.phone === "string" ? body.phone.trim() : "";
  if (!raw) {
    return NextResponse.json({ error: "phone is required" }, { status: 400 });
  }

  const normalizedWaId = normalizeWaDigits(raw);
  if (normalizedWaId.length < 6) {
    return NextResponse.json(
      { error: "Enter a valid mobile number (at least 6 digits)." },
      { status: 400 }
    );
  }

  try {
    const [row, created] = await BlockedContact.findOrCreate({
      where: {
        businessId: gate.business.id,
        normalizedWaId,
      },
      defaults: {
        businessId: gate.business.id,
        normalizedWaId,
        displayInput: raw.slice(0, 64),
      },
    });

    if (!created) {
      return NextResponse.json(
        { error: "This number is already on your blacklist." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      blocked: {
        id: row.id,
        phone: row.displayInput ?? row.normalizedWaId,
        normalizedWaId: row.normalizedWaId,
      },
    });
  } catch (error) {
    console.error("[api/blacklist POST]", error);
    return NextResponse.json(
      { error: "Failed to add number" },
      { status: 500 }
    );
  }
}

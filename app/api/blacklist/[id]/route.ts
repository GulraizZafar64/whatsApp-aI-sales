import { NextResponse } from "next/server";
import { BlockedContact } from "@/lib/models";
import { requireDashboardBusiness } from "@/lib/dashboard-business";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, ctx: Params) {
  const gate = await requireDashboardBusiness(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id: idRaw } = await ctx.params;
  const id = Number.parseInt(idRaw, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const n = await BlockedContact.destroy({
      where: { id, businessId: gate.business.id },
    });
    if (!n) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/blacklist DELETE]", error);
    return NextResponse.json(
      { error: "Failed to remove number" },
      { status: 500 }
    );
  }
}

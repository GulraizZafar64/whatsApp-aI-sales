import { NextResponse } from "next/server";
import { isBusinessProfileComplete } from "@/lib/business-type";
import { ensureDb } from "@/lib/sequelize";
import { Business } from "@/lib/models";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phoneNumberId = searchParams.get("phoneNumberId")?.trim();
  if (!phoneNumberId) {
    return NextResponse.json(
      { error: "phoneNumberId query parameter is required" },
      { status: 400 }
    );
  }

  try {
    await ensureDb();
    const row = await Business.findOne({ where: { phoneNumberId } });
    return NextResponse.json({
      exists: Boolean(row),
      profileComplete: row ? isBusinessProfileComplete(row) : false,
    });
  } catch (error) {
    console.error("[api/businesses/exists]", error);
    return NextResponse.json(
      { error: "Database error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { metaGraphUrl } from "@/lib/meta-graph-version";
import { loadBusinessWhatsAppToken } from "@/lib/whatsapp-credentials";

/** Verify Meta credentials using the token stored in DB for this phone_number_id. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { phoneNumberId?: string };
    const phoneNumberId =
      typeof body.phoneNumberId === "string" ? body.phoneNumberId.trim() : "";

    if (!phoneNumberId) {
      return NextResponse.json(
        { error: "phoneNumberId is required" },
        { status: 400 }
      );
    }

    const loaded = await loadBusinessWhatsAppToken(phoneNumberId);
    if (!loaded) {
      return NextResponse.json(
        {
          error:
            "No WhatsApp token in database for this number. Connect via Sign in / Get started first.",
        },
        { status: 404 }
      );
    }

    const response = await fetch(
      `${metaGraphUrl(phoneNumberId)}?fields=id,display_phone_number,verified_name,status`,
      {
        headers: {
          Authorization: `Bearer ${loaded.token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.error?.message || "Failed to verify credentials",
          businessId: loaded.business.id,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      businessId: loaded.business.id,
      data,
    });
  } catch (error) {
    console.error("WhatsApp Test Connection Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { handleFacebookAuth } from "@/lib/meta-auth-facebook";

export const dynamic = "force-dynamic";

/** Legacy alias — same handler as POST /api/auth/facebook. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { accessToken?: string };
    const result = await handleFacebookAuth(body.accessToken ?? "");

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          message: result.message,
          hint: result.hint,
          meta_debug: result.meta_debug,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      accessToken: result.accessToken,
      businessAccountId: result.businessAccountId,
      phoneNumberId: result.phoneNumberId,
      whatsappNumber: result.whatsappNumber,
      businessId: result.businessId,
      webhookVerifyToken: result.webhookVerifyToken,
      registeredPhones: result.registeredPhones,
      wabaSubscriptions: result.wabaSubscriptions,
      wabaSubscribed: result.wabaSubscribed,
      wabaSubscribeError: result.wabaSubscribeError,
      wabaSubscribeHint: result.wabaSubscribeHint,
      tokenExpiresIn: result.tokenExpiresIn,
      message: result.message,
    });
  } catch (error) {
    console.error("[whatsapp-connect]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

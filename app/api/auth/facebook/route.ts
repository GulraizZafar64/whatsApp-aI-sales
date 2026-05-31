import { NextResponse } from "next/server";
import { handleFacebookAuth } from "@/lib/meta-auth-facebook";

export const dynamic = "force-dynamic";

/** POST /api/auth/facebook — Facebook Login token exchange and WABA setup. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { accessToken?: string };
    const shortLived = body.accessToken;

    const result = await handleFacebookAuth(shortLived ?? "");

    if (!result.success) {
      const status =
        result.error === "no_waba" || result.error === "no_phone_numbers"
          ? 404
          : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json({
      success: true,
      phoneNumberId: result.phoneNumberId,
      whatsappNumber: result.whatsappNumber,
      accessToken: result.accessToken,
      businessAccountId: result.businessAccountId,
      businessId: result.businessId,
      webhookVerifyToken: result.webhookVerifyToken,
      registeredPhones: result.registeredPhones,
      wabaSubscribed: result.wabaSubscribed,
      wabaSubscribeError: result.wabaSubscribeError,
      wabaSubscribeHint: result.wabaSubscribeHint,
      wabaSubscriptions: result.wabaSubscriptions,
      tokenExpiresIn: result.tokenExpiresIn,
      message: result.message,
    });
  } catch (error) {
    console.error("[api/auth/facebook]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

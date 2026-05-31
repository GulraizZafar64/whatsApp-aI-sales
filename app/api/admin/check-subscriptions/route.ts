import { NextResponse } from "next/server";
import { assertAdminAuthorized } from "@/lib/admin-auth";
import { checkAllBusinessSubscriptions } from "@/lib/admin-waba-subscriptions";
import { getMetaAppId } from "@/lib/meta-app-credentials";

export const dynamic = "force-dynamic";

/** GET /api/admin/check-subscriptions */
export async function GET(request: Request) {
  const denied = assertAdminAuthorized(request);
  if (denied) return denied;

  try {
    const result = await checkAllBusinessSubscriptions();
    return NextResponse.json({
      metaAppId: getMetaAppId() || null,
      ...result,
      subscribedBusinesses: result.businesses.filter((b) => b.subscribed),
      notSubscribedBusinesses: result.businesses.filter(
        (b) => b.hasToken && !b.subscribed
      ),
    });
  } catch (error) {
    console.error("[admin/check-subscriptions]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

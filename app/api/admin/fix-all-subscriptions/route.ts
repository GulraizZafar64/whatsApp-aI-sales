import { NextResponse } from "next/server";
import { assertAdminAuthorized } from "@/lib/admin-auth";
import { fixAllBusinessSubscriptions } from "@/lib/admin-waba-subscriptions";

export const dynamic = "force-dynamic";

/** POST /api/admin/fix-all-subscriptions */
export async function POST(request: Request) {
  const denied = assertAdminAuthorized(request);
  if (denied) return denied;

  try {
    const result = await fixAllBusinessSubscriptions();
    return NextResponse.json({
      total: result.total,
      success: result.success,
      failed: result.failed,
      errors: result.errors,
      results: result.results,
    });
  } catch (error) {
    console.error("[admin/fix-all-subscriptions]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

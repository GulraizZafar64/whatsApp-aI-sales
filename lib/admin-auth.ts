import { NextResponse } from "next/server";

/** Returns an error response if the request is not authorized; otherwise null. */
export function assertAdminAuthorized(request: Request): NextResponse | null {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "ADMIN_SECRET is not set on the server" },
      { status: 503 }
    );
  }

  const auth = request.headers.get("authorization");
  const bearer =
    auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : null;
  const headerSecret = request.headers.get("x-admin-secret")?.trim();
  const provided = bearer || headerSecret;

  if (!provided || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

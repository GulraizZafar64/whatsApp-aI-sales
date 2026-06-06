import { NextResponse } from "next/server";
import { assertAdminAuthorized } from "@/lib/admin-auth";
import { verifyAdminToken, type AdminTokenPayload } from "@/lib/admin-jwt";

export type AdminGate =
  | { ok: true; admin: AdminTokenPayload }
  | { ok: false; response: NextResponse };

export function bearerAdminToken(request: Request): string {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return "";
  return auth.slice(7).trim();
}

export function requireAdmin(request: Request): AdminGate {
  const denied = assertAdminAuthorized(request);
  if (denied) {
    return { ok: false, response: denied };
  }

  const token = bearerAdminToken(request);
  const admin = token ? verifyAdminToken(token) : null;
  return {
    ok: true,
    admin: admin ?? { role: "admin", email: "api-secret" },
  };
}

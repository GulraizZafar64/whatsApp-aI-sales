/** Handler for /api/admin/login */
import { NextResponse } from "next/server";
import {
  adminCredentialsConfigured,
  signAdminToken,
  verifyAdminCredentials,
} from "@/lib/admin-jwt";

export async function POST(request: Request) {
  if (!adminCredentialsConfigured()) {
    return NextResponse.json(
      {
        error:
          "Admin login is not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env",
      },
      { status: 503 }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  if (!verifyAdminCredentials(email, password)) {
    return NextResponse.json(
      { error: "Invalid admin credentials." },
      { status: 401 }
    );
  }

  const token = signAdminToken(email);
  return NextResponse.json({ ok: true, token, email });
}

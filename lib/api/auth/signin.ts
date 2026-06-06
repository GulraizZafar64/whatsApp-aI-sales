/** Handler for /api/auth/login */
import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/password";
import { signAuthToken } from "@/lib/auth/jwt";
import { findBusinessForUser } from "@/lib/business-lookup";
import { ensureDb } from "@/lib/sequelize";
import { User } from "@/lib/models";

export async function POST(request: Request) {
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

  try {
    await ensureDb();
    const user = await User.findOne({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const business = await findBusinessForUser(user.id);
    const token = signAuthToken({
      userId: user.id,
      businessId: business?.id ?? null,
    });

    return NextResponse.json({
      ok: true,
      token,
      user: { id: user.id, email: user.email, name: user.name },
      businessId: business?.id ?? null,
    });
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}

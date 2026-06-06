/** Handler for /api/auth/register */
import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { signAuthToken } from "@/lib/auth/jwt";
import { ensureDb } from "@/lib/sequelize";
import { User } from "@/lib/models";

export async function POST(request: Request) {
  let body: { email?: string; password?: string; name?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : null;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  try {
    await ensureDb();
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const user = await User.create({
      email,
      passwordHash: await hashPassword(password),
      name: name || null,
    });

    const token = signAuthToken({ userId: user.id, businessId: null });

    return NextResponse.json({
      ok: true,
      token,
      user: { id: user.id, email: user.email, name: user.name },
      businessId: null,
    });
  } catch (error) {
    console.error("[auth/register]", error);
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}

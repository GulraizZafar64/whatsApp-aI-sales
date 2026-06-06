import jwt from "jsonwebtoken";

export type AdminTokenPayload = {
  role: "admin";
  email: string;
};

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("JWT_SECRET is not set in environment.");
  }
  return secret;
}

export function signAdminToken(email: string): string {
  return jwt.sign({ role: "admin", email } satisfies AdminTokenPayload, jwtSecret(), {
    expiresIn: "12h",
  });
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    const decoded = jwt.verify(token, jwtSecret()) as AdminTokenPayload;
    if (decoded?.role !== "admin" || typeof decoded.email !== "string") {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function adminCredentialsConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_EMAIL?.trim() && process.env.ADMIN_PASSWORD?.trim()
  );
}

export function verifyAdminCredentials(
  email: string,
  password: string
): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  if (!adminEmail || !adminPassword) return false;
  return (
    email.trim().toLowerCase() === adminEmail && password === adminPassword
  );
}

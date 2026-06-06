import jwt from "jsonwebtoken";

export type AuthTokenPayload = {
  userId: number;
  businessId: number | null;
};

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("JWT_SECRET is not set in environment.");
  }
  return secret;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, jwtSecret(), { expiresIn: "30d" });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, jwtSecret()) as AuthTokenPayload;
    if (!decoded?.userId || typeof decoded.userId !== "number") return null;
    return {
      userId: decoded.userId,
      businessId:
        decoded.businessId != null ? Number(decoded.businessId) : null,
    };
  } catch {
    return null;
  }
}

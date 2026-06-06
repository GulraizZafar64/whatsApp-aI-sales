import jwt from "jsonwebtoken";

export type CheckoutReturnPayload = {
  purpose: "whop_checkout";
  businessId: number;
  userId: number;
  plan: "starter" | "pro";
};

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error("JWT_SECRET is not set.");
  return secret;
}

export function signCheckoutReturnToken(
  payload: Omit<CheckoutReturnPayload, "purpose">
): string {
  return jwt.sign(
    { ...payload, purpose: "whop_checkout" as const },
    jwtSecret(),
    { expiresIn: "3h" }
  );
}

export function verifyCheckoutReturnToken(
  token: string
): CheckoutReturnPayload | null {
  try {
    const decoded = jwt.verify(token, jwtSecret()) as CheckoutReturnPayload;
    if (decoded?.purpose !== "whop_checkout") return null;
    if (!decoded.businessId || !decoded.userId) return null;
    if (decoded.plan !== "starter" && decoded.plan !== "pro") return null;
    return decoded;
  } catch {
    return null;
  }
}

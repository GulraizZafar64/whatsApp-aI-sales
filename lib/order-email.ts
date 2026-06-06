import nodemailer from "nodemailer";
import type { OrderStatus } from "@/lib/order-requirements";
import { orderStatusLabel } from "@/lib/order-requirements";

export type OrderEmailEvent =
  | "order_created"
  | "order_updated"
  | "order_cancelled"
  | "cancellation_requested"
  | "cancellation_approved"
  | "cancellation_rejected"
  | "order_accepted"
  | "order_completed"
  | "order_dispatched"
  | "order_rejected"
  | "status_changed";

export type LifecycleEmailPayload = {
  subject: string;
  preheader?: string;
  html: string;
  text: string;
};

export type OrderEmailPayload = {
  event: OrderEmailEvent;
  businessName: string | null;
  orderId: number;
  orderGroupId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerContact: string;
  previousStatus: OrderStatus | null;
  newStatus: OrderStatus;
  timestamp: Date;
  orderAmount: number;
  orderDetails: string;
  actionDetails: string;
};

type ResolvedSmtp = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

/** Read address from SMTP_EMAIL, SMTP_USER, or bare email in SMTP_FROM. */
function smtpAccountEmail(): string | null {
  const direct =
    process.env.SMTP_EMAIL?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "";
  if (direct) return direct;

  const from = process.env.SMTP_FROM?.trim() ?? "";
  const angle = from.match(/<([^>]+)>/);
  if (angle?.[1]?.includes("@")) return angle[1].trim();
  if (from.includes("@")) return from;
  return null;
}

function inferProvider(email: string): {
  host: string;
  port: number;
  secure: boolean;
} {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";

  if (domain === "gmail.com" || domain === "googlemail.com") {
    return { host: "smtp.gmail.com", port: 465, secure: true };
  }
  if (
    domain === "outlook.com" ||
    domain === "hotmail.com" ||
    domain === "live.com" ||
    domain === "msn.com"
  ) {
    return { host: "smtp-mail.outlook.com", port: 587, secure: false };
  }
  if (domain.endsWith("onmicrosoft.com") || domain.includes("office365")) {
    return { host: "smtp.office365.com", port: 587, secure: false };
  }
  if (domain === "yahoo.com" || domain.endsWith(".yahoo.com")) {
    return { host: "smtp.mail.yahoo.com", port: 465, secure: true };
  }
  if (domain === "icloud.com" || domain === "me.com" || domain === "mac.com") {
    return { host: "smtp.mail.me.com", port: 587, secure: false };
  }
  if (domain.includes("zoho.")) {
    return { host: "smtp.zoho.com", port: 465, secure: true };
  }

  return { host: `smtp.${domain}`, port: 587, secure: false };
}

function resolveSmtp(): ResolvedSmtp | null {
  const pass = process.env.SMTP_PASS?.trim();
  const email = smtpAccountEmail();

  if (email && pass) {
    const inferred = inferProvider(email);
    const hostOverride = process.env.SMTP_HOST?.trim();
    const portEnv = process.env.SMTP_PORT?.trim();
    const port = portEnv ? Number(portEnv) : inferred.port;
    const secure =
      process.env.SMTP_SECURE === "1"
        ? true
        : process.env.SMTP_SECURE === "0"
          ? false
          : inferred.secure;

    const fromRaw = process.env.SMTP_FROM?.trim();
    const from =
      fromRaw && !fromRaw.includes("@") && fromRaw.includes("<")
        ? fromRaw
        : fromRaw && fromRaw.includes("@")
          ? fromRaw
          : `WhatsApp Sales <${email}>`;

    return {
      host: hostOverride || inferred.host,
      port: Number.isFinite(port) && port > 0 ? port : inferred.port,
      secure: port === 465 ? true : secure,
      user: email,
      pass,
      from,
    };
  }

  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.SMTP_FROM?.trim();
  if (!host || !from || !pass) return null;

  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER?.trim() || smtpAccountEmail() || "";
  if (!user) return null;

  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === "1" || port === 465,
    user,
    pass,
    from,
  };
}

function smtpConfigured(): boolean {
  return resolveSmtp() != null;
}

function eventSubject(event: OrderEmailEvent, orderId: number): string {
  const labels: Record<OrderEmailEvent, string> = {
    order_created: "New order",
    order_updated: "Order updated",
    order_cancelled: "Order cancelled",
    cancellation_requested: "Cancellation request",
    cancellation_approved: "Cancellation approved",
    cancellation_rejected: "Cancellation rejected",
    order_accepted: "Order accepted",
    order_completed: "Order completed",
    order_dispatched: "Order dispatched",
    order_rejected: "Order rejected",
    status_changed: "Order status changed",
  };
  return `[WhatsApp Sales] ${labels[event]} #${orderId}`;
}

function formatEmailBody(p: OrderEmailPayload): string {
  const biz = p.businessName?.trim() || "Your business";
  const prev = p.previousStatus
    ? orderStatusLabel(p.previousStatus)
    : "—";
  const next = orderStatusLabel(p.newStatus);
  const when = p.timestamp.toISOString();

  return [
    `${biz} — order notification`,
    "",
    `Event: ${p.actionDetails}`,
    `Order ID: ${p.orderId}`,
    p.orderGroupId ? `Order group: ${p.orderGroupId}` : null,
    `Customer: ${p.customerName?.trim() || "WhatsApp customer"}`,
    p.customerPhone
      ? `Phone: ${p.customerPhone}`
      : "Phone: not available — open the WhatsApp inbox in your dashboard to message this customer",
    `Previous status: ${prev}`,
    `New status: ${next}`,
    `Order amount: ${p.orderAmount.toFixed(2)}`,
    `Timestamp: ${when}`,
    "",
    "Order details:",
    p.orderDetails,
    "",
    "—",
    "WhatsApp AI Sales",
  ]
    .filter((line): line is string => line != null)
    .join("\n");
}

export async function sendOwnerOrderEmail(
  toEmail: string,
  payload: OrderEmailPayload
): Promise<{ sent: boolean; error?: string }> {
  if (!toEmail.trim()) {
    return { sent: false, error: "no_owner_email" };
  }

  const subject = eventSubject(payload.event, payload.orderId);
  const text = formatEmailBody(payload);

  const smtp = resolveSmtp();
  if (!smtp) {
    console.log(
      "[order-email] SMTP not configured — set SMTP_EMAIL + SMTP_PASS (owner notifications logged here):",
      subject,
      "\n",
      text.slice(0, 400)
    );
    return { sent: false, error: "smtp_not_configured" };
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  try {
    await transporter.sendMail({
      from: smtp.from,
      to: toEmail.trim(),
      subject,
      text,
    });
    return { sent: true };
  } catch (e) {
    console.error("[order-email] send failed:", e);
    return {
      sent: false,
      error: e instanceof Error ? e.message : "send_failed",
    };
  }
}

export async function sendOwnerLifecycleEmail(
  toEmail: string,
  payload: LifecycleEmailPayload
): Promise<{ sent: boolean; error?: string }> {
  if (!toEmail.trim()) {
    return { sent: false, error: "no_owner_email" };
  }

  const smtp = resolveSmtp();
  if (!smtp) {
    return { sent: false, error: "smtp_not_configured" };
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  try {
    await transporter.sendMail({
      from: smtp.from,
      to: toEmail.trim(),
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
    return { sent: true };
  } catch (e) {
    return {
      sent: false,
      error: e instanceof Error ? e.message : "send_failed",
    };
  }
}

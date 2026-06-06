import { getAppBaseUrlFromEnv } from "@/lib/app-url";

export type BillingNoticeKey =
  | "trial_expired"
  | "renewal_failed"
  | "subscription_expired";

function pricingUrl(): string {
  const base = getAppBaseUrlFromEnv() ?? "https://whatsappsales.com";
  return `${base}/pricing`;
}

function emailShell(params: {
  preheader: string;
  headline: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaHref: string;
  footerNote: string;
}): { html: string; text: string } {
  const { preheader, headline, bodyHtml, ctaLabel, ctaHref, footerNote } =
    params;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${headline}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#128C7E 0%,#25D366 100%);padding:28px 32px;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.85);">WhatsApp AI Sales</p>
              <h1 style="margin:12px 0 0;font-size:24px;line-height:1.3;font-weight:700;color:#ffffff;">${headline}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="border-radius:10px;background:#25D366;">
                    <a href="${ctaHref}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${ctaLabel}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">${footerNote}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">© ${new Date().getFullYear()} WhatsApp AI Sales · Your data stays safe in your account</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    headline,
    "",
    preheader.replace(/<[^>]+>/g, ""),
    "",
    `${ctaLabel}: ${ctaHref}`,
    "",
    footerNote,
    "",
    "— WhatsApp AI Sales",
  ].join("\n");

  return { html, text };
}

export function billingNoticeEmail(noticeKey: BillingNoticeKey): {
  subject: string;
  preheader: string;
  html: string;
  text: string;
} {
  const pricing = pricingUrl();

  if (noticeKey === "trial_expired") {
    const { html, text } = emailShell({
      preheader: "Your 1-day free trial has ended. Choose a plan to keep your AI assistant running.",
      headline: "Your free trial has ended",
      bodyHtml: `
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">Thank you for trying <strong>WhatsApp AI Sales</strong>. Your 1-day trial period is now over.</p>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">To continue receiving AI replies, order tracking, and WhatsApp automation, please choose a subscription plan.</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;">
          <tr><td style="padding:16px 18px;font-size:14px;line-height:1.5;color:#166534;">
            <strong>Your data is safe</strong> — products, orders, and settings remain saved. After subscribing, reconnect WhatsApp from your dashboard.
          </td></tr>
        </table>`,
      ctaLabel: "View plans & subscribe",
      ctaHref: pricing,
      footerNote:
        "You received this email once because your trial ended. If you already subscribed, you can ignore this message.",
    });
    return {
      subject: "Your WhatsApp AI Sales trial has ended",
      preheader: "Choose a plan to restore access",
      html,
      text,
    };
  }

  if (noticeKey === "renewal_failed") {
    const { html, text } = emailShell({
      preheader: "We could not renew your subscription. Update your payment to restore access.",
      headline: "Payment failed — action required",
      bodyHtml: `
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">We were unable to process your monthly subscription renewal.</p>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">Your WhatsApp connection has been paused until payment succeeds. Please update your billing in Whop or choose a plan again.</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;">
          <tr><td style="padding:16px 18px;font-size:14px;line-height:1.5;color:#991b1b;">
            <strong>What happens now:</strong> AI auto-replies stop, WhatsApp session is disconnected, and your dashboard shows a renewal prompt. Your business data is not deleted.
          </td></tr>
        </table>`,
      ctaLabel: "Renew subscription",
      ctaHref: pricing,
      footerNote:
        "This is a one-time notice for this failed payment. Contact support if you believe this is an error.",
    });
    return {
      subject: "Action required: subscription renewal failed",
      preheader: "Update payment to restore WhatsApp AI Sales",
      html,
      text,
    };
  }

  const { html, text } = emailShell({
    preheader: "Your subscription is no longer active. Renew to continue using WhatsApp AI Sales.",
    headline: "Your subscription has expired",
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">Your paid subscription period has ended and access to WhatsApp AI Sales is paused.</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">Renew anytime to turn AI selling and inbox tools back on. Reconnect WhatsApp after renewing.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;">
        <tr><td style="padding:16px 18px;font-size:14px;line-height:1.5;color:#1e40af;">
          All your products, orders, and settings are still stored in your account.
        </td></tr>
      </table>`,
    ctaLabel: "Renew now",
    ctaHref: pricing,
    footerNote: "You will not receive duplicate emails for this expiration.",
  });
  return {
    subject: "Your WhatsApp AI Sales subscription has expired",
    preheader: "Renew to restore full access",
    html,
    text,
  };
}

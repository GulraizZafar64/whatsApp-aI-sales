import { Op } from "sequelize";
import { getWhatsAppAuthPath } from "@/lib/whatsapp-web/config";
import { ensureDb } from "@/lib/sequelize";
import { Business, User } from "@/lib/models";
import { disconnectWhatsAppClient } from "@/lib/whatsapp-web/manager";
import { purgePersistedWhatsAppSession } from "@/lib/whatsapp-web/session-lock";
import { sendOwnerLifecycleEmail } from "@/lib/order-email";
import {
  billingNoticeEmail,
  type BillingNoticeKey,
} from "@/lib/lifecycle-email-templates";
import { billingStateToStoredStatus } from "@/lib/business-billing";
import type { AccessStatus, BlockedAccessReason } from "@/lib/billing";

export type { BillingNoticeKey };

export function accessReasonToNoticeKey(
  reason: BlockedAccessReason
): BillingNoticeKey {
  if (reason === "renewal_failed") return "renewal_failed";
  if (reason === "subscription_expired") return "subscription_expired";
  return "trial_expired";
}

/** Atomically claim sending so parallel API calls only produce one email. */
export async function claimBillingNotice(
  businessId: number,
  noticeKey: BillingNoticeKey
): Promise<boolean> {
  await ensureDb();
  const [affected] = await Business.update(
    {
      billingNoticeKey: noticeKey,
      billingEmailSentAt: new Date(),
    },
    {
      where: {
        id: businessId,
        [Op.or]: [
          { billingNoticeKey: null },
          { billingNoticeKey: { [Op.ne]: noticeKey } },
        ],
      },
    }
  );
  return affected > 0;
}

export async function sendBillingNoticeOnce(
  business: Business,
  noticeKey: BillingNoticeKey
): Promise<boolean> {
  const { billingNoticeKey } = business;
  if (billingNoticeKey === noticeKey) return false;

  const claimed = await claimBillingNotice(business.id, noticeKey);
  if (!claimed) return false;

  const owner = await User.findByPk(business.ownerUserId);
  const toEmail = owner?.email?.trim() ?? "";
  if (!toEmail) return false;

  const template = billingNoticeEmail(noticeKey);
  const result = await sendOwnerLifecycleEmail(toEmail, {
    subject: template.subject,
    preheader: template.preheader,
    html: template.html,
    text: template.text,
  });

  if (!result.sent) {
    console.warn("[billing-notice] email not sent", {
      businessId: business.id,
      noticeKey,
      error: result.error,
    });
  }

  return result.sent;
}

export async function blockBusinessAccess(
  business: Business,
  access: Extract<AccessStatus, { allowed: false }>
): Promise<void> {
  const storedStatus = billingStateToStoredStatus(access.state);
  const currentStatus = business.billingStatus;

  if (access.reason === "trial_expired") {
    if (currentStatus !== storedStatus) {
      await disconnectWhatsAppClient(business.id);
      await purgePersistedWhatsAppSession(getWhatsAppAuthPath(), business.id);
      await business.update({
        billingStatus: storedStatus,
        waStatus: "disconnected",
        waQrDataUrl: null,
      });
    }
  } else if (
    currentStatus !== storedStatus ||
    business.aiAutoReplyEnabled !== false
  ) {
    await business.update({
      billingStatus: storedStatus,
      aiAutoReplyEnabled: false,
    });
  }

  const noticeKey = accessReasonToNoticeKey(access.reason);
  await sendBillingNoticeOnce(business, noticeKey);
}

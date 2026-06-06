import { Op } from "sequelize";
import { ensureDb } from "@/lib/sequelize";
import {
  BlockedContact,
  Business,
  CompletedOrder,
  Product,
  WhatsAppFollowUp,
  WhatsAppMessage,
} from "@/lib/models";
import {
  bargainFloorPrice,
  customerUnitPrice,
  formatMoney,
} from "@/lib/product-pricing";
import { normalizeReplyTone, type ReplyTone } from "@/lib/reply-tone";
import { businessWhatsAppReady } from "@/lib/whatsapp-credentials";
import {
  primaryProductIdFromThread,
  findProductIdsMentionedInText,
} from "@/lib/whatsapp-catalog-match";
import type { ConversationTurn } from "@/lib/claude-generate";
import {
  saveOutgoingWhatsAppMessage,
  sendWhatsAppTextMessage,
} from "@/lib/whatsapp-send";

export function followUpDelayMs(): number {
  const raw = process.env.WHATSAPP_FOLLOW_UP_MINUTES?.trim();
  const mins = raw ? Number.parseFloat(raw) : 30;
  if (!Number.isFinite(mins) || mins < 1) return 30 * 60 * 1000;
  return Math.min(mins, 24 * 60) * 60 * 1000;
}

export function buildBargainFollowUpMessage(params: {
  productName: string;
  bargainPrice: number;
  tone: ReplyTone;
  senderName?: string;
}): string {
  const price = formatMoney(params.bargainPrice);
  const name = params.senderName?.trim();
  const hey = name ? `Hi ${name}` : "Hi";
  const product = params.productName.trim();

  switch (params.tone) {
    case "Friendly":
      return (
        `${hey}! 😊 Just checking in — are you still interested in the ${product}? ` +
        `We can offer you a special price of ${price} if you'd like to order today. ` +
        `Reply anytime and we'll help you complete it!`
      );
    case "Cool":
      return (
        `${hey} — still thinking about the ${product}? ` +
        `We've got it at ${price} for you right now. Hit reply if you want it 👍`
      );
    case "Professional":
    default:
      return (
        `${hey}, good day. We wanted to follow up regarding the ${product}. ` +
        `If you are still interested, we can offer a reduced price of ${price}. ` +
        `Please reply when convenient and we will assist with your order.`
      );
  }
}

export async function cancelPendingFollowUps(params: {
  businessId: number;
  customerWaId: string;
}): Promise<void> {
  await ensureDb();
  await WhatsAppFollowUp.update(
    { status: "cancelled" },
    {
      where: {
        businessId: params.businessId,
        customerWaId: params.customerWaId,
        status: "pending",
      },
    }
  );
}

export async function scheduleFollowUpAfterAiReply(params: {
  businessId: number;
  customerWaId: string;
  contactRawWaId: string;
  history: ConversationTurn[];
  userText: string;
  products: Product[];
  orderPlacedThisTurn: boolean;
}): Promise<void> {
  if (params.orderPlacedThisTurn) return;

  const mentioned = findProductIdsMentionedInText(params.userText, params.products);
  if (!mentioned.length) return;

  const productId =
    primaryProductIdFromThread(params.history, params.userText, params.products) ??
    mentioned[mentioned.length - 1]!;
  const product = params.products.find((p) => p.id === productId);
  if (!product) return;

  const floor = bargainFloorPrice(product);
  const customer = customerUnitPrice(product);
  if (floor == null || floor >= customer - 0.009) return;

  await ensureDb();
  await cancelPendingFollowUps({
    businessId: params.businessId,
    customerWaId: params.customerWaId,
  });

  const waIds = [
    ...new Set(
      [params.customerWaId, params.contactRawWaId].filter((v) => v?.trim())
    ),
  ];
  const lastIn = await WhatsAppMessage.findOne({
    where: {
      businessId: params.businessId,
      senderWaId: { [Op.in]: waIds },
      direction: "incoming",
    },
    order: [["id", "DESC"]],
    attributes: ["id"],
  });

  const scheduledAt = new Date(Date.now() + followUpDelayMs());
  await WhatsAppFollowUp.create({
    businessId: params.businessId,
    customerWaId: params.customerWaId,
    contactRawWaId: params.contactRawWaId,
    productId: product.id,
    productName: product.productName,
    bargainPrice: floor.toFixed(2),
    customerPrice: customer.toFixed(2),
    scheduledAt,
    anchorAt: new Date(),
    lastIncomingMessageId: lastIn?.id ?? 0,
    status: "pending",
  });
}

async function customerRepliedSinceSchedule(params: {
  businessId: number;
  customerWaId: string;
  contactRawWaId: string;
  lastIncomingMessageId: number;
}): Promise<boolean> {
  const waIds = [
    ...new Set(
      [params.customerWaId, params.contactRawWaId].filter((v) => v?.trim())
    ),
  ];
  const newer = await WhatsAppMessage.findOne({
    where: {
      businessId: params.businessId,
      senderWaId: { [Op.in]: waIds },
      direction: "incoming",
      id: { [Op.gt]: params.lastIncomingMessageId },
    },
    attributes: ["id"],
  });
  return Boolean(newer);
}

async function hasCompletedOrderSince(params: {
  businessId: number;
  customerWaId: string;
  since: Date;
}): Promise<boolean> {
  const row = await CompletedOrder.findOne({
    where: {
      businessId: params.businessId,
      customerWaId: params.customerWaId,
    },
    order: [["id", "DESC"]],
  });
  if (!row) return false;
  const created = row.get("createdAt") as Date | undefined;
  return Boolean(created && created.getTime() >= params.since.getTime());
}

export async function processDueFollowUps(): Promise<number> {
  await ensureDb();

  const now = new Date();
  const due = await WhatsAppFollowUp.findAll({
    where: {
      status: "pending",
      scheduledAt: { [Op.lte]: now },
    },
    limit: 20,
    order: [["scheduledAt", "ASC"]],
  });

  let sent = 0;
  for (const job of due) {
    const business = await Business.findByPk(job.businessId);
    if (!business || !businessWhatsAppReady(business)) {
      await job.update({ status: "cancelled" });
      continue;
    }

    const blocked = await BlockedContact.findOne({
      where: {
        businessId: job.businessId,
        normalizedWaId: job.customerWaId,
      },
    });
    if (blocked) {
      await job.update({ status: "cancelled" });
      continue;
    }

    if (
      await hasCompletedOrderSince({
        businessId: job.businessId,
        customerWaId: job.customerWaId,
        since: job.anchorAt,
      })
    ) {
      await job.update({ status: "cancelled" });
      continue;
    }

    if (
      await customerRepliedSinceSchedule({
        businessId: job.businessId,
        customerWaId: job.customerWaId,
        contactRawWaId: job.contactRawWaId,
        lastIncomingMessageId: job.lastIncomingMessageId,
      })
    ) {
      await job.update({ status: "cancelled" });
      continue;
    }

    const bargain = Number.parseFloat(String(job.bargainPrice));
    if (!Number.isFinite(bargain)) {
      await job.update({ status: "cancelled" });
      continue;
    }

    const body = buildBargainFollowUpMessage({
      productName: job.productName,
      bargainPrice: bargain,
      tone: normalizeReplyTone(business.replyTone),
    });

    const result = await sendWhatsAppTextMessage({
      businessId: job.businessId,
      toWaId: job.contactRawWaId,
      body,
    });

    if (!result.ok) {
      console.error("[whatsapp-follow-up] send failed:", result.error);
      continue;
    }

    await saveOutgoingWhatsAppMessage({
      businessId: job.businessId,
      contactWaId: job.customerWaId,
      text: body,
      outgoingSource: "ai",
    });

    await job.update({ status: "sent", sentAt: new Date() });
    sent += 1;
  }

  return sent;
}

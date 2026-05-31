import { findBusinessByPhoneNumberId } from "@/lib/business-lookup";
import { saveIncomingWhatsAppMessage } from "@/lib/whatsapp-webhook-save";
import { tryAutoReplyInboundWhatsApp } from "@/lib/whatsapp-inbound-ai";
import { processDueFollowUps } from "@/lib/whatsapp-follow-up";
import { parseInboundWhatsAppMessage } from "@/lib/whatsapp-inbound-parse";

type WebhookEntry = {
  id?: string;
  changes?: WebhookChange[];
};

type WebhookChange = {
  field?: string;
  value?: WebhookValue;
};

type WebhookValue = {
  metadata?: { phone_number_id?: string; display_phone_number?: string };
  messages?: Record<string, unknown>[];
  statuses?: Record<string, unknown>[];
  contacts?: { profile?: { name?: string } }[];
  event?: Record<string, unknown>;
  automatic_events?: Record<string, unknown>[];
};

type AiJob = {
  businessPhoneNumberId: string;
  contactWaId: string;
  userText: string;
  senderName?: string;
  messageType: string;
  whatsappMediaId?: string;
  isCustomerImage: boolean;
  isCustomerAudio: boolean;
};

export async function processWhatsAppWebhookBody(body: {
  object?: string;
  entry?: WebhookEntry[];
}): Promise<void> {
  const entryCount = body.entry?.length ?? 0;
  console.log(
    "[whatsapp-webhook] process",
    "object=",
    body.object,
    "entries=",
    entryCount
  );

  if (body.object !== "whatsapp_business_account") {
    console.warn("[whatsapp-webhook] ignored: unexpected object", body.object);
    return;
  }

  const saveTasks: Promise<void>[] = [];
  const aiJobs: AiJob[] = [];
  let messageCount = 0;
  let statusCount = 0;
  let otherFieldCount = 0;

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;

      const field = change.field ?? "unknown";
      const businessPhoneNumberId = value.metadata?.phone_number_id;
      const displayNumber = value.metadata?.display_phone_number;

      const isMessageField = field === "messages";
      const hasMessages = (value.messages?.length ?? 0) > 0;
      const hasStatuses = (value.statuses?.length ?? 0) > 0;
      const hasAutomaticEvents = (value.automatic_events?.length ?? 0) > 0;
      const hasEvent = Boolean(value.event);

      if (!isMessageField && !hasMessages && !hasStatuses) {
        otherFieldCount += 1;
        console.log(
          "[whatsapp-webhook] field event",
          field,
          "phone_number_id=",
          businessPhoneNumberId ?? "(none)",
          "display=",
          displayNumber ?? "(none)",
          hasAutomaticEvents
            ? `automatic_events=${value.automatic_events!.length}`
            : hasEvent
              ? "event=present"
              : "payload keys=" + Object.keys(value).join(",")
        );
      }

      if (
        typeof businessPhoneNumberId === "string" &&
        businessPhoneNumberId.trim()
      ) {
        const phoneId = businessPhoneNumberId.trim();
        const business = await findBusinessByPhoneNumberId(phoneId);
        if (business) {
          console.log(
            "[whatsapp-webhook] business match",
            `phone_number_id=${phoneId}`,
            `business #${business.id}`,
            business.whatsappNumber ?? business.businessName ?? ""
          );
        } else {
          console.warn(
            "[whatsapp-webhook] no business for phone_number_id",
            phoneId,
            "display=",
            displayNumber ?? "(none)"
          );
        }
      }

      if (value.statuses?.length) {
        statusCount += value.statuses.length;
        console.log(
          "[whatsapp-webhook] statuses",
          field,
          "phone_number_id=",
          businessPhoneNumberId,
          "display=",
          displayNumber,
          "count=",
          value.statuses.length
        );
      }

      const senderName = value.contacts?.[0]?.profile?.name;

      for (const msg of value.messages ?? []) {
        messageCount += 1;
        const parsed = parseInboundWhatsAppMessage(msg);
        if (!parsed) {
          console.log(
            "[whatsapp-webhook] skipped unparsed message",
            "type=",
            (msg as { type?: string }).type
          );
          continue;
        }

        console.log(
          "[whatsapp-webhook] message",
          "phone_number_id=",
          businessPhoneNumberId,
          "from=",
          parsed.from,
          "type=",
          parsed.msgType,
          "text=",
          parsed.userText.slice(0, 120)
        );

        saveTasks.push(
          saveIncomingWhatsAppMessage(businessPhoneNumberId, msg, {
            senderName: typeof senderName === "string" ? senderName : undefined,
          })
        );

        if (
          typeof businessPhoneNumberId === "string" &&
          businessPhoneNumberId.trim() &&
          parsed.userText.trim()
        ) {
          aiJobs.push({
            businessPhoneNumberId: businessPhoneNumberId.trim(),
            contactWaId: parsed.from,
            userText: parsed.userText,
            messageType: parsed.msgType,
            whatsappMediaId: parsed.whatsappMediaId,
            isCustomerImage: parsed.isCustomerImage,
            isCustomerAudio: parsed.isCustomerAudio,
            senderName:
              typeof senderName === "string" ? senderName : undefined,
          });
        }
      }
    }
  }

  if (messageCount === 0 && statusCount === 0 && otherFieldCount === 0) {
    console.warn(
      "[whatsapp-webhook] no messages, statuses, or field events in payload"
    );
  }

  await Promise.all(saveTasks);

  void processDueFollowUps().catch((err) => {
    console.error("[whatsapp-follow-up] process error:", err);
  });

  if (aiJobs.length) {
    console.log(
      "[whatsapp] auto-reply jobs:",
      aiJobs.length,
      "phone_number_id:",
      aiJobs[0]?.businessPhoneNumberId
    );
  }

  await Promise.all(
    aiJobs.map((job) =>
      tryAutoReplyInboundWhatsApp(job).catch((err) => {
        console.error("[whatsapp-ai] auto-reply error:", err);
      })
    )
  );
}

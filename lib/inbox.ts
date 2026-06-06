export type InboxMessage = {
  outgoingSource?: string | null;
  id: string;
  from: string;
  whatsappChatId?: string | null;
  senderName: string | null;
  text: string;
  messageType: string;
  direction: string;
  status: string;
  businessId: number;
  createdAt: string | null;
  /** Resolved from product catalog for [Image] ProductName messages */
  imagePreviewUrl?: string | null;
};

export type InboxConversation = {
  contactFrom: string;
  /** WhatsApp jid to use when sending (…@lid or …@c.us). */
  sendTo: string;
  displayPhone: string;
  title: string;
  lastPreview: string;
  lastAt: string | null;
  unreadCount: number;
};

import {
  digitsOnly,
  isPlausiblePhoneDigits,
} from "@/lib/wa-contact-id";

export { digitsOnly } from "@/lib/wa-contact-id";

/** Human-readable phone, or empty when id is a LID / internal WhatsApp id. */
export function formatChatPhone(waId: string): string {
  const d = digitsOnly(waId.split("@")[0]);
  if (!isPlausiblePhoneDigits(d)) return "";
  return `+${d}`;
}
export function contactKey(raw: string): string {
  return digitsOnly(raw) || raw;
}

export function buildConversations(messages: InboxMessage[]): InboxConversation[] {
  const groups = new Map<string, { contactFrom: string; msgs: InboxMessage[] }>();

  for (const m of messages) {
    const raw = m.from?.trim();
    if (!raw) continue;
    const key = contactKey(raw);
    const g = groups.get(key) ?? { contactFrom: raw, msgs: [] };
    g.msgs.push(m);
    groups.set(key, g);
  }

  const list: InboxConversation[] = [];

  for (const { contactFrom, msgs } of groups.values()) {
    const sorted = [...msgs].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ta - tb;
    });
    const last = sorted[sorted.length - 1];
    let title: string | null = null;
    let sendTo = contactFrom;
    for (const x of sorted) {
      if (x.whatsappChatId?.includes("@")) {
        sendTo = x.whatsappChatId;
      }
      if (x.direction === "incoming" && x.senderName?.trim()) {
        title = x.senderName.trim();
      }
    }
    list.push({
      contactFrom,
      sendTo,
      displayPhone: formatChatPhone(contactFrom),
      title: title ?? formatChatPhone(contactFrom),
      lastPreview: last?.text ?? "",
      lastAt: last?.createdAt ?? null,
      unreadCount: msgs.filter(
        (x) => x.direction === "incoming" && x.status === "unread"
      ).length,
    });
  }

  list.sort((a, b) => {
    const ta = a.lastAt ? new Date(a.lastAt).getTime() : 0;
    const tb = b.lastAt ? new Date(b.lastAt).getTime() : 0;
    return tb - ta;
  });

  return list;
}

export function filterConversations(
  list: InboxConversation[],
  query: string
): InboxConversation[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      c.displayPhone.toLowerCase().includes(q) ||
      digitsOnly(c.contactFrom).includes(q)
  );
}

export function normalizeSearchText(s: string): string {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function messageMatchesSearch(
  text: string | undefined | null,
  query: string
): boolean {
  const q = normalizeSearchText(query);
  if (!q) return false;
  return normalizeSearchText(text ?? "").includes(q);
}

export function findThreadSearchMatch(
  messages: InboxMessage[],
  query: string
): InboxMessage | null {
  const q = normalizeSearchText(query);
  if (!q) return null;
  return messages.find((m) => messageMatchesSearch(m.text, q)) ?? null;
}

export function applyContactPhoneMap(
  conversations: InboxConversation[],
  contactPhones: Record<string, string>
): InboxConversation[] {
  if (Object.keys(contactPhones).length === 0) return conversations;
  return conversations.map((c) => {
    const resolved = contactPhones[contactKey(c.contactFrom)]?.trim();
    if (!resolved) return c;
    return { ...c, displayPhone: resolved };
  });
}

export function threadForContact(
  messages: InboxMessage[],
  contactFrom: string
): InboxMessage[] {
  const key = contactKey(contactFrom);
  return messages
    .filter((m) => contactKey(m.from.trim()) === key)
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ta - tb;
    });
}

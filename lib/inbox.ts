export type InboxMessage = {
  id: string;
  from: string;
  senderName: string | null;
  text: string;
  messageType: string;
  direction: string;
  status: string;
  businessPhoneNumberId: string | null;
  createdAt: string | null;
};

export type InboxConversation = {
  contactFrom: string;
  displayPhone: string;
  title: string;
  lastPreview: string;
  lastAt: string | null;
  unreadCount: number;
};

export function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export function formatChatPhone(waId: string): string {
  const d = digitsOnly(waId);
  return d.length >= 10 ? `+${d}` : waId || "—";
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
    for (const x of sorted) {
      if (x.direction === "incoming" && x.senderName?.trim()) {
        title = x.senderName.trim();
      }
    }
    list.push({
      contactFrom,
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

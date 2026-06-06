/** Minimum/maximum digit length for a plausible E.164-style WhatsApp phone user id. */
/** E.164 allows up to 15 digits; real WhatsApp user phones are typically 8–13. */
const MIN_PHONE_DIGITS = 8;
const MAX_PHONE_DIGITS = 13;

export function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export function isPlausiblePhoneDigits(d: string): boolean {
  return d.length >= MIN_PHONE_DIGITS && d.length <= MAX_PHONE_DIGITS;
}

/** Strip JID suffix and return digits-only user part. */
export function waUserFromChatId(chatId: string): string {
  return digitsOnly(chatId.replace(/@.*$/, "")) || chatId;
}

/**
 * Prefer the contact's real phone for storage/display; fall back to chat id user part.
 */
export function resolveInboundSenderWaId(params: {
  chatId: string;
  contactNumber?: string | null;
  contactIdUser?: string | null;
}): string {
  const numberDigits = digitsOnly(params.contactNumber ?? "");
  if (isPlausiblePhoneDigits(numberDigits)) {
    return numberDigits;
  }

  const userDigits = digitsOnly(params.contactIdUser ?? "");
  if (
    isPlausiblePhoneDigits(userDigits) &&
    !params.chatId.includes("@lid")
  ) {
    return userDigits;
  }

  return waUserFromChatId(params.chatId);
}

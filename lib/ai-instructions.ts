export type AiInstructionsRecord = {
  /** 1 — First message / when a user starts a chat */
  whenUserArrives: string;
  /** 2 — Tone, handling objections, gently encourage purchase if they have not bought */
  howToDealWithUser: string;
  /** 3 — After an order is marked complete */
  whenOrderComplete: string;
  /** 4 — User clearly does not want to buy; polite close */
  whenUserWillNotBuy: string;
};

export const AI_INSTRUCTION_KEYS = [
  "whenUserArrives",
  "howToDealWithUser",
  "whenOrderComplete",
  "whenUserWillNotBuy",
] as const satisfies readonly (keyof AiInstructionsRecord)[];

export const DEFAULT_AI_INSTRUCTIONS: AiInstructionsRecord = {
  whenUserArrives:
    "Greet the customer warmly by name if known. Thank them for reaching out. " +
    "Briefly introduce what you sell and ask how you can help today. Keep the first reply short and friendly.",
  howToDealWithUser:
    "Always stay polite and respectful. Listen to their needs, answer questions clearly, and do not pressure. " +
    "If they have not bought yet, gently highlight one benefit or offer that fits what they said—never argue. " +
    "If they seem unsure, offer to help compare options or send more details. Never be rude if they say no.",
  whenOrderComplete:
    "Confirm the order clearly: product, quantity, and price. Thank them sincerely once. " +
    "Give an estimated delivery or next step if applicable. Do not push other products in this message. " +
    "If they later say thanks/bye after shopping, briefly suggest one or two other items they might like.",
  whenUserWillNotBuy:
    "Thank them for their time. Say you understand and that the door stays open if they change their mind. " +
    "Wish them a good day—do not push further or send repeated sales pitches after a clear no.",
};

export function mergeAiInstructions(
  stored: unknown
): AiInstructionsRecord {
  const base: AiInstructionsRecord = { ...DEFAULT_AI_INSTRUCTIONS };
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
    return base;
  }
  const o = stored as Record<string, unknown>;
  for (const key of AI_INSTRUCTION_KEYS) {
    if (key in o && typeof o[key] === "string") {
      base[key] = o[key] as string;
    }
  }
  return base;
}

export function parseAiInstructionsPatch(
  body: unknown
): Partial<AiInstructionsRecord> | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const o = body as Record<string, unknown>;
  const out: Partial<AiInstructionsRecord> = {};
  for (const key of AI_INSTRUCTION_KEYS) {
    if (!(key in o)) continue;
    const v = o[key];
    if (v === null || v === undefined) {
      out[key] = "";
      continue;
    }
    if (typeof v !== "string") return null;
    if (v.length > 32_000) return null;
    out[key] = v;
  }
  return Object.keys(out).length ? out : null;
}

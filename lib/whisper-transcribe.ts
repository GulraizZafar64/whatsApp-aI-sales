import { openaiApiKeyFromEnv } from "@/lib/openai-env";

/** Max audio size for OpenAI Whisper (25 MB). */
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export type WhisperTranscriptionResult = {
  text: string;
  /** ISO-639-1 from Whisper when available (e.g. en, ur, hi, ja, zh). */
  language?: string;
};

function filenameForMime(mimeType: string): string {
  const m = mimeType.split(";")[0].trim().toLowerCase();
  if (m.includes("ogg")) return "voice.ogg";
  if (m.includes("mpeg") || m.includes("mp3")) return "voice.mp3";
  if (m.includes("m4a")) return "voice.m4a";
  if (m.includes("mp4")) return "voice.m4a";
  if (m.includes("webm")) return "voice.webm";
  if (m.includes("wav")) return "voice.wav";
  if (m.includes("aac")) return "voice.aac";
  return "voice.ogg";
}

/**
 * Transcribe audio with OpenAI Whisper.
 * Language is auto-detected (Urdu, Hindi, English, Japanese, Chinese, Arabic, etc.).
 */
export async function transcribeAudioWithWhisper(params: {
  buffer: Buffer;
  mimeType: string;
  apiKey?: string;
}): Promise<WhisperTranscriptionResult | null> {
  const key = (params.apiKey ?? openaiApiKeyFromEnv()).trim();
  if (!key) {
    console.warn(
      "[whisper] OPENAI_API_KEY not set — cannot transcribe voice notes"
    );
    return null;
  }

  if (params.buffer.length < 32) return null;
  if (params.buffer.length > MAX_AUDIO_BYTES) {
    console.warn("[whisper] audio too large for Whisper API");
    return null;
  }

  const mime = params.mimeType.split(";")[0].trim().toLowerCase() || "audio/ogg";
  const filename = filenameForMime(mime);

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(params.buffer)], { type: mime }),
    filename
  );
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  // No `language` field — Whisper detects Urdu, Hindi, English, Japanese, Chinese, etc.

  try {
    const res = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: form,
        signal: AbortSignal.timeout(90_000),
      }
    );

    const data = (await res.json()) as {
      text?: string;
      language?: string;
      error?: { message?: string };
    };

    if (!res.ok) {
      console.error(
        "[whisper] API error:",
        data.error?.message ?? res.status
      );
      return null;
    }

    const text = typeof data.text === "string" ? data.text.trim() : "";
    if (!text) return null;

    const language =
      typeof data.language === "string" ? data.language.trim() : undefined;

    console.log(
      "[whisper] transcribed",
      text.length,
      "chars",
      language ? `lang=${language}` : ""
    );

    return { text, language };
  } catch (e) {
    console.error("[whisper] request failed:", e);
    return null;
  }
}

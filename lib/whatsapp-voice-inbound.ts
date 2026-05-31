import { isOpenAiConfiguredFromEnv } from "@/lib/openai-env";
import { transcribeAudioWithWhisper } from "@/lib/whisper-transcribe";
import { downloadWhatsAppMediaBuffer } from "@/lib/whatsapp-media";
import { updateLatestIncomingAudioTranscript } from "@/lib/whatsapp-webhook-save";

const VOICE_FALLBACK_NO_KEY =
  "[Customer sent a voice note. Voice transcription is not configured — ask them politely in their language to type their order or send a product photo.]";

const VOICE_FALLBACK_FAILED =
  "[Customer sent a voice note but transcription failed — apologize briefly in a friendly tone and ask them to type their message or send a photo of the product.]";

/**
 * Download a WhatsApp voice note and transcribe with Whisper (auto language).
 * Returns text to send to Claude as the customer message.
 */
export async function resolveVoiceNoteUserText(params: {
  whatsappMediaId: string;
  accessToken: string;
  businessPhoneNumberId: string;
  senderWaId: string;
}): Promise<string> {
  if (!isOpenAiConfiguredFromEnv()) {
    console.warn("[whatsapp-voice] set OPENAI_API_KEY in .env for Whisper");
    return VOICE_FALLBACK_NO_KEY;
  }

  const downloaded = await downloadWhatsAppMediaBuffer({
    mediaId: params.whatsappMediaId,
    accessToken: params.accessToken,
  });

  if (!downloaded) {
    console.warn("[whatsapp-voice] could not download audio", params.whatsappMediaId);
    return VOICE_FALLBACK_FAILED;
  }

  const result = await transcribeAudioWithWhisper({
    buffer: downloaded.buffer,
    mimeType: downloaded.mimeType,
  });

  if (!result?.text) {
    return VOICE_FALLBACK_FAILED;
  }

  await updateLatestIncomingAudioTranscript({
    businessPhoneNumberId: params.businessPhoneNumberId,
    senderWaId: params.senderWaId,
    transcript: result.text,
    detectedLanguage: result.language,
  });

  return result.text;
}

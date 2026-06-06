import { isOpenAiConfiguredFromEnv } from "@/lib/openai-env";
import { transcribeAudioWithWhisper } from "@/lib/whisper-transcribe";
import { updateLatestIncomingAudioTranscript } from "@/lib/whatsapp-webhook-save";

const VOICE_FALLBACK_NO_KEY =
  "[Customer sent a voice note. Voice transcription is not configured — ask them politely in their language to type their order or send a product photo.]";

const VOICE_FALLBACK_FAILED =
  "[Customer sent a voice note but transcription failed — apologize briefly in a friendly tone and ask them to type their message or send a photo of the product.]";

/** Legacy path — WhatsApp Web uses resolveVoiceNoteFromWebBuffer instead. */
export async function resolveVoiceNoteUserText(params: {
  whatsappMediaId: string;
  businessId: number;
  senderWaId: string;
}): Promise<string> {
  void params.whatsappMediaId;
  if (!isOpenAiConfiguredFromEnv()) {
    return VOICE_FALLBACK_NO_KEY;
  }
  return VOICE_FALLBACK_FAILED;
}

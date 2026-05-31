/** OpenAI API key — used for Whisper voice transcription. */
export function openaiApiKeyFromEnv(): string {
  return (
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.WHISPER_API_KEY?.trim() ||
    ""
  );
}

export function isOpenAiConfiguredFromEnv(): boolean {
  return Boolean(openaiApiKeyFromEnv());
}

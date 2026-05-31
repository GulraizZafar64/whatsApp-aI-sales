/** Server-side Anthropic API key (Claude). */
export function anthropicApiKeyFromEnv(): string {
  return (
    process.env.ANTHROPIC_API_KEY?.trim() ||
    process.env.CLAUDE_API_KEY?.trim() ||
    ""
  );
}

export function isAnthropicConfiguredFromEnv(): boolean {
  return Boolean(anthropicApiKeyFromEnv());
}

/** Model id: env overrides; default is Haiku (lower cost than Sonnet). */
export function anthropicModelFromEnv(): string {
  return (
    process.env.ANTHROPIC_MODEL?.trim() ||
    process.env.CLAUDE_MODEL?.trim() ||
    "claude-sonnet-4-20250514"
  );
}

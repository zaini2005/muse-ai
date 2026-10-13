import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// The API key is read on the server only (this file is never sent to the
// browser — the "server-only" import makes the build fail if it ever is).
export const CLAUDE_MODEL = "claude-opus-5-5";

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;

export function getClaude(): Anthropic {
  if (!isAiConfigured()) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

/** Shared request settings: if the model declines a request, the API retries
 * it on a suitable fallback model automatically. */
export function fallbackSettings(): {
  betas: Anthropic.Beta.AnthropicBeta[];
  fallbacks: "default";
} {
  return { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };
}

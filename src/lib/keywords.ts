import "server-only";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { CLAUDE_MODEL, fallbackSettings, getClaude, isAiConfigured } from "./anthropic";

export type KeywordSource = "ai" | "basic";

export interface KeywordResult {
  keywords: string[];
  source: KeywordSource;
  note: string | null;
}

const MAX_KEYWORDS = 7;

const KeywordSchema = z.object({
  keywords: z.array(z.string()),
});

const STOPWORDS = new Set(
  "a an and are as at be between by can do does for from how in into is it its of on or our the their them they this to was we what when where which who why with without".split(
    " ",
  ),
);

/** Fallback when no AI key is set: the theme itself plus its content words. */
export function basicKeywords(theme: string): string[] {
  const words = theme
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  return dedupe([words.join(" "), ...words]).slice(0, MAX_KEYWORDS);
}

function dedupe(keywords: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of keywords) {
    const key = k.trim().replace(/\s+/g, " ");
    if (key && key.length <= 60 && !seen.has(key.toLowerCase())) {
      seen.add(key.toLowerCase());
      out.push(key);
    }
  }
  return out;
}

const KEYWORD_PROMPT = `You help a museum curator search The Metropolitan Museum of Art's collection API, which does plain keyword matching against object records (titles, object names, materials, subjects, cultures, artist names, and subject tags).

Turn the curator's exhibition theme into ${MAX_KEYWORDS - 1} or fewer short search terms (one to three words each) that are likely to appear in actual museum records and would surface objects relevant to the theme. Prefer concrete object types, materials, subjects, and iconography over abstract words. Cover different angles of the theme so the results are varied.

Theme: `;

export async function generateKeywords(theme: string): Promise<KeywordResult> {
  if (!isAiConfigured()) {
    return {
      keywords: basicKeywords(theme),
      source: "basic",
      note: "No AI key is configured, so search terms were taken directly from the words in your theme.",
    };
  }

  try {
    const response = await getClaude().beta.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      ...fallbackSettings(),
      output_config: { effort: "low", format: betaZodOutputFormat(KeywordSchema) },
      messages: [{ role: "user", content: KEYWORD_PROMPT + theme }],
    });
    const keywords = dedupe(response.parsed_output?.keywords ?? []).slice(0, MAX_KEYWORDS);
    if (response.stop_reason === "refusal" || keywords.length === 0) {
      throw new Error(`no keywords returned (stop reason: ${response.stop_reason})`);
    }
    return { keywords, source: "ai", note: null };
  } catch (error) {
    console.error("Keyword generation failed, using basic keywords:", error);
    return {
      keywords: basicKeywords(theme),
      source: "basic",
      note: "The AI keyword step failed, so search terms were taken directly from the words in your theme.",
    };
  }
}

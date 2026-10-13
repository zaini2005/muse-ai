import "server-only";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { CLAUDE_MODEL, fallbackSettings, getClaude } from "./anthropic";
import type { MetObject } from "./met";

const ProposalSchema = z.object({
  sufficient: z.boolean(),
  insufficiencyNote: z.string(),
  title: z.string(),
  argument: z.string(),
  narrative: z.string(),
  sections: z.array(
    z.object({
      title: z.string(),
      summary: z.string(),
      objects: z.array(
        z.object({
          objectId: z.number().int(),
          whyItBelongs: z.string(),
          contribution: z.string(),
        }),
      ),
    }),
  ),
  connections: z.array(
    z.object({
      kind: z.enum(["connection", "tension"]),
      objectIds: z.array(z.number().int()),
      note: z.string(),
    }),
  ),
  caveats: z.array(z.string()),
});

export type ExhibitionProposal = z.infer<typeof ProposalSchema> & {
  /** Problems found when checking the AI output against the real records. */
  warnings: string[];
  /** Selected objects the AI did not place in any section. */
  unplacedObjectIds: number[];
};

export class ExhibitionError extends Error {}

const SYSTEM_PROMPT = `You are an experienced museum curator helping a colleague develop a thematic exhibition from real objects in The Metropolitan Museum of Art's collection.

You will receive the exhibition theme and a set of collection records retrieved from The Met's API. These records are the only evidence you may use.

Rules for honesty:
- Use only the objects provided, referring to each by its objectID. Never mention or invent any other object, artist, or artwork.
- Do not state facts about an object (dates, makers, materials, provenance, uses, history) unless they appear in its record. If your interpretation relies on general art-historical context, phrase it as interpretation ("may suggest", "invites us to consider"), not as a record fact.
- If the records are too thin, off-topic, or too few to support a credible exhibition on this theme, set "sufficient" to false and explain why in "insufficiencyNote". Still propose what the material can honestly support, and say what kinds of objects are missing in "caveats".

What to produce:
- "title": a working exhibition title.
- "argument": the central claim the exhibition makes, in two to four sentences.
- "narrative": the curatorial narrative a visitor would follow, in two or three short paragraphs separated by blank lines.
- "sections": three to five gallery sections. Each has a title, a short summary, and the objects assigned to it. An object should appear in at most one section. Leave out objects that do not fit rather than forcing them in.
- For each placed object: "whyItBelongs" (why this specific object belongs here, grounded in its record) and "contribution" (how it advances the central argument).
- "connections": four to eight notable connections or tensions between two or more placed objects, with the objectIDs involved.
- "caveats": limitations of this selection (gaps, over-represented cultures or periods, records with thin information). Use an empty list if there are none.
- Use "insufficiencyNote": "" when the selection is sufficient.`;

function recordForPrompt(o: MetObject) {
  return {
    objectID: o.objectID,
    title: o.title,
    artist: o.artist,
    artistBio: o.artistBio,
    culture: o.culture,
    period: o.period,
    date: o.date,
    medium: o.medium,
    dimensions: o.dimensions,
    department: o.department,
    classification: o.classification,
    objectName: o.objectName,
    geography: o.geography,
    tags: o.tags,
    creditLine: o.creditLine,
    isPublicDomain: o.isPublicDomain,
  };
}

/** Removes any object IDs the model referenced that were not supplied, so
 * the interface can only ever show real, retrieved records. */
export function checkAgainstRecords(
  proposal: z.infer<typeof ProposalSchema>,
  objects: MetObject[],
): ExhibitionProposal {
  const known = new Set(objects.map((o) => o.objectID));
  const warnings: string[] = [];
  const placed = new Set<number>();

  const sections = proposal.sections.map((section) => ({
    ...section,
    objects: section.objects.filter((entry) => {
      if (!known.has(entry.objectId)) {
        warnings.push(
          `The AI referred to object ID ${entry.objectId}, which is not among the retrieved records. It was removed from “${section.title}”.`,
        );
        return false;
      }
      if (placed.has(entry.objectId)) return false;
      placed.add(entry.objectId);
      return true;
    }),
  }));

  const connections = proposal.connections
    .map((c) => {
      const unknown = c.objectIds.filter((id) => !known.has(id));
      if (unknown.length) {
        warnings.push(
          `A connection referred to unknown object ID(s) ${unknown.join(", ")}; those references were removed.`,
        );
      }
      return { ...c, objectIds: c.objectIds.filter((id) => known.has(id)) };
    })
    .filter((c) => c.objectIds.length > 0);

  return {
    ...proposal,
    sections,
    connections,
    warnings,
    unplacedObjectIds: objects
      .map((o) => o.objectID)
      .filter((id) => !placed.has(id)),
  };
}

export async function proposeExhibition(
  theme: string,
  objects: MetObject[],
): Promise<ExhibitionProposal> {
  const response = await getClaude().beta.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    ...fallbackSettings(),
    system: SYSTEM_PROMPT,
    output_config: { effort: "medium", format: betaZodOutputFormat(ProposalSchema) },
    messages: [
      {
        role: "user",
        content: `Exhibition theme: ${theme}\n\nCollection records (JSON, from The Met's API):\n${JSON.stringify(
          objects.map(recordForPrompt),
          null,
          1,
        )}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new ExhibitionError("The AI model declined to write this proposal.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new ExhibitionError(
      "The proposal was too long and was cut off. Try selecting fewer objects.",
    );
  }
  if (!response.parsed_output) {
    throw new ExhibitionError("The AI response could not be read. Please try again.");
  }
  return checkAgainstRecords(response.parsed_output, objects);
}

import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { normalizeArtwork, type RawArtwork } from "./artic";
import type { CollectionObject } from "./types";

// Local copy of real Art Institute of Chicago records, built from the
// museum's official data dump by scripts/build-aic-sample.mjs.
const DATA_DIR = path.join(process.cwd(), "data", "aic");

export class LocalDataError extends Error {}

export interface DatasetManifest {
  museum: string;
  repository: string;
  dump_url: string;
  dump_last_modified: string | null;
  built_at: string;
  license_text: string | null;
  license_links: string[];
  image_license_note: string;
  selection: { rule: string; selected: number; public_domain_with_image: number; with_description: number };
}

interface IndexedRecord {
  object: CollectionObject;
  /** Tokens per searchable field, with the field's weight. */
  fields: { weight: number; tokens: Set<string> }[];
  /** 0 = public domain with image, 1 = image only, 2 = no image. */
  tier: number;
  boosted: boolean;
  order: number;
}

const STOPWORDS = new Set(
  "a an and are as at be by for from has have in into is it its of on or that the their this to was were with".split(" "),
);

/** Light English stemming so "coins" finds "coin" and "currencies" finds "currency". */
function stem(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && /(ch|sh|x|ss)es$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !/(ss|us|is)$/.test(word)) return word.slice(0, -1);
  return word;
}

export function tokenize(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents: "café" → "cafe"
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);
}

const tokenSet = (...parts: (string | string[] | null | undefined)[]) =>
  new Set(parts.flat().flatMap((p) => tokenize(p)));

function index(raw: RawArtwork, order: number): IndexedRecord {
  const object = normalizeArtwork(raw);
  return {
    object,
    fields: [
      { weight: 5, tokens: tokenSet(raw.title) },
      { weight: 3, tokens: tokenSet(raw.artist_display, raw.subject_titles ?? [], raw.theme_titles ?? []) },
      {
        weight: 2,
        tokens: tokenSet(
          raw.term_titles ?? [],
          raw.artwork_type_title,
          raw.classification_title,
          raw.medium_display,
          raw.style_title,
          raw.place_of_origin,
          raw.department_title,
        ),
      },
      { weight: 1, tokens: tokenSet(object.description, raw.date_display, raw.credit_line) },
    ],
    tier: object.image ? (object.isPublicDomain ? 0 : 1) : 2,
    boosted: raw.is_boosted === true,
    order,
  };
}

let records: IndexedRecord[] | null = null;
let manifest: DatasetManifest | null = null;

function load(): IndexedRecord[] {
  if (records) return records;
  let raw: RawArtwork[];
  try {
    raw = JSON.parse(readFileSync(path.join(DATA_DIR, "artworks.json"), "utf8"));
  } catch (error) {
    const missing = (error as NodeJS.ErrnoException).code === "ENOENT";
    throw new LocalDataError(
      missing
        ? "The local dataset file data/aic/artworks.json is missing. Run “npm run data:aic” to build it."
        : `The local dataset could not be read: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!Array.isArray(raw)) throw new LocalDataError("data/aic/artworks.json does not contain a list of records.");
  records = raw.filter((r) => typeof r?.id === "number").map(index);
  return records;
}

export function getManifest(): DatasetManifest | null {
  if (manifest) return manifest;
  try {
    manifest = JSON.parse(readFileSync(path.join(DATA_DIR, "manifest.json"), "utf8"));
  } catch {
    return null;
  }
  return manifest;
}

export function datasetSize(): number {
  return load().length;
}

/** The first `count` records in dataset order (which rotates across departments). */
export function sampleRecords(count: number): CollectionObject[] {
  return load().slice(0, count).map((r) => r.object);
}

/**
 * Keyword search. Every word in the query must appear somewhere in the
 * record; matches in the title count most, then artist and subjects, then
 * materials and object type, then the description.
 */
export function searchLocal(
  query: string,
  limit = 20,
): { total: number; objects: CollectionObject[] } {
  const terms = [...new Set(tokenize(query))];
  if (terms.length === 0) return { total: 0, objects: [] };

  const hits: { record: IndexedRecord; score: number }[] = [];
  for (const record of load()) {
    let score = 0;
    for (const term of terms) {
      let best = 0;
      for (const field of record.fields) {
        if (field.weight > best && field.tokens.has(term)) best = field.weight;
      }
      if (best === 0) {
        score = 0;
        break;
      }
      score += best;
    }
    if (score > 0) hits.push({ record, score });
  }

  hits.sort(
    (a, b) =>
      b.score - a.score ||
      a.record.tier - b.record.tier ||
      Number(b.record.boosted) - Number(a.record.boosted) ||
      a.record.order - b.record.order,
  );
  return { total: hits.length, objects: hits.slice(0, limit).map((h) => h.record.object) };
}

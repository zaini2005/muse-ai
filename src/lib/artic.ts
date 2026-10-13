// Helpers for Art Institute of Chicago artwork records. Field names follow
// the museum's API (https://api.artic.edu/docs/), which is also the format
// of its public data dump used for the local dataset in data/aic/.

import type { CollectionObject, RecordLicense } from "./types";

const DEFAULT_IIIF = "https://www.artic.edu/iiif/2";

/** Shape of one artwork record (only the fields we read). */
export interface RawArtwork {
  id: number;
  api_link?: string | null;
  title?: string | null;
  artist_display?: string | null;
  artist_title?: string | null;
  date_display?: string | null;
  medium_display?: string | null;
  dimensions?: string | null;
  department_title?: string | null;
  classification_title?: string | null;
  artwork_type_title?: string | null;
  place_of_origin?: string | null;
  style_title?: string | null;
  credit_line?: string | null;
  main_reference_number?: string | null;
  is_public_domain?: boolean | null;
  copyright_notice?: string | null;
  is_on_view?: boolean | null;
  gallery_title?: string | null;
  image_id?: string | null;
  thumbnail?: { alt_text?: string | null } | null;
  short_description?: string | null;
  description?: string | null;
  subject_titles?: string[] | null;
  term_titles?: string[] | null;
  theme_titles?: string[] | null;
  is_boosted?: boolean | null;
  // Added when the local dataset is built (see scripts/build-aic-sample.mjs).
  museum_url?: string;
  source?: string;
  license?: RecordLicense;
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** The museum's descriptions are HTML; we display them as plain text. */
export function htmlToText(html: string | null | undefined): string | null {
  if (!html) return null;
  const text = html
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;|&lsquo;/g, "’")
    .replace(/&ldquo;|&rdquo;/g, "\"")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .trim();
  return text || null;
}

/** IIIF image URL. 843px wide is the size the museum recommends and caches. */
export function articImageUrl(imageId: string, iiifUrl = DEFAULT_IIIF): string {
  return `${iiifUrl}/${imageId}/full/843,/0/default.jpg`;
}

export function normalizeArtwork(raw: RawArtwork, iiifUrl = DEFAULT_IIIF): CollectionObject {
  // artist_display is either one line ("Georges Seurat (French, 1859–1891)")
  // or "Name\nNationality, dates" — and for anonymous works it names the
  // culture or place instead. Show the first line; keep the rest as detail.
  const [artistLine, ...bioLines] = (raw.artist_display ?? "").split("\n");
  const imageId = clean(raw.image_id);
  return {
    id: `aic-${raw.id}`,
    museum: "Art Institute of Chicago",
    sourceId: raw.id,
    title: clean(raw.title) ?? "Untitled",
    artist: clean(artistLine),
    artistBio: clean(bioLines.join(" ")),
    culture: null,
    period: clean(raw.style_title),
    date: clean(raw.date_display),
    medium: clean(raw.medium_display),
    dimensions: clean(raw.dimensions),
    department: clean(raw.department_title),
    classification: clean(raw.classification_title),
    objectName: clean(raw.artwork_type_title),
    creditLine: clean(raw.credit_line),
    accessionNumber: clean(raw.main_reference_number),
    geography: clean(raw.place_of_origin),
    tags: (raw.subject_titles ?? []).filter(Boolean),
    isPublicDomain: raw.is_public_domain === true,
    copyrightNotice: clean(raw.copyright_notice),
    image: imageId ? articImageUrl(imageId, iiifUrl) : null,
    imageAlt: clean(raw.thumbnail?.alt_text),
    url: raw.museum_url ?? `https://www.artic.edu/artworks/${raw.id}`,
    apiLink: clean(raw.api_link) ?? `https://api.artic.edu/api/v1/artworks/${raw.id}`,
    onView: raw.is_on_view ? clean(raw.gallery_title) ?? "On view" : null,
    description: htmlToText(raw.description) ?? htmlToText(raw.short_description),
    source: raw.source ?? "Art Institute of Chicago",
    license: raw.license ?? null,
  };
}

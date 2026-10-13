// Shapes shared between the API routes and the browser.
import type { MetObject } from "./met";
import type { ExhibitionProposal } from "./exhibition";
import type { KeywordSource } from "./keywords";

export type { MetObject, ExhibitionProposal, KeywordSource };

/** Licensing as recorded in the local dataset. */
export interface RecordLicense {
  metadata: string;
  description: string | null;
  image: string;
}

/** One museum record in a museum-neutral shape. Every value comes from the
 * museum's own API — nothing is generated. Fields a museum does not provide
 * are null. */
export interface CollectionObject {
  /** Unique across museums, e.g. "aic-27992". */
  id: string;
  museum: "Art Institute of Chicago";
  /** The museum's own ID for the record. */
  sourceId: number;
  title: string;
  artist: string | null;
  artistBio: string | null;
  culture: string | null;
  period: string | null;
  date: string | null;
  medium: string | null;
  dimensions: string | null;
  department: string | null;
  classification: string | null;
  objectName: string | null;
  creditLine: string | null;
  accessionNumber: string | null;
  geography: string | null;
  tags: string[];
  isPublicDomain: boolean;
  copyrightNotice: string | null;
  image: string | null;
  imageAlt: string | null;
  /** The record's page on the museum's website. */
  url: string;
  /** The record in the museum's own API. */
  apiLink: string;
  /** Gallery name when on view, otherwise null. */
  onView: string | null;
  /** The museum's own description text, if it has one. */
  description: string | null;
  /** Where this record came from (dataset and date). */
  source: string;
  license: RecordLicense | null;
}

export interface FoundObject extends CollectionObject {
  /** The search terms that surfaced this object. */
  matchedKeywords: string[];
}

export interface KeywordStat {
  keyword: string;
  /** Total matches the museum reported for this term (or null if the search failed). */
  matches: number | null;
}

export interface SearchResponse {
  theme: string;
  keywords: KeywordStat[];
  objects: FoundObject[];
}

export interface ProposalResponse {
  proposal: ExhibitionProposal;
  /** The records the proposal was written from, re-fetched from the Met. */
  objects: MetObject[];
}

export interface ApiError {
  error: string;
}

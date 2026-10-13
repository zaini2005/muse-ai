// Shapes shared between the API routes and the browser.
import type { MetObject } from "./met";
import type { ExhibitionProposal } from "./exhibition";
import type { KeywordSource } from "./keywords";

export type { MetObject, ExhibitionProposal, KeywordSource };

export interface FoundObject extends MetObject {
  /** The search terms that surfaced this object. */
  matchedKeywords: string[];
}

export interface KeywordStat {
  keyword: string;
  /** Total matches the Met reported for this term (or null if the search failed). */
  matches: number | null;
}

export interface SearchResponse {
  theme: string;
  keywords: KeywordStat[];
  keywordSource: KeywordSource;
  keywordNote: string | null;
  aiAvailable: boolean;
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

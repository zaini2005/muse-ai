import { NextResponse } from "next/server";
import { basicKeywords } from "@/lib/keywords";
import { LocalDataError, searchLocal } from "@/lib/local-collection";
import type { ApiError, FoundObject, KeywordStat, SearchResponse } from "@/lib/types";

const PER_KEYWORD = 12;
const MAX_OBJECTS = 36;

// Searches the local Art Institute of Chicago dataset (data/aic/), not a live API.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const theme = typeof body?.theme === "string" ? body.theme.trim() : "";
  if (theme.length < 3 || theme.length > 500) {
    return NextResponse.json<ApiError>(
      { error: "Please enter a theme or question between 3 and 500 characters." },
      { status: 400 },
    );
  }

  const keywords = basicKeywords(theme);
  if (keywords.length === 0) {
    return NextResponse.json<ApiError>(
      { error: "Your theme has no searchable words. Try adding a subject, material, or idea." },
      { status: 400 },
    );
  }

  let searches: { keyword: string; total: number; objects: FoundObject[] }[];
  try {
    searches = keywords.map((keyword) => {
      const { total, objects } = searchLocal(keyword, PER_KEYWORD);
      return { keyword, total, objects: objects.map((o) => ({ ...o, matchedKeywords: [] })) };
    });
  } catch (error) {
    const message =
      error instanceof LocalDataError ? error.message : "The local collection search failed.";
    return NextResponse.json<ApiError>({ error: message }, { status: 500 });
  }

  // Take results from each keyword in turn, so every angle on the theme is
  // represented rather than the first keyword dominating.
  const found = new Map<string, FoundObject>();
  for (let round = 0; round < PER_KEYWORD && found.size < MAX_OBJECTS; round++) {
    for (const { keyword, objects } of searches) {
      const object = objects[round];
      if (!object) continue;
      const existing = found.get(object.id) ?? (found.size < MAX_OBJECTS ? object : null);
      if (!existing) continue;
      existing.matchedKeywords.push(keyword);
      found.set(object.id, existing);
    }
  }

  // Public-domain objects with images first, then other objects with images,
  // then the rest. The sort is stable, so search relevance is kept within each.
  const tier = (o: FoundObject) => (o.image ? (o.isPublicDomain ? 0 : 1) : 2);
  const objects = [...found.values()].sort((a, b) => tier(a) - tier(b));

  const keywordStats: KeywordStat[] = searches.map(({ keyword, total }) => ({
    keyword,
    matches: total,
  }));

  return NextResponse.json<SearchResponse>({ theme, keywords: keywordStats, objects });
}

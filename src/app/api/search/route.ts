import { NextResponse } from "next/server";
import { isAiConfigured } from "@/lib/anthropic";
import { generateKeywords } from "@/lib/keywords";
import { MetApiError, getMetObjects, rankObjects, searchMet } from "@/lib/met";
import type { ApiError, FoundObject, KeywordStat, SearchResponse } from "@/lib/types";

const WITH_IMAGES_PER_KEYWORD = 8;
const WITHOUT_IMAGES_PER_KEYWORD = 2;
const MAX_OBJECTS = 40;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const theme = typeof body?.theme === "string" ? body.theme.trim() : "";
  if (theme.length < 3 || theme.length > 500) {
    return NextResponse.json<ApiError>(
      { error: "Please enter a theme or question between 3 and 500 characters." },
      { status: 400 },
    );
  }

  const { keywords, source, note } = await generateKeywords(theme);

  // Two searches per keyword: one restricted to objects with images (preferred)
  // and one unrestricted, so relevant objects without images can still appear.
  const searches = await Promise.allSettled(
    keywords.map(async (keyword) => {
      const [withImages, all] = await Promise.all([
        searchMet(keyword, { hasImages: true }),
        searchMet(keyword),
      ]);
      return { keyword, withImages, all };
    }),
  );

  const succeeded = searches.flatMap((s) => (s.status === "fulfilled" ? [s.value] : []));
  if (succeeded.length === 0) {
    const reason = searches.find((s) => s.status === "rejected");
    const message =
      reason?.status === "rejected" && reason.reason instanceof MetApiError
        ? reason.reason.message
        : "The Met collection search failed";
    return NextResponse.json<ApiError>(
      { error: `${message}. Please try again in a moment.` },
      { status: 502 },
    );
  }

  // Take the top results for each keyword in turn, so every angle on the
  // theme is represented rather than the first keyword dominating.
  const matched = new Map<number, string[]>();
  const picks = succeeded.map(({ keyword, withImages, all }) => {
    const imageSet = new Set(withImages);
    return {
      keyword,
      ids: [
        ...withImages.slice(0, WITH_IMAGES_PER_KEYWORD),
        ...all.filter((id) => !imageSet.has(id)).slice(0, WITHOUT_IMAGES_PER_KEYWORD),
      ],
    };
  });
  const candidateIds: number[] = [];
  for (let round = 0; candidateIds.length < MAX_OBJECTS; round++) {
    let added = false;
    for (const { keyword, ids } of picks) {
      const id = ids[round];
      if (id === undefined) continue;
      added = true;
      if (!matched.has(id)) {
        matched.set(id, []);
        if (candidateIds.length < MAX_OBJECTS) candidateIds.push(id);
      }
      matched.get(id)!.push(keyword);
    }
    if (!added) break;
  }

  let objects: FoundObject[] = [];
  try {
    const records = await getMetObjects(candidateIds);
    objects = rankObjects(
      records.map((o) => ({ ...o, matchedKeywords: matched.get(o.objectID) ?? [] })),
    );
  } catch (error) {
    const message = error instanceof MetApiError ? error.message : "Could not load object records.";
    return NextResponse.json<ApiError>({ error: message }, { status: 502 });
  }

  const keywordStats: KeywordStat[] = keywords.map((keyword) => {
    const result = succeeded.find((s) => s.keyword === keyword);
    return { keyword, matches: result ? result.all.length : null };
  });

  return NextResponse.json<SearchResponse>({
    theme,
    keywords: keywordStats,
    keywordSource: source,
    keywordNote: note,
    aiAvailable: isAiConfigured(),
    objects,
  });
}

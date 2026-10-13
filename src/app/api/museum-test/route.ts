// TEMPORARY: checks that the server can reach a museum API and get real data.
import { NextResponse } from "next/server";
import { describeFetchError } from "@/lib/met";

const TEST_URL =
  "https://api.artic.edu/api/v1/artworks/search?q=currency&limit=3&fields=id,title,artist_display,date_display,image_id,is_public_domain";

export interface MuseumTestResult {
  ok: boolean;
  url: string;
  /** HTTP status from the museum, or null if no response arrived. */
  status: number | null;
  error?: string;
  totalMatches?: number;
  artworks?: {
    id: number;
    title: string;
    artist: string | null;
    date: string | null;
    isPublicDomain: boolean;
    hasImage: boolean;
  }[];
}

function fail(status: number | null, error: string) {
  return NextResponse.json<MuseumTestResult>({ ok: false, url: TEST_URL, status, error });
}

export async function GET() {
  let res: Response;
  try {
    res = await fetch(TEST_URL, {
      // The Art Institute asks API users to identify themselves with this header.
      headers: { Accept: "application/json", "AIC-User-Agent": "ThematicCurator (connection test)" },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
  } catch (error) {
    return fail(null, `Could not reach the Art Institute of Chicago API: ${describeFetchError(error)}.`);
  }

  const text = await res.text();
  if (!res.ok) {
    return fail(
      res.status,
      `The Art Institute of Chicago API responded with HTTP ${res.status} ${res.statusText}.`,
    );
  }

  let body: {
    pagination?: { total?: number };
    data?: {
      id?: number;
      title?: string;
      artist_display?: string | null;
      date_display?: string | null;
      image_id?: string | null;
      is_public_domain?: boolean;
    }[];
  };
  try {
    body = JSON.parse(text);
  } catch {
    return fail(
      res.status,
      `The API answered, but not with JSON. It began: “${text.slice(0, 120)}”`,
    );
  }
  if (!Array.isArray(body.data)) {
    return fail(res.status, "The API answered with JSON, but it had no list of artworks in it.");
  }

  return NextResponse.json<MuseumTestResult>({
    ok: true,
    url: TEST_URL,
    status: res.status,
    totalMatches: body.pagination?.total,
    artworks: body.data
      .filter((a) => typeof a.id === "number")
      .map((a) => ({
        id: a.id!,
        title: a.title?.trim() || "(no title in record)",
        artist: a.artist_display?.trim() || null,
        date: a.date_display?.trim() || null,
        isPublicDomain: Boolean(a.is_public_domain),
        hasImage: Boolean(a.image_id),
      })),
  });
}

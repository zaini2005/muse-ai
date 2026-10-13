// Server-side client for The Metropolitan Museum of Art Collection API.
// Docs: https://metmuseum.github.io/  (no API key required)

const MET_BASE = "https://collectionapi.metmuseum.org/public/collection/v1";
const ONE_DAY = 60 * 60 * 24;

/** A Met collection record, trimmed to the fields this app displays. Every
 * value here comes straight from the museum's API — nothing is generated. */
export interface MetObject {
  objectID: number;
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
  image: string | null;
  imageLarge: string | null;
  url: string;
  galleryNumber: string | null;
}

export class MetApiError extends Error {}

/** Turns a failed fetch() into a readable reason. Node reports every network
 * failure as "fetch failed" and puts the real reason in `error.cause`. */
export function describeFetchError(error: unknown): string {
  if (!(error instanceof Error)) return "unknown network error";
  if (error.name === "TimeoutError") return "the request timed out after 15 seconds";
  const cause = (error as { cause?: { code?: unknown; message?: unknown } }).cause;
  const code = typeof cause?.code === "string" ? cause.code : "";
  const detail = typeof cause?.message === "string" ? cause.message : "";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN")
    return "the server could not be found — check your internet connection (DNS lookup failed)";
  if (code === "ECONNREFUSED") return "the connection was refused";
  if (code === "ECONNRESET") return "the connection was reset";
  if (code.startsWith("UND_ERR_CONNECT_TIMEOUT")) return "the connection timed out";
  if (code.includes("CERT") || detail.includes("certificate"))
    return `the secure connection could not be verified (${detail || code})`;
  if (detail === "Request was cancelled.")
    return "a proxy or firewall refused the connection";
  return detail || code ? `${error.message}: ${detail || code}` : error.message;
}

// Shape of the raw API response (only the fields we read).
interface RawMetObject {
  objectID: number;
  isPublicDomain?: boolean;
  primaryImage?: string;
  primaryImageSmall?: string;
  department?: string;
  objectName?: string;
  title?: string;
  culture?: string;
  period?: string;
  dynasty?: string;
  artistDisplayName?: string;
  artistDisplayBio?: string;
  objectDate?: string;
  medium?: string;
  dimensions?: string;
  creditLine?: string;
  city?: string;
  region?: string;
  country?: string;
  classification?: string;
  accessionNumber?: string;
  objectURL?: string;
  GalleryNumber?: string;
  tags?: { term?: string }[] | null;
}

function clean(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function normalizeMetObject(raw: RawMetObject): MetObject {
  const geography = [raw.city, raw.region, raw.country]
    .map(clean)
    .filter(Boolean)
    .join(", ");
  return {
    objectID: raw.objectID,
    title: clean(raw.title) ?? clean(raw.objectName) ?? "Untitled",
    artist: clean(raw.artistDisplayName),
    artistBio: clean(raw.artistDisplayBio),
    culture: clean(raw.culture),
    period: clean(raw.period) ?? clean(raw.dynasty),
    date: clean(raw.objectDate),
    medium: clean(raw.medium),
    dimensions: clean(raw.dimensions),
    department: clean(raw.department),
    classification: clean(raw.classification),
    objectName: clean(raw.objectName),
    creditLine: clean(raw.creditLine),
    accessionNumber: clean(raw.accessionNumber),
    geography: geography || null,
    tags: (raw.tags ?? [])
      .map((t) => clean(t.term))
      .filter((t): t is string => Boolean(t)),
    isPublicDomain: Boolean(raw.isPublicDomain),
    image: clean(raw.primaryImageSmall) ?? clean(raw.primaryImage),
    imageLarge: clean(raw.primaryImage),
    url:
      clean(raw.objectURL) ??
      `https://www.metmuseum.org/art/collection/search/${raw.objectID}`,
    galleryNumber: clean(raw.GalleryNumber),
  };
}

async function metFetch(path: string): Promise<Response> {
  const url = `${MET_BASE}${path}`;
  let lastError: unknown;
  // One retry: the Met API occasionally drops requests under load.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "ThematicCurator/0.1" },
        signal: AbortSignal.timeout(15000),
        next: { revalidate: ONE_DAY },
      });
      if (res.status >= 500) {
        lastError = new MetApiError(`The Met API returned ${res.status}`);
        continue;
      }
      return res;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof MetApiError
    ? lastError
    : new MetApiError(
        `Could not reach The Met collection API: ${describeFetchError(lastError)}`,
      );
}

/** Returns matching object IDs, in the order the Met API ranks them. */
export async function searchMet(
  query: string,
  options: { hasImages?: boolean } = {},
): Promise<number[]> {
  const params = new URLSearchParams({ q: query });
  if (options.hasImages) params.set("hasImages", "true");
  const res = await metFetch(`/search?${params}`);
  if (!res.ok) throw new MetApiError(`Met search failed (${res.status})`);
  const data = (await res.json()) as { objectIDs: number[] | null };
  return data.objectIDs ?? [];
}

/** Fetches one full record. Returns null if the Met no longer has the object
 * (search results occasionally include IDs that now 404). */
export async function getMetObject(id: number): Promise<MetObject | null> {
  const res = await metFetch(`/objects/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new MetApiError(`Met object ${id} failed (${res.status})`);
  const raw = (await res.json()) as RawMetObject;
  if (!raw?.objectID) return null;
  return normalizeMetObject(raw);
}

/** Runs `fn` over `items` with at most `limit` in flight (the Met API asks
 * clients to stay under 80 requests per second). */
export async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { status: "fulfilled", value: await fn(items[index]) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Fetches several records, skipping any that are missing. Throws only if
 * every request failed (which means the API itself is unreachable). */
export async function getMetObjects(ids: number[]): Promise<MetObject[]> {
  const settled = await mapWithLimit(ids, 8, getMetObject);
  const objects: MetObject[] = [];
  let failures = 0;
  for (const result of settled) {
    if (result.status === "fulfilled") {
      if (result.value) objects.push(result.value);
    } else {
      failures++;
    }
  }
  if (ids.length > 0 && failures === ids.length) {
    const first = settled.find((r) => r.status === "rejected");
    throw first?.status === "rejected" && first.reason instanceof MetApiError
      ? first.reason
      : new MetApiError("Could not retrieve any records from The Met API");
  }
  return objects;
}

/** Public-domain objects with images first, then objects with images, then
 * the rest. Stable, so the API's relevance order is kept within each tier. */
export function rankObjects<T extends MetObject>(objects: T[]): T[] {
  const tier = (o: MetObject) => (o.image ? (o.isPublicDomain ? 0 : 1) : 2);
  return [...objects].sort((a, b) => tier(a) - tier(b));
}

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

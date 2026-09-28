export type CorsHeaders = Readonly<Record<string, string>>;

/** Request headers every allowlisted origin may send (preflights can add more). */
const DEFAULT_ALLOWED_HEADERS: ReadonlyArray<string> = ["Content-Type", "Authorization"];

/** RFC 9110 `token` — the only valid shape for a header field name. */
const HEADER_TOKEN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

/**
 * Build CORS headers for a given request.
 * When `allowedOrigins` is set, only matching origins get reflected.
 * When unset, no CORS headers are added (no permissive wildcard by default).
 */
export function buildCorsHeaders(request: Request, allowedOrigins: ReadonlyArray<string> | undefined): CorsHeaders {
  if (!allowedOrigins) return {};

  // With an allowlist the response depends on Origin even when it gets no
  // CORS headers (Origin absent or unlisted) — without `Vary`, a shared cache
  // could replay a header-less response to an allowed origin, or vice versa.
  const origin = request.headers.get("Origin");
  if (!origin || !allowedOrigins.includes(origin)) return { Vary: "Origin" };

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": DEFAULT_ALLOWED_HEADERS.join(", "),
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/**
 * Attach CORS headers to an existing Response.
 */
export function withCors(response: Response, corsHeaders: CorsHeaders): Response {
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

/**
 * `Access-Control-Allow-Headers` for a preflight from an ALLOWLISTED origin:
 * the defaults plus the header names it asks for — the widget's `headers`
 * option lets hosts send their own (a session token, a tenant id), which the
 * fixed default list would block. Names that are not valid header tokens
 * are dropped.
 */
function preflightAllowedHeaders(request: Request): string {
  const allowed = [...DEFAULT_ALLOWED_HEADERS];
  const seen = new Set(allowed.map((name) => name.toLowerCase()));
  for (const raw of (request.headers.get("Access-Control-Request-Headers") ?? "").split(",")) {
    const name = raw.trim();
    if (!HEADER_TOKEN.test(name) || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    allowed.push(name);
  }
  return allowed.join(", ");
}

/**
 * Answer a CORS preflight. Configure `allowedOrigins` to restrict which
 * domains can make cross-origin requests to the API: without it, no CORS
 * headers are emitted and browsers block widget requests.
 */
export function preflightResponse(request: Request, allowedOrigins: ReadonlyArray<string> | undefined): Response {
  const corsHeaders = buildCorsHeaders(request, allowedOrigins);
  // An allowlisted preflight's answer also depends on the headers it requests.
  const headers = corsHeaders["Access-Control-Allow-Origin"]
    ? {
        ...corsHeaders,
        "Access-Control-Allow-Headers": preflightAllowedHeaders(request),
        Vary: "Origin, Access-Control-Request-Headers",
      }
    : corsHeaders;
  return new Response(null, { status: 204, headers });
}

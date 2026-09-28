import type { SitepingHttpMethod } from "./options.js";

// Cross-site request forgery guards of the mutating methods, for policies
// that may authenticate with cookies. CORS only hides a response from a
// foreign page; it never stops a "simple" request (a credentialed POST with
// `Content-Type: text/plain`) from reaching the handler.

/** Longest refused `Origin` written to the log (untrusted input). */
const MAX_LOGGED_ORIGIN_LENGTH = 128;

/** Why a mutation is refused: a foreign origin (403) or a non-JSON body (415). */
export type CsrfRefusal = { status: 403; origin: string } | { status: 415 };

/**
 * Why a mutation must be refused, or `null` to let it through.
 *
 * - **Origin** (403), only with an `allowedOrigins` list: listed origins and
 *   the endpoint's own pass; anything else — the opaque `null` origin of
 *   sandboxed frames included — is refused. A request without `Origin`
 *   passes: browsers always send it on cross-origin POST/PATCH/DELETE,
 *   server-to-server calls and curl do not.
 * - **Content type** (415): only `application/json` (parameters such as
 *   `charset` allowed). It is not CORS-safelisted, so a cross-origin browser
 *   must pass a preflight first, which fails without CORS headers.
 */
export function csrfRefusal(
  request: Request,
  method: SitepingHttpMethod,
  allowedOrigins: ReadonlyArray<string> | undefined,
): CsrfRefusal | null {
  if (method !== "POST" && method !== "PATCH" && method !== "DELETE") return null;

  const origin = request.headers.get("Origin");
  if (allowedOrigins && origin !== null && !allowedOrigins.includes(origin) && origin !== new URL(request.url).origin) {
    // The refused origin is logged: strip control characters and truncate it.
    // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control characters is the point
    return { status: 403, origin: origin.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, MAX_LOGGED_ORIGIN_LENGTH) };
  }

  const [mediaType = ""] = (request.headers.get("Content-Type") ?? "").split(";");
  if (mediaType.trim().toLowerCase() !== "application/json") return { status: 415 };
  return null;
}

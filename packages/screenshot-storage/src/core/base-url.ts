import { parseHttpUrl } from "@siteping/core";

/**
 * Remove every trailing `/` from a configured base URL.
 *
 * A linear scan instead of `/\/+$/`: that regex backtracks quadratically on
 * inputs with long runs of `/` not at the end (CodeQL `js/polynomial-redos`),
 * and base URLs come from library callers.
 *
 * @param value - Base URL or endpoint as configured by the caller.
 * @returns `value` without trailing slashes (empty when it is only slashes).
 */
function trimTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === "/") end--;
  return value.slice(0, end);
}

/**
 * A configured base URL (`publicBaseUrl`, `endpoint`…) as the URL parser
 * serializes it, without its trailing slashes, once checked to be an
 * absolute `http(s)` URL without credentials, a query or a fragment. Keys
 * are appended to it as path segments, so a relative path, a `javascript:`
 * URL or a `?` or `#` (even an empty one) would produce URLs that point
 * elsewhere, and credentials would be copied into every stored screenshot URL.
 *
 * The refused value is never quoted: it is thrown at startup, into server
 * logs, and may carry a secret the parser does not see as credentials — a
 * `?token=`, a `#sig=`, or the password of a URL that does not parse or lacks
 * its scheme (`user:pass@host` parses as the scheme `user:`).
 *
 * @param value - The base URL as configured by the caller.
 * @param option - Name of the option, for the error message.
 * @returns The URL's origin and path, normalized (lowercase scheme and host,
 *   `https:host` → `https://host`) and without trailing slashes.
 * @throws Error naming the option and why its value was refused, never the value.
 */
export function normalizeBaseUrl(value: string, option: string): string {
  const url = parseHttpUrl(value);
  if (!url) throw new Error(`[siteping] ${option} must be an absolute http(s) URL`);
  if (url.username || url.password) {
    throw new Error(`[siteping] ${option} must not contain credentials (user:password@)`);
  }
  if (value.includes("?") || value.includes("#")) {
    throw new Error(`[siteping] ${option} must not contain a query or a fragment (? or #)`);
  }
  return trimTrailingSlashes(`${url.origin}${url.pathname}`);
}

/**
 * Whether `hostname` is this machine: the hosts the widget's panel also shows
 * plain-http screenshots from, for a local MinIO or dev server — the same
 * list as the widget's `isLoopbackHttp` (`packages/widget/src/panel-detail.ts`).
 *
 * @param hostname - Hostname of a parsed URL (lowercase, IPv6 in brackets).
 */
function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1" || hostname === "[::1]"
  );
}

/**
 * Warn, at configuration time, when the widget's panel will not show the
 * screenshot URLs: it renders `https://` ones, and plain `http://` ones only
 * on this machine. Any other `http://` base would lose them there silently,
 * and on a dashboard served over https too, as mixed content.
 *
 * @param base - A base URL normalized by {@link normalizeBaseUrl}, whose scheme is lowercase.
 * @param option - Name of the option, for the warning.
 */
export function warnUnlessHttps(base: string, option: string): void {
  if (base.startsWith("https://") || isLoopbackHostname(new URL(base).hostname)) return;
  console.warn(
    `[siteping] ${option} "${base}" is neither https nor on this machine: the widget's panel will not show ` +
      "its screenshots, and a dashboard served over https blocks them as mixed content.",
  );
}

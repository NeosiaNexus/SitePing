import type { FeedbackRecord } from "./types.js";

/**
 * `url` resolved against `base`, when the result is an http(s) URL. A
 * record's `url` is client-supplied: without the scheme allowlist, a crafted
 * feedback (`javascript:…`, `data:…`) would turn into a live link.
 */
export function parseHttpUrl(url: string, base?: string): URL | null {
  try {
    const parsed = new URL(url, base);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Whether a screenshot URL is safe to render as an `<img src>`, in the
 * widget's panel and the dashboard alike. A store can hold any string there
 * (a direct store caller, a custom `ScreenshotStorage`, a migrated database):
 * a `javascript:`, `data:text/html` or `data:image/svg+xml` URL — SVG can
 * carry external `<image href>` references — or an arbitrary host would make
 * the viewer fetch from it, leaking their IP and user agent. Browsers never
 * run scripts from an `<img>`, but the fetch itself still happens.
 */
export function isSafeImageUrl(url: string): boolean {
  // The formats the widget captures; SVG is rarely a screenshot anyway.
  if (/^data:image\/(jpeg|png|webp);/i.test(url)) return true;
  // Remote storage over https (S3, R2…). Other http: URLs are refused: the
  // viewer typically runs over https, where mixed content is blocked anyway.
  if (/^https:\/\//i.test(url)) return true;
  return isLoopbackHttp(url);
}

/**
 * Plain-http URL on this machine — a dev stack's local object storage (MinIO
 * on `localhost:9000`, localstack) behind a `ScreenshotStorage`. Nothing
 * leaves the machine, so there is no IP/UA/Referer leak to defend against.
 * Parsed rather than pattern-matched, so `localhost.evil.com` or
 * `localhost@evil.com` never pass for loopback.
 */
function isLoopbackHttp(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return (
      protocol === "http:" &&
      (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1" || hostname === "[::1]")
    );
  } catch {
    return false;
  }
}

/**
 * Link that opens a feedback's page with the widget focused on it —
 * `?<param>=<id>`, read by the widget's `deepLink` option. Relative record
 * URLs (the widget stores `location.pathname` by default) resolve against
 * `base`. Null when there is no safe http(s) target.
 */
export function buildDeepLink(record: Pick<FeedbackRecord, "id" | "url">, param: string, base?: string): string | null {
  const url = parseHttpUrl(record.url, base);
  if (!url) return null;
  url.searchParams.set(param, record.id);
  return url.toString();
}

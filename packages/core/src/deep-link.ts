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

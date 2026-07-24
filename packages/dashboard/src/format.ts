import type { FeedbackRecord } from "@siteping/core";
import { type TFunction, tWithParams } from "./i18n/index.js";

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * Compact relative timestamp for list rows — "now", "5 min", "3 h", "2 d"…
 * All thresholds floor (Linear-style: "1 h" until a full second hour has
 * elapsed). Future dates clamp to "now".
 */
export function formatRelativeTime(date: Date, t: TFunction): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < MINUTE) return t("time.now");
  if (seconds < HOUR) return tWithParams(t, "time.minutes", { n: Math.floor(seconds / MINUTE) });
  if (seconds < DAY) return tWithParams(t, "time.hours", { n: Math.floor(seconds / HOUR) });
  if (seconds < WEEK) return tWithParams(t, "time.days", { n: Math.floor(seconds / DAY) });
  if (seconds < MONTH) return tWithParams(t, "time.weeks", { n: Math.floor(seconds / WEEK) });
  if (seconds < YEAR) {
    const n = Math.floor(seconds / MONTH);
    // month/year units inflect in several locales ("1 mes" / "3 meses") —
    // the smaller units use invariable abbreviations and need no split.
    return tWithParams(t, n === 1 ? "time.month" : "time.months", { n });
  }
  const n = Math.floor(seconds / YEAR);
  return tWithParams(t, n === 1 ? "time.year" : "time.years", { n });
}

/** Full localized date + time, for row tooltips and the drawer meta grid. */
export function formatAbsolute(date: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
  } catch {
    // Invalid BCP-47 tag from a custom locale — fall back to English.
    return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }
}

/**
 * `pathname + hash` of a feedback URL, for the compact mono path in rows and
 * the evidence caption. Relative URLs (widget records store pathnames)
 * resolve against a dummy base; unparseable strings pass through raw.
 */
export function pathFromUrl(url: string): string {
  try {
    const u = new URL(url, "http://x");
    return `${u.pathname}${u.hash}`;
  } catch {
    return url;
  }
}

/** Base used to resolve relative record URLs — current page in the browser. */
function currentBase(): string {
  return typeof window !== "undefined" ? window.location.href : "http://localhost";
}

/**
 * Parse a record URL against the current origin, allowing only http(s).
 * `record.url` is client-supplied data — without the scheme allowlist, a
 * crafted feedback (`javascript:…`, `data:…`) would become a stored-XSS
 * payload the moment the freelancer clicks "Open on page".
 */
function safeRecordUrl(url: string): URL | null {
  try {
    const u = new URL(url, currentBase());
    return u.protocol === "http:" || u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

/**
 * Absolute URL for a feedback's page — relative `record.url` values resolve
 * against the dashboard's own origin (dashboard and site share a deployment
 * in the common self-hosted setup). Null for non-http(s) or unparseable
 * values — callers render plain text instead of a link.
 */
export function resolveRecordUrl(url: string): string | null {
  return safeRecordUrl(url)?.toString() ?? null;
}

/**
 * Deep link that opens the feedback's page with the widget focused on the
 * annotation — `?<param>=<id>` consumed by the widget's `deepLink` option.
 * Null when the record URL is not a safe http(s) target.
 */
export function buildDeepLink(record: Pick<FeedbackRecord, "id" | "url">, param: string): string | null {
  const u = safeRecordUrl(record.url);
  if (!u) return null;
  u.searchParams.set(param, record.id);
  return u.toString();
}

/** First 8 chars of a feedback id — the mono `#short-id` in the drawer head. */
export function shortId(id: string): string {
  return id.slice(0, 8);
}

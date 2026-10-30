import { buildDeepLink as buildDeepLinkFrom, type FeedbackRecord, parseHttpUrl } from "@siteping/core";
import { type TFunction, tWithParams } from "./i18n/index.js";
import type { InboxSiteUrl } from "./types.js";

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * Shown for an Invalid Date — reachable from a custom source or corrupt
 * localStorage, where Intl/toISOString would throw and the math yields NaN.
 */
const INVALID_DATE = "—";

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

/** ISO string for a `<time dateTime>` attribute — undefined (attribute omitted) for an invalid date. */
export function toDateTimeAttr(date: Date): string | undefined {
  return isValidDate(date) ? date.toISOString() : undefined;
}

/**
 * Compact relative timestamp for list rows — "now", "5 min", "3 h", "2 d"…
 * All thresholds floor (Linear-style: "1 h" until a full second hour has
 * elapsed). Future dates clamp to "now".
 */
export function formatRelativeTime(date: Date, t: TFunction): string {
  if (!isValidDate(date)) return INVALID_DATE;
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

/** Full localized date + time, for row tooltips and the drawer meta grid. `locale` must be Intl-valid. */
export function formatAbsolute(date: Date, locale: string): string {
  if (!isValidDate(date)) return INVALID_DATE;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
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
 * Absolute URL for a feedback's page — a relative `record.url` resolves
 * against `base`, the dashboard's own page by default. Null for non-http(s)
 * or unparseable values — callers render plain text instead of a link, so a
 * crafted `javascript:` URL never becomes a stored-XSS payload behind "Open
 * on page".
 */
export function resolveRecordUrl(url: string, base: string = currentBase()): string | null {
  return parseHttpUrl(url, base)?.toString() ?? null;
}

/**
 * Deep link that opens the feedback's page with the widget focused on the
 * annotation, resolved against `base` (the dashboard's own page by default).
 * Null when the record URL is not a safe http(s) target.
 */
export function buildDeepLink(
  record: Pick<FeedbackRecord, "id" | "url">,
  param: string,
  base: string = currentBase(),
): string | null {
  return buildDeepLinkFrom(record, param, base);
}

/** `siteUrl` values already reported invalid — one warning per value, not per row. */
const reportedSiteUrls = new Set<string>();

/**
 * Base for a project's relative record URLs: its `siteUrl` entry (or the
 * single `siteUrl`), else the dashboard's own page. A `siteUrl` that is not
 * an absolute http(s) URL is ignored, with a warning, like an invalid
 * `accentColor` — it never becomes the origin of a link.
 */
function siteBase(projectName: string, siteUrl: InboxSiteUrl | undefined): string {
  const entry =
    typeof siteUrl === "string"
      ? siteUrl
      : siteUrl && Object.hasOwn(siteUrl, projectName)
        ? siteUrl[projectName]
        : undefined;
  if (entry === undefined || parseHttpUrl(entry)) return entry ?? currentBase();
  if (!reportedSiteUrls.has(entry)) {
    reportedSiteUrls.add(entry);
    console.warn(
      `[siteping] Invalid siteUrl "${entry}" — only absolute http(s) URLs are supported. Using the inbox's own location.`,
    );
  }
  return currentBase();
}

/** Options of `recordPageUrl`. */
export interface RecordPageUrlOptions {
  /** Base for relative record URLs — the value given to the inbox's `siteUrl`. */
  siteUrl?: InboxSiteUrl | undefined;
  /**
   * The widget's `deepLink` query parameter (`"siteping"` by default there).
   * With it, the URL opens the page with the widget focused on the feedback.
   */
  deepLinkParam?: string | undefined;
}

/**
 * Absolute URL of a feedback's page, as the inbox links it: a relative
 * `record.url` (the widget stores page pathnames) resolves against `siteUrl`
 * — its entry for the record's project when it is a map — or, without one,
 * against the current page; an absolute one is kept. With `deepLinkParam`,
 * the link that opens the page with the widget focused on the feedback.
 * Null for a non-http(s) or unparseable URL: render plain text instead of a
 * link.
 */
export function recordPageUrl(
  record: Pick<FeedbackRecord, "id" | "url" | "projectName">,
  options: RecordPageUrlOptions = {},
): string | null {
  const base = siteBase(record.projectName, options.siteUrl);
  return options.deepLinkParam === undefined
    ? resolveRecordUrl(record.url, base)
    : buildDeepLink(record, options.deepLinkParam, base);
}

/** First 8 chars of a feedback id — the mono `#short-id` in the drawer head. */
export function shortId(id: string): string {
  return id.slice(0, 8);
}

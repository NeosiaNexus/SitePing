import { type FeedbackRecord, parseHttpUrl } from "@siteping/core";
import {
  ANNOTATION_FIELD_MAX_LENGTH,
  ANNOTATIONS_LISTED,
  DELETED_FEEDBACK_COMMENT_MARKER,
  DIAGNOSTIC_ENTRIES_PER_KIND,
  DIAGNOSTIC_ENTRY_MAX_LENGTH,
  EMPTY_DIAGNOSTICS_PLACEHOLDER,
  ISSUE_BODY_MAX_LENGTH,
  ISSUE_REFERENCE_MARKER,
  ISSUE_SECTION_HEADINGS,
  ISSUE_SECTION_SEPARATOR,
  ISSUE_TITLE_MAX_LENGTH,
  ISSUE_TITLE_PREFIX,
  MORE_ANNOTATIONS_TEMPLATE,
  OVERSIZED_BODY_NOTE,
  TRUNCATION_SUFFIX,
} from "../constants/issue-format.js";
import { codeBlock, codeSpan, defuseReferences } from "./markdown.js";

/** Title and Markdown body of an issue. */
export interface IssueContent {
  title: string;
  body: string;
}

export interface IssueFormatOptions {
  /** Applied to every free-text value copied from the feedback (message, author, URLs, user agent, diagnostics). */
  redact: (text: string) => string;
  /** Query parameter of the widget's deep link, or `false` to omit the link. */
  deepLinkParam: string | false;
  /** Include the reviewer's email next to their name. Off by default: issues are often public. */
  includeAuthorEmail: boolean;
  /**
   * Base that relative page URLs resolve against, e.g. `https://acme.com`,
   * and the only origin the deep link may point to.
   */
  siteUrl?: string | undefined;
}

/** Identity of the feedback an issue belongs to, stored in the issue body. */
export interface IssueLink {
  feedbackId: string;
  projectName: string;
  /** The deployment that opened the issue, when it is named (`createIssueTrackerHooks`'s `instance`). */
  instance?: string | undefined;
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength
    ? `${value.slice(0, maxLength - TRUNCATION_SUFFIX.length)}${TRUNCATION_SUFFIX}`
    : value;
}

function section(heading: string, content: string): string {
  return `## ${heading}${ISSUE_SECTION_SEPARATOR}${content}`;
}

function joinSections(sections: Array<string | null>): string {
  return sections.filter((part): part is string => part !== null).join(ISSUE_SECTION_SEPARATOR);
}

/** A copy of `url` without the credentials a URL may carry. */
function withoutCredentials(url: URL): URL {
  const copy = new URL(url);
  copy.username = "";
  copy.password = "";
  return copy;
}

/**
 * The deep link, only to a page of the site under review: the page URL is
 * the visitor's, and this is the one live link in the body. Credentials in
 * the URL are dropped.
 */
function buildSiteDeepLink(page: URL | null, feedbackId: string, param: string, site: URL | null): string | null {
  if (!page || page.origin !== site?.origin) return null;
  const link = withoutCredentials(page);
  link.searchParams.set(param, feedbackId);
  return link.href;
}

/** Where each annotation points on the page — what a developer needs to find the element. */
function buildAnnotations(feedback: FeedbackRecord, redact: (text: string) => string): string | null {
  if (feedback.annotations.length === 0) return null;
  const field = (value: string) => codeSpan(truncate(redact(value), ANNOTATION_FIELD_MAX_LENGTH));
  const lines = feedback.annotations.slice(0, ANNOTATIONS_LISTED).map((annotation) => {
    const text = annotation.textSnippet ? `, text ${field(annotation.textSnippet)}` : "";
    return `- Element ${field(annotation.elementTag)}, selector ${field(annotation.cssSelector)}${text}`;
  });
  const hidden = feedback.annotations.length - ANNOTATIONS_LISTED;
  if (hidden > 0) lines.push(MORE_ANNOTATIONS_TEMPLATE.replace("{count}", String(hidden)));
  return section(ISSUE_SECTION_HEADINGS.annotations, lines.join("\n"));
}

/** One block per kind: console messages and network URLs are visitor-controlled, and may span lines. */
function buildDiagnostics(feedback: FeedbackRecord, redact: (text: string) => string): string[] {
  if (!feedback.diagnostics) return [];
  const field = (value: string) => truncate(redact(value), DIAGNOSTIC_ENTRY_MAX_LENGTH);
  const consoleLines = feedback.diagnostics.console
    .slice(0, DIAGNOSTIC_ENTRIES_PER_KIND)
    .map((entry) => `${entry.level}: ${field(entry.message)}`);
  const networkLines = feedback.diagnostics.network
    .slice(0, DIAGNOSTIC_ENTRIES_PER_KIND)
    .map((entry) => `${entry.method} ${entry.status} ${field(entry.url)} (${entry.durationMs}ms)`);
  const block = (lines: string[]) => (lines.length > 0 ? codeBlock(lines.join("\n")) : EMPTY_DIAGNOSTICS_PLACEHOLDER);
  return [
    section(ISSUE_SECTION_HEADINGS.consoleDiagnostics, block(consoleLines)),
    section(ISSUE_SECTION_HEADINGS.networkDiagnostics, block(networkLines)),
  ];
}

/**
 * Default Markdown rendering — GitHub and GitLab render it. Every value
 * copied from the feedback is quoted as code (see `markdown.ts`); the deep
 * link is an autolink, which the URL parser has already percent-encoded.
 */
export function formatIssue(feedback: FeedbackRecord, options: IssueFormatOptions): IssueContent {
  const { redact } = options;
  const message = redact(feedback.message);
  const titleBudget = ISSUE_TITLE_MAX_LENGTH - ISSUE_TITLE_PREFIX.length - 1;
  const title = `${ISSUE_TITLE_PREFIX} ${truncate(defuseReferences(message.replace(/\s+/g, " ").trim()), titleBudget)}`;

  // The widget records `location.pathname` by default: resolve it against the
  // site, whose credentials a relative URL would otherwise copy into the issue.
  const pageUrl = redact(feedback.url);
  const site = options.siteUrl === undefined ? null : parseHttpUrl(options.siteUrl);
  const page = parseHttpUrl(pageUrl, site ? withoutCredentials(site).href : undefined);
  const author = options.includeAuthorEmail ? `${feedback.authorName} <${feedback.authorEmail}>` : feedback.authorName;
  const deepLink =
    options.deepLinkParam === false ? null : buildSiteDeepLink(page, feedback.id, options.deepLinkParam, site);
  // Inline `data:` screenshots (no ScreenshotStorage) are skipped: trackers do not render them.
  const screenshot = feedback.screenshotUrl ? parseHttpUrl(feedback.screenshotUrl) : null;

  const summary = [
    section(ISSUE_SECTION_HEADINGS.message, codeBlock(message)),
    section(ISSUE_SECTION_HEADINGS.type, feedback.type),
    section(ISSUE_SECTION_HEADINGS.pageUrl, codeSpan(page?.href ?? pageUrl)),
    deepLink ? section(ISSUE_SECTION_HEADINGS.deepLink, `<${deepLink}>`) : null,
  ];
  const context = [
    section(ISSUE_SECTION_HEADINGS.author, codeSpan(redact(author))),
    section(ISSUE_SECTION_HEADINGS.viewport, codeSpan(feedback.viewport)),
    section(ISSUE_SECTION_HEADINGS.userAgent, codeSpan(redact(feedback.userAgent))),
    screenshot?.protocol === "https:"
      ? section(ISSUE_SECTION_HEADINGS.screenshot, `![${ISSUE_SECTION_HEADINGS.screenshot}](<${screenshot.href}>)`)
      : null,
  ];
  const body = joinSections([
    ...summary,
    buildAnnotations(feedback, redact),
    ...context,
    ...buildDiagnostics(feedback, redact),
  ]);
  // A quote grows with the backtick runs it holds, so a crafted feedback can
  // outgrow the tracker's limit: keep what identifies it, leave the lists out.
  return {
    title,
    body: body.length <= ISSUE_BODY_MAX_LENGTH ? body : joinSections([...summary, ...context, OVERSIZED_BODY_NOTE]),
  };
}

/** Hidden marker on the first line of every issue body, linking it to its feedback. */
export function buildIssueMarker({ feedbackId, projectName, instance }: IssueLink): string {
  const payload = { id: feedbackId, project: projectName, ...(instance === undefined ? {} : { instance }) };
  return `${ISSUE_REFERENCE_MARKER.prefix}${toMarkerJson(payload)}${ISSUE_REFERENCE_MARKER.suffix}`;
}

/** JSON safe inside an HTML comment: `<` and `>` are escaped so a value cannot close the comment early. */
function toMarkerJson(value: unknown): string {
  return JSON.stringify(value).replace(
    /[<>]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

/** Substring of the marker of one feedback's issue — providers pre-filter listings with it. */
export function feedbackMarkerFragment(feedbackId: string): string {
  return `"id":${toMarkerJson(feedbackId)}`;
}

/** Substring identifying every issue of a project. */
export function projectMarkerFragment(projectName: string): string {
  return `"project":${toMarkerJson(projectName)}`;
}

const firstLine = (text: string): string => text.split(/\r?\n/, 1)[0] ?? "";

/**
 * The link stored on the first line of an issue body, or `null` when that
 * line is no (valid) marker. A marker anywhere else is visitor text.
 */
export function parseIssueMarker(body: string): IssueLink | null {
  const match = ISSUE_REFERENCE_MARKER.pattern.exec(firstLine(body));
  if (!match?.[1]) return null;
  try {
    const parsed: unknown = JSON.parse(match[1]);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { id, project, instance } = parsed as { id?: unknown; project?: unknown; instance?: unknown };
    if (typeof id !== "string" || typeof project !== "string") return null;
    if (instance === undefined) return { feedbackId: id, projectName: project };
    return typeof instance === "string" ? { feedbackId: id, projectName: project, instance } : null;
  } catch {
    return null; // A tampered or truncated marker is treated as absent.
  }
}

/** The comment left on a deleted feedback's issue: `text` below the hidden deletion marker. */
export function buildDeletionComment(text: string): string {
  return `${DELETED_FEEDBACK_COMMENT_MARKER}\n\n${text}`;
}

/** Whether a comment is the deletion comment, told by its first line only. */
export function isDeletionComment(body: string): boolean {
  return firstLine(body) === DELETED_FEEDBACK_COMMENT_MARKER;
}

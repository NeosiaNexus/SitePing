/** Label every SitePing issue carries on trackers with labels — narrows reference lookups. */
export const SITEPING_ISSUE_LABEL = "siteping";

/** Title prefix of the default issue format. */
export const ISSUE_TITLE_PREFIX = "[SitePing]";

/** Longest title every built-in tracker accepts (GitLab: 255, GitHub: 256). */
export const ISSUE_TITLE_MAX_LENGTH = 255;

/** Appended to a truncated title, annotation field or diagnostic entry. */
export const TRUNCATION_SUFFIX = "...";

/** Longest console message or network URL copied into the issue body, in characters. */
export const DIAGNOSTIC_ENTRY_MAX_LENGTH = 500;

/** Diagnostic entries copied per kind (console / network). */
export const DIAGNOSTIC_ENTRIES_PER_KIND = 5;

/**
 * Annotations listed in the issue body. A feedback may carry 50, each with a
 * 2000-character selector: listed whole, they would outgrow GitHub's
 * 65,536-character body limit and the issue would be refused.
 */
export const ANNOTATIONS_LISTED = 10;

/** Longest annotation element tag, selector or text snippet copied into the issue body, in characters. */
export const ANNOTATION_FIELD_MAX_LENGTH = 300;

/**
 * Body length past which the default format leaves the annotations and
 * diagnostics out. GitHub refuses bodies over 65,536 characters; the rest is
 * room for the linking marker (about 1,300 characters with a 200-character
 * project name, escaped).
 */
export const ISSUE_BODY_MAX_LENGTH = 60_000;

/** Query parameter the widget reads to focus a feedback (`SitepingConfig.deepLink`). */
export const DEFAULT_DEEP_LINK_PARAM = "siteping";

/**
 * Hidden marker linking an issue to its feedback, always the first line of
 * the body. The JSON payload carries the feedback id and project so
 * references resolve from the issue alone. Only that line is parsed: the
 * rest of the body quotes visitor text, which may imitate the marker.
 */
export const ISSUE_REFERENCE_MARKER = {
  prefix: "<!-- siteping-feedback ",
  suffix: " -->",
  pattern: /^<!-- siteping-feedback (\{.*\}) -->$/,
} as const;

/** Section headings of the default issue body. */
export const ISSUE_SECTION_HEADINGS = {
  message: "Message",
  type: "Type",
  pageUrl: "Page",
  deepLink: "Open in the page",
  annotations: "Annotations",
  author: "Author",
  viewport: "Viewport",
  userAgent: "User agent",
  screenshot: "Screenshot",
  consoleDiagnostics: "Console diagnostics",
  networkDiagnostics: "Network diagnostics",
} as const satisfies Record<string, string>;

/** Last line of a truncated annotation list; `{count}` is replaced. */
export const MORE_ANNOTATIONS_TEMPLATE = "- and {count} more";

/** Ends a body whose lists were left out to stay within `ISSUE_BODY_MAX_LENGTH`. */
export const OVERSIZED_BODY_NOTE = "_Annotations and diagnostics left out: this feedback is too large for an issue._";

/** Placeholder listed under a diagnostics heading with no entries. */
export const EMPTY_DIAGNOSTICS_PLACEHOLDER = "- none";

/** Blank line between Markdown sections. */
export const ISSUE_SECTION_SEPARATOR = "\n\n";

/**
 * First line of the comment left on a deleted feedback's issue, hidden like
 * the issue marker. A retried delete looks for it rather than for the text
 * below it, which `deletedCommentText` may vary and GitLab trims.
 */
export const DELETED_FEEDBACK_COMMENT_MARKER = "<!-- siteping-feedback-deleted -->";

/** Comment left on an issue whose feedback was deleted; `{feedbackId}` is replaced. */
export const DELETED_FEEDBACK_COMMENT_TEMPLATE = "SitePing feedback `{feedbackId}` was deleted.";

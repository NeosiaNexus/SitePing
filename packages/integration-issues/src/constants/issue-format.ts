/** Label every SitePing issue carries on trackers with labels — narrows reference lookups. */
export const SITEPING_ISSUE_LABEL = "siteping";

/** Title prefix of the default issue format. */
export const ISSUE_TITLE_PREFIX = "[SitePing]";

/** Longest title every built-in tracker accepts (GitLab: 255, GitHub: 256). */
export const ISSUE_TITLE_MAX_LENGTH = 255;

/** Appended to a truncated title or diagnostic line. */
export const TRUNCATION_SUFFIX = "...";

/** Longest diagnostic message copied into the issue body, in characters. */
export const DIAGNOSTIC_MESSAGE_MAX_LENGTH = 500;

/** Diagnostic entries copied per kind (console / network). */
export const DIAGNOSTIC_ENTRIES_PER_KIND = 5;

/** Query parameter the widget reads to focus a feedback (`SitepingConfig.deepLink`). */
export const DEFAULT_DEEP_LINK_PARAM = "siteping";

/** Only public HTTPS screenshots render as images on GitHub (inline data URLs do not). */
export const EMBEDDABLE_SCREENSHOT_URL_PREFIX = "https://";

/**
 * Hidden marker linking an issue to its feedback. The JSON payload carries
 * the feedback id and project so references resolve from the issue alone.
 */
export const ISSUE_REFERENCE_MARKER = {
  prefix: "<!-- siteping-feedback ",
  suffix: " -->",
  pattern: /<!-- siteping-feedback (\{.*?\}) -->/,
} as const;

/** Section headings of the default issue body. */
export const ISSUE_SECTION_HEADINGS = {
  message: "Message",
  type: "Type",
  status: "Status",
  pageUrl: "Page",
  deepLink: "Open in the page",
  author: "Author",
  viewport: "Viewport",
  userAgent: "User agent",
  screenshot: "Screenshot",
  consoleDiagnostics: "Console diagnostics",
  networkDiagnostics: "Network diagnostics",
} as const satisfies Record<string, string>;

/** Placeholder listed under a diagnostics heading with no entries. */
export const EMPTY_DIAGNOSTICS_PLACEHOLDER = "- none";

/** Blank line between Markdown sections. */
export const ISSUE_SECTION_SEPARATOR = "\n\n";

/** Comment left on an issue whose feedback was deleted; `{feedbackId}` is replaced. */
export const DELETED_FEEDBACK_COMMENT_TEMPLATE = "SitePing feedback `{feedbackId}` was deleted.";

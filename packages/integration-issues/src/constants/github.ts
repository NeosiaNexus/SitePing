/** Public GitHub REST API; override `apiBaseUrl` for GitHub Enterprise Server. */
export const GITHUB_API_BASE_URL = "https://api.github.com";

/** REST API version pinned in every request (`X-GitHub-Api-Version`). */
export const GITHUB_API_VERSION = "2022-11-28";

/** Media type GitHub recommends for REST requests. */
export const GITHUB_ACCEPT_HEADER = "application/vnd.github+json";

/** Page size when listing issues or comments (GitHub's maximum). */
export const GITHUB_PAGE_SIZE = 100;

/** `state_reason` values GitHub accepts when closing or reopening an issue. */
export const GITHUB_STATE_REASON = {
  completed: "completed",
  notPlanned: "not_planned",
  reopened: "reopened",
} as const satisfies Record<string, string>;

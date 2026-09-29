/** GitLab.com REST API root; override `apiBaseUrl` for self-managed instances. */
export const GITLAB_API_BASE_URL = "https://gitlab.com/api/v4";

/** Page size when listing issues or notes (GitLab's maximum). */
export const GITLAB_PAGE_SIZE = 100;

/** Separator GitLab expects between label names. */
export const GITLAB_LABEL_SEPARATOR = ",";

/** `state_event` values of the issue edit endpoint. */
export const GITLAB_STATE_EVENT = {
  close: "close",
  reopen: "reopen",
} as const satisfies Record<string, string>;

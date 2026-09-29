/**
 * Stable `code` of each error class this package exports. Every entry point
 * (`index`, `github`, `gitlab`) is a separate CommonJS bundle with its own
 * copy of the classes, so consumers match on these codes — through
 * `isIssueTrackerRequestError` / `isUnlabelledIssueError` — never on `instanceof`.
 */
export const ISSUE_TRACKER_REQUEST_FAILED_CODE = "ISSUE_TRACKER_REQUEST_FAILED";

/** Stable `code` of `UnlabelledIssueError` — see {@link ISSUE_TRACKER_REQUEST_FAILED_CODE}. */
export const UNLABELLED_ISSUE_CODE = "UNLABELLED_ISSUE";

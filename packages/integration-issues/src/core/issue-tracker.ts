import type { FeedbackStatus } from "@siteping/core";

/** An issue on the tracker. `key` is the provider's own identifier (GitHub number, GitLab iid). */
export interface IssueReference {
  key: string;
  url: string;
}

/** What to create. Trackers without labels ignore `labels`. */
export interface IssueDraft {
  title: string;
  body: string;
  labels: readonly string[];
}

/** An issue found while resolving references — its body carries the SitePing marker. */
export interface TrackedIssue {
  reference: IssueReference;
  body: string;
  isOpen: boolean;
}

/**
 * The port a tracker provider implements. The provider owns its API, auth,
 * pagination and how feedback statuses map to its own issue states; the
 * hooks own everything provider-agnostic (format, linking, idempotency).
 *
 * Implement it to plug trackers beyond the built-in GitHub and GitLab
 * entries (Jira, Linear, an internal tool…).
 */
export interface IssueTracker {
  /** Human-readable provider name, used in error messages. */
  readonly name: string;
  createIssue(draft: IssueDraft): Promise<IssueReference>;
  /**
   * Reflect a feedback status on the issue — e.g. `resolved` closes it as
   * completed, `wont_fix` as not planned, `open` / `in_progress` reopen it.
   */
  updateIssueStatus(reference: IssueReference, status: FeedbackStatus): Promise<void>;
  addComment(reference: IssueReference, body: string): Promise<void>;
  /** Bodies of the issue's existing comments (used to keep comments idempotent). */
  listComments(reference: IssueReference): Promise<string[]>;
  /**
   * SitePing issues whose body contains `marker`, open or closed. Providers
   * may narrow server-side (labels, search) and must return every match.
   */
  findSitepingIssues(marker: string): Promise<TrackedIssue[]>;
}

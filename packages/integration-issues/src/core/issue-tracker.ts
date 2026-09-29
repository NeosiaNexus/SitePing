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

/** What `findSitepingIssues` or `searchSitepingIssues` listed. */
export interface IssueListing {
  issues: TrackedIssue[];
  /**
   * `true` when the provider stopped with matches left unlisted (at its
   * page cap, or past the search's first page): an issue missing from
   * `issues` may still exist.
   */
  truncated: boolean;
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
  /**
   * Bodies of the issue's existing comments, each first line as
   * `addComment` received it: the hooks find their deletion comment by it.
   */
  listComments(reference: IssueReference): Promise<string[]>;
  /**
   * SitePing issues whose body contains `marker`, open or closed, newest
   * first. Providers may narrow server-side (labels), must return every
   * match they list, and say whether they left issues unlisted. With
   * `maxPages`, list no more pages than that: the hooks look at the newest
   * issues first.
   */
  findSitepingIssues(marker: string, options?: { maxPages?: number }): Promise<IssueListing>;
  /**
   * Optional fast path to one feedback's issue: what a server-side search
   * for `feedbackId` returns, and whether it found more than that. Search
   * indexes may lag behind a new issue or be rate limited, so the hooks
   * still list the newest issues after a miss, and further after a failure
   * or a truncated answer. Without a search, every lookup the newest issues
   * do not settle lists up to the provider's cap, and is refused past it.
   */
  searchSitepingIssues?(feedbackId: string): Promise<IssueListing>;
}

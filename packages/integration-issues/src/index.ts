/**
 * Issue tracker integration for SitePing. Build hooks with
 * `createIssueTrackerHooks` and pick a provider entry:
 *
 * - `@siteping/integration-issues/github` — GitHub Issues (github.com / Enterprise Server)
 * - `@siteping/integration-issues/gitlab` — GitLab Issues (gitlab.com / self-managed)
 *
 * Or implement `IssueTracker` for any other tracker.
 */
export { createIssueTrackerHooks, type IssueTrackerHooksOptions } from "./core/hooks.js";
export { IssueTrackerRequestError, UnlabelledIssueError } from "./core/http-client.js";
export type { IssueContent, IssueFormatOptions } from "./core/issue-format.js";
export { formatIssue } from "./core/issue-format.js";
export type { IssueDraft, IssueReference, IssueTracker, TrackedIssue } from "./core/issue-tracker.js";

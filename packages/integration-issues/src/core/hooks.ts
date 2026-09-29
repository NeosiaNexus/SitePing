import { type FeedbackRecord, isClosedStatus, parseHttpUrl } from "@siteping/core";
import type { SitepingLifecycleHooks } from "@siteping/server";
import {
  DEFAULT_DEEP_LINK_PARAM,
  DELETED_FEEDBACK_COMMENT_TEMPLATE,
  SITEPING_ISSUE_LABEL,
} from "../constants/issue-format.js";
import { isIssueTrackerRequestError } from "./http-client.js";
import {
  buildDeletionComment,
  buildIssueMarker,
  feedbackMarkerFragment,
  formatIssue,
  type IssueContent,
  type IssueFormatOptions,
  isDeletionComment,
  parseIssueMarker,
  projectMarkerFragment,
} from "./issue-format.js";
import type { IssueTracker, TrackedIssue } from "./issue-tracker.js";
import { createTaskQueue } from "./task-queue.js";

export interface IssueTrackerHooksOptions {
  /** Where issues live — `createGitHubTracker`, `createGitLabTracker` or your own. */
  tracker: IssueTracker;
  /** Extra labels on trackers that support them (the `siteping` label is always added). */
  labels?: readonly string[];
  /** Redact secrets from free text before it leaves your server. Defaults to no redaction. */
  redact?: (text: string) => string;
  /**
   * Origin of the site the widget runs on, e.g. `https://acme.com`. The
   * widget records `location.pathname` as the page URL by default: without
   * this, such issues show a bare path and carry no deep link.
   */
  siteUrl?: string | undefined;
  /** Query parameter of the widget's deep link (`SitepingConfig.deepLink`), or `false` to omit it. */
  deepLinkParam?: string | false;
  /** Include reviewer emails in issues. Defaults to `false` — issues are often public. */
  includeAuthorEmail?: boolean;
  /** Replace the default Markdown. The linking marker is prepended to whatever you return, as its first line. */
  formatIssue?: (feedback: FeedbackRecord, defaults: IssueFormatOptions) => IssueContent;
  /** Close / reopen the issue when the feedback status changes. Defaults to `true`. */
  syncStatus?: boolean;
  /**
   * Comment left on issues whose feedback is deleted. A hidden marker goes
   * above it, and a retried delete looks for that: the text may vary.
   */
  deletedCommentText?: (feedbackId: string) => string;
}

const noRedaction = (text: string): string => text;
const defaultDeletedComment = (feedbackId: string): string =>
  DELETED_FEEDBACK_COMMENT_TEMPLATE.replace("{feedbackId}", feedbackId);

/**
 * Keep one tracker issue per feedback through `@siteping/server` hooks:
 * create it on `onCreated`, sync its state on `onUpdated`, and close it with
 * a comment on `onDeleting` — a failure there aborts the delete, so the
 * feedback survives until its issue could be cleaned up.
 *
 * Issues are linked to feedbacks by a hidden marker on the first line of
 * their body, so no extra column is needed in your database.
 *
 * The hooks never read the principal, so they fit either access policy
 * without widening the one the handler infers.
 *
 * @example
 * ```ts
 * import { createIssueTrackerHooks } from "@siteping/integration-issues";
 * import { createGitHubTracker } from "@siteping/integration-issues/github";
 *
 * createSitepingHandler({
 *   store,
 *   access,
 *   hooks: createIssueTrackerHooks({
 *     tracker: createGitHubTracker({ repository: "acme/site", token: process.env.GITHUB_TOKEN! }),
 *   }),
 * });
 * ```
 */
export function createIssueTrackerHooks<Principal = never>({
  tracker,
  labels = [],
  redact = noRedaction,
  siteUrl,
  deepLinkParam = DEFAULT_DEEP_LINK_PARAM,
  includeAuthorEmail = false,
  formatIssue: customFormatIssue,
  syncStatus = true,
  deletedCommentText = defaultDeletedComment,
}: IssueTrackerHooksOptions): SitepingLifecycleHooks<Principal> {
  if (siteUrl !== undefined && !parseHttpUrl(siteUrl)) {
    throw new Error(`[siteping] createIssueTrackerHooks: siteUrl must be an absolute http(s) URL, got "${siteUrl}"`);
  }
  const formatOptions: IssueFormatOptions = {
    redact,
    deepLinkParam,
    includeAuthorEmail,
    siteUrl,
  };
  const issueLabels = [SITEPING_ISSUE_LABEL, ...labels.filter((label) => label !== SITEPING_ISSUE_LABEL)];

  const issueOf = async (feedbackId: string): Promise<TrackedIssue | null> => {
    const isLinked = (issue: TrackedIssue) => parseIssueMarker(issue.body)?.feedbackId === feedbackId;
    const searched = await tracker.searchSitepingIssues?.(feedbackId).catch((error: unknown) => {
      // No answer at all: the tracker is down, and the listing would only wait out another timeout.
      if (isIssueTrackerRequestError(error) && error.status === null) throw error;
      return [];
    });
    const found = searched?.find(isLinked);
    if (found) return found;
    const candidates = await tracker.findSitepingIssues(feedbackMarkerFragment(feedbackId));
    return candidates.find(isLinked) ?? null;
  };

  const issuesOfProject = async (projectName: string): Promise<TrackedIssue[]> => {
    const candidates = await tracker.findSitepingIssues(projectMarkerFragment(projectName));
    return candidates.filter((issue) => parseIssueMarker(issue.body)?.projectName === projectName);
  };

  /** Close as not planned and leave the deletion comment once, even across retries. */
  const closeDeleted = async (issue: TrackedIssue, feedbackId: string): Promise<void> => {
    if (issue.isOpen) await tracker.updateIssueStatus(issue.reference, "wont_fix");
    const comments = await tracker.listComments(issue.reference);
    if (!comments.some(isDeletionComment)) {
      await tracker.addComment(issue.reference, buildDeletionComment(deletedCommentText(feedbackId)));
    }
  };

  const queue = createTaskQueue();

  return {
    onCreated: (feedback) =>
      queue.forFeedback(feedback.projectName, feedback.id, async () => {
        const content = customFormatIssue
          ? customFormatIssue(feedback, formatOptions)
          : formatIssue(feedback, formatOptions);
        const marker = buildIssueMarker({ feedbackId: feedback.id, projectName: feedback.projectName });
        await tracker.createIssue({ title: content.title, body: `${marker}\n\n${content.body}`, labels: issueLabels });
      }),
    async onUpdated(feedback) {
      if (!syncStatus) return;
      await queue.forFeedback(feedback.projectName, feedback.id, async () => {
        const issue = await issueOf(feedback.id);
        // An open status on an open issue changes nothing; a closed one may still change the close reason.
        if (issue && (isClosedStatus(feedback.status) || !issue.isOpen)) {
          await tracker.updateIssueStatus(issue.reference, feedback.status);
        }
      });
    },
    onDeleting: (target) =>
      target.kind === "single"
        ? queue.forFeedback(target.projectName, target.id, async () => {
            const issue = await issueOf(target.id);
            if (issue) await closeDeleted(issue, target.id);
          })
        : queue.forProject(target.projectName, async () => {
            for (const issue of await issuesOfProject(target.projectName)) {
              const link = parseIssueMarker(issue.body);
              if (link) await closeDeleted(issue, link.feedbackId);
            }
          }),
  };
}

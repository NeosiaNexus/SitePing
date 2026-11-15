import { type FeedbackRecord, isClosedStatus, parseHttpUrl } from "@siteping/core";
import {
  DEFAULT_DEEP_LINK_PARAM,
  DELETED_FEEDBACK_COMMENT_TEMPLATE,
  SITEPING_ISSUE_LABEL,
} from "../constants/issue-format.js";
import { isTrackerTimeout } from "./http-client.js";
import {
  buildDeletionComment,
  buildIssueMarker,
  feedbackMarkerFragment,
  formatIssue,
  type IssueContent,
  type IssueFormatOptions,
  type IssueLink,
  isDeletionComment,
  parseIssueMarker,
  projectMarkerFragment,
} from "./issue-format.js";
import type { IssueReference, IssueTracker, TrackedIssue } from "./issue-tracker.js";
import { createTaskQueue } from "./task-queue.js";

export interface IssueTrackerHooksOptions {
  /** Where issues live — `createGitHubTracker`, `createGitLabTracker` or your own. */
  tracker: IssueTracker;
  /** Extra labels on trackers that support them (the `siteping` label is always added). */
  labels?: readonly string[] | undefined;
  /**
   * Redact secrets from free text before it leaves your server. The
   * built-in format applies it; a custom `formatIssue` gets it in its
   * `options`, and the feedback unredacted. Defaults to no redaction.
   */
  redact?: ((text: string) => string) | undefined;
  /**
   * Origin of the site the widget runs on, e.g. `https://acme.com`. Page
   * URLs resolve against it (the widget records `location.pathname` by
   * default), and the deep link only ever points to it: without it, issues
   * carry no deep link.
   */
  siteUrl?: string | undefined;
  /** Query parameter of the widget's deep link (`SitepingConfig.deepLink`), or `false` to omit it. */
  deepLinkParam?: string | false | undefined;
  /** Include reviewer emails in issues. Defaults to `false` — issues are often public. */
  includeAuthorEmail?: boolean | undefined;
  /**
   * Replace the default Markdown. `options` are what the exported
   * `formatIssue` takes: call it to extend the default issue. The linking
   * marker is prepended to whatever you return, as its first line.
   */
  formatIssue?: ((feedback: FeedbackRecord, options: IssueFormatOptions) => IssueContent) | undefined;
  /**
   * Name of this deployment when several share one repository (staging and
   * production, say). It goes into each issue's marker, and the hooks only
   * touch issues of the same name; an unnamed deployment only touches
   * unnamed ones. An empty string counts as no name.
   */
  instance?: string | undefined;
  /**
   * Called with each issue opened, e.g. to send its link to a chat or keep
   * it. A throw is logged like a failed creation. The visitor's request
   * waits for it, and so do the feedback's later status changes and deletes
   * and its project's next delete: it must not wait for one in turn.
   */
  onIssueCreated?: ((feedback: FeedbackRecord, issue: IssueReference) => void | Promise<void>) | undefined;
  /** Close / reopen the issue when the feedback status changes. Defaults to `true`. */
  syncStatus?: boolean | undefined;
  /**
   * Comment left on issues whose feedback is deleted. A hidden marker goes
   * above it, and a retried delete looks for that: the text may vary.
   */
  deletedCommentText?: ((feedbackId: string) => string) | undefined;
}

/**
 * What a delete removes: one feedback, or every feedback of a project —
 * `@siteping/server`'s `SitepingDeletionTarget`, restated so this package
 * depends on no server version: one 0.x release installs next to any
 * server. A type test keeps the two identical.
 */
type DeletionTarget = { kind: "single"; id: string; projectName: string } | { kind: "project"; projectName: string };

/**
 * The hooks `createIssueTrackerHooks` returns, typed structurally against
 * `@siteping/server`'s `SitepingLifecycleHooks`. They never read the request
 * context: they fit either access policy without widening the principal
 * the handler infers, and a hook of your own can call the one it replaces.
 */
export interface IssueTrackerHooks {
  onCreated(feedback: FeedbackRecord): Promise<void>;
  onUpdated(feedback: FeedbackRecord): Promise<void>;
  onDeleting(target: DeletionTarget): Promise<void>;
}

/** A feedback's issue, and whether it came from the search, whose index can lag behind the tracker. */
interface FoundIssue {
  issue: TrackedIssue;
  fromSearch: boolean;
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
export function createIssueTrackerHooks({
  tracker,
  labels = [],
  redact = noRedaction,
  siteUrl,
  deepLinkParam = DEFAULT_DEEP_LINK_PARAM,
  includeAuthorEmail = false,
  formatIssue: customFormatIssue,
  instance: instanceName,
  onIssueCreated,
  syncStatus = true,
  deletedCommentText = defaultDeletedComment,
}: IssueTrackerHooksOptions): IssueTrackerHooks {
  if (siteUrl !== undefined && !parseHttpUrl(siteUrl)) {
    // Not echoed: a staging URL may carry credentials, and this error is logged.
    throw new Error("[siteping] createIssueTrackerHooks: siteUrl must be an absolute http(s) URL");
  }
  const formatOptions: IssueFormatOptions = {
    redact,
    deepLinkParam,
    includeAuthorEmail,
    siteUrl,
  };
  const issueLabels = [SITEPING_ISSUE_LABEL, ...labels.filter((label) => label !== SITEPING_ISSUE_LABEL)];
  const instance = instanceName || undefined;
  /** The issue's link, when this deployment opened it. */
  const linkOf = (issue: TrackedIssue): IssueLink | null => {
    const link = parseIssueMarker(issue.body);
    return link?.instance === instance ? link : null;
  };

  const issueOf = async (feedbackId: string): Promise<FoundIssue | null> => {
    const isLinked = (issue: TrackedIssue) => linkOf(issue)?.feedbackId === feedbackId;
    const marker = feedbackMarkerFragment(feedbackId);
    // `null` when the search failed: its miss then says nothing.
    const searched = await tracker.searchSitepingIssues?.(feedbackId).catch((error: unknown) => {
      // Timed out: the tracker is down, and the listing would only wait out another timeout.
      if (isTrackerTimeout(error)) throw error;
      return null;
    });
    const found = searched?.issues.find(isLinked);
    if (found) return { issue: found, fromSearch: true };
    // The newest page holds the issues too new for the search index, and a recent feedback's issue.
    const newest = await tracker.findSitepingIssues(marker, { maxPages: 1 });
    const recent = newest.issues.find(isLinked);
    // A search that returned every match leaves no older issue to find.
    if (recent) return { issue: recent, fromSearch: false };
    if (!newest.truncated || searched?.truncated === false) return null;
    const listing = await tracker.findSitepingIssues(marker);
    const listed = listing.issues.find(isLinked);
    if (listed) return { issue: listed, fromSearch: false };
    if (!listing.truncated) return null;
    throw new Error(
      `[siteping] ${tracker.name}: the issue of feedback "${feedbackId}" is not among the SitePing issues listed, ` +
        "and more are left unlisted. Raise maxListedPages to reach it.",
    );
  };

  const issuesOfProject = async (projectName: string): Promise<TrackedIssue[]> => {
    const listing = await tracker.findSitepingIssues(projectMarkerFragment(projectName));
    // Refused rather than done in part: the issues past the cap would stay open once the records are gone.
    if (listing.truncated) {
      throw new Error(
        `[siteping] ${tracker.name}: project "${projectName}" may have SitePing issues past the ones listed, ` +
          "which deleting it would leave open. Raise maxListedPages to reach them.",
      );
    }
    return listing.issues.filter((issue) => linkOf(issue)?.projectName === projectName);
  };

  /**
   * Whether the issue is open. A search hit is read again when the tracker
   * can: seconds after a resolve, the index may still answer "open", and an
   * Undo then would skip the reopen (#415).
   */
  const isOpenNow = async ({ issue, fromSearch }: FoundIssue): Promise<boolean> =>
    fromSearch && tracker.getIssue ? (await tracker.getIssue(issue.reference)).isOpen : issue.isOpen;

  /** Close as not planned if still open, and leave the deletion comment once, even across retries. */
  const closeDeleted = async (found: FoundIssue, feedbackId: string): Promise<void> => {
    const { reference } = found.issue;
    if (await isOpenNow(found)) await tracker.updateIssueStatus(reference, "wont_fix");
    const comments = await tracker.listComments(reference);
    if (!comments.some(isDeletionComment)) {
      await tracker.addComment(reference, buildDeletionComment(deletedCommentText(feedbackId)));
    }
  };

  const queue = createTaskQueue();

  return {
    onCreated: (feedback) =>
      queue.forCreation(feedback.projectName, feedback.id, async () => {
        const content = customFormatIssue
          ? customFormatIssue(feedback, formatOptions)
          : formatIssue(feedback, formatOptions);
        const marker = buildIssueMarker({ feedbackId: feedback.id, projectName: feedback.projectName, instance });
        const issue = await tracker.createIssue({
          title: content.title,
          body: `${marker}\n\n${content.body}`,
          labels: issueLabels,
        });
        await onIssueCreated?.(feedback, issue);
      }),
    async onUpdated(feedback) {
      if (!syncStatus) return;
      await queue.forFeedback(feedback.projectName, feedback.id, async () => {
        const found = await issueOf(feedback.id);
        // An open status on an open issue changes nothing; a closed one may still change the close reason.
        if (found && (isClosedStatus(feedback.status) || !(await isOpenNow(found)))) {
          await tracker.updateIssueStatus(found.issue.reference, feedback.status);
        }
      });
    },
    onDeleting: (target) =>
      target.kind === "single"
        ? queue.forFeedback(target.projectName, target.id, async () => {
            const found = await issueOf(target.id);
            if (found) await closeDeleted(found, target.id);
          })
        : queue.forProject(target.projectName, async () => {
            for (const issue of await issuesOfProject(target.projectName)) {
              const link = linkOf(issue);
              // Listed by label, not searched: the state is current.
              if (link) await closeDeleted({ issue, fromSearch: false }, link.feedbackId);
            }
          }),
  };
}

import { isClosedStatus } from "@siteping/core";
import {
  GITLAB_API_BASE_URL,
  GITLAB_LABEL_SEPARATOR,
  GITLAB_PAGE_SIZE,
  GITLAB_PROJECT_PATTERN,
  GITLAB_STATE_EVENT,
} from "../constants/gitlab.js";
import { TRACKER_MAX_LISTED_PAGES } from "../constants/http.js";
import { SITEPING_ISSUE_LABEL } from "../constants/issue-format.js";
import { createJsonHttpClient, UnlabelledIssueError } from "../core/http-client.js";
import type { IssueTracker, TrackedIssue } from "../core/issue-tracker.js";
import { checkApiBaseUrl, checkPositiveInteger, checkToken } from "../core/tracker-options.js";

export interface GitLabTrackerOptions {
  /** Numeric project id or full path (`group/subgroup/project`). */
  project: string | number;
  /** Personal, project or group access token with the `api` scope. */
  token: string;
  /** Self-managed instance API root, e.g. `https://gitlab.acme.com/api/v4`. */
  apiBaseUrl?: string | undefined;
  fetch?: typeof fetch;
  timeoutMs?: number | undefined;
  /**
   * Pages of 100 issues listed, newest first, when the search misses and on
   * a project-wide delete. Defaults to 10: an issue older than the 1,000
   * newest SitePing issues is then out of reach.
   */
  maxListedPages?: number | undefined;
}

interface GitLabIssue {
  iid: number;
  web_url: string;
  description: string | null;
  state: "opened" | "closed";
  labels: string[];
}

function toTrackedIssue(issue: GitLabIssue, body: string): TrackedIssue {
  return { reference: { key: String(issue.iid), url: issue.web_url }, body, isOpen: issue.state === "opened" };
}

interface GitLabNote {
  body: string;
  /** Notes GitLab writes itself (state changes, label edits). */
  system: boolean;
}

/**
 * `IssueTracker` on GitLab Issues (gitlab.com or self-managed). GitLab has
 * no close reason, so `resolved` and `wont_fix` both close the issue.
 */
export function createGitLabTracker({
  project,
  token,
  apiBaseUrl = GITLAB_API_BASE_URL,
  fetch,
  timeoutMs,
  maxListedPages = TRACKER_MAX_LISTED_PAGES,
}: GitLabTrackerOptions): IssueTracker {
  const isProject =
    typeof project === "number" ? Number.isSafeInteger(project) && project > 0 : GITLAB_PROJECT_PATTERN.test(project);
  if (!isProject) {
    throw new Error(
      `[siteping] createGitLabTracker: project must be a numeric id or a full path like "group/project", got "${project}"`,
    );
  }
  const credential = checkToken("createGitLabTracker", token);
  checkApiBaseUrl("createGitLabTracker", apiBaseUrl);
  checkPositiveInteger("createGitLabTracker", "timeoutMs", timeoutMs);
  checkPositiveInteger("createGitLabTracker", "maxListedPages", maxListedPages);
  const request = createJsonHttpClient({
    tracker: "GitLab",
    baseUrl: apiBaseUrl,
    // Not `PRIVATE-TOKEN`: fetch forwards custom headers across a cross-origin
    // redirect (an SSO proxy, a moved instance), and strips `Authorization`.
    headers: { Authorization: `Bearer ${credential}` },
    ...(fetch ? { fetch } : {}),
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
  });
  const issuesPath = `/projects/${encodeURIComponent(String(project))}/issues`;

  return {
    name: "GitLab",

    async createIssue({ title, body, labels }) {
      const issue = await request<GitLabIssue>({
        method: "POST",
        path: issuesPath,
        body: { title, description: body, labels: labels.join(GITLAB_LABEL_SEPARATOR) },
      });
      if (labels.includes(SITEPING_ISSUE_LABEL) && !issue.labels.includes(SITEPING_ISSUE_LABEL)) {
        throw new UnlabelledIssueError(
          "GitLab",
          `#${issue.iid}`,
          `GitLab ignores labels set by Guest members: give the token at least the Reporter role on ${project}.`,
        );
      }
      return { key: String(issue.iid), url: issue.web_url };
    },

    async updateIssueStatus(reference, status) {
      const stateEvent = isClosedStatus(status) ? GITLAB_STATE_EVENT.close : GITLAB_STATE_EVENT.reopen;
      await request({ method: "PUT", path: `${issuesPath}/${reference.key}`, body: { state_event: stateEvent } });
    },

    async addComment(reference, body) {
      await request({ method: "POST", path: `${issuesPath}/${reference.key}/notes`, body: { body } });
    },

    async listComments(reference) {
      const bodies: string[] = [];
      for (let page = 1; page <= maxListedPages; page++) {
        const notes = await request<GitLabNote[]>({
          method: "GET",
          path: `${issuesPath}/${reference.key}/notes`,
          query: { per_page: String(GITLAB_PAGE_SIZE), page: String(page) },
        });
        bodies.push(...notes.filter((note) => !note.system).map((note) => note.body));
        if (notes.length < GITLAB_PAGE_SIZE) break;
      }
      return bodies;
    },

    async searchSitepingIssues(feedbackId) {
      const issues = await request<GitLabIssue[]>({
        method: "GET",
        path: issuesPath,
        query: {
          labels: SITEPING_ISSUE_LABEL,
          state: "all",
          search: feedbackId,
          in: "description",
          per_page: String(GITLAB_PAGE_SIZE),
        },
      });
      return issues.flatMap((issue) => (issue.description ? [toTrackedIssue(issue, issue.description)] : []));
    },

    async findSitepingIssues(marker) {
      const matches: TrackedIssue[] = [];
      for (let page = 1; page <= maxListedPages; page++) {
        const issues = await request<GitLabIssue[]>({
          method: "GET",
          path: issuesPath,
          query: { labels: SITEPING_ISSUE_LABEL, state: "all", per_page: String(GITLAB_PAGE_SIZE), page: String(page) },
        });
        for (const issue of issues) {
          if (!issue.description?.includes(marker)) continue;
          matches.push(toTrackedIssue(issue, issue.description));
        }
        if (issues.length < GITLAB_PAGE_SIZE) break;
      }
      return matches;
    },
  };
}

export type { IssueReference, IssueTracker } from "../core/issue-tracker.js";

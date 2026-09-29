import type { FeedbackStatus } from "@siteping/core";
import {
  GITHUB_ACCEPT_HEADER,
  GITHUB_API_BASE_URL,
  GITHUB_API_VERSION,
  GITHUB_PAGE_SIZE,
  GITHUB_REPOSITORY_PATTERN,
  GITHUB_STATE_REASON,
  GITHUB_USER_AGENT,
} from "../constants/github.js";
import { TRACKER_MAX_LISTED_PAGES } from "../constants/http.js";
import { SITEPING_ISSUE_LABEL } from "../constants/issue-format.js";
import { createJsonHttpClient, UnlabelledIssueError } from "../core/http-client.js";
import type { IssueTracker, TrackedIssue } from "../core/issue-tracker.js";
import { checkApiBaseUrl, checkPositiveInteger, checkTimeout, checkToken } from "../core/tracker-options.js";

export interface GitHubTrackerOptions {
  /** `owner/name` of the repository issues are created in. */
  repository: string;
  /** Token with `issues: write` (fine-grained) or `repo` scope. */
  token: string;
  /** GitHub Enterprise Server API root, e.g. `https://github.acme.com/api/v3`. */
  apiBaseUrl?: string | undefined;
  fetch?: typeof fetch;
  timeoutMs?: number | undefined;
  /**
   * Most pages of 100 issues listed, newest first: on a project-wide delete,
   * and to find a feedback's issue when the search fails. After a search
   * that answered, one page is listed (its index lags a few seconds behind a
   * new issue). Defaults to 10: past the 1,000 newest SitePing issues, a
   * project delete is refused, and so is a lookup the search did not settle.
   */
  maxListedPages?: number | undefined;
}

interface GitHubIssue {
  number: number;
  html_url: string;
  body: string | null;
  state: "open" | "closed";
  labels: Array<string | { name?: string }>;
  pull_request?: unknown;
}

interface GitHubSearchResult {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubIssue[];
}

interface GitHubComment {
  body: string | null;
}

function toTrackedIssue(issue: GitHubIssue, body: string): TrackedIssue {
  return { reference: { key: String(issue.number), url: issue.html_url }, body, isOpen: issue.state === "open" };
}

/** GitHub issue state for a feedback status: closed as completed / not planned, or reopened. */
function toGitHubState(status: FeedbackStatus): { state: "open" | "closed"; state_reason: string } {
  if (status === "resolved") return { state: "closed", state_reason: GITHUB_STATE_REASON.completed };
  if (status === "wont_fix") return { state: "closed", state_reason: GITHUB_STATE_REASON.notPlanned };
  return { state: "open", state_reason: GITHUB_STATE_REASON.reopened };
}

/** `IssueTracker` on GitHub Issues (github.com or Enterprise Server). */
export function createGitHubTracker({
  repository,
  token,
  apiBaseUrl = GITHUB_API_BASE_URL,
  fetch,
  timeoutMs,
  maxListedPages = TRACKER_MAX_LISTED_PAGES,
}: GitHubTrackerOptions): IssueTracker {
  if (!GITHUB_REPOSITORY_PATTERN.test(repository)) {
    // Not echoed: a clone URL may carry a token, and this error is logged.
    throw new Error('[siteping] createGitHubTracker: repository must be "owner/name"');
  }
  const credential = checkToken("createGitHubTracker", token);
  checkApiBaseUrl("createGitHubTracker", apiBaseUrl);
  checkTimeout("createGitHubTracker", timeoutMs);
  checkPositiveInteger("createGitHubTracker", "maxListedPages", maxListedPages);
  const request = createJsonHttpClient({
    tracker: "GitHub",
    baseUrl: apiBaseUrl,
    headers: {
      Accept: GITHUB_ACCEPT_HEADER,
      Authorization: `Bearer ${credential}`,
      "User-Agent": GITHUB_USER_AGENT,
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    },
    ...(fetch ? { fetch } : {}),
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
  });
  const issuesPath = `/repos/${repository}/issues`;

  return {
    name: "GitHub",

    async createIssue({ title, body, labels }) {
      const issue = await request<GitHubIssue>({ method: "POST", path: issuesPath, body: { title, body, labels } });
      // Label names are case-insensitive: an existing `SitePing` label is attached and answered as is.
      const kept = issue.labels.map((label) => (typeof label === "string" ? label : label.name)?.toLowerCase());
      if (labels.includes(SITEPING_ISSUE_LABEL) && !kept.includes(SITEPING_ISSUE_LABEL)) {
        throw new UnlabelledIssueError(
          "GitHub",
          `#${issue.number}`,
          `GitHub drops labels set by accounts without write access: give the token's account write access to ${repository}.`,
        );
      }
      return { key: String(issue.number), url: issue.html_url };
    },

    async updateIssueStatus(reference, status) {
      await request({ method: "PATCH", path: `${issuesPath}/${reference.key}`, body: toGitHubState(status) });
    },

    async addComment(reference, body) {
      await request({ method: "POST", path: `${issuesPath}/${reference.key}/comments`, body: { body } });
    },

    async listComments(reference) {
      const bodies: string[] = [];
      for (let page = 1; page <= maxListedPages; page++) {
        const comments = await request<GitHubComment[]>({
          method: "GET",
          path: `${issuesPath}/${reference.key}/comments`,
          query: { per_page: String(GITHUB_PAGE_SIZE), page: String(page) },
        });
        bodies.push(...comments.map((comment) => comment.body ?? ""));
        if (comments.length < GITHUB_PAGE_SIZE) break;
      }
      return bodies;
    },

    async searchSitepingIssues(feedbackId) {
      const { items, total_count, incomplete_results } = await request<GitHubSearchResult>({
        method: "GET",
        path: "/search/issues",
        query: {
          q: `repo:${repository} is:issue label:${SITEPING_ISSUE_LABEL} in:body "${feedbackId.replaceAll('"', "")}"`,
          per_page: String(GITHUB_PAGE_SIZE),
        },
      });
      return {
        issues: items.flatMap((issue) => (issue.body ? [toTrackedIssue(issue, issue.body)] : [])),
        // `incomplete_results`: the query timed out on GitHub's side.
        truncated: incomplete_results || total_count > items.length,
      };
    },

    // Listed by label (consistent right after creation, unlike the search index).
    async findSitepingIssues(marker, { maxPages = maxListedPages } = {}) {
      const matches: TrackedIssue[] = [];
      for (let page = 1; page <= Math.min(maxPages, maxListedPages); page++) {
        const issues = await request<GitHubIssue[]>({
          method: "GET",
          path: issuesPath,
          query: { labels: SITEPING_ISSUE_LABEL, state: "all", per_page: String(GITHUB_PAGE_SIZE), page: String(page) },
        });
        for (const issue of issues) {
          if (issue.pull_request || !issue.body?.includes(marker)) continue;
          matches.push(toTrackedIssue(issue, issue.body));
        }
        if (issues.length < GITHUB_PAGE_SIZE) return { issues: matches, truncated: false };
      }
      return { issues: matches, truncated: true };
    },
  };
}

export type { IssueReference, IssueTracker } from "../core/issue-tracker.js";

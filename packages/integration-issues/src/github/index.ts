import type { FeedbackStatus } from "@siteping/core";
import {
  GITHUB_ACCEPT_HEADER,
  GITHUB_API_BASE_URL,
  GITHUB_API_VERSION,
  GITHUB_PAGE_SIZE,
  GITHUB_STATE_REASON,
} from "../constants/github.js";
import { TRACKER_MAX_LISTED_PAGES } from "../constants/http.js";
import { SITEPING_ISSUE_LABEL } from "../constants/issue-format.js";
import { createJsonHttpClient, UnlabelledIssueError } from "../core/http-client.js";
import type { IssueTracker, TrackedIssue } from "../core/issue-tracker.js";

export interface GitHubTrackerOptions {
  /** `owner/name` of the repository issues are created in. */
  repository: string;
  /** Token with `issues: write` (fine-grained) or `repo` scope. */
  token: string;
  /** GitHub Enterprise Server API root, e.g. `https://github.acme.com/api/v3`. */
  apiBaseUrl?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

interface GitHubIssue {
  number: number;
  html_url: string;
  body: string | null;
  state: "open" | "closed";
  labels: Array<string | { name?: string }>;
  pull_request?: unknown;
}

interface GitHubComment {
  body: string | null;
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
}: GitHubTrackerOptions): IssueTracker {
  const request = createJsonHttpClient({
    tracker: "GitHub",
    baseUrl: apiBaseUrl,
    headers: {
      Accept: GITHUB_ACCEPT_HEADER,
      Authorization: `Bearer ${token}`,
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
      const kept = issue.labels.map((label) => (typeof label === "string" ? label : label.name));
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
      for (let page = 1; page <= TRACKER_MAX_LISTED_PAGES; page++) {
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

    // Listed by label (consistent right after creation, unlike the search index).
    async findSitepingIssues(marker) {
      const matches: TrackedIssue[] = [];
      for (let page = 1; page <= TRACKER_MAX_LISTED_PAGES; page++) {
        const issues = await request<GitHubIssue[]>({
          method: "GET",
          path: issuesPath,
          query: { labels: SITEPING_ISSUE_LABEL, state: "all", per_page: String(GITHUB_PAGE_SIZE), page: String(page) },
        });
        for (const issue of issues) {
          if (issue.pull_request || !issue.body?.includes(marker)) continue;
          matches.push({
            reference: { key: String(issue.number), url: issue.html_url },
            body: issue.body,
            isOpen: issue.state === "open",
          });
        }
        if (issues.length < GITHUB_PAGE_SIZE) break;
      }
      return matches;
    },
  };
}

export type { IssueReference, IssueTracker } from "../core/issue-tracker.js";

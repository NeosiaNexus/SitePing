/**
 * Type-level locks (vitest typecheck mode — never executed): the hooks fit
 * either access policy without widening the principal the handler infers,
 * and optional settings take values read from the environment.
 */

import type { SitepingStore } from "@siteping/core";
import { createSitepingHandler, type SitepingHandler } from "@siteping/server";
import { describe, expectTypeOf, it } from "vitest";
import { createGitHubTracker } from "../src/github/index.js";
import { createGitLabTracker } from "../src/gitlab/index.js";
import { createIssueTrackerHooks, type IssueTracker } from "../src/index.js";

declare const store: SitepingStore;
declare const tracker: IssueTracker;

interface Reviewer {
  id: string;
  isAdmin: boolean;
}
declare function sessionUser(request: Request): Promise<Reviewer | null>;

describe("createIssueTrackerHooks", () => {
  it("plugs into the apiKey policy", () => {
    expectTypeOf(
      createSitepingHandler({ store, apiKey: "k", hooks: createIssueTrackerHooks({ tracker }) }),
    ).toEqualTypeOf<SitepingHandler>();
  });

  it("keeps the principal a typed access policy infers", () => {
    createSitepingHandler({
      store,
      access: {
        authenticate: sessionUser,
        authorize: ({ principal }) => {
          expectTypeOf(principal).toEqualTypeOf<Reviewer>();
          return principal.isAdmin;
        },
      },
      hooks: createIssueTrackerHooks({ tracker }),
    });
  });

  it("combines with hooks of your own", () => {
    createSitepingHandler({
      store,
      access: { authenticate: sessionUser },
      hooks: {
        ...createIssueTrackerHooks({ tracker }),
        onDeleted: (_target, { principal }) => {
          expectTypeOf(principal).toEqualTypeOf<Reviewer>();
        },
      },
    });
  });
});

describe("optional settings", () => {
  it("accept values read from the environment, possibly undefined", () => {
    const timeoutMs = process.env.TRACKER_TIMEOUT_MS ? Number(process.env.TRACKER_TIMEOUT_MS) : undefined;
    const maxListedPages = process.env.TRACKER_PAGES ? Number(process.env.TRACKER_PAGES) : undefined;

    createIssueTrackerHooks({ tracker, siteUrl: process.env.SITE_URL });
    createGitHubTracker({
      repository: "acme/site",
      token: "token",
      apiBaseUrl: process.env.GITHUB_API_URL,
      timeoutMs,
      maxListedPages,
    });
    createGitLabTracker({
      project: "acme/site",
      token: "token",
      apiBaseUrl: process.env.GITLAB_API_URL,
      timeoutMs,
      maxListedPages,
    });
  });
});

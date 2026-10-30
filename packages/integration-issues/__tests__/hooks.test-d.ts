/**
 * Type-level locks (vitest typecheck mode — never executed): the hooks fit
 * either access policy without widening the principal the handler infers,
 * and optional settings take values read from the environment.
 */

import type { SitepingStore } from "@siteping/core";
import {
  createSitepingHandler,
  type SitepingDeletionTarget,
  type SitepingHandler,
  type SitepingLifecycleHooks,
} from "@siteping/server";
import { describe, expectTypeOf, it } from "vitest";
import { createIssueTrackerHooks, formatIssue, type IssueTracker, type IssueTrackerHooks } from "../src/index.js";
import { createGitHubTracker } from "../src/providers/github.js";
import { createGitLabTracker } from "../src/providers/gitlab.js";

declare const store: SitepingStore;
declare const tracker: IssueTracker;

interface Reviewer {
  id: string;
  isAdmin: boolean;
}
declare function sessionUser(request: Request): Promise<Reviewer | null>;

describe("IssueTrackerHooks without a @siteping/server dependency", () => {
  // The package restates the server types it needs instead of importing them,
  // so a 0.x release installs next to any server. These locks fail as soon as
  // the server's shapes drift from the restated ones.
  it("takes exactly the server's deletion target", () => {
    expectTypeOf<Parameters<IssueTrackerHooks["onDeleting"]>[0]>().toEqualTypeOf<SitepingDeletionTarget>();
  });

  it("is lifecycle hooks of either access policy, whatever the principal", () => {
    expectTypeOf<IssueTrackerHooks>().toExtend<SitepingLifecycleHooks<null>>();
    expectTypeOf<IssueTrackerHooks>().toExtend<SitepingLifecycleHooks<Reviewer>>();
    // Every hook it returns is one the server calls: no name lost to a rename.
    expectTypeOf<keyof IssueTrackerHooks>().toExtend<keyof SitepingLifecycleHooks<null>>();
  });
});

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

  it("lets a hook of your own call the one it replaces", () => {
    const issues = createIssueTrackerHooks({ tracker });

    createSitepingHandler({
      store,
      access: { authenticate: sessionUser },
      hooks: {
        ...issues,
        async onCreated(feedback, { principal }) {
          await issues.onCreated(feedback);
          expectTypeOf(principal).toEqualTypeOf<Reviewer>();
        },
      },
    });
    createSitepingHandler({
      store,
      apiKey: "k",
      hooks: {
        ...issues,
        onDeleting: (target) => issues.onDeleting(target),
      },
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

describe("formatIssue", () => {
  it("extends the built-in format with the options it is given", () => {
    createIssueTrackerHooks({
      tracker,
      formatIssue: (feedback, options) => {
        const issue = formatIssue(feedback, options);
        return { ...issue, body: `${issue.body}\n\nextra` };
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

  it("accept undefined for every optional setting, callbacks and fetch included", () => {
    const featureOff = process.env.TRACKER_SYNC === "off";
    const customFetch: typeof fetch | undefined = featureOff ? undefined : fetch;
    createIssueTrackerHooks({
      tracker,
      labels: featureOff ? undefined : ["feedback"],
      redact: featureOff ? undefined : (text) => text,
      deepLinkParam: undefined,
      includeAuthorEmail: undefined,
      formatIssue: undefined,
      onIssueCreated: undefined,
      syncStatus: featureOff ? undefined : true,
      deletedCommentText: undefined,
    });
    createGitHubTracker({ repository: "acme/site", token: "token", fetch: customFetch });
    createGitLabTracker({ project: "acme/site", token: "token", fetch: customFetch });
    expectTypeOf<Parameters<IssueTracker["findSitepingIssues"]>[1]>().toEqualTypeOf<
      { maxPages?: number | undefined } | undefined
    >();
  });
});

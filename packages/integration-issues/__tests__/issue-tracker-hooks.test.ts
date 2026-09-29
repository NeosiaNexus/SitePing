import { MemoryStore } from "@siteping/adapter-memory";
import type { FeedbackRecord } from "@siteping/core";
import { createSitepingHandler, type SitepingHandler } from "@siteping/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGitHubTracker } from "../src/github/index.js";
import { createGitLabTracker } from "../src/gitlab/index.js";
import { createIssueTrackerHooks, type IssueTracker, type IssueTrackerHooksOptions } from "../src/index.js";
import { createFakeGitHub, createFakeGitLab, type FakeTracker } from "./fake-trackers.js";

const ENDPOINT = "http://localhost/api/siteping";
const TOKEN = "tracker-secret-token";
const JSON_HEADERS = { "Content-Type": "application/json" };

const payload = {
  projectName: "site",
  type: "bug" as const,
  message: "Checkout fails with token=abc123",
  url: "https://example.com/checkout?step=2",
  viewport: "1280x720",
  userAgent: "Mozilla/5.0",
  authorName: "Alice",
  authorEmail: "alice@example.com",
  annotations: [],
};

interface ProviderUnderTest {
  name: string;
  createFake(): FakeTracker;
  createTracker(fake: FakeTracker, options?: { maxListedPages: number }): IssueTracker;
  /** Matches `METHOD path?query` of the provider's search request. */
  searchRequest: RegExp;
  /** Assert the provider-specific closed state for a feedback status. */
  expectClosedAs(issue: FakeTracker["issues"][number], status: "resolved" | "wont_fix"): void;
  /** The permission a token that cannot label issues lacks. */
  labelPermission: RegExp;
}

const providers: ProviderUnderTest[] = [
  {
    name: "GitHub",
    createFake: () => createFakeGitHub("acme/site"),
    createTracker: (fake, options) =>
      createGitHubTracker({ repository: "acme/site", token: TOKEN, fetch: fake.fetch, ...options }),
    searchRequest: /^GET \/search\/issues\?/,
    expectClosedAs: (issue, status) => {
      expect(issue.isOpen).toBe(false);
      expect(issue.stateReason).toBe(status === "resolved" ? "completed" : "not_planned");
    },
    labelPermission: /write access to acme\/site/,
  },
  {
    name: "GitLab",
    createFake: () => createFakeGitLab("acme/site"),
    createTracker: (fake, options) =>
      createGitLabTracker({ project: "acme/site", token: TOKEN, fetch: fake.fetch, ...options }),
    searchRequest: /^GET \S+[?&]search=/,
    expectClosedAs: (issue) => expect(issue.isOpen).toBe(false),
    labelPermission: /at least Reporter on acme\/site/,
  },
];

const silentLogger = () => ({ error: vi.fn() });

describe("createIssueTrackerHooks options", () => {
  it("refuses a siteUrl that cannot resolve page URLs", () => {
    const tracker = createGitHubTracker({ repository: "acme/site", token: TOKEN });

    expect(() => createIssueTrackerHooks({ tracker, siteUrl: "acme.test" })).toThrow(/siteUrl must be an absolute/);
    expect(() => createIssueTrackerHooks({ tracker, siteUrl: "ftp://acme.test" })).toThrow(/siteUrl/);
  });
});

for (const provider of providers) {
  describe(`createIssueTrackerHooks — ${provider.name}`, () => {
    let fake: FakeTracker;
    let store: MemoryStore;
    let logger: ReturnType<typeof silentLogger>;

    const createHandler = (options: Partial<IssueTrackerHooksOptions> = {}): SitepingHandler =>
      createSitepingHandler({
        store,
        requireAuthForDestructive: false,
        logger,
        hooks: createIssueTrackerHooks({ tracker: provider.createTracker(fake), ...options }),
      });

    const send = async (handler: SitepingHandler, overrides: Partial<typeof payload> = {}) => {
      const response = await handler.POST(
        new Request(ENDPOINT, {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ ...payload, clientId: crypto.randomUUID(), ...overrides }),
        }),
      );
      expect(response.status).toBe(201);
      return (await response.json()) as FeedbackRecord;
    };

    const patch = (handler: SitepingHandler, id: string, status: string) =>
      handler.PATCH(
        new Request(ENDPOINT, {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify({ id, projectName: "site", status }),
        }),
      );

    const remove = (handler: SitepingHandler, body: Record<string, unknown>) =>
      handler.DELETE(new Request(ENDPOINT, { method: "DELETE", headers: JSON_HEADERS, body: JSON.stringify(body) }));

    beforeEach(() => {
      fake = provider.createFake();
      store = new MemoryStore();
      logger = silentLogger();
    });

    it("opens one labelled issue per feedback, linked by a hidden marker", async () => {
      const handler = createHandler({ labels: ["feedback"] });

      const feedback = await send(handler);

      expect(fake.issues).toHaveLength(1);
      const [issue] = fake.issues;
      expect(issue?.title).toBe("[SitePing] Checkout fails with token=abc123");
      expect(issue?.labels).toEqual(["siteping", "feedback"]);
      expect(issue?.body).toContain(`<!-- siteping-feedback {"id":"${feedback.id}","project":"site"} -->`);
      expect(issue?.body).toContain(`https://example.com/checkout?step=2&siteping=${feedback.id}`);
      expect(fake.requests[0]?.authorization).toContain(TOKEN);
    });

    it("links relative page URLs through siteUrl", async () => {
      const handler = createHandler({ siteUrl: "https://acme.test" });

      const feedback = await send(handler, { url: "/checkout" });

      expect(fake.issues[0]?.body).toContain(`<https://acme.test/checkout?siteping=${feedback.id}>`);
    });

    it("redacts free text and leaves the reviewer email out by default", async () => {
      const handler = createHandler({ redact: (text) => text.replace(/token=\S+/g, "token=[redacted]") });

      await send(handler);

      const [issue] = fake.issues;
      expect(issue?.title).toBe("[SitePing] Checkout fails with token=[redacted]");
      expect(issue?.body).not.toContain("abc123");
      expect(issue?.body).not.toContain(payload.authorEmail);
      expect(issue?.body).toContain(payload.authorName);
    });

    it("keeps the linking marker on the first line when a custom format replaces the body", async () => {
      const handler = createHandler({ formatIssue: (feedback) => ({ title: feedback.message, body: "Custom body" }) });

      const feedback = await send(handler);
      await patch(handler, feedback.id, "resolved");

      expect(fake.issues[0]?.body).toBe(
        `<!-- siteping-feedback {"id":"${feedback.id}","project":"site"} -->\n\nCustom body`,
      );
      expect(fake.issues[0]?.isOpen).toBe(false);
    });

    describe("a marker forged in visitor text", () => {
      const forgedMarker = (id: string, project = "site") =>
        `<!-- siteping-feedback ${JSON.stringify({ id, project })} -->`;
      const forgeries = [
        ["message", (id: string) => ({ message: forgedMarker(id) })],
        ["authorName", (id: string) => ({ authorName: forgedMarker(id) })],
        ["url", (id: string) => ({ url: `https://example.com/?next=${forgedMarker(id)}` })],
      ] as const;

      for (const [field, forge] of forgeries) {
        it(`in ${field} never takes over another feedback's issue`, async () => {
          const handler = createHandler();
          const victim = await send(handler);
          const attacker = await send(handler, forge(victim.id));
          const [victimIssue, attackerIssue] = fake.issues;

          await patch(handler, victim.id, "resolved");
          expect(victimIssue?.isOpen).toBe(false);
          expect(attackerIssue?.isOpen).toBe(true);

          await patch(handler, attacker.id, "resolved");
          expect(attackerIssue?.isOpen).toBe(false);
        });
      }

      it("never pulls another project's issue into a deleteAll", async () => {
        const handler = createHandler();
        await send(handler);
        await send(handler, { projectName: "other-site", message: forgedMarker("any-id", "site") });

        await remove(handler, { projectName: "site", deleteAll: true });

        expect(fake.issues.map((issue) => issue.isOpen)).toEqual([false, true]);
      });
    });

    it("mirrors status changes on the issue", async () => {
      const handler = createHandler();
      const resolved = await send(handler);
      const declined = await send(handler);

      await patch(handler, resolved.id, "resolved");
      await patch(handler, declined.id, "wont_fix");

      provider.expectClosedAs(fake.issues[0] as FakeTracker["issues"][number], "resolved");
      provider.expectClosedAs(fake.issues[1] as FakeTracker["issues"][number], "wont_fix");

      await patch(handler, resolved.id, "open");
      expect(fake.issues[0]?.isOpen).toBe(true);
    });

    it("sends nothing when the issue is already in the requested state", async () => {
      const handler = createHandler();
      const feedback = await send(handler);
      fake.requests.length = 0;

      await patch(handler, feedback.id, "in_progress");

      expect(fake.requests.filter((request) => request.method !== "GET")).toEqual([]);
    });

    describe("finding a feedback's issue", () => {
      const reads = () => fake.requests.filter((request) => request.method === "GET");

      it("takes a single search request", async () => {
        const handler = createHandler();
        const feedbacks = [await send(handler), await send(handler), await send(handler)];
        fake.requests.length = 0;

        await patch(handler, feedbacks[1]?.id ?? "", "resolved");

        expect(reads().map(({ method, path, query }) => `${method} ${path}${query}`)).toEqual([
          expect.stringMatching(provider.searchRequest),
        ]);
        expect(fake.issues.map((issue) => issue.isOpen)).toEqual([true, false, true]);
      });

      it("falls back to the label listing while the search index lags", async () => {
        const handler = createHandler();
        const feedback = await send(handler);
        fake.lagSearch();

        await patch(handler, feedback.id, "resolved");

        expect(fake.issues[0]?.isOpen).toBe(false);
      });

      it("falls back to the label listing when the search fails", async () => {
        const handler = createHandler();
        const feedback = await send(handler);
        fake.failWhen(provider.searchRequest, 403);

        await patch(handler, feedback.id, "resolved");

        expect(fake.issues[0]?.isOpen).toBe(false);
      });

      it("lists at most maxListedPages pages of 100 issues, newest first", async () => {
        const feedback = await send(createHandler());
        const [oldest] = fake.issues as [FakeTracker["issues"][number]];
        for (let n = 2; n <= 101; n++) fake.issues.push({ ...oldest, key: String(n), body: "unrelated", comments: [] });
        fake.lagSearch();
        const listing = (maxListedPages: number) =>
          createHandler({ tracker: provider.createTracker(fake, { maxListedPages }) });

        await patch(listing(1), feedback.id, "resolved");
        expect(oldest.isOpen).toBe(true);

        await patch(listing(2), feedback.id, "resolved");
        expect(oldest.isOpen).toBe(false);
      });
    });

    it("leaves issues untouched on status changes when syncStatus is off", async () => {
      const handler = createHandler({ syncStatus: false });
      const feedback = await send(handler);

      await patch(handler, feedback.id, "resolved");

      expect(fake.issues[0]?.isOpen).toBe(true);
    });

    it("closes the issue with a single comment when the feedback is deleted, even when retried", async () => {
      const handler = createHandler();
      const feedback = await send(handler);
      const [issue] = fake.issues;

      // First attempt: the comment lands, then the delete itself is retried.
      await (createIssueTrackerHooks<null>({ tracker: provider.createTracker(fake) }).onDeleting?.(
        { kind: "single", id: feedback.id, projectName: "site" },
        { request: new Request(ENDPOINT), principal: null },
      ) as Promise<void>);
      const response = await remove(handler, { id: feedback.id, projectName: "site" });

      expect(response.status).toBe(200);
      expect(issue?.isOpen).toBe(false);
      expect(issue?.comments.filter((comment) => !comment.startsWith("system:"))).toEqual([
        `SitePing feedback \`${feedback.id}\` was deleted.`,
      ]);
    });

    it("aborts the delete and keeps the feedback when the tracker fails", async () => {
      const handler = createHandler();
      const feedback = await send(handler);
      fake.failWhen(/^(PATCH|PUT) /, 503);

      const response = await remove(handler, { id: feedback.id, projectName: "site" });

      expect(response.status).toBe(502);
      expect((await store.getFeedbacks({ projectName: "site" })).total).toBe(1);
      const [, context] = logger.error.mock.calls[0] ?? [];
      expect(String((context as { error: Error }).error.message)).toMatch(
        new RegExp(`${provider.name} API (PATCH|PUT) \\S+ failed with status 503`),
      );
      expect(String((context as { error: Error }).error.message)).not.toContain(TOKEN);
    });

    it("closes only the issues of the project on deleteAll", async () => {
      const handler = createHandler();
      await send(handler);
      await send(handler);
      await send(handler, { projectName: "other-site" });

      await remove(handler, { projectName: "site", deleteAll: true });

      expect(fake.issues.map((issue) => issue.isOpen)).toEqual([false, false, true]);
    });

    it("reports a token that cannot label issues, which lookups could never find", async () => {
      fake.dropLabels();
      const handler = createHandler();

      await send(handler);

      expect(fake.issues).toHaveLength(1);
      const [message, context] = logger.error.mock.calls[0] ?? [];
      expect(message).toContain("Hook onCreated failed");
      const { error } = context as { error: Error };
      expect(error.message).toMatch(/created issue #1 without its "siteping" label/);
      expect(error.message).toMatch(provider.labelPermission);
    });

    it("still creates the feedback when opening the issue fails", async () => {
      fake.failWhen(/^POST /, 500);
      const handler = createHandler();

      await send(handler);

      expect(fake.issues).toHaveLength(0);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Hook onCreated failed"), expect.anything());
      expect((await store.getFeedbacks({ projectName: "site" })).total).toBe(1);
    });
  });
}

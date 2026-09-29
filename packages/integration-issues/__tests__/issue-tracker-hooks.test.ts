import { MemoryStore } from "@siteping/adapter-memory";
import type { FeedbackRecord } from "@siteping/core";
import { createSitepingHandler, type SitepingHandler } from "@siteping/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createIssueTrackerHooks,
  type IssueTracker,
  type IssueTrackerHooksOptions,
  isUnlabelledIssueError,
} from "../src/index.js";
import { createGitHubTracker } from "../src/providers/github.js";
import { createGitLabTracker } from "../src/providers/gitlab.js";
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
  createTracker(fake: FakeTracker, options?: { maxListedPages?: number; timeoutMs?: number }): IssueTracker;
  /** Matches `METHOD path?query` of the provider's search request. */
  searchRequest: RegExp;
  /** Assert the provider-specific closed state for a feedback status. */
  expectClosedAs(issue: FakeTracker["issues"][number], status: "resolved" | "wont_fix"): void;
  /** GitHub `state_reason` of a reopened issue; GitLab has none. */
  reopenedReason: string | null;
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
    reopenedReason: "reopened",
    labelPermission: /write access to acme\/site/,
  },
  {
    name: "GitLab",
    createFake: () => createFakeGitLab("acme/site"),
    createTracker: (fake, options) =>
      createGitLabTracker({ project: "acme/site", token: TOKEN, fetch: fake.fetch, ...options }),
    searchRequest: /^GET \S+[?&]search=/,
    expectClosedAs: (issue) => expect(issue.isOpen).toBe(false),
    reopenedReason: null,
    labelPermission: /at least the Reporter role on acme\/site/,
  },
];

const silentLogger = () => ({ error: vi.fn() });

describe("createGitHubTracker", () => {
  it("accepts the siteping label in the casing the repository already uses", async () => {
    const fake = createFakeGitHub("acme/site");
    fake.useExistingLabel("SitePing");
    const tracker = createGitHubTracker({ repository: "acme/site", token: TOKEN, fetch: fake.fetch });

    await tracker.createIssue({ title: "Title", body: "marker", labels: ["siteping"] });

    expect(fake.issues[0]?.labels).toEqual(["SitePing"]);
    expect((await tracker.findSitepingIssues("marker")).issues).toHaveLength(1);
  });
});

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
      const handler = createHandler({ labels: ["feedback"], siteUrl: "https://example.com" });

      const feedback = await send(handler);

      expect(fake.issues).toHaveLength(1);
      const [issue] = fake.issues;
      expect(issue?.title).toBe("[SitePing] Checkout fails with token=abc123");
      expect(issue?.labels).toEqual(["siteping", "feedback"]);
      expect(issue?.body).toContain(`<!-- siteping-feedback {"id":"${feedback.id}","project":"site"} -->`);
      expect(issue?.body).toContain(`https://example.com/checkout?step=2&siteping=${feedback.id}`);
      expect(fake.requests[0]?.authorization).toContain(TOKEN);
    });

    it("hands each issue opened to onIssueCreated", async () => {
      const opened: unknown[] = [];
      const handler = createHandler({ onIssueCreated: (feedback, issue) => void opened.push([feedback.id, issue]) });

      const feedback = await send(handler);

      expect(opened).toEqual([
        [feedback.id, { key: "1", url: expect.stringMatching(/\/acme\/site\/(-\/)?issues\/1$/) }],
      ]);
    });

    it("links relative page URLs through siteUrl", async () => {
      const handler = createHandler({ siteUrl: "https://acme.test" });

      const feedback = await send(handler, { url: "/checkout" });

      expect(fake.issues[0]?.body).toContain(`<https://acme.test/checkout?siteping=${feedback.id}>`);
    });

    it("leaves the deep link out with deepLinkParam: false", async () => {
      const handler = createHandler({ siteUrl: "https://example.com", deepLinkParam: false });

      await send(handler);

      expect(fake.issues[0]?.body).toContain("## Page");
      expect(fake.issues[0]?.body).not.toContain("## Open in the page");
      expect(fake.issues[0]?.body).not.toContain("?step=2&");
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
        for (const lagging of [false, true]) {
          it(`in ${field} never takes over another feedback's issue (search lagging: ${lagging})`, async () => {
            const handler = createHandler();
            const victim = await send(handler);
            const attacker = await send(handler, forge(victim.id));
            const [victimIssue, attackerIssue] = fake.issues;
            // The listing returns the attacker's newer issue first.
            if (lagging) fake.lagSearch();

            await patch(handler, victim.id, "resolved");
            expect(victimIssue?.isOpen).toBe(false);
            expect(attackerIssue?.isOpen).toBe(true);

            await remove(handler, { id: victim.id, projectName: "site" });
            expect(attackerIssue?.comments).toEqual([]);

            await patch(handler, attacker.id, "resolved");
            expect(attackerIssue?.isOpen).toBe(false);
          });
        }
      }

      for (const lagging of [false, true]) {
        it(`in an unlabelled issue opened on the tracker never takes over (search lagging: ${lagging})`, async () => {
          const handler = createHandler();
          const victim = await send(handler);
          fake.issues.push({
            key: String(fake.issues.length + 1),
            title: "Hijack",
            body: `${forgedMarker(victim.id)}\n\nOpened by a stranger`,
            labels: [],
            isOpen: true,
            stateReason: null,
            comments: [],
          });
          if (lagging) fake.lagSearch();

          await patch(handler, victim.id, "resolved");
          expect(fake.issues.map((issue) => issue.isOpen)).toEqual([false, true]);

          await remove(handler, { id: victim.id, projectName: "site" });
          expect(fake.issues[1]?.comments).toEqual([]);
          expect(fake.issues[0]?.comments.some((comment) => comment.includes("was deleted"))).toBe(true);
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

    it("keeps deployments that share a repository apart by instance", async () => {
      const production = createIssueTrackerHooks({ tracker: provider.createTracker(fake) });
      const staging = createIssueTrackerHooks({ tracker: provider.createTracker(fake), instance: "staging" });
      // Separate stores may hand out the same id: production's issue is the newer match.
      const feedback = await send(createHandler({ instance: "staging" }));
      await production.onCreated(feedback);

      expect(fake.issues.map((issue) => issue.body.split("\n", 1)[0])).toEqual([
        `<!-- siteping-feedback {"id":"${feedback.id}","project":"site","instance":"staging"} -->`,
        `<!-- siteping-feedback {"id":"${feedback.id}","project":"site"} -->`,
      ]);

      await staging.onUpdated({ ...feedback, status: "resolved" });
      expect(fake.issues.map((issue) => issue.isOpen)).toEqual([false, true]);

      await production.onDeleting({ kind: "project", projectName: "site" });
      expect(fake.issues.map((issue) => issue.isOpen)).toEqual([false, false]);
      expect(fake.issues.map((issue) => issue.comments.filter((comment) => !comment.startsWith("system:")))).toEqual([
        [],
        [expect.stringContaining("was deleted")],
      ]);
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
      expect(fake.issues[0]?.stateReason).toBe(provider.reopenedReason);
    });

    it("keeps the close reason of an issue already closed when its feedback is deleted", async () => {
      const handler = createHandler();
      const feedback = await send(handler);
      await patch(handler, feedback.id, "resolved");
      fake.requests.length = 0;

      expect((await remove(handler, { id: feedback.id, projectName: "site" })).status).toBe(200);

      provider.expectClosedAs(fake.issues[0] as FakeTracker["issues"][number], "resolved");
      expect(fake.requests.filter(({ method }) => method === "PATCH" || method === "PUT")).toEqual([]);
      expect(fake.issues[0]?.comments.some((comment) => comment.includes("was deleted"))).toBe(true);
    });

    it("writes nothing when the issue is already in the requested state", async () => {
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

      it("stops the fallback listing at the first page that is not full", async () => {
        const handler = createHandler();
        const feedback = await send(handler);
        fake.lagSearch();
        fake.requests.length = 0;

        await patch(handler, feedback.id, "resolved");

        expect(reads().map(({ method, path, query }) => `${method} ${path}${query}`)).toEqual([
          expect.stringMatching(provider.searchRequest),
          expect.stringMatching(/[?&]page=1$/),
        ]);
        expect(fake.issues[0]?.isOpen).toBe(false);
      });

      it("falls back to the label listing when the search fails", async () => {
        const handler = createHandler();
        const feedback = await send(handler);
        fake.failWhen(provider.searchRequest, 403);

        await patch(handler, feedback.id, "resolved");

        expect(fake.issues[0]?.isOpen).toBe(false);
      });

      it("reaches closed issues through the listing too", async () => {
        const handler = createHandler();
        const resolved = await send(handler);
        const reopened = await send(handler);
        await patch(handler, resolved.id, "resolved");
        await patch(handler, reopened.id, "resolved");
        fake.lagSearch();

        await patch(handler, reopened.id, "open");
        expect(fake.issues.map((issue) => issue.isOpen)).toEqual([false, true]);

        await remove(handler, { projectName: "site", deleteAll: true });
        expect(
          fake.issues.map((issue) => issue.comments.filter((comment) => !comment.startsWith("system:")).length),
        ).toEqual([1, 1]);
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

    it("stops at the search when the tracker does not answer it, instead of waiting out the listing too", async () => {
      const feedback = await send(createHandler());
      const handler = createHandler({ tracker: provider.createTracker(fake, { timeoutMs: 50 }) });
      fake.hang();
      fake.requests.length = 0;

      expect((await patch(handler, feedback.id, "resolved")).status).toBe(200);
      expect((await remove(handler, { id: feedback.id, projectName: "site" })).status).toBe(502);

      const sent = fake.requests.map(({ method, path, query }) => `${method} ${path}${query}`);
      expect(sent).toEqual([
        expect.stringMatching(provider.searchRequest),
        expect.stringMatching(provider.searchRequest),
      ]);
      expect(logger.error).toHaveBeenCalledTimes(2);
    });

    describe("past the listing cap", () => {
      /** Pages of newer SitePing issues, of other feedbacks. */
      const addNewerIssues = (pages: number) => {
        for (let n = 0; n < pages * 100; n++) {
          fake.issues.push({
            key: String(fake.issues.length + 1),
            title: "Other",
            body: "Another feedback's issue",
            labels: ["siteping"],
            isOpen: true,
            stateReason: null,
            comments: [],
          });
        }
      };
      const capped = (maxListedPages: number) =>
        createHandler({ tracker: provider.createTracker(fake, { maxListedPages }) });
      const reason = () => String((logger.error.mock.calls[0]?.[1] as { error: Error } | undefined)?.error.message);

      it("refuses a project delete that would leave issues unlisted, and open", async () => {
        await send(createHandler());
        addNewerIssues(1);

        expect((await remove(capped(1), { projectName: "site", deleteAll: true })).status).toBe(502);
        expect(fake.issues[0]?.isOpen).toBe(true);
        expect((await store.getFeedbacks({ projectName: "site" })).total).toBe(1);
        expect(reason()).toMatch(
          new RegExp(
            `^\\[siteping\\] ${provider.name}: project "site" may have SitePing issues past the ones listed.*maxListedPages`,
          ),
        );

        expect((await remove(capped(2), { projectName: "site", deleteAll: true })).status).toBe(200);
        expect(fake.issues[0]?.isOpen).toBe(false);
      });

      it("refuses a delete whose search failed and whose issue it could not list", async () => {
        const feedback = await send(createHandler());
        addNewerIssues(1);
        fake.failWhen(provider.searchRequest, 403);

        expect((await remove(capped(1), { id: feedback.id, projectName: "site" })).status).toBe(502);
        expect(fake.issues[0]?.isOpen).toBe(true);
        expect(reason()).toMatch(
          new RegExp(
            `^\\[siteping\\] ${provider.name}: the issue of feedback "${feedback.id}" is not among the SitePing issues listed`,
          ),
        );
      });

      it("trusts a search that answered: a feedback without an issue stays deletable", async () => {
        fake.failWhen(/^POST /, 500);
        const feedback = await send(createHandler());
        addNewerIssues(1);
        logger.error.mockClear();

        expect((await remove(capped(1), { id: feedback.id, projectName: "site" })).status).toBe(200);
        expect(logger.error).not.toHaveBeenCalled();
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
      await createIssueTrackerHooks({ tracker: provider.createTracker(fake) }).onDeleting({
        kind: "single",
        id: feedback.id,
        projectName: "site",
      });
      const response = await remove(handler, { id: feedback.id, projectName: "site" });

      expect(response.status).toBe(200);
      expect(issue?.isOpen).toBe(false);
      expect(issue?.comments.filter((comment) => !comment.startsWith("system:"))).toEqual([
        `<!-- siteping-feedback-deleted -->\n\nSitePing feedback \`${feedback.id}\` was deleted.`,
      ]);
    });

    it("finds its deletion comment past the first page of comments", async () => {
      const handler = createHandler();
      const feedback = await send(handler);
      const [issue] = fake.issues as [FakeTracker["issues"][number]];
      issue.comments.push(...Array.from({ length: 100 }, (_, n) => `Comment ${n}`));
      const isDeletion = (comment: string) => comment.includes("was deleted");

      await createIssueTrackerHooks({ tracker: provider.createTracker(fake) }).onDeleting({
        kind: "single",
        id: feedback.id,
        projectName: "site",
      });
      expect(issue.comments.findIndex(isDeletion)).toBeGreaterThanOrEqual(100);

      expect((await remove(handler, { id: feedback.id, projectName: "site" })).status).toBe(200);
      expect(issue.comments.filter(isDeletion)).toHaveLength(1);
    });

    const deletedTexts = [
      ["ending in a line break, which GitLab trims", () => (id: string) => `Feedback ${id} was deleted.\r\n`],
      [
        "that differs on each attempt",
        () => {
          let attempt = 0;
          return (id: string) => `Feedback ${id} deleted (attempt ${++attempt}).`;
        },
      ],
    ] as const;

    for (const [label, deletedCommentText] of deletedTexts) {
      it(`leaves a single deletion comment across retries, with a text ${label}`, async () => {
        const feedback = await send(createHandler());
        const hooks = createIssueTrackerHooks({
          tracker: provider.createTracker(fake),
          deletedCommentText: deletedCommentText(),
        });
        const target = { kind: "single", id: feedback.id, projectName: "site" } as const;

        await hooks.onDeleting(target);
        await hooks.onDeleting(target);

        expect(fake.issues[0]?.comments.filter((comment) => !comment.startsWith("system:"))).toHaveLength(1);
      });
    }

    describe("concurrent requests", () => {
      const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const humanComments = () =>
        fake.issues.map((issue) => issue.comments.filter((comment) => !comment.startsWith("system:")).length);

      it("apply status changes in the order they came, however the tracker answers interleave", async () => {
        const handler = createHandler();
        const feedback = await send(handler);
        fake.delay(20);

        const resolving = patch(handler, feedback.id, "resolved");
        await pause(5);
        await Promise.all([resolving, patch(handler, feedback.id, "open")]);

        expect(fake.issues[0]?.isOpen).toBe(true);
      });

      it("leave one deletion comment when deletes of a feedback overlap", async () => {
        const handler = createHandler();
        const feedback = await send(handler);
        fake.delay(10);

        const responses = await Promise.all(
          [1, 2].map(() => remove(handler, { id: feedback.id, projectName: "site" })),
        );

        expect(responses.map((response) => response.status)).toContain(200);
        expect(humanComments()).toEqual([1]);
      });

      it("leave one deletion comment per issue when project deletes overlap", async () => {
        const handler = createHandler();
        await send(handler);
        await send(handler);
        fake.delay(10);

        await Promise.all([1, 2].map(() => remove(handler, { projectName: "site", deleteAll: true })));

        expect(humanComments()).toEqual([1, 1]);
      });

      it("leave one deletion comment when a feedback's delete overlaps its project's", async () => {
        const handler = createHandler();
        const feedback = await send(handler);
        const commenting = fake.hold(/^POST \S+\/(comments|notes)$/);

        const deletingAll = remove(handler, { projectName: "site", deleteAll: true });
        await commenting.reached;
        const deleting = remove(handler, { id: feedback.id, projectName: "site" });
        await pause(20);
        commenting.release();
        await Promise.all([deletingAll, deleting]);

        expect(humanComments()).toEqual([1]);
      });

      const whileTheIssueIsCreated = async (
        act: (handler: SitepingHandler, feedbackId: string) => Promise<Response>,
      ) => {
        const handler = createHandler();
        const creation = fake.hold(/^POST \S+\/issues$/);
        const sending = send(handler);
        await creation.reached;
        const [feedback] = (await store.getFeedbacks({ projectName: "site" })).feedbacks;
        const acting = act(handler, feedback?.id ?? "");
        // Time enough for the request's own tracker calls, had it not waited for the creation.
        await pause(20);
        creation.release();
        await sending;
        return (await acting).status;
      };

      it("close an issue still being created when its project is deleted", async () => {
        expect(
          await whileTheIssueIsCreated((handler) => remove(handler, { projectName: "site", deleteAll: true })),
        ).toBe(200);
        expect(fake.issues[0]?.isOpen).toBe(false);
      });

      it("close an issue still being created when its feedback is deleted", async () => {
        expect(await whileTheIssueIsCreated((handler, id) => remove(handler, { id, projectName: "site" }))).toBe(200);
        expect(fake.issues[0]?.isOpen).toBe(false);
      });

      it("sync the status of an issue still being created", async () => {
        expect(await whileTheIssueIsCreated((handler, id) => patch(handler, id, "resolved"))).toBe(200);
        expect(fake.issues[0]?.isOpen).toBe(false);
      });
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

    for (const status of [401, 403, 404, 410, 422]) {
      it(`treats a ${status} answer to a write as a failure`, async () => {
        const handler = createHandler();
        const feedback = await send(handler);
        fake.failWhen(/^(PATCH|PUT) /, status);

        expect((await patch(handler, feedback.id, "resolved")).status).toBe(200);
        expect(logger.error).toHaveBeenCalledWith("[siteping] Hook onUpdated failed", expect.anything());
        expect((await remove(handler, { id: feedback.id, projectName: "site" })).status).toBe(502);
        expect((await store.getFeedbacks({ projectName: "site" })).total).toBe(1);
      });
    }

    describe("keeps every record when a tracker call of the delete fails", () => {
      const steps = [
        ["the lookup", /^GET /],
        ["closing the issue", /^(PATCH|PUT) /],
        ["reading its comments", /^GET \S+\/(comments|notes)\?/],
        ["commenting", /^POST \S+\/(comments|notes)$/],
      ] as const;

      for (const [step, pattern] of steps) {
        for (const kind of ["single", "project"] as const) {
          it(`${step}, deleting ${kind === "single" ? "one feedback" : "the project"}`, async () => {
            const handler = createHandler();
            const feedback = await send(handler);
            await send(handler);
            fake.failWhen(pattern, 503);

            const response = await remove(
              handler,
              kind === "single" ? { id: feedback.id, projectName: "site" } : { projectName: "site", deleteAll: true },
            );

            expect(response.status).toBe(502);
            expect((await store.getFeedbacks({ projectName: "site" })).total).toBe(2);
          });
        }
      }
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
      expect(isUnlabelledIssueError(error)).toBe(true);
      expect(error.message).toMatch(/created issue #1 without its "siteping" label/);
      expect(error.message).toMatch(provider.labelPermission);
    });

    it("deletes a feedback that never got an issue, writing nothing to the tracker", async () => {
      fake.failWhen(/^POST /, 500);
      const handler = createHandler();
      const feedback = await send(handler);
      fake.requests.length = 0;

      expect((await remove(handler, { id: feedback.id, projectName: "site" })).status).toBe(200);
      expect((await store.getFeedbacks({ projectName: "site" })).total).toBe(0);
      expect(fake.requests.filter((request) => request.method !== "GET")).toEqual([]);
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

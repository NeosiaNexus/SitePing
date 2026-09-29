import { createSitepingHandler, type SitepingHandler } from "@siteping/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createLibSQLSitepingStore } from "../src/libsql/index.js";
import { createPgSitepingStore } from "../src/pg/index.js";
import type { DrizzleStore } from "../src/shared/store.js";
import { createLibSQLTestDatabase, createPgTestDatabase } from "./databases.js";

// The documented deployment: the Drizzle store mounted behind @siteping/server's
// handler, over the same real engines as the other tests.

const ENDPOINT = "http://localhost/api/siteping";
const WEBHOOK = { url: "https://hooks.example.com/siteping" };

const payload = {
  projectName: "site",
  type: "bug",
  message: "Checkout button is broken",
  url: "https://example.com/checkout",
  viewport: "1280x720",
  userAgent: "Mozilla/5.0",
  authorName: "Alice",
  authorEmail: "alice@example.com",
  annotations: [
    {
      anchor: {
        cssSelector: "button.pay",
        xpath: "/html/body/button",
        textSnippet: "Pay",
        elementTag: "BUTTON",
        textPrefix: "",
        textSuffix: "",
        fingerprint: "1:0:pay",
        neighborText: "",
      },
      rect: { xPct: 0, yPct: 0, wPct: 1, hPct: 1 },
      scrollX: 0,
      scrollY: 0,
      viewportW: 1280,
      viewportH: 720,
      devicePixelRatio: 1,
    },
  ],
};

function request(method: string, body?: unknown, query = ""): Request {
  return new Request(`${ENDPOINT}${query}`, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const dialects: Array<{
  name: string;
  open(): Promise<{ createStore(): DrizzleStore; reset(): Promise<void>; close(): Promise<void> }>;
}> = [
  {
    name: "PostgreSQL (PGlite)",
    async open() {
      const database = await createPgTestDatabase();
      return { ...database, createStore: () => createPgSitepingStore(database.db) };
    },
  },
  {
    name: "libSQL (Turso)",
    async open() {
      const database = await createLibSQLTestDatabase();
      return { ...database, createStore: () => createLibSQLSitepingStore(database.db) };
    },
  },
];

for (const dialect of dialects) {
  describe(`createSitepingHandler over the Drizzle store — ${dialect.name}`, () => {
    let database: Awaited<ReturnType<(typeof dialects)[number]["open"]>>;
    let fetchSpy: ReturnType<typeof vi.fn>;
    const realFetch = globalThis.fetch;

    beforeAll(async () => {
      database = await dialect.open();
    });
    afterAll(() => database.close());
    beforeEach(async () => {
      await database.reset();
      fetchSpy = vi.fn().mockResolvedValue(new Response("", { status: 200 }));
      globalThis.fetch = fetchSpy as unknown as typeof fetch;
    });
    afterEach(() => {
      globalThis.fetch = realFetch;
    });

    function handler(): SitepingHandler {
      return createSitepingHandler({
        store: database.createStore(),
        requireAuthForDestructive: false,
        webhooks: WEBHOOK,
      });
    }

    it("serves a submission, the list, a status change and a delete", async () => {
      const api = handler();

      const created = await api.POST(request("POST", { ...payload, clientId: crypto.randomUUID() }));
      expect(created.status).toBe(201);
      const { id } = (await created.json()) as { id: string };

      const listed = await api.GET(request("GET", undefined, "?projectName=site"));
      const page = (await listed.json()) as { total: number; feedbacks: Array<Record<string, unknown>> };
      expect(page.total).toBe(1);
      expect(page.feedbacks[0]).toMatchObject({ id, status: "open", annotations: [{ cssSelector: "button.pay" }] });
      expect(page.feedbacks[0]).not.toHaveProperty("clientId");

      const resolved = await api.PATCH(request("PATCH", { id, projectName: "site", status: "resolved" }));
      expect(resolved.status).toBe(200);
      expect(await resolved.json()).toMatchObject({ id, status: "resolved", resolvedAt: expect.any(String) });

      // verifyProjectOwnership: another project can't reach this id.
      const foreign = await api.DELETE(request("DELETE", { id, projectName: "other-site" }));
      expect(foreign.status).toBe(404);

      expect((await api.DELETE(request("DELETE", { id, projectName: "site" }))).status).toBe(200);
      const emptied = await api.GET(request("GET", undefined, "?projectName=site"));
      expect(((await emptied.json()) as { total: number }).total).toBe(0);
    });

    it("serves a thread: a comment, its list with the capability, and its delete", async () => {
      const api = handler();
      const created = await api.POST(request("POST", { ...payload, clientId: crypto.randomUUID() }));
      const { id: feedbackId } = (await created.json()) as { id: string };

      const posted = await api.POST(
        request("POST", {
          projectName: "site",
          feedbackId,
          body: "Fixed on staging",
          authorName: "Bob",
          authorEmail: "bob@example.com",
          clientId: crypto.randomUUID(),
        }),
      );
      expect(posted.status).toBe(201);
      const { id: commentId } = (await posted.json()) as { id: string };

      const listed = (await (await api.GET(request("GET", undefined, "?projectName=site"))).json()) as {
        capabilities: unknown;
        feedbacks: Array<{ comments: unknown[] }>;
      };
      expect(listed.capabilities).toEqual({ comments: true, deleteComments: true });
      expect(listed.feedbacks[0]?.comments).toEqual([
        expect.objectContaining({ id: commentId, body: "Fixed on staging", authorRole: "client", authorEmail: "" }),
      ]);

      const deleted = await api.DELETE(request("DELETE", { projectName: "site", feedbackId, commentId }));
      expect(await deleted.json()).toEqual({ deleted: true });
    });

    it("serves a submission whose console line was cut inside an emoji, and a search for NUL", async () => {
      const api = handler();
      // The widget cuts a long console line after 499 code units, here between an emoji's two halves.
      const consoleLine = `${"x".repeat(498)}\u{1F680} deployed`.slice(0, 499);
      const diagnostics = {
        console: [{ level: "warn", timestamp: "2026-01-01T00:00:00.000Z", message: `${consoleLine}…` }],
        network: [],
      };

      const created = await api.POST(
        request("POST", { ...payload, message: "Total a\u0000b", diagnostics, clientId: crypto.randomUUID() }),
      );
      const searched = await api.GET(request("GET", undefined, "?projectName=site&search=%00"));

      expect(created.status).toBe(201);
      expect(searched.status).toBe(200);
      expect(((await searched.json()) as { total: number }).total).toBe(1);
    });

    it("notifies the webhooks once when two server processes race on one clientId", async () => {
      // One handler and one store instance each, sharing only the database —
      // as two serverless instances would: only the unique client_id index
      // can tell which request inserted the feedback.
      const submission = { ...payload, clientId: crypto.randomUUID() };

      const responses = await Promise.all([handler(), handler()].map((api) => api.POST(request("POST", submission))));

      expect(responses.map((response) => response.status)).toEqual([201, 201]);
      const [first, second] = (await Promise.all(responses.map((response) => response.json()))) as Array<{
        id: string;
      }>;
      expect(second?.id).toBe(first?.id);
      await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled());
      // Give a stray second dispatch every chance to surface before asserting.
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(fetchSpy).toHaveBeenCalledOnce();
    });
  });
}

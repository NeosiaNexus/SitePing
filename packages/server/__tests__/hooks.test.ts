import { MemoryStore } from "@siteping/adapter-memory";
import { createCollectionStore, type FeedbackRecord } from "@siteping/core";
import { describe, expect, it, vi } from "vitest";
import {
  createSitepingHandler,
  type SitepingAccessControl,
  type SitepingDeletionTarget,
  type SitepingHandler,
  type SitepingLogger,
} from "../src/index.js";
import { validPayloadNoAnnotations } from "./fixtures.js";

const ENDPOINT = "http://localhost/api/siteping";
const PROJECT = validPayloadNoAnnotations.projectName;

interface Reviewer {
  email: string;
}

const REVIEWER: Reviewer = { email: "reviewer@example.com" };

/** Session stand-in: every request carrying `x-session` belongs to the reviewer. */
const sessionAccess: SitepingAccessControl<Reviewer> = {
  authenticate: (request) => (request.headers.get("x-session") ? REVIEWER : null),
};

function jsonRequest(method: string, body: unknown): Request {
  return new Request(ENDPOINT, {
    method,
    headers: { "Content-Type": "application/json", "x-session": REVIEWER.email },
    body: JSON.stringify(body),
  });
}

const listRequest = () => new Request(`${ENDPOINT}?projectName=${PROJECT}`, { headers: { "x-session": "1" } });

const silentLogger = () => ({ error: vi.fn<SitepingLogger["error"]>() });

async function createFeedback(handler: SitepingHandler, body: unknown = validPayloadNoAnnotations) {
  const response = await handler.POST(jsonRequest("POST", body));
  expect(response.status).toBe(201);
  return (await response.json()) as FeedbackRecord;
}

describe("createSitepingHandler — beforeCreate and presentFeedback", () => {
  it("stores the input rewritten by beforeCreate and authorizes its effective project", async () => {
    const authorizedProjects: string[] = [];
    const store = new MemoryStore();
    const handler = createSitepingHandler({
      store,
      access: {
        ...sessionAccess,
        authorize: ({ projectName }) => {
          authorizedProjects.push(projectName);
          return true;
        },
      },
      beforeCreate: (input, { principal }) => ({
        ...input,
        projectName: "server-project",
        authorEmail: principal.email,
        message: input.message.replace(/token=\S+/g, "token=[redacted]"),
      }),
    });

    await createFeedback(handler, { ...validPayloadNoAnnotations, message: "Broken, token=abc123" });

    const [stored] = (await store.getFeedbacks({ projectName: "server-project" })).feedbacks;
    expect(stored).toMatchObject({ authorEmail: REVIEWER.email, message: "Broken, token=[redacted]" });
    expect(authorizedProjects).toEqual(["server-project"]);
  });

  it("answers a logged 500 and stores nothing when beforeCreate throws", async () => {
    const store = new MemoryStore();
    const logger = silentLogger();
    const failure = new Error("directory lookup failed");
    const handler = createSitepingHandler({
      store,
      access: sessionAccess,
      logger,
      beforeCreate: () => Promise.reject(failure),
    });

    const response = await handler.POST(jsonRequest("POST", validPayloadNoAnnotations));

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalledWith(
      "[siteping] Failed to create feedback",
      expect.objectContaining({ error: failure }),
    );
    expect((await store.getFeedbacks({ projectName: PROJECT })).total).toBe(0);
  });

  it("applies presentFeedback to every serialized record, then strips clientId", async () => {
    const handler = createSitepingHandler({
      store: new MemoryStore(),
      access: sessionAccess,
      presentFeedback: (feedback) => ({ ...feedback, message: feedback.message.toUpperCase() }),
    });
    const created = await createFeedback(handler);

    const page = (await (await handler.GET(listRequest())).json()) as { feedbacks: FeedbackRecord[] };
    const updated = (await (
      await handler.PATCH(jsonRequest("PATCH", { id: created.id, projectName: PROJECT, status: "resolved" }))
    ).json()) as FeedbackRecord;

    const upper = validPayloadNoAnnotations.message.toUpperCase();
    expect([created.message, page.feedbacks[0]?.message, updated.message]).toEqual([upper, upper, upper]);
    expect(created).not.toHaveProperty("clientId");
    expect(page.feedbacks[0]).not.toHaveProperty("clientId");
  });
});

describe("createSitepingHandler — lifecycle hooks", () => {
  it("runs onCreated once per new feedback with the principal, never on a replayed clientId", async () => {
    const onCreated = vi.fn();
    const handler = createSitepingHandler({ store: new MemoryStore(), access: sessionAccess, hooks: { onCreated } });

    const feedback = await createFeedback(handler);
    await createFeedback(handler);

    expect(onCreated).toHaveBeenCalledOnce();
    expect(onCreated.mock.calls[0]?.[0]).toMatchObject({ id: feedback.id, projectName: PROJECT });
    expect(onCreated.mock.calls[0]?.[1]).toMatchObject({ principal: REVIEWER });
  });

  it("runs onCreated once when two POSTs with the same clientId overlap", async () => {
    // A store that does not report its inserts: only the handler's in-flight
    // coalescing tells the second request apart from a fresh insert.
    let feedbacks: FeedbackRecord[] = [];
    let seq = 0;
    const tick = () => new Promise((resolve) => setTimeout(resolve, 1));
    const { createFeedbackIfAbsent: _reportsInserts, ...store } = createCollectionStore({
      load: async () => {
        await tick();
        return feedbacks;
      },
      persist: async (next) => {
        await tick();
        feedbacks = next;
      },
      generateId: () => `id-${++seq}`,
    });
    const onCreated = vi.fn();
    const handler = createSitepingHandler({ store, access: sessionAccess, hooks: { onCreated } });

    const [first, second] = await Promise.all([createFeedback(handler), createFeedback(handler)]);

    expect(second.id).toBe(first.id);
    expect(onCreated).toHaveBeenCalledOnce();
  });

  it("runs under the apiKey policy too, with a null principal", async () => {
    const onCreated = vi.fn();
    const handler = createSitepingHandler({ store: new MemoryStore(), apiKey: "secret-key", hooks: { onCreated } });

    await createFeedback(handler);

    expect(onCreated.mock.calls[0]?.[1]).toMatchObject({ principal: null });
  });

  it("keeps `this` for hooks implemented as class methods", async () => {
    class IssueTrackerHooks {
      readonly events: string[] = [];
      onCreated(feedback: FeedbackRecord): void {
        this.events.push(`created ${feedback.id}`);
      }
      onUpdated(feedback: FeedbackRecord): void {
        this.events.push(`updated ${feedback.id}`);
      }
      onDeleting(target: SitepingDeletionTarget): void {
        this.events.push(`deleting ${target.kind}`);
      }
      onDeleted(target: SitepingDeletionTarget): void {
        this.events.push(`deleted ${target.kind}`);
      }
    }
    const tracker = new IssueTrackerHooks();
    const handler = createSitepingHandler({ store: new MemoryStore(), access: sessionAccess, hooks: tracker });

    const feedback = await createFeedback(handler);
    await handler.PATCH(jsonRequest("PATCH", { id: feedback.id, projectName: PROJECT, status: "resolved" }));
    const deleted = await handler.DELETE(jsonRequest("DELETE", { id: feedback.id, projectName: PROJECT }));

    expect(deleted.status).toBe(200);
    expect(tracker.events).toEqual([
      `created ${feedback.id}`,
      `updated ${feedback.id}`,
      "deleting single",
      "deleted single",
    ]);
  });

  it("logs a failing onCreated hook without failing the request", async () => {
    const logger = silentLogger();
    const hookError = new Error("issue tracker down");
    const handler = createSitepingHandler({
      store: new MemoryStore(),
      access: sessionAccess,
      logger,
      hooks: { onCreated: () => Promise.reject(hookError) },
    });

    await createFeedback(handler);

    expect(logger.error).toHaveBeenCalledWith("[siteping] Hook onCreated failed", { error: hookError });
  });

  it("runs onUpdated with the stored record", async () => {
    const onUpdated = vi.fn();
    const handler = createSitepingHandler({ store: new MemoryStore(), access: sessionAccess, hooks: { onUpdated } });
    const feedback = await createFeedback(handler);

    await handler.PATCH(jsonRequest("PATCH", { id: feedback.id, projectName: PROJECT, status: "wont_fix" }));

    expect(onUpdated).toHaveBeenCalledOnce();
    expect(onUpdated.mock.calls[0]?.[0]).toMatchObject({ id: feedback.id, status: "wont_fix" });
  });

  it("logs a failing onUpdated hook without failing the request", async () => {
    const logger = silentLogger();
    const hookError = new Error("search index down");
    const handler = createSitepingHandler({
      store: new MemoryStore(),
      access: sessionAccess,
      logger,
      hooks: { onUpdated: () => Promise.reject(hookError) },
    });
    const feedback = await createFeedback(handler);

    const response = await handler.PATCH(
      jsonRequest("PATCH", { id: feedback.id, projectName: PROJECT, status: "resolved" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: feedback.id, status: "resolved" });
    expect(logger.error).toHaveBeenCalledWith("[siteping] Hook onUpdated failed", { error: hookError });
  });

  it("logs a failing onDeleted hook without failing the request", async () => {
    const store = new MemoryStore();
    const logger = silentLogger();
    const hookError = new Error("audit log down");
    const handler = createSitepingHandler({
      store,
      access: sessionAccess,
      logger,
      hooks: {
        onDeleted: () => {
          throw hookError;
        },
      },
    });
    const feedback = await createFeedback(handler);

    const response = await handler.DELETE(jsonRequest("DELETE", { id: feedback.id, projectName: PROJECT }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: true });
    expect(logger.error).toHaveBeenCalledWith("[siteping] Hook onDeleted failed", { error: hookError });
    expect((await store.getFeedbacks({ projectName: PROJECT })).total).toBe(0);
  });

  it("keeps the record and answers 502 when onDeleting throws", async () => {
    const store = new MemoryStore();
    const onDeleted = vi.fn();
    const logger = silentLogger();
    const handler = createSitepingHandler({
      store,
      access: sessionAccess,
      logger,
      hooks: {
        onDeleting: () => {
          throw new Error("could not close linked issue");
        },
        onDeleted,
      },
    });
    const feedback = await createFeedback(handler);

    const response = await handler.DELETE(jsonRequest("DELETE", { id: feedback.id, projectName: PROJECT }));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Deletion aborted: a linked resource could not be cleaned up" });
    expect(onDeleted).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith("[siteping] Hook onDeleting aborted the deletion", expect.anything());
    expect((await store.getFeedbacks({ projectName: PROJECT })).total).toBe(1);
  });

  it("runs no deletion hook for a DELETE refused by authorize or aimed at another project's record", async () => {
    const store = new MemoryStore();
    const onDeleting = vi.fn();
    const onDeleted = vi.fn();
    const handler = createSitepingHandler({
      store,
      // Anyone may report; only PROJECT's feedback may be deleted.
      access: {
        ...sessionAccess,
        authorize: ({ action, projectName }) => action === "create" || projectName === PROJECT,
      },
      hooks: { onDeleting, onDeleted },
    });
    const other = await createFeedback(handler, { ...validPayloadNoAnnotations, projectName: "other-project" });

    const refused = await handler.DELETE(jsonRequest("DELETE", { id: other.id, projectName: "other-project" }));
    const refusedAll = await handler.DELETE(jsonRequest("DELETE", { projectName: "other-project", deleteAll: true }));
    const crossProject = await handler.DELETE(jsonRequest("DELETE", { id: other.id, projectName: PROJECT }));

    expect([refused.status, refusedAll.status, crossProject.status]).toEqual([403, 403, 404]);
    expect(onDeleting).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
    expect((await store.getFeedbacks({ projectName: "other-project" })).total).toBe(1);
  });

  it("passes single and whole-project deletion targets to onDeleting and onDeleted", async () => {
    const onDeleting = vi.fn();
    const onDeleted = vi.fn();
    const handler = createSitepingHandler({
      store: new MemoryStore(),
      access: sessionAccess,
      hooks: { onDeleting, onDeleted },
    });
    const feedback = await createFeedback(handler);

    await handler.DELETE(jsonRequest("DELETE", { id: feedback.id, projectName: PROJECT }));
    await handler.DELETE(jsonRequest("DELETE", { projectName: PROJECT, deleteAll: true }));

    const targets = [
      { kind: "single", id: feedback.id, projectName: PROJECT },
      { kind: "project", projectName: PROJECT },
    ];
    expect(onDeleting.mock.calls.map(([target]) => target)).toEqual(targets);
    expect(onDeleted.mock.calls.map(([target]) => target)).toEqual(targets);
  });

  it("runs no hook for a mutation the CSRF guards refuse", async () => {
    const onCreated = vi.fn();
    const handler = createSitepingHandler({
      store: new MemoryStore(),
      access: sessionAccess,
      allowedOrigins: ["https://client-site.example"],
      logger: silentLogger(),
      hooks: { onCreated },
    });

    const response = await handler.POST(
      new Request(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session": "1", Origin: "https://attacker.example" },
        body: JSON.stringify(validPayloadNoAnnotations),
      }),
    );

    expect(response.status).toBe(403);
    expect(onCreated).not.toHaveBeenCalled();
  });
});

import { MemoryStore } from "@siteping/adapter-memory";
import type { FeedbackRecord, SitepingStore } from "@siteping/core";
import { describe, expect, it, vi } from "vitest";
import {
  createSitepingHandler,
  type SitepingAccessControl,
  type SitepingAuthorizationContext,
  type SitepingHandler,
  type SitepingLogger,
} from "../src/index.js";
import { validPayloadNoAnnotations } from "./fixtures.js";

const ENDPOINT = "http://localhost/api/siteping";
const PROJECT = validPayloadNoAnnotations.projectName;

interface Reviewer {
  email: string;
  isAdmin: boolean;
}

const ADMIN: Reviewer = { email: "admin@example.com", isAdmin: true };
const GUEST: Reviewer = { email: "guest@example.com", isAdmin: false };

/** Session stand-in: the caller identifies through a header, as a cookie session would. */
function sessionAccess(overrides: Partial<SitepingAccessControl<Reviewer>> = {}): SitepingAccessControl<Reviewer> {
  return {
    authenticate: (request) => {
      const email = request.headers.get("x-session");
      if (email === ADMIN.email) return ADMIN;
      if (email === GUEST.email) return GUEST;
      return null;
    },
    ...overrides,
  };
}

function jsonRequest(method: string, body: unknown, session?: Reviewer): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (session) headers["x-session"] = session.email;
  return new Request(ENDPOINT, { method, headers, body: JSON.stringify(body) });
}

function listRequest(session?: Reviewer, projectName = PROJECT): Request {
  return new Request(`${ENDPOINT}?projectName=${projectName}`, {
    headers: session ? { "x-session": session.email } : {},
  });
}

const silentLogger = () => ({ error: vi.fn<SitepingLogger["error"]>() });

async function createFeedback(handler: SitepingHandler, session: Reviewer = ADMIN): Promise<FeedbackRecord> {
  const response = await handler.POST(jsonRequest("POST", validPayloadNoAnnotations, session));
  expect(response.status).toBe(201);
  return (await response.json()) as FeedbackRecord;
}

describe("createSitepingHandler — access", () => {
  it("answers 401 on every method when authenticate resolves no principal", async () => {
    const handler = createSitepingHandler({ store: new MemoryStore(), access: sessionAccess() });

    expect((await handler.POST(jsonRequest("POST", validPayloadNoAnnotations))).status).toBe(401);
    expect((await handler.GET(listRequest())).status).toBe(401);
    expect(
      (await handler.PATCH(jsonRequest("PATCH", { id: "x", projectName: PROJECT, status: "resolved" }))).status,
    ).toBe(401);
    expect((await handler.DELETE(jsonRequest("DELETE", { id: "x", projectName: PROJECT }))).status).toBe(401);
  });

  it("fails closed when authenticate resolves undefined", async () => {
    const store = new MemoryStore();
    const handler = createSitepingHandler({ store, access: { authenticate: () => undefined } });

    const response = await handler.POST(jsonRequest("POST", validPayloadNoAnnotations));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect((await store.getFeedbacks({ projectName: PROJECT })).total).toBe(0);
  });

  it("fails closed on every method when a JavaScript boolean check resolves false", async () => {
    const store = new MemoryStore();
    // TypeScript refuses a boolean principal (options.test-d.ts); plain JavaScript can still pass one.
    const tokenCheck = { authenticate: (request: Request) => request.headers.get("x-token") === "secret" };
    const handler = createSitepingHandler({ store, access: tokenCheck as unknown as SitepingAccessControl<string> });
    const withToken = (request: Request, token: string) => {
      const headers = new Headers(request.headers);
      headers.set("x-token", token);
      return new Request(request, { headers });
    };
    const created = await handler.POST(withToken(jsonRequest("POST", validPayloadNoAnnotations), "secret"));
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as FeedbackRecord;

    const refused = [
      await handler.GET(withToken(listRequest(), "wrong")),
      await handler.POST(
        withToken(jsonRequest("POST", { ...validPayloadNoAnnotations, clientId: "uuid-456" }), "wrong"),
      ),
      await handler.PATCH(withToken(jsonRequest("PATCH", { id, projectName: PROJECT, status: "resolved" }), "wrong")),
      await handler.DELETE(withToken(jsonRequest("DELETE", { projectName: PROJECT, deleteAll: true }), "wrong")),
    ];

    expect(refused.map(({ status }) => status)).toEqual([401, 401, 401, 401]);
    expect((await store.getFeedbacks({ projectName: PROJECT })).feedbacks).toEqual([
      expect.objectContaining({ id, status: "open" }),
    ]);
  });

  it.each([0, ""])("fails closed when authenticate resolves %j", async (principal) => {
    const handler = createSitepingHandler({ store: new MemoryStore(), access: { authenticate: () => principal } });

    expect((await handler.GET(listRequest())).status).toBe(401);
  });

  it("passes action, project and target id to authorize and answers 403 when it refuses", async () => {
    const decisions: Array<SitepingAuthorizationContext<Reviewer>> = [];
    const handler = createSitepingHandler({
      store: new MemoryStore(),
      access: sessionAccess({
        authorize: (context) => {
          // Dry runs fill in permissions — see "reports what the policy would allow".
          if (!context.dryRun) decisions.push(context);
          return context.action === "create" || context.principal.isAdmin;
        },
      }),
    });

    const feedback = await createFeedback(handler, GUEST);
    const guestList = await handler.GET(listRequest(GUEST));
    const guestUpdate = await handler.PATCH(
      jsonRequest("PATCH", { id: feedback.id, projectName: PROJECT, status: "resolved" }, GUEST),
    );
    const adminUpdate = await handler.PATCH(
      jsonRequest("PATCH", { id: feedback.id, projectName: PROJECT, status: "resolved" }, ADMIN),
    );
    const guestDelete = await handler.DELETE(jsonRequest("DELETE", { projectName: PROJECT, deleteAll: true }, GUEST));
    const adminDelete = await handler.DELETE(jsonRequest("DELETE", { id: feedback.id, projectName: PROJECT }, ADMIN));

    expect(guestList.status).toBe(403);
    expect(await guestList.json()).toEqual({ error: "Forbidden" });
    expect(guestUpdate.status).toBe(403);
    expect(adminUpdate.status).toBe(200);
    expect(guestDelete.status).toBe(403);
    expect(adminDelete.status).toBe(200);
    expect(
      decisions.map(({ action, projectName, feedbackId, principal }) => ({
        action,
        projectName,
        feedbackId,
        principal,
      })),
    ).toEqual([
      { action: "create", projectName: PROJECT, feedbackId: undefined, principal: GUEST },
      { action: "list", projectName: PROJECT, feedbackId: undefined, principal: GUEST },
      { action: "update", projectName: PROJECT, feedbackId: feedback.id, principal: GUEST },
      { action: "update", projectName: PROJECT, feedbackId: feedback.id, principal: ADMIN },
      { action: "deleteAll", projectName: PROJECT, feedbackId: undefined, principal: GUEST },
      { action: "delete", projectName: PROJECT, feedbackId: feedback.id, principal: ADMIN },
    ]);
  });

  it("blanks authorEmail in list and PATCH responses for principals that may not read it", async () => {
    const handler = createSitepingHandler({
      store: new MemoryStore(),
      access: sessionAccess({ canReadAuthorEmail: (principal) => principal.isAdmin }),
    });
    const { id } = await createFeedback(handler);
    const patch = (session: Reviewer) =>
      handler.PATCH(jsonRequest("PATCH", { id, projectName: PROJECT, status: "in_progress" }, session));
    const list = async (session: Reviewer) =>
      ((await (await handler.GET(listRequest(session))).json()) as { feedbacks: FeedbackRecord[] }).feedbacks;

    expect((await list(GUEST))[0]?.authorEmail).toBe("");
    expect((await list(ADMIN))[0]?.authorEmail).toBe(validPayloadNoAnnotations.authorEmail);
    expect(((await (await patch(GUEST)).json()) as FeedbackRecord).authorEmail).toBe("");
    expect(((await (await patch(ADMIN)).json()) as FeedbackRecord).authorEmail).toBe(
      validPayloadNoAnnotations.authorEmail,
    );
    expect((await list(ADMIN))[0]).not.toHaveProperty("clientId");
  });

  it("lets every authenticated principal read authorEmail when canReadAuthorEmail is not set", async () => {
    const handler = createSitepingHandler({ store: new MemoryStore(), access: sessionAccess() });

    const created = await createFeedback(handler, GUEST);
    const listed = ((await (await handler.GET(listRequest(GUEST))).json()) as { feedbacks: FeedbackRecord[] })
      .feedbacks[0];
    const updated = (await (
      await handler.PATCH(jsonRequest("PATCH", { id: created.id, projectName: PROJECT, status: "resolved" }, GUEST))
    ).json()) as FeedbackRecord;

    const { authorEmail } = validPayloadNoAnnotations;
    expect([created.authorEmail, listed?.authorEmail, updated.authorEmail]).toEqual([
      authorEmail,
      authorEmail,
      authorEmail,
    ]);
  });

  it("applies the email permission to fresh and replayed POST responses", async () => {
    const store = new MemoryStore();
    const handler = createSitepingHandler({
      store,
      access: sessionAccess({ canReadAuthorEmail: async (principal) => principal.isAdmin }),
    });

    const fresh = await createFeedback(handler, GUEST);
    const replayedAsGuest = await createFeedback(handler, GUEST);
    const replayedAsAdmin = await createFeedback(handler, ADMIN);

    expect(fresh.authorEmail).toBe("");
    expect(replayedAsGuest).toMatchObject({ id: fresh.id, authorEmail: "" });
    expect(replayedAsAdmin).toMatchObject({ id: fresh.id, authorEmail: validPayloadNoAnnotations.authorEmail });
    expect((await store.findByClientId(validPayloadNoAnnotations.clientId))?.authorEmail).toBe(
      validPayloadNoAnnotations.authorEmail,
    );
  });

  it("keeps echoing authorEmail to the anonymous submitter under the apiKey policy", async () => {
    const handler = createSitepingHandler({ store: new MemoryStore(), apiKey: "secret-key" });

    const fresh = await handler.POST(jsonRequest("POST", validPayloadNoAnnotations));
    const replayed = await handler.POST(jsonRequest("POST", validPayloadNoAnnotations));

    expect(((await fresh.json()) as FeedbackRecord).authorEmail).toBe(validPayloadNoAnnotations.authorEmail);
    expect(((await replayed.json()) as FeedbackRecord).authorEmail).toBe(validPayloadNoAnnotations.authorEmail);
  });

  it("never lets the browser cache a list that depends on the principal", async () => {
    const handler = createSitepingHandler({ store: new MemoryStore(), access: sessionAccess() });

    const response = await handler.GET(listRequest(ADMIN));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("keeps the apiKey policy's short private cache on lists", async () => {
    const handler = createSitepingHandler({ store: new MemoryStore(), requireAuthForDestructive: false });

    expect((await handler.GET(listRequest())).headers.get("Cache-Control")).toBe("private, max-age=5");
  });

  it("does not require an apiKey in production when a custom access policy is passed", () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      expect(() => createSitepingHandler({ store: new MemoryStore(), access: sessionAccess() })).not.toThrow();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

/**
 * A conformant store that leaves out the optional `verifyProjectOwnership`,
 * as a minimal third-party adapter may — every required method delegates to
 * a real `MemoryStore`.
 */
function storeWithoutOwnershipCheck(backing = new MemoryStore()): SitepingStore {
  return {
    createFeedback: (data) => backing.createFeedback(data),
    getFeedbacks: (query) => backing.getFeedbacks(query),
    findByClientId: (clientId) => backing.findByClientId(clientId),
    updateFeedback: (id, data) => backing.updateFeedback(id, data),
    deleteFeedback: (id) => backing.deleteFeedback(id),
    deleteAllFeedbacks: (projectName) => backing.deleteAllFeedbacks(projectName),
  };
}

/** Policy scoping each principal to one project: the admin to `test-project`, the guest to `guest-project`. */
const projectScopedAccess = () =>
  sessionAccess({
    authorize: ({ principal, projectName }) => projectName === (principal.isAdmin ? PROJECT : "guest-project"),
  });

describe("createSitepingHandler — project ownership of per-record mutations", () => {
  it("refuses to start with a custom authorize over a store without verifyProjectOwnership", () => {
    expect(() => createSitepingHandler({ store: storeWithoutOwnershipCheck(), access: projectScopedAccess() })).toThrow(
      /needs a store implementing `verifyProjectOwnership`/,
    );
  });

  it("still starts over such a store when no policy scopes callers to projects", () => {
    expect(() => createSitepingHandler({ store: storeWithoutOwnershipCheck(), access: sessionAccess() })).not.toThrow();
    expect(() => createSitepingHandler({ store: storeWithoutOwnershipCheck(), apiKey: "secret-key" })).not.toThrow();
  });

  it("answers 404 and leaves the record untouched when the claimed project is not the record's", async () => {
    const store = new MemoryStore();
    const handler = createSitepingHandler({ store, access: projectScopedAccess() });
    const created = await handler.POST(
      jsonRequest("POST", { ...validPayloadNoAnnotations, projectName: "guest-project" }, GUEST),
    );
    expect(created.status).toBe(201);
    const guestFeedback = (await created.json()) as FeedbackRecord;

    const crossUpdate = await handler.PATCH(
      jsonRequest("PATCH", { id: guestFeedback.id, projectName: PROJECT, status: "resolved" }, ADMIN),
    );
    const crossDelete = await handler.DELETE(
      jsonRequest("DELETE", { id: guestFeedback.id, projectName: PROJECT }, ADMIN),
    );

    expect(crossUpdate.status).toBe(404);
    expect(crossDelete.status).toBe(404);
    const [stored] = (await store.getFeedbacks({ projectName: "guest-project" })).feedbacks;
    expect(stored).toMatchObject({ id: guestFeedback.id, status: "open" });
  });
});

describe("createSitepingHandler — access callback failures", () => {
  const ALLOWED_ORIGIN = "https://client-site.example";
  const sessionStoreError = new Error("session database unreachable: connection refused at 10.0.0.5:5432");

  const withOrigin = (request: Request) => {
    const headers = new Headers(request.headers);
    headers.set("Origin", ALLOWED_ORIGIN);
    return new Request(request, { headers });
  };

  it("answers a logged, CORS-readable 500 on every method when authenticate throws", async () => {
    const logger = silentLogger();
    const handler = createSitepingHandler({
      store: new MemoryStore(),
      access: sessionAccess({ authenticate: () => Promise.reject(sessionStoreError) }),
      allowedOrigins: [ALLOWED_ORIGIN],
      logger,
    });
    const requests = {
      GET: listRequest(),
      POST: jsonRequest("POST", validPayloadNoAnnotations),
      PATCH: jsonRequest("PATCH", { id: "x", projectName: PROJECT, status: "resolved" }),
      DELETE: jsonRequest("DELETE", { id: "x", projectName: PROJECT }),
    } as const;

    for (const method of ["GET", "POST", "PATCH", "DELETE"] as const) {
      const response = await handler[method](withOrigin(requests[method]));

      expect(response.status).toBe(500);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED_ORIGIN);
      expect(await response.json()).toEqual({ error: "Internal server error" });
      expect(logger.error).toHaveBeenLastCalledWith("[siteping] Failed to authenticate request", {
        error: sessionStoreError,
        method,
        path: "/api/siteping",
      });
    }
  });

  it("answers the 500 without the email when canReadAuthorEmail throws", async () => {
    const handler = createSitepingHandler({
      store: new MemoryStore(),
      access: sessionAccess({
        canReadAuthorEmail: () => {
          throw sessionStoreError;
        },
      }),
      allowedOrigins: [ALLOWED_ORIGIN],
      logger: silentLogger(),
    });

    const response = await handler.POST(withOrigin(jsonRequest("POST", validPayloadNoAnnotations, ADMIN)));

    expect(response.status).toBe(500);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED_ORIGIN);
    expect(await response.text()).not.toContain(validPayloadNoAnnotations.authorEmail);
  });

  it("answers a logged 500 and stores nothing when authorize throws on a create", async () => {
    const store = new MemoryStore();
    const logger = silentLogger();
    const handler = createSitepingHandler({
      store,
      access: sessionAccess({ authorize: () => Promise.reject(sessionStoreError) }),
      logger,
    });

    const response = await handler.POST(jsonRequest("POST", validPayloadNoAnnotations, ADMIN));

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalledWith("[siteping] Failed to create feedback", expect.anything());
    expect((await store.getFeedbacks({ projectName: PROJECT })).total).toBe(0);
  });
});

/**
 * Store errors as thrown by an adapter that bundles its own copy of
 * `@siteping/core` (every published package does): same stable `code`,
 * a class identity the server's `instanceof` checks do not know.
 */
class BundledStoreNotFoundError extends Error {
  readonly code = "STORE_NOT_FOUND" as const;
}
class BundledStoreDuplicateError extends Error {
  readonly code = "STORE_DUPLICATE" as const;
}

describe("createSitepingHandler — store errors from another bundled copy of core", () => {
  it("answers 404 when the record vanishes between the ownership check and the mutation", async () => {
    class RacingStore extends MemoryStore {
      override updateFeedback(): Promise<FeedbackRecord> {
        return Promise.reject(new BundledStoreNotFoundError("Record not found"));
      }
      override deleteFeedback(): Promise<void> {
        return Promise.reject(new BundledStoreNotFoundError("Record not found"));
      }
    }
    const handler = createSitepingHandler({ store: new RacingStore(), access: sessionAccess() });
    const feedback = await createFeedback(handler);

    const update = await handler.PATCH(
      jsonRequest("PATCH", { id: feedback.id, projectName: PROJECT, status: "resolved" }, ADMIN),
    );
    const removal = await handler.DELETE(jsonRequest("DELETE", { id: feedback.id, projectName: PROJECT }, ADMIN));

    expect(update.status).toBe(404);
    expect(removal.status).toBe(404);
  });

  it("resolves a duplicate-clientId race to the winning record instead of a 500", async () => {
    class RacingStore extends MemoryStore {
      /** The concurrent request inserts right after this request's replay lookup missed. */
      private lookupsBeforeRace = 1;
      override findByClientId(clientId: string): Promise<FeedbackRecord | null> {
        if (this.lookupsBeforeRace-- > 0) return Promise.resolve(null);
        return super.findByClientId(clientId);
      }
      override async createFeedback(data: Parameters<MemoryStore["createFeedback"]>[0]): Promise<FeedbackRecord> {
        if (await super.findByClientId(data.clientId)) throw new BundledStoreDuplicateError("Duplicate record");
        return super.createFeedback(data);
      }
    }
    const store = new RacingStore();
    const winner = await store.createFeedback({
      ...validPayloadNoAnnotations,
      status: "open",
      urlPattern: null,
      annotations: [],
      screenshotDataUrl: null,
      screenshotRegion: null,
      diagnostics: null,
    });
    // Without `createFeedbackIfAbsent`, only the duplicate error reports the race.
    const handler = createSitepingHandler({ store: storeWithoutOwnershipCheck(store), access: sessionAccess() });

    const response = await handler.POST(jsonRequest("POST", validPayloadNoAnnotations, ADMIN));

    expect(response.status).toBe(201);
    expect(((await response.json()) as FeedbackRecord).id).toBe(winner.id);
  });
});

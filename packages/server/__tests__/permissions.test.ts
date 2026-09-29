import { MemoryStore } from "@siteping/adapter-memory";
import type { FeedbackPermissions, FeedbackResponse, FeedbackResponseList } from "@siteping/core";
import { describe, expect, it, vi } from "vitest";
import {
  createSitepingHandler,
  type SitepingAccessControl,
  type SitepingAuthorizationContext,
  type SitepingHandler,
  type SitepingHttpMethod,
  type SitepingLogger,
} from "../src/index.js";
import { validPayloadNoAnnotations } from "./fixtures.js";

const ENDPOINT = "http://localhost/api/siteping";
const API_KEY = "a-secret-key";
const PROJECT = validPayloadNoAnnotations.projectName;
const BEARER = { Authorization: `Bearer ${API_KEY}` };

const ALL: FeedbackPermissions = { canChangeStatus: true, canDelete: true, canComment: true, canDeleteComment: true };
/** What an anonymous visitor may do under the default `apiKey` policy: read, submit and reply. */
const VISITOR: FeedbackPermissions = {
  canChangeStatus: false,
  canDelete: false,
  canComment: true,
  canDeleteComment: false,
};

function request(method: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(ENDPOINT, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

let clientIds = 0;

async function create(handler: SitepingHandler, headers: Record<string, string> = {}): Promise<FeedbackResponse> {
  clientIds += 1;
  const response = await handler.POST(
    request("POST", { ...validPayloadNoAnnotations, clientId: `perm-${clientIds}` }, headers),
  );
  expect(response.status).toBe(201);
  return (await response.json()) as FeedbackResponse;
}

async function list(handler: SitepingHandler, headers: Record<string, string> = {}): Promise<FeedbackResponseList> {
  const response = await handler.GET(new Request(`${ENDPOINT}?projectName=${PROJECT}`, { headers }));
  expect(response.status).toBe(200);
  return (await response.json()) as FeedbackResponseList;
}

describe("permissions — apiKey policy", () => {
  it("tells an anonymous visitor they may reply but not triage", async () => {
    const handler = createSitepingHandler({
      store: new MemoryStore(),
      apiKey: API_KEY,
      publicEndpoints: ["GET", "POST"],
    });
    const created = await create(handler);

    const page = await list(handler);

    expect(created.permissions).toEqual(VISITOR);
    expect(page.feedbacks.map((f) => f.permissions)).toEqual([VISITOR]);
    expect(page.permissions).toEqual({ canDeleteAll: false });
  });

  it("allows everything to the key holder, on lists, creates and updates alike", async () => {
    const handler = createSitepingHandler({ store: new MemoryStore(), apiKey: API_KEY });
    const created = await create(handler, BEARER);

    const updated = await handler.PATCH(
      request("PATCH", { id: created.id, projectName: PROJECT, status: "resolved" }, BEARER),
    );
    const page = await list(handler, BEARER);

    expect(created.permissions).toEqual(ALL);
    expect(((await updated.json()) as FeedbackResponse).permissions).toEqual(ALL);
    expect(page.feedbacks.map((f) => f.permissions)).toEqual([ALL]);
    expect(page.permissions).toEqual({ canDeleteAll: true });
  });

  it.each<[string, Array<SitepingHttpMethod>, FeedbackPermissions]>([
    ["PATCH", ["GET", "POST", "PATCH"], { ...VISITOR, canChangeStatus: true }],
    ["DELETE", ["GET", "POST", "DELETE"], { ...VISITOR, canDelete: true, canDeleteComment: true }],
    ["nothing but GET", ["GET"], { ...VISITOR, canComment: false }],
  ])("follows publicEndpoints opening %s to visitors", async (_label, publicEndpoints, expected) => {
    const handler = createSitepingHandler({ store: new MemoryStore(), apiKey: API_KEY, publicEndpoints });
    await create(handler, BEARER);

    const page = await list(handler);

    expect(page.feedbacks.map((f) => f.permissions)).toEqual([expected]);
    expect(page.permissions).toEqual({ canDeleteAll: expected.canDelete });
  });

  it("refuses PATCH and DELETE to everyone without a key, until requireAuthForDestructive is off", async () => {
    const locked = createSitepingHandler({ store: new MemoryStore() });
    const open = createSitepingHandler({ store: new MemoryStore(), requireAuthForDestructive: false });

    expect((await create(locked)).permissions).toEqual(VISITOR);
    expect((await create(open)).permissions).toEqual(ALL);
    expect((await list(open)).permissions).toEqual({ canDeleteAll: true });
  });
});

describe("permissions — access policy", () => {
  interface Reviewer {
    email: string;
    role: "owner" | "viewer";
  }
  const OWNER: Reviewer = { email: "owner@example.com", role: "owner" };
  const VIEWER: Reviewer = { email: "viewer@example.com", role: "viewer" };

  function access(authorize?: SitepingAccessControl<Reviewer>["authorize"]): SitepingAccessControl<Reviewer> {
    return {
      authenticate: (request) => (request.headers.get("x-session") === OWNER.email ? OWNER : VIEWER),
      ...(authorize ? { authorize } : {}),
    };
  }

  it("asks authorize, as a dry run, for each action on each feedback and for deleteAll once", async () => {
    const dryRuns: Array<SitepingAuthorizationContext<Reviewer>> = [];
    const handler = createSitepingHandler({
      store: new MemoryStore(),
      access: access((context) => {
        if (context.dryRun) dryRuns.push(context);
        return context.principal.role === "owner" || context.action === "list" || context.action === "createComment";
      }),
    });
    const first = await create(handler, { "x-session": OWNER.email });
    const second = await create(handler, { "x-session": OWNER.email });
    dryRuns.length = 0;

    const page = await list(handler);

    expect(page.feedbacks.map((f) => f.permissions)).toEqual([VISITOR, VISITOR]);
    expect(page.permissions).toEqual({ canDeleteAll: false });
    const asked = dryRuns.map(({ action, feedbackId, projectName, commentId, principal }) => ({
      action,
      feedbackId,
      projectName,
      commentId,
      principal,
    }));
    expect(asked).toHaveLength(9);
    expect(asked).toEqual(
      expect.arrayContaining(
        [first.id, second.id].flatMap((feedbackId) =>
          (["update", "delete", "createComment", "deleteComment"] as const).map((action) => ({
            action,
            feedbackId,
            projectName: PROJECT,
            commentId: undefined,
            principal: VIEWER,
          })),
        ),
      ),
    );
    expect(asked).toContainEqual({
      action: "deleteAll",
      feedbackId: undefined,
      projectName: PROJECT,
      commentId: undefined,
      principal: VIEWER,
    });
  });

  it("answers per feedback: an ownership rule shows on the records it matches only", async () => {
    const store = new MemoryStore();
    const handler = createSitepingHandler({ store, access: access() });
    const mine = await create(handler);
    const theirs = await create(handler);
    const own = createSitepingHandler({
      store,
      access: access(({ action, feedbackId, principal }) =>
        action === "delete" ? feedbackId === mine.id : principal.role === "owner" || action !== "update",
      ),
    });

    const page = await list(own);

    const byId = new Map(page.feedbacks.map((f) => [f.id, f.permissions]));
    expect(byId.get(mine.id)).toEqual({ ...ALL, canChangeStatus: false });
    expect(byId.get(theirs.id)).toEqual({ ...ALL, canChangeStatus: false, canDelete: false });
  });

  it("allows everything to every authenticated principal without authorize", async () => {
    const handler = createSitepingHandler({ store: new MemoryStore(), access: access() });

    expect((await create(handler)).permissions).toEqual(ALL);
    expect((await list(handler)).permissions).toEqual({ canDeleteAll: true });
  });

  it("answers the list with a logged 500 when a dry run throws", async () => {
    const logger = { error: vi.fn<SitepingLogger["error"]>() };
    const handler = createSitepingHandler({
      store: new MemoryStore(),
      logger,
      access: access(({ dryRun }) => {
        if (dryRun) throw new Error("role lookup failed");
        return true;
      }),
    });

    const response = await handler.GET(new Request(`${ENDPOINT}?projectName=${PROJECT}`));

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalledWith("[siteping] Failed to fetch feedbacks", expect.anything());
  });
});

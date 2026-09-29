import { MemoryStore } from "@siteping/adapter-memory";
import {
  type CommentCreateInput,
  type CommentResponse,
  type FeedbackResponse,
  type FeedbackResponseList,
  MAX_COMMENTS_PER_FEEDBACK,
  type SitepingStore,
  StoreValueTooLongError,
} from "@siteping/core";
import { describe, expect, it, vi } from "vitest";
import {
  createSitepingHandler,
  type SitepingAccessControl,
  type SitepingAccessHandlerOptions,
  type SitepingAuthorizationContext,
  type SitepingHandler,
  type SitepingLogger,
} from "../src/index.js";
import { validPayloadNoAnnotations } from "./fixtures.js";

const ENDPOINT = "http://localhost/api/siteping";
const API_KEY = "a-secret-key";
const PROJECT = validPayloadNoAnnotations.projectName;
const BEARER = { Authorization: `Bearer ${API_KEY}` };

function request(method: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(ENDPOINT, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function listRequest(headers: Record<string, string> = {}): Request {
  return new Request(`${ENDPOINT}?projectName=${PROJECT}`, { headers });
}

let clientIds = 0;

/** A comment POST body for `feedbackId` — a fresh clientId unless overridden. */
function commentBody(feedbackId: string, overrides: Record<string, unknown> = {}) {
  clientIds += 1;
  return {
    projectName: PROJECT,
    feedbackId,
    body: "Still reproducible after the deploy",
    authorName: "Bob",
    authorEmail: "bob@example.com",
    authorRole: "client",
    clientId: `comment-${clientIds}`,
    ...overrides,
  };
}

async function createFeedback(
  handler: SitepingHandler,
  headers: Record<string, string> = {},
  clientId = validPayloadNoAnnotations.clientId,
) {
  const response = await handler.POST(request("POST", { ...validPayloadNoAnnotations, clientId }, headers));
  expect(response.status).toBe(201);
  return (await response.json()) as FeedbackResponse;
}

async function postComment(
  handler: SitepingHandler,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): Promise<CommentResponse> {
  const response = await handler.POST(request("POST", body, headers));
  expect(response.status).toBe(201);
  return (await response.json()) as CommentResponse;
}

async function list(handler: SitepingHandler, headers: Record<string, string> = {}): Promise<FeedbackResponseList> {
  const response = await handler.GET(listRequest(headers));
  expect(response.status).toBe(200);
  return (await response.json()) as FeedbackResponseList;
}

/** A hand-written store that predates comments: no `addComment` / `deleteComment`, no `comments` on its records. */
function storeWithoutComments(): SitepingStore {
  const memory = new MemoryStore();
  const withoutThread = <Record extends { comments?: unknown }>({ comments: _, ...record }: Record) => record;
  return {
    createFeedback: async (data) => withoutThread(await memory.createFeedback(data)),
    getFeedbacks: async (query) => {
      const page = await memory.getFeedbacks(query);
      return { ...page, feedbacks: page.feedbacks.map(withoutThread) };
    },
    findByClientId: async (clientId) => {
      const record = await memory.findByClientId(clientId);
      return record && withoutThread(record);
    },
    updateFeedback: async (id, data) => withoutThread(await memory.updateFeedback(id, data)),
    deleteFeedback: (id) => memory.deleteFeedback(id),
    deleteAllFeedbacks: (projectName) => memory.deleteAllFeedbacks(projectName),
    verifyProjectOwnership: (id, projectName) => memory.verifyProjectOwnership(id, projectName),
  };
}

const silentLogger = () => ({ error: vi.fn<SitepingLogger["error"]>() });

describe("comments — POST", () => {
  it("adds a comment, answers it without its clientId, and serves the thread oldest first", async () => {
    const handler = createSitepingHandler({ store: new MemoryStore() });
    const feedback = await createFeedback(handler);

    const first = await postComment(handler, commentBody(feedback.id, { body: "  first  " }));
    const second = await postComment(handler, commentBody(feedback.id, { body: "second" }));

    expect(first).toEqual({
      id: expect.any(String),
      feedbackId: feedback.id,
      body: "first",
      authorName: "Bob",
      authorEmail: "bob@example.com",
      authorRole: "client",
      createdAt: expect.any(String),
    });
    const listed = await list(handler);
    expect(listed.capabilities).toEqual({ comments: true, deleteComments: true });
    expect(listed.feedbacks[0]?.comments?.map((c) => c.id)).toEqual([first.id, second.id]);
    expect(listed.feedbacks[0]?.comments?.[0]).not.toHaveProperty("clientId");
  });

  it("stores a retried post once and refuses a clientId already used on another feedback", async () => {
    const store = new MemoryStore();
    const handler = createSitepingHandler({ store });
    const feedback = await createFeedback(handler);
    const other = await createFeedback(handler, {}, "other");
    const body = commentBody(feedback.id);

    const first = await postComment(handler, body);
    const replay = await postComment(handler, body);
    const hijack = await handler.POST(request("POST", { ...body, feedbackId: other.id }));

    expect(replay).toEqual(first);
    expect(hijack.status).toBe(409);
    expect(await hijack.json()).toEqual({ error: "clientId already used on another feedback" });
    expect((await store.findByClientId("uuid-123"))?.comments).toHaveLength(1);
    expect((await store.findByClientId("other"))?.comments).toEqual([]);
  });

  it.each<[string, Record<string, unknown>]>([
    ["a whitespace-only body", { body: "   " }],
    ["a body over 5000 characters", { body: "x".repeat(5001) }],
    ["an invalid email", { authorEmail: "not-an-email" }],
    ["an empty author name", { authorName: "" }],
    ["an unknown role", { authorRole: "owner" }],
    ["a clientId outside [a-zA-Z0-9_-]", { clientId: "../escape" }],
    ["no clientId", { clientId: undefined }],
  ])("answers 400 to %s and stores nothing", async (_label, overrides) => {
    const store = new MemoryStore();
    const handler = createSitepingHandler({ store });
    const feedback = await createFeedback(handler);

    const response = await handler.POST(request("POST", commentBody(feedback.id, overrides)));

    expect(response.status).toBe(400);
    expect((await store.findByClientId("uuid-123"))?.comments).toEqual([]);
  });

  it("accepts an author without an email and stamps client when no role is sent", async () => {
    const handler = createSitepingHandler({ store: new MemoryStore() });
    const feedback = await createFeedback(handler);
    const { authorRole: _, ...withoutRole } = commentBody(feedback.id, { authorEmail: "" });

    const created = await postComment(handler, withoutRole);

    expect(created).toMatchObject({ authorEmail: "", authorRole: "client" });
  });

  it("answers 404 for an unknown feedback and for another project's, storing nothing", async () => {
    const store = new MemoryStore();
    const handler = createSitepingHandler({ store });
    const feedback = await createFeedback(handler);

    const unknown = await handler.POST(request("POST", commentBody("does-not-exist")));
    const foreign = await handler.POST(request("POST", commentBody(feedback.id, { projectName: "someone-else" })));

    expect(unknown.status).toBe(404);
    expect(foreign.status).toBe(404);
    expect(await foreign.json()).toEqual({ error: "Feedback not found" });
    expect((await store.findByClientId("uuid-123"))?.comments).toEqual([]);
  });

  it(`answers 409 once the thread holds ${MAX_COMMENTS_PER_FEEDBACK} comments`, async () => {
    const store = new MemoryStore();
    const handler = createSitepingHandler({ store });
    const feedback = await createFeedback(handler);
    for (let i = 0; i < MAX_COMMENTS_PER_FEEDBACK; i++) {
      await store.addComment(feedback.id, {
        body: "b",
        authorName: "a",
        authorEmail: "",
        authorRole: "client",
        clientId: `seed-${i}`,
      });
    }

    const response = await handler.POST(request("POST", commentBody(feedback.id)));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: `Too many comments on this feedback (max ${MAX_COMMENTS_PER_FEEDBACK})`,
    });
  });

  it("answers 422 to a comment the store cannot hold, logged for the operator", async () => {
    const store = new MemoryStore();
    store.addComment = () => Promise.reject(new StoreValueTooLongError());
    const logger = silentLogger();
    const handler = createSitepingHandler({ store, logger });
    const feedback = await createFeedback(handler);

    const response = await handler.POST(request("POST", commentBody(feedback.id)));

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "A value is too long for this server's database" });
    expect(logger.error).toHaveBeenCalledWith(
      "[siteping] A value is too long for the store",
      expect.objectContaining({ error: expect.any(StoreValueTooLongError) }),
    );
  });

  it("reports a store failure as a logged 500", async () => {
    const store = new MemoryStore();
    const failure = new Error("connection refused");
    store.addComment = () => Promise.reject(failure);
    const logger = silentLogger();
    const handler = createSitepingHandler({ store, logger });
    const feedback = await createFeedback(handler);

    const response = await handler.POST(request("POST", commentBody(feedback.id)));

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalledWith("[siteping] Failed to add comment", {
      error: failure,
      method: "POST",
      path: "/api/siteping",
    });
  });
});

describe("comments — the team role", () => {
  async function claimTeam(handler: SitepingHandler, headers: Record<string, string> = {}) {
    const feedback = await createFeedback(handler, headers);
    return (await postComment(handler, commentBody(feedback.id, { authorRole: "team" }), headers)).authorRole;
  }

  it("is kept for a request carrying the apiKey", async () => {
    expect(await claimTeam(createSitepingHandler({ store: new MemoryStore(), apiKey: API_KEY }), BEARER)).toBe("team");
  });

  it("is downgraded to client on the public POST, with no key, a wrong key, or no apiKey configured", async () => {
    expect(await claimTeam(createSitepingHandler({ store: new MemoryStore(), apiKey: API_KEY }))).toBe("client");
    expect(
      await claimTeam(createSitepingHandler({ store: new MemoryStore(), apiKey: API_KEY }), {
        Authorization: "Bearer wrong-key",
      }),
    ).toBe("client");
    expect(await claimTeam(createSitepingHandler({ store: new MemoryStore() }), BEARER)).toBe("client");
  });

  describe("under a custom access policy", () => {
    const access = (overrides: Partial<SitepingAccessControl<{ staff: boolean }>> = {}) => ({
      authenticate: (req: Request) => ({ staff: req.headers.get("x-staff") === "yes" }),
      ...overrides,
    });
    const handlerWith = (overrides?: Partial<SitepingAccessControl<{ staff: boolean }>>) =>
      createSitepingHandler({ store: new MemoryStore(), access: access(overrides) });

    it("follows canCommentAsTeam", async () => {
      const canCommentAsTeam = ({ staff }: { staff: boolean }) => staff;
      expect(await claimTeam(handlerWith({ canCommentAsTeam }), { "x-staff": "yes" })).toBe("team");
      expect(await claimTeam(handlerWith({ canCommentAsTeam }))).toBe("client");
    });

    it("is refused when the policy tells no team apart", async () => {
      expect(await claimTeam(handlerWith())).toBe("client");
      expect(await claimTeam(handlerWith(), { "x-staff": "yes" })).toBe("client");
    });

    it("defaults to whoever may read reviewer emails, when the policy says who does", async () => {
      expect(await claimTeam(handlerWith({ canReadAuthorEmail: ({ staff }) => staff }))).toBe("client");
      expect(await claimTeam(handlerWith({ canReadAuthorEmail: ({ staff }) => staff }), { "x-staff": "yes" })).toBe(
        "team",
      );
    });

    it("is only asked for a comment that claims the role", async () => {
      const canCommentAsTeam = vi.fn(() => true);
      const handler = handlerWith({ canCommentAsTeam });
      const feedback = await createFeedback(handler);

      await postComment(handler, commentBody(feedback.id));
      await list(handler);

      expect(canCommentAsTeam).not.toHaveBeenCalled();
    });
  });
});

describe("comments — beforeComment", () => {
  interface Member {
    name: string;
    email: string;
    staff: boolean;
  }
  const MALLORY: Member = { name: "Mallory", email: "mallory@client.example", staff: false };

  /** The recipes' stamping: a signed-in author's name and email come from the session. */
  function stampingHandler(
    store = new MemoryStore(),
    overrides: Pick<SitepingAccessHandlerOptions<Member>, "beforeComment" | "logger"> = {},
  ) {
    return createSitepingHandler({
      store,
      access: {
        authenticate: () => MALLORY,
        canReadAuthorEmail: ({ staff }) => staff,
      },
      beforeComment: (input, { principal }) => ({
        ...input,
        authorName: principal.name || input.authorName,
        authorEmail: principal.email || input.authorEmail,
      }),
      ...overrides,
    });
  }

  it("stores the author it imposes, not the one the request claims", async () => {
    const store = new MemoryStore();
    const handler = stampingHandler(store);
    const feedback = await createFeedback(handler);

    await postComment(handler, commentBody(feedback.id, { authorName: "Alice", authorEmail: "alice@client.example" }));

    const [stored] = (await store.findByClientId(validPayloadNoAnnotations.clientId))?.comments ?? [];
    expect(stored).toMatchObject({ authorName: MALLORY.name, authorEmail: MALLORY.email });
  });

  it("keeps the team role out of reach of a caller the policy does not vouch for, whatever it returns", async () => {
    const handler = stampingHandler(new MemoryStore(), {
      beforeComment: (input) => ({ ...input, authorRole: "team" }),
    });
    const feedback = await createFeedback(handler);

    const created = await postComment(handler, commentBody(feedback.id));

    expect(created.authorRole).toBe("client");
  });

  it("is not asked about a comment refused, or aimed at an unknown feedback", async () => {
    const beforeComment = vi.fn((input: CommentCreateInput) => input);
    const refusing = createSitepingHandler({
      store: new MemoryStore(),
      access: { authenticate: () => MALLORY, authorize: ({ action }) => action !== "createComment" },
      beforeComment,
    });
    const open = createSitepingHandler({ store: new MemoryStore(), beforeComment });
    const feedback = await createFeedback(refusing);

    const refused = await refusing.POST(request("POST", commentBody(feedback.id)));
    const unknown = await open.POST(request("POST", commentBody("does-not-exist")));

    expect([refused.status, unknown.status]).toEqual([403, 404]);
    expect(beforeComment).not.toHaveBeenCalled();
  });

  it("answers a logged 500 and stores nothing when it throws", async () => {
    const store = new MemoryStore();
    const failure = new Error("directory lookup failed");
    const logger = silentLogger();
    const handler = stampingHandler(store, { beforeComment: () => Promise.reject(failure), logger });
    const feedback = await createFeedback(handler);

    const response = await handler.POST(request("POST", commentBody(feedback.id)));

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalledWith(
      "[siteping] Failed to add comment",
      expect.objectContaining({ error: failure }),
    );
    expect((await store.findByClientId(validPayloadNoAnnotations.clientId))?.comments).toEqual([]);
  });
});

describe("comments — email redaction", () => {
  /** A feedback with a team reply, both carrying an email, behind an apiKey with a public GET. */
  async function threadWithEmails() {
    const store = new MemoryStore();
    const handler = createSitepingHandler({ store, apiKey: API_KEY, publicEndpoints: ["GET", "POST", "OPTIONS"] });
    const feedback = await createFeedback(handler);
    await postComment(handler, commentBody(feedback.id, { authorRole: "team" }), BEARER);
    return { store, handler, feedback };
  }

  it("blanks comment emails for a reader who may not read the feedback's", async () => {
    const { handler } = await threadWithEmails();

    const anonymous = (await list(handler)).feedbacks[0];
    const authenticated = (await list(handler, BEARER)).feedbacks[0];

    expect(anonymous?.authorEmail).toBe("");
    expect(anonymous?.comments?.[0]?.authorEmail).toBe("");
    expect(authenticated?.comments?.[0]?.authorEmail).toBe("bob@example.com");
  });

  it("echoes a new comment's own email to its author, like a new feedback's", async () => {
    const { handler, feedback } = await threadWithEmails();

    const created = await postComment(handler, commentBody(feedback.id, { authorEmail: "carol@example.com" }));

    expect(created.authorEmail).toBe("carol@example.com");
  });

  it("keeps the thread's emails out of a replayed feedback POST, which echoes only the submitter's", async () => {
    const { handler } = await threadWithEmails();

    const replay = await createFeedback(handler);

    expect(replay.authorEmail).toBe(validPayloadNoAnnotations.authorEmail);
    expect(replay.comments?.[0]?.authorEmail).toBe("");
  });

  it("blanks comment emails in a PATCH answer to an unauthenticated caller", async () => {
    const handler = createSitepingHandler({ store: new MemoryStore(), requireAuthForDestructive: false });
    const feedback = await createFeedback(handler);
    await postComment(handler, commentBody(feedback.id));

    const response = await handler.PATCH(
      request("PATCH", { id: feedback.id, projectName: PROJECT, status: "resolved" }),
    );

    expect(((await response.json()) as FeedbackResponse).comments?.[0]?.authorEmail).toBe("");
  });

  it("follows canReadAuthorEmail under a custom access policy, POST answers included", async () => {
    const handler = createSitepingHandler({
      store: new MemoryStore(),
      access: { authenticate: () => ({ id: "visitor" }), canReadAuthorEmail: () => false },
    });
    const feedback = await createFeedback(handler);

    const created = await postComment(handler, commentBody(feedback.id));

    expect(created.authorEmail).toBe("");
    expect((await list(handler)).feedbacks[0]?.comments?.[0]?.authorEmail).toBe("");
  });
});

describe("comments — DELETE", () => {
  async function seedThread(handler: SitepingHandler) {
    const feedback = await createFeedback(handler);
    const doomed = await postComment(handler, commentBody(feedback.id));
    const kept = await postComment(handler, commentBody(feedback.id));
    return { feedback, doomed, kept };
  }

  it("deletes one comment, keeps the feedback and the rest of the thread, and requires the apiKey", async () => {
    const handler = createSitepingHandler({ store: new MemoryStore(), apiKey: API_KEY });
    const { feedback, doomed, kept } = await seedThread(handler);
    const body = { projectName: PROJECT, feedbackId: feedback.id, commentId: doomed.id };

    expect((await handler.DELETE(request("DELETE", body))).status).toBe(401);
    const response = await handler.DELETE(request("DELETE", body, BEARER));

    expect(await response.json()).toEqual({ deleted: true });
    const listed = await list(handler, BEARER);
    expect(listed.feedbacks.map((f) => f.id)).toEqual([feedback.id]);
    expect(listed.feedbacks[0]?.comments?.map((c) => c.id)).toEqual([kept.id]);
  });

  it("answers 404 for a comment of another thread or an unknown one, and for another project", async () => {
    const store = new MemoryStore();
    const handler = createSitepingHandler({ store, requireAuthForDestructive: false });
    const { doomed } = await seedThread(handler);
    const other = await createFeedback(handler, {}, "other");

    const crossThread = await handler.DELETE(
      request("DELETE", { projectName: PROJECT, feedbackId: other.id, commentId: doomed.id }),
    );
    const unknown = await handler.DELETE(
      request("DELETE", { projectName: PROJECT, feedbackId: doomed.feedbackId, commentId: "nope" }),
    );
    const foreign = await handler.DELETE(
      request("DELETE", { projectName: "someone-else", feedbackId: doomed.feedbackId, commentId: doomed.id }),
    );

    expect(crossThread.status).toBe(404);
    expect(await crossThread.json()).toEqual({ error: "Comment not found" });
    expect(unknown.status).toBe(404);
    expect(await foreign.json()).toEqual({ error: "Feedback not found" });
    expect((await store.findByClientId("uuid-123"))?.comments).toHaveLength(2);
  });

  it("answers 400 to a comment delete missing its feedbackId, never deleting the feedback", async () => {
    const store = new MemoryStore();
    const handler = createSitepingHandler({ store, requireAuthForDestructive: false });
    const { feedback, doomed } = await seedThread(handler);

    const response = await handler.DELETE(
      request("DELETE", { id: feedback.id, projectName: PROJECT, commentId: doomed.id }),
    );

    expect(response.status).toBe(400);
    expect(await store.findByClientId("uuid-123")).not.toBeNull();
  });
});

describe("comments — a store without them", () => {
  it("serves empty threads, advertises no comments, and answers comment writes with 501", async () => {
    const handler = createSitepingHandler({ store: storeWithoutComments(), requireAuthForDestructive: false });
    const feedback = await createFeedback(handler);

    const listed = await list(handler);
    const patched = await handler.PATCH(
      request("PATCH", { id: feedback.id, projectName: PROJECT, status: "resolved" }),
    );
    const posted = await handler.POST(request("POST", commentBody(feedback.id)));
    const deleted = await handler.DELETE(
      request("DELETE", { projectName: PROJECT, feedbackId: feedback.id, commentId: "c1" }),
    );

    expect(feedback.comments).toEqual([]);
    expect(listed.capabilities).toEqual({ comments: false, deleteComments: false });
    expect(listed.feedbacks[0]?.comments).toEqual([]);
    expect(((await patched.json()) as FeedbackResponse).comments).toEqual([]);
    expect(posted.status).toBe(501);
    expect(await posted.json()).toEqual({ error: "Comments are not supported by this store" });
    expect(deleted.status).toBe(501);
  });
});

describe("comments — a store that cannot delete them", () => {
  it("advertises replies but not their deletion, and answers a comment delete with 501", async () => {
    const store = new MemoryStore();
    // Append-only threads: replies are kept, never deleted.
    Object.assign(store, { deleteComment: undefined });
    const handler = createSitepingHandler({ store, requireAuthForDestructive: false });
    const feedback = await createFeedback(handler);
    const reply = await postComment(handler, commentBody(feedback.id));

    const listed = await list(handler);
    const deleted = await handler.DELETE(
      request("DELETE", { projectName: PROJECT, feedbackId: feedback.id, commentId: reply.id }),
    );

    expect(listed.capabilities).toEqual({ comments: true, deleteComments: false });
    expect(deleted.status).toBe(501);
  });
});

describe("comments — authorization", () => {
  it("asks authorize about createComment and deleteComment with their targets, and stores nothing on a refusal", async () => {
    const store = new MemoryStore();
    const authorize = vi.fn(({ action }: SitepingAuthorizationContext<{ id: string }>) => !action.endsWith("Comment"));
    const handler = createSitepingHandler({ store, access: { authenticate: () => ({ id: "u" }), authorize } });
    const feedback = await createFeedback(handler);
    const kept = await store.addComment(feedback.id, {
      body: "b",
      authorName: "a",
      authorEmail: "",
      authorRole: "client",
      clientId: "seeded",
    });

    const posted = await handler.POST(request("POST", commentBody(feedback.id)));
    const deleted = await handler.DELETE(
      request("DELETE", { projectName: PROJECT, feedbackId: feedback.id, commentId: kept.id }),
    );

    expect(posted.status).toBe(403);
    expect(deleted.status).toBe(403);
    expect(authorize).toHaveBeenCalledWith(
      expect.objectContaining({ action: "createComment", projectName: PROJECT, feedbackId: feedback.id }),
    );
    expect(authorize).toHaveBeenCalledWith(
      expect.objectContaining({ action: "deleteComment", feedbackId: feedback.id, commentId: kept.id }),
    );
    expect((await store.findByClientId("uuid-123"))?.comments).toEqual([kept]);
  });

  it("guards comment writes against CSRF like every other mutation", async () => {
    const handler = createSitepingHandler({ store: new MemoryStore(), access: { authenticate: () => ({ id: "u" }) } });
    const feedback = await createFeedback(handler);

    const response = await handler.POST(
      new Request(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(commentBody(feedback.id)),
      }),
    );

    expect(response.status).toBe(415);
  });
});

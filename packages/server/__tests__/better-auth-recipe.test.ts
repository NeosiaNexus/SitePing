import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MemoryStore } from "@siteping/adapter-memory";
import type { CommentResponse, FeedbackPermissions, FeedbackResponse, FeedbackResponseList } from "@siteping/core";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { admin, bearer, jwt } from "better-auth/plugins";
import { createLocalJWKSet, type JSONWebKeySet, type JWTPayload, jwtVerify } from "jose";
import { describe, expect, it, vi } from "vitest";
import {
  createSitepingHandler,
  type SitepingAccessControl,
  type SitepingHandler,
  type SitepingLogger,
} from "../src/index.js";
import { validPayloadNoAnnotations } from "./fixtures.js";

/*
 * The Better Auth recipe of apps/demo/content/docs/server.mdx, run against
 * the real handler and a real Better Auth — its memory adapter, no network.
 * The last suite checks that the docs print this code, EN and FR. Only
 * `auth` differs: built per test, where the docs import the app's own.
 */

// The endpoint's origin: the widget and the inbox are mounted in the app.
const BASE_URL = "http://localhost";
const SECRET = "a-test-secret-of-at-least-32-characters";
const PASSWORD = "correct horse battery staple";

type Tables = Record<"user" | "session" | "account" | "verification" | "jwks", Record<string, unknown>[]>;

/** The app's Better Auth, over tables the test can reach into. */
function createAuth(session: BetterAuthOptions["session"] = {}) {
  const db: Tables = { user: [], session: [], account: [], verification: [], jwks: [] };
  const auth = betterAuth({
    baseURL: BASE_URL,
    secret: SECRET,
    database: memoryAdapter(db),
    emailAndPassword: { enabled: true },
    session,
    plugins: [admin(), bearer()],
    logger: { disabled: true },
  });
  return { auth, db };
}

type Auth = ReturnType<typeof createAuth>["auth"];

// ---- the recipe -------------------------------------------------------------

interface Reviewer {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

const VISITOR: Reviewer = { id: "", name: "", email: "", isAdmin: false };

function betterAuthAccess(auth: Auth): SitepingAccessControl<Reviewer> {
  return {
    async authenticate(request) {
      const session = await auth.api.getSession({
        headers: request.headers,
        query: { disableCookieCache: true, disableRefresh: true },
      });
      if (!session) return /^Bearer(\s|$)/i.test(request.headers.get("Authorization") ?? "") ? null : VISITOR;
      const { user } = session;
      return {
        id: user.id,
        name: user.name,
        email: user.emailVerified ? user.email : "",
        isAdmin: user.role?.split(",").includes("admin") ?? false,
      };
    },
    authorize: ({ principal, action }) =>
      principal.isAdmin || action === "create" || action === "list" || action === "createComment",
    canReadAuthorEmail: (principal) => principal.isAdmin,
  };
}

// ---- fixtures ---------------------------------------------------------------

const ENDPOINT = `${BASE_URL}/api/siteping`;
const PROJECT = validPayloadNoAnnotations.projectName;

const ADMIN = { name: "Ada Lovelace", email: "ada@acme.example", role: "admin", emailVerified: true } as const;
const MEMBER = { name: "Max", email: "max@acme.example", role: "user", emailVerified: false } as const;

const VISITOR_PERMISSIONS: FeedbackPermissions = {
  canChangeStatus: false,
  canDelete: false,
  canComment: true,
  canDeleteComment: false,
};
const ALL_PERMISSIONS: FeedbackPermissions = {
  canChangeStatus: true,
  canDelete: true,
  canComment: true,
  canDeleteComment: true,
};

interface Account {
  name: string;
  email: string;
  role: "admin" | "user" | ("admin" | "user")[];
  emailVerified: boolean;
}

/** The `Cookie` header a browser sends back after a response: each cookie's `name=value`. */
const cookieFrom = (headers: Headers) => ({
  Cookie: headers
    .getSetCookie()
    .map((line) => line.split(";")[0])
    .join("; "),
});

/** Creates the account, then signs it in: the headers a browser, or a bearer client, sends back. */
async function signIn(auth: Auth, { name, email, role, emailVerified }: Account) {
  const { user } = await auth.api.createUser({
    body: { name, email, password: PASSWORD, role, data: { emailVerified } },
  });
  const { headers } = await auth.api.signInEmail({ body: { email, password: PASSWORD }, returnHeaders: true });
  return {
    userId: user.id,
    cookie: cookieFrom(headers),
    bearer: { Authorization: `Bearer ${headers.get("set-auth-token")}` },
  };
}

function handlerFor(
  auth: Auth,
  { logger = { error: vi.fn() }, allowedOrigins }: { logger?: SitepingLogger; allowedOrigins?: string[] } = {},
): SitepingHandler {
  return createSitepingHandler({
    store: new MemoryStore(),
    logger,
    allowedOrigins,
    access: betterAuthAccess(auth),
    beforeCreate: (input, { principal }) => ({
      ...input,
      authorName: principal.name || input.authorName,
      authorEmail: principal.email || input.authorEmail,
    }),
  });
}

function send(method: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(ENDPOINT, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

let clientIds = 0;

async function submit(handler: SitepingHandler, headers: Record<string, string> = {}): Promise<FeedbackResponse> {
  clientIds += 1;
  const response = await handler.POST(
    send("POST", { ...validPayloadNoAnnotations, clientId: `better-auth-${clientIds}` }, headers),
  );
  expect(response.status).toBe(201);
  return (await response.json()) as FeedbackResponse;
}

/** Replies to `feedbackId` asking for the `team` role, as the inbox does. */
async function reply(
  handler: SitepingHandler,
  feedbackId: string,
  headers: Record<string, string> = {},
): Promise<CommentResponse> {
  clientIds += 1;
  const body = {
    projectName: PROJECT,
    feedbackId,
    body: "Fixed in the next deploy",
    authorName: "Someone",
    authorEmail: "someone@acme.example",
    authorRole: "team",
    clientId: `better-auth-${clientIds}`,
  };
  const response = await handler.POST(send("POST", body, headers));
  expect(response.status).toBe(201);
  return (await response.json()) as CommentResponse;
}

function list(handler: SitepingHandler, headers: Record<string, string> = {}): Promise<Response> {
  return handler.GET(new Request(`${ENDPOINT}?projectName=${PROJECT}`, { headers }));
}

async function page(handler: SitepingHandler, headers: Record<string, string> = {}): Promise<FeedbackResponseList> {
  const response = await list(handler, headers);
  expect(response.status).toBe(200);
  return (await response.json()) as FeedbackResponseList;
}

const resolve = (handler: SitepingHandler, id: string, headers: Record<string, string> = {}) =>
  handler.PATCH(send("PATCH", { id, projectName: PROJECT, status: "resolved" }, headers));

const remove = (handler: SitepingHandler, id: string, headers: Record<string, string> = {}) =>
  handler.DELETE(send("DELETE", { id, projectName: PROJECT }, headers));

// ---- the recipe, proven -----------------------------------------------------

describe("Better Auth recipe", () => {
  it("lets a visitor without a session submit, read and reply — and nothing more", async () => {
    const { auth } = createAuth();
    const handler = handlerFor(auth);

    const created = await submit(handler);
    const visible = await page(handler);

    expect(created.permissions).toEqual(VISITOR_PERMISSIONS);
    expect(visible.feedbacks.map((f) => f.permissions)).toEqual([VISITOR_PERMISSIONS]);
    expect(visible.feedbacks[0]?.authorEmail).toBe("");
    expect((await reply(handler, created.id)).authorRole).toBe("client");
    expect((await resolve(handler, created.id)).status).toBe(403);
    expect((await remove(handler, created.id)).status).toBe(403);
  });

  it("keeps a signed-in member out of triage, reviewer emails and the team's voice", async () => {
    const { auth } = createAuth();
    const handler = handlerFor(auth);
    const { cookie } = await signIn(auth, MEMBER);
    const created = await submit(handler);

    const visible = await page(handler, cookie);

    expect(visible.feedbacks.map((f) => f.permissions)).toEqual([VISITOR_PERMISSIONS]);
    expect(visible.permissions).toEqual({ canDeleteAll: false });
    expect(visible.feedbacks[0]?.authorEmail).toBe("");
    expect((await reply(handler, created.id, cookie)).authorRole).toBe("client");
    expect((await resolve(handler, created.id, cookie)).status).toBe(403);
    expect((await remove(handler, created.id, cookie)).status).toBe(403);
  });

  it("lets an administrator triage, read reviewer emails and reply as the team", async () => {
    const { auth } = createAuth();
    const handler = handlerFor(auth);
    const { cookie } = await signIn(auth, ADMIN);
    const created = await submit(handler);

    const visible = await page(handler, cookie);
    const resolved = await resolve(handler, created.id, cookie);

    expect(visible.feedbacks.map((f) => f.permissions)).toEqual([ALL_PERMISSIONS]);
    expect(visible.permissions).toEqual({ canDeleteAll: true });
    expect(visible.feedbacks[0]?.authorEmail).toBe(validPayloadNoAnnotations.authorEmail);
    expect((await reply(handler, created.id, cookie)).authorRole).toBe("team");
    expect(resolved.status).toBe(200);
    expect((await remove(handler, created.id, cookie)).status).toBe(200);
  });

  it("reads the admin plugin's roles, which it stores comma-separated", async () => {
    const { auth } = createAuth();
    const handler = handlerFor(auth);
    const { cookie } = await signIn(auth, { ...MEMBER, role: ["user", "admin"] });

    expect((await page(handler, cookie)).permissions).toEqual({ canDeleteAll: true });
  });

  it("takes the author's name from the session, and the email only once verified", async () => {
    const { auth } = createAuth();
    const handler = handlerFor(auth);
    const admin = await signIn(auth, ADMIN);
    await submit(handler, admin.cookie);
    await submit(handler, (await signIn(auth, MEMBER)).cookie);

    const authors = (await page(handler, admin.cookie)).feedbacks.map((f) => [f.authorName, f.authorEmail]);

    expect(authors).toEqual(
      expect.arrayContaining([
        [ADMIN.name, ADMIN.email],
        // MEMBER's email is unverified: the one the widget sent is kept.
        [MEMBER.name, validPayloadNoAnnotations.authorEmail],
      ]),
    );
    expect(authors).toHaveLength(2);
  });

  it.each<[string, (auth: Auth, tables: Tables) => Promise<Record<string, string>>]>([
    [
      "signed out",
      async (auth) => {
        const { cookie } = await signIn(auth, ADMIN);
        await auth.api.signOut({ headers: cookie });
        return cookie;
      },
    ],
    [
      "expired",
      async (auth, tables) => {
        const { cookie } = await signIn(auth, ADMIN);
        for (const session of tables.session) session.expiresAt = new Date(Date.now() - 1000);
        return cookie;
      },
    ],
    [
      "banned",
      async (auth) => {
        const member = await signIn(auth, MEMBER);
        const { cookie } = await signIn(auth, ADMIN);
        await auth.api.banUser({ headers: cookie, body: { userId: member.userId } });
        return member.cookie;
      },
    ],
    [
      "forged",
      async (auth) => {
        const { cookie } = await signIn(auth, ADMIN);
        return { Cookie: cookie.Cookie.replace(/=([^.]+)\./, "=forged-session-token.") };
      },
    ],
  ])("keeps serving a visitor whose session cookie is %s", async (_, cookieOf) => {
    const { auth, db } = createAuth();
    const handler = handlerFor(auth);
    const cookie = await cookieOf(auth, db);

    const created = await submit(handler, cookie);
    const visible = await page(handler, cookie);

    // A live session, even a member's, would have stamped its own name.
    expect(created.authorName).toBe(validPayloadNoAnnotations.authorName);
    expect(created.permissions).toEqual(VISITOR_PERMISSIONS);
    expect(visible.permissions).toEqual({ canDeleteAll: false });
    expect(visible.feedbacks.map((f) => f.authorEmail)).toEqual([""]);
  });

  it.each<[string, (auth: Auth) => Promise<Record<string, string>>]>([
    [
      "the token of a signed-out session",
      async (auth) => {
        const { cookie, bearer } = await signIn(auth, ADMIN);
        await auth.api.signOut({ headers: cookie });
        return bearer;
      },
    ],
    ["garbage", async () => ({ Authorization: "Bearer not-a-session-token.not-a-signature" })],
    ["an empty bearer", async () => ({ Authorization: "Bearer " })],
  ])("answers 401 to %s instead of treating it as a visitor", async (_, headersOf) => {
    const { auth } = createAuth();
    const logger = { error: vi.fn() };
    const handler = handlerFor(auth, { logger });
    const headers = await headersOf(auth);

    expect((await list(handler, headers)).status).toBe(401);
    // Submissions too, until the page drops the token.
    expect((await handler.POST(send("POST", validPayloadNoAnnotations, headers))).status).toBe(401);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("serves a staging site behind HTTP Basic auth, whose credentials ride on every request", async () => {
    const { auth } = createAuth();
    const handler = handlerFor(auth);
    // Attached by the browser, or forwarded by the proxy that asked for them.
    const basic = { Authorization: `Basic ${btoa("client:staging-password")}` };
    const { cookie } = await signIn(auth, ADMIN);

    const created = await submit(handler, basic);

    expect(created.permissions).toEqual(VISITOR_PERMISSIONS);
    expect((await page(handler, { ...basic, ...cookie })).permissions).toEqual({ canDeleteAll: true });
  });

  it("takes the bearer plugin's token from another origin", async () => {
    const { auth } = createAuth();
    const handler = handlerFor(auth, { allowedOrigins: ["https://client-site.com"] });
    const { bearer } = await signIn(auth, ADMIN);
    const fromClientSite = { ...bearer, Origin: "https://client-site.com" };
    const created = await submit(handler, fromClientSite);

    const visible = await page(handler, fromClientSite);

    expect(visible.feedbacks.map((f) => f.permissions)).toEqual([ALL_PERMISSIONS]);
    expect((await resolve(handler, created.id, fromClientSite)).status).toBe(200);
  });

  it("hands the bearer the whole session: admin endpoints, from any origin, renewed as it is used", async () => {
    const { auth, db } = createAuth();
    const member = await signIn(auth, MEMBER);
    const admin = await signIn(auth, ADMIN);
    // Six days into seven: past `updateAge`.
    const dayLeft = new Date(Date.now() + 24 * 60 * 60 * 1000);
    for (const session of db.session) session.expiresAt = dayLeft;
    const call = (path: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}) =>
      auth.handler(
        new Request(`${BASE_URL}/api/auth${path}`, { ...init, headers: { ...admin.bearer, ...init.headers } }),
      );

    const promoted = await call("/admin/set-role", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://evil.example" },
      body: JSON.stringify({ userId: member.userId, role: "admin" }),
    });
    // What an auth client asks on every page load.
    await call("/get-session");

    expect(promoted.status).toBe(200);
    expect(db.user.find((user) => user.id === member.userId)?.role).toBe("admin");
    const [session] = db.session.filter((row) => row.userId === admin.userId);
    expect(session?.expiresAt).toBeInstanceOf(Date);
    expect((session?.expiresAt as Date).getTime()).toBeGreaterThan(dayLeft.getTime());
  });

  it("answers a logged 500 when Better Auth cannot read its sessions — and keeps serving visitors", async () => {
    const { auth, db } = createAuth();
    const logger = { error: vi.fn() };
    const handler = handlerFor(auth, { logger });
    const { cookie } = await signIn(auth, ADMIN);
    Object.defineProperty(db, "session", {
      get() {
        throw new Error("connect ECONNREFUSED");
      },
    });

    expect((await list(handler, cookie)).status).toBe(500);
    expect(logger.error).toHaveBeenCalledWith("[siteping] Failed to authenticate request", expect.anything());
    expect((await list(handler)).status).toBe(200);
  });

  it("never renews the session, whose cookie only the app's own responses can carry", async () => {
    const { auth, db } = createAuth();
    const handler = handlerFor(auth);
    const { cookie } = await signIn(auth, MEMBER);
    // Six days into seven: past `updateAge` (a day), so any refreshing read renews it.
    const dayLeft = new Date(Date.now() + 24 * 60 * 60 * 1000);
    for (const session of db.session) session.expiresAt = dayLeft;

    await page(handler, cookie);

    expect(db.session.map((session) => session.expiresAt)).toEqual(db.session.map(() => dayLeft));
  });

  it("applies a demotion at once, even under Better Auth's cookie cache", async () => {
    const { auth, db } = createAuth({ cookieCache: { enabled: true, maxAge: 5 * 60 } });
    const handler = handlerFor(auth);
    const { cookie } = await signIn(auth, ADMIN);
    expect((await page(handler, cookie)).permissions).toEqual({ canDeleteAll: true });

    for (const user of db.user) user.role = "user";

    expect((await page(handler, cookie)).permissions).toEqual({ canDeleteAll: false });
  });

  it("finds no stateless session on another instance behind disableCookieCache, as the docs warn", async () => {
    // No database, no secondaryStorage: two instances — serverless invocations, replicas — share only the secret.
    const stateless = () =>
      betterAuth({
        baseURL: BASE_URL,
        secret: SECRET,
        emailAndPassword: { enabled: true },
        plugins: [admin()],
        logger: { disabled: true },
      });
    const signedInOn = stateless();
    const servedBy = stateless();
    await signedInOn.api.createUser({ body: { ...ADMIN, password: PASSWORD } });
    const { headers } = await signedInOn.api.signInEmail({
      body: { email: ADMIN.email, password: PASSWORD },
      returnHeaders: true,
    });
    const read = (query: { disableCookieCache?: boolean; disableRefresh: boolean }) =>
      servedBy.api.getSession({ headers: new Headers(cookieFrom(headers)), query });

    // The recipe's flags: no session, so the administrator is a visitor.
    expect(await read({ disableCookieCache: true, disableRefresh: true })).toBeNull();
    // Without `disableCookieCache`, as the docs advise there, the cookie serves.
    expect((await read({ disableRefresh: true }))?.user.role).toBe("admin");
  });
});

// ---- the recipe's owner-scoped deletes --------------------------------------

describe("Better Auth recipe — authors delete their own feedback", () => {
  it("runs the OpenID Connect recipe's owner table keyed on the user id", async () => {
    const { auth } = createAuth();
    // Your table, in memory.
    const table: { userId: string; feedbackId: string }[] = [];
    const ownerships = new WeakMap<Request, Promise<Set<string>>>();

    function submittedBy(request: Request, userId: string): Promise<Set<string>> {
      let ids = ownerships.get(request);
      if (!ids) {
        ids = Promise.resolve(new Set(table.filter((row) => row.userId === userId).map((row) => row.feedbackId)));
        ownerships.set(request, ids);
      }
      return ids;
    }

    const handler = createSitepingHandler({
      store: new MemoryStore(),
      access: {
        ...betterAuthAccess(auth),
        authorize: async ({ principal, action, feedbackId = "", request }) =>
          principal.isAdmin ||
          action === "create" ||
          action === "list" ||
          action === "createComment" ||
          (action === "delete" && principal.id !== "" && (await submittedBy(request, principal.id)).has(feedbackId)),
      },
      hooks: {
        onCreated: async (feedback, { principal }) => {
          if (principal.id) table.push({ userId: principal.id, feedbackId: feedback.id });
        },
      },
    });
    const max = (await signIn(auth, MEMBER)).cookie;
    const eve = (await signIn(auth, { ...MEMBER, name: "Eve", email: "eve@acme.example" })).cookie;

    const own = await submit(handler, max);
    const theirs = await submit(handler, eve);
    const anonymous = await submit(handler);
    const visible = await page(handler, max);

    expect(Object.fromEntries(visible.feedbacks.map((f) => [f.id, f.permissions?.canDelete]))).toEqual({
      [own.id]: true,
      [theirs.id]: false,
      [anonymous.id]: false,
    });
    expect((await remove(handler, theirs.id, max)).status).toBe(403);
    expect((await remove(handler, own.id)).status).toBe(403);
    expect((await remove(handler, own.id, max)).status).toBe(200);
  });
});

// ---- the jwt plugin, for an endpoint apart from Better Auth -----------------

describe("Better Auth recipe — tokens from the jwt plugin", () => {
  it("issues what the OpenID Connect recipe verifies, as the docs describe it", async () => {
    const auth = betterAuth({
      baseURL: BASE_URL,
      secret: SECRET,
      database: memoryAdapter({ user: [], session: [], account: [], verification: [], jwks: [] }),
      emailAndPassword: { enabled: true },
      plugins: [admin(), jwt()],
      logger: { disabled: true },
    });
    const { user } = await auth.api.createUser({
      body: { ...ADMIN, password: PASSWORD, data: { emailVerified: ADMIN.emailVerified } },
    });
    const { headers } = await auth.api.signInEmail({
      body: { email: ADMIN.email, password: PASSWORD },
      returnHeaders: true,
    });
    const { token } = await auth.api.getToken({ headers: cookieFrom(headers) });
    const keySet = (await (await auth.handler(new Request(`${BASE_URL}/api/auth/jwks`))).json()) as JSONWebKeySet;

    // The OpenID Connect recipe's checks, with ISSUER and audience set to the app's URL.
    const { payload: claims, protectedHeader } = await jwtVerify(token, createLocalJWKSet(keySet), {
      issuer: BASE_URL,
      audience: BASE_URL,
      algorithms: ["RS256", "PS256", "ES256", "EdDSA"],
      requiredClaims: ["exp"],
    });

    expect(protectedHeader.alg).toBe("EdDSA");
    expect(claims).toMatchObject({ sub: user.id, name: ADMIN.name, email: ADMIN.email, emailVerified: true });
    expect(claims).not.toHaveProperty("email_verified");
    // The provider table's `rolesOf` for Better Auth.
    const rolesOf = (payload: JWTPayload) => (typeof payload.role === "string" ? payload.role.split(",") : []);
    expect(rolesOf(claims)).toEqual(["admin"]);
  });
});

// ---- the recipe, as the docs print it ---------------------------------------

describe("Better Auth recipe — the docs", () => {
  /** What the code does, not how it reads: no comments, no whitespace. */
  const bare = (code: string) =>
    code
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|\s)\/\/.*$/gm, "$1")
      .replace(/\s+/g, "");

  /** Every span of the recipe the docs print, by its first and last characters. */
  const SPANS: ReadonlyArray<readonly [start: string, end: string]> = [
    ["interface Reviewer {", "isAdmin: false };"],
    ["async authenticate(request) {", "canReadAuthorEmail: (principal) => principal.isAdmin,"],
    ["beforeCreate: (input, { principal }) => ({", "}),"],
  ];

  /** The Better Auth row of the OpenID Connect recipe's provider table. */
  const ROLES_OF: readonly [start: string, end: string] = ['typeof payload.role === "string"', ": []"];

  /** `text` from `start` to the end of the first `end` after it. */
  function span(text: string, [start, end]: readonly [string, string]): string {
    const from = text.indexOf(start);
    const to = from < 0 ? -1 : text.indexOf(end, from + start.length);
    if (to < 0) throw new Error(`No "${start}" … "${end}" span`);
    return bare(text.slice(from, to + end.length));
  }

  // The spans above come after the code they bound: each `indexOf` finds the code.
  const tests = readFileSync(fileURLToPath(import.meta.url), "utf8");
  const pages = new URL("../../../apps/demo/content/docs/", import.meta.url);

  it.each(["server.mdx", "server.fr.mdx"])("%s prints the code these tests run", (page) => {
    const docs = readFileSync(fileURLToPath(new URL(page, pages)), "utf8");
    const from = docs.search(/^### .*Better Auth$/m);
    expect(from).toBeGreaterThan(0);
    const recipe = docs.slice(from, docs.indexOf("\n## ", from));

    for (const bounds of SPANS) expect(span(recipe, bounds), bounds[0]).toBe(span(tests, bounds));
    expect(span(docs, ROLES_OF), "rolesOf").toBe(span(tests, ROLES_OF));
  });
});

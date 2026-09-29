import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MemoryStore } from "@siteping/adapter-memory";
import type { CommentResponse, FeedbackPermissions, FeedbackResponse, FeedbackResponseList } from "@siteping/core";
import {
  createRemoteJWKSet,
  customFetch,
  errors,
  exportJWK,
  type FetchImplementation,
  generateKeyPair,
  type JWTPayload,
  type JWTVerifyGetKey,
  jwtVerify,
  SignJWT,
  UnsecuredJWT,
} from "jose";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  createSitepingHandler,
  type SitepingAccessControl,
  type SitepingHandler,
  type SitepingLogger,
} from "../src/index.js";
import { validPayloadNoAnnotations } from "./fixtures.js";

/*
 * The OpenID Connect recipe of apps/demo/content/docs/server.mdx, run against
 * the real handler. The last suite checks that the docs print this code, EN
 * and FR. Only the key set's transport differs — jose's `customFetch` serves
 * it from memory, or fails the way an identity provider does — and the owner
 * table, kept in memory.
 */

const ISSUER = "https://id.example.com/realms/acme";
const JWKS_URI = `${ISSUER}/protocol/openid-connect/certs`;
const AUDIENCE = "siteping-api";

// ---- the recipe -------------------------------------------------------------

interface Reviewer {
  sub: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

const VISITOR: Reviewer = { sub: "", name: "", email: "", isAdmin: false };

function rolesOf(payload: JWTPayload): unknown {
  return (payload.realm_access as { roles?: unknown } | undefined)?.roles;
}

const KEY_SET_FAILURES = new Set(["ERR_JOSE_GENERIC", "ERR_JWKS_TIMEOUT", "ERR_JWKS_INVALID"]);

function oidcAccess(jwks: JWTVerifyGetKey): SitepingAccessControl<Reviewer> {
  return {
    async authenticate(request) {
      const authorization = request.headers.get("Authorization") ?? "";
      if (!/^Bearer(\s|$)/i.test(authorization)) return VISITOR;
      const token = /^Bearer (\S+)$/i.exec(authorization)?.[1];
      if (!token) return null;
      try {
        const { payload } = await jwtVerify(token, jwks, {
          issuer: ISSUER,
          audience: "siteping-api",
          algorithms: ["RS256", "PS256", "ES256", "EdDSA"],
          requiredClaims: ["exp"],
        });
        if (!payload.sub) return null;
        const roles = rolesOf(payload);
        return {
          sub: payload.sub,
          name: typeof payload.name === "string" ? payload.name : "",
          email: payload.email_verified === true && typeof payload.email === "string" ? payload.email : "",
          isAdmin: Array.isArray(roles) && roles.includes("siteping-admin"),
        };
      } catch (error) {
        if (error instanceof errors.JOSEError && !KEY_SET_FAILURES.has(error.code)) return null;
        throw error;
      }
    },
    authorize: ({ principal, action }) =>
      principal.isAdmin || action === "create" || action === "list" || action === "createComment",
    canReadAuthorEmail: (principal) => principal.isAdmin,
  };
}

// ---- fixtures ---------------------------------------------------------------

const ENDPOINT = "http://localhost/api/siteping";
const PROJECT = validPayloadNoAnnotations.projectName;
const KID = "key-1";

const ADMIN = {
  sub: "u-ada",
  name: "Ada Lovelace",
  email: "ada@acme.example",
  email_verified: true,
  realm_access: { roles: ["siteping-admin"] },
};
const MEMBER = {
  sub: "u-max",
  name: "Max",
  email: "max@acme.example",
  email_verified: false,
  realm_access: { roles: ["member"] },
};

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

let signingKey: CryptoKey;
let foreignKey: CryptoKey;
let keySet: { keys: unknown[] };

beforeAll(async () => {
  const pair = await generateKeyPair("ES256");
  signingKey = pair.privateKey;
  foreignKey = (await generateKeyPair("ES256")).privateKey;
  keySet = { keys: [{ ...(await exportJWK(pair.publicKey)), kid: KID, alg: "ES256", use: "sig" }] };
});

/** A remote key set whose endpoint answers with `fetchKeySet`. */
function remoteKeySet(fetchKeySet: FetchImplementation = async () => Response.json(keySet)): JWTVerifyGetKey {
  return createRemoteJWKSet(new URL(JWKS_URI), { [customFetch]: fetchKeySet });
}

const inFiveMinutes = () => Math.floor(Date.now() / 1000) + 300;

/** An access token as the provider issues it; `claims` override the defaults (`undefined` drops one). */
function accessToken(claims: Record<string, unknown>, key: CryptoKey = signingKey): Promise<string> {
  return new SignJWT({ iss: ISSUER, aud: AUDIENCE, exp: inFiveMinutes(), ...claims })
    .setProtectedHeader({ alg: "ES256", kid: KID })
    .sign(key);
}

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

function handlerFor(jwks: JWTVerifyGetKey, logger: SitepingLogger = { error: vi.fn() }): SitepingHandler {
  return createSitepingHandler({
    store: new MemoryStore(),
    logger,
    access: oidcAccess(jwks),
    beforeCreate: (input, { principal }) => ({
      ...input,
      authorName: principal.name || input.authorName,
      authorEmail: principal.email || input.authorEmail,
    }),
    beforeComment: (input, { principal }) => ({
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
    send("POST", { ...validPayloadNoAnnotations, clientId: `oidc-${clientIds}` }, headers),
  );
  expect(response.status).toBe(201);
  return (await response.json()) as FeedbackResponse;
}

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
    clientId: `oidc-${clientIds}`,
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

describe("OpenID Connect recipe", () => {
  it("lets a visitor without a token submit, read and reply — and nothing more", async () => {
    const handler = handlerFor(remoteKeySet());

    const created = await submit(handler);
    const visible = await page(handler);

    expect(created.permissions).toEqual(VISITOR_PERMISSIONS);
    expect(visible.feedbacks.map((f) => f.permissions)).toEqual([VISITOR_PERMISSIONS]);
    expect(visible.feedbacks[0]?.authorEmail).toBe("");
    expect((await resolve(handler, created.id)).status).toBe(403);
    expect((await remove(handler, created.id)).status).toBe(403);
  });

  it("keeps a signed-in member out of triage and reviewer emails", async () => {
    const handler = handlerFor(remoteKeySet());
    const member = bearer(await accessToken(MEMBER));
    const created = await submit(handler);

    const visible = await page(handler, member);

    expect(visible.feedbacks.map((f) => f.permissions)).toEqual([VISITOR_PERMISSIONS]);
    expect(visible.permissions).toEqual({ canDeleteAll: false });
    expect(visible.feedbacks[0]?.authorEmail).toBe("");
    expect((await resolve(handler, created.id, member)).status).toBe(403);
    expect((await remove(handler, created.id, member)).status).toBe(403);
  });

  it("lets an administrator triage and read reviewer emails", async () => {
    const handler = handlerFor(remoteKeySet());
    const admin = bearer(await accessToken(ADMIN));
    const created = await submit(handler);

    const visible = await page(handler, admin);
    const resolved = await resolve(handler, created.id, admin);

    expect(visible.feedbacks.map((f) => f.permissions)).toEqual([ALL_PERMISSIONS]);
    expect(visible.permissions).toEqual({ canDeleteAll: true });
    expect(visible.feedbacks[0]?.authorEmail).toBe(validPayloadNoAnnotations.authorEmail);
    expect(resolved.status).toBe(200);
    expect((await remove(handler, created.id, admin)).status).toBe(200);
  });

  it("takes the author's name from the token, and the email only once the provider verified it", async () => {
    const handler = handlerFor(remoteKeySet());
    const admin = bearer(await accessToken(ADMIN));
    await submit(handler, admin);
    await submit(handler, bearer(await accessToken(MEMBER)));

    const authors = (await page(handler, admin)).feedbacks.map((f) => [f.authorName, f.authorEmail]);

    expect(authors).toEqual(
      expect.arrayContaining([
        [ADMIN.name, ADMIN.email],
        // MEMBER's email is unverified: the one the widget sent is kept.
        [MEMBER.name, validPayloadNoAnnotations.authorEmail],
      ]),
    );
    expect(authors).toHaveLength(2);
  });

  it("takes a reply's author from the token too", async () => {
    const handler = handlerFor(remoteKeySet());
    const admin = bearer(await accessToken(ADMIN));
    const created = await submit(handler);
    await reply(handler, created.id, admin);
    await reply(handler, created.id, bearer(await accessToken(MEMBER)));
    await reply(handler, created.id);

    const thread = (await page(handler, admin)).feedbacks[0]?.comments ?? [];

    expect(thread.map((c) => [c.authorName, c.authorEmail])).toEqual([
      [ADMIN.name, ADMIN.email],
      // MEMBER's email is unverified, and a visitor has no token: what the client sent is kept.
      [MEMBER.name, "someone@acme.example"],
      ["Someone", "someone@acme.example"],
    ]);
  });

  it("takes a signed-in replier's name from the token too, so no one replies as another reviewer", async () => {
    const handler = handlerFor(remoteKeySet());
    const admin = bearer(await accessToken(ADMIN));
    const created = await submit(handler);
    const replyAs = async (headers: Record<string, string>, clientId: string) => {
      const body = {
        projectName: PROJECT,
        feedbackId: created.id,
        body: "Approved, ship it",
        authorName: "Alice (client PM)",
        authorEmail: "alice@client.example",
        clientId,
      };
      expect((await handler.POST(send("POST", body, headers))).status).toBe(201);
    };

    await replyAs(bearer(await accessToken(MEMBER)), "oidc-reply-member");
    await replyAs(admin, "oidc-reply-admin");

    const thread = (await page(handler, admin)).feedbacks[0]?.comments ?? [];
    expect(thread.map((c) => [c.authorName, c.authorEmail])).toEqual([
      // MEMBER's email is unverified: the one the request sent is kept.
      [MEMBER.name, "alice@client.example"],
      [ADMIN.name, ADMIN.email],
    ]);
  });

  it.each<[string, () => Promise<Record<string, string>>]>([
    [
      "an ID token, whose audience is the client id",
      async () => bearer(await accessToken({ ...ADMIN, aud: "siteping-web" })),
    ],
    ["another issuer's token", async () => bearer(await accessToken({ ...ADMIN, iss: "https://evil.example" }))],
    ["an expired token", async () => bearer(await accessToken({ ...ADMIN, exp: Math.floor(Date.now() / 1000) - 60 }))],
    ["a token that never expires", async () => bearer(await accessToken({ ...ADMIN, exp: undefined }))],
    ["a token without a subject", async () => bearer(await accessToken({ ...ADMIN, sub: undefined }))],
    ["a token signed with another key", async () => bearer(await accessToken(ADMIN, foreignKey))],
    [
      "an HS256 token signed with a shared secret",
      async () =>
        bearer(
          await new SignJWT({ ...ADMIN, iss: ISSUER, aud: AUDIENCE, exp: inFiveMinutes() })
            .setProtectedHeader({ alg: "HS256", kid: KID })
            .sign(new TextEncoder().encode("a-shared-secret-of-32-bytes-long")),
        ),
    ],
    [
      "an unsigned token",
      async () => bearer(new UnsecuredJWT({ ...ADMIN, iss: ISSUER, aud: AUDIENCE, exp: inFiveMinutes() }).encode()),
    ],
    ["garbage", async () => bearer("not-a-jwt")],
    ["an empty bearer", async () => ({ Authorization: "Bearer " })],
    ["a bare Bearer scheme", async () => ({ Authorization: "Bearer" })],
  ])("answers 401 to %s instead of treating it as a visitor", async (_, headers) => {
    const logger = { error: vi.fn() };
    const handler = handlerFor(remoteKeySet(), logger);

    expect((await list(handler, await headers())).status).toBe(401);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("serves a staging site behind HTTP Basic auth, whose credentials ride on every request", async () => {
    const handler = handlerFor(remoteKeySet());
    const basic = { Authorization: `Basic ${btoa("client:staging-password")}` };

    const created = await submit(handler, basic);
    const visible = await page(handler, basic);

    expect(created.permissions).toEqual(VISITOR_PERMISSIONS);
    expect(visible.feedbacks.map((f) => f.permissions)).toEqual([VISITOR_PERMISSIONS]);
  });

  it.each<[string, FetchImplementation]>([
    [
      "is unreachable",
      async () => {
        throw new TypeError("fetch failed");
      },
    ],
    [
      "times out",
      async () => {
        throw new DOMException("The operation timed out.", "TimeoutError");
      },
    ],
    ["answers 503", async () => new Response("Service Unavailable", { status: 503 })],
    ["answers with an HTML error page", async () => new Response("<html>Maintenance</html>", { status: 200 })],
    ["answers with no key set", async () => Response.json({ error: "maintenance" })],
  ])("answers a logged 500 when the key set endpoint %s — and keeps serving visitors", async (_, fetchKeySet) => {
    const logger = { error: vi.fn() };
    const handler = handlerFor(remoteKeySet(fetchKeySet), logger);

    expect((await list(handler, bearer(await accessToken(ADMIN)))).status).toBe(500);
    expect(logger.error).toHaveBeenCalledWith("[siteping] Failed to authenticate request", expect.anything());
    expect((await list(handler)).status).toBe(200);
  });
});

// ---- the recipe's owner-scoped deletes --------------------------------------

describe("OpenID Connect recipe — authors delete their own feedback", () => {
  /** A handler whose `authorize` also lets an author delete what they submitted. */
  function ownerHandler() {
    // Your table, in memory: `lookups` counts its reads.
    const table: { sub: string; feedbackId: string }[] = [];
    let lookups = 0;
    const db = {
      feedbackOwner: {
        findMany: async ({ where }: { where: { sub: string }; select: { feedbackId: true } }) => {
          lookups += 1;
          return table.filter((row) => row.sub === where.sub);
        },
        create: async ({ data }: { data: { sub: string; feedbackId: string } }) => {
          table.push(data);
        },
      },
    };

    const ownerships = new WeakMap<Request, Promise<Set<string>>>();

    function submittedBy(request: Request, sub: string): Promise<Set<string>> {
      let ids = ownerships.get(request);
      if (!ids) {
        ids = db.feedbackOwner
          .findMany({ where: { sub }, select: { feedbackId: true } })
          .then((rows) => new Set(rows.map((row) => row.feedbackId)));
        ownerships.set(request, ids);
      }
      return ids;
    }

    const handler = createSitepingHandler({
      store: new MemoryStore(),
      access: {
        ...oidcAccess(remoteKeySet()),
        authorize: async ({ principal, action, feedbackId = "", request }) =>
          principal.isAdmin ||
          action === "create" ||
          action === "list" ||
          action === "createComment" ||
          (action === "delete" && principal.sub !== "" && (await submittedBy(request, principal.sub)).has(feedbackId)),
      },
      hooks: {
        onCreated: async (feedback, { principal }) => {
          if (principal.sub) await db.feedbackOwner.create({ data: { sub: principal.sub, feedbackId: feedback.id } });
        },
      },
    });
    return { handler, lookups: () => lookups };
  }

  it("offers and allows the delete to the author only, reading ownership once per request", async () => {
    const { handler, lookups } = ownerHandler();
    const max = bearer(await accessToken(MEMBER));
    const eve = bearer(await accessToken({ ...MEMBER, sub: "u-eve", name: "Eve" }));

    const own = await submit(handler, max);
    const second = await submit(handler, max);
    const theirs = await submit(handler, eve);
    const anonymous = await submit(handler);
    const before = lookups();
    const visible = await page(handler, max);

    expect(own.permissions?.canDelete).toBe(true);
    expect(theirs.permissions?.canDelete).toBe(true);
    expect(Object.fromEntries(visible.feedbacks.map((f) => [f.id, f.permissions?.canDelete]))).toEqual({
      [own.id]: true,
      [second.id]: true,
      [theirs.id]: false,
      [anonymous.id]: false,
    });
    expect(lookups() - before).toBe(1);
    expect((await remove(handler, theirs.id, max)).status).toBe(403);
    expect((await remove(handler, anonymous.id, max)).status).toBe(403);
    expect((await remove(handler, own.id)).status).toBe(403);
    expect((await remove(handler, own.id, max)).status).toBe(200);
  });

  it("never reads the table for a visitor, who may delete nothing", async () => {
    const { handler, lookups } = ownerHandler();
    const theirs = await submit(handler, bearer(await accessToken(MEMBER)));
    const before = lookups();

    const anonymous = await submit(handler);
    const visible = await page(handler);
    const removed = await remove(handler, theirs.id);

    expect(anonymous.permissions?.canDelete).toBe(false);
    expect(visible.feedbacks.map((f) => f.permissions?.canDelete)).toEqual([false, false]);
    expect(removed.status).toBe(403);
    expect(lookups()).toBe(before);
  });
});

// ---- the recipe, as the docs print it ---------------------------------------

describe("OpenID Connect recipe — the docs", () => {
  /** What the code does, not how it reads: no comments, no whitespace. */
  const bare = (code: string) =>
    code
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|\s)\/\/.*$/gm, "$1")
      .replace(/\s+/g, "");

  /** Every span of the recipe the docs print, by its first and last characters. */
  const SPANS: ReadonlyArray<readonly [start: string, end: string]> = [
    ["const ISSUER =", ";"],
    ["interface Reviewer {", '"ERR_JWKS_INVALID"]);'],
    ["async authenticate(request) {", "canReadAuthorEmail: (principal) => principal.isAdmin,"],
    ["beforeCreate: (input, { principal }) => ({", "}),"],
    ["beforeComment: (input, { principal }) => ({", "}),"],
    ["const ownerships = new WeakMap", "return ids;"],
    ['authorize: async ({ principal, action, feedbackId = "", request }) =>', ".has(feedbackId)),"],
    ["onCreated: async (feedback, { principal }) => {", "},"],
  ];

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
    const from = docs.search(/^### .*OpenID Connect$/m);
    expect(from).toBeGreaterThan(0);
    const recipe = docs.slice(from, docs.indexOf("\n## ", from));

    for (const bounds of SPANS) expect(span(recipe, bounds), bounds[0]).toBe(span(tests, bounds));
  });
});

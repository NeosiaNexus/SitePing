import { ERROR_MESSAGES } from "./constants.js";
import type {
  SitepingAccessControl,
  SitepingApiKeyHandlerOptions,
  SitepingAuthorizationContext,
  SitepingHttpMethod,
  SitepingPrincipal,
  SitepingRequestContext,
} from "./options.js";

/** Outcome of the access check that opens every request. */
export type AccessOutcome<Principal> =
  | { ok: true; principal: Principal; canReadAuthorEmail: boolean }
  | { ok: false; status: 401; error: string };

/** The access policy the operations run, normalised from either option set. */
export interface AccessGate<Principal> {
  /**
   * Whether a successful POST echoes `authorEmail` whatever the requester may
   * read. Only the `apiKey` policy does: its public POST has always returned
   * the email to the submitter, who supplied it (or proved ownership of the
   * record by presenting its clientId).
   */
  readonly echoesAuthorEmailOnCreate: boolean;
  /** Whether POST/PATCH/DELETE must pass the CSRF guards (see `access`). */
  readonly guardsMutations: boolean;
  /** `Cache-Control` of the list response. */
  readonly listCacheControl: string;
  authenticate(request: Request, method: SitepingHttpMethod): Promise<AccessOutcome<Principal>>;
  /**
   * Whether the caller of an admitted request would be admitted on `method`
   * too — the first half of each `permissions` answer, `authorize` the second.
   */
  admits(request: Request, method: SitepingHttpMethod): Promise<boolean>;
  authorize(context: SitepingAuthorizationContext<Principal>): Promise<boolean>;
  /**
   * Whether an authenticated caller's comment keeps the `team` role it asks
   * for. Asked only when a comment does, so a GET never runs the policy's
   * callback for it.
   */
  canCommentAsTeam(context: SitepingRequestContext<Principal>, canReadAuthorEmail: boolean): Promise<boolean>;
}

const textEncoder = new TextEncoder();

/**
 * Constant-time string comparison for API key validation, without
 * `node:crypto` so the handler runs on any runtime with Web APIs (Node, Bun,
 * Deno, edge workers). Returns `false` early when lengths differ (an
 * unavoidable length leak); the byte comparison itself does not short-circuit.
 *
 * Lengths are compared in BYTES: multi-byte characters make strings of equal
 * `.length` differ in bytes.
 */
function safeCompare(a: string, b: string): boolean {
  const bytesA = textEncoder.encode(a);
  const bytesB = textEncoder.encode(b);
  if (bytesA.length !== bytesB.length) return false;
  let difference = 0;
  for (let index = 0; index < bytesA.length; index++) {
    difference |= (bytesA[index] ?? 0) ^ (bytesB[index] ?? 0);
  }
  return difference === 0;
}

/** `NODE_ENV === "production"`, tolerating runtimes without `process` (edge workers, Deno). */
function isProductionEnvironment(): boolean {
  return typeof process !== "undefined" && process.env?.NODE_ENV === "production";
}

/**
 * The shared-secret policy (`apiKey`, `publicEndpoints`,
 * `requireAuthForDestructive`, `redactUnauthenticatedEmails`). It never
 * resolves a principal.
 *
 * @throws Error in production without `apiKey` while destructive endpoints
 * still require it — the factory refuses an unauthenticated destructive surface.
 */
export function createApiKeyGate({
  apiKey,
  publicEndpoints = apiKey ? ["POST", "OPTIONS"] : undefined,
  requireAuthForDestructive = true,
  redactUnauthenticatedEmails = true,
}: Pick<
  SitepingApiKeyHandlerOptions,
  "apiKey" | "publicEndpoints" | "requireAuthForDestructive" | "redactUnauthenticatedEmails"
>): AccessGate<null> {
  // Without this guard, anyone could `DELETE { deleteAll: true }` against the API.
  if (!apiKey && requireAuthForDestructive && isProductionEnvironment()) {
    throw new Error(
      "[siteping] createSitepingHandler: apiKey is required in production. " +
        "Set `apiKey` to enable destructive endpoints, pass `access` to plug in your own authentication, " +
        "or pass `requireAuthForDestructive: false` if SitePing sits behind your own auth middleware.",
    );
  }

  const publicMethods: ReadonlySet<SitepingHttpMethod> | null = publicEndpoints ? new Set(publicEndpoints) : null;

  /**
   * True iff `apiKey` is configured AND the request carries a matching Bearer
   * token. A valid token on a public method still counts: it drives PII
   * redaction, not access control.
   */
  const isBearerAuthenticated = (request: Request): boolean => {
    if (!apiKey) return false;
    const header = request.headers.get("Authorization");
    return header !== null && safeCompare(header, `Bearer ${apiKey}`);
  };

  const authenticate: AccessGate<null>["authenticate"] = async (request, method) => {
    const canReadAuthorEmail = !redactUnauthenticatedEmails || isBearerAuthenticated(request);
    if (!apiKey) {
      // GET/POST/OPTIONS stay open by default so the widget keeps working in dev without config.
      if (requireAuthForDestructive && (method === "DELETE" || method === "PATCH")) {
        return { ok: false, status: 401, error: ERROR_MESSAGES.apiKeyRequiredForDestructive };
      }
      return { ok: true, principal: null, canReadAuthorEmail };
    }
    if (publicMethods?.has(method) || isBearerAuthenticated(request)) {
      return { ok: true, principal: null, canReadAuthorEmail };
    }
    return { ok: false, status: 401, error: ERROR_MESSAGES.unauthorized };
  };

  return {
    echoesAuthorEmailOnCreate: true,
    // The key travels in a header a forged cross-site request cannot set.
    guardsMutations: false,
    listCacheControl: "private, max-age=5",
    authenticate,
    // This policy admits by method: a visitor reads, the key holder triages.
    async admits(request, method) {
      return (await authenticate(request, method)).ok;
    },
    async authorize() {
      return true;
    },
    // The key proves the caller is the project side; a public POST does not.
    async canCommentAsTeam({ request }) {
      return isBearerAuthenticated(request);
    },
  };
}

/** A custom `access` policy. */
export function createAccessGate<Principal extends SitepingPrincipal>(
  access: SitepingAccessControl<Principal>,
): AccessGate<Principal> {
  return {
    echoesAuthorEmailOnCreate: false,
    guardsMutations: true,
    listCacheControl: "no-store",
    async authenticate(request) {
      const principal = await access.authenticate(request);
      // Fail closed on anything falsy: `return session?.user` or a plain
      // JavaScript `false` check must never let a request in.
      if (!principal) {
        return { ok: false, status: 401, error: ERROR_MESSAGES.unauthorized };
      }
      // Emails are personal data: only a `true` answer reveals them — no
      // callback, or `undefined` from a principal missing the flag, hides them.
      return { ok: true, principal, canReadAuthorEmail: (await access.canReadAuthorEmail?.(principal)) === true };
    },
    // A dry run reuses the response's request, so `authenticate` is never asked
    // about another method: `authorize` decides, by action.
    async admits() {
      return true;
    },
    async authorize(context) {
      return access.authorize ? access.authorize(context) : true;
    },
    // Speaking as the team is an impersonation privilege: without the host's
    // word for it (its own callback, or the email access it grants), refuse.
    async canCommentAsTeam({ principal }, canReadAuthorEmail) {
      return access.canCommentAsTeam ? access.canCommentAsTeam(principal) : canReadAuthorEmail;
    },
  };
}

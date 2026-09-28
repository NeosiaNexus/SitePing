import { ERROR_MESSAGES } from "./constants.js";
import type { SitepingHandlerOptions, SitepingHttpMethod } from "./options.js";

/** Outcome of the access check that opens every request. */
export type AccessOutcome = { ok: true; canReadAuthorEmail: boolean } | { ok: false; status: 401; error: string };

/** The access policy the operations run. */
export interface AccessGate {
  authenticate(request: Request, method: SitepingHttpMethod): Promise<AccessOutcome>;
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
 * `requireAuthForDestructive`, `redactUnauthenticatedEmails`).
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
  SitepingHandlerOptions,
  "apiKey" | "publicEndpoints" | "requireAuthForDestructive" | "redactUnauthenticatedEmails"
>): AccessGate {
  // Without this guard, anyone could `DELETE { deleteAll: true }` against the API.
  if (!apiKey && requireAuthForDestructive && isProductionEnvironment()) {
    throw new Error(
      "[siteping] createSitepingHandler: apiKey is required in production. " +
        "Set `apiKey` to enable destructive endpoints, or pass " +
        "`requireAuthForDestructive: false` if SitePing sits behind your own auth middleware.",
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

  return {
    async authenticate(request, method) {
      const canReadAuthorEmail = !redactUnauthenticatedEmails || isBearerAuthenticated(request);
      if (!apiKey) {
        // GET/POST/OPTIONS stay open by default so the widget keeps working in dev without config.
        if (requireAuthForDestructive && (method === "DELETE" || method === "PATCH")) {
          return { ok: false, status: 401, error: ERROR_MESSAGES.apiKeyRequiredForDestructive };
        }
        return { ok: true, canReadAuthorEmail };
      }
      if (publicMethods?.has(method) || isBearerAuthenticated(request)) return { ok: true, canReadAuthorEmail };
      return { ok: false, status: 401, error: ERROR_MESSAGES.unauthorized };
    },
  };
}

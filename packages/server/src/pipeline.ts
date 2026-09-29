import type { CommentRecord, FeedbackPermissions, FeedbackRecord } from "@siteping/core";
import type { AccessGate, AccessOutcome } from "./access.js";
import { DRY_RUN_CONCURRENCY, ERROR_MESSAGES } from "./constants.js";
import { buildCorsHeaders, type CorsHeaders, withCors } from "./cors.js";
import { csrfRefusal } from "./csrf.js";
import type {
  SitepingAuthorizationContext,
  SitepingHandlerBaseOptions,
  SitepingHttpMethod,
  SitepingLogger,
  SitepingRequestContext,
} from "./options.js";
import { formatValidationErrors } from "./validation.js";

/** A request that passed the access gate — what every operation works with. */
export interface Scope<Principal> {
  context: SitepingRequestContext<Principal>;
  corsHeaders: CorsHeaders;
  /** Whether responses to this request may include `authorEmail`. */
  canReadAuthorEmail: boolean;
}

/** Either a value to continue with, or the response to send right away. */
export type Step<Value> = { ok: true; value: Value } | { ok: false; response: Response };

/** The slice of a zod schema the pipeline validates with. */
interface Schema<Output> {
  safeParse(
    input: unknown,
  ): { success: true; data: Output } | { success: false; error: Parameters<typeof formatValidationErrors>[0] };
}

interface PipelineDependencies<Principal> {
  gate: AccessGate<Principal>;
  allowedOrigins: ReadonlyArray<string> | undefined;
  logger: SitepingLogger;
  describeError: SitepingHandlerBaseOptions<Principal>["describeError"];
  presentFeedback: SitepingHandlerBaseOptions<Principal>["presentFeedback"];
  maxBodyBytes: number;
}

/** A comment as it goes on the wire. */
export type WireComment = Omit<CommentRecord, "clientId">;

/** A feedback as it goes on the wire — its thread and the requester's permissions always present. */
export type WireFeedback = Omit<FeedbackRecord, "clientId" | "comments"> & {
  comments: WireComment[];
  permissions: FeedbackPermissions;
};

/**
 * Serialize a comment for the HTTP wire — `clientId` stripped and
 * `authorEmail` blanked on the same terms as a feedback's (see below).
 */
function toWireComment(comment: CommentRecord, includeEmail: boolean): WireComment {
  const { clientId: _clientId, ...wire } = comment;
  return includeEmail ? wire : { ...wire, authorEmail: "" };
}

/**
 * Serialize a feedback record for the HTTP wire (edge DTO — stores return raw
 * records, redaction happens here).
 *
 * `clientId` is always stripped: it is a browser-local dedup secret, and the
 * POST dedup path returns the full existing record for whoever presents it —
 * exposing it via responses would turn that into a record-theft oracle.
 * `authorEmail` is PII: blanked unless the requester may read it — on the
 * feedback per `includeEmail`, on its comments per `includeCommentEmails`.
 * A store without comments leaves the thread out: it goes out as `[]`.
 * Never mutates the input — webhooks receive the same record object.
 */
function toWireFeedback(
  feedback: FeedbackRecord,
  includeEmail: boolean,
  includeCommentEmails: boolean,
): Omit<WireFeedback, "permissions"> {
  const { clientId: _clientId, comments, ...wire } = feedback;
  return {
    ...wire,
    ...(includeEmail ? {} : { authorEmail: "" }),
    comments: (comments ?? []).map((comment) => toWireComment(comment, includeCommentEmails)),
  };
}

/** Run tasks at most `size` at a time; a task that finishes hands its slot to the next one waiting. */
function createSlots(size: number): <Result>(task: () => Promise<Result>) => Promise<Result> {
  let running = 0;
  const waiting: Array<() => void> = [];
  return async (task) => {
    if (running < size) running += 1;
    else await new Promise<void>((resolve) => waiting.push(resolve));
    try {
      return await task();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else running -= 1;
    }
  };
}

/**
 * A request body as text, or `null` past `maxBytes`: refused on its
 * `Content-Length` before any byte is read, and counted as it streams in
 * otherwise, so an oversized body is never held in memory whole.
 */
async function readText(request: Request, maxBytes: number): Promise<string | null> {
  if (Number(request.headers.get("Content-Length")) > maxBytes) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let received = 0;
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    received += chunk.value.byteLength;
    if (received > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    text += decoder.decode(chunk.value, { stream: true });
  }
  return text + decoder.decode();
}

/** `text` parsed as JSON, or `null` when it is not JSON. */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Where a request failed, for the log: method and path — never the query, headers or body. */
function requestContext(request: Request): { method: string; path: string } {
  return { method: request.method, path: new URL(request.url).pathname };
}

/**
 * The steps every operation shares — access check, parsing, authorization,
 * serialization, failure reporting — so each operation module only holds its
 * own logic. Every response carries the request's CORS headers.
 */
export function createPipeline<Principal>({
  gate,
  allowedOrigins,
  logger,
  describeError,
  presentFeedback,
  maxBodyBytes,
}: PipelineDependencies<Principal>) {
  const json = (scope: Pick<Scope<Principal>, "corsHeaders">, body: unknown, init?: ResponseInit): Response =>
    withCors(Response.json(body, init), scope.corsHeaders);

  const error = (scope: Pick<Scope<Principal>, "corsHeaders">, status: number, message: string): Response =>
    json(scope, { error: message }, { status });

  /** Log an unexpected failure and answer a JSON 500 — with `describeError`'s hint when it has one. */
  const fail = (
    request: Request,
    scope: Pick<Scope<Principal>, "corsHeaders">,
    message: string,
    failure: unknown,
  ): Response => {
    logger.error(message, { error: failure, ...requestContext(request) });
    return error(scope, 500, describeError?.(failure) ?? ERROR_MESSAGES.internalServerError);
  };

  /**
   * Log a failure the response does not report, with what it concerns (a
   * record, a deletion target) and the request's method and path, so an
   * operator can tell which record missed its side effect.
   */
  const logError = (scope: Scope<Principal>, message: string, details: Record<string, unknown>): void => {
    logger.error(message, { ...details, ...requestContext(scope.context.request) });
  };

  const validate = <Output>(scope: Scope<Principal>, schema: Schema<Output>, input: unknown): Step<Output> => {
    const parsed = schema.safeParse(input);
    if (parsed.success) return { ok: true, value: parsed.data };
    return { ok: false, response: json(scope, { errors: formatValidationErrors(parsed.error) }, { status: 400 }) };
  };

  /** Read a JSON body of at most `maxBodyBytes`, not validated yet. */
  const readJson = async (scope: Scope<Principal>): Promise<Step<unknown>> => {
    // A body that cannot be read (already consumed, a broken stream) is no JSON.
    const text = await readText(scope.context.request, maxBodyBytes).catch(() => "");
    if (text === null) return { ok: false, response: error(scope, 413, ERROR_MESSAGES.bodyTooLarge) };
    const body = parseJson(text);
    if (!body) return { ok: false, response: error(scope, 400, ERROR_MESSAGES.invalidJson) };
    return { ok: true, value: body };
  };

  /** Requests whose failed dry run is logged already — one line per response, however many fail. */
  const loggedDryRunFailures = new WeakSet<Request>();
  /** Each request's dry-run slots — `DRY_RUN_CONCURRENCY` per response. */
  const dryRunSlots = new WeakMap<Request, ReturnType<typeof createSlots>>();

  /**
   * Whether this requester may do what `target` describes: the policy admits
   * the method it takes, and `authorize` allows it in a dry run — a few of a
   * response's at a time. A dry run that throws refuses: a permission only
   * hides a control, and the response it goes out with often answers a write
   * that already happened.
   */
  const may = async (
    scope: Scope<Principal>,
    method: SitepingHttpMethod,
    target: Omit<SitepingAuthorizationContext<Principal>, keyof SitepingRequestContext<Principal>>,
  ): Promise<boolean> => {
    const { request } = scope.context;
    const slots = dryRunSlots.get(request) ?? createSlots(DRY_RUN_CONCURRENCY);
    dryRunSlots.set(request, slots);
    try {
      return await slots(
        async () =>
          (await gate.admits(request, method)) && (await gate.authorize({ ...scope.context, ...target, dryRun: true })),
      );
    } catch (failure) {
      if (!loggedDryRunFailures.has(request)) {
        loggedDryRunFailures.add(request);
        logger.error("[siteping] authorize failed on a dry run", {
          error: failure,
          action: target.action,
          ...requestContext(request),
        });
      }
      return false;
    }
  };

  /** What this requester may do with a record — `permissions` on the wire. */
  const permissions = async (scope: Scope<Principal>, feedback: FeedbackRecord): Promise<FeedbackPermissions> => {
    const target = { projectName: feedback.projectName, feedbackId: feedback.id };
    const [canChangeStatus, canDelete, canComment, canDeleteComment] = await Promise.all([
      may(scope, "PATCH", { action: "update", ...target }),
      may(scope, "DELETE", { action: "delete", ...target }),
      may(scope, "POST", { action: "createComment", ...target }),
      may(scope, "DELETE", { action: "deleteComment", ...target }),
    ]);
    return { canChangeStatus, canDelete, canComment, canDeleteComment };
  };

  /** Wire shape of a record for this requester (`presentFeedback`, then redaction), with its permissions. */
  const present = async (
    scope: Scope<Principal>,
    feedback: FeedbackRecord,
    includeEmail = scope.canReadAuthorEmail,
  ): Promise<WireFeedback> => ({
    ...toWireFeedback(
      presentFeedback ? presentFeedback(feedback, scope.context) : feedback,
      includeEmail,
      scope.canReadAuthorEmail,
    ),
    permissions: await permissions(scope, feedback),
  });

  return {
    json,
    error,
    validate,
    may,
    present,

    /**
     * Open a request: the CSRF guards when the policy needs them, then the
     * access gate. A throwing `access` callback (session store down…)
     * answers the logged 500 with CORS headers rather than rejecting, which
     * a browser would only see as an opaque network error.
     */
    async enter(request: Request, method: SitepingHttpMethod): Promise<Step<Scope<Principal>>> {
      const corsHeaders = buildCorsHeaders(request, allowedOrigins);
      if (gate.guardsMutations) {
        const refusal = csrfRefusal(request, method, allowedOrigins);
        if (refusal?.status === 403) {
          logger.error("[siteping] Refused a mutation from an origin outside allowedOrigins", {
            origin: refusal.origin,
            ...requestContext(request),
          });
          return { ok: false, response: error({ corsHeaders }, 403, ERROR_MESSAGES.forbidden) };
        }
        if (refusal) return { ok: false, response: error({ corsHeaders }, 415, ERROR_MESSAGES.unsupportedMediaType) };
      }

      let outcome: AccessOutcome<Principal>;
      try {
        outcome = await gate.authenticate(request, method);
      } catch (failure) {
        return {
          ok: false,
          response: fail(request, { corsHeaders }, "[siteping] Failed to authenticate request", failure),
        };
      }
      if (!outcome.ok) return { ok: false, response: error({ corsHeaders }, outcome.status, outcome.error) };
      return {
        ok: true,
        value: {
          context: { request, principal: outcome.principal },
          corsHeaders,
          canReadAuthorEmail: outcome.canReadAuthorEmail,
        },
      };
    },

    readJson,

    /** Read and validate a JSON body. */
    async readBody<Output>(scope: Scope<Principal>, schema: Schema<Output>): Promise<Step<Output>> {
      const body = await readJson(scope);
      return body.ok ? validate(scope, schema, body.value) : body;
    },

    /** `null` when the policy allows the request, its 403 otherwise. */
    async authorize(
      scope: Scope<Principal>,
      target: Omit<SitepingAuthorizationContext<Principal>, keyof SitepingRequestContext<Principal>>,
    ): Promise<Response | null> {
      return (await gate.authorize({ ...scope.context, ...target }))
        ? null
        : error(scope, 403, ERROR_MESSAGES.forbidden);
    },

    /**
     * Wire shape of a record answering a POST (fresh or replayed): the
     * requester's email permission, unless the policy echoes the email to
     * its submitter — who supplied the feedback's, never its thread's.
     */
    presentCreated(scope: Scope<Principal>, feedback: FeedbackRecord) {
      return present(scope, feedback, gate.echoesAuthorEmailOnCreate || scope.canReadAuthorEmail);
    },

    /** Wire shape of a comment answering a POST — the same echo rule as {@link presentCreated}. */
    presentCreatedComment(scope: Scope<Principal>, comment: CommentRecord): WireComment {
      return toWireComment(comment, gate.echoesAuthorEmailOnCreate || scope.canReadAuthorEmail);
    },

    /** Whether this caller's comment keeps the `team` role it asks for — see `AccessGate.canCommentAsTeam`. */
    canCommentAsTeam(scope: Scope<Principal>): Promise<boolean> {
      return gate.canCommentAsTeam(scope.context, scope.canReadAuthorEmail);
    },

    /**
     * Answer a value the store cannot hold with a 422, which a client does
     * not retry, and log it: the database's columns are narrower than what
     * the validation accepts, which only the operator can fix.
     */
    refuseTooLong(scope: Scope<Principal>, failure: unknown): Response {
      logError(scope, "[siteping] A value is too long for the store", { error: failure });
      return error(scope, 422, ERROR_MESSAGES.valueTooLong);
    },

    /** Log an unexpected failure of an operation and answer its JSON 500. */
    fail(scope: Scope<Principal>, message: string, failure: unknown): Response {
      return fail(scope.context.request, scope, message, failure);
    },

    logError,

    /** Run a lifecycle hook after a write; a failure is logged with `subject`, never surfaced — the write happened. */
    async runHook(
      scope: Scope<Principal>,
      name: string,
      subject: Record<string, unknown>,
      invoke: () => void | Promise<void>,
    ): Promise<void> {
      try {
        await invoke();
      } catch (failure) {
        logError(scope, `[siteping] Hook ${name} failed`, { error: failure, ...subject });
      }
    },

    /** The list response's `Cache-Control`. */
    listCacheControl: gate.listCacheControl,
  };
}

export type Pipeline<Principal> = ReturnType<typeof createPipeline<Principal>>;

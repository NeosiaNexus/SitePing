import type { FeedbackRecord } from "@siteping/core";
import type { AccessGate, AccessOutcome } from "./access.js";
import { ERROR_MESSAGES } from "./constants.js";
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
}

/**
 * Serialize a feedback record for the HTTP wire (edge DTO — stores return raw
 * records, redaction happens here).
 *
 * `clientId` is always stripped: it is a browser-local dedup secret, and the
 * POST dedup path returns the full existing record for whoever presents it —
 * exposing it via responses would turn that into a record-theft oracle.
 * `authorEmail` is PII: blanked unless the requester may read it.
 * Never mutates the input — webhooks receive the same record object.
 */
function toWireFeedback(feedback: FeedbackRecord, includeEmail: boolean): Omit<FeedbackRecord, "clientId"> {
  const { clientId: _clientId, ...wire } = feedback;
  return includeEmail ? wire : { ...wire, authorEmail: "" };
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

  const validate = <Output>(scope: Scope<Principal>, schema: Schema<Output>, input: unknown): Step<Output> => {
    const parsed = schema.safeParse(input);
    if (parsed.success) return { ok: true, value: parsed.data };
    return { ok: false, response: json(scope, { errors: formatValidationErrors(parsed.error) }, { status: 400 }) };
  };

  /** Wire shape of a record for this requester (`presentFeedback`, then redaction). */
  const present = (scope: Scope<Principal>, feedback: FeedbackRecord, includeEmail = scope.canReadAuthorEmail) =>
    toWireFeedback(presentFeedback ? presentFeedback(feedback, scope.context) : feedback, includeEmail);

  return {
    json,
    error,
    validate,
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

    /** Read and validate a JSON body. */
    async readBody<Output>(scope: Scope<Principal>, schema: Schema<Output>): Promise<Step<Output>> {
      const body: unknown = await scope.context.request.json().catch(() => null);
      if (!body) return { ok: false, response: error(scope, 400, ERROR_MESSAGES.invalidJson) };
      return validate(scope, schema, body);
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
     * its submitter.
     */
    presentCreated(scope: Scope<Principal>, feedback: FeedbackRecord) {
      return present(scope, feedback, gate.echoesAuthorEmailOnCreate || scope.canReadAuthorEmail);
    },

    /** Log an unexpected failure of an operation and answer its JSON 500. */
    fail(scope: Scope<Principal>, message: string, failure: unknown): Response {
      return fail(scope.context.request, scope, message, failure);
    },

    /** Run a lifecycle hook after a write; a failure is logged, never surfaced — the write happened. */
    async runHook(name: string, invoke: () => void | Promise<void>): Promise<void> {
      try {
        await invoke();
      } catch (failure) {
        logger.error(`[siteping] Hook ${name} failed`, { error: failure });
      }
    },

    /** The list response's `Cache-Control`. */
    listCacheControl: gate.listCacheControl,
    logger,
  };
}

export type Pipeline<Principal> = ReturnType<typeof createPipeline<Principal>>;

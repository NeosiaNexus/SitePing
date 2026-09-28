import type { FeedbackRecord } from "@siteping/core";
import type { AccessGate } from "./access.js";
import { ERROR_MESSAGES } from "./constants.js";
import { buildCorsHeaders, type CorsHeaders, withCors } from "./cors.js";
import type { SitepingHttpMethod, SitepingLogger } from "./options.js";
import { formatValidationErrors } from "./validation.js";

/** A request that passed the access gate — what every operation works with. */
export interface Scope {
  request: Request;
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

interface PipelineDependencies {
  gate: AccessGate;
  allowedOrigins: ReadonlyArray<string> | undefined;
  logger: SitepingLogger;
  describeError: ((error: unknown) => string | undefined) | undefined;
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

/**
 * The steps every operation shares — access check, parsing, serialization,
 * failure reporting — so each operation module only holds its own logic.
 * Every response carries the request's CORS headers.
 */
export function createPipeline({ gate, allowedOrigins, logger, describeError }: PipelineDependencies) {
  const json = (scope: Pick<Scope, "corsHeaders">, body: unknown, init?: ResponseInit): Response =>
    withCors(Response.json(body, init), scope.corsHeaders);

  const error = (scope: Pick<Scope, "corsHeaders">, status: number, message: string): Response =>
    json(scope, { error: message }, { status });

  const validate = <Output>(scope: Scope, schema: Schema<Output>, input: unknown): Step<Output> => {
    const parsed = schema.safeParse(input);
    if (parsed.success) return { ok: true, value: parsed.data };
    return { ok: false, response: json(scope, { errors: formatValidationErrors(parsed.error) }, { status: 400 }) };
  };

  return {
    json,
    error,
    validate,

    /** Run the access gate: the scope to continue with, or its refusal. */
    async enter(request: Request, method: SitepingHttpMethod): Promise<Step<Scope>> {
      const corsHeaders = buildCorsHeaders(request, allowedOrigins);
      const outcome = await gate.authenticate(request, method);
      if (!outcome.ok) return { ok: false, response: error({ corsHeaders }, outcome.status, outcome.error) };
      return { ok: true, value: { request, corsHeaders, canReadAuthorEmail: outcome.canReadAuthorEmail } };
    },

    /** Read and validate a JSON body. */
    async readBody<Output>(scope: Scope, schema: Schema<Output>): Promise<Step<Output>> {
      const body: unknown = await scope.request.json().catch(() => null);
      if (!body) return { ok: false, response: error(scope, 400, ERROR_MESSAGES.invalidJson) };
      return validate(scope, schema, body);
    },

    /** Wire shape of a record for this requester. */
    present(scope: Scope, feedback: FeedbackRecord, includeEmail = scope.canReadAuthorEmail) {
      return toWireFeedback(feedback, includeEmail);
    },

    /**
     * Log an unexpected failure with its request context (method and path —
     * never the query, headers or body) and answer a JSON 500. The body holds
     * the generic message unless `describeError` supplies a safe hint.
     */
    fail(scope: Scope, message: string, failure: unknown): Response {
      logger.error(message, {
        error: failure,
        method: scope.request.method,
        path: new URL(scope.request.url).pathname,
      });
      return error(scope, 500, describeError?.(failure) ?? ERROR_MESSAGES.internalServerError);
    },

    logger,
  };
}

export type Pipeline = ReturnType<typeof createPipeline>;

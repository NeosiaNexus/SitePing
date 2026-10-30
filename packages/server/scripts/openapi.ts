/**
 * The HTTP protocol of `createSitepingHandler` as an OpenAPI 3.1 document,
 * generated from what the handler runs rather than written by hand:
 *
 * - request bodies and query parameters from the zod schemas the handler
 *   validates with (`src/validation.ts`);
 * - response bodies from the zod schemas below, locked at compile time to the
 *   wire types the operations send (`WireFeedback`, `WireFeedbackList`…), so
 *   a field added to a record fails `bun run check` until it is described.
 *
 * `__tests__/openapi.test.ts` compares the result with the committed
 * `openapi.json` (shipped as `@siteping/server/openapi.json`) and parses real
 * handler responses with the response schemas. After a protocol change:
 * `bun run openapi:update`.
 */

import {
  type AssertEqual,
  COMMENT_AUTHOR_ROLES,
  CONSOLE_DIAGNOSTIC_LEVELS,
  FEEDBACK_STATUSES,
  FEEDBACK_TYPES,
  MAX_COMMENTS_PER_FEEDBACK,
  type Prettify,
  type Serialized,
  SITEPING_PROTOCOL_VERSION,
} from "@siteping/core";
import * as zod from "zod";
import { MAX_VALIDATION_ISSUES } from "../src/constants.js";
import type { WireFeedbackList } from "../src/operations/list-feedbacks.js";
import type { WireComment, WireFeedback } from "../src/pipeline.js";
import {
  commentCreateSchema,
  commentDeleteSchema,
  feedbackCreateSchema,
  feedbackDeleteSchema,
  feedbackPatchSchema,
  getQuerySchema,
  screenshotRegionSchema,
} from "../src/validation.js";

// Namespace import, as in validation.ts (zod's dual CJS/ESM entry).
const z: typeof zod.z = ("z" in zod ? zod.z : zod) as typeof zod.z;

type JsonSchema = zod.z.core.JSONSchema.BaseSchema;

// ---------------------------------------------------------------------------
// Response schemas — what the operations send, as JSON
// ---------------------------------------------------------------------------

const dateTime = z.iso.datetime();

const annotationResponse = z.object({
  id: z.string(),
  feedbackId: z.string(),
  cssSelector: z.string(),
  xpath: z.string(),
  textSnippet: z.string(),
  elementTag: z.string(),
  elementId: z.string().nullable(),
  textPrefix: z.string(),
  textSuffix: z.string(),
  fingerprint: z.string(),
  neighborText: z.string(),
  anchorKey: z.string().nullable(),
  xPct: z.number(),
  yPct: z.number(),
  wPct: z.number(),
  hPct: z.number(),
  scrollX: z.number(),
  scrollY: z.number(),
  viewportW: z.number(),
  viewportH: z.number(),
  devicePixelRatio: z.number(),
  createdAt: dateTime,
});

const commentPermissions = z.object({ canDelete: z.boolean() });

const commentResponse = z.object({
  id: z.string(),
  feedbackId: z.string(),
  body: z.string(),
  authorName: z.string(),
  authorEmail: z.string(),
  authorRole: z.enum(COMMENT_AUTHOR_ROLES),
  createdAt: dateTime,
  permissions: commentPermissions,
});

const diagnosticsResponse = z.object({
  console: z.array(z.object({ level: z.enum(CONSOLE_DIAGNOSTIC_LEVELS), timestamp: z.string(), message: z.string() })),
  network: z.array(
    z.object({
      url: z.string(),
      method: z.string(),
      status: z.number(),
      durationMs: z.number(),
      timestamp: z.string(),
    }),
  ),
});

const feedbackPermissions = z.object({
  canChangeStatus: z.boolean(),
  canDelete: z.boolean(),
  canComment: z.boolean(),
  canDeleteComment: z.boolean(),
});

const feedbackResponse = z.object({
  id: z.string(),
  type: z.enum(FEEDBACK_TYPES),
  message: z.string(),
  status: z.enum(FEEDBACK_STATUSES),
  projectName: z.string(),
  url: z.string(),
  urlPattern: z.string().nullable(),
  authorName: z.string(),
  authorEmail: z.string(),
  viewport: z.string(),
  userAgent: z.string(),
  resolvedAt: dateTime.nullable(),
  createdAt: dateTime,
  updatedAt: dateTime,
  annotations: z.array(annotationResponse),
  comments: z.array(commentResponse),
  screenshotUrl: z.string().nullable(),
  screenshotRegion: screenshotRegionSchema.nullable(),
  diagnostics: diagnosticsResponse.nullable(),
  permissions: feedbackPermissions,
});

const capabilities = z.object({ comments: z.boolean(), deleteComments: z.boolean() });

const listPermissions = z.object({ canDeleteAll: z.boolean() });

const feedbackListResponse = z.object({
  feedbacks: z.array(feedbackResponse),
  total: z.number().int().min(0),
  protocol: z.number().int().min(1),
  capabilities,
  permissions: listPermissions,
});

const errorResponse = z.object({ error: z.string() });

const validationErrorResponse = z.object({
  errors: z.array(z.object({ field: z.string(), message: z.string() })).max(MAX_VALIDATION_ISSUES),
});

const deletedResponse = z.object({ deleted: z.literal(true) });

// The response schemas describe exactly what the operations serialize: a
// field added to a record, or removed, is a compile error here first.
const _feedbackLock: AssertEqual<
  Prettify<zod.z.infer<typeof feedbackResponse>>,
  Prettify<Serialized<WireFeedback>>
> = true;
void _feedbackLock;
const _commentLock: AssertEqual<
  Prettify<zod.z.infer<typeof commentResponse>>,
  Prettify<Serialized<WireComment>>
> = true;
void _commentLock;
const _listLock: AssertEqual<
  Prettify<Omit<zod.z.infer<typeof feedbackListResponse>, "feedbacks">>,
  Prettify<Omit<WireFeedbackList, "feedbacks">>
> = true;
void _listLock;

/** The response schemas, for the test that parses real handler responses with them. */
export const responseSchemas = {
  feedback: feedbackResponse,
  comment: commentResponse,
  feedbackList: feedbackListResponse,
  error: errorResponse,
  validationError: validationErrorResponse,
  deleted: deletedResponse,
};

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

/**
 * Fills in what the input-mode conversion leaves out. The validation's
 * bounded arrays (`boundedArray`) are a pipe from `unknown[]`, length-checked
 * first, into the typed array: their input side carries `maxItems` and no
 * `items`, which come from the output side. A response timestamp keeps
 * `format: date-time` without the regex spelling it out.
 */
function override(ctx: { zodSchema: zod.z.core.$ZodTypes; jsonSchema: JsonSchema }): void {
  const def = ctx.zodSchema._zod.def;
  if (ctx.jsonSchema.format === "date-time") delete ctx.jsonSchema.pattern;
  if (def.type !== "pipe") return;
  const out = (def.out as zod.z.core.$ZodTypes)._zod.def;
  if ((def.in as zod.z.core.$ZodTypes)._zod.def.type === "array" && out.type === "array") {
    const { $schema: _dialect, ...items } = z.toJSONSchema(out.element, { io: "input", override });
    ctx.jsonSchema.items = items;
  }
}

/** Every component, one registry: requests as the handler accepts them, responses as it sends them. */
function componentSchemas(): Record<string, JsonSchema> {
  const registry = z.registry<{ id: string }>();
  const [deleteOne, deleteAll] = feedbackDeleteSchema.options;
  const components: Record<string, zod.z.core.$ZodType> = {
    FeedbackCreate: feedbackCreateSchema,
    CommentCreate: commentCreateSchema,
    FeedbackPatch: feedbackPatchSchema,
    FeedbackDelete: deleteOne,
    FeedbackDeleteAll: deleteAll,
    CommentDelete: commentDeleteSchema,
    Feedback: feedbackResponse,
    Annotation: annotationResponse,
    Comment: commentResponse,
    CommentPermissions: commentPermissions,
    ScreenshotRegion: screenshotRegionSchema,
    Diagnostics: diagnosticsResponse,
    FeedbackPermissions: feedbackPermissions,
    FeedbackList: feedbackListResponse,
    Capabilities: capabilities,
    FeedbackListPermissions: listPermissions,
    Error: errorResponse,
    ValidationErrors: validationErrorResponse,
    Deleted: deletedResponse,
  };
  for (const [id, schema] of Object.entries(components)) registry.add(schema, { id });
  // Input mode: a request field with a default is optional, and an object
  // whose unknown keys the handler ignores does not forbid them.
  const { schemas } = z.toJSONSchema(registry, {
    io: "input",
    uri: (id) => `#/components/schemas/${id}`,
    override,
  });
  return Object.fromEntries(
    Object.entries(schemas).map(([id, { $schema: _dialect, $id: _id, ...schema }]) => [id, schema]),
  );
}

/** The list endpoint's query parameters, from the schema it validates them with. */
function queryParameters(): Array<Record<string, unknown>> {
  const { properties = {}, required = [] } = z.toJSONSchema(getQuerySchema, { io: "input", override });
  return Object.entries(properties).map(([name, schema]) => ({
    name,
    in: "query",
    required: required.includes(name),
    schema,
    // `statuses=open,in_progress`: the handler splits the value on commas.
    ...(name === "statuses" && {
      style: "form",
      explode: false,
      description: "Statuses to include, comma-separated; takes precedence over `status`.",
    }),
  }));
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

const ref = (id: string) => ({ $ref: `#/components/schemas/${id}` });
const json = (schema: unknown) => ({ "application/json": { schema } });
const response = (description: string, id = "Error") => ({ description, content: json(ref(id)) });
const shared = (id: string) => ({ $ref: `#/components/responses/${id}` });

/** Responses every operation behind the access check can answer. */
const common = {
  "401": shared("Unauthorized"),
  "403": shared("Forbidden"),
  "429": shared("TooManyRequests"),
  "500": shared("InternalServerError"),
};

/** …and those of every operation that reads a JSON body. */
const withBody = {
  "400": shared("BadRequest"),
  "413": shared("PayloadTooLarge"),
  "415": shared("UnsupportedMediaType"),
};

/** The OpenAPI 3.1 document of the protocol `createSitepingHandler` serves. */
export function generateOpenApiDocument(): Record<string, unknown> {
  return {
    openapi: "3.1.0",
    info: {
      title: "SitePing HTTP API",
      version: String(SITEPING_PROTOCOL_VERSION),
      description:
        "The protocol `createSitepingHandler` (`@siteping/server`) serves: one endpoint, mounted at any path " +
        "(`/api/siteping` here, what `npx @siteping/cli init` generates), five methods, JSON bodies. `info.version` " +
        "is the protocol version a list response sends as `protocol`. Error strings are informational: branch on " +
        "the status code. See https://siteping.dev/docs/server#wire-protocol.",
      license: { name: "MIT", identifier: "MIT" },
    },
    "x-siteping-protocol": SITEPING_PROTOCOL_VERSION,
    paths: {
      "/api/siteping": {
        get: {
          operationId: "listFeedbacks",
          summary: "List a project's feedbacks",
          description:
            "A page of feedbacks, newest first, each with its thread and the requester's permissions. Author " +
            "emails are blanked unless the access policy lets the requester read them; `clientId` is never sent.",
          parameters: queryParameters(),
          responses: {
            "200": {
              description: "The page.",
              headers: {
                "Cache-Control": {
                  description: "`private, max-age=5` under the `apiKey` policy, `no-store` under `access`.",
                  schema: { type: "string" },
                },
              },
              content: json(ref("FeedbackList")),
            },
            "400": response("A query parameter failed validation.", "ValidationErrors"),
            ...common,
          },
        },
        post: {
          operationId: "createFeedbackOrComment",
          summary: "Create a feedback, or a comment on one",
          description:
            "Routed by the body: one carrying `feedbackId` posts a comment to that feedback's thread, any other " +
            "creates a feedback. Both are idempotent on `clientId`: a replay answers `201` with the stored record.",
          requestBody: {
            required: true,
            content: json({
              oneOf: [{ ...ref("FeedbackCreate"), not: { required: ["feedbackId"] } }, ref("CommentCreate")],
            }),
          },
          responses: {
            "201": {
              description: "The feedback (fresh or replayed), or the comment.",
              content: json({ oneOf: [ref("Feedback"), ref("Comment")] }),
            },
            ...withBody,
            "404": response("Comment: the feedback does not exist in this project."),
            "409": response(
              "Feedback: its `clientId` is already used by another project. Comment: the thread holds " +
                `${MAX_COMMENTS_PER_FEEDBACK} \`client\` comments, or the comment's \`clientId\` is already used ` +
                "on another feedback. None is worth a retry.",
            ),
            "422": shared("ValueTooLong"),
            "501": response("Comment: the store behind the endpoint keeps no comments."),
            ...common,
          },
        },
        patch: {
          operationId: "updateFeedbackStatus",
          summary: "Change a feedback's status",
          description: "`resolvedAt` follows: set when the status becomes `resolved` or `wont_fix`, cleared otherwise.",
          requestBody: { required: true, content: json(ref("FeedbackPatch")) },
          responses: {
            "200": response("The updated feedback.", "Feedback"),
            ...withBody,
            "404": response("The feedback does not exist in this project."),
            ...common,
          },
        },
        delete: {
          operationId: "deleteFeedbackOrComment",
          summary: "Delete a feedback, every feedback of a project, or a comment",
          description:
            "Routed by the body: one carrying `commentId` deletes that comment from the feedback's thread, any " +
            "other deletes feedback. The body is required: a proxy that strips `DELETE` bodies makes it a `400`.",
          requestBody: {
            required: true,
            content: json({
              oneOf: [
                { ...ref("FeedbackDelete"), not: { required: ["commentId"] } },
                { ...ref("FeedbackDeleteAll"), not: { required: ["commentId"] } },
                ref("CommentDelete"),
              ],
            }),
          },
          responses: {
            "200": response("Deleted.", "Deleted"),
            ...withBody,
            "404": response("The feedback, or the comment, does not exist in this project."),
            "501": response("Comment: the store behind the endpoint keeps no comments."),
            "502": response("An `onDeleting` hook threw: nothing was deleted."),
            ...common,
          },
        },
        options: {
          operationId: "preflight",
          summary: "CORS preflight",
          security: [],
          responses: {
            "204": {
              description:
                "CORS headers for an origin listed in `allowedOrigins`; none otherwise, and the browser blocks " +
                "the request.",
            },
          },
        },
      },
    },
    components: {
      schemas: componentSchemas(),
      responses: {
        BadRequest: {
          description:
            "The body is not JSON, failed validation (the first issues, as `errors`), or holds too many annotations.",
          content: json({ oneOf: [ref("Error"), ref("ValidationErrors")] }),
        },
        Unauthorized: response("No credentials, or wrong ones, for a method the policy does not open."),
        Forbidden: response(
          "The access policy refused the action, or, under `access`, a mutation came from an origin outside " +
            "`allowedOrigins`.",
        ),
        PayloadTooLarge: response("The body is over `maxBodyBytes` (4 MiB by default)."),
        UnsupportedMediaType: response("Under `access`, a mutation without `Content-Type: application/json`."),
        ValueTooLong: response("A value is longer than the store's column holds: not worth a retry."),
        TooManyRequests: {
          description:
            "Never sent by `@siteping/server`, which leaves rate limiting to the platform: a limiter in front of " +
            "it may. Clients retry after `Retry-After`.",
        },
        InternalServerError: response("An unexpected failure, logged; the message `describeError` returns, if any."),
      },
      securitySchemes: {
        apiKey: {
          type: "http",
          scheme: "bearer",
          description:
            "The `apiKey` policy: `Authorization: Bearer <apiKey>`, required on every method `publicEndpoints` " +
            "does not open. A custom `access` policy reads whatever credential it chooses (a session cookie, a JWT).",
        },
      },
    },
    // Optional: which methods need the key depends on the handler's options.
    security: [{}, { apiKey: [] }],
  };
}

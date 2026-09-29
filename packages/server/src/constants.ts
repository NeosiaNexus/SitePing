import { MAX_COMMENTS_PER_FEEDBACK } from "@siteping/core";

/** Most annotations accepted on one feedback (the create schema enforces it too). */
export const MAX_ANNOTATIONS_PER_FEEDBACK = 50;

/**
 * Default `maxBodyBytes`: twice the largest submission the validation
 * accepts — a 1.5 MB screenshot, 50 annotations and full diagnostics come
 * to about 2 MB.
 */
export const DEFAULT_MAX_BODY_BYTES = 4 * 1024 * 1024;

/**
 * Most issues a validation 400 lists. Fifty annotations of `{}` alone make a
 * thousand: listing them all would answer a small body with a large one.
 */
export const MAX_VALIDATION_ISSUES = 20;

/**
 * Most `authorize` dry runs of one response in flight at once. A page of 100
 * asks 401 of them, and a database policy's pool holds a handful of
 * connections: unbounded, they would queue there, time out, and read as refusals.
 */
export const DRY_RUN_CONCURRENCY = 8;

/**
 * `error` strings of the HTTP API. Part of the wire contract: the widget, the
 * dashboard and existing `@siteping/adapter-prisma` consumers match on some.
 */
export const ERROR_MESSAGES = {
  invalidJson: "Invalid JSON",
  bodyTooLarge: "Request body too large",
  unauthorized: "Unauthorized",
  apiKeyRequiredForDestructive: "apiKey required for destructive operations",
  forbidden: "Forbidden",
  unsupportedMediaType: "Content-Type must be application/json",
  feedbackNotFound: "Feedback not found",
  commentNotFound: "Comment not found",
  clientIdUsedByAnotherProject: "clientId already used by another project",
  clientIdUsedByAnotherFeedback: "clientId already used on another feedback",
  commentsUnsupported: "Comments are not supported by this store",
  tooManyComments: `Too many client comments on this feedback (max ${MAX_COMMENTS_PER_FEEDBACK})`,
  tooManyAnnotations: `Too many annotations (max ${MAX_ANNOTATIONS_PER_FEEDBACK})`,
  valueTooLong: "A value is too long for this server's database",
  deletionAborted: "Deletion aborted: a linked resource could not be cleaned up",
  internalServerError: "Internal server error",
} as const;

/** Query parameters the list endpoint reads (everything else is ignored). */
export const LIST_QUERY_KEYS = [
  "projectName",
  "page",
  "limit",
  "type",
  "status",
  "statuses",
  "search",
  "url",
  "urlPattern",
] as const;

/** Most annotations accepted on one feedback (the create schema enforces it too). */
export const MAX_ANNOTATIONS_PER_FEEDBACK = 50;

/**
 * `error` strings of the HTTP API. Part of the wire contract: the widget, the
 * dashboard and existing `@siteping/adapter-prisma` consumers match on some.
 */
export const ERROR_MESSAGES = {
  invalidJson: "Invalid JSON",
  unauthorized: "Unauthorized",
  apiKeyRequiredForDestructive: "apiKey required for destructive operations",
  forbidden: "Forbidden",
  unsupportedMediaType: "Content-Type must be application/json",
  feedbackNotFound: "Feedback not found",
  clientIdUsedByAnotherProject: "clientId already used by another project",
  tooManyAnnotations: `Too many annotations (max ${MAX_ANNOTATIONS_PER_FEEDBACK})`,
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

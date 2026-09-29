/** Prefix of every error message and log line emitted by the Drizzle store. */
export const DRIZZLE_STORE_MESSAGE_PREFIX = "[siteping] DrizzleStore";

/** Store mutations whose database failures surface as `StorePersistenceError`. */
export type DrizzleStoreMutation =
  | "createFeedback"
  | "updateFeedback"
  | "deleteFeedback"
  | "deleteAllFeedbacks"
  | "addComment"
  | "deleteComment";

/**
 * Start of the message of Drizzle's `DrizzleQueryError`, which goes on with
 * the statement and every bound parameter.
 */
export const DRIZZLE_QUERY_ERROR_MESSAGE_PREFIX = "Failed query:";

/**
 * Own properties of a driver error that tell what failed without quoting
 * the statement or its values — the only ones the store keeps: Node.js
 * system errors (a lost connection), pg-protocol errors (node-postgres,
 * PGlite, Neon), postgres.js errors and libSQL errors. PostgreSQL's
 * `detail` is left out: for a NOT NULL or CHECK violation it holds the
 * whole failing row.
 */
export const DRIVER_ERROR_DIAGNOSTIC_FIELDS = [
  "code",
  "errno",
  "syscall",
  "severity",
  "schema",
  "table",
  "column",
  "dataType",
  "constraint",
  "routine",
  "severity_local",
  "schema_name",
  "table_name",
  "column_name",
  "constraint_name",
  "extendedCode",
  "rawCode",
] as const;

/** Name of the scalar "largest argument" SQL function in each dialect. */
export type GreatestValueFunction = "GREATEST" | "MAX";

/**
 * Scalar "largest argument" function per dialect — keeps a stamped
 * `updatedAt` from landing before the row's own timestamps.
 */
export const GREATEST_VALUE_FUNCTION = {
  postgres: "GREATEST",
  sqlite: "MAX",
} as const satisfies Record<string, GreatestValueFunction>;

/** CTE holding the feedback row the single-statement PostgreSQL insert actually wrote (none on a `clientId` conflict). */
export const INSERTED_FEEDBACK_CTE_ALIAS = "siteping_inserted_feedback";

/** CTE of the PostgreSQL annotation insert chained to {@link INSERTED_FEEDBACK_CTE_ALIAS}. */
export const INSERTED_ANNOTATIONS_CTE_ALIAS = "siteping_inserted_annotations";

/** Alias of the `VALUES` list an insert-select reads its annotation or comment rows from. */
export const VALUES_LIST_ALIAS = "siteping_values";

/**
 * Longest identifier PostgreSQL keeps (`NAMEDATALEN` - 1), in bytes: it
 * silently truncates longer table, index and constraint names.
 */
export const POSTGRES_IDENTIFIER_MAX_BYTES = 63;

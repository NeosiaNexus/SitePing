/** Default table holding screenshot bytes when they are stored in the database. */
export const DEFAULT_SCREENSHOTS_TABLE_NAME = "siteping_screenshots";

/** Backend name of the PostgreSQL screenshot store, used in error messages. */
export const POSTGRES_OBJECT_STORE_NAME = "PostgreSQL";

/** Backend name of the libSQL (Turso) screenshot store, used in error messages. */
export const LIBSQL_OBJECT_STORE_NAME = "libSQL";

/**
 * Column names of the screenshots table — the schema contract every Drizzle
 * dialect (PostgreSQL, libSQL) must create identically, so migrations and
 * direct SQL see the same columns whatever the backend.
 */
export const SCREENSHOTS_TABLE_COLUMNS = {
  key: "key",
  contentType: "content_type",
  bytes: "bytes",
  createdAt: "created_at",
} as const satisfies Record<string, string>;

/**
 * Message of the `TypeError` raised when a driver returns something other
 * than binary data (`Buffer`, `Uint8Array` or `ArrayBuffer`) for the bytes column.
 *
 * @param receivedType - `typeof` of the value the driver returned.
 * @returns The actionable error message, naming the received type.
 */
export function formatUnexpectedBinaryColumnDataMessage(receivedType: string): string {
  return `[siteping] database screenshot store: expected binary column data (Buffer, Uint8Array or ArrayBuffer), got ${receivedType}`;
}

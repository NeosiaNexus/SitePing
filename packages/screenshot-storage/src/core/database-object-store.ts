import { ObjectStoreRequestError } from "./http.js";
import type { ScreenshotObject, ScreenshotObjectStore } from "./object-store.js";
import { createPublicUrlMapping } from "./public-url.js";

/** A screenshot row as read back from the database table, without its key. */
export type ScreenshotRow = Omit<ScreenshotObject, "key">;

/**
 * The dialect-specific queries over the screenshots table (keyed by `key`).
 * Each Drizzle dialect (PostgreSQL, libSQL) supplies its own; the lifecycle
 * around them lives once in {@link createDatabaseObjectStore}.
 */
export interface ScreenshotTableGateway {
  /** Insert a new row. Keys are unique, so an existing row is never overwritten (the primary key rejects it). */
  insertRow(object: ScreenshotObject): Promise<void>;
  /** Delete the row for `key`; a no-op when it is absent. */
  deleteRowByKey(key: string): Promise<void>;
  /** The row for `key`, or `undefined` when there is none. */
  findRowByKey(key: string): Promise<ScreenshotRow | undefined>;
}

export interface DatabaseObjectStoreOptions {
  /** Backend name, used in error messages. */
  name: string;
  /** Where `createScreenshotServeHandler` is mounted. */
  publicBaseUrl: string;
  /** Queries over the screenshots table in the backend's SQL dialect. */
  gateway: ScreenshotTableGateway;
}

/**
 * `code: message` of the error a failed query ends in — the driver's own —
 * and nothing else of it. Drizzle's `DrizzleQueryError` quotes every bound
 * value in its message and `params`, and PGlite keeps them on its own error
 * too: the whole screenshot, which the stores log with the failure. Only the
 * first line of the message is kept, where no driver quotes a parameter.
 *
 * @param error - What a gateway query threw.
 */
function describeQueryError(error: unknown): string {
  const chain = new Set<unknown>([error]);
  let innermost = error;
  while (innermost instanceof Error && innermost.cause instanceof Error && !chain.has(innermost.cause)) {
    innermost = innermost.cause;
    chain.add(innermost);
  }
  const [message = ""] = (innermost instanceof Error ? innermost.message : String(innermost)).split("\n", 1);
  const code = (innermost as { code?: unknown } | null)?.code;
  return typeof code === "string" || typeof code === "number" ? `${code}: ${message}` : message;
}

/**
 * Object store over a database table — shared by every Drizzle dialect so
 * the `put` / `remove` / `get` lifecycle and the URL ↔ key mapping cannot
 * diverge between them. Objects are served through `createScreenshotServeHandler`.
 *
 * A failed query throws an `ObjectStoreRequestError` naming the backend, the
 * statement and the key, whose `cause` describes the driver's error without
 * the query's parameters (see {@link describeQueryError}).
 */
export function createDatabaseObjectStore({
  name,
  publicBaseUrl,
  gateway,
}: DatabaseObjectStoreOptions): ScreenshotObjectStore {
  const query = async <T>(statement: string, key: string, run: () => Promise<T>): Promise<T> => {
    try {
      return await run();
    } catch (error) {
      throw new ObjectStoreRequestError(name, statement, key, null, { cause: describeQueryError(error) });
    }
  };
  return {
    name,
    ...createPublicUrlMapping(publicBaseUrl),
    async put({ key, bytes, contentType }) {
      await query("INSERT", key, () => gateway.insertRow({ key, bytes, contentType }));
    },
    async remove(key) {
      await query("DELETE", key, () => gateway.deleteRowByKey(key));
    },
    async get(key) {
      return (await query("SELECT", key, () => gateway.findRowByKey(key))) ?? null;
    },
  };
}

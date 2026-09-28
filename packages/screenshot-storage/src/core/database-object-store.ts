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
 * Object store over a database table — shared by every Drizzle dialect so
 * the `put` / `remove` / `get` lifecycle and the URL ↔ key mapping cannot
 * diverge between them. Objects are served through `createScreenshotServeHandler`.
 */
export function createDatabaseObjectStore({
  name,
  publicBaseUrl,
  gateway,
}: DatabaseObjectStoreOptions): ScreenshotObjectStore {
  return {
    name,
    ...createPublicUrlMapping(publicBaseUrl),
    async put({ key, bytes, contentType }) {
      await gateway.insertRow({ key, bytes, contentType });
    },
    async remove(key) {
      await gateway.deleteRowByKey(key);
    },
    async get(key) {
      return (await gateway.findRowByKey(key)) ?? null;
    },
  };
}

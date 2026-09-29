import { is } from "drizzle-orm";
import { LibSQLDatabase } from "drizzle-orm/libsql/driver-core";
import { DRIZZLE_STORE_MESSAGE_PREFIX } from "../constants/errors.js";
import { primaryOf } from "../shared/replicas.js";
import { DrizzleSitepingStore, type DrizzleStore, type DrizzleStoreOptions } from "../shared/store.js";
import { type AnyLibSQLDatabase, createLibSQLGateway } from "./gateway.js";
import { createSitepingSqliteTables, type SitepingSqliteTables } from "./tables.js";

export type { FeedbackRecord, ScreenshotStorage, SitepingStore } from "@siteping/core";
export {
  isStorePersistence,
  StoreDuplicateError,
  StoreLimitError,
  StoreNotFoundError,
  StorePersistenceError,
} from "@siteping/core";
export { DEFAULT_SITEPING_TABLE_NAMES, type SitepingTableNames } from "../constants/table-names.js";
export type { DrizzleStore, DrizzleStoreLogger, DrizzleStoreOptions } from "../shared/store.js";
export type { AnyLibSQLDatabase } from "./gateway.js";
export { createSitepingSqliteTables, type SitepingSqliteTables } from "./tables.js";

export interface LibSQLSitepingStoreOptions extends DrizzleStoreOptions {
  /** Tables built with `createSitepingSqliteTables` — pass them when you customized the names. */
  tables?: SitepingSqliteTables | undefined;
}

/**
 * `SitepingStore` on Turso / libSQL through Drizzle ORM. Given a database
 * built with `withReplicas`, it runs everything on the primary.
 *
 * @throws `TypeError` when `db` does not come from `drizzle-orm/libsql`.
 *   Another SQLite driver's database (Cloudflare D1…) passes the type check
 *   where `@libsql/client`'s types do not resolve, and would fail only at run
 *   time, on the data: D1 binds at most 100 parameters per query, and a
 *   feedback with 5 annotations binds more.
 *
 * @example
 * ```ts
 * import { drizzle } from "drizzle-orm/libsql";
 * import { createLibSQLSitepingStore } from "@siteping/adapter-drizzle/libsql";
 *
 * const db = drizzle({ connection: { url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! } });
 * const store = createLibSQLSitepingStore(db, { screenshotStorage });
 * ```
 */
export function createLibSQLSitepingStore(
  db: AnyLibSQLDatabase,
  options: LibSQLSitepingStoreOptions = {},
): DrizzleStore {
  const primary = primaryOf(db);
  if (!is(primary, LibSQLDatabase)) {
    throw new TypeError(
      `${DRIZZLE_STORE_MESSAGE_PREFIX}: createLibSQLSitepingStore needs a database from drizzle-orm/libsql — other SQLite drivers (Cloudflare D1, better-sqlite3…) are not supported`,
    );
  }
  const { tables = createSitepingSqliteTables(), ...storeOptions } = options;
  return new DrizzleSitepingStore(createLibSQLGateway(primary, tables), storeOptions);
}

import { DrizzleSitepingStore, type DrizzleStore, type DrizzleStoreOptions } from "../shared/store.js";
import { type AnyPgDatabase, createPgGateway } from "./gateway.js";
import { createSitepingPgTables, type SitepingPgTables } from "./tables.js";

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
export type { AnyPgDatabase } from "./gateway.js";
export { createSitepingPgTables, type SitepingPgTables } from "./tables.js";

export interface PgSitepingStoreOptions extends DrizzleStoreOptions {
  /** Tables built with `createSitepingPgTables` — pass them when you customized the names. */
  tables?: SitepingPgTables | undefined;
}

/**
 * `SitepingStore` on PostgreSQL through Drizzle ORM.
 *
 * @example
 * ```ts
 * import { drizzle } from "drizzle-orm/node-postgres";
 * import { createPgSitepingStore } from "@siteping/adapter-drizzle/pg";
 *
 * const store = createPgSitepingStore(drizzle(process.env.DATABASE_URL!), { screenshotStorage });
 * ```
 */
export function createPgSitepingStore(db: AnyPgDatabase, options: PgSitepingStoreOptions = {}): DrizzleStore {
  const { tables = createSitepingPgTables(), ...storeOptions } = options;
  return new DrizzleSitepingStore(createPgGateway(db, tables), storeOptions);
}

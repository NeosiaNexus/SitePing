import { PGlite } from "@electric-sql/pglite";
import { createClient } from "@libsql/client";
import { pushSchema, pushSQLiteSchema } from "drizzle-kit/api";
import { sql } from "drizzle-orm";
import { drizzle as drizzleLibSQL } from "drizzle-orm/libsql";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import type { SitepingTableNames } from "../src/constants/table-names.js";
import { type AnyLibSQLDatabase, createSitepingSqliteTables } from "../src/libsql/index.js";
import { type AnyPgDatabase, createSitepingPgTables } from "../src/pg/index.js";

/**
 * Real database engines for the tests, in process — no mocks, no network:
 * PGlite is PostgreSQL compiled to WASM, and libSQL runs an in-memory
 * database (one connection, which `@libsql/client` shares between calls and
 * an interactive transaction would hold until it settles). Tables are
 * created by drizzle-kit from the adapter's own table definitions, so the
 * schema under test is exactly what users migrate.
 */

export interface TestDatabase<Database> {
  db: Database;
  /** Empty every SitePing table between tests. */
  reset(): Promise<void>;
  /** The same database behind a driver that rejects responses larger than `maxResponseBytes`, as HTTP drivers do. */
  withResponseSizeLimit(maxResponseBytes: number): Database;
  /** The same database behind a driver whose query calls all go through `intercept`. */
  withDriverCallInterceptor(intercept: DriverCallInterceptor): Database;
  close(): Promise<void>;
}

/**
 * Sees every driver call that returns query results: the SQL it sends and a
 * thunk that runs it on the real engine. Returning `run()` passes the call
 * through; the interceptor may do work before or after it, or reject instead.
 */
export type DriverCallInterceptor = (statementSql: string, run: () => Promise<unknown>) => Promise<unknown>;

export async function createPgTestDatabase(names?: SitepingTableNames): Promise<TestDatabase<AnyPgDatabase>> {
  const client = new PGlite();
  const db = drizzlePglite(client);
  const tables = createSitepingPgTables(names);
  const { apply } = await pushSchema(tables, db as never);
  await apply();
  return {
    db,
    async reset() {
      await db.execute(sql`TRUNCATE ${tables.sitepingAnnotations}, ${tables.sitepingFeedbacks}`);
    },
    withResponseSizeLimit: (maxResponseBytes) =>
      drizzlePglite({ client: withResponseSizeLimit(client, maxResponseBytes, PGLITE_RESULT_METHODS) }),
    withDriverCallInterceptor: (intercept) =>
      drizzlePglite({ client: interceptDriverCalls(client, PGLITE_RESULT_METHODS, intercept) }),
    close: () => client.close(),
  };
}

export async function createLibSQLTestDatabase(names?: SitepingTableNames): Promise<TestDatabase<AnyLibSQLDatabase>> {
  const client = createClient({ url: ":memory:" });
  const db = drizzleLibSQL(client);
  const tables = createSitepingSqliteTables(names);
  const { apply } = await pushSQLiteSchema(tables, db);
  await apply();
  return {
    db,
    async reset() {
      await db.delete(tables.sitepingAnnotations);
      await db.delete(tables.sitepingFeedbacks);
    },
    withResponseSizeLimit: (maxResponseBytes) =>
      drizzleLibSQL({ client: withResponseSizeLimit(client, maxResponseBytes, LIBSQL_RESULT_METHODS) }),
    withDriverCallInterceptor: (intercept) =>
      drizzleLibSQL({ client: interceptDriverCalls(client, LIBSQL_RESULT_METHODS, intercept) }),
    async close() {
      client.close();
    },
  };
}

/**
 * The same database, minus interactive transactions: `db.transaction(callback)`
 * throws exactly as it does on drivers without them (`drizzle-orm/neon-http`,
 * Cloudflare D1…). No such driver runs locally, so this test-owned wrapper
 * stands in for one while every statement still executes on the real engine.
 */
export function withoutInteractiveTransactions<Database extends object>(db: Database): Database {
  return new Proxy(db, {
    get(target, property, receiver) {
      if (property === "transaction") {
        return () => {
          throw new Error("No transactions support in this driver (interactive transactions are unavailable)");
        };
      }
      return Reflect.get(target, property, receiver);
    },
  });
}

/** Driver methods that return query results, per client. */
const PGLITE_RESULT_METHODS = ["query"] as const;
const LIBSQL_RESULT_METHODS = ["execute", "batch"] as const;

/** Serialized size of the rows a driver call returned (one result or a batch of them). */
function resultRowsBytes(result: unknown): number {
  const results = Array.isArray(result) ? result : [result];
  const rows = results.map((single) => (single as { rows?: unknown } | null)?.rows ?? []);
  return JSON.stringify(rows, (_key, value) => (typeof value === "bigint" ? value.toString() : value)).length;
}

/**
 * SQL text of a driver call's first argument: a string (PGlite `query`,
 * libSQL `execute`), a `{ sql }` statement, or a libSQL `batch` of them.
 */
function statementSql(statement: unknown): string {
  if (typeof statement === "string") return statement;
  if (Array.isArray(statement)) return statement.map(statementSql).join(";\n");
  const text = (statement as { sql?: unknown } | null)?.sql;
  return typeof text === "string" ? text : "";
}

/**
 * The same client, with every call of `resultMethods` routed through
 * `intercept` while still executing on the real engine. Test-owned: it
 * stands in for drivers or timings that cannot be produced locally.
 */
function interceptDriverCalls<Client extends object>(
  client: Client,
  resultMethods: readonly string[],
  intercept: DriverCallInterceptor,
): Client {
  return new Proxy(client, {
    get(target, property) {
      const value = Reflect.get(target, property, target);
      if (typeof value !== "function") return value;
      const bound = value.bind(target);
      if (typeof property !== "string" || !resultMethods.includes(property)) return bound;
      return (...args: unknown[]) => intercept(statementSql(args[0]), () => bound(...args));
    },
  });
}

/**
 * The same client, with the response-size cap of HTTP database drivers
 * (Neon HTTP, Turso over HTTP…): a call whose rows exceed `maxResponseBytes`
 * rejects after running. No such driver runs locally, so this test-owned
 * wrapper stands in for one while every statement executes on the real engine.
 */
function withResponseSizeLimit<Client extends object>(
  client: Client,
  maxResponseBytes: number,
  resultMethods: readonly string[],
): Client {
  return interceptDriverCalls(client, resultMethods, async (_statementSql, run) => {
    const result = await run();
    const bytes = resultRowsBytes(result);
    if (bytes > maxResponseBytes) {
      throw new Error(`Response too large: ${bytes} bytes exceed the ${maxResponseBytes}-byte driver limit`);
    }
    return result;
  });
}

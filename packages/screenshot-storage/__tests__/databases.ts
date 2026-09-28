import { PGlite } from "@electric-sql/pglite";
import { createClient } from "@libsql/client";
import { pushSchema, pushSQLiteSchema } from "drizzle-kit/api";
import { drizzle as drizzleLibSQL } from "drizzle-orm/libsql";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { createSitepingScreenshotsSqliteTable } from "../src/backends/drizzle-libsql.js";
import { createSitepingScreenshotsPgTable } from "../src/backends/drizzle-pg.js";

/**
 * Real database engines, in process — PGlite (PostgreSQL in WASM) and an
 * in-memory libSQL database — with the tables created by drizzle-kit from
 * the package's own definitions, so the schema under test is exactly what
 * users migrate.
 */

export async function createPgScreenshotsDatabase() {
  const client = new PGlite();
  const db = drizzlePglite(client);
  const table = createSitepingScreenshotsPgTable();
  await (await pushSchema({ table }, db as never)).apply();
  return { db, table, close: () => client.close() };
}

export async function createLibSQLScreenshotsDatabase() {
  const client = createClient({ url: ":memory:" });
  const db = drizzleLibSQL(client);
  const table = createSitepingScreenshotsSqliteTable();
  await (await pushSQLiteSchema({ table }, db)).apply();
  return { db, table, close: async () => client.close() };
}

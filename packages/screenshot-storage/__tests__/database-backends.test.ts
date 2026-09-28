import { eq } from "drizzle-orm";
import { afterAll, beforeAll } from "vitest";
import { createLibSQLScreenshotObjectStore } from "../src/drizzle-libsql/index.js";
import { createPgScreenshotObjectStore } from "../src/drizzle-pg/index.js";
import { describeBackendContract, PUBLIC_BASE_URL } from "./backend-contract.js";
import { createLibSQLScreenshotsDatabase, createPgScreenshotsDatabase } from "./databases.js";

// One engine per database for the whole file (starting PGlite and pushing the
// schema per test is slow); every test starts from an empty table.
let pg: Awaited<ReturnType<typeof createPgScreenshotsDatabase>>;
let libsql: Awaited<ReturnType<typeof createLibSQLScreenshotsDatabase>>;
beforeAll(async () => {
  [pg, libsql] = await Promise.all([createPgScreenshotsDatabase(), createLibSQLScreenshotsDatabase()]);
});
afterAll(async () => {
  await Promise.all([pg.close(), libsql.close()]);
});

describeBackendContract({
  name: "PostgreSQL (Drizzle)",
  servedByApp: true,
  async open() {
    const { db, table } = pg;
    await db.delete(table);
    return {
      objectStore: createPgScreenshotObjectStore(db, { publicBaseUrl: PUBLIC_BASE_URL, table }),
      storedBytes: async (key) => (await db.select().from(table).where(eq(table.key, key)))[0]?.bytes ?? null,
    };
  },
});

describeBackendContract({
  name: "libSQL (Drizzle)",
  servedByApp: true,
  async open() {
    const { db, table } = libsql;
    await db.delete(table);
    return {
      objectStore: createLibSQLScreenshotObjectStore(db, { publicBaseUrl: PUBLIC_BASE_URL, table }),
      storedBytes: async (key) => (await db.select().from(table).where(eq(table.key, key)))[0]?.bytes ?? null,
    };
  },
});

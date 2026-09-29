import { inspect } from "node:util";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createLibSQLScreenshotObjectStore,
  createSitepingScreenshotsSqliteTable,
} from "../src/backends/drizzle-libsql.js";
import { createPgScreenshotObjectStore, createSitepingScreenshotsPgTable } from "../src/backends/drizzle-pg.js";
import { createScreenshotStorage, isObjectStoreRequestError } from "../src/index.js";
import { describeBackendContract, PUBLIC_BASE_URL, silentLogger, UPLOAD_CONTEXT } from "./backend-contract.js";
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

/** Random bytes, which neither PostgreSQL's TOAST compression nor anything else can shrink. */
function incompressibleBytes(length: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(length);
  const maxRandomValuesLength = 65_536;
  for (let offset = 0; offset < length; offset += maxRandomValuesLength) {
    crypto.getRandomValues(bytes.subarray(offset, offset + maxRandomValuesLength));
  }
  return bytes;
}

describe("database backends — the largest screenshot", () => {
  // The default maxBytes: PostgreSQL moves a bytea this large out of the row (TOAST)
  // and SQLite stores it in overflow pages; both must hand back every byte.
  const largest = incompressibleBytes(1_125_000);
  const dataUrl = `data:image/png;base64,${Buffer.from(largest).toString("base64")}`;

  it.each([
    [
      "PostgreSQL (Drizzle)",
      () => createPgScreenshotObjectStore(pg.db, { publicBaseUrl: PUBLIC_BASE_URL, table: pg.table }),
    ],
    [
      "libSQL (Drizzle)",
      () => createLibSQLScreenshotObjectStore(libsql.db, { publicBaseUrl: PUBLIC_BASE_URL, table: libsql.table }),
    ],
  ])("round-trips a screenshot of the default size limit through %s, byte for byte", async (_name, open) => {
    const objectStore = open();
    const { url } = await createScreenshotStorage(objectStore, { logger: silentLogger() }).upload(
      dataUrl,
      UPLOAD_CONTEXT,
    );

    const stored = await objectStore.get?.(objectStore.keyFromUrl(url) ?? "");

    expect(stored?.contentType).toBe("image/png");
    expect(stored?.bytes.length).toBe(largest.length);
    expect(Buffer.from(stored?.bytes ?? []).equals(Buffer.from(largest))).toBe(true);
  });
});

describe("database backends — a failed query", () => {
  // The table was never migrated: every query fails, with a driver error that
  // quotes the bound parameters — the whole screenshot — unless it is scrubbed.
  const image = new Uint8Array(200_000).fill(0x41);
  const dataUrl = `data:image/png;base64,${Buffer.from(image).toString("base64")}`;
  const notMigrated = "siteping_not_migrated";

  it.each([
    [
      "PostgreSQL (Drizzle)",
      () =>
        createPgScreenshotObjectStore(pg.db, {
          publicBaseUrl: PUBLIC_BASE_URL,
          table: createSitepingScreenshotsPgTable(notMigrated),
        }),
      `42P01: relation "${notMigrated}" does not exist`,
    ],
    [
      "libSQL (Drizzle)",
      () =>
        createLibSQLScreenshotObjectStore(libsql.db, {
          publicBaseUrl: PUBLIC_BASE_URL,
          table: createSitepingScreenshotsSqliteTable(notMigrated),
        }),
      `SQLITE_ERROR: no such table: ${notMigrated}`,
    ],
  ])("%s reports it by statement and key, without the query's parameters", async (_name, open, driverError) => {
    const logger = silentLogger();

    const failure = await createScreenshotStorage(open(), { logger })
      .upload(dataUrl, UPLOAD_CONTEXT)
      .catch((error: unknown) => error);

    expect(isObjectStoreRequestError(failure)).toBe(true);
    expect(failure).toMatchObject({
      message: expect.stringMatching(/ INSERT siteping-[a-f0-9]{32}\.png failed$/),
      cause: driverError,
    });
    // What a store logs: the upload failure, and the warning of the reclaim that failed too.
    const logged = inspect([failure, logger.warn.mock.calls], { depth: null });
    expect(logged).toContain("could not reclaim an uncertain upload");
    expect(logged).not.toContain("AAAAAAAA"); // node-postgres and PGlite: the bytes as text
    expect(logged).not.toContain("65,65,65"); // libSQL: the bytes as decimals
    expect(logged.length).toBeLessThan(20_000);
  });
});

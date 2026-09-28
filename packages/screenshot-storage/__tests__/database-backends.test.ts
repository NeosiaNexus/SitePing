import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createLibSQLScreenshotObjectStore } from "../src/backends/drizzle-libsql.js";
import { createPgScreenshotObjectStore } from "../src/backends/drizzle-pg.js";
import { createScreenshotStorage } from "../src/index.js";
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

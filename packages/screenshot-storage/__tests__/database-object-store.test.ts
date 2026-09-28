import { describe, expect, it } from "vitest";
import {
  createDatabaseObjectStore,
  type ScreenshotRow,
  type ScreenshotTableGateway,
} from "../src/core/database-object-store.js";
import type { ScreenshotObject } from "../src/core/object-store.js";

const PUBLIC_BASE_URL = "https://app.example.com/api/siteping/screenshots";

/** A table held in a `Map`, enforcing the primary key like the real dialects do. */
function createInMemoryTableGateway(): ScreenshotTableGateway & { rows: Map<string, ScreenshotRow> } {
  const rows = new Map<string, ScreenshotRow>();
  return {
    rows,
    async insertRow({ key, bytes, contentType }: ScreenshotObject) {
      if (rows.has(key)) throw new Error(`duplicate primary key: ${key}`);
      rows.set(key, { bytes, contentType });
    },
    async deleteRowByKey(key) {
      rows.delete(key);
    },
    async findRowByKey(key) {
      return rows.get(key);
    },
  };
}

describe("createDatabaseObjectStore", () => {
  const bytes = new Uint8Array([1, 2, 3]);

  it("stores, reads back and removes rows through the dialect gateway", async () => {
    const gateway = createInMemoryTableGateway();
    const store = createDatabaseObjectStore({ name: "test-db", publicBaseUrl: PUBLIC_BASE_URL, gateway });

    await store.put({ key: "shot.png", bytes, contentType: "image/png" });
    expect(await store.get?.("shot.png")).toEqual({ bytes, contentType: "image/png" });

    await store.remove("shot.png");
    expect(gateway.rows.size).toBe(0);
    await expect(store.remove("shot.png")).resolves.toBeUndefined();
  });

  it("returns null for a missing row", async () => {
    const store = createDatabaseObjectStore({
      name: "test-db",
      publicBaseUrl: PUBLIC_BASE_URL,
      gateway: createInMemoryTableGateway(),
    });
    expect(await store.get?.("missing.png")).toBeNull();
  });

  it("propagates the gateway's rejection of a duplicate key instead of overwriting", async () => {
    const gateway = createInMemoryTableGateway();
    const store = createDatabaseObjectStore({ name: "test-db", publicBaseUrl: PUBLIC_BASE_URL, gateway });

    await store.put({ key: "shot.png", bytes, contentType: "image/png" });
    await expect(store.put({ key: "shot.png", bytes: new Uint8Array([9]), contentType: "image/webp" })).rejects.toThrow(
      "duplicate primary key",
    );
    expect(gateway.rows.get("shot.png")).toEqual({ bytes, contentType: "image/png" });
  });

  it("names the backend and maps keys to URLs under the public base URL", () => {
    const store = createDatabaseObjectStore({
      name: "test-db",
      publicBaseUrl: `${PUBLIC_BASE_URL}/`,
      gateway: createInMemoryTableGateway(),
    });
    expect(store.name).toBe("test-db");
    const url = store.urlFor("a b.png");
    expect(url).toBe(`${PUBLIC_BASE_URL}/a%20b.png`);
    expect(store.keyFromUrl(url)).toBe("a b.png");
    expect(store.keyFromUrl("https://elsewhere.example.com/a.png")).toBeNull();
  });
});

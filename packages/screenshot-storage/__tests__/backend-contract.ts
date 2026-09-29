import { describe, expect, it, vi } from "vitest";
import {
  createScreenshotServeHandler,
  createScreenshotStorage,
  ObjectStoreRequestError,
  type ScreenshotObjectStore,
  ScreenshotUploadRejectedError,
} from "../src/index.js";

/** A real 1×1 JPEG. */
export const JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
export const JPEG_DATA_URL = `data:image/jpeg;base64,${JPEG_BASE64}`;
export const JPEG_BYTES = Uint8Array.from(atob(JPEG_BASE64), (character) => character.charCodeAt(0));
/** A real 1×1 GIF — a type outside the defaults. */
export const GIF_DATA_URL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
export const PUBLIC_BASE_URL = "https://app.example.com/api/siteping/screenshots";
export const UPLOAD_CONTEXT = { feedbackId: "client-supplied-id", mimeType: "image/jpeg" };
export const silentLogger = () => ({ warn: vi.fn() });

export interface BackendUnderTest {
  name: string;
  /** Whether the fake behind the backend can simulate failed uploads. */
  injectsFailures?: true;
  /** Whether the backend has no public URL of its own and is served through `createScreenshotServeHandler`. */
  servedByApp?: true;
  open(): Promise<{
    objectStore: ScreenshotObjectStore;
    /** Bytes currently stored under `key`, read without going through the store. */
    storedBytes(key: string): Promise<Uint8Array | null>;
    /** Make the next upload fail after the object was (possibly) stored — an unknown outcome. */
    failUploadsUncertainly?(): void;
    /** Make uploads fail with a definitive rejection. */
    rejectUploads?(): void;
  }>;
}

/**
 * The behaviour every backend shares, run once per backend: object stores
 * backed by fakes of remote APIs (screenshot-storage.test.ts) and by real
 * database engines (database-backends.test.ts).
 */
export function describeBackendContract(backend: BackendUnderTest): void {
  describe(`createScreenshotStorage — ${backend.name}`, () => {
    it("stores the decoded image under a random key and returns a URL it can delete", async () => {
      const { objectStore, storedBytes } = await backend.open();
      const storage = createScreenshotStorage(objectStore, { logger: silentLogger() });

      const { url } = await storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT);
      const key = objectStore.keyFromUrl(url);

      expect(key).toMatch(/^siteping-[a-f0-9]{32}\.jpg$/);
      expect(url).not.toContain(UPLOAD_CONTEXT.feedbackId);
      expect(await storedBytes(key as string)).toEqual(JPEG_BYTES);

      await storage.delete?.(url);
      expect(await storedBytes(key as string)).toBeNull();
    });

    it("returns a distinct URL per upload, even for the same feedbackId and identical bytes", async () => {
      const { objectStore } = await backend.open();
      const storage = createScreenshotStorage(objectStore, { logger: silentLogger() });

      const first = await storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT);
      const second = await storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT);

      expect(first.url).not.toBe(second.url);
    });

    it("ignores URLs it does not own and already-deleted objects on delete", async () => {
      const { objectStore } = await backend.open();
      const storage = createScreenshotStorage(objectStore, { logger: silentLogger() });
      const { url } = await storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT);
      await storage.delete?.(url);

      await expect(storage.delete?.(url)).resolves.toBeUndefined();
      await expect(storage.delete?.(JPEG_DATA_URL)).resolves.toBeUndefined();
      await expect(storage.delete?.("https://elsewhere.example.com/siteping-x.jpg")).resolves.toBeUndefined();
    });

    it("treats a stored URL with malformed percent-encoding as not its own on delete", async () => {
      const { objectStore, storedBytes } = await backend.open();
      const storage = createScreenshotStorage(objectStore, { logger: silentLogger() });
      const { url } = await storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT);
      const key = objectStore.keyFromUrl(url) ?? "";

      for (const malformedKey of ["%", "%ZZ", "%E0%A4%A"]) {
        const malformedUrl = objectStore.urlFor("PLACEHOLDER").replace("PLACEHOLDER", malformedKey);
        expect(objectStore.keyFromUrl(malformedUrl)).toBeNull();
        await expect(storage.delete?.(malformedUrl)).resolves.toBeUndefined();
      }
      expect(await storedBytes(key)).toEqual(JPEG_BYTES);
    });

    it("never deletes another object behind the same public base URL", async () => {
      const { objectStore, storedBytes } = await backend.open();
      const logger = silentLogger();
      const storage = createScreenshotStorage(objectStore, { logger });
      const foreignKey = `other-app-${"b".repeat(32)}.jpg`;
      await objectStore.put({ key: foreignKey, bytes: JPEG_BYTES.slice(), contentType: "image/jpeg" });

      await storage.delete?.(objectStore.urlFor(foreignKey));

      expect(await storedBytes(foreignKey)).toEqual(JPEG_BYTES);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("refusing to delete"), {
        key: foreignKey,
        keyPrefix: "siteping-",
      });
    });

    it("still refuses a foreign key without throwing when the logger itself throws", async () => {
      const { objectStore, storedBytes } = await backend.open();
      const throwingLogger = {
        warn: vi.fn(() => {
          throw new Error("log sink unavailable");
        }),
      };
      const storage = createScreenshotStorage(objectStore, { logger: throwingLogger });
      const foreignKey = `other-app-${"c".repeat(32)}.jpg`;
      await objectStore.put({ key: foreignKey, bytes: JPEG_BYTES.slice(), contentType: "image/jpeg" });

      await expect(storage.delete?.(objectStore.urlFor(foreignKey))).resolves.toBeUndefined();

      expect(throwingLogger.warn).toHaveBeenCalledOnce();
      expect(await storedBytes(foreignKey)).toEqual(JPEG_BYTES);
    });

    if (backend.servedByApp) {
      it("serves stored screenshots through createScreenshotServeHandler", async () => {
        const { objectStore } = await backend.open();
        const storage = createScreenshotStorage(objectStore, { logger: silentLogger() });
        const { url } = await storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT);

        const response = await createScreenshotServeHandler(objectStore).GET(new Request(url));

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toBe("image/jpeg");
        // Inline too, every response is sandboxed and never sniffed into another type.
        expect(response.headers.get("content-security-policy")).toBe("default-src 'none'; sandbox");
        expect(response.headers.get("x-content-type-options")).toBe("nosniff");
        expect(new Uint8Array(await response.arrayBuffer())).toEqual(JPEG_BYTES);
      });

      it("serves a custom allowed type with the type it was uploaded with", async () => {
        const { objectStore } = await backend.open();
        const storage = createScreenshotStorage(objectStore, {
          allowedContentTypes: ["image/jpeg", "image/gif"],
          logger: silentLogger(),
        });

        const { url } = await storage.upload(GIF_DATA_URL, UPLOAD_CONTEXT);
        const response = await createScreenshotServeHandler(objectStore).GET(new Request(url));

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toBe("image/gif");
      });

      it("serves an SVG that reached the backend directly as a sandboxed download, never inline", async () => {
        const { objectStore } = await backend.open();
        const legacyKey = `siteping-${"b".repeat(32)}.svg`;
        const svgBytes = new TextEncoder().encode(
          '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
        );
        await objectStore.put({ key: legacyKey, bytes: svgBytes, contentType: "image/svg+xml" });

        const response = await createScreenshotServeHandler(objectStore).GET(
          new Request(objectStore.urlFor(legacyKey)),
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toBe("application/octet-stream");
        expect(response.headers.get("content-disposition")).toBe("attachment");
        expect(response.headers.get("content-security-policy")).toBe("default-src 'none'; sandbox");
        expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      });
    }

    if (backend.injectsFailures) {
      it("reclaims an upload whose outcome is unknown, then reports the failure", async () => {
        const { objectStore, storedBytes, failUploadsUncertainly } = await backend.open();
        failUploadsUncertainly?.();
        const putKeys: string[] = [];
        const storage = createScreenshotStorage(
          {
            ...objectStore,
            put: (object) => {
              putKeys.push(object.key);
              return objectStore.put(object);
            },
          },
          { logger: silentLogger() },
        );

        await expect(storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT)).rejects.toBeInstanceOf(ObjectStoreRequestError);

        expect(await storedBytes(putKeys[0] as string)).toBeNull();
      });

      it("reports a definitive rejection without trying to reclaim", async () => {
        const { objectStore, rejectUploads } = await backend.open();
        rejectUploads?.();
        const remove = vi.spyOn(objectStore, "remove");
        const storage = createScreenshotStorage(objectStore, { logger: silentLogger() });

        await expect(storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT)).rejects.toBeInstanceOf(
          ScreenshotUploadRejectedError,
        );
        expect(remove).not.toHaveBeenCalled();
      });
    }
  });
}

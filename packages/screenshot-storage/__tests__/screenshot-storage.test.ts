import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCloudflareImagesObjectStore } from "../src/cloudflare-images/index.js";
import { createFilesystemObjectStore } from "../src/filesystem/index.js";
import {
  createScreenshotServeHandler,
  createScreenshotStorage,
  InvalidScreenshotError,
  isObjectStoreRequestError,
  isScreenshotUploadRejected,
  ObjectStoreRequestError,
  type ScreenshotObjectStore,
  ScreenshotUploadRejectedError,
} from "../src/index.js";
import { createMemoryObjectStore } from "../src/memory/index.js";
import { createS3ObjectStore } from "../src/s3/index.js";
import { createFakeCloudflareImages, createFakeS3, type FakeBackend } from "./fake-backends.js";

/** A real 1×1 JPEG. */
const JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
const JPEG_DATA_URL = `data:image/jpeg;base64,${JPEG_BASE64}`;
const JPEG_BYTES = Uint8Array.from(atob(JPEG_BASE64), (character) => character.charCodeAt(0));
/** A real 1×1 GIF — a type outside the defaults. */
const GIF_DATA_URL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const PUBLIC_BASE_URL = "https://app.example.com/api/siteping/screenshots";
const UPLOAD_CONTEXT = { feedbackId: "client-supplied-id", mimeType: "image/jpeg" };
const silentLogger = () => ({ warn: vi.fn() });

interface BackendUnderTest {
  name: string;
  open(): {
    objectStore: ScreenshotObjectStore;
    /** Bytes currently stored under `key`, read without going through the store. */
    storedBytes(key: string): Promise<Uint8Array | null>;
    /** Make the next upload fail after the object was (possibly) stored — an unknown outcome. */
    failUploadsUncertainly?(): void;
    /** Make uploads fail with a definitive rejection. */
    rejectUploads?(): void;
    cleanup?(): void;
  };
}

const temporaryDirectories: string[] = [];
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

const backends: BackendUnderTest[] = [
  {
    name: "memory",
    open() {
      const objectStore = createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL });
      return { objectStore, storedBytes: async (key) => (await objectStore.get?.(key))?.bytes ?? null };
    },
  },
  {
    name: "filesystem",
    open() {
      const directory = mkdtempSync(join(tmpdir(), "siteping-screenshots-"));
      temporaryDirectories.push(directory);
      const objectStore = createFilesystemObjectStore({ directory, publicBaseUrl: PUBLIC_BASE_URL });
      return {
        objectStore,
        storedBytes: async (key) =>
          readdirSync(directory).includes(key) ? ((await objectStore.get?.(key))?.bytes ?? null) : null,
      };
    },
  },
  {
    name: "Cloudflare Images",
    open() {
      const fake: FakeBackend = createFakeCloudflareImages({ accountId: "account-1", apiToken: "cf-token" });
      const objectStore = createCloudflareImagesObjectStore({
        accountId: "account-1",
        apiToken: "cf-token",
        accountHash: "hash-1",
        fetch: fake.fetch,
      });
      return {
        objectStore,
        storedBytes: async (key) => fake.objects.get(key)?.bytes ?? null,
        failUploadsUncertainly: () => fake.failWhen(/^POST /, 502, { afterStoring: true }),
        rejectUploads: () => fake.failWhen(/^POST /, 400),
      };
    },
  },
  {
    name: "S3-compatible",
    open() {
      const credentials = { accessKeyId: "AKIDEXAMPLE", secretAccessKey: "s3-secret" };
      const fake = createFakeS3({ bucket: "screens", region: "auto", ...credentials });
      const objectStore = createS3ObjectStore({
        endpoint: "https://account.r2.cloudflarestorage.com",
        bucket: "screens",
        publicBaseUrl: "https://screens.example.com",
        ...credentials,
        fetch: fake.fetch,
      });
      return {
        objectStore,
        storedBytes: async (key) => fake.objects.get(key)?.bytes ?? null,
        failUploadsUncertainly: () => fake.failWhen(/^PUT /, 503, { afterStoring: true }),
        rejectUploads: () => fake.failWhen(/^PUT /, 403),
      };
    },
  },
];

for (const backend of backends) {
  describe(`createScreenshotStorage — ${backend.name}`, () => {
    it("stores the decoded image under a random key and returns a URL it can delete", async () => {
      const { objectStore, storedBytes } = backend.open();
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
      const { objectStore } = backend.open();
      const storage = createScreenshotStorage(objectStore, { logger: silentLogger() });

      const first = await storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT);
      const second = await storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT);

      expect(first.url).not.toBe(second.url);
    });

    it("ignores URLs it does not own and already-deleted objects on delete", async () => {
      const { objectStore } = backend.open();
      const storage = createScreenshotStorage(objectStore, { logger: silentLogger() });
      const { url } = await storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT);
      await storage.delete?.(url);

      await expect(storage.delete?.(url)).resolves.toBeUndefined();
      await expect(storage.delete?.(JPEG_DATA_URL)).resolves.toBeUndefined();
      await expect(storage.delete?.("https://elsewhere.example.com/siteping-x.jpg")).resolves.toBeUndefined();
    });

    it("treats a stored URL with malformed percent-encoding as not its own on delete", async () => {
      const { objectStore, storedBytes } = backend.open();
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
      const { objectStore, storedBytes } = backend.open();
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
      const { objectStore, storedBytes } = backend.open();
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

    if (backend.name !== "memory" && backend.name !== "filesystem") {
      it("reclaims an upload whose outcome is unknown, then reports the failure", async () => {
        const { objectStore, storedBytes, failUploadsUncertainly } = backend.open();
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
        const { objectStore, rejectUploads } = backend.open();
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

describe("createScreenshotStorage — validation", () => {
  const storage = () =>
    createScreenshotStorage(createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL }), { maxBytes: 200 });

  it.each([
    ["a non-image data URL", "data:text/html;base64,PGgxPmhpPC9oMT4="],
    ["a disallowed image type", `data:image/svg+xml;base64,${btoa("<svg/>")}`],
    ["an invalid base64 payload", "data:image/jpeg;base64,***"],
    ["an image over the size limit", `data:image/jpeg;base64,${btoa("x".repeat(201))}`],
    ["a remote URL", "https://example.com/shot.jpg"],
  ])("rejects %s before any I/O", async (_label, dataUrl) => {
    await expect(storage().upload(dataUrl, UPLOAD_CONTEXT)).rejects.toBeInstanceOf(InvalidScreenshotError);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 0, -1, 1.5])(
    "refuses maxBytes %s, which cannot enforce a limit",
    (maxBytes) => {
      expect(() =>
        createScreenshotStorage(createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL }), { maxBytes }),
      ).toThrow(`maxBytes must be a positive integer number of bytes, got ${String(maxBytes)}`);
    },
  );

  it("rejects an oversized payload by its base64 length, before decoding it", async () => {
    const oversizedUndecodable = `data:image/jpeg;base64,${"AA==".repeat(80)}`;
    await expect(storage().upload(oversizedUndecodable, UPLOAD_CONTEXT)).rejects.toThrow(/exceeds the 200-byte limit/);
  });

  it("rejects a tiny image padded with whitespace by the raw data URL length, before parsing it", async () => {
    const whitespacePadded = `data:image/jpeg;base64,${" ".repeat(100_000)}${btoa("x")}`;
    await expect(storage().upload(whitespacePadded, UPLOAD_CONTEXT)).rejects.toThrow(
      /data URL of 100027 characters exceeds the 200-byte limit/,
    );
  });

  it("accepts an image of exactly maxBytes with its base64 wrapped in MIME lines", async () => {
    const wrappedBase64 = btoa("x".repeat(200)).replace(/.{76}/g, "$&\r\n");
    await expect(storage().upload(`data:image/jpeg;base64,${wrappedBase64}`, UPLOAD_CONTEXT)).resolves.toHaveProperty(
      "url",
    );
  });

  it("accepts an image of exactly maxBytes", async () => {
    const exactSize = `data:image/jpeg;base64,${btoa("x".repeat(200))}`;
    await expect(storage().upload(exactSize, UPLOAD_CONTEXT)).resolves.toHaveProperty("url");
  });

  it("only deletes keys with the configured prefix and the generated shape", async () => {
    const objectStore = createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL });
    const storage = createScreenshotStorage(objectStore, { keyPrefix: "team-a-", logger: silentLogger() });
    const { url } = await storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT);
    const foreignKeys = ["team-a-logo.png", `siteping-${"c".repeat(32)}.jpg`, `team-a-${"c".repeat(32)}.jpg.bak`];
    for (const key of foreignKeys) await objectStore.put({ key, bytes: JPEG_BYTES.slice(), contentType: "image/jpeg" });

    for (const key of foreignKeys) await storage.delete?.(objectStore.urlFor(key));
    await storage.delete?.(url);

    expect(objectStore.keys().sort()).toEqual([...foreignKeys].sort());
  });

  it("refuses a key prefix that is unsafe in paths or URLs", () => {
    expect(() =>
      createScreenshotStorage(createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL }), { keyPrefix: "../" }),
    ).toThrow(/keyPrefix/);
  });

  it("refuses an allowed content type whose key extension the serve handler would reject", () => {
    expect(() =>
      createScreenshotStorage(createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL }), {
        allowedContentTypes: ["image/jpeg", "image/vnd.adobe.photoshop"],
      }),
    ).toThrow(/image\/vnd\.adobe\.photoshop.*vndadobephotoshop/);
  });

  it.each(["text/png", "application/jpeg", "image/", "image/png;charset=utf-8"])(
    "refuses the allowed content type %s that no image data URL can carry",
    (contentType) => {
      expect(() =>
        createScreenshotStorage(createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL }), {
          allowedContentTypes: ["image/png", contentType],
        }),
      ).toThrow(/no image data URL can carry it/);
    },
  );

  it.each(["image/svg+xml", "IMAGE/SVG+XML"])("refuses the active format %s in allowedContentTypes", (contentType) => {
    expect(() =>
      createScreenshotStorage(createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL }), {
        allowedContentTypes: ["image/png", contentType],
      }),
    ).toThrow(/active format/);
  });

  it("accepts uploads of a configured content type written in another case or with spaces", async () => {
    const objectStore = createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL });
    const storage = createScreenshotStorage(objectStore, { allowedContentTypes: [" IMAGE/GIF "] });

    const { url } = await storage.upload(GIF_DATA_URL, UPLOAD_CONTEXT);

    expect(objectStore.keyFromUrl(url)).toMatch(/\.gif$/);
    expect((await objectStore.get?.(objectStore.keyFromUrl(url) ?? ""))?.contentType).toBe("image/gif");
  });

  it("keeps the validated content types when the caller mutates its array afterwards", async () => {
    const objectStore = createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL });
    const allowedContentTypes = ["image/jpeg"];
    const storage = createScreenshotStorage(objectStore, { allowedContentTypes });

    allowedContentTypes.push("image/svg+xml", "image/gif");

    await expect(storage.upload(`data:image/svg+xml;base64,${btoa("<svg/>")}`, UPLOAD_CONTEXT)).rejects.toBeInstanceOf(
      InvalidScreenshotError,
    );
    await expect(storage.upload(GIF_DATA_URL, UPLOAD_CONTEXT)).rejects.toBeInstanceOf(InvalidScreenshotError);
    await expect(storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT)).resolves.toHaveProperty("url");
    expect(objectStore.keys()).toHaveLength(1);
  });

  it("gives custom content types keys the serve handler accepts", async () => {
    const objectStore = createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL });
    const storage = createScreenshotStorage(objectStore, {
      allowedContentTypes: ["image/vnd.microsoft.icon"],
      logger: silentLogger(),
    });

    const { url } = await storage.upload(`data:image/vnd.microsoft.icon;base64,${JPEG_BASE64}`, UPLOAD_CONTEXT);
    const response = await createScreenshotServeHandler(objectStore).GET(new Request(url));

    expect(objectStore.keyFromUrl(url)).toMatch(/\.ico$/);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/vnd.microsoft.icon");
  });
});

describe("createScreenshotServeHandler", () => {
  it("serves stored screenshots with their type and immutable caching", async () => {
    const objectStore = createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL });
    const { url } = await createScreenshotStorage(objectStore).upload(JPEG_DATA_URL, UPLOAD_CONTEXT);

    const response = await createScreenshotServeHandler(objectStore).GET(new Request(url));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(JPEG_BYTES);
  });

  for (const backend of backends.filter(({ name }) => name === "memory" || name === "filesystem")) {
    it(`serves a custom allowed type from ${backend.name} with the type it was uploaded with`, async () => {
      const { objectStore } = backend.open();
      const storage = createScreenshotStorage(objectStore, {
        allowedContentTypes: ["image/jpeg", "image/gif"],
        logger: silentLogger(),
      });

      const { url } = await storage.upload(GIF_DATA_URL, UPLOAD_CONTEXT);
      const response = await createScreenshotServeHandler(objectStore).GET(new Request(url));

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/gif");
    });
  }

  for (const backend of backends.filter(({ name }) => name === "memory" || name === "filesystem")) {
    it(`sandboxes whatever ${backend.name} serves, even an SVG that reached the backend directly`, async () => {
      const { objectStore } = backend.open();
      const legacyKey = `siteping-${"b".repeat(32)}.svg`;
      const svgBytes = new TextEncoder().encode(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      );
      await objectStore.put({ key: legacyKey, bytes: svgBytes, contentType: "image/svg+xml" });

      const response = await createScreenshotServeHandler(objectStore).GET(new Request(objectStore.urlFor(legacyKey)));

      expect(response.status).toBe(200);
      expect(response.headers.get("content-security-policy")).toBe("default-src 'none'; sandbox");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    });
  }

  it("removes the filesystem content-type sidecar with the screenshot", async () => {
    const directory = mkdtempSync(join(tmpdir(), "siteping-sidecar-"));
    temporaryDirectories.push(directory);
    const storage = createScreenshotStorage(createFilesystemObjectStore({ directory, publicBaseUrl: PUBLIC_BASE_URL }));

    const { url } = await storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT);
    expect(readdirSync(directory)).toHaveLength(2);
    await storage.delete?.(url);

    expect(readdirSync(directory)).toEqual([]);
  });

  it("answers 404 for unknown keys and anything that is not a generated key", async () => {
    const directory = mkdtempSync(join(tmpdir(), "siteping-serve-"));
    temporaryDirectories.push(directory);
    const handler = createScreenshotServeHandler(
      createFilesystemObjectStore({ directory, publicBaseUrl: PUBLIC_BASE_URL }),
    );

    for (const key of [`siteping-${"a".repeat(32)}.jpg`, "..%2F..%2Fetc%2Fpasswd", "package.json"]) {
      expect((await handler.GET(new Request(`${PUBLIC_BASE_URL}/${key}`))).status).toBe(404);
    }
  });

  it("answers 404 for keys with malformed percent-encoding", async () => {
    const objectStore = createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL });
    await createScreenshotStorage(objectStore).upload(JPEG_DATA_URL, UPLOAD_CONTEXT);
    const handler = createScreenshotServeHandler(objectStore);

    for (const malformedSegment of ["%", "%ZZ", "%E0%A4%A"]) {
      expect((await handler.GET(new Request(`${PUBLIC_BASE_URL}/${malformedSegment}`))).status).toBe(404);
    }
  });

  it("applies the authorize callback", async () => {
    const objectStore = createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL });
    const { url } = await createScreenshotStorage(objectStore).upload(JPEG_DATA_URL, UPLOAD_CONTEXT);
    const handler = createScreenshotServeHandler(objectStore, {
      authorize: (request) => request.headers.get("cookie") === "session=ok",
    });

    expect((await handler.GET(new Request(url))).status).toBe(403);
    expect((await handler.GET(new Request(url, { headers: { cookie: "session=ok" } }))).status).toBe(200);
  });

  it("keeps screenshots behind an authorize callback out of shared caches and revalidated on every reuse", async () => {
    const objectStore = createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL });
    const { url } = await createScreenshotStorage(objectStore).upload(JPEG_DATA_URL, UPLOAD_CONTEXT);
    const handler = createScreenshotServeHandler(objectStore, { authorize: () => true });

    const response = await handler.GET(new Request(url));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-cache");
  });

  it("revalidates an authorized screenshot with a 304, and refuses it once access is revoked", async () => {
    const objectStore = createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL });
    const { url } = await createScreenshotStorage(objectStore).upload(JPEG_DATA_URL, UPLOAD_CONTEXT);
    let hasAccess = true;
    const handler = createScreenshotServeHandler(objectStore, { authorize: () => hasAccess });

    const firstResponse = await handler.GET(new Request(url));
    const etag = firstResponse.headers.get("etag");
    expect(etag).toMatch(/^".+"$/);
    const revalidation = await handler.GET(new Request(url, { headers: { "If-None-Match": `W/${etag}` } }));
    expect(revalidation.status).toBe(304);
    expect(revalidation.headers.get("cache-control")).toBe("private, no-cache");
    expect(await revalidation.text()).toBe("");

    hasAccess = false;
    const afterRevocation = await handler.GET(new Request(url, { headers: { "If-None-Match": `${etag}` } }));
    expect(afterRevocation.status).toBe(403);
  });

  describe("revalidation against a private S3 bucket", () => {
    const credentials = { accessKeyId: "AKIDEXAMPLE", secretAccessKey: "s3-secret" };

    async function openPrivateS3(authorize: () => boolean) {
      const fake = createFakeS3({ bucket: "screens", region: "auto", ...credentials });
      const objectStore = createS3ObjectStore({
        endpoint: "https://account.r2.cloudflarestorage.com",
        bucket: "screens",
        publicBaseUrl: PUBLIC_BASE_URL,
        ...credentials,
        fetch: fake.fetch,
      });
      const { url } = await createScreenshotStorage(objectStore).upload(JPEG_DATA_URL, UPLOAD_CONTEXT);
      const handler = createScreenshotServeHandler(objectStore, { authorize });
      const objectReads = () => fake.requests.filter(({ method }) => method === "GET").length;
      return { url, handler, objectReads };
    }

    it("answers a matching If-None-Match with a 304 without downloading the object", async () => {
      const { url, handler, objectReads } = await openPrivateS3(() => true);
      const etag = (await handler.GET(new Request(url))).headers.get("etag");
      const readsAfterFirstResponse = objectReads();

      const revalidation = await handler.GET(
        new Request(url, { headers: { "If-None-Match": `"other-tag", W/${etag}` } }),
      );

      expect(revalidation.status).toBe(304);
      expect(revalidation.headers.get("etag")).toBe(etag);
      expect(revalidation.headers.get("cache-control")).toBe("private, no-cache");
      expect(objectReads()).toBe(readsAfterFirstResponse);
    });

    it("serves the object again when If-None-Match lists other tags only", async () => {
      const { url, handler, objectReads } = await openPrivateS3(() => true);

      const response = await handler.GET(new Request(url, { headers: { "If-None-Match": '"other-tag", W/"stale"' } }));

      expect(response.status).toBe(200);
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(JPEG_BYTES);
      expect(objectReads()).toBe(1);
    });

    it("refuses an unauthorized revalidation without reading the object", async () => {
      const { url, handler, objectReads } = await openPrivateS3(() => false);
      const key = url.split("/").pop() ?? "";

      const response = await handler.GET(new Request(url, { headers: { "If-None-Match": `"${key}"` } }));

      expect(response.status).toBe(403);
      expect(objectReads()).toBe(0);
    });

    it("answers If-None-Match: * with a 304 only when the object exists", async () => {
      const { url, handler } = await openPrivateS3(() => true);
      const missingUrl = `${PUBLIC_BASE_URL}/siteping-${"c".repeat(32)}.jpg`;
      const wildcard = { headers: { "If-None-Match": "*" } };

      expect((await handler.GET(new Request(url, wildcard))).status).toBe(304);
      expect((await handler.GET(new Request(missingUrl, wildcard))).status).toBe(404);
    });
  });

  it("only serves its own keyPrefix namespace from a filesystem directory shared with another app", async () => {
    const directory = mkdtempSync(join(tmpdir(), "siteping-shared-"));
    temporaryDirectories.push(directory);
    const objectStore = createFilesystemObjectStore({ directory, publicBaseUrl: PUBLIC_BASE_URL });
    const appA = createScreenshotStorage(objectStore, { keyPrefix: "app-a-" });
    const appB = createScreenshotStorage(objectStore, { keyPrefix: "app-b-" });
    const { url: urlOfA } = await appA.upload(JPEG_DATA_URL, UPLOAD_CONTEXT);
    const { url: urlOfB } = await appB.upload(JPEG_DATA_URL, UPLOAD_CONTEXT);
    const authorizedKeys: string[] = [];
    const handlerOfA = createScreenshotServeHandler(objectStore, {
      keyPrefix: "app-a-",
      authorize: (_request, { key }) => {
        authorizedKeys.push(key);
        return true;
      },
    });

    expect((await handlerOfA.GET(new Request(urlOfA))).status).toBe(200);
    expect((await handlerOfA.GET(new Request(urlOfB))).status).toBe(404);
    expect(authorizedKeys).toEqual([objectStore.keyFromUrl(urlOfA)]);
  });

  it("serves only the default siteping- namespace when no keyPrefix is given", async () => {
    const objectStore = createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL });
    const { url } = await createScreenshotStorage(objectStore, { keyPrefix: "other-" }).upload(
      JPEG_DATA_URL,
      UPLOAD_CONTEXT,
    );

    expect((await createScreenshotServeHandler(objectStore).GET(new Request(url))).status).toBe(404);
  });

  it("refuses a serve keyPrefix that is unsafe in paths or URLs", () => {
    const objectStore = createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL });
    expect(() => createScreenshotServeHandler(objectStore, { keyPrefix: "../" })).toThrow(
      /createScreenshotServeHandler: keyPrefix/,
    );
  });

  it("refuses backends that serve their own URLs", () => {
    const objectStore = createCloudflareImagesObjectStore({ accountId: "a", apiToken: "t", accountHash: "h" });
    expect(() => createScreenshotServeHandler(objectStore)).toThrow(/serves screenshots from its own URLs/);
  });
});

describe("createS3ObjectStore — credentials without s3:ListBucket", () => {
  const credentials = { accessKeyId: "AKIDEXAMPLE", secretAccessKey: "s3-secret" };
  const unknownKey = `siteping-${"b".repeat(32)}.jpg`;

  function openS3WithoutListBucket(
    storeOptions: { treatAccessDeniedAsMissing?: boolean; secretAccessKey?: string } = {},
  ) {
    const fake = createFakeS3({ bucket: "screens", region: "auto", ...credentials, canListBucket: false });
    return createS3ObjectStore({
      endpoint: "https://account.r2.cloudflarestorage.com",
      bucket: "screens",
      publicBaseUrl: PUBLIC_BASE_URL,
      ...credentials,
      ...storeOptions,
      fetch: fake.fetch,
    });
  }

  it("reads a 403 AccessDenied as a missing object when treatAccessDeniedAsMissing is set", async () => {
    const objectStore = openS3WithoutListBucket({ treatAccessDeniedAsMissing: true });
    const { url } = await createScreenshotStorage(objectStore).upload(JPEG_DATA_URL, UPLOAD_CONTEXT);
    const handler = createScreenshotServeHandler(objectStore);

    expect(await objectStore.get?.(unknownKey)).toBeNull();
    expect((await handler.GET(new Request(`${PUBLIC_BASE_URL}/${unknownKey}`))).status).toBe(404);
    expect((await handler.GET(new Request(url))).status).toBe(200);
  });

  it("keeps failing on a 403 AccessDenied by default", async () => {
    const objectStore = openS3WithoutListBucket();

    const failure = await objectStore.get?.(unknownKey).catch((error: unknown) => error);

    expect(isObjectStoreRequestError(failure)).toBe(true);
    expect((failure as ObjectStoreRequestError).status).toBe(403);
    await expect(
      createScreenshotServeHandler(objectStore).GET(new Request(`${PUBLIC_BASE_URL}/${unknownKey}`)),
    ).rejects.toSatisfy(isObjectStoreRequestError);
  });

  it("still fails on a credential error such as SignatureDoesNotMatch, even with the option set", async () => {
    const objectStore = openS3WithoutListBucket({ treatAccessDeniedAsMissing: true, secretAccessKey: "wrong" });

    const failure = await objectStore.get?.(unknownKey).catch((error: unknown) => error);

    expect(isObjectStoreRequestError(failure)).toBe(true);
    expect((failure as ObjectStoreRequestError).status).toBe(403);
    expect((failure as ObjectStoreRequestError).cause).toContain("SignatureDoesNotMatch");
  });
});

/**
 * A memory backend whose `put` times out while the upload is still in flight:
 * the caller gets an unknown outcome at once, and the object is committed
 * `commitDelayMs` later — after the immediate reclaim already ran.
 */
function createLateCommittingObjectStore(commitDelayMs: number) {
  const committed = createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL });
  const objectStore: ScreenshotObjectStore = {
    ...committed,
    async put(object) {
      setTimeout(() => void committed.put(object), commitDelayMs);
      throw new ObjectStoreRequestError("memory", "PUT", `/${object.key}`, null, {
        cause: new DOMException("The operation timed out.", "TimeoutError"),
      });
    },
  };
  return { objectStore, storedKeys: () => committed.keys() };
}

describe("createScreenshotStorage — uploads committed after a timeout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reclaims an object the backend commits after the immediate reclaim", async () => {
    vi.useFakeTimers();
    const { objectStore, storedKeys } = createLateCommittingObjectStore(1_000);
    const storage = createScreenshotStorage(objectStore, { logger: silentLogger() });

    await expect(storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT)).rejects.toBeInstanceOf(ObjectStoreRequestError);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(storedKeys()).toHaveLength(1);

    await vi.runAllTimersAsync();
    expect(storedKeys()).toEqual([]);
  });

  it("leaves the late commit behind with only the immediate reclaim — the gap the delays close", async () => {
    vi.useFakeTimers();
    const { objectStore, storedKeys } = createLateCommittingObjectStore(1_000);
    const storage = createScreenshotStorage(objectStore, {
      uncertainUploadReclaimDelaysMs: [],
      logger: silentLogger(),
    });

    await expect(storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT)).rejects.toBeInstanceOf(ObjectStoreRequestError);
    await vi.runAllTimersAsync();

    expect(storedKeys()).toHaveLength(1);
  });

  it("runs the delayed attempts through the injected scheduler and hands the key to onUncertainUpload", async () => {
    const scheduled: { task: () => void; delayMs: number }[] = [];
    const uncertainKeys: string[] = [];
    const { objectStore, storedKeys } = createLateCommittingObjectStore(0);
    const storage = createScreenshotStorage(objectStore, {
      uncertainUploadReclaimDelaysMs: [10, 20],
      scheduleReclaim: (task, delayMs) => scheduled.push({ task, delayMs }),
      onUncertainUpload: (key) => {
        uncertainKeys.push(key);
      },
      logger: silentLogger(),
    });

    await expect(storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT)).rejects.toBeInstanceOf(ObjectStoreRequestError);
    await new Promise((resolve) => setTimeout(resolve, 5)); // let the late commit land
    expect(storedKeys()).toEqual(uncertainKeys);
    expect(scheduled.map(({ delayMs }) => delayMs)).toEqual([10, 20]);

    scheduled[0]?.task();
    await vi.waitFor(() => expect(storedKeys()).toEqual([]));
  });

  it("logs a failing onUncertainUpload hook and still reports the upload error", async () => {
    const logger = silentLogger();
    const { objectStore } = createLateCommittingObjectStore(0);
    const storage = createScreenshotStorage(objectStore, {
      uncertainUploadReclaimDelaysMs: [],
      onUncertainUpload: () => {
        throw new Error("queue unavailable");
      },
      logger,
    });

    await expect(storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT)).rejects.toBeInstanceOf(ObjectStoreRequestError);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("onUncertainUpload failed"), {
      key: expect.stringMatching(/^siteping-[a-f0-9]{32}\.jpg$/),
      error: expect.objectContaining({ message: "queue unavailable" }),
    });
  });

  it("logs a throwing scheduler and still runs the other attempts, the hook and reports the upload error", async () => {
    const logger = silentLogger();
    const scheduled: { task: () => void; delayMs: number }[] = [];
    const uncertainKeys: string[] = [];
    const { objectStore, storedKeys } = createLateCommittingObjectStore(0);
    const storage = createScreenshotStorage(objectStore, {
      uncertainUploadReclaimDelaysMs: [10, 20],
      scheduleReclaim: (task, delayMs) => {
        if (delayMs === 10) throw new Error("scheduler unavailable");
        scheduled.push({ task, delayMs });
      },
      onUncertainUpload: (key) => {
        uncertainKeys.push(key);
      },
      logger,
    });

    await expect(storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT)).rejects.toBeInstanceOf(ObjectStoreRequestError);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("could not schedule a delayed reclaim"), {
      key: uncertainKeys[0],
      delayMs: 10,
      error: expect.objectContaining({ message: "scheduler unavailable" }),
    });
    expect(uncertainKeys).toHaveLength(1);
    expect(scheduled.map(({ delayMs }) => delayMs)).toEqual([20]);

    await new Promise((resolve) => setTimeout(resolve, 5)); // let the late commit land
    scheduled[0]?.task();
    await vi.waitFor(() => expect(storedKeys()).toEqual([]));
  });

  it("logs a backend remove that throws synchronously and still runs every attempt, the hook and reports the upload error", async () => {
    const logger = silentLogger();
    const scheduled: { task: () => void; delayMs: number }[] = [];
    const uncertainKeys: string[] = [];
    const { objectStore: lateCommittingObjectStore } = createLateCommittingObjectStore(0);
    const removeAttempts: string[] = [];
    const objectStore: ScreenshotObjectStore = {
      ...lateCommittingObjectStore,
      // A custom backend whose `remove` throws before returning a promise.
      remove(key) {
        removeAttempts.push(key);
        throw new Error("remove client not initialized");
      },
    };
    const storage = createScreenshotStorage(objectStore, {
      uncertainUploadReclaimDelaysMs: [10, 20],
      scheduleReclaim: (task, delayMs) => scheduled.push({ task, delayMs }),
      onUncertainUpload: (key) => {
        uncertainKeys.push(key);
      },
      logger,
    });

    await expect(storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT)).rejects.toBeInstanceOf(ObjectStoreRequestError);
    expect(scheduled.map(({ delayMs }) => delayMs)).toEqual([10, 20]);
    expect(uncertainKeys).toHaveLength(1);

    for (const { task } of scheduled) task();
    await vi.waitFor(() => expect(removeAttempts).toHaveLength(3));
    await vi.waitFor(() =>
      expect(logger.warn.mock.calls.map(([, context]) => context.attempt)).toEqual([
        "immediate",
        "after 10 ms",
        "after 20 ms",
      ]),
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("could not reclaim an uncertain upload"), {
      key: uncertainKeys[0],
      attempt: "immediate",
      error: expect.objectContaining({ message: "remove client not initialized" }),
    });
  });

  it("keeps the upload error, every reclaim attempt and the hook when the logger itself throws", async () => {
    const unhandledRejections: unknown[] = [];
    const recordUnhandledRejection = (reason: unknown) => unhandledRejections.push(reason);
    process.on("unhandledRejection", recordUnhandledRejection);
    try {
      const throwingLogger = {
        warn: vi.fn(() => {
          throw new Error("log sink unavailable");
        }),
      };
      const scheduled: { task: () => void; delayMs: number }[] = [];
      const uncertainKeys: string[] = [];
      const { objectStore: lateCommittingObjectStore } = createLateCommittingObjectStore(0);
      const removeAttempts: string[] = [];
      const objectStore: ScreenshotObjectStore = {
        ...lateCommittingObjectStore,
        async remove(key) {
          removeAttempts.push(key);
          throw new Error("backend unavailable");
        },
      };
      const storage = createScreenshotStorage(objectStore, {
        uncertainUploadReclaimDelaysMs: [10, 20],
        scheduleReclaim: (task, delayMs) => scheduled.push({ task, delayMs }),
        onUncertainUpload: (key) => {
          uncertainKeys.push(key);
        },
        logger: throwingLogger,
      });

      await expect(storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT)).rejects.toBeInstanceOf(ObjectStoreRequestError);
      expect(scheduled.map(({ delayMs }) => delayMs)).toEqual([10, 20]);
      expect(uncertainKeys).toHaveLength(1);

      for (const { task } of scheduled) task();
      await vi.waitFor(() => expect(throwingLogger.warn).toHaveBeenCalledTimes(3));
      expect(removeAttempts).toHaveLength(3);
      await new Promise((resolve) => setTimeout(resolve, 5)); // let any unhandled rejection surface
      expect(unhandledRejections).toEqual([]);
    } finally {
      process.off("unhandledRejection", recordUnhandledRejection);
    }
  });

  it("keeps the validated reclaim delays when the caller mutates its array afterwards", async () => {
    const scheduledDelaysMs: number[] = [];
    const reclaimDelaysMs = [10];
    const { objectStore } = createLateCommittingObjectStore(0);
    const storage = createScreenshotStorage(objectStore, {
      uncertainUploadReclaimDelaysMs: reclaimDelaysMs,
      scheduleReclaim: (_task, delayMs) => scheduledDelaysMs.push(delayMs),
      logger: silentLogger(),
    });

    reclaimDelaysMs.push(-1, Number.NaN);

    await expect(storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT)).rejects.toBeInstanceOf(ObjectStoreRequestError);
    expect(scheduledDelaysMs).toEqual([10]);
  });

  it.each([
    { label: "[undefined]", delaysMs: [undefined], index: 0 },
    // biome-ignore lint/suspicious/noSparseArray: the hole is the input under test.
    { label: "a sparse array", delaysMs: [1_000, , 2_000], index: 1 },
  ])("refuses an undefined reclaim delay in $label", ({ delaysMs, index }) => {
    const objectStore = createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL });
    expect(() =>
      createScreenshotStorage(objectStore, {
        // JavaScript callers are not held to the `number[]` type.
        uncertainUploadReclaimDelaysMs: delaysMs as unknown as number[],
      }),
    ).toThrow(`uncertainUploadReclaimDelaysMs[${index}] is undefined`);
  });

  it("refuses, with the default scheduler, a delay setTimeout would clamp to an immediate timer", () => {
    const objectStore = createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL });
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    expect(() =>
      createScreenshotStorage(objectStore, { uncertainUploadReclaimDelaysMs: [5_000, thirtyDaysMs] }),
    ).toThrow(`uncertainUploadReclaimDelaysMs[1] is ${thirtyDaysMs}`);
    expect(() =>
      createScreenshotStorage(objectStore, { uncertainUploadReclaimDelaysMs: [2_147_483_647] }),
    ).not.toThrow();
  });

  it("hands a delay beyond the setTimeout limit to an injected scheduler", async () => {
    const scheduledDelaysMs: number[] = [];
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const { objectStore } = createLateCommittingObjectStore(0);
    const storage = createScreenshotStorage(objectStore, {
      uncertainUploadReclaimDelaysMs: [thirtyDaysMs],
      scheduleReclaim: (_task, delayMs) => scheduledDelaysMs.push(delayMs),
      logger: silentLogger(),
    });

    await expect(storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT)).rejects.toBeInstanceOf(ObjectStoreRequestError);
    expect(scheduledDelaysMs).toEqual([thirtyDaysMs]);
  });

  it("refuses reclaim delays that are not finite, non-negative milliseconds", () => {
    const objectStore = createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL });
    expect(() => createScreenshotStorage(objectStore, { uncertainUploadReclaimDelaysMs: [-1] })).toThrow(
      /uncertainUploadReclaimDelaysMs/,
    );
  });
});

/**
 * What a backend subpath's CommonJS bundle throws: same name and code as the
 * classes the consumer imported from the package root, but another class.
 */
class ScreenshotUploadRejectedErrorFromAnotherBundle extends Error {
  readonly code = "SCREENSHOT_UPLOAD_REJECTED";
  override name = "ScreenshotUploadRejectedError";
}
class ObjectStoreRequestErrorFromAnotherBundle extends Error {
  readonly code = "OBJECT_STORE_REQUEST_FAILED";
  override name = "ObjectStoreRequestError";
}

describe("error identity across bundles", () => {
  it("recognizes upload rejections by their stable code, not their class", () => {
    expect(isScreenshotUploadRejected(new ScreenshotUploadRejectedError("refused"))).toBe(true);
    expect(isScreenshotUploadRejected(new ScreenshotUploadRejectedErrorFromAnotherBundle("refused"))).toBe(true);
    expect(isScreenshotUploadRejected(new ObjectStoreRequestError("S3", "PUT", "/k", 503))).toBe(false);
    expect(isScreenshotUploadRejected(new Error("refused"))).toBe(false);
    expect(isScreenshotUploadRejected(null)).toBe(false);
    expect(isScreenshotUploadRejected("SCREENSHOT_UPLOAD_REJECTED")).toBe(false);
  });

  it("recognizes failed backend requests by their stable code, not their class", () => {
    expect(isObjectStoreRequestError(new ObjectStoreRequestError("S3", "PUT", "/k", 503))).toBe(true);
    expect(isObjectStoreRequestError(new ObjectStoreRequestErrorFromAnotherBundle("failed"))).toBe(true);
    expect(isObjectStoreRequestError(new ScreenshotUploadRejectedError("refused"))).toBe(false);
    expect(isObjectStoreRequestError(undefined)).toBe(false);
  });

  it("does not reclaim after a rejection thrown by another bundle's copy of the class", async () => {
    const objectStore = createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL });
    const rejection = new ScreenshotUploadRejectedErrorFromAnotherBundle("S3 PUT failed with status 403");
    const removedKeys: string[] = [];
    const storage = createScreenshotStorage(
      {
        ...objectStore,
        put: async () => {
          throw rejection;
        },
        remove: async (key) => {
          removedKeys.push(key);
          await objectStore.remove(key);
        },
      },
      { logger: silentLogger() },
    );

    await expect(storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT)).rejects.toBe(rejection);
    expect(removedKeys).toEqual([]);
  });
});

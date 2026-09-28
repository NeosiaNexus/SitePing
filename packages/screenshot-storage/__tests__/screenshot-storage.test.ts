import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCloudflareImagesObjectStore } from "../src/backends/cloudflare-images.js";
import { createFilesystemObjectStore } from "../src/backends/filesystem.js";
import { createMemoryObjectStore } from "../src/backends/memory.js";
import { createS3ObjectStore } from "../src/backends/s3.js";
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
import {
  type BackendUnderTest,
  describeBackendContract,
  GIF_DATA_URL,
  JPEG_BASE64,
  JPEG_BYTES,
  JPEG_DATA_URL,
  PUBLIC_BASE_URL,
  silentLogger,
  UPLOAD_CONTEXT,
} from "./backend-contract.js";
import { createFakeCloudflareImages, createFakeS3, type FakeBackend } from "./fake-backends.js";

const temporaryDirectories: string[] = [];
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

const backends: BackendUnderTest[] = [
  {
    name: "memory",
    servedByApp: true,
    async open() {
      const objectStore = createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL });
      return { objectStore, storedBytes: async (key) => (await objectStore.get?.(key))?.bytes ?? null };
    },
  },
  {
    name: "filesystem",
    servedByApp: true,
    async open() {
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
    injectsFailures: true,
    async open() {
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
    injectsFailures: true,
    async open() {
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

for (const backend of backends) describeBackendContract(backend);

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

  it("accepts by default the largest screenshot the server lets through, and nothing larger", async () => {
    const defaultStorage = createScreenshotStorage(createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL }));
    const header = "data:image/jpeg;base64,";
    // The server's cap is 1.5M characters; a base64 payload is a multiple of 4.
    const largestPayloadLength = Math.floor((1_500_000 - header.length) / 4) * 4;
    const largestBytes = (largestPayloadLength / 4) * 3;

    await expect(
      defaultStorage.upload(`${header}${btoa("x".repeat(largestBytes))}`, UPLOAD_CONTEXT),
    ).resolves.toHaveProperty("url");
    await expect(defaultStorage.upload(`${header}${btoa("x".repeat(1_125_001))}`, UPLOAD_CONTEXT)).rejects.toThrow(
      "1125001 bytes exceeds the 1125000-byte limit",
    );
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

  it.each(["image/svg+xml", "IMAGE/SVG+XML", "image/svg", "image/vnd.example+xml"])(
    "refuses the active format %s in allowedContentTypes",
    (contentType) => {
      expect(() =>
        createScreenshotStorage(createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL }), {
          allowedContentTypes: ["image/png", contentType],
        }),
      ).toThrow(/active format/);
    },
  );

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

  it.each(["text/html", "image/svg+xml", "IMAGE/SVG+XML; charset=utf-8", "application/octet-stream", ""])(
    "serves an object stored as %j as a download, never inline",
    async (contentType) => {
      const objectStore = createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL });
      const key = `siteping-${"d".repeat(32)}.jpg`;
      await objectStore.put({ key, bytes: new TextEncoder().encode("<script>alert(1)</script>"), contentType });

      const response = await createScreenshotServeHandler(objectStore).GET(new Request(objectStore.urlFor(key)));

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/octet-stream");
      expect(response.headers.get("content-disposition")).toBe("attachment");
    },
  );

  it("serves an inert image type inline, without the parameters a backend may add", async () => {
    const objectStore = createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL });
    const key = `siteping-${"e".repeat(32)}.png`;
    await objectStore.put({ key, bytes: JPEG_BYTES.slice(), contentType: "Image/PNG; charset=binary" });

    const response = await createScreenshotServeHandler(objectStore).GET(new Request(objectStore.urlFor(key)));

    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-disposition")).toBeNull();
  });

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

describe("createScreenshotStorage — uploads whose outcome is unknown", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes the key at once and hands it to onUncertainUpload, which can reclaim a late commit", async () => {
    vi.useFakeTimers();
    const uncertainKeys: string[] = [];
    const { objectStore, storedKeys } = createLateCommittingObjectStore(1_000);
    const remove = vi.spyOn(objectStore, "remove");
    const storage = createScreenshotStorage(objectStore, {
      onUncertainUpload: (key) => {
        uncertainKeys.push(key);
      },
      logger: silentLogger(),
    });

    await expect(storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT)).rejects.toBeInstanceOf(ObjectStoreRequestError);
    expect(uncertainKeys).toEqual([expect.stringMatching(/^siteping-[a-f0-9]{32}\.jpg$/)]);
    expect(remove).toHaveBeenCalledExactlyOnceWith(uncertainKeys[0]);

    // The backend commits after the immediate removal: the hook's key is what reclaims it.
    await vi.advanceTimersByTimeAsync(1_000);
    expect(storedKeys()).toEqual(uncertainKeys);
    await objectStore.remove(uncertainKeys[0] as string);
    expect(storedKeys()).toEqual([]);
  });

  it("logs a failing onUncertainUpload hook and still reports the upload error", async () => {
    const logger = silentLogger();
    const { objectStore } = createLateCommittingObjectStore(0);
    const storage = createScreenshotStorage(objectStore, {
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

  it("logs a backend remove that throws synchronously and still runs the hook and reports the upload error", async () => {
    const logger = silentLogger();
    const uncertainKeys: string[] = [];
    const { objectStore: lateCommittingObjectStore } = createLateCommittingObjectStore(0);
    const objectStore: ScreenshotObjectStore = {
      ...lateCommittingObjectStore,
      // A custom backend whose `remove` throws before returning a promise.
      remove() {
        throw new Error("remove client not initialized");
      },
    };
    const storage = createScreenshotStorage(objectStore, {
      onUncertainUpload: (key) => {
        uncertainKeys.push(key);
      },
      logger,
    });

    await expect(storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT)).rejects.toBeInstanceOf(ObjectStoreRequestError);
    expect(uncertainKeys).toHaveLength(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("could not reclaim an uncertain upload"), {
      key: uncertainKeys[0],
      error: expect.objectContaining({ message: "remove client not initialized" }),
    });
  });

  it("keeps the upload error and the hook when the logger itself throws", async () => {
    const throwingLogger = {
      warn: vi.fn(() => {
        throw new Error("log sink unavailable");
      }),
    };
    const uncertainKeys: string[] = [];
    const { objectStore: lateCommittingObjectStore } = createLateCommittingObjectStore(0);
    const objectStore: ScreenshotObjectStore = {
      ...lateCommittingObjectStore,
      async remove() {
        throw new Error("backend unavailable");
      },
    };
    const storage = createScreenshotStorage(objectStore, {
      onUncertainUpload: (key) => {
        uncertainKeys.push(key);
      },
      logger: throwingLogger,
    });

    await expect(storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT)).rejects.toBeInstanceOf(ObjectStoreRequestError);
    expect(throwingLogger.warn).toHaveBeenCalledOnce();
    expect(uncertainKeys).toHaveLength(1);
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

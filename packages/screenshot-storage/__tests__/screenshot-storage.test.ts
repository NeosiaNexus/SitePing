import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspect } from "node:util";
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
    // At the default size, the line breaks outgrow the slack of the header budget: only
    // their own budget lets the raw data URL through.
    const defaultStorage = createScreenshotStorage(createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL }));
    const wrappedBase64 = btoa("x".repeat(1_125_000)).replace(/.{76}/g, "$&\r\n");

    await expect(
      defaultStorage.upload(`data:image/jpeg;base64,${wrappedBase64}`, UPLOAD_CONTEXT),
    ).resolves.toHaveProperty("url");
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
      /exceeds the 1125000-byte limit/,
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

  it("refuses a payload of whitespace only, which decodes to an empty image", async () => {
    const objectStore = createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL });

    await expect(
      createScreenshotStorage(objectStore).upload("data:image/jpeg;base64, \r\n", UPLOAD_CONTEXT),
    ).rejects.toThrow(new InvalidScreenshotError("empty image"));
    expect(objectStore.keys()).toEqual([]);
  });

  it("accepts a data URL whose type is written in upper case, as MIME types are case-insensitive", async () => {
    const objectStore = createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL });

    const { url } = await createScreenshotStorage(objectStore).upload(
      `data:IMAGE/JPEG;base64,${JPEG_BASE64}`,
      UPLOAD_CONTEXT,
    );

    const key = objectStore.keyFromUrl(url) ?? "";
    expect(key).toMatch(/\.jpg$/);
    expect(await objectStore.get?.(key)).toEqual({ bytes: JPEG_BYTES, contentType: "image/jpeg" });
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
    expect(response.headers.get("content-disposition")).toBeNull();
    expect(response.headers.get("content-security-policy")).toBe("default-src 'none'; sandbox");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
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

  it("answers with the configured cacheControl when there is no authorize", async () => {
    const objectStore = createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL });
    const { url } = await createScreenshotStorage(objectStore).upload(JPEG_DATA_URL, UPLOAD_CONTEXT);
    const handler = createScreenshotServeHandler(objectStore, { cacheControl: "public, max-age=86400" });

    const response = await handler.GET(new Request(url));
    const etag = response.headers.get("etag") ?? "";
    const revalidation = await handler.GET(new Request(url, { headers: { "If-None-Match": etag } }));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=86400");
    expect(revalidation.status).toBe(304);
    expect(revalidation.headers.get("cache-control")).toBe("public, max-age=86400");
  });

  it("keeps private, no-cache behind an authorize callback, whatever cacheControl says", async () => {
    const objectStore = createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL });
    const { url } = await createScreenshotStorage(objectStore).upload(JPEG_DATA_URL, UPLOAD_CONTEXT);
    const handler = createScreenshotServeHandler(objectStore, {
      authorize: () => true,
      cacheControl: "public, max-age=86400",
    });

    const response = await handler.GET(new Request(url));
    const etag = response.headers.get("etag") ?? "";
    const revalidation = await handler.GET(new Request(url, { headers: { "If-None-Match": etag } }));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-cache");
    expect(revalidation.status).toBe(304);
    expect(revalidation.headers.get("cache-control")).toBe("private, no-cache");
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

describe("backend requests — error bodies", () => {
  it("keeps the signed request an S3 error echoes out of every failure it reports", async () => {
    // S3 answers SignatureDoesNotMatch with the canonical request it computed, whose signed headers
    // carry the session token of temporary credentials; a failure reaches the server logs, which
    // print its whole cause chain.
    const sessionToken = "sts-session-token";
    const fake = createFakeS3({
      bucket: "screens",
      region: "auto",
      accessKeyId: "AKIDEXAMPLE",
      secretAccessKey: "s3-secret",
    });
    const errorBodies: string[] = [];
    const openS3 = (treatAccessDeniedAsMissing: boolean) =>
      createS3ObjectStore({
        endpoint: "https://account.r2.cloudflarestorage.com",
        bucket: "screens",
        publicBaseUrl: PUBLIC_BASE_URL,
        accessKeyId: "AKIDEXAMPLE",
        secretAccessKey: "wrong",
        sessionToken,
        treatAccessDeniedAsMissing,
        fetch: async (input, init) => {
          const response = await fake.fetch(input, init);
          errorBodies.push(await response.clone().text());
          return response;
        },
      });
    const key = `siteping-${"a".repeat(32)}.jpg`;

    const failures = [
      await createScreenshotStorage(openS3(false), { logger: silentLogger() })
        .upload(JPEG_DATA_URL, UPLOAD_CONTEXT)
        .catch((error: unknown) => error),
      await openS3(false)
        .get?.(key)
        .catch((error: unknown) => error),
      await openS3(true)
        .get?.(key)
        .catch((error: unknown) => error),
    ];

    expect(errorBodies).toHaveLength(3);
    for (const errorBody of errorBodies) expect(errorBody).toContain(`x-amz-security-token:${sessionToken}`);
    for (const failure of failures) {
      const logged = inspect(failure, { depth: null });
      expect(logged).toContain(
        "SignatureDoesNotMatch: The request signature we calculated does not match the signature you provided.",
      );
      expect(logged).not.toContain(sessionToken);
    }
  });

  it("reports an upload S3 answers with a redirect as a definitive rejection, without reclaiming it", async () => {
    // What S3 answers a path-style request sent to another region's endpoint: no Location, nothing stored.
    const requests: string[] = [];
    const uncertainKeys: string[] = [];
    const objectStore = createS3ObjectStore({
      endpoint: "https://s3.amazonaws.com",
      bucket: "screens",
      publicBaseUrl: PUBLIC_BASE_URL,
      accessKeyId: "AKIDEXAMPLE",
      secretAccessKey: "s3-secret",
      fetch: async (input, init) => {
        requests.push(new Request(input, init).method);
        return new Response(
          "<Error><Code>PermanentRedirect</Code><Message>The bucket you are attempting to access must be " +
            "addressed using the specified endpoint.</Message></Error>",
          { status: 301 },
        );
      },
    });
    const storage = createScreenshotStorage(objectStore, {
      logger: silentLogger(),
      onUncertainUpload: (key) => {
        uncertainKeys.push(key);
      },
    });

    const failure = await storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT).catch((error: unknown) => error);

    expect(isScreenshotUploadRejected(failure)).toBe(true);
    expect((failure as ScreenshotUploadRejectedError).cause).toMatchObject({
      status: 301,
      cause: expect.stringContaining("PermanentRedirect"),
    });
    expect(requests).toEqual(["PUT"]);
    expect(uncertainKeys).toEqual([]);
  });

  it("reports a Cloudflare Images error by the codes and messages of its errors", async () => {
    const fake = createFakeCloudflareImages({ accountId: "account-1", apiToken: "cf-token" });
    const objectStore = createCloudflareImagesObjectStore({
      accountId: "account-1",
      apiToken: "revoked-token",
      accountHash: "hash-1",
      fetch: fake.fetch,
    });

    const failure = await createScreenshotStorage(objectStore, { logger: silentLogger() })
      .upload(JPEG_DATA_URL, UPLOAD_CONTEXT)
      .catch((error: unknown) => error);

    expect(isScreenshotUploadRejected(failure)).toBe(true);
    expect((failure as ScreenshotUploadRejectedError).cause).toMatchObject({
      status: 403,
      cause: "10000: Authentication error",
    });
  });
});

describe("createFilesystemObjectStore — keys", () => {
  it.each([
    "../escaped.jpg",
    `../siteping-${"a".repeat(32)}.jpg`,
    `nested/siteping-${"a".repeat(32)}.jpg`,
    "..",
    `siteping-${"a".repeat(32)}.jpg.content-type`,
  ])("refuses the key %s on every operation, before touching the disk", async (key) => {
    const parent = mkdtempSync(join(tmpdir(), "siteping-traversal-"));
    temporaryDirectories.push(parent);
    const directory = join(parent, "screenshots");
    const objectStore = createFilesystemObjectStore({ directory, publicBaseUrl: PUBLIC_BASE_URL });

    await expect(objectStore.put({ key, bytes: JPEG_BYTES.slice(), contentType: "image/jpeg" })).rejects.toThrow(
      `refusing key "${key}"`,
    );
    await expect(objectStore.get?.(key)).rejects.toThrow("refusing key");
    await expect(objectStore.remove(key)).rejects.toThrow("refusing key");

    expect(readdirSync(parent)).toEqual([]);
  });
});

describe("createS3ObjectStore — deletes", () => {
  it("treats a 404 NoSuchKey answer to a delete as an object already gone", async () => {
    const credentials = { accessKeyId: "AKIDEXAMPLE", secretAccessKey: "s3-secret" };
    const fake = createFakeS3({ bucket: "screens", region: "auto", ...credentials, deleteMissingAnswers404: true });
    const objectStore = createS3ObjectStore({
      endpoint: "https://storage.googleapis.com",
      bucket: "screens",
      publicBaseUrl: PUBLIC_BASE_URL,
      ...credentials,
      fetch: fake.fetch,
    });
    const logger = silentLogger();
    const storage = createScreenshotStorage(objectStore, { logger });
    const { url } = await storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT);
    await storage.delete?.(url);

    await expect(storage.delete?.(url)).resolves.toBeUndefined();
    await expect(objectStore.remove(`siteping-${"a".repeat(32)}.jpg`)).resolves.toBeUndefined();
    expect(fake.requests.map(({ method }) => method)).toEqual(["PUT", "DELETE", "DELETE", "DELETE"]);
    expect(logger.warn).not.toHaveBeenCalled();
  });
});

describe("createS3ObjectStore — uploads", () => {
  const credentials = { accessKeyId: "AKIDEXAMPLE", secretAccessKey: "s3-secret" };
  const openS3 = (options: { cacheControl?: string } = {}) => {
    const fake = createFakeS3({ bucket: "screens", region: "auto", ...credentials });
    const objectStore = createS3ObjectStore({
      endpoint: "https://account.r2.cloudflarestorage.com",
      bucket: "screens",
      publicBaseUrl: "https://screens.example.com",
      ...credentials,
      ...options,
      fetch: fake.fetch,
    });
    return { fake, objectStore };
  };

  it("stores each object with an immutable Cache-Control, left out of the signature like the AWS SDK does", async () => {
    const { fake, objectStore } = openS3();

    await createScreenshotStorage(objectStore).upload(JPEG_DATA_URL, UPLOAD_CONTEXT);

    // The fake bucket re-signs every request with the AWS SDK's signer, which never signs Cache-Control
    // (a proxy may rewrite it), and refuses a mismatch: a stored object proves the signature holds.
    expect([...fake.objects.values()].map(({ cacheControl }) => cacheControl)).toEqual([
      "public, max-age=31536000, immutable",
    ]);
    const [put] = fake.requests;
    expect(put?.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(put?.headers.get("authorization")).toContain("SignedHeaders=content-type;host;");
  });

  it.each([
    ["a shorter lifetime", "public, max-age=86400", "public, max-age=86400"],
    ["two consecutive spaces, which a signed header would collapse", "public,  max-age=60", "public,  max-age=60"],
    ["surrounding spaces, which are not part of a header value", "  no-store ", "no-store"],
  ])("stores each object with the configured cacheControl: %s", async (_label, cacheControl, stored) => {
    const { fake, objectStore } = openS3({ cacheControl });

    await createScreenshotStorage(objectStore).upload(JPEG_DATA_URL, UPLOAD_CONTEXT);

    expect([...fake.objects.values()].map((object) => object.cacheControl)).toEqual([stored]);
    expect(fake.requests[0]?.headers.get("authorization")).toContain("SignedHeaders=content-type;host;");
  });
});

describe("backend requests — timeouts", () => {
  const TIMEOUT_MS = 20;

  it.each<{
    backend: string;
    open: (fetch: typeof globalThis.fetch) => ScreenshotObjectStore;
    uploadMethod: string;
    uploadedKey: (request: Request, init?: RequestInit) => string;
  }>([
    {
      backend: "S3",
      open: (fetch) =>
        createS3ObjectStore({
          endpoint: "https://account.r2.cloudflarestorage.com",
          bucket: "screens",
          publicBaseUrl: "https://screens.example.com",
          accessKeyId: "AKIDEXAMPLE",
          secretAccessKey: "s3-secret",
          timeoutMs: TIMEOUT_MS,
          fetch,
        }),
      uploadMethod: "PUT",
      uploadedKey: (request) => new URL(request.url).pathname.split("/").at(-1) ?? "",
    },
    {
      backend: "Cloudflare Images",
      open: (fetch) =>
        createCloudflareImagesObjectStore({
          accountId: "account-1",
          apiToken: "cf-token",
          accountHash: "hash-1",
          timeoutMs: TIMEOUT_MS,
          fetch,
        }),
      uploadMethod: "POST",
      uploadedKey: (_request, init) => String((init?.body as FormData | undefined)?.get("id")),
    },
  ])(
    "$backend aborts an upload after timeoutMs, reports it without a status and reclaims its key",
    async ({ open, uploadMethod, uploadedKey }) => {
      const requests: { method: string; path: string }[] = [];
      const uploadedKeys: string[] = [];
      // The upload never answers, as a stalled backend; the reclaiming DELETE does.
      const objectStore = open((input, init) => {
        const request = new Request(input, init);
        requests.push({ method: request.method, path: new URL(request.url).pathname });
        if (request.method === "DELETE") return Promise.resolve(new Response(null, { status: 204 }));
        uploadedKeys.push(uploadedKey(request, init));
        return new Promise((_resolve, reject) => {
          request.signal.addEventListener("abort", () => reject(request.signal.reason));
        });
      });

      const failure = await createScreenshotStorage(objectStore, { logger: silentLogger() })
        .upload(JPEG_DATA_URL, UPLOAD_CONTEXT)
        .catch((error: unknown) => error);

      expect(isObjectStoreRequestError(failure)).toBe(true);
      expect((failure as ObjectStoreRequestError).status).toBeNull();
      expect((failure as ObjectStoreRequestError).cause).toMatchObject({ name: "TimeoutError" });
      expect(requests.map(({ method }) => method)).toEqual([uploadMethod, "DELETE"]);
      expect(uploadedKeys).toEqual([expect.stringMatching(/^siteping-[a-f0-9]{32}\.jpg$/)]);
      expect(requests[1]?.path.endsWith(`/${uploadedKeys[0]}`)).toBe(true);
    },
    // Well under the 5 s default request timeout: a backend that ignored timeoutMs fails here.
    2_000,
  );
});

describe("backend requests — retries", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const SLOW_DOWN = "<Error><Code>SlowDown</Code><Message>Please reduce your request rate.</Message></Error>";
  /** A failed attempt: a status, a whole response, or a network error. */
  type Failure = number | Response | Error;

  /** Wrap a fake backend's fetch so its first requests fail as listed, recording every method. */
  function flaky(fake: FakeBackend, failures: Failure[]) {
    const methods: string[] = [];
    const fetch: typeof globalThis.fetch = async (input, init) => {
      methods.push(new Request(input, init).method);
      const failure = failures.shift();
      if (failure instanceof Error) throw failure;
      if (failure instanceof Response) return failure;
      if (failure !== undefined) return new Response(SLOW_DOWN, { status: failure });
      return fake.fetch(input, init);
    };
    return { fetch, methods };
  }

  function openFlakyS3(failures: Failure[], timeoutMs?: number) {
    const credentials = { accessKeyId: "AKIDEXAMPLE", secretAccessKey: "s3-secret" };
    const fake = createFakeS3({ bucket: "screens", region: "auto", ...credentials });
    const { fetch, methods } = flaky(fake, failures);
    const objectStore = createS3ObjectStore({
      endpoint: "https://account.r2.cloudflarestorage.com",
      bucket: "screens",
      publicBaseUrl: PUBLIC_BASE_URL,
      ...credentials,
      ...(timeoutMs === undefined ? {} : { timeoutMs }),
      fetch,
    });
    return { fake, methods, storage: createScreenshotStorage(objectStore, { logger: silentLogger() }) };
  }

  function openFlakyCloudflareImages(failures: Failure[]) {
    const fake = createFakeCloudflareImages({ accountId: "account-1", apiToken: "cf-token" });
    const { fetch, methods } = flaky(fake, failures);
    const objectStore = createCloudflareImagesObjectStore({
      accountId: "account-1",
      apiToken: "cf-token",
      accountHash: "hash-1",
      fetch,
    });
    return { fake, methods, storage: createScreenshotStorage(objectStore, { logger: silentLogger() }) };
  }

  it.each<[string, Failure[]]>([
    ["a 503 SlowDown", [503]],
    ["a 500 InternalError", [500]],
    [
      "a connection reset",
      [new TypeError("fetch failed", { cause: Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" }) })],
    ],
    ["a 429 and a 503", [429, 503]],
  ])("stores an S3 upload that failed once with %s", async (_label, failures) => {
    const attempts = failures.length + 1;
    const { fake, methods, storage } = openFlakyS3(failures);

    await expect(storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT)).resolves.toHaveProperty("url");

    expect(methods).toEqual(Array(attempts).fill("PUT"));
    expect(fake.objects.size).toBe(1);
  });

  it("gives up after three attempts, then reclaims the upload", async () => {
    const { fake, methods, storage } = openFlakyS3([503, 503, 503]);

    const failure = await storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT).catch((error: unknown) => error);

    expect(failure).toMatchObject({ status: 503, cause: "SlowDown: Please reduce your request rate." });
    expect(isScreenshotUploadRejected(failure)).toBe(false);
    expect(methods).toEqual(["PUT", "PUT", "PUT", "DELETE"]);
    expect(fake.objects.size).toBe(0);
  });

  it("reports a refusal after an attempt that may have stored the upload as an unknown outcome, and reclaims it", async () => {
    const { methods, storage } = openFlakyS3([500, 403]);

    const failure = await storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT).catch((error: unknown) => error);

    expect(isScreenshotUploadRejected(failure)).toBe(false);
    expect(failure).toMatchObject({ status: 403 });
    expect(methods).toEqual(["PUT", "PUT", "DELETE"]);
  });

  it.each([
    ["in seconds", "2"],
    ["as an HTTP date", "Tue, 29 Sep 2026 12:00:02 GMT"],
  ])("waits the Retry-After the backend asks for, %s", async (_label, retryAfter) => {
    // Only the clock and the retry's timer are fake: signing and the fake S3 run on real promises.
    vi.useFakeTimers({ now: new Date("2026-09-29T12:00:00Z"), toFake: ["setTimeout", "clearTimeout", "Date"] });
    const { methods, storage } = openFlakyS3([
      new Response(SLOW_DOWN, { status: 503, headers: { "Retry-After": retryAfter } }),
    ]);

    const upload = storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT);
    while (vi.getTimerCount() === 0) await new Promise((resolve) => setImmediate(resolve));
    await vi.advanceTimersByTimeAsync(1_999);
    expect(methods).toEqual(["PUT"]);

    await vi.advanceTimersByTimeAsync(1);
    await expect(upload).resolves.toHaveProperty("url");
    expect(methods).toEqual(["PUT", "PUT"]);
  });

  it("does not retry when the Retry-After would outlast timeoutMs", async () => {
    const { methods, storage } = openFlakyS3(
      [new Response(SLOW_DOWN, { status: 503, headers: { "Retry-After": "60" } })],
      1_000,
    );
    const startedAt = Date.now();

    await expect(storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT)).rejects.toMatchObject({ status: 503 });

    expect(Date.now() - startedAt).toBeLessThan(1_000);
    expect(methods).toEqual(["PUT", "DELETE"]);
  });

  it.each([
    ["an S3", openFlakyS3, "PUT"],
    ["a Cloudflare Images", openFlakyCloudflareImages, "POST"],
  ] as const)("retries %s delete that failed once", async (_label, openFlaky, uploadMethod) => {
    const failures: Failure[] = [];
    const { fake, methods, storage } = openFlaky(failures);
    const { url } = await storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT);
    failures.push(503);

    await storage.delete?.(url);

    expect(methods).toEqual([uploadMethod, "DELETE", "DELETE"]);
    expect(fake.objects.size).toBe(0);
  });

  it("retries a Cloudflare Images upload refused by a 429, which stored nothing", async () => {
    const { fake, methods, storage } = openFlakyCloudflareImages([429]);

    await expect(storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT)).resolves.toHaveProperty("url");

    expect(methods).toEqual(["POST", "POST"]);
    expect(fake.objects.size).toBe(1);
  });

  it("does not repeat a Cloudflare Images upload that may have been stored, and reclaims it", async () => {
    const { methods, storage } = openFlakyCloudflareImages([502]);

    await expect(storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT)).rejects.toMatchObject({ status: 502 });

    expect(methods).toEqual(["POST", "DELETE"]);
  });
});

describe("backend factories — timeoutMs", () => {
  const openS3 = (timeoutMs: number) =>
    createS3ObjectStore({
      endpoint: "https://account.r2.cloudflarestorage.com",
      bucket: "screens",
      publicBaseUrl: PUBLIC_BASE_URL,
      accessKeyId: "AKIDEXAMPLE",
      secretAccessKey: "s3-secret",
      timeoutMs,
    });
  const openCloudflareImages = (timeoutMs: number) =>
    createCloudflareImagesObjectStore({
      accountId: "account-1",
      apiToken: "cf-token",
      accountHash: "hash-1",
      timeoutMs,
    });

  // What `Number(process.env.TIMEOUT_MS)` gives for a missing or mistyped variable, and delays no timer holds.
  it.each([Number.NaN, Number.POSITIVE_INFINITY, 0, -1, 1.5, 2 ** 31])(
    "refuses timeoutMs %s, under which every request would fail without reaching the backend",
    (timeoutMs) => {
      const refusal = `timeoutMs must be an integer number of milliseconds from 1 to 2147483647, got ${String(timeoutMs)}`;
      expect(() => openS3(timeoutMs)).toThrow(`[siteping] createS3ObjectStore: ${refusal}`);
      expect(() => openCloudflareImages(timeoutMs)).toThrow(`[siteping] createCloudflareImagesObjectStore: ${refusal}`);
    },
  );

  it("accepts the longest delay a timer holds", () => {
    expect(() => openS3(2 ** 31 - 1)).not.toThrow();
    expect(() => openCloudflareImages(2 ** 31 - 1)).not.toThrow();
  });
});

describe("backend factories — required options", () => {
  /** What `process.env.X!` passes when the variable is unset or empty. */
  const unset = [undefined as unknown as string, "", "  "];
  /** An option with a default is only filled in when undefined. */
  const blank = ["", "  "];
  const s3Options = {
    endpoint: "https://account.r2.cloudflarestorage.com",
    bucket: "screens",
    publicBaseUrl: PUBLIC_BASE_URL,
    accessKeyId: "AKIDEXAMPLE",
    secretAccessKey: "s3-secret",
  };
  const cloudflareImagesOptions = { accountId: "account-1", apiToken: "cf-token", accountHash: "hash-1" };

  it.each([
    ["bucket", unset],
    ["accessKeyId", unset],
    ["secretAccessKey", unset],
    ["region", blank],
  ] as const)("createS3ObjectStore refuses a missing %s", (option, values) => {
    for (const value of values) {
      expect(() => createS3ObjectStore({ ...s3Options, [option]: value })).toThrow(
        new Error(`[siteping] createS3ObjectStore: ${option} is required (a non-empty string)`),
      );
    }
  });

  it.each([
    ["accountId", unset],
    ["apiToken", unset],
    ["accountHash", unset],
    ["variant", blank],
  ] as const)("createCloudflareImagesObjectStore refuses a missing %s", (option, values) => {
    for (const value of values) {
      expect(() => createCloudflareImagesObjectStore({ ...cloudflareImagesOptions, [option]: value })).toThrow(
        new Error(`[siteping] createCloudflareImagesObjectStore: ${option} is required (a non-empty string)`),
      );
    }
  });

  it.each([
    ["accountHash", "hash/1"],
    ["accountHash", "hash?1"],
    ["variant", "public#1"],
    ["variant", "w=400 h=300"],
  ] as const)(
    "createCloudflareImagesObjectStore refuses the %s %j, which would break every delivery URL",
    (option, value) => {
      expect(() => createCloudflareImagesObjectStore({ ...cloudflareImagesOptions, [option]: value })).toThrow(
        `${option} must be a single URL path segment`,
      );
    },
  );

  it("accepts a flexible variant", () => {
    const objectStore = createCloudflareImagesObjectStore({ ...cloudflareImagesOptions, variant: "w=400,sharpen=3" });
    const url = objectStore.urlFor("siteping-a.jpg");

    expect(url).toBe("https://imagedelivery.net/hash-1/siteping-a.jpg/w=400,sharpen=3");
    expect(objectStore.keyFromUrl(url)).toBe("siteping-a.jpg");
  });
});

describe("cacheControl — construction checks", () => {
  const factories: [string, (cacheControl: string) => unknown][] = [
    [
      "createS3ObjectStore",
      (cacheControl) =>
        createS3ObjectStore({
          endpoint: "https://account.r2.cloudflarestorage.com",
          bucket: "screens",
          publicBaseUrl: PUBLIC_BASE_URL,
          accessKeyId: "AKIDEXAMPLE",
          secretAccessKey: "s3-secret",
          cacheControl,
        }),
    ],
    [
      "createScreenshotServeHandler",
      (cacheControl) =>
        createScreenshotServeHandler(createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL }), { cacheControl }),
    ],
    [
      "createScreenshotServeHandler",
      (cacheControl) =>
        createScreenshotServeHandler(createMemoryObjectStore({ publicBaseUrl: PUBLIC_BASE_URL }), {
          authorize: () => true,
          cacheControl,
        }),
    ],
  ];

  /** What a thrown error shows once logged, or `undefined` when nothing was thrown. */
  const loggedFailure = (open: () => unknown) => {
    try {
      open();
    } catch (error) {
      return inspect(error, { depth: null });
    }
    return undefined;
  };

  it.each([
    ["a CR LF, which would end the header", "max-age=60\r\nSet-Cookie: SECRET"],
    ["a lone LF", "max-age=60\nSECRET"],
    ["a lone CR", "max-age=60\rSECRET"],
    ["a NUL", "max-age=60\u0000SECRET"],
    ["a tab", "max-age=60,\tSECRET"],
    ["another control character", "max-age=60\u0001SECRET"],
    ["DEL", "max-age=60\u007fSECRET"],
    ["a non-ASCII letter", "max-age=60, SECRET-é"],
    ["a Unicode line separator", "max-age=60\u2028SECRET"],
  ])("refuses a value with %s, without quoting it", (_label, cacheControl) => {
    for (const [factory, open] of factories) {
      expect(() => open(cacheControl)).toThrow(
        new Error(
          `[siteping] ${factory}: cacheControl must be printable ASCII (no line break, tab or other control character, no non-ASCII character)`,
        ),
      );
      expect(loggedFailure(() => open(cacheControl))).not.toContain("SECRET");
    }
  });

  it.each(["", "   "])("refuses the blank value %j, which would send no directive", (cacheControl) => {
    for (const [factory, open] of factories) {
      expect(() => open(cacheControl)).toThrow(
        new Error(`[siteping] ${factory}: cacheControl is required (a non-empty string)`),
      );
    }
  });

  it("accepts every printable ASCII character, spaces included", () => {
    const printableAscii = String.fromCharCode(...Array.from({ length: 0x7f - 0x20 }, (_, index) => 0x20 + index));

    for (const [, open] of factories) expect(() => open(printableAscii)).not.toThrow();
  });
});

describe("createS3ObjectStore — a body cut short", () => {
  /** A 200 or 403 whose body errors mid-read, as when the request timeout fires during the download. */
  function openS3WithBrokenBody(status: number) {
    const timeout = new DOMException("The operation timed out.", "TimeoutError");
    return {
      timeout,
      objectStore: createS3ObjectStore({
        endpoint: "https://account.r2.cloudflarestorage.com",
        bucket: "screens",
        publicBaseUrl: PUBLIC_BASE_URL,
        accessKeyId: "AKIDEXAMPLE",
        secretAccessKey: "s3-secret",
        treatAccessDeniedAsMissing: true,
        fetch: async () =>
          new Response(
            new ReadableStream({
              start(controller) {
                controller.error(timeout);
              },
            }),
            { status },
          ),
      }),
    };
  }

  it.each([200, 403])("reports a %i whose body fails to read as a failed request", async (status) => {
    const { objectStore, timeout } = openS3WithBrokenBody(status);

    const failure = await objectStore.get?.(`siteping-${"a".repeat(32)}.jpg`).catch((error: unknown) => error);

    expect(isObjectStoreRequestError(failure)).toBe(true);
    expect((failure as ObjectStoreRequestError).status).toBe(status);
    expect((failure as ObjectStoreRequestError).cause).toBe(timeout);
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

  it("awaits an async hook, and logs its rejection instead of letting it escape", async () => {
    const logger = silentLogger();
    const { objectStore } = createLateCommittingObjectStore(0);
    const storage = createScreenshotStorage(objectStore, {
      // A durable queue that answers late, with an error.
      onUncertainUpload: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
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

  it("reports the upload error after 2 seconds when the removal and the hook stall, without waiting for them", async () => {
    vi.useFakeTimers();
    const logger = silentLogger();
    const { objectStore: lateCommittingObjectStore } = createLateCommittingObjectStore(0);
    const uncertainKeys: string[] = [];
    let rejectHook: (error: Error) => void = () => {};
    const storage = createScreenshotStorage(
      // A black-holed backend: the removal never answers either.
      { ...lateCommittingObjectStore, remove: () => new Promise<void>(() => {}) },
      {
        onUncertainUpload: (key) => {
          uncertainKeys.push(key);
          return new Promise<void>((_resolve, reject) => {
            rejectHook = reject;
          });
        },
        logger,
      },
    );
    let failure: unknown;
    const upload = storage.upload(JPEG_DATA_URL, UPLOAD_CONTEXT).catch((error: unknown) => {
      failure = error;
    });

    // The hook runs alongside the removal, not after it.
    await vi.advanceTimersByTimeAsync(1_999);
    expect(uncertainKeys).toHaveLength(1);
    expect(failure).toBeUndefined();

    await vi.advanceTimersByTimeAsync(1);
    await upload;
    expect(failure).toBeInstanceOf(ObjectStoreRequestError);
    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining("onUncertainUpload has not settled after 2000 ms"),
      { key: uncertainKeys[0] },
    );

    // A hook that fails once the upload was reported is still logged, never unhandled.
    rejectHook(new Error("queue unavailable"));
    await vi.advanceTimersByTimeAsync(0);
    expect(logger.warn).toHaveBeenLastCalledWith(expect.stringContaining("onUncertainUpload failed"), {
      key: uncertainKeys[0],
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

import { inspect } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCloudflareImagesObjectStore } from "../src/backends/cloudflare-images.js";
import { createS3ObjectStore } from "../src/backends/s3.js";
import { createPublicUrlMapping } from "../src/index.js";

const KEY = "siteping-0123456789abcdef.jpg";
/** Long run of `/` — quadratic for a backtracking `/\/+$/`, linear for the scan. */
const SLASH_RUN = "/".repeat(100_000);

const openS3 = (endpoint: string, fetch: typeof globalThis.fetch) =>
  createS3ObjectStore({
    endpoint,
    bucket: "screens",
    publicBaseUrl: "https://screens.example.com",
    accessKeyId: "AKIDEXAMPLE",
    secretAccessKey: "s3-secret",
    fetch,
  });
const openCloudflareImages = (deliveryBaseUrl: string) =>
  createCloudflareImagesObjectStore({
    accountId: "account-1",
    apiToken: "cf-token",
    accountHash: "hash-1",
    deliveryBaseUrl,
  });

/** What `run` throws, or `undefined` when it returns. */
function thrownBy(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe("createPublicUrlMapping — base URL trailing slashes", () => {
  it.each([
    ["no trailing slash", "https://cdn.example.com/screens"],
    ["one trailing slash", "https://cdn.example.com/screens/"],
    ["several trailing slashes", "https://cdn.example.com/screens///"],
  ])("builds and parses `<base>/<key>` URLs with %s", (_label, publicBaseUrl) => {
    const mapping = createPublicUrlMapping(publicBaseUrl);

    const url = mapping.urlFor(KEY);

    expect(url).toBe(`https://cdn.example.com/screens/${KEY}`);
    expect(mapping.keyFromUrl(url)).toBe(KEY);
  });

  it("rejects URLs outside the base or with nested paths", () => {
    const mapping = createPublicUrlMapping("https://cdn.example.com/screens/");

    expect(mapping.keyFromUrl(`https://other.example.com/screens/${KEY}`)).toBeNull();
    expect(mapping.keyFromUrl(`https://cdn.example.com/screens/nested/${KEY}`)).toBeNull();
    expect(mapping.keyFromUrl("https://cdn.example.com/screens/")).toBeNull();
  });

  it("trims a long run of trailing slashes", () => {
    const mapping = createPublicUrlMapping(`https://cdn.example.com/screens${SLASH_RUN}`);

    expect(mapping.urlFor(KEY)).toBe(`https://cdn.example.com/screens/${KEY}`);
  });

  it("keeps a long run of inner slashes", () => {
    const publicBaseUrl = `https://cdn.example.com${SLASH_RUN}screens`;

    expect(createPublicUrlMapping(publicBaseUrl).urlFor(KEY)).toBe(`${publicBaseUrl}/${KEY}`);
  });
});

describe("backend base URLs — trailing slashes", () => {
  const recordRequests = () => {
    const requestedUrls: string[] = [];
    const recordingFetch: typeof fetch = async (input) => {
      requestedUrls.push(input instanceof Request ? input.url : String(input));
      return new Response(null, { status: 204 });
    };
    return { requestedUrls, recordingFetch };
  };
  it("Cloudflare Images delivery URLs ignore trailing slashes of deliveryBaseUrl", () => {
    const objectStore = openCloudflareImages("https://example.com/cdn-cgi/imagedelivery///");

    const url = objectStore.urlFor(KEY);

    expect(url).toBe(`https://example.com/cdn-cgi/imagedelivery/hash-1/${KEY}/public`);
    expect(objectStore.keyFromUrl(url)).toBe(KEY);
  });

  it("Cloudflare Images handles a deliveryBaseUrl with a long run of inner slashes", () => {
    const deliveryBaseUrl = `https://example.com${SLASH_RUN}cdn-cgi/imagedelivery`;

    expect(openCloudflareImages(`${deliveryBaseUrl}/`).urlFor(KEY)).toBe(`${deliveryBaseUrl}/hash-1/${KEY}/public`);
  });

  it("S3 requests ignore trailing slashes of the endpoint", async () => {
    const { requestedUrls, recordingFetch } = recordRequests();

    await openS3("https://account.r2.cloudflarestorage.com///", recordingFetch).remove(KEY);

    expect(requestedUrls).toEqual([`https://account.r2.cloudflarestorage.com/screens/${KEY}`]);
  });

  it("S3 handles an endpoint with a long run of inner slashes", async () => {
    const { requestedUrls, recordingFetch } = recordRequests();
    const endpoint = `https://account.r2.cloudflarestorage.com${SLASH_RUN}r2`;

    await openS3(`${endpoint}/`, recordingFetch).remove(KEY);

    expect(requestedUrls).toEqual([new URL(`${endpoint}/screens/${KEY}`).href]);
  });
});

describe("base URLs — validation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["/api/siteping/screenshots", "must be an absolute http(s) URL"],
    ["app.example.com/screenshots", "must be an absolute http(s) URL"],
    ["ftp://files.example.com/screenshots", "must be an absolute http(s) URL"],
    ["javascript:alert(1)//", "must be an absolute http(s) URL"],
    ["https://cdn.example.com/screens?v=1", "must not contain a query or a fragment (? or #)"],
    ["https://cdn.example.com/screens#top", "must not contain a query or a fragment (? or #)"],
    ["https://cdn.example.com/screens?", "must not contain a query or a fragment (? or #)"],
    ["https://cdn.example.com/screens#", "must not contain a query or a fragment (? or #)"],
  ])("refuses the publicBaseUrl %s, under which keys would not resolve to the object", (publicBaseUrl, reason) => {
    // The whole message: the option and the reason, never the refused value.
    expect(() => createPublicUrlMapping(publicBaseUrl)).toThrow(new Error(`[siteping] publicBaseUrl ${reason}`));
  });

  describe("never quotes a refused value, which may carry a secret", () => {
    const optionFactories: [string, (value: string) => unknown][] = [
      ["publicBaseUrl", (value) => createPublicUrlMapping(value)],
      ["endpoint", (value) => openS3(value, fetch)],
      ["deliveryBaseUrl", (value) => openCloudflareImages(value)],
    ];
    const valuesWithSecrets = [
      // Tokens the parser does not see as credentials.
      "https://cdn.example.com/screens?token=SECRET",
      "https://acct.blob.core.windows.net/screens?sv=2024&sig=SECRET",
      "https://s3.example.com/?X-Amz-Security-Token=SECRET",
      "https://cdn.example.com/screens#SECRET",
      // A scheme-less value: `user:` parses as its scheme, so it has no password to find.
      "user:SECRET@cdn.example.com/screens",
      // Credentials in a URL that does not parse (bad port, a space in the host, no scheme).
      "https://user:SECRET@cdn.example.com:99999/screens",
      "https://user:SECRET@cdn exa.com/screens",
      "//user:SECRET@cdn.example.com",
      // Credentials under another scheme.
      "ftp://user:SECRET@files.example.com",
    ];

    for (const [option, open] of optionFactories) {
      it.each(valuesWithSecrets)(`${option}: %s`, (value) => {
        const failure = thrownBy(() => open(value));

        expect(failure).toBeInstanceOf(Error);
        expect((failure as Error).message).toMatch(new RegExp(`^\\[siteping\\] ${option} must`));
        expect(inspect(failure)).not.toContain("SECRET");
      });
    }
  });

  it.each([
    "https://uploader:s3cr3t@cdn.example.com/screens",
    "https://:s3cr3t@cdn.example.com/screens",
    "https://uploader@cdn.example.com/screens",
  ])("refuses the publicBaseUrl %s, whose credentials every screenshot URL would carry", (publicBaseUrl) => {
    // The whole message: the refused value, which holds the password, is not echoed.
    expect(() => createPublicUrlMapping(publicBaseUrl)).toThrow(
      /^\[siteping\] publicBaseUrl must not contain credentials \(user:password@\)$/,
    );
  });

  it.each(["https:cdn.example.com/screens", "HTTPS://CDN.Example.COM/screens/"])(
    "builds https:// URLs from the publicBaseUrl %s, as the widget's panel requires",
    (publicBaseUrl) => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const mapping = createPublicUrlMapping(publicBaseUrl);

      const url = mapping.urlFor(KEY);

      expect(url).toBe(`https://cdn.example.com/screens/${KEY}`);
      expect(mapping.keyFromUrl(url)).toBe(KEY);
      expect(warn).not.toHaveBeenCalled();
    },
  );

  it("warns that an http publicBaseUrl off this machine hides screenshots from the widget's panel", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    createPublicUrlMapping("http://minio.internal:9000/screenshots");
    createPublicUrlMapping("https://app.example.com/api/siteping/screenshots");

    expect(warn).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('"http://minio.internal:9000/screenshots" is neither https nor on this machine'),
    );
  });

  it.each([
    "http://localhost:3000/api/siteping/screenshots",
    "http://minio.localhost/screenshots",
    "http://127.0.0.1:9000/screenshots",
    "http://[::1]:9000/screenshots",
  ])("does not warn about the publicBaseUrl %s, whose screenshots the widget's panel shows in development", (base) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    createPublicUrlMapping(base);

    expect(warn).not.toHaveBeenCalled();
  });

  it.each(["http://localhost.example.com/screenshots", "http://127.0.0.2/screenshots"])(
    "still warns about the publicBaseUrl %s, which is not this machine to the widget",
    (base) => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      createPublicUrlMapping(base);

      expect(warn).toHaveBeenCalledOnce();
    },
  );

  it("checks the Cloudflare Images deliveryBaseUrl the same way", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(() => openCloudflareImages("/cdn-cgi/imagedelivery")).toThrow(/deliveryBaseUrl must be an absolute/);
    openCloudflareImages("http://example.com/cdn-cgi/imagedelivery");

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("deliveryBaseUrl"));
  });

  it("warns about an S3 endpoint that ends with the bucket name, as R2's dashboard shows it", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    openS3("https://account.r2.cloudflarestorage.com/screens/", fetch);
    openS3("https://minio.example.com/screens-proxy", fetch);
    openS3("http://screens", fetch);

    expect(warn).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('endpoint ends with the bucket name "screens"'),
    );
  });

  it("refuses a relative S3 endpoint and accepts a local http one without warning (MinIO)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(() => openS3("account.r2.cloudflarestorage.com", fetch)).toThrow(/endpoint must be an absolute/);
    expect(() => openS3("http://localhost:9000", fetch)).not.toThrow();

    expect(warn).not.toHaveBeenCalled();
  });
});

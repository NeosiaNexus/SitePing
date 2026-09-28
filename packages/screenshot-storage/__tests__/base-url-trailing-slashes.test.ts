import { describe, expect, it } from "vitest";
import { createCloudflareImagesObjectStore } from "../src/backends/cloudflare-images.js";
import { createS3ObjectStore } from "../src/backends/s3.js";
import { createPublicUrlMapping } from "../src/index.js";

const KEY = "siteping-0123456789abcdef.jpg";
/** Long run of `/` — quadratic for a backtracking `/\/+$/`, linear for the scan. */
const SLASH_RUN = "/".repeat(100_000);
/** Generous for a linear scan (well under 1 ms); the regex took seconds on these inputs. */
const LINEAR_TIME_BUDGET_MS = 250;

function measure<T>(operation: () => T): { result: T; elapsedMs: number } {
  const startedAt = performance.now();
  const result = operation();
  return { result, elapsedMs: performance.now() - startedAt };
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

  it("trims a long run of trailing slashes in linear time", () => {
    const { result: mapping, elapsedMs } = measure(() =>
      createPublicUrlMapping(`https://cdn.example.com/screens${SLASH_RUN}`),
    );

    expect(elapsedMs).toBeLessThan(LINEAR_TIME_BUDGET_MS);
    expect(mapping.urlFor(KEY)).toBe(`https://cdn.example.com/screens/${KEY}`);
  });

  it("keeps a long run of inner slashes, in linear time", () => {
    const publicBaseUrl = `https://cdn.example.com${SLASH_RUN}screens`;

    const { result: mapping, elapsedMs } = measure(() => createPublicUrlMapping(publicBaseUrl));

    expect(elapsedMs).toBeLessThan(LINEAR_TIME_BUDGET_MS);
    expect(mapping.urlFor(KEY)).toBe(`${publicBaseUrl}/${KEY}`);
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

  it("Cloudflare Images delivery URLs ignore trailing slashes of deliveryBaseUrl", () => {
    const objectStore = openCloudflareImages("https://example.com/cdn-cgi/imagedelivery///");

    const url = objectStore.urlFor(KEY);

    expect(url).toBe(`https://example.com/cdn-cgi/imagedelivery/hash-1/${KEY}/public`);
    expect(objectStore.keyFromUrl(url)).toBe(KEY);
  });

  it("Cloudflare Images handles a deliveryBaseUrl with a long run of inner slashes in linear time", () => {
    const deliveryBaseUrl = `https://example.com${SLASH_RUN}cdn-cgi/imagedelivery`;

    const { result: objectStore, elapsedMs } = measure(() => openCloudflareImages(`${deliveryBaseUrl}/`));

    expect(elapsedMs).toBeLessThan(LINEAR_TIME_BUDGET_MS);
    expect(objectStore.urlFor(KEY)).toBe(`${deliveryBaseUrl}/hash-1/${KEY}/public`);
  });

  it("S3 requests ignore trailing slashes of the endpoint", async () => {
    const { requestedUrls, recordingFetch } = recordRequests();

    await openS3("https://account.r2.cloudflarestorage.com///", recordingFetch).remove(KEY);

    expect(requestedUrls).toEqual([`https://account.r2.cloudflarestorage.com/screens/${KEY}`]);
  });

  it("S3 handles an endpoint with a long run of inner slashes in linear time", async () => {
    const { requestedUrls, recordingFetch } = recordRequests();
    const endpoint = `https://account.r2.cloudflarestorage.com${SLASH_RUN}r2`;

    const startedAt = performance.now();
    await openS3(`${endpoint}/`, recordingFetch).remove(KEY);
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(LINEAR_TIME_BUDGET_MS);
    expect(requestedUrls).toEqual([new URL(`${endpoint}/screens/${KEY}`).href]);
  });
});

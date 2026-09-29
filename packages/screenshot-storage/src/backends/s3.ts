import { HTTP_STATUS_FORBIDDEN, HTTP_STATUS_NOT_FOUND } from "../constants/http.js";
import {
  S3_ACCESS_DENIED_ERROR_CODE,
  S3_DEFAULT_REGION,
  S3_ERROR_CODE_PATTERN,
  S3_ERROR_MESSAGE_PATTERN,
} from "../constants/s3.js";
import { SERVED_SCREENSHOT_CACHE_CONTROL } from "../constants/screenshots.js";
import { normalizeBaseUrl } from "../core/base-url.js";
import { ObjectStoreRequestError, sendBackendRequest } from "../core/http.js";
import type { ScreenshotObjectStore } from "../core/object-store.js";
import { assertRequiredString, assertTimeoutMs } from "../core/option-checks.js";
import { createPublicUrlMapping } from "../core/public-url.js";
import { encodeRfc3986, type SigV4Credentials, sha256Hex, signS3Request } from "./sigv4.js";

export interface S3ObjectStoreOptions extends SigV4Credentials {
  /**
   * S3 API endpoint: `https://s3.<region>.amazonaws.com`,
   * `https://<account>.r2.cloudflarestorage.com`, `https://s3.<region>.backblazeb2.com`,
   * your MinIO URL…
   */
  endpoint: string;
  bucket: string;
  /** Signing region. Defaults to `auto` (Cloudflare R2); use the bucket's region on AWS and B2. */
  region?: string | undefined;
  /**
   * Public URL objects are read from: the bucket's public domain, a CDN in
   * front of it, or `createScreenshotServeHandler` when the bucket is private.
   * An absolute URL, https in production: the widget's panel only shows
   * https screenshots.
   */
  publicBaseUrl: string;
  fetch?: typeof fetch | undefined;
  /** Per-request timeout in milliseconds, response body included: an integer from 1 to 2147483647. Defaults to 5000. */
  timeoutMs?: number | undefined;
  /**
   * Clock read once per request to sign it (`x-amz-date` and credential scope).
   * Defaults to the host clock; supply a corrected one when the host clock is
   * skewed, since S3 rejects signatures more than a few minutes off.
   */
  now?: (() => Date) | undefined;
  /**
   * Read a `403 AccessDenied` on GET as a missing object. Enable it when the
   * credentials have `s3:GetObject` but not `s3:ListBucket` (a common
   * least-privilege IAM policy): S3 then answers a missing key with
   * `403 AccessDenied` instead of `404 NoSuchKey`, so the serve handler would
   * return `500` instead of `404`. Only the `AccessDenied` code is mapped —
   * credential failures (`SignatureDoesNotMatch`, `InvalidAccessKeyId`,
   * `ExpiredToken`, `RequestTimeTooSkewed`…) still throw. Trade-off: a policy
   * that also lacks `s3:GetObject` then shows as `404` rather than failing.
   * Deletes need no mapping (S3 answers `204` for a missing key). Defaults to `false`.
   */
  treatAccessDeniedAsMissing?: boolean | undefined;
}

/**
 * Whether an S3 error body carries the `AccessDenied` code — a permission
 * denial, as opposed to a credential or signing failure.
 *
 * @param errorBody - Raw XML error body of the response.
 */
function isAccessDeniedError(errorBody: string): boolean {
  return S3_ERROR_CODE_PATTERN.exec(errorBody)?.[1] === S3_ACCESS_DENIED_ERROR_CODE;
}

/**
 * The `<Code>` and `<Message>` of an S3 error body, and nothing else of it:
 * a `SignatureDoesNotMatch` body also echoes the canonical request, whose
 * signed headers include the `x-amz-security-token` of temporary credentials.
 *
 * @param errorBody - Raw XML error body of the response.
 * @returns `Code: Message`, the code alone, or `undefined` for a body without a code.
 */
function describeS3Error(errorBody: string): string | undefined {
  const code = S3_ERROR_CODE_PATTERN.exec(errorBody)?.[1];
  if (code === undefined) return undefined;
  const message = S3_ERROR_MESSAGE_PATTERN.exec(errorBody)?.[1]?.trim();
  return message ? `${code}: ${message}` : code;
}

/**
 * Screenshots in any S3-compatible bucket — AWS S3, Cloudflare R2, Backblaze
 * B2, MinIO, DigitalOcean Spaces… Requests are signed with SigV4 over
 * WebCrypto, so no AWS SDK is needed and it runs on edge runtimes too.
 * Uses path-style URLs (`<endpoint>/<bucket>/<key>`), supported by all of them.
 */
export function createS3ObjectStore({
  endpoint,
  bucket,
  region = S3_DEFAULT_REGION,
  publicBaseUrl,
  accessKeyId,
  secretAccessKey,
  sessionToken,
  fetch = globalThis.fetch,
  timeoutMs,
  now = () => new Date(),
  treatAccessDeniedAsMissing = false,
}: S3ObjectStoreOptions): ScreenshotObjectStore {
  const factory = "createS3ObjectStore";
  assertRequiredString(factory, "bucket", bucket);
  assertRequiredString(factory, "region", region);
  assertRequiredString(factory, "accessKeyId", accessKeyId);
  assertRequiredString(factory, "secretAccessKey", secretAccessKey);
  assertTimeoutMs(factory, timeoutMs);
  const credentials: SigV4Credentials = { accessKeyId, secretAccessKey, ...(sessionToken ? { sessionToken } : {}) };
  const endpointBase = normalizeBaseUrl(endpoint, "endpoint");
  // Without ListBucket, S3 hides a missing key behind 403 — see treatAccessDeniedAsMissing.
  const getMissingStatuses = treatAccessDeniedAsMissing
    ? [HTTP_STATUS_NOT_FOUND, HTTP_STATUS_FORBIDDEN]
    : [HTTP_STATUS_NOT_FOUND];
  const objectUrl = (key: string) => new URL(`${endpointBase}/${encodeRfc3986(bucket)}/${encodeRfc3986(key)}`);

  const send = async (
    method: "PUT" | "DELETE" | "GET",
    key: string,
    options: {
      body?: Uint8Array<ArrayBuffer>;
      headers?: Record<string, string>;
      /** Sent but left out of the signature, as the AWS SDK does for headers a proxy may rewrite. */
      unsignedHeaders?: Record<string, string>;
      acceptStatuses?: number[];
      isUpload?: boolean;
    } = {},
  ) => {
    const url = objectUrl(key);
    const headers = await signS3Request(
      { method, url, headers: options.headers ?? {}, payloadHash: await sha256Hex(options.body ?? new Uint8Array()) },
      credentials,
      region,
      now(),
    );
    return sendBackendRequest({
      backend: "S3",
      url,
      init: {
        method,
        headers: { ...options.unsignedHeaders, ...headers },
        ...(options.body ? { body: options.body } : {}),
      },
      fetch,
      ...(timeoutMs === undefined ? {} : { timeoutMs }),
      ...(options.acceptStatuses ? { acceptStatuses: options.acceptStatuses } : {}),
      ...(options.isUpload ? { isUpload: true } : {}),
      describeError: describeS3Error,
    });
  };

  return {
    name: "S3",
    ...createPublicUrlMapping(publicBaseUrl),

    async put({ key, bytes, contentType }) {
      await send("PUT", key, {
        body: bytes,
        headers: { "content-type": contentType },
        unsignedHeaders: { "cache-control": SERVED_SCREENSHOT_CACHE_CONTROL },
        isUpload: true,
      });
    },

    async remove(key) {
      // S3 answers 204 for a missing key; other implementations may answer 404.
      await send("DELETE", key, { acceptStatuses: [HTTP_STATUS_NOT_FOUND] });
    },

    // Lets a private bucket be served through createScreenshotServeHandler.
    async get(key) {
      const response = await send("GET", key, { acceptStatuses: getMissingStatuses });
      if (response.status === HTTP_STATUS_NOT_FOUND) return null;
      // The request timeout also cuts the body short: a failed read is a failed request.
      const failure = (cause: unknown) =>
        new ObjectStoreRequestError("S3", "GET", objectUrl(key).pathname, response.status, { cause });
      const read = <T>(body: Promise<T>): Promise<T> =>
        body.catch((cause: unknown) => {
          throw failure(cause);
        });
      if (response.status === HTTP_STATUS_FORBIDDEN) {
        const errorBody = await read(response.text());
        if (isAccessDeniedError(errorBody)) return null;
        throw failure(describeS3Error(errorBody));
      }
      return {
        bytes: new Uint8Array(await read(response.arrayBuffer())),
        contentType: response.headers.get("content-type") ?? "application/octet-stream",
      };
    },
  };
}

export type { ScreenshotObjectStore } from "../core/object-store.js";

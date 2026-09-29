import { Sha256 } from "@aws-crypto/sha256-js";
import { SignatureV4 } from "@smithy/signature-v4";

/**
 * In-memory stand-ins for the Cloudflare Images and S3 APIs, injected as
 * `fetch`. They implement only the endpoints the backends call, with the
 * real request/response shapes, and record every request.
 */

export interface RecordedRequest {
  method: string;
  url: URL;
  headers: Headers;
}

export interface FakeBackend {
  fetch: typeof fetch;
  objects: Map<string, { bytes: Uint8Array; contentType: string }>;
  requests: RecordedRequest[];
  /** Answer requests matching `METHOD path` with `status`, optionally after storing the object anyway. */
  failWhen(pattern: RegExp, status: number, options?: { afterStoring?: boolean }): void;
}

interface Failure {
  pattern: RegExp;
  status: number;
  afterStoring: boolean;
}

function matchFailure(failures: Failure[], method: string, url: URL): Failure | undefined {
  return failures.find(({ pattern }) => pattern.test(`${method} ${url.pathname}`));
}

export function createFakeCloudflareImages({
  accountId,
  apiToken,
}: {
  accountId: string;
  apiToken: string;
}): FakeBackend {
  const objects: FakeBackend["objects"] = new Map();
  const requests: RecordedRequest[] = [];
  const failures: Failure[] = [];
  const imagesPath = `/client/v4/accounts/${accountId}/images/v1`;

  const fakeFetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    requests.push({ method: request.method, url, headers: request.headers });
    if (request.headers.get("authorization") !== `Bearer ${apiToken}`) {
      return Response.json(
        { success: false, errors: [{ code: 10000, message: "Authentication error" }] },
        { status: 403 },
      );
    }
    const failure = matchFailure(failures, request.method, url);

    if (request.method === "POST" && url.pathname === imagesPath) {
      const form = await request.formData();
      const file = form.get("file");
      const id = form.get("id");
      if (!(file instanceof Blob) || typeof id !== "string") return new Response(null, { status: 400 });
      if (!failure || failure.afterStoring) {
        objects.set(id, { bytes: new Uint8Array(await file.arrayBuffer()), contentType: file.type });
      }
      if (failure) return new Response(null, { status: failure.status });
      return Response.json({ success: true, result: { id, variants: [] } });
    }
    const deleteMatch = request.method === "DELETE" ? url.pathname.match(new RegExp(`^${imagesPath}/(.+)$`)) : null;
    if (deleteMatch?.[1]) {
      if (failure) return new Response(null, { status: failure.status });
      const id = decodeURIComponent(deleteMatch[1]);
      if (!objects.delete(id)) return Response.json({ success: false }, { status: 404 });
      return Response.json({ success: true, result: {} });
    }
    return new Response(null, { status: 404 });
  };

  return {
    fetch: fakeFetch,
    objects,
    requests,
    failWhen: (pattern, status, options) =>
      failures.push({ pattern, status, afterStoring: options?.afterStoring ?? false }),
  };
}

/** Lowercase hex SHA-256 of `body`, as S3 expects it in `x-amz-content-sha256`. */
async function sha256Hex(body: Uint8Array): Promise<string> {
  const hash = new Sha256();
  hash.update(body);
  return Buffer.from(await hash.digest()).toString("hex");
}

/**
 * Fake S3 that authenticates every request by re-signing it with AWS's own
 * `@smithy/signature-v4` and comparing signatures, as S3 does — so a signing
 * bug surfaces as a 403 exactly like against the real service. The signer
 * takes the payload hash from the request's `x-amz-content-sha256` header as
 * is, so the fake also checks that header against the body, as S3 does with
 * a 400 `XAmzContentSHA256Mismatch`.
 *
 * `canListBucket: false` models credentials without `s3:ListBucket`: S3 then
 * answers a GET of a missing key with `403 AccessDenied` instead of `404 NoSuchKey`.
 */
export function createFakeS3({
  bucket,
  region,
  accessKeyId,
  secretAccessKey,
  canListBucket = true,
}: {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  canListBucket?: boolean;
}): FakeBackend {
  const objects: FakeBackend["objects"] = new Map();
  const requests: RecordedRequest[] = [];
  const failures: Failure[] = [];
  const signer = new SignatureV4({
    credentials: { accessKeyId, secretAccessKey },
    region,
    service: "s3",
    sha256: Sha256,
    uriEscapePath: false,
  });

  const isAuthentic = async (request: Request, url: URL, body: Uint8Array): Promise<boolean> => {
    const amzDate = request.headers.get("x-amz-date") ?? "";
    const signingDate = new Date(
      `${amzDate.slice(0, 4)}-${amzDate.slice(4, 6)}-${amzDate.slice(6, 8)}T${amzDate.slice(9, 11)}:${amzDate.slice(11, 13)}:${amzDate.slice(13, 15)}Z`,
    );
    const headers: Record<string, string> = { host: url.host };
    request.headers.forEach((value, name) => {
      if (name !== "authorization") headers[name] = value;
    });
    const signed = await signer.sign(
      {
        method: request.method,
        protocol: url.protocol,
        hostname: url.hostname,
        path: url.pathname,
        query: {},
        headers,
        body,
      },
      { signingDate },
    );
    return signed.headers.authorization === request.headers.get("authorization");
  };

  const fakeFetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    requests.push({ method: request.method, url, headers: request.headers });
    const body = new Uint8Array(await request.arrayBuffer());
    if (!(await isAuthentic(request, url, body))) {
      // Like S3, echo the canonical request it computed: the signed headers, session token included.
      const canonicalHeaders: string[] = [];
      request.headers.forEach((value, name) => {
        if (name !== "authorization") canonicalHeaders.push(`${name}:${value}`);
      });
      return new Response(
        "<Error><Code>SignatureDoesNotMatch</Code><Message>The request signature we calculated does not match " +
          "the signature you provided. Check your key and signing method.</Message>" +
          `<CanonicalRequest>${request.method}\n${url.pathname}\n\n${canonicalHeaders.join("\n")}</CanonicalRequest></Error>`,
        { status: 403 },
      );
    }
    if (request.headers.get("x-amz-content-sha256") !== (await sha256Hex(body))) {
      return new Response(
        "<Error><Code>XAmzContentSHA256Mismatch</Code><Message>The provided 'x-amz-content-sha256' header does " +
          "not match what was computed.</Message></Error>",
        { status: 400 },
      );
    }
    const prefix = `/${bucket}/`;
    if (!url.pathname.startsWith(prefix)) return new Response(null, { status: 404 });
    const key = decodeURIComponent(url.pathname.slice(prefix.length));
    const failure = matchFailure(failures, request.method, url);

    if (request.method === "PUT") {
      if (!failure || failure.afterStoring) {
        objects.set(key, { bytes: body, contentType: request.headers.get("content-type") ?? "" });
      }
      return new Response(null, { status: failure?.status ?? 200 });
    }
    if (failure) return new Response(null, { status: failure.status });
    if (request.method === "GET") {
      const object = objects.get(key);
      if (!object && !canListBucket) {
        return new Response("<Error><Code>AccessDenied</Code><Message>Access Denied</Message></Error>", {
          status: 403,
        });
      }
      if (!object) return new Response("<Error><Code>NoSuchKey</Code></Error>", { status: 404 });
      return new Response(object.bytes as Uint8Array<ArrayBuffer>, { headers: { "content-type": object.contentType } });
    }
    if (request.method === "DELETE") {
      objects.delete(key);
      return new Response(null, { status: 204 });
    }
    return new Response(null, { status: 405 });
  };

  return {
    fetch: fakeFetch,
    objects,
    requests,
    failWhen: (pattern, status, options) =>
      failures.push({ pattern, status, afterStoring: options?.afterStoring ?? false }),
  };
}

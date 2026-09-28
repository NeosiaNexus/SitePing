import { S3_SERVICE, SIGV4_ALGORITHM, SIGV4_SCOPE_TERMINATOR } from "../constants/s3.js";

export interface SigV4Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  /** Temporary credentials (STS). */
  sessionToken?: string;
}

export interface SigV4Request {
  method: string;
  url: URL;
  /** Headers to sign besides `host`, `x-amz-date` and `x-amz-content-sha256`. */
  headers: Record<string, string>;
  /** Hex SHA-256 of the body (`UNSIGNED-PAYLOAD` is not used). */
  payloadHash: string;
}

const textEncoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(data: Uint8Array<ArrayBuffer> | string): Promise<string> {
  const bytes = typeof data === "string" ? textEncoder.encode(data) : data;
  return toHex(await crypto.subtle.digest("SHA-256", bytes));
}

async function hmac(key: ArrayBuffer | Uint8Array<ArrayBuffer>, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, textEncoder.encode(message));
}

/** RFC 3986 encoding as SigV4 requires (`encodeURIComponent` leaves `!'()*` unescaped). */
export function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/** S3 canonical URI: each path segment encoded once, slashes kept. */
function canonicalUri(url: URL): string {
  return url.pathname
    .split("/")
    .map((segment) => encodeRfc3986(decodeURIComponent(segment)))
    .join("/");
}

function canonicalQuery(url: URL): string {
  return [...url.searchParams.entries()]
    .map(([key, value]) => [encodeRfc3986(key), encodeRfc3986(value)] as const)
    .sort(([keyA, valueA], [keyB, valueB]) => (keyA === keyB ? (valueA < valueB ? -1 : 1) : keyA < keyB ? -1 : 1))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

/** `YYYYMMDD'T'HHMMSS'Z'` */
function toAmzDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/**
 * Sign a request with AWS Signature Version 4 (header-based) using WebCrypto
 * only. Returns every header to send, `Authorization` included.
 *
 * @param signingDate - Instant the signature is valid from. Supplied by the
 * caller (the store's injected clock) so this module never reads the host clock.
 */
export async function signS3Request(
  request: SigV4Request,
  credentials: SigV4Credentials,
  region: string,
  signingDate: Date,
): Promise<Record<string, string>> {
  const amzDate = toAmzDate(signingDate);
  const dateStamp = amzDate.slice(0, 8);
  const headers: Record<string, string> = {
    ...Object.fromEntries(Object.entries(request.headers).map(([name, value]) => [name.toLowerCase(), value])),
    host: request.url.host,
    "x-amz-content-sha256": request.payloadHash,
    "x-amz-date": amzDate,
    ...(credentials.sessionToken ? { "x-amz-security-token": credentials.sessionToken } : {}),
  };
  const signedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderNames
    .map((name) => `${name}:${String(headers[name]).trim().replace(/\s+/g, " ")}\n`)
    .join("");
  const signedHeaders = signedHeaderNames.join(";");

  const canonicalRequest = [
    request.method.toUpperCase(),
    canonicalUri(request.url),
    canonicalQuery(request.url),
    canonicalHeaders,
    signedHeaders,
    request.payloadHash,
  ].join("\n");
  const scope = `${dateStamp}/${region}/${S3_SERVICE}/${SIGV4_SCOPE_TERMINATOR}`;
  const stringToSign = [SIGV4_ALGORITHM, amzDate, scope, await sha256Hex(canonicalRequest)].join("\n");

  const dateKey = await hmac(textEncoder.encode(`AWS4${credentials.secretAccessKey}`), dateStamp);
  const regionKey = await hmac(dateKey, region);
  const serviceKey = await hmac(regionKey, S3_SERVICE);
  const signingKey = await hmac(serviceKey, SIGV4_SCOPE_TERMINATOR);
  const signature = toHex(await hmac(signingKey, stringToSign));

  const { host: _host, ...sendableHeaders } = headers;
  return {
    ...sendableHeaders,
    authorization: `${SIGV4_ALGORITHM} Credential=${credentials.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

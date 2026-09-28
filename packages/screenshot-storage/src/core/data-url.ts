import {
  BASE64_BYTES_PER_GROUP,
  BASE64_CHARACTERS_PER_GROUP,
  BASE64_LINE_BREAK_LENGTH,
  BASE64_LINE_LENGTH,
  DATA_URL_HEADER_MAX_LENGTH,
  IMAGE_CONTENT_TYPE_PATTERN,
  IMAGE_DATA_URL_PATTERN,
} from "../constants/screenshots.js";

/** A decoded image data URL. */
export interface DecodedImage {
  contentType: string;
  bytes: Uint8Array<ArrayBuffer>;
}

/** Why a data URL was refused — part of the error message, never the payload. */
export class InvalidScreenshotError extends Error {
  constructor(reason: string) {
    super(`[siteping] screenshot rejected: ${reason}`);
    this.name = "InvalidScreenshotError";
  }
}

/**
 * Refuse, at configuration time, a `maxBytes` that could not enforce a limit:
 * `NaN` or `Infinity` (e.g. computed from a missing setting) would make every
 * size comparison false and silently accept uploads of any size.
 *
 * @param maxBytes - The `maxBytes` option of `createScreenshotStorage`.
 * @throws Error naming the refused value unless it is a positive safe integer.
 */
export function assertMaxBytes(maxBytes: number): void {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new Error(
      `[siteping] createScreenshotStorage: maxBytes must be a positive integer number of bytes, got ${String(maxBytes)}`,
    );
  }
}

/**
 * Canonical form of the configured allowlist. MIME types are case-insensitive
 * and uploads compare the data URL's lowercased type, so each entry is trimmed
 * and lowercased once, at configuration time — `"IMAGE/GIF"` then accepts GIF
 * uploads instead of silently refusing every one.
 *
 * The result is a private, frozen snapshot: the factory validates it and
 * uploads keep matching against it, so a caller that later mutates its own
 * array (TypeScript's `readonly` does not freeze it) cannot slip an
 * unvalidated type such as `image/svg+xml` past the configuration checks.
 *
 * @param allowedContentTypes - The `allowedContentTypes` option of `createScreenshotStorage`.
 * @returns A new frozen array of normalized content types; the caller's array is left untouched.
 */
export function normalizeContentTypes(allowedContentTypes: readonly string[]): readonly string[] {
  return Object.freeze(allowedContentTypes.map((contentType) => contentType.trim().toLowerCase()));
}

/**
 * Refuse, at configuration time, any allowed content type the data URL parser
 * could never produce: {@link IMAGE_DATA_URL_PATTERN} only accepts
 * `image/<subtype>`, so an entry such as `text/png` would pass the key checks
 * yet every matching upload would be rejected as "not a base64 image data URL".
 * Both checks share the grammar of {@link IMAGE_CONTENT_TYPE_PATTERN}.
 *
 * @param allowedContentTypes - Allowed content types, normalized by {@link normalizeContentTypes}.
 * @throws Error naming the offending content type and the expected grammar.
 */
export function assertParsableContentTypes(allowedContentTypes: readonly string[]): void {
  for (const contentType of allowedContentTypes) {
    if (!IMAGE_CONTENT_TYPE_PATTERN.test(contentType)) {
      throw new Error(
        `[siteping] createScreenshotStorage: allowed content type "${contentType}" does not match ${IMAGE_CONTENT_TYPE_PATTERN.source}: ` +
          "no image data URL can carry it — drop it from allowedContentTypes",
      );
    }
  }
}

/**
 * Longest base64 payload (whitespace removed) that can decode to at most
 * `maxBytes` bytes — checked before decoding so an oversized upload never
 * costs its decoding.
 *
 * @param maxBytes - Validated `maxBytes` limit.
 */
function maxBase64Length(maxBytes: number): number {
  return Math.ceil(maxBytes / BASE64_BYTES_PER_GROUP) * BASE64_CHARACTERS_PER_GROUP;
}

/**
 * Longest raw data URL worth parsing for `maxBytes`: the header, the longest
 * accepted payload, and one line break per MIME-wrapped base64 line. Checked
 * first, so a payload padded with whitespace is refused before the pattern
 * match and the whitespace removal scan (and copy) all of it.
 *
 * @param maxBytes - Validated `maxBytes` limit.
 */
function maxDataUrlLength(maxBytes: number): number {
  const payloadLength = maxBase64Length(maxBytes);
  const lineBreaksLength = Math.ceil(payloadLength / BASE64_LINE_LENGTH) * BASE64_LINE_BREAK_LENGTH;
  return DATA_URL_HEADER_MAX_LENGTH + payloadLength + lineBreaksLength;
}

/** Decode base64 with Web APIs only (runs on Node, Bun, Deno and edge runtimes). */
function decodeBase64(payload: string): Uint8Array<ArrayBuffer> {
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

/**
 * Parse and validate a base64 image data URL against the allowed types and
 * size. The raw data URL length is bounded before parsing (so whitespace cannot
 * inflate the work done before `maxBytes` applies), the payload length before
 * decoding, the decoded size after.
 *
 * @param dataUrl - The widget's screenshot data URL (untrusted input).
 * @param limits - Allowed content types (normalized by {@link normalizeContentTypes}) and `maxBytes`, validated by `createScreenshotStorage`.
 * @throws InvalidScreenshotError naming the reason, never echoing the payload.
 */
export function decodeImageDataUrl(
  dataUrl: string,
  limits: { allowedContentTypes: readonly string[]; maxBytes: number },
): DecodedImage {
  if (dataUrl.length > maxDataUrlLength(limits.maxBytes)) {
    throw new InvalidScreenshotError(
      `data URL of ${dataUrl.length} characters exceeds the ${limits.maxBytes}-byte limit`,
    );
  }
  const match = IMAGE_DATA_URL_PATTERN.exec(dataUrl);
  if (!match?.[1] || !match[2]) throw new InvalidScreenshotError("not a base64 image data URL");
  const contentType = match[1].toLowerCase();
  if (!limits.allowedContentTypes.includes(contentType)) {
    throw new InvalidScreenshotError(`content type ${contentType} is not allowed`);
  }
  const payload = match[2].replace(/\s/g, "");
  if (payload.length > maxBase64Length(limits.maxBytes)) {
    throw new InvalidScreenshotError(
      `base64 payload of ${payload.length} characters exceeds the ${limits.maxBytes}-byte limit`,
    );
  }
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = decodeBase64(payload);
  } catch {
    throw new InvalidScreenshotError("invalid base64 payload");
  }
  if (bytes.length === 0) throw new InvalidScreenshotError("empty image");
  if (bytes.length > limits.maxBytes) {
    throw new InvalidScreenshotError(`${bytes.length} bytes exceeds the ${limits.maxBytes}-byte limit`);
  }
  return { contentType, bytes };
}

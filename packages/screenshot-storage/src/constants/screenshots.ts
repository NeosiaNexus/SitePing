/** Image types accepted by default — what the widget captures, plus common lossless/modern formats. */
export const DEFAULT_ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * Image subtypes that are documents rather than inert pixels: an SVG (or any
 * XML-based image) opened directly runs its scripts with the origin that
 * serves it, and `X-Content-Type-Options: nosniff` cannot help, since the
 * declared type is already the active one. Matched anywhere in the subtype,
 * so `image/svg`, `image/svg+xml` and vendor variants are all caught.
 */
export const ACTIVE_IMAGE_SUBTYPE_PATTERN = /svg|xml/;

/** Type and disposition a served object gets when its stored type is not an inert image. */
export const DOWNLOAD_ONLY_CONTENT_TYPE = "application/octet-stream";

/**
 * Largest decoded screenshot accepted by default, in bytes: what the largest
 * data URL the server accepts (1.5M characters, header included) decodes to,
 * so the storage never refuses a screenshot the server let through.
 */
export const DEFAULT_MAX_SCREENSHOT_BYTES = 1_125_000;

/** Prefix of generated object keys; keeps SitePing objects recognizable in a shared bucket. */
export const DEFAULT_KEY_PREFIX = "siteping-";

/** Random bytes in a generated key (hex-encoded: twice as many characters). */
export const KEY_RANDOM_BYTES = 16;

/** Decoded bytes per base64 group — with {@link BASE64_CHARACTERS_PER_GROUP}, bounds a payload before decoding it. */
export const BASE64_BYTES_PER_GROUP = 3;

/** Characters per base64 group (padding included). */
export const BASE64_CHARACTERS_PER_GROUP = 4;

/**
 * Longest `data:<type>;base64,` header budgeted before the payload when bounding
 * a raw data URL — generous for any image subtype a browser produces.
 */
export const DATA_URL_HEADER_MAX_LENGTH = 128;

/**
 * Characters per line of a MIME-wrapped base64 payload (RFC 2045) — the most
 * whitespace a legitimate data URL carries is one line break per such line.
 */
export const BASE64_LINE_LENGTH = 76;

/** Characters of the line break (CR LF) budgeted after each wrapped base64 line. */
export const BASE64_LINE_BREAK_LENGTH = 2;

/**
 * Grammar of an image MIME type (`image/<subtype>`) — the single source shared
 * by the data URL parser and the `allowedContentTypes` check, so every
 * configured type is one an upload can actually carry.
 */
const IMAGE_CONTENT_TYPE_SOURCE = "image/[a-z0-9.+-]+";

/** A whole image MIME type, e.g. `image/png` (case-insensitive, like MIME types). */
export const IMAGE_CONTENT_TYPE_PATTERN = new RegExp(`^${IMAGE_CONTENT_TYPE_SOURCE}$`, "i");

/** Base64 image data URL: `data:<type>;base64,<payload>`. */
export const IMAGE_DATA_URL_PATTERN = new RegExp(`^data:(${IMAGE_CONTENT_TYPE_SOURCE});base64,([a-z0-9+/=\\s]+)$`, "i");

/**
 * Conventional file extension per content type, where it differs from (or is
 * shorter than) the subtype's alphanumerics. Other allowed types derive their
 * extension from the subtype (`image/gif` → `gif`).
 */
export const CONTENT_TYPE_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};

/**
 * `Content-Security-Policy` of every served screenshot: no subresource, no
 * script, and a sandbox (opaque origin) — so even an active object that
 * reached the backend by another path (a legacy import, a shared bucket)
 * cannot act as a document of the application's origin when opened directly.
 * Images rendered by an `<img>` are unaffected.
 */
export const SERVED_SCREENSHOT_CONTENT_SECURITY_POLICY = "default-src 'none'; sandbox";

/**
 * `Cache-Control` of screenshots served without an `authorize` callback, and
 * stored with each S3 object for a public bucket to send — objects are
 * immutable (a new key per upload), so any cache may keep them.
 */
export const SERVED_SCREENSHOT_CACHE_CONTROL = "public, max-age=31536000, immutable";

/**
 * `Cache-Control` of screenshots served behind an `authorize` callback: only the
 * requesting browser may keep them (a shared cache — CDN, proxy — storing an
 * authorized response would hand it to later requests without running the
 * check), and it must revalidate every reuse (`no-cache`), so a logout, a
 * revoked access or another user of the same browser profile gets the new
 * `authorize` decision instead of a still-fresh copy. Revalidation is cheap:
 * the handler answers `304` to a matching `If-None-Match` (the ETag is the
 * immutable key) without resending the bytes.
 */
export const AUTHORIZED_SERVED_SCREENSHOT_CACHE_CONTROL = "private, no-cache";

// Building blocks of a generated key `<prefix><hex>.<extension>` — the single
// source every key check below is derived from, so keys `createScreenshotStorage`
// produces are always keys the serve handler and backends accept.
const KEY_PREFIX_SOURCE = "[a-z0-9_-]{0,64}";
const KEY_RANDOM_SOURCE = `[a-f0-9]{${KEY_RANDOM_BYTES * 2}}`;
const KEY_EXTENSION_SOURCE = "[a-z0-9]{1,10}";

/** Allowed `keyPrefix`: safe in file names, URLs and object keys. */
export const KEY_PREFIX_PATTERN = new RegExp(`^${KEY_PREFIX_SOURCE}$`);

/** Allowed extension of a generated key — every allowed content type must map to one. */
export const KEY_EXTENSION_PATTERN = new RegExp(`^${KEY_EXTENSION_SOURCE}$`);

/** Part of a generated key after its prefix: `<hex>.<extension>`. */
export const GENERATED_KEY_SUFFIX_PATTERN = new RegExp(`^${KEY_RANDOM_SOURCE}\\.${KEY_EXTENSION_SOURCE}$`);

/** Shape of a generated key (`<prefix><hex>.<ext>`) — the serve handler refuses anything else. */
export const GENERATED_KEY_PATTERN = new RegExp(`^${KEY_PREFIX_SOURCE}${KEY_RANDOM_SOURCE}\\.${KEY_EXTENSION_SOURCE}$`);

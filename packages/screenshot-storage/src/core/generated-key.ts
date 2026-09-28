import {
  CONTENT_TYPE_EXTENSIONS,
  GENERATED_KEY_SUFFIX_PATTERN,
  KEY_EXTENSION_PATTERN,
  KEY_PREFIX_PATTERN,
  KEY_RANDOM_BYTES,
} from "../constants/screenshots.js";

/**
 * Refuse a `keyPrefix` that is unsafe in file names, URLs or object keys. Shared
 * by `createScreenshotStorage` and `createScreenshotServeHandler`, which must
 * agree on the namespace they write and serve.
 *
 * @param keyPrefix - The `keyPrefix` option.
 * @param caller - Public factory validating it, named in the error.
 * @throws Error naming the caller and the refused prefix.
 */
export function assertKeyPrefix(keyPrefix: string, caller: string): void {
  if (!KEY_PREFIX_PATTERN.test(keyPrefix)) {
    throw new Error(`[siteping] ${caller}: keyPrefix "${keyPrefix}" must match ${KEY_PREFIX_PATTERN.source}`);
  }
}

/**
 * Extension a generated key gets for `contentType`: the conventional one when
 * known, otherwise the subtype's lowercase alphanumerics (`image/gif` → `gif`).
 *
 * @param contentType - An allowed image content type, e.g. `image/png`.
 * @returns The extension, without the dot. May be empty or too long for
 *   {@link KEY_EXTENSION_PATTERN} — {@link assertKeyableContentTypes} rejects those upfront.
 */
export function keyExtensionFor(contentType: string): string {
  return (
    CONTENT_TYPE_EXTENSIONS[contentType] ?? (contentType.split("/")[1] ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")
  );
}

/**
 * Refuse, at configuration time, any allowed content type whose key extension
 * would not match the generated-key shape: such uploads would succeed but the
 * serve handler (and the filesystem backend) would then refuse their keys.
 *
 * @param allowedContentTypes - The `allowedContentTypes` option of `createScreenshotStorage`.
 * @throws Error naming the offending content type and its derived extension.
 */
export function assertKeyableContentTypes(allowedContentTypes: readonly string[]): void {
  for (const contentType of allowedContentTypes) {
    const extension = keyExtensionFor(contentType);
    if (!KEY_EXTENSION_PATTERN.test(extension)) {
      throw new Error(
        `[siteping] createScreenshotStorage: allowed content type "${contentType}" yields key extension "${extension}", ` +
          `which does not match ${KEY_EXTENSION_PATTERN.source}: its keys could not be served — drop it from allowedContentTypes`,
      );
    }
  }
}

function randomHex(byteCount: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteCount));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * A fresh random key `<prefix><hex>.<extension>` for one upload.
 *
 * @param keyPrefix - Validated `keyPrefix` option.
 * @param contentType - Content type of the upload (already allowlisted).
 */
export function generateKey(keyPrefix: string, contentType: string): string {
  return `${keyPrefix}${randomHex(KEY_RANDOM_BYTES)}.${keyExtensionFor(contentType)}`;
}

/**
 * Whether `key` could have been produced by {@link generateKey} with
 * `keyPrefix` — the namespace a storage may delete from and a serve handler
 * may serve. Anything else behind the same public base or directory (another
 * app's asset or screenshots, a legacy import) is not ours.
 *
 * @param key - Key recovered from a URL (the backend's `keyFromUrl`, or the serve handler's request path).
 * @param keyPrefix - Validated `keyPrefix` option.
 */
export function isGeneratedKey(key: string, keyPrefix: string): boolean {
  return key.startsWith(keyPrefix) && GENERATED_KEY_SUFFIX_PATTERN.test(key.slice(keyPrefix.length));
}

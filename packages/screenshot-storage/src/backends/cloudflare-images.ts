import {
  CLOUDFLARE_API_BASE_URL,
  CLOUDFLARE_IMAGES_DEFAULT_VARIANT,
  CLOUDFLARE_IMAGES_DELIVERY_BASE_URL,
  CLOUDFLARE_IMAGES_UPLOAD_FIELDS,
} from "../constants/cloudflare-images.js";
import { HTTP_STATUS_NOT_FOUND } from "../constants/http.js";
import { normalizeBaseUrl, warnUnlessHttps } from "../core/base-url.js";
import { sendBackendRequest } from "../core/http.js";
import type { ScreenshotObjectStore } from "../core/object-store.js";
import { assertPathSegment, assertRequiredString, assertTimeoutMs } from "../core/option-checks.js";
import { safeDecodeURIComponent } from "../core/safe-decode-uri-component.js";

export interface CloudflareImagesObjectStoreOptions {
  /** Cloudflare account id (API calls). */
  accountId: string;
  /** API token with the `Cloudflare Images: Edit` permission. */
  apiToken: string;
  /** Account hash of the delivery URLs (`imagedelivery.net/<hash>/…`), shown in the Images dashboard. */
  accountHash: string;
  /** Variant the widget renders. Defaults to `public`. */
  variant?: string | undefined;
  /** Delivery URL root — set it when serving Images from a custom domain (`https://example.com/cdn-cgi/imagedelivery`). */
  deliveryBaseUrl?: string | undefined;
  fetch?: typeof fetch | undefined;
  /** Budget of each call in milliseconds, retries and response body included: an integer from 1 to 2147483647. Defaults to 5000. */
  timeoutMs?: number | undefined;
}

/**
 * The `code: message` pairs of a Cloudflare API error body (its `errors`
 * array), or `undefined` for a body without any.
 *
 * @param body - Raw JSON error body of the response.
 */
function describeCloudflareError(body: string): string | undefined {
  try {
    const { errors } = JSON.parse(body) as { errors?: { code?: unknown; message?: unknown }[] };
    return Array.isArray(errors) && errors.length > 0
      ? errors.map(({ code, message }) => `${String(code)}: ${String(message)}`).join("; ")
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Screenshots on Cloudflare Images. Each object is uploaded under its
 * generated key as the custom image id, so the delivery URL is known before
 * the upload completes.
 */
export function createCloudflareImagesObjectStore({
  accountId,
  apiToken,
  accountHash,
  variant = CLOUDFLARE_IMAGES_DEFAULT_VARIANT,
  deliveryBaseUrl = CLOUDFLARE_IMAGES_DELIVERY_BASE_URL,
  fetch = globalThis.fetch,
  timeoutMs,
}: CloudflareImagesObjectStoreOptions): ScreenshotObjectStore {
  const factory = "createCloudflareImagesObjectStore";
  assertRequiredString(factory, "accountId", accountId);
  assertRequiredString(factory, "apiToken", apiToken);
  // Both are written verbatim into every delivery URL.
  assertPathSegment(factory, "accountHash", accountHash);
  assertPathSegment(factory, "variant", variant);
  assertTimeoutMs(factory, timeoutMs);
  const imagesUrl = `${CLOUDFLARE_API_BASE_URL}/accounts/${encodeURIComponent(accountId)}/images/v1`;
  const deliveryBase = normalizeBaseUrl(deliveryBaseUrl, "deliveryBaseUrl");
  warnUnlessHttps(deliveryBase, "deliveryBaseUrl");
  const deliveryPrefix = `${deliveryBase}/${accountHash}/`;
  const authorization = { Authorization: `Bearer ${apiToken}` };
  const request = (
    url: URL,
    init: RequestInit,
    extra: { idempotent: boolean; acceptStatuses?: number[]; isUpload?: boolean },
  ) =>
    sendBackendRequest({
      backend: "Cloudflare Images",
      url,
      init,
      fetch,
      ...(timeoutMs === undefined ? {} : { timeoutMs }),
      ...extra,
      describeError: describeCloudflareError,
    });

  return {
    name: "Cloudflare Images",

    urlFor: (key) => `${deliveryPrefix}${encodeURIComponent(key)}/${variant}`,

    keyFromUrl(url) {
      if (!url.startsWith(deliveryPrefix)) return null;
      const [key, deliveredVariant, ...rest] = url.slice(deliveryPrefix.length).split("/");
      // A malformed encoding (legacy or corrupt record) is not ours: `null`, never a throw.
      return key && deliveredVariant && rest.length === 0 ? safeDecodeURIComponent(key) : null;
    },

    async put({ key, bytes, contentType }) {
      const form = new FormData();
      form.append(CLOUDFLARE_IMAGES_UPLOAD_FIELDS.file, new Blob([bytes], { type: contentType }), key);
      form.append(CLOUDFLARE_IMAGES_UPLOAD_FIELDS.id, key);
      // Not idempotent: a POST that failed without a 429 may have stored the image, and a
      // retry would then be refused as a duplicate id — it is reclaimed as an unknown outcome.
      await request(
        new URL(imagesUrl),
        { method: "POST", headers: authorization, body: form },
        { idempotent: false, isUpload: true },
      );
    },

    async remove(key) {
      await request(
        new URL(`${imagesUrl}/${encodeURIComponent(key)}`),
        { method: "DELETE", headers: authorization },
        { idempotent: true, acceptStatuses: [HTTP_STATUS_NOT_FOUND] },
      );
    },
  };
}

export type { ScreenshotObjectStore } from "../core/object-store.js";

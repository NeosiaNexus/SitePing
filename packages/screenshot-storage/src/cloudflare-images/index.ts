import {
  CLOUDFLARE_API_BASE_URL,
  CLOUDFLARE_IMAGES_DEFAULT_VARIANT,
  CLOUDFLARE_IMAGES_DELIVERY_BASE_URL,
  CLOUDFLARE_IMAGES_UPLOAD_FIELDS,
} from "../constants/cloudflare-images.js";
import { HTTP_STATUS_NOT_FOUND } from "../constants/http.js";
import { sendBackendRequest } from "../core/http.js";
import type { ScreenshotObjectStore } from "../core/object-store.js";
import { safeDecodeURIComponent } from "../core/safe-decode-uri-component.js";
import { trimTrailingSlashes } from "../core/trailing-slashes.js";

export interface CloudflareImagesObjectStoreOptions {
  /** Cloudflare account id (API calls). */
  accountId: string;
  /** API token with the `Cloudflare Images: Edit` permission. */
  apiToken: string;
  /** Account hash of the delivery URLs (`imagedelivery.net/<hash>/…`), shown in the Images dashboard. */
  accountHash: string;
  /** Variant the widget renders. Defaults to `public`. */
  variant?: string;
  /** Delivery URL root — set it when serving Images from a custom domain (`https://example.com/cdn-cgi/imagedelivery`). */
  deliveryBaseUrl?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
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
  const imagesUrl = `${CLOUDFLARE_API_BASE_URL}/accounts/${encodeURIComponent(accountId)}/images/v1`;
  const deliveryPrefix = `${trimTrailingSlashes(deliveryBaseUrl)}/${accountHash}/`;
  const authorization = { Authorization: `Bearer ${apiToken}` };
  const request = (url: URL, init: RequestInit, extra: { acceptStatuses?: number[]; isUpload?: boolean } = {}) =>
    sendBackendRequest({
      backend: "Cloudflare Images",
      url,
      init,
      fetch,
      ...(timeoutMs === undefined ? {} : { timeoutMs }),
      ...extra,
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
      await request(new URL(imagesUrl), { method: "POST", headers: authorization, body: form }, { isUpload: true });
    },

    async remove(key) {
      await request(
        new URL(`${imagesUrl}/${encodeURIComponent(key)}`),
        { method: "DELETE", headers: authorization },
        { acceptStatuses: [HTTP_STATUS_NOT_FOUND] },
      );
    },
  };
}

export type { ScreenshotObjectStore } from "../core/object-store.js";

/** Cloudflare API root. */
export const CLOUDFLARE_API_BASE_URL = "https://api.cloudflare.com/client/v4";

/** Host Cloudflare Images delivers images from. */
export const CLOUDFLARE_IMAGES_DELIVERY_BASE_URL = "https://imagedelivery.net";

/** Variant served when none is configured (exists on every Images account). */
export const CLOUDFLARE_IMAGES_DEFAULT_VARIANT = "public";

/** Multipart field names of the upload endpoint. */
export const CLOUDFLARE_IMAGES_UPLOAD_FIELDS = {
  file: "file",
  id: "id",
} as const satisfies Record<string, string>;

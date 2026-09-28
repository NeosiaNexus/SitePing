import { safeDecodeURIComponent } from "./safe-decode-uri-component.js";
import { trimTrailingSlashes } from "./trailing-slashes.js";

/**
 * URL ↔ key mapping for backends that serve objects under a base URL
 * (`<base>/<key>`): the filesystem and memory stores behind the serve
 * handler, or an S3 bucket behind a CDN / public domain. `keyFromUrl` treats
 * a URL whose key has malformed percent-encoding as not ours (`null`), so a
 * legacy or corrupt record never makes `delete` throw.
 */
export function createPublicUrlMapping(publicBaseUrl: string) {
  const base = trimTrailingSlashes(publicBaseUrl);
  return {
    urlFor: (key: string): string => `${base}/${encodeURIComponent(key)}`,
    keyFromUrl: (url: string): string | null => {
      if (!url.startsWith(`${base}/`)) return null;
      const key = safeDecodeURIComponent(url.slice(base.length + 1));
      return key !== null && key.length > 0 && !key.includes("/") ? key : null;
    },
  };
}

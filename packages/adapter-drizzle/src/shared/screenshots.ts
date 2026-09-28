import { DATA_URL_MEDIA_TYPE_PATTERN, FALLBACK_SCREENSHOT_MIME_TYPE } from "../constants/screenshots.js";

/**
 * MIME type of a submitted screenshot, read from its data URL so storages
 * receive the real `Content-Type` (`image/png`, `image/webp`…) instead of an
 * assumed JPEG.
 *
 * @param dataUrl - Screenshot data URL, e.g. `data:image/png;base64,…`.
 * @returns The declared media type in lower case (MIME types are
 *   case-insensitive), or {@link FALLBACK_SCREENSHOT_MIME_TYPE} when the
 *   data URL declares none.
 */
export function screenshotMimeType(dataUrl: string): string {
  const mediaType = DATA_URL_MEDIA_TYPE_PATTERN.exec(dataUrl)?.[1];
  return mediaType ? mediaType.toLowerCase() : FALLBACK_SCREENSHOT_MIME_TYPE;
}

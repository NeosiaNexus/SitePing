import { ACTIVE_IMAGE_CONTENT_TYPES } from "../constants/screenshots.js";

/**
 * Refuse, at configuration time, any allowed content type that is an active
 * document (`image/svg+xml`): served inline from the application's origin by
 * the serve handler — or by a public bucket on a shared domain — it could run
 * scripts with that origin when opened directly.
 *
 * @param allowedContentTypes - The `allowedContentTypes` option of `createScreenshotStorage`.
 * @throws Error naming the offending content type.
 */
export function assertInertContentTypes(allowedContentTypes: readonly string[]): void {
  for (const contentType of allowedContentTypes) {
    if (ACTIVE_IMAGE_CONTENT_TYPES.includes(contentType.trim().toLowerCase())) {
      throw new Error(
        `[siteping] createScreenshotStorage: allowed content type "${contentType}" is an active format that can run ` +
          "scripts when opened directly — drop it from allowedContentTypes (screenshots are raster images)",
      );
    }
  }
}

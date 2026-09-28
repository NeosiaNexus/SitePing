import { ACTIVE_IMAGE_SUBTYPE_PATTERN, IMAGE_CONTENT_TYPE_PATTERN } from "../constants/screenshots.js";

/**
 * The inert image type a stored content type declares, or `null` when it is
 * anything else: not `image/*` (`text/html`…) or an active image format
 * (`image/svg+xml`). Parameters are dropped and the type lowercased, so a
 * backend answering `image/png; charset=binary` still counts as `image/png`.
 *
 * @param contentType - A content type as stored or configured.
 */
export function inertImageContentType(contentType: string): string | null {
  const mediaType = (contentType.split(";")[0] ?? "").trim().toLowerCase();
  if (!IMAGE_CONTENT_TYPE_PATTERN.test(mediaType)) return null;
  return ACTIVE_IMAGE_SUBTYPE_PATTERN.test(mediaType.slice("image/".length)) ? null : mediaType;
}

/**
 * Refuse, at configuration time, any allowed content type that is an active
 * document (`image/svg+xml`): served inline from the application's origin by
 * the serve handler — or by a public bucket on a shared domain — it could run
 * scripts with that origin when opened directly.
 *
 * @param allowedContentTypes - Allowed content types, normalized and checked by `assertParsableContentTypes`.
 * @throws Error naming the offending content type.
 */
export function assertInertContentTypes(allowedContentTypes: readonly string[]): void {
  for (const contentType of allowedContentTypes) {
    if (inertImageContentType(contentType) === null) {
      throw new Error(
        `[siteping] createScreenshotStorage: allowed content type "${contentType}" is an active format that can run ` +
          "scripts when opened directly — drop it from allowedContentTypes (screenshots are raster images)",
      );
    }
  }
}

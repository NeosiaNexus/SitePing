import { type Column, type SQL, sql } from "drizzle-orm";
import { INLINE_SCREENSHOT_URL_LIKE_PATTERN } from "../constants/screenshots.js";
import type { DeletedFeedbacks, DeleteFeedbacksOptions } from "./gateway.js";

/**
 * The stored `screenshotUrl` of a row, or `NULL` when it holds an inline data
 * URL: inline screenshots were never uploaded, so there is nothing to clean up,
 * and reading them back would materialize megabytes per row.
 *
 * @param screenshotUrl - The feedback table's `screenshotUrl` column.
 */
function uploadedScreenshotUrl(screenshotUrl: Column): SQL<string | null> {
  return sql<
    string | null
  >`CASE WHEN ${screenshotUrl} LIKE ${INLINE_SCREENSHOT_URL_LIKE_PATTERN} THEN NULL ELSE ${screenshotUrl} END`;
}

/**
 * `RETURNING` columns of a feedback delete: the id alone (enough to tell a hit
 * from a miss), plus the uploaded `screenshotUrl` only when the caller will
 * clean up screenshots. Inline base64 data URLs are never read back — they
 * would materialize megabytes per row for nothing, and can exceed an HTTP
 * driver's response-size limit.
 *
 * @param columns - Feedback table columns (`id`, `screenshotUrl`) of the dialect.
 * @param options - Whether the screenshot URLs are needed.
 */
export function deletedFeedbackColumns<IdColumn extends Column>(
  columns: { id: IdColumn; screenshotUrl: Column },
  { collectScreenshotUrls }: DeleteFeedbacksOptions,
): Record<string, IdColumn | SQL<string | null>> {
  return collectScreenshotUrls
    ? { id: columns.id, screenshotUrl: uploadedScreenshotUrl(columns.screenshotUrl) }
    : { id: columns.id };
}

/**
 * What a delete built with {@link deletedFeedbackColumns} removed.
 *
 * @param rows - Rows returned by that delete.
 */
export function toDeletedFeedbacks(rows: ReadonlyArray<Record<string, unknown>>): DeletedFeedbacks {
  return {
    deletedCount: rows.length,
    screenshotUrls: rows.flatMap((row) =>
      "screenshotUrl" in row ? [typeof row.screenshotUrl === "string" ? row.screenshotUrl : null] : [],
    ),
  };
}

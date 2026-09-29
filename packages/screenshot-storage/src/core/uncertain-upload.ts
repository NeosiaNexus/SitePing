import { UNCERTAIN_UPLOAD_RECLAIM_TIMEOUT_MS } from "../constants/screenshots.js";
import { type ScreenshotStorageLogger, safeWarn } from "./logger.js";
import type { ScreenshotObjectStore } from "./object-store.js";

export type { ScreenshotStorageLogger } from "./logger.js";

/** Called with the key of every upload whose outcome is unknown. */
export type UncertainUploadHook = (key: string) => void | Promise<void>;

interface UncertainUploadReclaimerOptions {
  objectStore: Pick<ScreenshotObjectStore, "name" | "remove">;
  logger: ScreenshotStorageLogger;
  onUncertainUpload: UncertainUploadHook | undefined;
}

/**
 * Build the reclaim routine for uploads whose outcome is unknown (timeout,
 * 5xx, network error): the backend may still commit the object after the
 * client gave up, leaving an object no feedback references.
 *
 * `reclaim(key)` removes the key right away and, at the same time, hands it
 * to the host's `onUncertainUpload` hook, which can remove it again later
 * from a durable job — the immediate removal can run before a late commit
 * lands. It waits for both at most {@link UNCERTAIN_UPLOAD_RECLAIM_TIMEOUT_MS}
 * (a stalled backend or queue would otherwise hold the feedback past the
 * widget's request timeout), then leaves what is still running to finish in
 * the background.
 *
 * It never throws: a failed removal (rejected or thrown synchronously by the
 * backend) and a failing hook (sync or async) are each logged whenever they
 * fail, without skipping the other step, and the caller rethrows the
 * original upload error. Logging goes through {@link safeWarn}, so a logger
 * that throws cannot break that contract either.
 *
 * @returns `reclaim(key)`, resolved once the removal and the hook settled, or the deadline passed.
 */
export function createUncertainUploadReclaimer({
  objectStore,
  logger,
  onUncertainUpload,
}: UncertainUploadReclaimerOptions): (key: string) => Promise<void> {
  return async (key) => {
    // Each step runs inside a promise chain, so a custom backend or hook that
    // throws before returning its promise is logged like a rejection instead
    // of escaping: the caller keeps its original upload error.
    const removal = Promise.resolve()
      .then(() => objectStore.remove(key))
      .catch((reclaimError: unknown) => {
        safeWarn(logger, `[siteping] ${objectStore.name}: could not reclaim an uncertain upload`, {
          key,
          error: reclaimError,
        });
      });
    const hook = Promise.resolve()
      .then(() => onUncertainUpload?.(key))
      .catch((hookError: unknown) => {
        safeWarn(logger, `[siteping] ${objectStore.name}: onUncertainUpload failed`, { key, error: hookError });
      })
      .then(() => true);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<false>((resolve) => {
      timer = setTimeout(() => resolve(false), UNCERTAIN_UPLOAD_RECLAIM_TIMEOUT_MS);
    });
    const [, hookSettled] = await Promise.all([Promise.race([removal, deadline]), Promise.race([hook, deadline])]);
    clearTimeout(timer);
    if (!hookSettled) {
      safeWarn(
        logger,
        `[siteping] ${objectStore.name}: onUncertainUpload has not settled after ${UNCERTAIN_UPLOAD_RECLAIM_TIMEOUT_MS} ms — ` +
          "the upload error is reported without waiting for it",
        { key },
      );
    }
  };
}

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
 * `reclaim(key)` removes the key right away, then hands it to the host's
 * `onUncertainUpload` hook, which can remove it again later from a durable
 * job — the immediate removal can run before a late commit lands. It never
 * throws: a failed removal (rejected or thrown synchronously by the backend)
 * and a failing hook (sync or async) are each logged without skipping the
 * other step, and the caller rethrows the original upload error. Logging goes
 * through {@link safeWarn}, so a logger that throws cannot break that
 * contract either.
 *
 * @returns `reclaim(key)`, resolved once the removal and the hook settled.
 */
export function createUncertainUploadReclaimer({
  objectStore,
  logger,
  onUncertainUpload,
}: UncertainUploadReclaimerOptions): (key: string) => Promise<void> {
  return async (key) => {
    // `remove` runs inside the promise chain, so a custom backend that throws
    // before returning its promise is logged like a rejection instead of
    // escaping: the caller keeps its original upload error and the hook runs.
    await Promise.resolve()
      .then(() => objectStore.remove(key))
      .catch((reclaimError: unknown) => {
        safeWarn(logger, `[siteping] ${objectStore.name}: could not reclaim an uncertain upload`, {
          key,
          error: reclaimError,
        });
      });
    if (!onUncertainUpload) return;
    try {
      await onUncertainUpload(key);
    } catch (hookError) {
      safeWarn(logger, `[siteping] ${objectStore.name}: onUncertainUpload failed`, { key, error: hookError });
    }
  };
}

import { type ScreenshotStorageLogger, safeWarn } from "./logger.js";
import type { ScreenshotObjectStore } from "./object-store.js";

export type { ScreenshotStorageLogger } from "./logger.js";

/** Runs `task` once, `delayMs` from now, without the caller awaiting it. */
export type ReclaimScheduler = (task: () => void, delayMs: number) => void;

/** Called with the key of every upload whose outcome is unknown. */
export type UncertainUploadHook = (key: string) => void | Promise<void>;

interface UncertainUploadReclaimerOptions {
  objectStore: Pick<ScreenshotObjectStore, "name" | "remove">;
  logger: ScreenshotStorageLogger;
  delaysMs: readonly number[];
  schedule: ReclaimScheduler;
  onUncertainUpload: UncertainUploadHook | undefined;
}

/**
 * Default {@link ReclaimScheduler}: a `setTimeout` that does not keep a
 * Node.js process alive just for a pending reclaim.
 */
export const scheduleWithTimer: ReclaimScheduler = (task, delayMs) => {
  const timer: unknown = setTimeout(task, delayMs);
  if (typeof timer === "object" && timer !== null && "unref" in timer && typeof timer.unref === "function") {
    timer.unref();
  }
};

/**
 * Refuse reclaim delays that are not finite, non-negative numbers of
 * milliseconds, or that exceed `maxDelayMs`.
 *
 * Iterates by index rather than with `find`: an invalid entry may itself be
 * `undefined` (a JavaScript caller's `[undefined]`, or a hole in a sparse
 * array), which `find` would return indistinguishably from "no match" — and the
 * default scheduler would coerce it to an immediate timer, running every retry
 * before a late upload commits.
 *
 * @param delaysMs - The `uncertainUploadReclaimDelaysMs` option.
 * @param maxDelayMs - Longest delay the scheduler honors: `MAX_TIMER_DELAY_MS`
 *   for {@link scheduleWithTimer}, whose `setTimeout` clamps a larger delay to
 *   1 ms (running the attempt before a late upload commits); `Infinity` for an
 *   injected scheduler, which handles long delays its own way.
 * @throws Error naming the index and value of the first invalid delay.
 */
export function assertReclaimDelays(delaysMs: readonly number[], maxDelayMs: number): void {
  for (let index = 0; index < delaysMs.length; index++) {
    const delayMs: unknown = delaysMs[index];
    if (typeof delayMs !== "number" || !Number.isFinite(delayMs) || delayMs < 0) {
      throw new Error(
        `[siteping] createScreenshotStorage: uncertainUploadReclaimDelaysMs[${index}] is ${String(delayMs)}, ` +
          "but must be a finite, non-negative number of milliseconds",
      );
    }
    if (delayMs > maxDelayMs) {
      throw new Error(
        `[siteping] createScreenshotStorage: uncertainUploadReclaimDelaysMs[${index}] is ${delayMs}, ` +
          `but the default scheduler (setTimeout) cannot wait more than ${maxDelayMs} ms — ` +
          "pass a scheduleReclaim that supports longer delays",
      );
    }
  }
}

/**
 * Build the reclaim routine for uploads whose outcome is unknown (timeout,
 * 5xx, network error): the backend may still commit the object after the
 * client gave up, leaving an object no feedback references.
 *
 * `reclaim(key)` removes the key right away, schedules one more `remove` per
 * configured delay (so an upload committed after the first removal is still
 * deleted, as long as the process lives), and hands the key to the host's
 * `onUncertainUpload` hook for durable handling. It never throws: a failed
 * removal (rejected or thrown synchronously by the backend), a scheduler that
 * throws and a failing hook (sync or async) are each logged without
 * skipping the remaining steps, and the caller rethrows the original upload error.
 * Logging goes through {@link safeWarn}, so a logger that throws cannot break
 * that contract either.
 *
 * Only a backend-side lifecycle rule (e.g. S3/R2 expiration under the key
 * prefix) or a durable job fed by the hook fully guarantees no orphan
 * survives a process that exits before the last delayed attempt.
 *
 * @returns `reclaim(key)`, resolved once the immediate removal and the hook settled.
 */
export function createUncertainUploadReclaimer({
  objectStore,
  logger,
  delaysMs,
  schedule,
  onUncertainUpload,
}: UncertainUploadReclaimerOptions): (key: string) => Promise<void> {
  // `remove` runs inside the promise chain, so a custom backend that throws
  // before returning its promise is logged like a rejection instead of
  // escaping: the caller keeps its original upload error, the remaining
  // attempts and the hook still run, and a scheduled attempt never becomes an
  // unhandled rejection.
  const removeLogged = (key: string, attempt: string): Promise<void> =>
    Promise.resolve()
      .then(() => objectStore.remove(key))
      .catch((reclaimError: unknown) => {
        safeWarn(logger, `[siteping] ${objectStore.name}: could not reclaim an uncertain upload`, {
          key,
          attempt,
          error: reclaimError,
        });
      });

  return async (key) => {
    await removeLogged(key, "immediate");
    for (const delayMs of delaysMs) {
      // A failing injected scheduler loses this attempt only: the other
      // attempts, the hook and the caller's original upload error still follow.
      try {
        schedule(() => void removeLogged(key, `after ${delayMs} ms`), delayMs);
      } catch (scheduleError) {
        safeWarn(
          logger,
          `[siteping] ${objectStore.name}: could not schedule a delayed reclaim of an uncertain upload`,
          {
            key,
            delayMs,
            error: scheduleError,
          },
        );
      }
    }
    if (!onUncertainUpload) return;
    try {
      await onUncertainUpload(key);
    } catch (hookError) {
      safeWarn(logger, `[siteping] ${objectStore.name}: onUncertainUpload failed`, { key, error: hookError });
    }
  };
}

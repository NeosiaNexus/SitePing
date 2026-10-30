import type { SitepingWarnLogger } from "@siteping/core";

/**
 * Reports degraded-but-handled situations (failed reclaim of an uncertain
 * upload, refused delete) — SitePing's shared logger, with `warn`: `console`
 * satisfies it, and so does the logger handed to the server.
 */
export type ScreenshotStorageLogger = SitepingWarnLogger;

/**
 * Call `logger.warn` without letting a failing logger escape: a throw, or a
 * rejection of what it returns, is dropped.
 *
 * Warnings are only emitted on paths documented as non-throwing (the uncertain
 * upload reclaimer, `delete` refusing a foreign key): an injected logger that
 * throws there would otherwise replace the caller's original upload error or
 * skip the reclaim hook. There is no other channel to report the logger's own
 * failure through, and re-logging would call the same broken logger.
 */
export { warnSafely as safeWarn } from "@siteping/core";

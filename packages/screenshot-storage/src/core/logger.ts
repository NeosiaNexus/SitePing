/** Reports degraded-but-handled situations (failed reclaim of an uncertain upload, refused delete). */
export interface ScreenshotStorageLogger {
  warn(message: string, context: Record<string, unknown>): void;
}

/**
 * Call `logger.warn` without letting a failing logger escape.
 *
 * Warnings are only emitted on paths documented as non-throwing (the uncertain
 * upload reclaimer, `delete` refusing a foreign key): an injected logger that
 * throws there would otherwise replace the caller's original upload error,
 * skip the remaining reclaim attempts and the hook, or surface as an unhandled
 * rejection from a scheduled attempt. The logger's own failure is deliberately
 * dropped — there is no other channel to report it through, and re-logging
 * would call the same broken logger.
 *
 * @param logger - The injected (or default) logger.
 * @param message - Warning message.
 * @param context - Structured context (keys, attempt, original error).
 */
export function safeWarn(logger: ScreenshotStorageLogger, message: string, context: Record<string, unknown>): void {
  try {
    logger.warn(message, context);
  } catch {
    // Intentionally ignored: see above.
  }
}

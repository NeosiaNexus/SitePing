/**
 * Where SitePing reports what goes wrong. The arguments come in console's and
 * winston's order, so `console` and winston satisfy it as they are. pino's
 * methods take the context first and type-check here anyway, then drop the
 * context: adapt them — `{ error: (message, { error, ...context }) =>
 * log.error({ err: error, ...context }, message), warn: … }`.
 *
 * Each option asks only for the level it reports — the handler's `logger`
 * for `error`, the stores' and screenshot storages' for `warn`
 * ({@link SitepingWarnLogger}) — so one object can be handed to all of them.
 */
export interface SitepingLogger {
  /** Unexpected failures: a request answered 500, a hook or a lookup failed. */
  error(message: string, context: Record<string, unknown>): void | Promise<void>;
  /**
   * Degraded but handled: a screenshot dropped or left orphaned, screenshots
   * stored inline. The handler never calls it; the stores and screenshot
   * storages require it.
   */
  warn?(message: string, context: Record<string, unknown>): void | Promise<void>;
}

/** What the stores and screenshot storages report through: a {@link SitepingLogger} with `warn`. */
export type SitepingWarnLogger = Required<Pick<SitepingLogger, "warn">>;

/**
 * Report through `logger.warn` without letting the logger fail its caller,
 * on paths documented as non-throwing: a throw, or a rejection of what it
 * returns — unhandled, fatal in Node by default — is dropped. A broken
 * logger has no other channel to report through.
 */
export function warnSafely(logger: SitepingWarnLogger, message: string, context: Record<string, unknown>): void {
  try {
    Promise.resolve(logger.warn(message, context)).catch(() => {});
  } catch {
    // Dropped: see above.
  }
}

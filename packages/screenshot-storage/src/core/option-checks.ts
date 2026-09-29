import { TIMER_MAX_DELAY_MS } from "../constants/http.js";

/*
 * Checks the backend factories run on their options when they are created,
 * each naming the factory in its error. A value read from a missing
 * environment variable would otherwise surface as one failed upload per
 * feedback.
 */

/**
 * Unset, or a delay a timer can hold. `AbortSignal.timeout` throws on `NaN`,
 * a fraction or a negative delay, and fires a longer one at once: every
 * request would fail without reaching the backend, each upload taken for an
 * unknown outcome.
 *
 * @param factory - Public factory validating it, named in the error.
 * @param timeoutMs - The `timeoutMs` option.
 */
export function assertTimeoutMs(factory: string, timeoutMs: number | undefined): void {
  if (timeoutMs !== undefined && !(Number.isInteger(timeoutMs) && timeoutMs >= 1 && timeoutMs <= TIMER_MAX_DELAY_MS)) {
    throw new Error(
      `[siteping] ${factory}: timeoutMs must be an integer number of milliseconds from 1 to ${TIMER_MAX_DELAY_MS}, got ${String(timeoutMs)}`,
    );
  }
}

import { TIMER_MAX_DELAY_MS } from "../constants/http.js";

/*
 * Checks the backend factories run on their options when they are created,
 * each naming the factory in its error. A value read from a missing
 * environment variable would otherwise surface as one failed upload per
 * feedback, or not at all: as screenshot URLs built on "undefined".
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

/**
 * A required string option, set and not blank. The value is never echoed: it
 * may be a credential.
 *
 * @param factory - Public factory validating it, named in the error.
 * @param option - Name of the option.
 * @param value - Its value, typed `string` but unchecked at runtime (`process.env.X!`).
 */
export function assertRequiredString(factory: string, option: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`[siteping] ${factory}: ${option} is required (a non-empty string)`);
  }
}

/**
 * A required option written verbatim into screenshot URLs as one path
 * segment: a `/`, `?`, `#`, `%`, `\` or whitespace would make every URL point
 * elsewhere.
 *
 * @param factory - Public factory validating it, named in the error.
 * @param option - Name of the option.
 * @param value - Its value, typed `string` but unchecked at runtime.
 */
export function assertPathSegment(factory: string, option: string, value: unknown): void {
  assertRequiredString(factory, option, value);
  if (/[/?#%\\\s]/.test(value)) {
    throw new Error(
      `[siteping] ${factory}: ${option} must be a single URL path segment (no /, ?, #, %, \\ or whitespace)`,
    );
  }
}

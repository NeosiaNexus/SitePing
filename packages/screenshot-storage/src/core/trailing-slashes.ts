/**
 * Remove every trailing `/` from a configured base URL.
 *
 * A linear scan instead of `/\/+$/`: that regex backtracks quadratically on
 * inputs with long runs of `/` not at the end (CodeQL `js/polynomial-redos`),
 * and base URLs come from library callers.
 *
 * @param value - Base URL or endpoint as configured by the caller.
 * @returns `value` without trailing slashes (empty when it is only slashes).
 */
export function trimTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === "/") end--;
  return value.slice(0, end);
}

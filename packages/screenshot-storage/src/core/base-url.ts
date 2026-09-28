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
function trimTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === "/") end--;
  return value.slice(0, end);
}

/**
 * A configured base URL (`publicBaseUrl`, `endpoint`…) without its trailing
 * slashes, once checked to be an absolute `http(s)` URL without a query or a
 * fragment — keys are appended to it as path segments, so a relative path, a
 * `javascript:` URL or a `?query` would produce URLs that point elsewhere.
 *
 * @param value - The base URL as configured by the caller.
 * @param option - Name of the option, for the error message.
 * @throws Error naming the option and the refused value.
 */
export function normalizeBaseUrl(value: string, option: string): string {
  const base = trimTrailingSlashes(value);
  let url: URL | null = null;
  try {
    url = new URL(base);
  } catch {
    // Reported below with the other refusals.
  }
  if (!url || (url.protocol !== "https:" && url.protocol !== "http:") || url.search || url.hash) {
    throw new Error(`[siteping] ${option} must be an absolute http(s) URL without a query or fragment, got "${value}"`);
  }
  return base;
}

/**
 * Warn, at configuration time, when screenshot URLs will not be `https`: the
 * widget's panel only renders `https:` (and inline `data:`) screenshots, so
 * an `http://localhost` setup would otherwise lose them there silently — the
 * dashboard still shows them.
 *
 * @param base - A base URL validated by {@link normalizeBaseUrl}.
 * @param option - Name of the option, for the warning.
 */
export function warnUnlessHttps(base: string, option: string): void {
  if (/^https:/i.test(base)) return;
  console.warn(
    `[siteping] ${option} "${base}" is not https: the widget's panel only shows https screenshots, ` +
      "so they will be missing there (the dashboard shows them).",
  );
}

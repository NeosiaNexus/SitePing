import { parseHttpUrl } from "@siteping/core";

/*
 * Checks the built-in trackers run on their options when they are created,
 * each naming the factory in its error. A value read from the environment
 * that is off would otherwise surface as one logged failure per feedback,
 * or not at all: a page cap of `NaN` lists nothing, so a project delete
 * closes nothing.
 */

/**
 * The token, trimmed of surrounding whitespace as fetch would. Anything else
 * outside visible ASCII (a pasted zero-width space, a line break inside) is
 * refused here, without echoing it: fetch would refuse the header with an
 * error quoting the whole value, which the handler then logs.
 */
export function checkToken(factory: string, token: string): string {
  const trimmed = typeof token === "string" ? token.trim() : "";
  if (!/^[\x21-\x7E]+$/.test(trimmed)) {
    throw new Error(
      `[siteping] ${factory}: token must be a non-empty string of visible ASCII characters. ` +
        "Look for a line break, space or invisible character pasted with it.",
    );
  }
  return trimmed;
}

export function checkApiBaseUrl(factory: string, apiBaseUrl: string): void {
  if (!parseHttpUrl(apiBaseUrl)) {
    throw new Error(`[siteping] ${factory}: apiBaseUrl must be an absolute http(s) URL, got "${apiBaseUrl}"`);
  }
}

/** Unset, or a positive integer. */
export function checkPositiveInteger(factory: string, option: string, value: number | undefined): void {
  if (value !== undefined && !(Number.isSafeInteger(value) && value > 0)) {
    throw new Error(`[siteping] ${factory}: ${option} must be a positive integer, got ${value}`);
  }
}

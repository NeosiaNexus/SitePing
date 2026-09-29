/**
 * The token, trimmed of surrounding whitespace as fetch would. Anything else
 * outside visible ASCII (a pasted zero-width space, a line break inside) is
 * refused here, without echoing it: fetch would refuse the header with an
 * error quoting the whole value, which the handler then logs.
 *
 * @param factory - Name of the tracker factory, for the error message.
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

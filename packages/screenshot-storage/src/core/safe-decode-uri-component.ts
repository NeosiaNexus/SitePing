/**
 * `decodeURIComponent` that answers `null` instead of throwing a `URIError` on
 * malformed percent-encoding (`%`, `%ZZ`, a truncated UTF-8 sequence). Keys are
 * decoded from URLs that come from clients or from stored records (legacy,
 * imported, corrupt): such a URL is simply not one of ours, never an error.
 *
 * @param encoded - A percent-encoded URL component.
 * @returns The decoded component, or `null` when its encoding is malformed.
 * @throws Anything other than a `URIError`, unchanged.
 */
export function safeDecodeURIComponent(encoded: string): string | null {
  try {
    return decodeURIComponent(encoded);
  } catch (error) {
    if (error instanceof URIError) return null;
    throw error;
  }
}

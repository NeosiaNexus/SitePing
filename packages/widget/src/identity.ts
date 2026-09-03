import { hasOwn, isValidEmail, type SitepingIdentity } from "@siteping/core";

const STORAGE_KEY = "siteping_identity";

/**
 * Author identity persisted by the widget — alias of core's
 * `SitepingIdentity` (one concept, one shape; the alias keeps the widget's
 * historical export name working).
 */
export type Identity = SitepingIdentity;

/**
 * Type guard — narrows an unknown value to `Identity` only when the name is a
 * non-empty string and the email is one the server accepts. A stored identity
 * that fails the shared email pattern (persisted by an older, laxer modal) is
 * treated as absent so the modal asks again instead of every submission
 * failing with a 400.
 */
function isIdentity(value: unknown): value is Identity {
  if (!hasOwn(value, "name") || !hasOwn(value, "email")) return false;
  const { name, email } = value;
  return typeof name === "string" && typeof email === "string" && name.length > 0 && isValidEmail(email);
}

export function getIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isIdentity(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveIdentity(identity: Identity): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    // Quota exceeded or localStorage disabled — identity works for this session only
  }
}

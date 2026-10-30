import { hasOwn, IDENTITY_FIELD_MAX_LENGTH, isValidEmail, type SitepingIdentity } from "@siteping/core";

const STORAGE_KEY = "siteping_identity";

/**
 * Type guard — narrows an unknown value to a `SitepingIdentity` only when the name is a
 * non-empty string and the email is one the server accepts, both within the
 * server's length cap. A stored identity that fails either check (persisted
 * by an older, laxer modal) is treated as absent so the modal asks again
 * instead of every submission failing with a 400.
 */
function isIdentity(value: unknown): value is SitepingIdentity {
  if (!hasOwn(value, "name") || !hasOwn(value, "email")) return false;
  const { name, email } = value;
  return (
    typeof name === "string" &&
    typeof email === "string" &&
    name.length > 0 &&
    name.length <= IDENTITY_FIELD_MAX_LENGTH &&
    email.length <= IDENTITY_FIELD_MAX_LENGTH &&
    isValidEmail(email)
  );
}

export function getIdentity(): SitepingIdentity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isIdentity(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveIdentity(identity: SitepingIdentity): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    // Quota exceeded or localStorage disabled — identity works for this session only
  }
}

import { hasOwn } from "@siteping/core";

const STORAGE_KEY = "siteping_identity";

export interface Identity {
  name: string;
  email: string;
}

/** Type guard — narrows an unknown value to `Identity` only when both fields are non-empty strings. */
function isIdentity(value: unknown): value is Identity {
  if (!hasOwn(value, "name") || !hasOwn(value, "email")) return false;
  const name = (value as { name: unknown }).name;
  const email = (value as { email: unknown }).email;
  return typeof name === "string" && typeof email === "string" && name.length > 0 && email.length > 0;
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

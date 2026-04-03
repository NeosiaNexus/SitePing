const STORAGE_KEY = "siteping_identity";

export interface Identity {
  name: string;
  email: string;
}

export function getIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Identity;
    if (parsed.name && parsed.email) return parsed;
    return null;
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

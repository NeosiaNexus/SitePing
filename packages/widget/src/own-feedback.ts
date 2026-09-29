/** How many ids a project's list keeps — the oldest are dropped first. */
const MAX_OWN_FEEDBACK = 500;

/** The feedback sent from this browser, remembered by id. */
export interface OwnFeedback {
  /** The remembered ids, read on every call so another tab's sends count too. */
  ids(): Set<string>;
  add(id: string): void;
  remove(id: string): void;
  clear(): void;
}

/**
 * The ids of the feedback sent from this browser, which back the panel's
 * "Mine" filter. The server cannot answer "who sent this": its GET blanks
 * author emails for unauthenticated callers (#105), and a filter by email
 * would let anyone probe who sent feedback. So the widget keeps its own list
 * in localStorage, one per project and endpoint. When storage is unavailable
 * the list reads as empty and writes are dropped.
 */
export function ownFeedback(projectName: string, endpoint?: string): OwnFeedback {
  const key = `siteping_own_feedback:${JSON.stringify([projectName, endpoint ?? null])}`;
  const ids = (): Set<string> => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
      return new Set(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : []);
    } catch {
      return new Set();
    }
  };
  const write = (next: Set<string>): void => {
    try {
      if (next.size > 0) localStorage.setItem(key, JSON.stringify([...next].slice(-MAX_OWN_FEEDBACK)));
      else localStorage.removeItem(key);
    } catch {
      // Storage unavailable or full: the list stays as it was
    }
  };
  return {
    ids,
    add(id) {
      const next = ids();
      next.delete(id); // Re-sent: move it to the newest end
      write(next.add(id));
    },
    remove(id) {
      const next = ids();
      if (next.delete(id)) write(next);
    },
    clear: () => write(new Set()),
  };
}

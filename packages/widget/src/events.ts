type Listener = (...args: any[]) => void;

/**
 * Lightweight typed EventEmitter — zero dependencies.
 */
export class EventBus<E extends { [K in keyof E]: unknown[] }> {
  private listeners = new Map<keyof E, Set<Listener>>();

  on<K extends keyof E>(event: K, listener: (...args: E[K]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(listener as Listener);

    return () => {
      set.delete(listener as Listener);
    };
  }

  off<K extends keyof E>(event: K, listener: (...args: E[K]) => void): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener as Listener);
    }
  }

  emit<K extends keyof E>(event: K, ...args: E[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(...args);
      } catch (err) {
        // Isolate listener errors — one bad listener must not kill others
        console.error(`[siteping] Error in event listener for "${String(event)}":`, err);
      }
    }
  }

  removeAll(): void {
    this.listeners.clear();
  }
}

// ---------------------------------------------------------------------------
// Widget event types
// ---------------------------------------------------------------------------

export interface WidgetEvents {
  open: [];
  close: [];
  "feedback:sent": [import("@siteping/core").FeedbackResponse];
  "feedback:deleted": [string];
  "feedback:all-deleted": [];
  "feedback:error": [Error];
  "annotation:start": [];
  "annotation:end": [];
  "annotation:complete": [import("./annotator.js").AnnotationComplete];
  "annotations:toggle": [boolean];
  "panel:toggle": [boolean];
}

/** Subset of WidgetEvents exposed to consumers via SitepingInstance */
export interface PublicWidgetEvents {
  "feedback:sent": [import("@siteping/core").FeedbackResponse];
  "feedback:deleted": [string];
  "panel:open": [];
  "panel:close": [];
}

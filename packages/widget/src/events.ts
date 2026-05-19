import type {
  FeedbackResponse,
  SitepingPublicEventListener,
  SitepingPublicEvents,
  SitepingUnsubscribe,
} from "@siteping/core";
import type { AnnotationComplete } from "./annotator.js";

/** Listener signature for a single key of an `EventBus` event map. */
export type EventListener<E extends Record<keyof E, unknown[]>, K extends keyof E> = (...args: E[K]) => void;

/**
 * Lightweight typed `EventEmitter` — zero dependencies.
 *
 * The generic constraint guarantees each event maps to a tuple of argument
 * types, so subscribers and emitters share the exact same shape.
 */
export class EventBus<E extends Record<keyof E, unknown[]>> {
  private readonly listeners = new Map<keyof E, Set<EventListener<E, keyof E>>>();

  on<K extends keyof E>(event: K, listener: EventListener<E, K>): SitepingUnsubscribe {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as EventListener<E, keyof E>);

    return () => {
      set?.delete(listener as EventListener<E, keyof E>);
    };
  }

  off<K extends keyof E>(event: K, listener: EventListener<E, K>): void {
    this.listeners.get(event)?.delete(listener as EventListener<E, keyof E>);
  }

  emit<K extends keyof E>(event: K, ...args: E[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      try {
        (fn as (...a: E[K]) => void)(...args);
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

/** Full internal event map — broader than the public surface exposed to hosts. */
export interface WidgetEvents {
  open: [];
  close: [];
  "feedback:sent": [FeedbackResponse];
  "feedback:deleted": [FeedbackResponse["id"]];
  "feedback:all-deleted": [];
  "feedback:error": [Error];
  "annotation:start": [];
  "annotation:end": [];
  "annotation:complete": [AnnotationComplete];
  "annotations:toggle": [boolean];
  "panel:toggle": [boolean];
}

/**
 * Subset of `WidgetEvents` exposed to consumers via `SitepingInstance`.
 *
 * Kept structurally identical to `SitepingPublicEvents` from `@siteping/core`
 * so the launcher can bridge between the two without runtime casts. The
 * `satisfies` clause locks that contract at compile time — drift in either
 * side surfaces here.
 */
export type PublicWidgetEvents = SitepingPublicEvents;

/** Re-export the listener signature for ergonomics on the widget side. */
export type PublicWidgetEventListener<K extends keyof PublicWidgetEvents> = SitepingPublicEventListener<K>;

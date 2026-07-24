import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { useInboxUi } from "./context.js";

/** How long a toast stays up before auto-dismissing. */
const TOAST_MS = 5000;

/** A queued toast message — `id` restarts the dismiss timer on every new toast. */
export interface ToastData {
  id: number;
  message: string;
  undoable: boolean;
}

interface ToastProps {
  toast: ToastData | null;
  onUndo: () => void;
  onDismiss: () => void;
}

/**
 * Single toast slot at the bottom-center of the root. Auto-dismisses after 5s;
 * the timer pauses while hovered or focused so the undo button stays reachable.
 */
export function Toast({ toast, onUndo, onDismiss }: ToastProps): ReactElement | null {
  const { t } = useInboxUi();
  const [paused, setPaused] = useState(false);

  // A new toast always starts unpaused, even if the pointer still rests on the slot.
  const toastId = toast?.id;
  useEffect(() => {
    void toastId; // reset keyed on the toast id, not the object identity
    setPaused(false);
  }, [toastId]);

  useEffect(() => {
    if (!toast || paused) return;
    const timer = setTimeout(onDismiss, TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast, paused, onDismiss]);

  if (!toast) return null;

  return (
    <div
      className="spd-toast"
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="spd-toast-msg">{toast.message}</span>
      {toast.undoable ? (
        <button type="button" className="spd-btn-ghost" onClick={onUndo}>
          {t("inbox.undo")} <kbd className="spd-kbd">u</kbd>
        </button>
      ) : null}
    </div>
  );
}

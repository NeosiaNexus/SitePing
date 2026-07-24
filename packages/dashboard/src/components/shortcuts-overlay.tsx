import type { ReactElement, KeyboardEvent as ReactKeyboardEvent } from "react";
import { Fragment, useEffect, useRef } from "react";
import { useInboxUi } from "./context.js";

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface ShortcutsOverlayProps {
  onClose: () => void;
}

/**
 * Keyboard cheat sheet, toggled with "?". Modal: focus is trapped inside,
 * Esc or a click outside the card closes it, and Esc never bubbles to the
 * root (the overlay is always the topmost layer).
 */
export function ShortcutsOverlay({ onClose }: ShortcutsOverlayProps): ReactElement {
  const { t } = useInboxUi();
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    overlayRef.current?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const root = overlayRef.current;
    if (!root) return;
    const focusables = root.querySelectorAll<HTMLElement>(FOCUSABLE);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) {
      // Nothing focusable inside — keep focus on the overlay itself.
      event.preventDefault();
      return;
    }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const rows: Array<{ keys: string[]; label: string }> = [
    { keys: ["j", "k"], label: t("hints.navigate") },
    { keys: ["⏎"], label: t("hints.open") },
    { keys: ["e"], label: t("hints.resolve") },
    { keys: ["p"], label: t("hints.inProgress") },
    { keys: ["x"], label: t("hints.wontFix") },
    { keys: ["u"], label: t("inbox.undo") },
    { keys: ["r"], label: t("inbox.refresh") },
    { keys: ["/"], label: t("inbox.searchAria") },
    { keys: ["1–5"], label: t("inbox.statusFilter") },
    { keys: ["?"], label: t("hints.help") },
    { keys: ["Esc"], label: t("shortcuts.close") },
  ];

  return (
    <div
      ref={overlayRef}
      className="spd-shortcuts"
      role="dialog"
      aria-modal="true"
      aria-label={t("shortcuts.title")}
      tabIndex={-1}
      onClick={(event) => {
        // Close only on backdrop clicks — clicks inside the card stay put.
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="spd-shortcuts-card">
        <div className="spd-meta-label">{t("shortcuts.title")}</div>
        <div className="spd-shortcuts-grid">
          {rows.map((row) => (
            <Fragment key={row.label + row.keys.join()}>
              <span className="spd-shortcut-keys">
                {row.keys.map((key) => (
                  <kbd key={key} className="spd-kbd">
                    {key}
                  </kbd>
                ))}
              </span>
              <span className="spd-shortcut-label">{row.label}</span>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

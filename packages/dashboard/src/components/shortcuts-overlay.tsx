import type { ReactElement, KeyboardEvent as ReactKeyboardEvent } from "react";
import { Fragment, useEffect, useRef } from "react";
import { trapTab, useInboxUi } from "./context.js";

interface ShortcutsOverlayProps {
  /** False leaves out the status keys and undo. */
  canChangeStatus: boolean;
  onClose: () => void;
}

/**
 * Keyboard cheat sheet, toggled with "?". Modal: focus is trapped inside,
 * Esc or a click outside the card closes it, and Esc never bubbles to the
 * root (the overlay is always the topmost layer).
 */
export function ShortcutsOverlay({ canChangeStatus, onClose }: ShortcutsOverlayProps): ReactElement {
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
    if (event.key === "Tab" && overlayRef.current) trapTab(event, overlayRef.current);
  };

  const rows: Array<{ keys: string[]; label: string }> = [
    { keys: ["j", "k"], label: t("hints.navigate") },
    { keys: ["⏎"], label: t("hints.open") },
    ...(canChangeStatus
      ? [
          { keys: ["e"], label: t("hints.resolve") },
          { keys: ["p"], label: t("hints.inProgress") },
          { keys: ["x"], label: t("hints.wontFix") },
          { keys: ["u"], label: t("inbox.undo") },
        ]
      : []),
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

import type { FeedbackStatus } from "@siteping/core";
import { FEEDBACK_STATUSES } from "@siteping/core";
import type { ReactElement, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { getStatusLabel } from "../i18n/index.js";
import { STATUS_ICONS, useInboxUi } from "./context.js";
import { ChevronDownIcon } from "./icons.js";

interface StatusMenuProps {
  status: FeedbackStatus;
  onSelect: (status: FeedbackStatus) => void;
}

/**
 * Drawer status control: a trigger button opening a popup listbox of the four
 * statuses with their glyphs. Fully keyboard navigable (arrows/Home/End/Enter,
 * Esc closes). Key events inside the popup never bubble to the inbox root, so
 * the global shortcuts stay quiet while the menu is open.
 */
export function StatusMenu({ status, onSelect }: StatusMenuProps): ReactElement {
  const { t } = useInboxUi();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  // Close when the pointer goes down anywhere outside the menu.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent): void => {
      if (rootRef.current && event.target instanceof Node && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // Move focus into the popup listbox once it appears.
  useEffect(() => {
    if (open) popRef.current?.focus();
  }, [open]);

  const openMenu = (): void => {
    setActiveIndex(Math.max(0, FEEDBACK_STATUSES.indexOf(status)));
    setOpen(true);
  };

  const close = (): void => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const select = (next: FeedbackStatus): void => {
    close();
    if (next !== status) onSelect(next);
  };

  const handlePopKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    event.stopPropagation();
    switch (event.key) {
      case "ArrowDown":
        setActiveIndex((index) => Math.min(index + 1, FEEDBACK_STATUSES.length - 1));
        break;
      case "ArrowUp":
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case "Home":
        setActiveIndex(0);
        break;
      case "End":
        setActiveIndex(FEEDBACK_STATUSES.length - 1);
        break;
      case "Enter":
      case " ": {
        const next = FEEDBACK_STATUSES[activeIndex];
        if (next) select(next);
        break;
      }
      case "Escape":
      case "Tab":
        close();
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>): void => {
    // Enter/Space activate the trigger natively — keep them away from the
    // root handler (where Enter means "open on page").
    if (event.key === "Enter" || event.key === " ") {
      event.stopPropagation();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      openMenu();
    }
  };

  const CurrentIcon = STATUS_ICONS[status];
  const activeStatus = FEEDBACK_STATUSES[activeIndex] ?? "open";

  return (
    <div ref={rootRef} className="spd-status-menu">
      {/* No aria-label: the accessible name is the visible status text (WCAG 2.5.3). */}
      <button
        ref={triggerRef}
        type="button"
        className="spd-status-menu-trigger"
        data-status={status}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleTriggerKeyDown}
      >
        <CurrentIcon />
        <span>{getStatusLabel(status, t)}</span>
        <ChevronDownIcon />
      </button>
      {open ? (
        <div
          ref={popRef}
          className="spd-status-menu-pop"
          role="listbox"
          tabIndex={-1}
          aria-label={t("drawer.status")}
          aria-activedescendant={`${listId}-${activeStatus}`}
          onKeyDown={handlePopKeyDown}
        >
          {FEEDBACK_STATUSES.map((value, index) => {
            const Icon = STATUS_ICONS[value];
            return (
              // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard selection is handled on the listbox itself
              <div
                key={value}
                id={`${listId}-${value}`}
                role="option"
                tabIndex={-1}
                aria-selected={value === status}
                data-status={value}
                className={`spd-status-menu-item${index === activeIndex ? " spd-status-menu-item-active" : ""}`}
                onClick={() => select(value)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <Icon />
                <span>{getStatusLabel(value, t)}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

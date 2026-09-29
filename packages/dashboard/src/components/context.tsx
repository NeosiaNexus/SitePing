import type { FeedbackStatus } from "@siteping/core";
import type { ComponentType, KeyboardEvent as ReactKeyboardEvent } from "react";
import { createContext, useContext } from "react";
import type { TFunction } from "../i18n/index.js";
import { StatusInProgressIcon, StatusOpenIcon, StatusResolvedIcon, StatusWontFixIcon } from "./icons.js";

/**
 * UI context shared by every inbox sub-component: the translation function,
 * the active locale as an `Intl`-valid tag (see core `intlLocale`), a
 * `notify` callback that routes transient messages (e.g. "Copied") to the
 * single toast slot, and `focusList` to return keyboard focus to the listbox
 * after a transient layer (drawer, toast) unmounts.
 */
export interface InboxUiContextValue {
  t: TFunction;
  locale: string;
  notify: (message: string) => void;
  /** Move keyboard focus back to the listbox so shortcuts keep working. */
  focusList: () => void;
}

const InboxUiContext = createContext<InboxUiContextValue | null>(null);

export const InboxUiProvider = InboxUiContext.Provider;

/** Read the inbox UI context — throws outside `<SitepingInbox />`. */
export function useInboxUi(): InboxUiContextValue {
  const ctx = useContext(InboxUiContext);
  if (!ctx) throw new Error("[siteping] Inbox components must render inside <SitepingInbox />");
  return ctx;
}

/** Status → 16px glyph component (S1 glyph language: circle shapes, never emoji). */
export const STATUS_ICONS: Record<FeedbackStatus, ComponentType> = {
  open: StatusOpenIcon,
  in_progress: StatusInProgressIcon,
  resolved: StatusResolvedIcon,
  wont_fix: StatusWontFixIcon,
};

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Tab handler of a modal layer: focus wraps from the last focusable to the
 * first and back. Focus can rest on the container itself (it takes focus on
 * open), so Shift+Tab from there wraps to the last focusable, not behind the
 * backdrop; with nothing focusable inside, focus stays on the container.
 */
export function trapTab(event: ReactKeyboardEvent<HTMLElement>, root: HTMLElement): void {
  const focusables = root.querySelectorAll<HTMLElement>(FOCUSABLE);
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;
  if (!first || !last) {
    event.preventDefault();
  } else if (event.shiftKey && (active === first || active === root)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

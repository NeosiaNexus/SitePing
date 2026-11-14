import { createContext } from "svelte";
import type { TFunction } from "../i18n/index.js";

/**
 * UI context shared by every inbox sub-component: the translation function,
 * the active locale as an `Intl`-valid tag (see core `intlLocale`), a
 * `notify` callback that routes transient messages (e.g. "Copied") to the
 * single toast slot, and `focusList` to return keyboard focus to the listbox
 * after a transient layer (drawer, toast) unmounts.
 *
 * `t` and `locale` are getters: they follow the root's locale reactively.
 */
export interface InboxUiContextValue {
  readonly t: TFunction;
  readonly locale: string;
  notify: (message: string) => void;
  /** Move keyboard focus back to the listbox so shortcuts keep working. */
  focusList: () => void;
}

const [getInboxUi, setInboxUi] = createContext<InboxUiContextValue>();

/** Read the inbox UI context — throws outside `<SitepingInbox />`. */
export { getInboxUi as useInboxUi, setInboxUi as provideInboxUi };

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Tab handler of a modal layer: focus wraps from the last focusable to the
 * first and back. Focus can rest on the container itself (it takes focus on
 * open), so Shift+Tab from there wraps to the last focusable, not behind the
 * backdrop; with nothing focusable inside, focus stays on the container.
 */
export function trapTab(event: KeyboardEvent, root: HTMLElement): void {
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

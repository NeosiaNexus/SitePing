import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { vi } from "vitest";
import type { InboxUiContextValue } from "../src/components/context.js";
import { InboxUiProvider } from "../src/components/context.js";
import { createT } from "../src/i18n/index.js";

/** Build an inbox UI context value (translation fn + locale + notify/focusList spies). */
export function makeUi(overrides: Partial<InboxUiContextValue> = {}): InboxUiContextValue {
  return { t: createT("en"), locale: "en", notify: vi.fn(), focusList: vi.fn(), ...overrides };
}

/** Render a sub-component that expects the inbox UI context around it. */
export function renderWithUi(node: ReactNode, overrides: Partial<InboxUiContextValue> = {}) {
  const value = makeUi(overrides);
  return { value, ...render(<InboxUiProvider value={value}>{node}</InboxUiProvider>) };
}

/** jsdom lacks layout + scrolling — stub what the components call so they don't throw. */
export function installJsdomStubs(): void {
  if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
}

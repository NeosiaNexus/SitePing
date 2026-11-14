/**
 * @testing-library/react's surface over Svelte 5 — so the React dashboard's
 * component suites port with their assertions unchanged:
 *
 * - `render(Component, props)` mounts into a fresh container on
 *   `document.body` and flushes, like RTL's synchronous render;
 * - `fireEvent.*` dispatches, then `flushSync()`s — Svelte applies state
 *   synchronously but patches the DOM in a microtask, where RTL's
 *   `act`-wrapped events have already re-rendered;
 * - `act` / `waitFor` / `cleanup` come from the controller shim.
 *
 * `screen` and `within` are @testing-library/dom's own.
 */
import { fireEvent as domFireEvent } from "@testing-library/dom";
import { type Component, flushSync, mount, unmount } from "svelte";
import { vi } from "vitest";
import type { InboxUiContextValue } from "../src/components/context.js";
import { createT } from "../src/i18n/index.js";
import { cleanup as cleanupControllers } from "./controller.svelte.js";
import UiHarness from "./UiHarness.svelte";

export { screen, within } from "@testing-library/dom";
export { act, waitFor } from "./controller.svelte.js";

type FireEvent = typeof domFireEvent;

/** `fireEvent(el, event)` and every `fireEvent.<type>(el, init)`, each followed by a flush. */
export const fireEvent: FireEvent = new Proxy(domFireEvent, {
  apply(target, thisArg, args: Parameters<FireEvent>) {
    const result = Reflect.apply(target, thisArg, args);
    flushSync();
    return result;
  },
  get(target, key, receiver) {
    const value = Reflect.get(target, key, receiver);
    if (typeof value !== "function") return value;
    return (...args: unknown[]) => {
      const result = (value as (...a: unknown[]) => boolean)(...args);
      flushSync();
      return result;
    };
  },
});

const mounted = new Set<{ instance: Record<string, unknown>; container: HTMLElement }>();

export function render<Props extends Record<string, any>>(component: Component<Props>, props: Props) {
  const container = document.body.appendChild(document.createElement("div"));
  const instance = mount(component, { target: container, props });
  const entry = { instance, container };
  mounted.add(entry);
  flushSync();
  return {
    container,
    unmount(): void {
      mounted.delete(entry);
      unmount(instance);
      container.remove();
    },
  };
}

export function cleanup(): void {
  for (const { instance, container } of mounted) {
    unmount(instance);
    container.remove();
  }
  mounted.clear();
  cleanupControllers();
}

/** A plain `<div>` around the rendered component, standing in for its parent. */
export interface HarnessWrap {
  class?: string;
  tabindex?: number;
  onkeydown?: (event: KeyboardEvent) => void;
}

/** Build an inbox UI context value (translation fn + locale + notify/focusList spies). */
export function makeUi(overrides: Partial<InboxUiContextValue> = {}): InboxUiContextValue {
  return { t: createT("en"), locale: "en", notify: vi.fn(), focusList: vi.fn(), ...overrides };
}

/**
 * Render a sub-component that expects the inbox UI context around it —
 * optionally inside a plain `<div>` (`wrap`) standing in for its parent.
 */
export function renderWithUi<Props extends Record<string, unknown>>(
  component: Component<any>,
  props: Props,
  overrides: Partial<InboxUiContextValue> = {},
  wrap?: HarnessWrap,
) {
  const value = makeUi(overrides);
  return { value, ...render(UiHarness, { component, props, ui: value, wrap }) };
}

/** jsdom lacks layout + scrolling — stub what the components call so they don't throw. */
export function installJsdomStubs(): void {
  if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
}

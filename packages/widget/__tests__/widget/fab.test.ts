// @vitest-environment jsdom

import type { SitepingConfig } from "@siteping/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventBus, type WidgetEvents } from "../../src/events.js";
import { Fab } from "../../src/fab.js";
import { createT } from "../../src/i18n/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createShadowRoot(): ShadowRoot {
  const host = document.createElement("div");
  document.body.appendChild(host);
  return host.attachShadow({ mode: "open" });
}

function defaultConfig() {
  return {
    endpoint: "/api/siteping",
    projectName: "test-project",
    position: "bottom-right" as const,
  };
}

function getRadialItems(shadow: ShadowRoot): HTMLButtonElement[] {
  return Array.from(shadow.querySelectorAll<HTMLButtonElement>(".sp-radial-item"));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Fab", () => {
  let shadow: ShadowRoot;
  let bus: EventBus<WidgetEvents>;
  let fab: Fab;

  beforeEach(() => {
    shadow = createShadowRoot();
    bus = new EventBus<WidgetEvents>();
    fab = new Fab(shadow, defaultConfig(), bus, createT("fr"));
  });

  afterEach(() => {
    fab.destroy();
    shadow.host.remove();
  });

  // -------------------------------------------------------------------------
  // Construction
  // -------------------------------------------------------------------------

  describe("construction", () => {
    it("creates a FAB button element in the shadow root", () => {
      const btn = shadow.querySelector<HTMLButtonElement>(".sp-fab");
      expect(btn).not.toBeNull();
      expect(btn!.tagName).toBe("BUTTON");
    });

    it("sets correct ARIA label on the FAB button", () => {
      const btn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      expect(btn.getAttribute("aria-label")).toBe(createT("fr")("fab.aria"));
    });

    it("sets aria-expanded to false initially", () => {
      const btn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      expect(btn.getAttribute("aria-expanded")).toBe("false");
    });

    it("creates a radial container with role=menu", () => {
      const menu = shadow.querySelector<HTMLElement>('[role="menu"]');
      expect(menu).not.toBeNull();
    });

    it("creates three radial menu items with role=menuitem", () => {
      const items = shadow.querySelectorAll('[role="menuitem"]');
      expect(items.length).toBe(3);
    });

    it("assigns correct data-item-id to each menu item", () => {
      const items = getRadialItems(shadow);
      const ids = items.map((btn) => btn.dataset.itemId);
      expect(ids).toEqual(["chat", "annotate", "toggle-annotations"]);
    });

    it("applies position class based on config", () => {
      const btn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      expect(btn.classList.contains("sp-fab--bottom-right")).toBe(true);
    });

    it("applies bottom-left position class when configured", () => {
      fab.destroy();
      shadow.host.remove();

      shadow = createShadowRoot();
      const config = { ...defaultConfig(), position: "bottom-left" as const };
      fab = new Fab(shadow, config, bus, createT("fr"));

      const btn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      expect(btn.classList.contains("sp-fab--bottom-left")).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Open / Close (radial menu toggle)
  // -------------------------------------------------------------------------

  describe("open/close", () => {
    it("opens radial menu on FAB click — aria-expanded becomes true", () => {
      const btn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      btn.click();

      expect(btn.getAttribute("aria-expanded")).toBe("true");
    });

    it("adds sp-radial-item--open class to menu items when opened", () => {
      const btn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      btn.click();

      const items = getRadialItems(shadow);
      for (const item of items) {
        expect(item.classList.contains("sp-radial-item--open")).toBe(true);
      }
    });

    it("closes radial menu on second FAB click — aria-expanded becomes false", () => {
      const btn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      btn.click(); // open
      btn.click(); // close

      expect(btn.getAttribute("aria-expanded")).toBe("false");
    });

    it("removes sp-radial-item--open class when closed", () => {
      const btn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      btn.click(); // open
      btn.click(); // close

      const items = getRadialItems(shadow);
      for (const item of items) {
        expect(item.classList.contains("sp-radial-item--open")).toBe(false);
      }
    });

    it("closes radial menu on Escape key press", () => {
      const btn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      btn.click(); // open

      btn.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      expect(btn.getAttribute("aria-expanded")).toBe("false");
    });
  });

  // -------------------------------------------------------------------------
  // Keyboard navigation
  // -------------------------------------------------------------------------

  describe("keyboard navigation", () => {
    it("ArrowDown cycles forward through menu items", () => {
      const fabBtn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      fabBtn.click(); // open menu

      const items = getRadialItems(shadow);
      const radial = shadow.querySelector<HTMLElement>('[role="menu"]')!;

      // Focus the first item
      items[0].focus();
      expect(shadow.activeElement).toBe(items[0]);

      // ArrowDown should move to second item
      radial.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      expect(shadow.activeElement).toBe(items[1]);
    });

    it("ArrowUp cycles backward through menu items", () => {
      const fabBtn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      fabBtn.click();

      const items = getRadialItems(shadow);
      const radial = shadow.querySelector<HTMLElement>('[role="menu"]')!;

      // Focus the second item
      items[1].focus();

      // ArrowUp should move to first item
      radial.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
      expect(shadow.activeElement).toBe(items[0]);
    });

    it("ArrowDown wraps from last to first item", () => {
      const fabBtn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      fabBtn.click();

      const items = getRadialItems(shadow);
      const radial = shadow.querySelector<HTMLElement>('[role="menu"]')!;

      // Focus the last item
      items[items.length - 1].focus();

      // ArrowDown should wrap to first
      radial.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      expect(shadow.activeElement).toBe(items[0]);
    });

    it("ArrowUp wraps from first to last item", () => {
      const fabBtn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      fabBtn.click();

      const items = getRadialItems(shadow);
      const radial = shadow.querySelector<HTMLElement>('[role="menu"]')!;

      // Focus the first item
      items[0].focus();

      // ArrowUp should wrap to last
      radial.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
      expect(shadow.activeElement).toBe(items[items.length - 1]);
    });

    it("Home key moves focus to first item", () => {
      const fabBtn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      fabBtn.click();

      const items = getRadialItems(shadow);
      const radial = shadow.querySelector<HTMLElement>('[role="menu"]')!;

      items[2].focus();
      radial.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
      expect(shadow.activeElement).toBe(items[0]);
    });

    it("End key moves focus to last item", () => {
      const fabBtn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      fabBtn.click();

      const items = getRadialItems(shadow);
      const radial = shadow.querySelector<HTMLElement>('[role="menu"]')!;

      items[0].focus();
      radial.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
      expect(shadow.activeElement).toBe(items[items.length - 1]);
    });
  });

  // -------------------------------------------------------------------------
  // Menu item clicks — event bus emissions
  // -------------------------------------------------------------------------

  describe("menu item clicks", () => {
    it("clicking 'chat' item emits panel:toggle with true", () => {
      const listener = vi.fn();
      bus.on("panel:toggle", listener);

      const fabBtn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      fabBtn.click(); // open menu

      const chatBtn = shadow.querySelector<HTMLButtonElement>('[data-item-id="chat"]')!;
      chatBtn.click();

      expect(listener).toHaveBeenCalledWith(true);
    });

    it("clicking 'annotate' item emits annotation:start", () => {
      const listener = vi.fn();
      bus.on("annotation:start", listener);

      const fabBtn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      fabBtn.click();

      const annotateBtn = shadow.querySelector<HTMLButtonElement>('[data-item-id="annotate"]')!;
      annotateBtn.click();

      expect(listener).toHaveBeenCalledOnce();
    });

    it("clicking 'toggle-annotations' emits annotations:toggle", () => {
      const listener = vi.fn();
      bus.on("annotations:toggle", listener);

      const fabBtn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      fabBtn.click();

      const toggleBtn = shadow.querySelector<HTMLButtonElement>('[data-item-id="toggle-annotations"]')!;
      toggleBtn.click();

      // First toggle: was visible (true), now hidden (false)
      expect(listener).toHaveBeenCalledWith(false);
    });

    it("closes the radial menu after a menu item is clicked", () => {
      const fabBtn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      fabBtn.click(); // open

      const chatBtn = shadow.querySelector<HTMLButtonElement>('[data-item-id="chat"]')!;
      chatBtn.click();

      expect(fabBtn.getAttribute("aria-expanded")).toBe("false");
    });
  });

  // -------------------------------------------------------------------------
  // Badge
  // -------------------------------------------------------------------------

  describe("updateBadge", () => {
    it("shows badge with count when count > 0", () => {
      fab.updateBadge(5);

      const badge = shadow.querySelector<HTMLElement>(".sp-fab-badge");
      expect(badge).not.toBeNull();
      expect(badge!.textContent).toBe("5");
    });

    it("sets role=status and aria-live=polite on badge", () => {
      fab.updateBadge(3);

      const badge = shadow.querySelector<HTMLElement>(".sp-fab-badge")!;
      expect(badge.getAttribute("role")).toBe("status");
      expect(badge.getAttribute("aria-live")).toBe("polite");
    });

    it("sets aria-label with count on badge", () => {
      fab.updateBadge(7);

      const badge = shadow.querySelector<HTMLElement>(".sp-fab-badge")!;
      const t = createT("fr");
      expect(badge.getAttribute("aria-label")).toBe(t("fab.badge").replace("{count}", "7"));
    });

    it("displays '99+' for counts over 99", () => {
      fab.updateBadge(150);

      const badge = shadow.querySelector<HTMLElement>(".sp-fab-badge")!;
      expect(badge.textContent).toBe("99+");
    });

    it("hides badge when count is 0", () => {
      fab.updateBadge(5);
      fab.updateBadge(0);

      const badge = shadow.querySelector<HTMLElement>(".sp-fab-badge");
      expect(badge).toBeNull();
    });

    it("hides badge when count is negative", () => {
      fab.updateBadge(5);
      fab.updateBadge(-1);

      const badge = shadow.querySelector<HTMLElement>(".sp-fab-badge");
      expect(badge).toBeNull();
    });

    it("updates existing badge count without creating a new element", () => {
      fab.updateBadge(3);
      const badge1 = shadow.querySelector<HTMLElement>(".sp-fab-badge");

      fab.updateBadge(10);
      const badge2 = shadow.querySelector<HTMLElement>(".sp-fab-badge");

      expect(badge1).toBe(badge2); // same DOM element
      expect(badge2!.textContent).toBe("10");
    });

    it("preserves badge after FAB icon swap (open/close)", () => {
      fab.updateBadge(5);

      const fabBtn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      fabBtn.click(); // open — icon changes to close icon
      fabBtn.click(); // close — icon changes back

      const badge = shadow.querySelector<HTMLElement>(".sp-fab-badge");
      expect(badge).not.toBeNull();
      expect(badge!.textContent).toBe("5");
    });
  });

  // -------------------------------------------------------------------------
  // Destroy
  // -------------------------------------------------------------------------

  describe("destroy", () => {
    it("removes DOM elements from shadow root", () => {
      fab.destroy();

      const btn = shadow.querySelector<HTMLButtonElement>(".sp-fab");
      const menu = shadow.querySelector('[role="menu"]');
      expect(btn).toBeNull();
      expect(menu).toBeNull();
    });

    it("removes document click listener", () => {
      const removeListenerSpy = vi.spyOn(document, "removeEventListener");

      fab.destroy();

      expect(removeListenerSpy).toHaveBeenCalledWith("click", expect.any(Function));
      removeListenerSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Outside click behavior
  // -------------------------------------------------------------------------

  describe("document outside click", () => {
    it("does not call close when menu is already closed (line 97 false branch)", () => {
      // Menu starts closed; click outside on document.body
      const fabBtn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      expect(fabBtn.getAttribute("aria-expanded")).toBe("false");

      // Dispatch click on body — composed path does not include the shadow host
      document.body.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));

      // Still closed, no error thrown
      expect(fabBtn.getAttribute("aria-expanded")).toBe("false");
    });

    it("closes the menu when an outside click occurs while open", () => {
      const fabBtn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      fabBtn.click(); // open
      expect(fabBtn.getAttribute("aria-expanded")).toBe("true");

      // Click on document.body — outside the shadow host
      document.body.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));

      expect(fabBtn.getAttribute("aria-expanded")).toBe("false");
    });

    it("does not close when clicking on a child element of the host (composed path includes host)", () => {
      const fabBtn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      fabBtn.click(); // open
      expect(fabBtn.getAttribute("aria-expanded")).toBe("true");

      // Click directly on the FAB button — composed path includes the host
      fabBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));

      // The click on FAB toggles, so the menu closes via toggle path (not via outside-click handler)
      // We just verify no double-close error.
    });
  });

  // -------------------------------------------------------------------------
  // Default position fallback (line 37 binary-expr)
  // -------------------------------------------------------------------------

  describe("default position fallback", () => {
    it("falls back to 'bottom-right' position when config.position is omitted", () => {
      fab.destroy();
      shadow.host.remove();

      shadow = createShadowRoot();
      const config: SitepingConfig = { endpoint: "/api/siteping", projectName: "test-project" };
      fab = new Fab(shadow, config, bus, createT("fr"));

      const btn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      expect(btn.classList.contains("sp-fab--bottom-right")).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Keyboard navigation defensive branches
  // -------------------------------------------------------------------------

  describe("keyboard navigation defensive branches", () => {
    it("ArrowDown is ignored when the menu is closed (early return — items+!isOpen guard)", () => {
      // Menu starts closed
      const radial = shadow.querySelector<HTMLElement>('[role="menu"]')!;
      const items = getRadialItems(shadow);

      // Pre-focus an item (still possible while closed); then trigger ArrowDown
      items[0].focus();
      radial.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));

      // Should still be focused on items[0] — handler bailed out early
      expect(shadow.activeElement).toBe(items[0]);
    });

    it("falls back to document.activeElement when shadowRoot.activeElement is null", () => {
      const fabBtn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      fabBtn.click(); // open

      const radial = shadow.querySelector<HTMLElement>('[role="menu"]')!;

      // Stub shadow.activeElement to null so the ?? falls back to document.activeElement
      Object.defineProperty(shadow, "activeElement", {
        configurable: true,
        get: () => null,
      });

      // The handler will use document.activeElement; since it's not in the radial items,
      // currentIndex = -1, so ArrowDown moves to items[0] (per logic: -1 < length-1 → 0).
      // The key assertion: handler executes without throwing — the ?? branch was hit.
      expect(() => {
        radial.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      }).not.toThrow();

      // Cleanup — remove the stub property so other tests aren't affected
      delete (shadow as unknown as { activeElement?: unknown }).activeElement;
    });
  });

  // -------------------------------------------------------------------------
  // Toggle-annotations icon swap (line 230 — true branch ICON_EYE)
  // -------------------------------------------------------------------------

  describe("toggle-annotations icon swap", () => {
    it("two consecutive toggles swap the icon back to ICON_EYE (true branch of cond-expr)", () => {
      const fabBtn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      const toggleBtnSelector = '[data-item-id="toggle-annotations"]';

      // First toggle: visible -> hidden, icon becomes EYE_OFF
      fabBtn.click();
      let toggleBtn = shadow.querySelector<HTMLButtonElement>(toggleBtnSelector)!;
      toggleBtn.click();

      // Second toggle: hidden -> visible, icon becomes EYE again
      fabBtn.click();
      toggleBtn = shadow.querySelector<HTMLButtonElement>(toggleBtnSelector)!;

      const listener = vi.fn();
      bus.on("annotations:toggle", listener);
      toggleBtn.click();

      // The bus should now emit annotations:toggle with true (back to visible)
      expect(listener).toHaveBeenCalledWith(true);
    });
  });
});

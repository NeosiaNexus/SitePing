// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  focusCardByIndex,
  getFocusedCardIndex,
  ICON_KEYBOARD,
  KeyboardShortcuts,
  SHORTCUTS_CSS,
  SHORTCUTS_I18N_EN,
  SHORTCUTS_I18N_FR,
  type ShortcutCallbacks,
} from "../../src/shortcuts.js";
import { buildThemeColors } from "../../src/styles/theme.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createCallbacks(): ShortcutCallbacks & {
  onNavigate: ReturnType<typeof vi.fn>;
  onResolve: ReturnType<typeof vi.fn>;
  onDelete: ReturnType<typeof vi.fn>;
  onFocusSearch: ReturnType<typeof vi.fn>;
  onToggleSelect: ReturnType<typeof vi.fn>;
} {
  return {
    onNavigate: vi.fn(),
    onResolve: vi.fn(),
    onDelete: vi.fn(),
    onFocusSearch: vi.fn(),
    onToggleSelect: vi.fn(),
  };
}

function createShadowRoot(): ShadowRoot {
  const host = document.createElement("div");
  document.body.appendChild(host);
  return host.attachShadow({ mode: "open" });
}

/** Build a KeyboardEvent with `composedPath` returning the given target. */
function makeKeydown(key: string, options: KeyboardEventInit = {}, target?: HTMLElement): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...options, key });
  if (target) {
    Object.defineProperty(event, "composedPath", {
      value: () => [target],
      configurable: true,
    });
  }
  return event;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const colors = buildThemeColors();

describe("shortcuts: exports", () => {
  it("exports an i18n EN object with expected keys", () => {
    expect(SHORTCUTS_I18N_EN["shortcuts.title"]).toBe("Keyboard shortcuts");
    expect(SHORTCUTS_I18N_EN["shortcuts.navigate"]).toBe("Navigate feedbacks");
    expect(SHORTCUTS_I18N_EN["shortcuts.resolve"]).toBe("Resolve / Reopen");
    expect(SHORTCUTS_I18N_EN["shortcuts.delete"]).toBe("Delete");
    expect(SHORTCUTS_I18N_EN["shortcuts.search"]).toBe("Focus search");
    expect(SHORTCUTS_I18N_EN["shortcuts.select"]).toBe("Toggle selection");
    expect(SHORTCUTS_I18N_EN["shortcuts.help"]).toBe("Show shortcuts");
    expect(SHORTCUTS_I18N_EN["shortcuts.close"]).toBe("Close");
    expect(SHORTCUTS_I18N_EN["shortcuts.hint"]).toBe("Keyboard shortcuts");
  });

  it("exports an i18n FR object with localized values", () => {
    expect(SHORTCUTS_I18N_FR["shortcuts.title"]).toBe("Raccourcis clavier");
    expect(SHORTCUTS_I18N_FR["shortcuts.delete"]).toBe("Supprimer");
  });

  it("exports a non-empty CSS string and keyboard icon", () => {
    expect(SHORTCUTS_CSS).toContain(".sp-shortcuts-overlay");
    expect(SHORTCUTS_CSS).toContain(".sp-kbd");
    expect(ICON_KEYBOARD).toContain("<svg");
  });
});

// ---------------------------------------------------------------------------
// getFocusedCardIndex / focusCardByIndex
// ---------------------------------------------------------------------------

describe("getFocusedCardIndex", () => {
  it("returns -1 when no cards exist", () => {
    const list = document.createElement("div");
    expect(getFocusedCardIndex(list)).toBe(-1);
  });

  it("returns -1 when no card has the focused class", () => {
    const list = document.createElement("div");
    for (let i = 0; i < 3; i++) {
      const card = document.createElement("div");
      card.className = "sp-card";
      list.appendChild(card);
    }
    expect(getFocusedCardIndex(list)).toBe(-1);
  });

  it("returns the index of the focused card", () => {
    const list = document.createElement("div");
    for (let i = 0; i < 3; i++) {
      const card = document.createElement("div");
      card.className = "sp-card";
      if (i === 1) card.classList.add("sp-card--focused");
      list.appendChild(card);
    }
    expect(getFocusedCardIndex(list)).toBe(1);
  });
});

describe("focusCardByIndex", () => {
  let list: HTMLElement;

  beforeEach(() => {
    list = document.createElement("div");
    document.body.appendChild(list);
    for (let i = 0; i < 4; i++) {
      const card = document.createElement("div");
      card.className = "sp-card";
      card.tabIndex = 0;
      // jsdom doesn't implement scrollIntoView
      card.scrollIntoView = vi.fn();
      list.appendChild(card);
    }
  });

  afterEach(() => {
    list.remove();
  });

  it("does nothing when there are no cards", () => {
    const empty = document.createElement("div");
    expect(() => focusCardByIndex(empty, 0)).not.toThrow();
  });

  it("focuses the card at the given index", () => {
    focusCardByIndex(list, 2);
    const cards = list.querySelectorAll<HTMLElement>(".sp-card");
    expect(cards[2]?.classList.contains("sp-card--focused")).toBe(true);
    expect(cards[2]?.scrollIntoView).toHaveBeenCalledWith({ block: "nearest", behavior: "smooth" });
  });

  it("clamps a negative index to 0", () => {
    focusCardByIndex(list, -5);
    const cards = list.querySelectorAll<HTMLElement>(".sp-card");
    expect(cards[0]?.classList.contains("sp-card--focused")).toBe(true);
  });

  it("clamps an over-large index to the last card", () => {
    focusCardByIndex(list, 99);
    const cards = list.querySelectorAll<HTMLElement>(".sp-card");
    expect(cards[3]?.classList.contains("sp-card--focused")).toBe(true);
  });

  it("removes focused class from previously focused card", () => {
    focusCardByIndex(list, 0);
    focusCardByIndex(list, 2);

    const cards = list.querySelectorAll<HTMLElement>(".sp-card");
    expect(cards[0]?.classList.contains("sp-card--focused")).toBe(false);
    expect(cards[2]?.classList.contains("sp-card--focused")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// KeyboardShortcuts
// ---------------------------------------------------------------------------

describe("KeyboardShortcuts", () => {
  let shortcuts: KeyboardShortcuts;
  let callbacks: ReturnType<typeof createCallbacks>;
  let shadow: ShadowRoot;

  beforeEach(() => {
    callbacks = createCallbacks();
    shortcuts = new KeyboardShortcuts(colors, callbacks);
    shadow = createShadowRoot();
  });

  afterEach(() => {
    shortcuts.destroy();
    shadow.host.remove();
  });

  // -------------------------------------------------------------------------
  // DOM construction
  // -------------------------------------------------------------------------

  describe("DOM construction", () => {
    it("creates a help overlay with role=dialog", () => {
      expect(shortcuts.helpOverlay.getAttribute("role")).toBe("dialog");
      expect(shortcuts.helpOverlay.getAttribute("aria-modal")).toBe("true");
      expect(shortcuts.helpOverlay.getAttribute("aria-label")).toBe(SHORTCUTS_I18N_EN["shortcuts.title"]);
      expect(shortcuts.helpOverlay.classList.contains("sp-shortcuts-overlay")).toBe(true);
    });

    it("creates a card with title, close button, and grid", () => {
      const card = shortcuts.helpOverlay.querySelector(".sp-shortcuts-card");
      expect(card).not.toBeNull();

      const title = shortcuts.helpOverlay.querySelector(".sp-shortcuts-title");
      expect(title?.textContent).toContain(SHORTCUTS_I18N_EN["shortcuts.title"]);

      const closeBtn = shortcuts.helpOverlay.querySelector(".sp-shortcuts-close");
      expect(closeBtn).not.toBeNull();
      expect(closeBtn?.getAttribute("aria-label")).toBe(SHORTCUTS_I18N_EN["shortcuts.close"]);

      const grid = shortcuts.helpOverlay.querySelector(".sp-shortcuts-grid");
      expect(grid).not.toBeNull();
    });

    it("renders one row per shortcut definition with key badges and description", () => {
      const rows = shortcuts.helpOverlay.querySelectorAll(".sp-shortcuts-row");
      // 7 shortcuts: navigate, resolve, delete, search, select, help, close
      expect(rows.length).toBe(7);

      // First row (navigate) has 2 keys joined by a separator
      const firstRow = rows[0]!;
      const keys = firstRow.querySelectorAll(".sp-kbd");
      expect(keys.length).toBe(2);
      expect(keys[0]?.textContent).toBe("J");
      expect(keys[1]?.textContent).toBe("K");

      const seps = firstRow.querySelectorAll(".sp-shortcuts-separator");
      expect(seps.length).toBe(1);
      expect(seps[0]?.textContent).toBe("/");

      const desc = firstRow.querySelector(".sp-shortcuts-desc");
      expect(desc?.textContent).toBe(SHORTCUTS_I18N_EN["shortcuts.navigate"]);
    });

    it("creates a hint button with aria-label and ? text", () => {
      expect(shortcuts.hintButton.tagName).toBe("BUTTON");
      expect(shortcuts.hintButton.classList.contains("sp-shortcuts-hint")).toBe(true);
      expect(shortcuts.hintButton.getAttribute("aria-label")).toBe(SHORTCUTS_I18N_EN["shortcuts.hint"]);
      expect(shortcuts.hintButton.textContent).toBe("?");
    });

    it("uses the FR i18n bundle when provided", () => {
      const sc = new KeyboardShortcuts(colors, callbacks, SHORTCUTS_I18N_FR);
      expect(sc.helpOverlay.getAttribute("aria-label")).toBe(SHORTCUTS_I18N_FR["shortcuts.title"]);
      expect(sc.hintButton.getAttribute("aria-label")).toBe(SHORTCUTS_I18N_FR["shortcuts.hint"]);
      sc.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // enable / disable
  // -------------------------------------------------------------------------

  describe("enable/disable", () => {
    it("attaches a keydown listener to the provided root when enabled", () => {
      const addSpy = vi.spyOn(shadow, "addEventListener");
      shortcuts.enable(shadow);
      expect(addSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
      addSpy.mockRestore();
    });

    it("attaches to document when no root is supplied and none was set previously", () => {
      const addSpy = vi.spyOn(document, "addEventListener");
      shortcuts.enable();
      expect(addSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
      addSpy.mockRestore();
    });

    it("does nothing when called twice in a row", () => {
      shortcuts.enable(shadow);
      const addSpy = vi.spyOn(shadow, "addEventListener");
      shortcuts.enable(shadow);
      expect(addSpy).not.toHaveBeenCalled();
      addSpy.mockRestore();
    });

    it("removes the keydown listener when disabled", () => {
      shortcuts.enable(shadow);
      const removeSpy = vi.spyOn(shadow, "removeEventListener");
      shortcuts.disable();
      expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
      removeSpy.mockRestore();
    });

    it("disable() without a previous enable() does nothing", () => {
      const removeSpy = vi.spyOn(shadow, "removeEventListener");
      shortcuts.disable();
      expect(removeSpy).not.toHaveBeenCalled();
      removeSpy.mockRestore();
    });

    it("disable() hides the help overlay if it was visible", () => {
      shortcuts.enable(shadow);
      shortcuts.toggleHelp();
      expect(shortcuts.helpOverlay.classList.contains("sp-shortcuts-overlay--visible")).toBe(true);

      shortcuts.disable();
      expect(shortcuts.helpOverlay.classList.contains("sp-shortcuts-overlay--visible")).toBe(false);
    });

    it("re-enable after disable rebinds the listener and dispatches still work", () => {
      shortcuts.enable(shadow);
      shortcuts.disable();
      shortcuts.enable(shadow);

      shadow.dispatchEvent(makeKeydown("j"));
      expect(callbacks.onNavigate).toHaveBeenCalledWith("down");
    });

    it("does nothing when destroyed before enable", () => {
      shortcuts.destroy();
      const addSpy = vi.spyOn(shadow, "addEventListener");
      shortcuts.enable(shadow);
      expect(addSpy).not.toHaveBeenCalled();
      addSpy.mockRestore();
    });

    it("uses the previously stored shadow root when enable() is called without a root", () => {
      shortcuts.enable(shadow);
      shortcuts.disable();

      const addSpy = vi.spyOn(shadow, "addEventListener");
      shortcuts.enable();
      expect(addSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
      addSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Keyboard handler (key dispatch)
  // -------------------------------------------------------------------------

  describe("key dispatch", () => {
    beforeEach(() => {
      shortcuts.enable(shadow);
    });

    it("dispatches j -> onNavigate('down')", () => {
      shadow.dispatchEvent(makeKeydown("j"));
      expect(callbacks.onNavigate).toHaveBeenCalledWith("down");
    });

    it("dispatches k -> onNavigate('up')", () => {
      shadow.dispatchEvent(makeKeydown("k"));
      expect(callbacks.onNavigate).toHaveBeenCalledWith("up");
    });

    it("dispatches r -> onResolve()", () => {
      shadow.dispatchEvent(makeKeydown("r"));
      expect(callbacks.onResolve).toHaveBeenCalledOnce();
    });

    it("dispatches d -> onDelete()", () => {
      shadow.dispatchEvent(makeKeydown("d"));
      expect(callbacks.onDelete).toHaveBeenCalledOnce();
    });

    it("dispatches f -> onFocusSearch()", () => {
      shadow.dispatchEvent(makeKeydown("f"));
      expect(callbacks.onFocusSearch).toHaveBeenCalledOnce();
    });

    it("dispatches / -> onFocusSearch()", () => {
      shadow.dispatchEvent(makeKeydown("/"));
      expect(callbacks.onFocusSearch).toHaveBeenCalledOnce();
    });

    it("dispatches x -> onToggleSelect()", () => {
      shadow.dispatchEvent(makeKeydown("x"));
      expect(callbacks.onToggleSelect).toHaveBeenCalledOnce();
    });

    it("dispatches ? -> toggles help overlay visibility", () => {
      shadow.dispatchEvent(makeKeydown("?"));
      expect(shortcuts.helpOverlay.classList.contains("sp-shortcuts-overlay--visible")).toBe(true);
    });

    it("calls preventDefault and stopPropagation when a shortcut matches", () => {
      const event = makeKeydown("j");
      const prevent = vi.spyOn(event, "preventDefault");
      const stop = vi.spyOn(event, "stopPropagation");
      shadow.dispatchEvent(event);
      expect(prevent).toHaveBeenCalled();
      expect(stop).toHaveBeenCalled();
    });

    it("does not invoke any callback for an unmapped key", () => {
      shadow.dispatchEvent(makeKeydown("a"));
      expect(callbacks.onNavigate).not.toHaveBeenCalled();
      expect(callbacks.onResolve).not.toHaveBeenCalled();
      expect(callbacks.onDelete).not.toHaveBeenCalled();
      expect(callbacks.onFocusSearch).not.toHaveBeenCalled();
      expect(callbacks.onToggleSelect).not.toHaveBeenCalled();
    });

    it("does not preventDefault for unmapped keys", () => {
      const event = makeKeydown("a");
      const prevent = vi.spyOn(event, "preventDefault");
      shadow.dispatchEvent(event);
      expect(prevent).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Modifier handling
  // -------------------------------------------------------------------------

  describe("modifier handling", () => {
    beforeEach(() => {
      shortcuts.enable(shadow);
    });

    it("ignores Ctrl+key combinations", () => {
      shadow.dispatchEvent(makeKeydown("j", { ctrlKey: true }));
      expect(callbacks.onNavigate).not.toHaveBeenCalled();
    });

    it("ignores Alt+key combinations", () => {
      shadow.dispatchEvent(makeKeydown("j", { altKey: true }));
      expect(callbacks.onNavigate).not.toHaveBeenCalled();
    });

    it("ignores Meta+key combinations", () => {
      shadow.dispatchEvent(makeKeydown("j", { metaKey: true }));
      expect(callbacks.onNavigate).not.toHaveBeenCalled();
    });

    it("allows Shift+? (key='?') to trigger help", () => {
      shadow.dispatchEvent(makeKeydown("?", { shiftKey: true }));
      expect(shortcuts.helpOverlay.classList.contains("sp-shortcuts-overlay--visible")).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Input/textarea/contenteditable focus
  // -------------------------------------------------------------------------

  describe("focus on input/editable elements", () => {
    beforeEach(() => {
      shortcuts.enable(shadow);
    });

    it("ignores keydown when target is an <input>", () => {
      const input = document.createElement("input");
      shadow.dispatchEvent(makeKeydown("j", {}, input));
      expect(callbacks.onNavigate).not.toHaveBeenCalled();
    });

    it("ignores keydown when target is a <textarea>", () => {
      const ta = document.createElement("textarea");
      shadow.dispatchEvent(makeKeydown("j", {}, ta));
      expect(callbacks.onNavigate).not.toHaveBeenCalled();
    });

    it("ignores keydown when target is a <select>", () => {
      const select = document.createElement("select");
      shadow.dispatchEvent(makeKeydown("j", {}, select));
      expect(callbacks.onNavigate).not.toHaveBeenCalled();
    });

    it("ignores keydown when target is contentEditable", () => {
      const div = document.createElement("div");
      // jsdom's isContentEditable derives from contenteditable attribute on the element
      Object.defineProperty(div, "isContentEditable", { value: true, configurable: true });
      shadow.dispatchEvent(makeKeydown("j", {}, div));
      expect(callbacks.onNavigate).not.toHaveBeenCalled();
    });

    it("dispatches normally when target is a regular element (e.g. div)", () => {
      const div = document.createElement("div");
      Object.defineProperty(div, "isContentEditable", { value: false, configurable: true });
      shadow.dispatchEvent(makeKeydown("j", {}, div));
      expect(callbacks.onNavigate).toHaveBeenCalledWith("down");
    });

    it("dispatches normally when composedPath is empty (no active target)", () => {
      const event = new KeyboardEvent("keydown", { key: "j", bubbles: true, cancelable: true });
      Object.defineProperty(event, "composedPath", { value: () => [], configurable: true });
      shadow.dispatchEvent(event);
      expect(callbacks.onNavigate).toHaveBeenCalledWith("down");
    });

    it("treats input elements case-insensitively (uppercase tagName)", () => {
      // tagName is normally uppercase in HTML; the source lowercases it
      const input = document.createElement("input");
      // Confirm we hit the lowercased branch: tagName === 'INPUT' -> 'input'
      shadow.dispatchEvent(makeKeydown("k", {}, input));
      expect(callbacks.onNavigate).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Escape key
  // -------------------------------------------------------------------------

  describe("Escape key", () => {
    beforeEach(() => {
      shortcuts.enable(shadow);
    });

    it("hides help overlay when visible", () => {
      shortcuts.toggleHelp();
      expect(shortcuts.helpOverlay.classList.contains("sp-shortcuts-overlay--visible")).toBe(true);

      const event = makeKeydown("Escape");
      const prevent = vi.spyOn(event, "preventDefault");
      const stop = vi.spyOn(event, "stopPropagation");
      shadow.dispatchEvent(event);

      expect(shortcuts.helpOverlay.classList.contains("sp-shortcuts-overlay--visible")).toBe(false);
      expect(prevent).toHaveBeenCalled();
      expect(stop).toHaveBeenCalled();
    });

    it("does nothing (no preventDefault) when help overlay is not visible", () => {
      const event = makeKeydown("Escape");
      const prevent = vi.spyOn(event, "preventDefault");
      shadow.dispatchEvent(event);
      expect(prevent).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Help overlay visibility behavior
  // -------------------------------------------------------------------------

  describe("help overlay visibility", () => {
    beforeEach(() => {
      shortcuts.enable(shadow);
    });

    it("blocks all other shortcuts when help is visible", () => {
      shortcuts.toggleHelp();
      shadow.dispatchEvent(makeKeydown("j"));
      expect(callbacks.onNavigate).not.toHaveBeenCalled();
    });

    it("toggleHelp() shows then hides", () => {
      shortcuts.toggleHelp();
      expect(shortcuts.helpOverlay.classList.contains("sp-shortcuts-overlay--visible")).toBe(true);

      shortcuts.toggleHelp();
      expect(shortcuts.helpOverlay.classList.contains("sp-shortcuts-overlay--visible")).toBe(false);
    });

    it("focuses the close button when help is shown", () => {
      const closeBtn = shortcuts.helpOverlay.querySelector<HTMLButtonElement>(".sp-shortcuts-close")!;
      const focusSpy = vi.spyOn(closeBtn, "focus");
      shortcuts.toggleHelp();
      expect(focusSpy).toHaveBeenCalled();
      focusSpy.mockRestore();
    });

    it("clicking the close button hides the overlay", () => {
      shortcuts.toggleHelp();
      const closeBtn = shortcuts.helpOverlay.querySelector<HTMLButtonElement>(".sp-shortcuts-close")!;
      closeBtn.click();
      expect(shortcuts.helpOverlay.classList.contains("sp-shortcuts-overlay--visible")).toBe(false);
    });

    it("clicking the overlay backdrop hides it", () => {
      shortcuts.toggleHelp();
      // Simulate a click whose target is the overlay itself (not a child)
      const event = new MouseEvent("click", { bubbles: true });
      Object.defineProperty(event, "target", { value: shortcuts.helpOverlay, configurable: true });
      shortcuts.helpOverlay.dispatchEvent(event);
      expect(shortcuts.helpOverlay.classList.contains("sp-shortcuts-overlay--visible")).toBe(false);
    });

    it("clicking inside the card does not hide the overlay", () => {
      shortcuts.toggleHelp();
      const card = shortcuts.helpOverlay.querySelector<HTMLElement>(".sp-shortcuts-card")!;
      const event = new MouseEvent("click", { bubbles: true });
      Object.defineProperty(event, "target", { value: card, configurable: true });
      shortcuts.helpOverlay.dispatchEvent(event);
      expect(shortcuts.helpOverlay.classList.contains("sp-shortcuts-overlay--visible")).toBe(true);
    });

    it("hint button click toggles the help overlay and stops propagation", () => {
      const event = new MouseEvent("click", { bubbles: true, cancelable: true });
      const stop = vi.spyOn(event, "stopPropagation");
      shortcuts.hintButton.dispatchEvent(event);
      expect(stop).toHaveBeenCalled();
      expect(shortcuts.helpOverlay.classList.contains("sp-shortcuts-overlay--visible")).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // destroy
  // -------------------------------------------------------------------------

  describe("destroy", () => {
    it("removes the help overlay and hint button from the DOM", () => {
      shadow.appendChild(shortcuts.helpOverlay);
      shadow.appendChild(shortcuts.hintButton);

      shortcuts.destroy();

      expect(shortcuts.helpOverlay.isConnected).toBe(false);
      expect(shortcuts.hintButton.isConnected).toBe(false);
    });

    it("removes the keydown listener if it was enabled", () => {
      shortcuts.enable(shadow);
      const removeSpy = vi.spyOn(shadow, "removeEventListener");
      shortcuts.destroy();
      expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
      removeSpy.mockRestore();
    });

    it("calling destroy() twice is a no-op", () => {
      shortcuts.destroy();
      expect(() => shortcuts.destroy()).not.toThrow();
    });

    it("after destroy, key events do not invoke callbacks", () => {
      shortcuts.enable(shadow);
      shortcuts.destroy();
      shadow.dispatchEvent(makeKeydown("j"));
      expect(callbacks.onNavigate).not.toHaveBeenCalled();
    });
  });
});

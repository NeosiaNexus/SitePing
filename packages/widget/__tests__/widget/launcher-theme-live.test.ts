// @vitest-environment jsdom

import { MemoryStore } from "@siteping/adapter-memory";
import type { SitepingInstance } from "@siteping/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initSiteping } from "../../src/index.js";
import { buildThemeColors } from "../../src/styles/theme.js";

// The real launcher, in store mode so nothing touches the network, under a
// `prefers-color-scheme` the test flips like an OS would.

const DARK = "(prefers-color-scheme: dark)";
let prefersDark = false;
const listeners = new Set<() => void>();

beforeEach(() => {
  prefersDark = false;
  listeners.clear();
  window.matchMedia = ((query: string) => ({
    get matches() {
      return query === DARK && prefersDark;
    },
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: (_type: string, listener: () => void) => {
      if (query === DARK) listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: () => void) => {
      listeners.delete(listener);
    },
    dispatchEvent: () => true,
  })) as unknown as typeof window.matchMedia;
});

let instance: SitepingInstance | null = null;

afterEach(() => {
  instance?.destroy();
  instance = null;
});

function launch(theme: "light" | "dark" | "auto"): SitepingInstance {
  instance = initSiteping({ projectName: "theme-live", store: new MemoryStore(), forceShow: true, theme });
  return instance;
}

function osSwitchesTo(dark: boolean): void {
  prefersDark = dark;
  for (const listener of [...listeners]) listener();
}

/** The shadow root's stylesheet text, whichever injection path the environment took. */
function shadowCss(): string {
  const shadow = document.querySelector("siteping-widget")?.shadowRoot;
  if (!shadow) throw new Error("no widget shadow root");
  const style = shadow.querySelector("style")?.textContent;
  if (style) return style;
  return [...shadow.adoptedStyleSheets].flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText)).join("\n");
}

const tooltipBackground = () => document.getElementById("sp-tooltip")?.style.background;

describe("theme: auto follows the OS live", () => {
  it("repaints the shadow styles and the tooltip when the OS color scheme flips", () => {
    launch("auto");
    expect(shadowCss()).toContain("color-scheme: light");
    const lightTooltip = tooltipBackground();

    osSwitchesTo(true);
    expect(shadowCss()).toContain("color-scheme: dark");
    expect(shadowCss()).toContain("--sp-bg: #0f172a");
    expect(tooltipBackground()).not.toBe(lightTooltip);

    osSwitchesTo(false);
    expect(shadowCss()).toContain("color-scheme: light");
    expect(tooltipBackground()).toBe(lightTooltip);
  });

  it("re-derives the accent text color with the rest of the palette", () => {
    // Amber reads differently on a light and a dark tint, so the two derived
    // text colors differ: inline styles read the variable and repaint with it.
    const accent = "#f59e0b";
    instance = initSiteping({
      projectName: "theme-live",
      store: new MemoryStore(),
      forceShow: true,
      theme: "auto",
      accentColor: accent,
    });
    const accentText = () => /--sp-accent-text:\s*(#[0-9a-f]{6})/i.exec(shadowCss())?.[1];
    const light = buildThemeColors(accent, "light").accentText;
    const dark = buildThemeColors(accent, "dark").accentText;
    expect(light).not.toBe(dark);

    expect(accentText()).toBe(light);
    osSwitchesTo(true);
    expect(accentText()).toBe(dark);
    osSwitchesTo(false);
    expect(accentText()).toBe(light);
  });

  it("stops following once the widget is destroyed", () => {
    launch("auto").destroy();
    instance = null;
    expect(listeners.size).toBe(0);
  });

  it("does not follow the OS with an explicit theme", () => {
    launch("light");
    expect(listeners.size).toBe(0);
    osSwitchesTo(true);
    expect(shadowCss()).toContain("color-scheme: light");
  });
});

describe("refresh()", () => {
  it("resolves once the reload is done, and on a released handle too", async () => {
    const handle = launch("light");
    await expect(handle.refresh()).resolves.toBeUndefined();
    handle.destroy();
    instance = null;
    await expect(handle.refresh()).resolves.toBeUndefined();
  });
});

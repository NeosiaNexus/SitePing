"use client";

/**
 * PROTOTYPE ONLY (deleted once a direction is chosen).
 *
 * Mounts the real widget (unchanged, from @siteping/widget) on the demo site
 * and lays one skin over it at a time, behind Emil Kowalski's picker. Keys:
 * 1-N and ←/→ switch, R replays (re-mounts the widget). The URL keeps the
 * choice (?v=2), and ?theme=dark|light|auto and ?locale=fr pass through.
 */

import type { SitepingInstance } from "@siteping/widget";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { PICKER_CSS } from "./picker-css";
import { SKINS } from "./skins";
import type { Skin } from "./skins/types";

const ACCENT = "#173CFF";
const LIGHT_STYLE_ID = "proto-skin-light";

type Theme = "light" | "dark" | "auto";

/** The widget's shadow root is closed: the harness keeps a handle on it. */
let widgetRoot: ShadowRoot | null = null;
let patched = false;
function captureWidgetRoot(): void {
  if (patched) return;
  patched = true;
  const original = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (this: Element, init: ShadowRootInit) {
    const root = original.call(this, init);
    if (this.tagName === "SITEPING-WIDGET") widgetRoot = root;
    return root;
  };
}

/** Tag the surfaces the widget mounts on <body>, so a skin can reach them. */
function tagSurface(node: Node): void {
  if (!(node instanceof HTMLElement)) return;
  if (node.getAttribute("role") === "dialog" && node.hasAttribute("data-siteping-ignore")) {
    node.dataset.protoSurface = "popup";
  } else if (node.getAttribute("role") === "application" && node.hasAttribute("data-siteping-ignore")) {
    node.dataset.protoSurface = "overlay";
  } else if (node.hasAttribute("data-siteping-ignore") && node.querySelector("button") && !node.id) {
    node.dataset.protoSurface = "toolbar";
  }
}

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme !== "auto") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Append the skin after the widget's own sheet, once the widget has set it. */
function applyShadowSkin(skin: Skin, isCancelled: () => boolean): void {
  const attempt = () => {
    if (isCancelled()) return;
    const root = widgetRoot;
    if (!root || root.adoptedStyleSheets.length === 0) {
      requestAnimationFrame(attempt);
      return;
    }
    if (!skin.shadowCss) return;
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(skin.shadowCss);
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
  };
  attempt();
}

function applyLightSkin(skin: Skin): void {
  let style = document.getElementById(LIGHT_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = LIGHT_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = skin.lightCss;
}

function initialIndex(): number {
  const v = Number.parseInt(new URLSearchParams(window.location.search).get("v") ?? "", 10);
  return Number.isInteger(v) && v >= 1 && v <= SKINS.length ? v - 1 : 0;
}

export function WidgetPrototypeHarness() {
  const [current, setCurrent] = useState<number | null>(null);
  const [mountKey, setMountKey] = useState(0);
  // Bottom by default; on phones the widget's sheets own the bottom edge.
  const [onTop, setOnTop] = useState(false);
  useEffect(() => {
    const phone = window.matchMedia("(max-width: 640px)");
    const update = () => setOnTop(phone.matches);
    update();
    phone.addEventListener("change", update);
    return () => phone.removeEventListener("change", update);
  }, []);
  const pickerRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Read the URL once on the client.
  useEffect(() => setCurrent(initialIndex()), []);

  // Tag the widget's page-level surfaces as they appear.
  useEffect(() => {
    captureWidgetRoot();
    for (const child of Array.from(document.body.children)) tagSurface(child);
    const observer = new MutationObserver((records) => {
      for (const record of records) for (const node of Array.from(record.addedNodes)) tagSurface(node);
    });
    observer.observe(document.body, { childList: true });
    return () => observer.disconnect();
  }, []);

  // Mount the real widget with the current skin; re-mount on every switch or replay.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mountKey is the replay trigger (R)
  useEffect(() => {
    if (current === null) return;
    const skin = SKINS[current];
    if (!skin) return;
    const params = new URLSearchParams(window.location.search);
    const themeParam = params.get("theme");
    const theme: Theme = themeParam === "dark" || themeParam === "auto" ? themeParam : "light";
    const locale = params.get("locale") ?? "en";
    document.documentElement.dataset.protoTheme = resolveTheme(theme);
    document.documentElement.style.setProperty("--proto-accent", ACCENT);
    applyLightSkin(skin);

    let cancelled = false;
    let instance: SitepingInstance | null = null;
    (async () => {
      const { initSiteping } = await import("@siteping/widget");
      if (cancelled) return;
      widgetRoot = null;
      instance = initSiteping({
        projectName: "demo",
        endpoint: "/api/siteping",
        forceShow: true,
        theme,
        locale,
        position: "bottom-right",
        accentColor: ACCENT,
        // Same page as /demo (same site, same anchors): its seeded notes and pins show here.
        getPageScope: () => ({ url: "/demo", urlPattern: null }),
      });
      applyShadowSkin(skin, () => cancelled);
    })();
    return () => {
      cancelled = true;
      instance?.destroy();
    };
  }, [current, mountKey]);

  // The highlight follows the active item; the variant swap itself is instant.
  const moveHighlight = useCallback(() => {
    if (current === null) return;
    const item = itemRefs.current[current];
    const highlight = highlightRef.current;
    if (!item || !highlight) return;
    highlight.style.width = `${item.offsetWidth}px`;
    highlight.style.transform = `translateX(${item.offsetLeft}px)`;
  }, [current]);

  useLayoutEffect(() => {
    moveHighlight();
  }, [moveHighlight]);

  useEffect(() => {
    window.addEventListener("resize", moveHighlight);
    // The slide is enabled only after first paint, so load doesn't animate.
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => pickerRef.current?.setAttribute("data-ready", "")),
    );
    return () => {
      window.removeEventListener("resize", moveHighlight);
      cancelAnimationFrame(raf);
    };
  }, [moveHighlight]);

  const select = useCallback((index: number) => {
    if (index < 0 || index >= SKINS.length) return;
    setCurrent(index);
    const url = new URL(window.location.href);
    url.searchParams.set("v", String(index + 1));
    window.history.replaceState(null, "", url);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (current === null) return;
      const num = Number.parseInt(e.key, 10);
      if (num >= 1 && num <= SKINS.length) select(num - 1);
      else if (e.key === "ArrowRight") select((current + 1) % SKINS.length);
      else if (e.key === "ArrowLeft") select((current - 1 + SKINS.length) % SKINS.length);
      else if (e.key === "r" || e.key === "R") setMountKey((k) => k + 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, select]);

  return (
    <>
      <style>{PICKER_CSS}</style>
      <nav
        ref={pickerRef}
        className="proto-picker"
        data-position={onTop ? "top" : undefined}
        aria-label="Prototype variants"
      >
        <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />
        {SKINS.map((skin, i) => (
          <button
            key={skin.name}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            type="button"
            className="proto-picker-item"
            data-active={i === current ? "" : undefined}
            aria-current={i === current ? "true" : undefined}
            title={skin.axis}
            onClick={() => select(i)}
          >
            {skin.name}
          </button>
        ))}
        <span className="proto-picker-divider" aria-hidden="true" />
        <button
          type="button"
          className="proto-picker-item proto-picker-replay"
          aria-label="Replay animation (R)"
          onClick={() => setMountKey((k) => k + 1)}
        >
          ↻
        </button>
      </nav>
    </>
  );
}

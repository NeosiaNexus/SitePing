import { type AnnotationPayload, type FeedbackType, newClientId, type ScreenshotRegion } from "@siteping/core";
import { EASE_OUT, INSTANT_ANNOTATION_SIZE, Z_INDEX_MAX } from "./constants.js";
import { deepElementFromPoint, findAnchorElement, generateAnchor, rectToPercentages } from "./dom/anchor.js";
import { el, focusRing, pressable, setText } from "./dom-utils.js";
import type { EventBus, WidgetEvents } from "./events.js";
import { deepFocusTarget, isWidgetChrome } from "./focus-tracker.js";
import { isolateFromHost, registerEscapeLayer } from "./host-isolation.js";
import type { TFunction } from "./i18n/index.js";
import { Popup } from "./popup.js";
import { NO_VIEWPORT_INSETS, type ViewportInsets } from "./popup-placement.js";
import { type AnnotatedScreenshot, captureAnnotatedScreenshot } from "./screenshot.js";
import { SYSTEM_FONT, type ThemeColors } from "./styles/theme.js";
import { canHover, isCoarsePointer, prefersReducedMotion } from "./viewport.js";

/** Below this size (px) on either axis, a gesture is a click or a tap: it points at the element under it. */
const MIN_RECT_SIZE = 10;

/** Reduced transparency or increased contrast: the island turns opaque, like the theme's materials. */
function solidSurfaces(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-transparency: reduce), (prefers-contrast: more)").matches
  );
}

/**
 * The annotation bar is a dark island in both schemes, like a system
 * recording indicator: it reads over any page and never passes for page UI.
 */
const ISLAND = {
  bg: "rgba(0, 0, 0, 0.86)",
  /** Reduced transparency: the same island, opaque. */
  bgSolid: "#000000",
  text: "#f5f5f7",
  instruction: "rgba(255, 255, 255, 0.94)",
  cancelBg: "rgba(255, 255, 255, 0.16)",
  /** Cancel's hover: a red tint with a light red label, 5:1 on the island. */
  cancelHoverBg: "rgba(255, 69, 58, 0.26)",
  cancelHoverText: "#ff8a80",
} as const;

/** The part of a viewport rect that is on screen. */
function clampToViewport(r: DOMRect): DOMRect {
  const left = Math.max(0, r.left);
  const top = Math.max(0, r.top);
  return new DOMRect(
    left,
    top,
    Math.max(0, Math.min(r.right, window.innerWidth) - left),
    Math.max(0, Math.min(r.bottom, window.innerHeight) - top),
  );
}

export interface AnnotationComplete {
  annotation: AnnotationPayload;
  type: FeedbackType;
  message: string;
  /**
   * Idempotency key of this feedback, minted once per popup session: every
   * resend from the same popup carries it, so the server (and the retry
   * queue) dedupe a resend against an earlier attempt instead of storing
   * the feedback twice. See `PopupSession`.
   */
  clientId: string;
  /**
   * Base64 JPEG `data:` URL captured by html2canvas-pro, or null when capture
   * is disabled / failed / the peer dep is missing.
   */
  screenshotDataUrl?: string | null | undefined;
  /**
   * Where the drawn rect sits within the captured screenshot, as fractions
   * of the image dimensions — see `ScreenshotRegion`. Null whenever
   * `screenshotDataUrl` is null.
   */
  screenshotRegion?: ScreenshotRegion | null | undefined;
}

/**
 * State shared by every submit attempt from one popup session (the popup
 * restores the form after a failure so the user can resend).
 *
 * `clientId` is reused even when the user edits the message before
 * resending. If the first attempt landed although it timed out on our side,
 * the server dedupes the resend and returns the original record, so that
 * edit is lost — accepted: it takes a commit whose response never arrived,
 * and minting a new id on edit would store a duplicate in that same case.
 */
interface PopupSession {
  readonly clientId: string;
  /** Captured on the first attempt (`undefined` until then) and reused on every retry. */
  screenshot?: AnnotatedScreenshot | null;
}

function newPopupSession(): PopupSession {
  return { clientId: newClientId() };
}

/**
 * Annotation mode: full-page overlay with rectangle drawing.
 *
 * - A dark floating island at the top centre carries the instruction and Cancel
 * - A light scrim over the page
 * - An accent rectangle with a soft halo for the selection
 */
export class Annotator {
  private overlay: HTMLElement | null = null;
  private toolbar: HTMLElement | null = null;
  /** The toolbar's Cancel, and whether it is frozen while a send is in flight (#397). */
  private toolbarCancel: HTMLButtonElement | null = null;
  private cancelFrozen = false;
  private drawingRect: HTMLElement | null = null;
  private startX = 0;
  private startY = 0;
  private isDrawing = false;
  private isActive = false;
  /**
   * True when the current annotation session was triggered by right-click
   * (instant comment) rather than the FAB draw flow. Controls whether the
   * toolbar is shown and whether cancel deactivates unconditionally.
   */
  private instantMode = false;
  private popup: Popup;
  /** The palette changed mid-session: rebuild the popup once the session ends. */
  private stalePopup = false;
  private savedOverflow = "";
  private preActiveFocusElement: Element | null = null;
  /**
   * Target of the keyboard (Enter) annotation path — the page element focused
   * at activation, or the focus tracker's fallback when activation came from
   * the widget's own chrome (FAB menu). Distinct from `preActiveFocusElement`,
   * which keeps its focus-restore role untouched. See issue #162.
   */
  private keyboardTarget: HTMLElement | null = null;
  private rafId: number | null = null;
  private pendingMoveEvent: MouseEvent | Touch | null = null;
  /**
   * Reject handle for the in-flight `runSubmission` promise, or null when no
   * submission is pending. `destroy()` calls it to settle the promise rather
   * than leaving the awaiting closure hung past teardown.
   */
  private rejectPendingSubmission: ((reason: Error) => void) | null = null;
  /**
   * The session's Escape handler listens on `document` and also ends a
   * session from its comment popup: one layer covers overlay, toolbar and popup.
   */
  private readonly unregisterEscapeLayer = registerEscapeLayer(document, () => this.isActive);

  constructor(
    private readonly colors: ThemeColors,
    private readonly bus: EventBus<WidgetEvents>,
    private readonly t: TFunction,
    private readonly enableScreenshot: boolean = false,
    private readonly getFallbackTarget?: () => HTMLElement | null,
  ) {
    this.popup = new Popup(colors, t);

    this.bus.on("annotation:start", () => this.activate());
  }

  /**
   * True while the annotator is active (overlay/popup session in progress).
   * The launcher checks this before calling `preventDefault()` on the
   * `contextmenu` event so a right-click during an active session falls
   * through to the native menu instead of being silently swallowed.
   */
  get isBusy(): boolean {
    return this.isActive;
  }

  /**
   * Re-read every `t(...)`-derived label inside the popup. The annotator's
   * own toolbar text is created fresh on every `activate()` call, so only
   * the long-lived popup needs explicit re-localization here.
   */
  refreshLabels(): void {
    this.popup.refreshLabels();
  }

  /**
   * Rebuild the long-lived popup from the palette, after an `auto` theme
   * followed the OS. Mid-session it waits for the session to end, so a form
   * never changes under the visitor; the toolbar and overlay are rebuilt on
   * every activation anyway.
   */
  restyle(): void {
    this.stalePopup = this.isActive || this.popup.isOpen;
    if (this.stalePopup) return;
    this.popup.destroy();
    this.popup = new Popup(this.colors, this.t);
  }

  /**
   * Capture a contextual screenshot of the drawn rect (padded with the
   * surrounding UI, plus the rect's region within the image) when
   * `enableScreenshot` is on. Returns null on disable / capture failure /
   * missing peer dep — the feedback is always submitted regardless.
   */
  private async maybeCapture(rect: DOMRect): Promise<AnnotatedScreenshot | null> {
    if (!this.enableScreenshot) return null;
    return captureAnnotatedScreenshot(rect);
  }

  private activate(): void {
    if (this.isActive) return;
    this.isActive = true;
    const drawMode = !this.instantMode;
    const touch = isCoarsePointer();
    // The visible copy on touch says "tap an element". The overlay's name keeps
    // the Enter route (#162): tablets with a keyboard, and screen readers on them.
    const instruction = this.t("annotator.instruction");

    // Capture the focused element before activation for keyboard annotation
    this.preActiveFocusElement = document.activeElement;

    // Keyboard (Enter) target. FAB-launched sessions re-focus the FAB before
    // activation, so the active element here is only the widget's 0x0 shadow
    // host — fall back to the last page element the focus tracker recorded
    // instead of silently dead-ending the Enter path. See issue #162.
    // Focus inside a web component reports its host — annotate the focused
    // element itself, as the pointer path does (#177).
    const active = document.activeElement;
    this.keyboardTarget =
      active instanceof HTMLElement &&
      active !== document.body &&
      active !== document.documentElement &&
      !isWidgetChrome(active)
        ? deepFocusTarget(active)
        : (this.getFallbackTarget?.() ?? null);

    // Lock page scroll
    this.savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Overlay: the page dims a little (more in dark, where a light tint would
    // not read), so the annotation mode is visibly on.
    //
    // Overlay, toolbar and the drawn rectangle live on document.body, outside
    // the siteping-widget shadow host. Without the `data-siteping-ignore`
    // marker the screenshot predicate in screenshot.ts cannot reach them —
    // and the accent-colored selection border plus the page tint end up
    // baked into the captured JPEG. See issue #124.
    this.overlay = el("div", {
      style: /* css */ `
        position:fixed;inset:0;
        z-index:${Z_INDEX_MAX - 1};
        pointer-events:auto;
        background:${this.colors.surface.overlayTint};
        cursor:${drawMode ? "crosshair" : "default"};
        touch-action:none;-webkit-touch-callout:none;
        -webkit-user-select:none;user-select:none;
      `,
    });
    // The overlay is an interactive surface (draw with the pointer, Enter to
    // annotate the previously focused element, Escape to cancel) and receives
    // programmatic focus below — so it must be exposed to assistive tech, NOT
    // aria-hidden: focusing an aria-hidden element parks screen-reader users
    // on a node that announces nothing (axe "aria-hidden-focus", serious).
    this.overlay.setAttribute("role", "application");
    this.overlay.setAttribute("aria-label", drawMode ? instruction : this.t("annotator.instantInstruction"));
    this.overlay.setAttribute("data-siteping-ignore", "true");

    // Toolbar: a floating island at the top centre (suppressed in instant
    // mode: the "Draw a rectangle" copy is wrong when the composer is already
    // open). Centred by `left:0;right:0` with auto side margins around a
    // max-content width, not a transform: the slide-in below animates
    // `transform`. It wraps to two lines on a phone rather than overflow.
    if (drawMode) {
      const island = solidSurfaces()
        ? `background:${ISLAND.bgSolid};`
        : `background:${ISLAND.bg};backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);`;
      this.toolbar = el("div", {
        style: /* css */ `
          position:fixed;top:calc(env(safe-area-inset-top, 0px) + 10px);left:0;right:0;
          width:max-content;max-width:calc(100vw - 24px);margin:0 auto;
          z-index:${Z_INDEX_MAX};
          pointer-events:auto;
          min-height:44px;box-sizing:border-box;
          padding:5px 5px 5px 16px;
          border:none;border-radius:22px;
          ${island}
          box-shadow:inset 0 0 0 0.5px rgba(255, 255, 255, 0.14), 0 12px 32px rgba(0, 0, 0, 0.28);
          display:flex;align-items:center;justify-content:center;gap:12px;
          font-family:${SYSTEM_FONT};
          font-size:13px;line-height:1.35;color:${ISLAND.text};
          -webkit-font-smoothing:antialiased;
        `,
      });
      this.toolbar.setAttribute("data-siteping-ignore", "true");

      // The accent lifted toward white, so it glows (and rings Cancel's
      // keyboard focus) on the dark island, whatever accent the host picked.
      const islandAccent = `color-mix(in srgb, ${this.colors.accent} 50%, #ffffff)`;
      const dot = el("span", {
        style: /* css */ `
          width:8px;height:8px;border-radius:50%;flex-shrink:0;
          background:${islandAccent};
          box-shadow:0 0 10px color-mix(in srgb, ${this.colors.accent} 60%, #ffffff);
        `,
      });

      // Pulse through the Web Animations API rather than a <style> element:
      // no global `@keyframes` name to collide with the host's, and nothing a
      // strict CSP (`style-src` without 'unsafe-inline') blocks. The guard is
      // for jsdom in tests, where `animate` may be undefined.
      if (!prefersReducedMotion() && typeof dot.animate === "function") {
        dot.animate([{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }], {
          duration: 1500,
          easing: "ease-in-out",
          iterations: Infinity,
        });
      }

      const instructionEl = el("span", {
        style: /* css */ `font-weight:500;letter-spacing:-0.005em;min-width:0;color:${ISLAND.instruction};`,
      });
      setText(instructionEl, touch ? this.t("annotator.touchInstruction") : instruction);

      const cancelBtn = document.createElement("button");
      cancelBtn.style.cssText = /* css */ `
        height:${touch ? 40 : 34}px;padding:0 14px;border:none;border-radius:9999px;flex-shrink:0;
        color:#ffffff;font-family:${SYSTEM_FONT};
        font-size:13px;font-weight:600;cursor:pointer;
        touch-action:manipulation;
        transition:background-color 0.15s ease,color 0.15s ease,opacity 0.15s ease,scale 0.16s ${EASE_OUT};
      `;
      setText(cancelBtn, this.t("annotator.cancel"));
      cancelBtn.addEventListener("click", () => this.cancelSession());
      pressable(cancelBtn);
      focusRing(cancelBtn, islandAccent);
      cancelBtn.addEventListener("mouseenter", () => {
        if (!this.cancelFrozen && canHover()) this.paintCancel(true);
      });
      cancelBtn.addEventListener("mouseleave", () => this.paintCancel(false));
      this.toolbarCancel = cancelBtn;
      this.paintCancel(false);

      this.toolbar.appendChild(dot);
      this.toolbar.appendChild(instructionEl);
      this.toolbar.appendChild(cancelBtn);
    }

    if (drawMode) {
      // Mouse events
      this.overlay.addEventListener("mousedown", this.onMouseDown);
      this.overlay.addEventListener("mousemove", this.onMouseMove);
      this.overlay.addEventListener("mouseup", this.onMouseUp);

      // Touch events (Surface Pro, iPad, etc.)
      this.overlay.addEventListener("touchstart", this.onTouchStart, { passive: false });
      this.overlay.addEventListener("touchmove", this.onTouchMove, { passive: false });
      this.overlay.addEventListener("touchend", this.onTouchEnd);

      // Keyboard annotation: Enter selects the captured keyboard target
      this.overlay.addEventListener("keydown", this.onOverlayKeyDown);
    }

    // Allow tab-through so keyboard users can reach underlying elements
    this.overlay.setAttribute("tabindex", "0");

    // Escape to cancel
    document.addEventListener("keydown", this.onKeyDown);

    isolateFromHost(this.overlay);
    if (this.toolbar) isolateFromHost(this.toolbar);
    document.body.appendChild(this.overlay);
    if (this.toolbar) {
      document.body.appendChild(this.toolbar);
      // The mode arrives from the top edge it lives on (Apple: spatial
      // consistency); started from the FAB menu, never from a shortcut.
      if (!prefersReducedMotion() && typeof this.toolbar.animate === "function") {
        this.toolbar.animate([{ transform: "translateY(-100%)" }, { transform: "none" }], {
          duration: 250,
          easing: EASE_OUT,
        });
      }
    }

    // Move focus to the overlay so the keyboard-annotation path (Enter →
    // annotate the captured keyboard target) actually receives keydown —
    // onOverlayKeyDown only fires when the overlay itself is focused. The
    // overlay has tabindex=0, and the keyboard target was captured at the top
    // of activate(), before the overlay existed, so focusing here doesn't
    // clobber it. (WCAG 2.1.1 Level A)
    this.overlay.focus({ preventScroll: true });
  }

  /**
   * Viewport band covered by the toolbar, measured rather than assumed: its
   * height depends on fonts and zoom, and a host may restyle or move it.
   */
  private toolbarInsets(): ViewportInsets {
    if (!this.toolbar) return NO_VIEWPORT_INSETS;
    // A note drawn while the island is still sliding in would measure it
    // mid-flight: it lands at once, where the popup must keep clear of it.
    if (typeof this.toolbar.getAnimations === "function") {
      for (const animation of this.toolbar.getAnimations()) animation.finish();
    }
    const toolbarRect = this.toolbar.getBoundingClientRect();
    if (toolbarRect.height === 0) return NO_VIEWPORT_INSETS;
    const viewportHeight = window.innerHeight;
    const sitsInTopHalf = toolbarRect.top + toolbarRect.height / 2 < viewportHeight / 2;
    return sitsInTopHalf
      ? { top: Math.max(0, toolbarRect.bottom), bottom: 0 }
      : { top: 0, bottom: Math.max(0, viewportHeight - toolbarRect.top) };
  }

  /**
   * User-initiated end of the session (toolbar Cancel, Escape). Closes an open
   * comment form first so it is not left floating with nothing behind it — the
   * popup's own focus restore runs before the annotator hands focus back to the
   * pre-activation element. While a submission is in flight the popup refuses
   * to close, and the session stays active too: deactivating here would clear
   * `isActive` and emit `annotation:end` while the popup still waits on
   * `feedback:sent`, letting a second annotation overwrite its resolver and
   * submit handler. The session ends once the pending popup settles; the
   * send bounds its network and store waits (#342), so the hold ends too.
   */
  private cancelSession(): void {
    if (!this.isActive) return;
    this.popup.dismiss();
    if (this.popup.isOpen) return;
    this.deactivate();
  }

  /** The toolbar Cancel's red hover look, or its resting one. */
  private paintCancel(hover: boolean): void {
    const btn = this.toolbarCancel;
    if (!btn) return;
    btn.style.color = hover ? ISLAND.cancelHoverText : "#ffffff";
    btn.style.background = hover ? ISLAND.cancelHoverBg : ISLAND.cancelBg;
  }

  /**
   * While a send is in flight `cancelSession` ignores the toolbar Cancel, so
   * it mirrors the popup's frozen Cancel rather than look ready to act:
   * dimmed, no hover, `aria-disabled` (#397).
   */
  private freezeCancel(frozen: boolean): void {
    this.cancelFrozen = frozen;
    const btn = this.toolbarCancel;
    if (!btn) return;
    if (frozen) this.paintCancel(false);
    btn.style.opacity = frozen ? "0.5" : "1";
    btn.style.cursor = frozen ? "not-allowed" : "pointer";
    if (frozen) btn.setAttribute("aria-disabled", "true");
    else btn.removeAttribute("aria-disabled");
  }

  private deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.isDrawing = false;
    this.instantMode = false;
    const previouslyFocused = this.preActiveFocusElement;
    this.preActiveFocusElement = null;
    this.keyboardTarget = null;

    // Cancel any pending rAF to prevent stale callbacks
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pendingMoveEvent = null;

    document.body.style.overflow = this.savedOverflow;
    document.removeEventListener("keydown", this.onKeyDown);

    this.overlay?.remove();
    this.toolbar?.remove();
    this.drawingRect?.remove();
    this.overlay = null;
    this.toolbar = null;
    this.toolbarCancel = null;
    this.cancelFrozen = false;
    this.drawingRect = null;

    // Removing the focused overlay drops focus to <body> — hand it back to the
    // element that had it before activation (WCAG 2.4.3 focus order). When
    // activation came from the FAB menu this element is the shadow host and
    // focus() is a no-op; the Fab restores itself on annotation:end instead.
    if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
      previouslyFocused.focus({ preventScroll: true });
    }

    this.bus.emit("annotation:end");
    if (this.stalePopup) this.restyle();
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") this.cancelSession();
  };

  /**
   * Keyboard annotation: pressing Enter while the overlay is active selects
   * the keyboard target captured at activation (the focused page element, or
   * the focus tracker's fallback for FAB-launched sessions) and creates a
   * full-bounds annotation covering that element (WCAG 2.1.1 Level A).
   */
  private onOverlayKeyDown = async (e: KeyboardEvent): Promise<void> => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    // A submission is already running or the popup is open — ignore so we
    // can't orphan the first `popup.show()` / `runSubmission` pair.
    if (this.popup.isOpen) return;
    // Mid-pointer-drag: the user is drawing — hijacking `drawingRect` for the
    // keyboard highlight here would corrupt the drag's geometry updates.
    if (this.isDrawing) return;

    const target = this.keyboardTarget;
    if (!target || !(target instanceof HTMLElement)) return;
    await this.annotateElement(target);
  };

  /**
   * Comment on a whole element with a full-bounds rect — the keyboard (Enter)
   * path and the touch tap path. A tapped element can be far taller than the
   * screen, and the capture renders at devicePixelRatio (3 on phones): the tap
   * path captures only its visible part, like the instant flow.
   */
  private async annotateElement(target: HTMLElement, tap = false): Promise<void> {
    const bounds = target.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;

    const rectBounds = new DOMRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // Highlight the target like a pointer-drawn rectangle so the user sees
    // what they're about to comment. Assigned to `drawingRect` so every
    // existing cleanup path (deactivate, screenshot exclusion, removal once
    // the popup closes) treats it exactly like the mouse path's rect.
    this.drawingRect?.remove();
    const highlight = this.createDrawingRect();
    highlight.style.left = `${bounds.x}px`;
    highlight.style.top = `${bounds.y}px`;
    highlight.style.width = `${bounds.width}px`;
    highlight.style.height = `${bounds.height}px`;
    this.drawingRect = highlight;
    this.overlay?.appendChild(highlight);

    const anchor = generateAnchor(target);
    const annotation: AnnotationPayload = {
      anchor,
      rect: { xPct: 0, yPct: 0, wPct: 1, hPct: 1 },
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    };

    // Submission stays inside the popup so the user gets a visible spinner
    // until the server confirms — see finishDrawing for the rationale.
    const result = await this.openForm(annotation, rectBounds, tap ? clampToViewport(rectBounds) : rectBounds);

    this.drawingRect?.remove();
    this.drawingRect = null;
    if (result) this.deactivate();
  }

  private onMouseDown = (e: MouseEvent): void => {
    this.startDrawing(e.clientX, e.clientY);
  };

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) this.startDrawing(touch.clientX, touch.clientY);
  };

  private startDrawing(clientX: number, clientY: number): void {
    // Suppress pointer-driven drawing while the popup is open over the page.
    // Starting a second rectangle would orphan the first `popup.show()`
    // promise (and its `runSubmission`). This closes a latent bug where
    // drawing during the open popup overwrote `Popup.resolve`.
    if (this.popup.isOpen) return;

    this.isDrawing = true;
    this.startX = clientX;
    this.startY = clientY;

    this.drawingRect?.remove();
    this.drawingRect = this.createDrawingRect();
    this.overlay?.appendChild(this.drawingRect);
  }

  /**
   * The accent-colored selection rectangle, shared by pointer drawing, the
   * keyboard (Enter) highlight and the right-click point, so the paths can't
   * drift visually: a 10% accent wash inside a 4px accent halo.
   * Excluded from screenshot capture (see overlay creation in activate()).
   */
  private createDrawingRect(): HTMLElement {
    const { accent } = this.colors;
    const rect = el("div", {
      style: /* css */ `
        position:fixed;
        border:2px solid ${accent};
        background:color-mix(in srgb, ${accent} 10%, transparent);
        pointer-events:none;
        border-radius:12px;
        box-shadow:0 0 0 4px color-mix(in srgb, ${accent} 16%, transparent), 0 8px 24px rgba(0, 0, 0, 0.08);
        transition:box-shadow 0.15s ease;
      `,
    });
    rect.setAttribute("data-siteping-ignore", "true");
    return rect;
  }

  private onMouseMove = (e: MouseEvent): void => {
    this.scheduleRectUpdate(e);
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches[0]) this.scheduleRectUpdate(e.touches[0]);
  };

  private scheduleRectUpdate(source: MouseEvent | Touch): void {
    if (!this.isDrawing || !this.drawingRect) return;

    this.pendingMoveEvent = source;
    if (this.rafId !== null) return;

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      const evt = this.pendingMoveEvent;
      if (!evt || !this.drawingRect) return;

      const x = Math.min(evt.clientX, this.startX);
      const y = Math.min(evt.clientY, this.startY);
      const w = Math.abs(evt.clientX - this.startX);
      const h = Math.abs(evt.clientY - this.startY);

      this.drawingRect.style.left = `${x}px`;
      this.drawingRect.style.top = `${y}px`;
      this.drawingRect.style.width = `${w}px`;
      this.drawingRect.style.height = `${h}px`;
    });
  }

  private onTouchEnd = async (e: TouchEvent): Promise<void> => {
    const touch = e.changedTouches[0];
    if (touch) await this.finishDrawing(touch.clientX, touch.clientY);
  };

  /**
   * The page element under a point, seen through the overlay and into open
   * shadow roots like the drag path — null for widget chrome and the page root.
   */
  private elementAt(x: number, y: number): HTMLElement | null {
    if (this.overlay) this.overlay.style.pointerEvents = "none";
    const hit = deepElementFromPoint(x, y);
    if (this.overlay) this.overlay.style.pointerEvents = "auto";
    // An icon's <path> is no target — take the element hosting the <svg>.
    const target = hit instanceof SVGElement ? (hit.ownerSVGElement ?? hit).parentElement : hit;
    return target instanceof HTMLElement &&
      target !== document.body &&
      target !== document.documentElement &&
      !isWidgetChrome(target)
      ? target
      : null;
  }

  private onMouseUp = async (e: MouseEvent): Promise<void> => {
    await this.finishDrawing(e.clientX, e.clientY);
  };

  private finishDrawing = async (clientX: number, clientY: number): Promise<void> => {
    if (!this.isDrawing || !this.drawingRect) return;
    this.isDrawing = false;

    const x = Math.min(clientX, this.startX);
    const y = Math.min(clientY, this.startY);
    const w = Math.abs(clientX - this.startX);
    const h = Math.abs(clientY - this.startY);

    // A tap or a click, or a drag too thin to frame an area (along a line of
    // text): comment on the element under the pointer instead of dropping the
    // gesture — a fingertip hides the very corner it is trying to place, and
    // a click on an element is the plainest way to point at it.
    if (w < MIN_RECT_SIZE || h < MIN_RECT_SIZE) {
      this.drawingRect.remove();
      this.drawingRect = null;
      const target = this.elementAt(clientX, clientY);
      if (target) await this.annotateElement(target, true);
      return;
    }

    const rectBounds = new DOMRect(x, y, w, h);

    // Build annotation payload BEFORE the popup opens — the overlay is still
    // up so `findAnchorElement` can briefly disable pointer events on it.
    const { annotation } = this.buildAnnotation(rectBounds);

    // Keep the drawn rectangle visible while the popup is open so the user
    // can see what they're sending feedback about — including while the
    // submit-spinner is running. We only remove it after the popup closes.
    const result = await this.openForm(annotation, rectBounds);

    this.drawingRect?.remove();
    this.drawingRect = null;
    if (result) this.deactivate();
  };

  /**
   * Instantly triggers the annotation popup at a specific location without
   * requiring the user to draw a rectangle. Used for right-click commenting.
   *
   * Entry is routed through the event bus (`annotation:start`) so the public
   * event contract (`onAnnotationStart` / `onAnnotationEnd`) is honoured —
   * hosts that pause analytics or chat widgets on annotation hooks see a
   * symmetric start/end pair regardless of entry path.
   */
  public async startInstantAnnotation(clientX: number, clientY: number): Promise<void> {
    // Guard: no-op while the annotator is active (overlay/popup session in
    // progress). `isActive` covers the entire window: draw mode in progress,
    // popup open for typing, and submission in flight. Without this a second
    // right-click (e.g. to paste in the textarea) would reset the form,
    // orphan the pending popup.show(), and leak the old drawing rect.
    if (this.isActive) return;

    // Set instant-mode flag BEFORE emitting annotation:start so activate()
    // (called by the bus handler) can read it and suppress the toolbar.
    this.instantMode = true;
    this.bus.emit("annotation:start");

    // Build a small point-rect centered at the cursor for the marker/percentage
    // math. Clamped to viewport edges on all sides.
    const x = Math.max(0, Math.min(clientX - INSTANT_ANNOTATION_SIZE / 2, window.innerWidth - INSTANT_ANNOTATION_SIZE));
    const y = Math.max(
      0,
      Math.min(clientY - INSTANT_ANNOTATION_SIZE / 2, window.innerHeight - INSTANT_ANNOTATION_SIZE),
    );
    const pointRect = new DOMRect(x, y, INSTANT_ANNOTATION_SIZE, INSTANT_ANNOTATION_SIZE);

    // Resolve the anchor element and build the annotation payload.
    // We also derive the capture rect from the anchor element's bounding box
    // (clamped to the viewport) so enableScreenshot produces a useful image
    // instead of a postage stamp.
    const { annotation, anchorBounds } = this.buildAnnotation(pointRect);

    // Use the anchor element's bounding box (clamped to viewport) for
    // screenshot capture so reviewers get meaningful context, not a 20×20 px
    // postage stamp.
    const captureRect = clampToViewport(anchorBounds);

    // Create a visual indicator at the click point
    this.drawingRect?.remove();
    this.drawingRect = this.createDrawingRect();
    Object.assign(this.drawingRect.style, {
      left: `${x}px`,
      top: `${y}px`,
      width: `${INSTANT_ANNOTATION_SIZE}px`,
      height: `${INSTANT_ANNOTATION_SIZE}px`,
    });
    this.overlay?.appendChild(this.drawingRect);

    await this.openForm(annotation, pointRect, captureRect);

    // Instant flow: always deactivate on popup close — unlike the draw flow
    // where cancel keeps the session alive so the user can re-draw, there is
    // no draw phase to return to here. Leaving the overlay, scroll-lock and
    // toolbar up after cancel strands the user in a mode they never opted into.
    this.drawingRect?.remove();
    this.drawingRect = null;
    this.deactivate();
  }

  /**
   * Open the feedback form for a selection as one popup session (see
   * `PopupSession`); it submits through `runSubmission`. Resolves null when
   * the user cancels.
   */
  private openForm(
    annotation: AnnotationPayload,
    rect: DOMRect,
    captureRect: DOMRect = rect,
  ): ReturnType<Popup["show"]> {
    const session = newPopupSession();
    const shown = this.popup.show(
      rect,
      (formResult) => {
        this.freezeCancel(true);
        return this.runSubmission(annotation, formResult, captureRect, session).finally(() => this.freezeCancel(false));
      },
      this.toolbarInsets(),
    );
    this.revealSelection(rect);
    return shown;
  }

  /**
   * Phones: the feedback sheet covers the bottom of the screen. Scroll the
   * page so the selection stays visible above it — the highlight is fixed,
   * so it moves by the same amount. Never scrolls the selection's top under
   * the toolbar.
   */
  private revealSelection(rect: DOMRect): void {
    const sheetTop = this.popup.sheetTop;
    if (sheetTop === null || !this.drawingRect) return;
    const wanted = Math.min(rect.bottom + 16 - sheetTop, rect.top - 72);
    if (wanted <= 0) return;
    const before = window.scrollY;
    window.scrollBy({ top: wanted, behavior: "instant" });
    this.drawingRect.style.top = `${rect.top - (window.scrollY - before)}px`;
  }

  /**
   * Submit handler passed into `popup.show()`. Captures the screenshot once
   * (cached across retries in the popup `session`, like its `clientId`) and
   * emits `annotation:complete` on the bus, then
   * waits for one of three terminal signals:
   *
   * - `feedback:sent` — resolve (popup closes).
   * - `feedback:error` — reject with the genuine error (popup restores for
   *   retry; the launcher surfaces the error to the host).
   * - `submission:cancelled` — reject as a silent abort (popup restores; no
   *   error is surfaced — e.g. the user cancelled the identity prompt).
   *
   * Submissions are serialized by the popup guard (`this.popup.isOpen`),
   * so exactly one `runSubmission` is ever live — the global outcome events
   * cannot cross-wire between submissions and need no correlation id.
   */
  private async runSubmission(
    annotation: AnnotationPayload,
    formResult: { type: FeedbackType; message: string },
    rectBounds: DOMRect,
    session: PopupSession,
  ): Promise<void> {
    // Screenshot capture is the slow part. Capture once and reuse the
    // cached data URL + region on every retry — re-running html2canvas-pro after
    // each failed submit would punish the user for a network blip.
    if (session.screenshot === undefined) {
      // The rect is in viewport coordinates of the selection moment — follow
      // any scroll since (revealSelection) so the capture frames the same content.
      session.screenshot = await this.maybeCapture(
        new DOMRect(
          rectBounds.x + annotation.scrollX - window.scrollX,
          rectBounds.y + annotation.scrollY - window.scrollY,
          rectBounds.width,
          rectBounds.height,
        ),
      );
    }
    const capture = session.screenshot;

    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        unsubSent();
        unsubQueued();
        unsubError();
        unsubCancelled();
        this.rejectPendingSubmission = null;
      };
      const unsubSent = this.bus.on("feedback:sent", () => {
        cleanup();
        resolve();
      });
      // Saved for the next page load: the popup closes as on success.
      const unsubQueued = this.bus.on("feedback:queued", () => {
        cleanup();
        resolve();
      });
      const unsubError = this.bus.on("feedback:error", (err) => {
        cleanup();
        reject(err);
      });
      const unsubCancelled = this.bus.on("submission:cancelled", () => {
        cleanup();
        // Silent abort — the popup restores but no error is surfaced.
        reject(new Error("Feedback submission cancelled"));
      });

      // Expose the reject handle so `destroy()` mid-submit can settle this
      // promise instead of leaving the awaiting closure hung past teardown.
      this.rejectPendingSubmission = (reason) => {
        cleanup();
        reject(reason);
      };

      this.bus.emit("annotation:complete", {
        annotation,
        type: formResult.type,
        message: formResult.message,
        clientId: session.clientId,
        screenshotDataUrl: capture?.dataUrl ?? null,
        screenshotRegion: capture?.region ?? null,
      });
    });
  }

  /**
   * Build an AnnotationPayload from a drawn rectangle.
   * Temporarily hides the overlay to access the real DOM underneath.
   */
  private buildAnnotation(rectBounds: DOMRect): { annotation: AnnotationPayload; anchorBounds: DOMRect } {
    // Temporarily hide overlay to find the real element underneath
    if (this.overlay) this.overlay.style.pointerEvents = "none";
    const anchorElement = findAnchorElement(rectBounds);
    if (this.overlay) this.overlay.style.pointerEvents = "auto";

    const anchor = generateAnchor(anchorElement);
    const anchorBounds = anchorElement.getBoundingClientRect();
    const rect = rectToPercentages(rectBounds, anchorBounds);

    const annotation = {
      anchor,
      rect,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    };
    return { annotation, anchorBounds };
  }
  destroy(): void {
    this.deactivate();
    this.unregisterEscapeLayer();
    // Settle an in-flight submission BEFORE tearing down the popup, so the
    // `runSubmission` promise cannot outlive teardown. The launcher's
    // `destroy()` also calls `bus.removeAll()`, which would otherwise strip
    // the terminal-event listeners and leave the promise — and the base64
    // screenshot it retains — hung forever.
    this.rejectPendingSubmission?.(new Error("Annotator destroyed during submission"));
    this.popup.destroy();
  }
}

import type { SitepingConfig } from "@siteping/core";
import { parseSvg, setText } from "./dom-utils.js";
import type { EventBus, WidgetEvents } from "./events.js";
import type { TFunction, Translations } from "./i18n/index.js";
import { ICON_CLOSE, ICON_EDIT, ICON_EYE, ICON_EYE_OFF, ICON_LIST, ICON_SITEPING } from "./icons.js";

/** Closed set of radial menu item ids — keeps the label lookup exhaustive. */
type RadialItemId = "chat" | "annotate" | "toggle-annotations";

interface RadialItem {
  id: RadialItemId;
  icon: string;
  iconAlt?: string;
}

const ITEM_GAP = 54;

// Stable mapping between radial item ids and their translation keys. The
// label is fully derived from this map via `t()`, so the constructor and
// `applyLabels()` share one source of truth for which node gets which string.
const ITEM_LABEL_KEYS: Record<RadialItemId, keyof Translations> = {
  chat: "fab.messages",
  annotate: "fab.annotate",
  "toggle-annotations": "fab.annotations",
};

/**
 * Floating Action Button with radial menu and notification badge.
 *
 * Glassmorphism: gradient background, glow shadow, glass radial items.
 * Badge shows unresolved feedback count.
 */
export class Fab {
  private root: HTMLElement;
  private fab: HTMLButtonElement;
  private radialContainer: HTMLElement;
  private badgeEl: HTMLElement | null = null;
  private isOpen = false;
  private annotationsVisible = true;
  private items: RadialItem[];

  constructor(
    shadowRoot: ShadowRoot,
    config: SitepingConfig,
    private readonly bus: EventBus<WidgetEvents>,
    private readonly t: TFunction,
  ) {
    const position = config.position ?? "bottom-right";
    const isRight = position === "bottom-right";

    // Vertical stack above the FAB. Icons:
    // - list  → opens the feedback sidebar (panel of feedbacks).
    // - edit  → creates a new annotation (the action).
    // - eye   → toggles marker visibility on the page (state).
    // The marker-visibility toggle is opt-out via `config.showAnnotationsToggle`:
    // default `true` preserves historical behavior, `false` removes the item from
    // the menu entirely (no DOM, no keyboard slot, no click handler).
    this.items = [
      { id: "chat", icon: ICON_LIST },
      { id: "annotate", icon: ICON_EDIT },
    ];
    if (config.showAnnotationsToggle !== false) {
      this.items.push({ id: "toggle-annotations", icon: ICON_EYE, iconAlt: ICON_EYE_OFF });
    }

    // FAB button — needs position:relative for badge positioning
    this.fab = document.createElement("button");
    this.fab.className = `sp-fab sp-fab--${position} sp-anim-fab-in`;
    this.fab.style.position = "fixed"; // ensure fixed even with relative children
    this.fab.appendChild(parseSvg(ICON_SITEPING));
    this.fab.setAttribute("aria-expanded", "false");
    this.fab.addEventListener("click", () => this.toggle());

    // Radial container
    this.radialContainer = document.createElement("div");
    this.radialContainer.className = `sp-radial sp-radial--${position}`;
    this.radialContainer.setAttribute("role", "menu");

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (!item) continue;
      const btn = document.createElement("button");
      btn.className = "sp-radial-item";
      btn.style.setProperty("--sp-i", String(i));
      btn.appendChild(parseSvg(item.icon));
      btn.setAttribute("role", "menuitem");
      btn.dataset.itemId = item.id;

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.handleItemClick(item.id);
      });

      const label = document.createElement("span");
      label.className = "sp-radial-label";
      label.style.cssText = isRight
        ? "position:absolute; right:54px; top:50%; transform:translateY(-50%); white-space:nowrap;"
        : "position:absolute; left:54px; top:50%; transform:translateY(-50%); white-space:nowrap;";
      btn.appendChild(label);

      this.radialContainer.appendChild(btn);
    }

    this.root = document.createElement("div");
    this.root.appendChild(this.radialContainer);
    this.root.appendChild(this.fab);
    shadowRoot.appendChild(this.root);

    // Bind every `t()`-derived string into the freshly-built DOM. Kept as a
    // single pass so the constructor and `refreshLabels()` never drift.
    this.applyLabels();

    // Close radial menu on click outside.
    const host = shadowRoot.host;
    this.onDocumentClick = (e: MouseEvent) => {
      if (this.isOpen && !e.composedPath().includes(host)) {
        this.close();
      }
    };
    document.addEventListener("click", this.onDocumentClick);

    // Escape on FAB or menu container closes the menu
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && this.isOpen) {
        e.stopPropagation();
        this.close();
      }
    };
    this.fab.addEventListener("keydown", handleEscape);
    this.radialContainer.addEventListener("keydown", handleEscape);

    // Arrow key navigation within the radial menu
    this.radialContainer.addEventListener("keydown", (e) => {
      const items = Array.from(this.radialContainer.querySelectorAll<HTMLButtonElement>(".sp-radial-item"));
      if (items.length === 0 || !this.isOpen) return;
      const activeEl = (shadowRoot.activeElement ?? document.activeElement) as HTMLElement;
      const currentIndex = items.indexOf(activeEl as HTMLButtonElement);

      switch (e.key) {
        case "ArrowUp": {
          e.preventDefault();
          const nextIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
          items[nextIndex]?.focus();
          break;
        }
        case "ArrowDown": {
          e.preventDefault();
          const nextIndex = currentIndex >= items.length - 1 ? 0 : currentIndex + 1;
          items[nextIndex]?.focus();
          break;
        }
        case "Home": {
          e.preventDefault();
          items[0]?.focus();
          break;
        }
        case "End": {
          e.preventDefault();
          items[items.length - 1]?.focus();
          break;
        }
      }
    });
  }

  private onDocumentClick: (e: MouseEvent) => void;

  /**
   * Re-read every `t(...)`-derived label and aria-label from the active
   * translation function. Idempotent — call after the locale dictionary has
   * finished loading so the FAB labels swap from the English fallback to the
   * configured language.
   */
  refreshLabels(): void {
    this.applyLabels();
  }

  /**
   * Walk the already-built DOM and bind every translation-derived string —
   * the FAB `aria-label`, each radial item's `aria-label`, and each
   * `.sp-radial-label` `textContent`. The single source of truth for which
   * node gets which `t()` string, shared by the constructor and
   * `refreshLabels()` so the two can never drift.
   */
  private applyLabels(): void {
    this.fab.setAttribute("aria-label", this.t("fab.aria"));

    const buttons = this.radialContainer.querySelectorAll<HTMLButtonElement>(".sp-radial-item");
    for (const btn of buttons) {
      const id = btn.dataset.itemId as RadialItemId | undefined;
      if (!id) continue;
      const key = ITEM_LABEL_KEYS[id];
      if (!key) continue;
      const label = this.t(key);
      btn.setAttribute("aria-label", label);
      const labelSpan = btn.querySelector<HTMLSpanElement>(".sp-radial-label");
      if (labelSpan) setText(labelSpan, label);
    }
  }

  /** Update the badge count. Pass 0 to hide. */
  updateBadge(count: number): void {
    if (count <= 0) {
      this.badgeEl?.remove();
      this.badgeEl = null;
      return;
    }

    if (!this.badgeEl) {
      this.badgeEl = document.createElement("span");
      this.badgeEl.className = "sp-fab-badge";
      this.badgeEl.setAttribute("role", "status");
      this.badgeEl.setAttribute("aria-live", "polite");
      this.fab.appendChild(this.badgeEl);
    }

    const displayText = count > 99 ? "99+" : String(count);
    setText(this.badgeEl, displayText);
    this.badgeEl.setAttribute("aria-label", this.t("fab.badge").replace("{count}", String(count)));
  }

  private toggle(): void {
    this.isOpen ? this.close() : this.open();
  }

  private open(): void {
    this.isOpen = true;
    this.setFabIcon(ICON_CLOSE);
    this.fab.setAttribute("aria-expanded", "true");

    const buttons = this.radialContainer.querySelectorAll<HTMLButtonElement>(".sp-radial-item");
    buttons.forEach((btn, i) => {
      // Stack vertically above the FAB with initial offset + gap
      const y = -(16 + ITEM_GAP * (i + 1));
      btn.style.transform = `translate(0px, ${y}px) scale(1)`;
      btn.classList.add("sp-radial-item--open");
    });

    // Focus the first menu item after animation
    requestAnimationFrame(() => {
      const firstItem = this.radialContainer.querySelector<HTMLButtonElement>(".sp-radial-item");
      firstItem?.focus();
    });
  }

  private close(): void {
    this.isOpen = false;
    this.setFabIcon(ICON_SITEPING);
    this.fab.setAttribute("aria-expanded", "false");

    const buttons = this.radialContainer.querySelectorAll<HTMLButtonElement>(".sp-radial-item");
    buttons.forEach((btn) => {
      btn.style.transform = "translate(0, 0) scale(0.8)";
      btn.classList.remove("sp-radial-item--open");
    });

    // Return focus to FAB
    this.fab.focus();
  }

  private setFabIcon(svgStr: string): void {
    const badge = this.badgeEl;
    this.fab.replaceChildren(parseSvg(svgStr));
    // Re-append badge after icon swap
    if (badge) this.fab.appendChild(badge);
  }

  private handleItemClick(id: RadialItemId): void {
    this.close();

    switch (id) {
      case "chat":
        this.bus.emit("panel:toggle", true);
        break;
      case "annotate":
        this.bus.emit("annotation:start");
        break;
      case "toggle-annotations": {
        this.annotationsVisible = !this.annotationsVisible;
        this.bus.emit("annotations:toggle", this.annotationsVisible);
        // Replace ONLY the icon SVG, not every child. The button also carries
        // the `<span class="sp-radial-label">` hover label — `replaceChildren`
        // wiped it on the first click, killing the tooltip until reload.
        const btn = this.radialContainer.querySelector('[data-item-id="toggle-annotations"]');
        const oldSvg = btn?.querySelector("svg");
        if (oldSvg) {
          const newSvg = parseSvg(this.annotationsVisible ? ICON_EYE : ICON_EYE_OFF);
          oldSvg.replaceWith(newSvg);
        }
        break;
      }
    }
  }

  destroy(): void {
    document.removeEventListener("click", this.onDocumentClick);
    this.root.remove();
  }
}

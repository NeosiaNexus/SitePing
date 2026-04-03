import type { SitepingConfig } from "@siteping/core";
import { parseSvg, setText } from "./dom-utils.js";
import type { EventBus, WidgetEvents } from "./events.js";
import { ICON_ANNOTATE, ICON_CHAT, ICON_CLOSE, ICON_EYE, ICON_EYE_OFF, ICON_SITEPING } from "./icons.js";

interface RadialItem {
  id: string;
  icon: string;
  iconAlt?: string;
  label: string;
}

const ITEM_GAP = 54;

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
  ) {
    const position = config.position ?? "bottom-right";
    const isRight = position === "bottom-right";

    // Vertical stack above the FAB
    this.items = [
      { id: "chat", icon: ICON_CHAT, label: "Messages" },
      { id: "annotate", icon: ICON_ANNOTATE, label: "Annoter" },
      { id: "toggle-annotations", icon: ICON_EYE, iconAlt: ICON_EYE_OFF, label: "Annotations" },
    ];

    // FAB button — needs position:relative for badge positioning
    this.fab = document.createElement("button");
    this.fab.className = `sp-fab sp-fab--${position} sp-anim-fab-in`;
    this.fab.style.position = "fixed"; // ensure fixed even with relative children
    this.fab.appendChild(parseSvg(ICON_SITEPING));
    this.fab.setAttribute("aria-label", "Siteping — Menu feedback");
    this.fab.setAttribute("aria-expanded", "false");
    this.fab.addEventListener("click", () => this.toggle());

    // Radial container
    this.radialContainer = document.createElement("div");
    this.radialContainer.className = `sp-radial sp-radial--${position}`;
    this.radialContainer.setAttribute("role", "menu");

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const btn = document.createElement("button");
      btn.className = "sp-radial-item";
      btn.style.setProperty("--sp-i", String(i));
      btn.appendChild(parseSvg(item.icon));
      btn.setAttribute("role", "menuitem");
      btn.setAttribute("aria-label", item.label);
      btn.dataset.itemId = item.id;

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.handleItemClick(item.id);
      });

      const label = document.createElement("span");
      label.className = "sp-radial-label";
      label.textContent = item.label;
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
          items[nextIndex].focus();
          break;
        }
        case "ArrowDown": {
          e.preventDefault();
          const nextIndex = currentIndex >= items.length - 1 ? 0 : currentIndex + 1;
          items[nextIndex].focus();
          break;
        }
        case "Home": {
          e.preventDefault();
          items[0].focus();
          break;
        }
        case "End": {
          e.preventDefault();
          items[items.length - 1].focus();
          break;
        }
      }
    });
  }

  private onDocumentClick: (e: MouseEvent) => void;

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
      this.fab.appendChild(this.badgeEl);
    }

    setText(this.badgeEl, count > 99 ? "99+" : String(count));
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

  private handleItemClick(id: string): void {
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
        const btn = this.radialContainer.querySelector('[data-item-id="toggle-annotations"]');
        if (btn) {
          btn.replaceChildren(parseSvg(this.annotationsVisible ? ICON_EYE : ICON_EYE_OFF));
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

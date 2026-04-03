import type { FeedbackResponse, FeedbackType } from "@siteping/core";
import type { ApiClient } from "./api-client.js";
import { el, formatRelativeDate, parseSvg, setText } from "./dom-utils.js";
import type { EventBus, WidgetEvents } from "./events.js";
import { getTypeLabel, type TFunction } from "./i18n/index.js";
import { ICON_CHECK, ICON_CLOSE, ICON_SEARCH, ICON_TRASH, ICON_UNDO } from "./icons.js";
import type { MarkerManager } from "./markers.js";
import { getTypeBgColor, getTypeColor, type ThemeColors } from "./styles/theme.js";

/**
 * Side panel (400px) with feedback history, filters, and search.
 *
 * Lives inside the Shadow DOM.
 * Glassmorphism: glass background, staggered card animations,
 * loading states, resolve feedback with disabled state.
 */
export class Panel {
  private root: HTMLElement;
  private listContainer: HTMLElement;
  private searchInput: HTMLInputElement;
  private closeBtn: HTMLButtonElement;
  private deleteAllBtn: HTMLButtonElement;
  private activeFilters = new Set<string>(["all"]);
  private feedbacks: FeedbackResponse[] = [];
  private isOpen = false;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    shadowRoot: ShadowRoot,
    private readonly colors: ThemeColors,
    private readonly bus: EventBus<WidgetEvents>,
    private readonly apiClient: ApiClient,
    private readonly projectName: string,
    private readonly markers: MarkerManager,
    private readonly t: TFunction,
    private readonly locale: string,
  ) {
    this.root = el("div", { class: "sp-panel" });
    this.root.setAttribute("role", "complementary");
    this.root.setAttribute("aria-label", "Siteping feedback panel");
    this.root.setAttribute("aria-hidden", "true");

    // Header
    const header = el("div", { class: "sp-panel-header" });
    const title = el("span", { class: "sp-panel-title" });
    setText(title, this.t("panel.title"));

    this.closeBtn = document.createElement("button");
    this.closeBtn.className = "sp-panel-close";
    this.closeBtn.setAttribute("aria-label", this.t("panel.close"));
    this.closeBtn.appendChild(parseSvg(ICON_CLOSE));
    this.closeBtn.addEventListener("click", () => this.close());

    this.deleteAllBtn = document.createElement("button");
    this.deleteAllBtn.className = "sp-btn-delete-all";
    this.deleteAllBtn.setAttribute("aria-label", this.t("panel.deleteAll"));
    this.deleteAllBtn.appendChild(parseSvg(ICON_TRASH));
    const deleteAllLabel = document.createElement("span");
    setText(deleteAllLabel, ` ${this.t("panel.deleteAll")}`);
    this.deleteAllBtn.appendChild(deleteAllLabel);
    this.deleteAllBtn.addEventListener("click", () => this.confirmDeleteAll());

    const headerRight = el("div", { class: "sp-panel-header-right" });
    headerRight.appendChild(this.deleteAllBtn);
    headerRight.appendChild(this.closeBtn);

    header.appendChild(title);
    header.appendChild(headerRight);

    // Filters
    const filters = el("div", { class: "sp-filters" });

    // Search
    const searchWrap = el("div", { class: "sp-search-wrap" });
    const searchIcon = parseSvg(ICON_SEARCH);
    searchIcon.setAttribute("class", "sp-search-icon");
    this.searchInput = document.createElement("input");
    this.searchInput.type = "text";
    this.searchInput.className = "sp-search";
    this.searchInput.placeholder = this.t("panel.search");
    this.searchInput.setAttribute("aria-label", this.t("panel.searchAria"));
    this.searchInput.addEventListener("input", () => {
      if (this.searchTimeout) clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => this.loadFeedbacks().catch(() => {}), 200);
    });
    searchWrap.appendChild(searchIcon);
    searchWrap.appendChild(this.searchInput);

    // Chips
    const chips = el("div", { class: "sp-chips" });
    const chipOptions = [
      { value: "all", label: this.t("panel.filterAll") },
      { value: "question", label: this.t("type.question") },
      { value: "change", label: this.t("type.change") },
      { value: "bug", label: this.t("type.bug") },
      { value: "other", label: this.t("type.other") },
    ];

    for (const option of chipOptions) {
      const chip = document.createElement("button");
      chip.className = `sp-chip ${option.value === "all" ? "sp-chip--active" : ""}`;
      if (option.value !== "all") {
        chip.style.borderColor = getTypeColor(option.value, this.colors);
      }
      setText(chip, option.label);
      chip.dataset.filter = option.value;
      chip.setAttribute("aria-pressed", option.value === "all" ? "true" : "false");
      chip.addEventListener("click", () => this.toggleFilter(option.value, chips));
      chips.appendChild(chip);
    }

    filters.appendChild(searchWrap);
    filters.appendChild(chips);

    // List
    this.listContainer = el("div", { class: "sp-list" });
    this.listContainer.setAttribute("role", "list");
    this.listContainer.setAttribute("aria-label", "Liste des feedbacks");

    this.root.appendChild(header);
    this.root.appendChild(filters);
    this.root.appendChild(this.listContainer);
    shadowRoot.appendChild(this.root);

    // Events
    this.bus.on("panel:toggle", (open) => {
      open ? this.open() : this.close();
    });

    // Escape to close
    shadowRoot.addEventListener("keydown", (e) => {
      if ((e as KeyboardEvent).key === "Escape" && this.isOpen) this.close();
    });

    // Listen for marker clicks
    this.onMarkerClick = ((e: CustomEvent) => {
      this.scrollToFeedback(e.detail.feedbackId);
    }) as EventListener;
    document.addEventListener("sp-marker-click", this.onMarkerClick);
  }

  private onMarkerClick: EventListener;

  async open(): Promise<void> {
    if (this.isOpen) return;
    this.isOpen = true;
    this.root.classList.add("sp-panel--open");
    this.root.setAttribute("aria-hidden", "false");
    this.bus.emit("open");
    await this.loadFeedbacks();
    // Move focus into the panel (search input or close button)
    requestAnimationFrame(() => {
      if (this.searchInput) {
        this.searchInput.focus();
      } else {
        this.closeBtn.focus();
      }
    });
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.root.classList.remove("sp-panel--open");
    this.root.setAttribute("aria-hidden", "true");
    this.bus.emit("close");
    // Restore focus to the FAB
    const fab = (this.root.getRootNode() as ShadowRoot).querySelector<HTMLButtonElement>(".sp-fab");
    fab?.focus();
  }

  private showLoading(): void {
    this.listContainer.replaceChildren();
    const loading = el("div", { class: "sp-loading" });
    loading.setAttribute("role", "status");
    loading.setAttribute("aria-live", "polite");
    loading.setAttribute("aria-label", "Chargement des feedbacks");
    const spinner = el("div", { class: "sp-spinner" });
    loading.appendChild(spinner);
    this.listContainer.appendChild(loading);
  }

  private showError(): void {
    this.listContainer.replaceChildren();
    const empty = el("div", { class: "sp-empty" });
    empty.setAttribute("role", "status");
    empty.setAttribute("aria-live", "polite");
    const text = el("div", { class: "sp-empty-text" });
    setText(text, this.t("panel.loadError"));
    const retryBtn = document.createElement("button");
    retryBtn.className = "sp-btn-ghost";
    retryBtn.style.marginTop = "8px";
    setText(retryBtn, this.t("panel.retry"));
    retryBtn.addEventListener("click", () => this.loadFeedbacks().catch(() => {}));
    empty.appendChild(text);
    empty.appendChild(retryBtn);
    this.listContainer.appendChild(empty);
  }

  private async loadFeedbacks(): Promise<void> {
    const search = this.searchInput.value.trim() || undefined;
    const typeFilter = this.activeFilters.has("all") ? undefined : (Array.from(this.activeFilters)[0] as FeedbackType);

    const options: { limit: number; type?: FeedbackType; search?: string } = { limit: 50 };
    if (typeFilter) options.type = typeFilter;
    if (search) options.search = search;

    // Only show spinner on first load (empty list) — otherwise keep current content visible
    const hasContent = this.feedbacks.length > 0;
    if (!hasContent) this.showLoading();

    try {
      const { feedbacks } = await this.apiClient.getFeedbacks(this.projectName, options);
      this.feedbacks = feedbacks;
      this.renderList();
      this.markers.render(feedbacks);
    } catch (error) {
      if (!hasContent) this.showError();
      this.bus.emit("feedback:error", error instanceof Error ? error : new Error(String(error)));
    }
  }

  private renderList(): void {
    this.listContainer.replaceChildren();

    if (this.feedbacks.length === 0) {
      const empty = el("div", { class: "sp-empty" });
      empty.setAttribute("role", "status");
      empty.setAttribute("aria-live", "polite");
      const emptyText = el("div", { class: "sp-empty-text" });
      setText(emptyText, this.t("panel.empty"));
      empty.appendChild(emptyText);
      this.listContainer.appendChild(empty);
      return;
    }

    this.feedbacks.forEach((feedback, index) => {
      const card = this.createCard(feedback, index + 1);
      // Stagger animation via CSS custom property
      card.style.setProperty("--sp-card-i", String(index));
      this.listContainer.appendChild(card);
    });
  }

  private createCard(feedback: FeedbackResponse, number: number): HTMLElement {
    const isResolved = feedback.status === "resolved";
    const typeColor = getTypeColor(feedback.type, this.colors);

    const card = el("div", {
      class: `sp-card ${isResolved ? "sp-card--resolved" : ""}`,
    });
    card.setAttribute("role", "listitem");
    card.setAttribute("tabindex", "0");
    card.setAttribute(
      "aria-label",
      `Feedback #${number}: ${TYPE_LABELS[feedback.type] ?? feedback.type} — ${feedback.message.slice(0, 80)}`,
    );
    card.dataset.feedbackId = feedback.id;

    // Color bar
    const bar = el("div", { class: "sp-card-bar" });
    bar.style.background = isResolved ? "#9ca3af" : typeColor;

    // Body
    const body = el("div", { class: "sp-card-body" });

    // Header: #number + badge + date
    const header = el("div", { class: "sp-card-header" });

    const num = el("span", { class: "sp-card-number" });
    setText(num, `#${number}`);

    const badge = el("span", { class: "sp-badge" });
    const typeBg = getTypeBgColor(feedback.type, this.colors);
    badge.style.background = typeBg;
    badge.style.color = typeColor;
    setText(badge, getTypeLabel(feedback.type, this.t));

    const date = el("span", { class: "sp-card-date" });
    setText(date, formatRelativeDate(feedback.createdAt, this.locale));

    header.appendChild(num);
    header.appendChild(badge);
    header.appendChild(date);

    // Message
    const message = el("div", { class: "sp-card-message" });
    setText(message, feedback.message);

    // Expand button
    const expandBtn = document.createElement("button");
    expandBtn.className = "sp-card-expand";
    setText(expandBtn, this.t("panel.showMore"));
    expandBtn.style.display = "none";
    expandBtn.setAttribute("aria-expanded", "false");
    expandBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isExpanded = message.classList.toggle("sp-card-message--expanded");
      setText(expandBtn, isExpanded ? this.t("panel.showLess") : this.t("panel.showMore"));
      expandBtn.setAttribute("aria-expanded", String(isExpanded));
    });

    // Check if text is clamped (after render)
    requestAnimationFrame(() => {
      if (message.scrollHeight > message.clientHeight) {
        expandBtn.style.display = "block";
      }
    });

    // Footer: resolve button
    const footer = el("div", { class: "sp-card-footer" });

    const resolveBtn = document.createElement("button");
    resolveBtn.className = "sp-btn-resolve";
    if (isResolved) {
      resolveBtn.appendChild(parseSvg(ICON_UNDO));
      const span = document.createElement("span");
      setText(span, ` ${this.t("panel.reopen")}`);
      resolveBtn.appendChild(span);
    } else {
      resolveBtn.appendChild(parseSvg(ICON_CHECK));
      const span = document.createElement("span");
      setText(span, ` ${this.t("panel.resolve")}`);
      resolveBtn.appendChild(span);
    }
    resolveBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await this.toggleResolve(feedback, resolveBtn);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "sp-btn-delete";
    deleteBtn.appendChild(parseSvg(ICON_TRASH));
    const deleteLabel = document.createElement("span");
    setText(deleteLabel, ` ${this.t("panel.delete")}`);
    deleteBtn.appendChild(deleteLabel);
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await this.deleteFeedback(feedback, deleteBtn);
    });

    footer.appendChild(resolveBtn);
    footer.appendChild(deleteBtn);

    body.appendChild(header);
    body.appendChild(message);
    body.appendChild(expandBtn);
    body.appendChild(footer);

    card.appendChild(bar);
    card.appendChild(body);

    // Hover: highlight corresponding marker
    card.addEventListener("mouseenter", () => {
      this.markers.highlight(feedback.id);
    });

    // Click: scroll page to annotation + show highlight
    const activateCard = () => {
      if (feedback.annotations.length > 0) {
        const ann = feedback.annotations[0];
        window.scrollTo({ left: ann.scrollX, top: ann.scrollY, behavior: "smooth" });
        this.markers.pinHighlight(feedback);
      }
    };
    card.addEventListener("click", activateCard);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activateCard();
      }
    });

    return card;
  }

  private async deleteFeedback(feedback: FeedbackResponse, btn: HTMLButtonElement): Promise<void> {
    btn.disabled = true;
    try {
      await this.apiClient.deleteFeedback(feedback.id);
      this.bus.emit("feedback:deleted", feedback.id);
      await this.loadFeedbacks();
    } catch (error) {
      btn.disabled = false;
      this.bus.emit("feedback:error", error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async confirmDeleteAll(): Promise<void> {
    const confirmed = await this.showConfirmDialog(
      this.t("panel.deleteAllConfirmTitle"),
      this.t("panel.deleteAllConfirmMessage"),
    );
    if (!confirmed) return;

    this.deleteAllBtn.disabled = true;
    try {
      await this.apiClient.deleteAllFeedbacks(this.projectName);
      this.bus.emit("feedback:all-deleted");
      await this.loadFeedbacks();
    } catch (error) {
      this.bus.emit("feedback:error", error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.deleteAllBtn.disabled = false;
    }
  }

  private showConfirmDialog(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const backdrop = el("div", { class: "sp-confirm-backdrop" });

      const titleId = `sp-confirm-title-${Date.now()}`;
      const messageId = `sp-confirm-msg-${Date.now()}`;

      const dialog = el("div", { class: "sp-confirm-dialog" });
      dialog.setAttribute("role", "alertdialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.setAttribute("aria-labelledby", titleId);
      dialog.setAttribute("aria-describedby", messageId);

      const titleEl = el("div", { class: "sp-confirm-title" });
      titleEl.id = titleId;
      setText(titleEl, title);

      const messageEl = el("div", { class: "sp-confirm-message" });
      messageEl.id = messageId;
      setText(messageEl, message);

      const btnRow = el("div", { class: "sp-confirm-actions" });

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "sp-btn-ghost";
      setText(cancelBtn, this.t("panel.cancel"));

      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.className = "sp-btn-danger";
      setText(confirmBtn, this.t("panel.confirmDelete"));

      let closed = false;
      const close = (result: boolean) => {
        if (closed) return;
        closed = true;
        backdrop.removeEventListener("keydown", onKeydown);
        backdrop.style.opacity = "0";
        dialog.style.transform = "translateY(8px) scale(0.97)";
        setTimeout(() => {
          backdrop.remove();
          resolve(result);
        }, 200);
      };

      // Focus trap: Tab cycles between cancel and confirm
      const onKeydown = (e: Event) => {
        const ke = e as KeyboardEvent;
        if (ke.key === "Escape") {
          close(false);
          return;
        }
        if (ke.key === "Tab") {
          ke.preventDefault();
          const active = (backdrop.getRootNode() as ShadowRoot).activeElement;
          if (active === cancelBtn) {
            confirmBtn.focus();
          } else {
            cancelBtn.focus();
          }
        }
      };
      backdrop.addEventListener("keydown", onKeydown);

      cancelBtn.addEventListener("click", () => close(false));
      confirmBtn.addEventListener("click", () => close(true));
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) close(false);
      });

      btnRow.appendChild(cancelBtn);
      btnRow.appendChild(confirmBtn);
      dialog.appendChild(titleEl);
      dialog.appendChild(messageEl);
      dialog.appendChild(btnRow);
      backdrop.appendChild(dialog);

      this.root.getRootNode() instanceof ShadowRoot
        ? (this.root.getRootNode() as ShadowRoot).appendChild(backdrop)
        : this.root.appendChild(backdrop);

      requestAnimationFrame(() => {
        backdrop.style.opacity = "1";
        dialog.style.transform = "translateY(0) scale(1)";
        cancelBtn.focus();
      });
    });
  }

  private async toggleResolve(feedback: FeedbackResponse, btn: HTMLButtonElement): Promise<void> {
    // Disable button during async operation
    btn.disabled = true;
    try {
      const newResolved = feedback.status !== "resolved";
      await this.apiClient.resolveFeedback(feedback.id, newResolved);
      await this.loadFeedbacks();
    } catch (error) {
      btn.disabled = false;
      this.bus.emit("feedback:error", error instanceof Error ? error : new Error(String(error)));
    }
  }

  private toggleFilter(value: string, container: HTMLElement): void {
    // Single-select: only one filter active at a time
    this.activeFilters.clear();
    this.activeFilters.add(value);

    // Update chip styles
    const chips = container.querySelectorAll<HTMLButtonElement>(".sp-chip");
    for (const chip of chips) {
      const isActive = this.activeFilters.has(chip.dataset.filter ?? "");
      chip.classList.toggle("sp-chip--active", isActive);
      chip.setAttribute("aria-pressed", String(isActive));
    }

    this.loadFeedbacks().catch(() => {});
  }

  scrollToFeedback(feedbackId: string): void {
    const escapedId = CSS.escape(feedbackId);
    const card = this.listContainer.querySelector<HTMLElement>(`[data-feedback-id="${escapedId}"]`);
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      card.classList.add("sp-anim-flash");
      card.addEventListener(
        "animationend",
        () => {
          card.classList.remove("sp-anim-flash");
        },
        { once: true },
      );
    }
  }

  /** Refresh the panel after a new feedback is submitted */
  async refresh(): Promise<void> {
    if (this.isOpen) {
      await this.loadFeedbacks();
    }
  }

  destroy(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    document.removeEventListener("sp-marker-click", this.onMarkerClick);
    this.root.remove();
  }
}

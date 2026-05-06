import type { FeedbackResponse, FeedbackStatus, FeedbackType } from "@siteping/core";
import type { WidgetClient } from "./api-client.js";
import { PAGE_SIZE } from "./constants.js";
import { el, formatRelativeDate, parseSvg, setText } from "./dom-utils.js";
import type { EventBus, WidgetEvents } from "./events.js";
import { EXPORT_I18N_FR, ExportButton } from "./export-utils.js";
import { getTypeLabel, type TFunction } from "./i18n/index.js";
import {
  ICON_BUG,
  ICON_CHANGE,
  ICON_CHECK,
  ICON_CHEVRON_DOWN,
  ICON_CLOSE,
  ICON_DOT_OPEN,
  ICON_LAYERS,
  ICON_OTHER,
  ICON_QUESTION,
  ICON_SEARCH,
  ICON_TRASH,
  ICON_UNDO,
} from "./icons.js";
import type { MarkerManager } from "./markers.js";
import { BULK_I18N_EN, BULK_I18N_FR, BulkActions } from "./panel-bulk.js";
import { DetailView } from "./panel-detail.js";
import { createPageGroupHeader, groupFeedbacksByPage, PanelSortControls, sortFeedbacks } from "./panel-sort.js";
import { PanelStats } from "./panel-stats.js";
import {
  focusCardByIndex,
  getFocusedCardIndex,
  KeyboardShortcuts,
  SHORTCUTS_I18N_EN,
  SHORTCUTS_I18N_FR,
} from "./shortcuts.js";
import { getTypeBgColor, getTypeColor, type ThemeColors } from "./styles/theme.js";

/**
 * Side panel (400px) with feedback history, filters, search, stats,
 * sort/group, bulk actions, export, detail view, and keyboard shortcuts.
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
  private activeStatusFilter: "all" | FeedbackStatus = "all";
  private typeDropdownBtn!: HTMLButtonElement;
  private typeDropdownContainer!: HTMLElement;
  private typeDropdownMenu: HTMLElement | null = null;
  private typeDropdownOutsideHandler: ((e: MouseEvent) => void) | null = null;
  private statusSegmented!: HTMLElement;
  private typeOptions!: ReadonlyArray<{ value: string; label: string; icon: string; color: string; bg: string }>;
  private statusOptions!: ReadonlyArray<{
    value: "all" | FeedbackStatus;
    label: string;
    icon: string;
    color: string;
    bg: string;
  }>;
  private feedbacks: FeedbackResponse[] = [];
  private currentPage = 1;
  private totalFeedbacks = 0;
  private isLoadingMore = false;
  private isOpen = false;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  private loadController: AbortController | null = null;
  /** Tracks feedback IDs with in-flight mutations to prevent spam-click race conditions */
  private pendingMutations = new Set<string>();

  // New feature modules
  private readonly stats: PanelStats;
  private readonly sortControls: PanelSortControls;
  private readonly bulk: BulkActions;
  private readonly exportBtn: ExportButton;
  private readonly shortcuts: KeyboardShortcuts;
  private readonly detail: DetailView;
  private readonly shadowRoot: ShadowRoot;

  // i18n helpers
  private readonly bulkI18n: typeof BULK_I18N_EN;

  constructor(
    shadowRoot: ShadowRoot,
    private readonly colors: ThemeColors,
    private readonly bus: EventBus<WidgetEvents>,
    private readonly client: WidgetClient,
    private readonly projectName: string,
    private readonly markers: MarkerManager,
    private readonly t: TFunction,
    private readonly locale: string,
  ) {
    this.shadowRoot = shadowRoot;
    this.bulkI18n = locale === "fr" ? BULK_I18N_FR : BULK_I18N_EN;

    this.root = el("div", { class: "sp-panel" });
    this.root.setAttribute("role", "complementary");
    this.root.setAttribute("aria-label", this.t("panel.ariaLabel"));
    this.root.setAttribute("aria-hidden", "true");

    // --- Header ---
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

    // Export button
    this.exportBtn = new ExportButton(colors, () => this.feedbacks);
    if (locale === "fr") this.exportBtn.setLabels(EXPORT_I18N_FR);

    const headerRight = el("div", { class: "sp-panel-header-right" });
    headerRight.appendChild(this.exportBtn.element);
    headerRight.appendChild(this.deleteAllBtn);
    headerRight.appendChild(this.closeBtn);

    header.appendChild(title);
    header.appendChild(headerRight);

    // --- Stats ---
    this.stats = new PanelStats(colors, locale);

    // --- Filters ---
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

    // Filter bar (type dropdown + status segmented control)
    const filterBar = el("div", { class: "sp-filter-bar" });
    filterBar.appendChild(this.buildTypeDropdown());
    filterBar.appendChild(this.buildStatusSegmented());

    // Sort controls
    this.sortControls = new PanelSortControls(colors, () => this.renderList(), locale);

    filters.appendChild(searchWrap);
    filters.appendChild(filterBar);
    filters.appendChild(this.sortControls.element);

    // --- List ---
    this.listContainer = el("div", { class: "sp-list" });
    this.listContainer.setAttribute("role", "list");
    this.listContainer.setAttribute("aria-label", this.t("panel.feedbackList"));

    // --- Bulk Actions ---
    this.bulk = new BulkActions(
      colors,
      {
        onResolve: (ids) => this.bulkResolve(ids),
        onDelete: (ids) => this.bulkDelete(ids),
      },
      locale,
    );
    this.bulk.setListContainer(this.listContainer);

    // --- Detail View ---
    this.detail = new DetailView(
      colors,
      {
        onBack: () => this.detail.hide(),
        onResolve: async (fb) => {
          const newResolved = fb.status !== "resolved";
          await this.client.resolveFeedback(fb.id, newResolved);
          await this.loadFeedbacks();
          this.detail.hide();
        },
        onDelete: async (fb) => {
          await this.client.deleteFeedback(fb.id);
          this.bus.emit("feedback:deleted", fb.id);
          await this.loadFeedbacks();
          this.detail.hide();
        },
        onGoToAnnotation: (fb) => {
          if (fb.annotations.length > 0) {
            const ann = fb.annotations[0];
            if (!ann) return;
            window.scrollTo({ left: ann.scrollX, top: ann.scrollY, behavior: "smooth" });
            this.markers.pinHighlight(fb);
          }
        },
      },
      locale,
    );

    // --- Keyboard Shortcuts ---
    const shortcutsI18n = (locale === "fr" ? SHORTCUTS_I18N_FR : SHORTCUTS_I18N_EN) as typeof SHORTCUTS_I18N_EN;
    this.shortcuts = new KeyboardShortcuts(
      colors,
      {
        onNavigate: (dir) => {
          const idx = getFocusedCardIndex(this.listContainer);
          focusCardByIndex(this.listContainer, dir === "down" ? idx + 1 : idx - 1);
        },
        onResolve: () => {
          const fb = this.getFocusedFeedback();
          if (fb && !this.pendingMutations.has(fb.id)) {
            const card = this.listContainer.querySelector<HTMLElement>(`[data-feedback-id="${CSS.escape(fb.id)}"]`);
            const btn = card?.querySelector<HTMLButtonElement>('[data-action="resolve"]');
            if (btn) this.toggleResolve(fb, btn).catch(() => {});
          }
        },
        onDelete: () => {
          const fb = this.getFocusedFeedback();
          if (fb && !this.pendingMutations.has(fb.id)) {
            const card = this.listContainer.querySelector<HTMLElement>(`[data-feedback-id="${CSS.escape(fb.id)}"]`);
            const btn = card?.querySelector<HTMLButtonElement>('[data-action="delete"]');
            if (btn) this.deleteFeedback(fb, btn).catch(() => {});
          }
        },
        onFocusSearch: () => this.searchInput.focus(),
        onToggleSelect: () => {
          const fb = this.getFocusedFeedback();
          if (fb) this.bulk.toggle(fb.id);
        },
      },
      shortcutsI18n,
    );

    // --- Assemble DOM ---
    this.root.appendChild(header);
    this.root.appendChild(this.stats.element);
    this.root.appendChild(filters);
    this.root.appendChild(this.listContainer);
    this.root.appendChild(this.bulk.barElement);
    this.root.appendChild(this.detail.element);
    this.root.appendChild(this.shortcuts.helpOverlay);
    this.root.appendChild(this.shortcuts.hintButton);
    shadowRoot.appendChild(this.root);

    // --- Event delegation on listContainer ---

    this.onListClick = (e: Event) => {
      const target = e.target as Element;

      // Bulk checkbox clicks are handled by BulkActions, skip
      if (target.closest(".sp-bulk-checkbox")) return;

      // Action buttons (expand, resolve, delete)
      const actionEl = target.closest<HTMLElement>("[data-action]");
      if (actionEl) {
        e.stopPropagation();
        const card = actionEl.closest<HTMLElement>(".sp-card");
        if (!card) return;
        const feedbackId = card.dataset.feedbackId;
        const feedback = this.feedbacks.find((f) => f.id === feedbackId);
        if (!feedback) return;

        const action = actionEl.dataset.action;
        if (action === "expand") {
          const message = card.querySelector<HTMLElement>(".sp-card-message");
          if (!message) return;
          const isExpanded = message.classList.toggle("sp-card-message--expanded");
          setText(actionEl, isExpanded ? this.t("panel.showLess") : this.t("panel.showMore"));
          actionEl.setAttribute("aria-expanded", String(isExpanded));
        } else if (action === "resolve") {
          if (this.pendingMutations.has(feedback.id)) return;
          const btn = actionEl as HTMLButtonElement;
          this.toggleResolve(feedback, btn).catch(() => {});
        } else if (action === "delete") {
          if (this.pendingMutations.has(feedback.id)) return;
          const btn = actionEl as HTMLButtonElement;
          this.deleteFeedback(feedback, btn).catch(() => {});
        }
        return;
      }

      // Card click → open detail view
      const card = target.closest<HTMLElement>(".sp-card");
      if (card) {
        const feedbackId = card.dataset.feedbackId;
        const feedback = this.feedbacks.find((f) => f.id === feedbackId);
        if (feedback) {
          const number = this.feedbacks.indexOf(feedback) + 1;
          this.detail.show(feedback, number);
        }
      }
    };
    this.listContainer.addEventListener("click", this.onListClick);

    this.onListKeydown = (e: Event) => {
      const ke = e as KeyboardEvent;
      if (ke.key !== "Enter" && ke.key !== " ") return;
      const target = ke.target as Element;
      const card = target.closest<HTMLElement>(".sp-card");
      // Only activate if the card itself is focused, not a button inside it
      if (!card || target !== card) return;
      ke.preventDefault();
      const feedbackId = card.dataset.feedbackId;
      const feedback = this.feedbacks.find((f) => f.id === feedbackId);
      if (feedback) {
        const number = this.feedbacks.indexOf(feedback) + 1;
        this.detail.show(feedback, number);
      }
    };
    this.listContainer.addEventListener("keydown", this.onListKeydown);

    // mouseover/mouseout bubble (unlike mouseenter/mouseleave), enabling delegation
    this.onListMouseover = (e: Event) => {
      const target = (e as MouseEvent).target as Element;
      const card = target.closest<HTMLElement>(".sp-card");
      if (!card) return;
      const feedbackId = card.dataset.feedbackId;
      if (feedbackId) this.markers.highlight(feedbackId);
    };
    this.listContainer.addEventListener("mouseover", this.onListMouseover);

    this.onListMouseout = (e: Event) => {
      const target = (e as MouseEvent).relatedTarget as Element | null;
      // Only clear highlight when leaving all cards (relatedTarget is outside listContainer)
      if (target && this.listContainer.contains(target)) return;
      this.markers.highlight("");
    };
    this.listContainer.addEventListener("mouseout", this.onListMouseout);

    // Events
    this.bus.on("panel:toggle", (open) => {
      open ? this.open() : this.close();
    });

    // Keyboard handling: Escape to close + focus trap
    shadowRoot.addEventListener("keydown", (e) => {
      const ke = e as KeyboardEvent;
      if (ke.key === "Escape" && this.isOpen) {
        // If detail view is open, close it instead
        if (this.detail.isVisible) {
          this.detail.hide();
          return;
        }
        this.close();
        return;
      }
      if (ke.key === "Tab" && this.isOpen) {
        const focusable = this.root.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        const active = (shadowRoot as ShadowRoot).activeElement;
        if (ke.shiftKey && active === first) {
          ke.preventDefault();
          last.focus();
        } else if (!ke.shiftKey && active === last) {
          ke.preventDefault();
          first.focus();
        }
      }
    });

    // Listen for marker clicks
    this.onMarkerClick = ((e: CustomEvent) => {
      this.scrollToFeedback(e.detail.feedbackId);
    }) as EventListener;
    document.addEventListener("sp-marker-click", this.onMarkerClick);
  }

  private onMarkerClick: EventListener;
  private onListClick: (e: Event) => void;
  private onListKeydown: (e: Event) => void;
  private onListMouseover: (e: Event) => void;
  private onListMouseout: (e: Event) => void;

  async open(): Promise<void> {
    if (this.isOpen) return;
    this.isOpen = true;
    this.root.classList.add("sp-panel--open");
    this.root.setAttribute("aria-hidden", "false");
    this.bus.emit("open");
    this.shortcuts.enable(this.shadowRoot);
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
    this.shortcuts.disable();
    this.detail.hide();
    // Restore focus to the FAB
    const fab = (this.root.getRootNode() as ShadowRoot).querySelector<HTMLButtonElement>(".sp-fab");
    fab?.focus();
  }

  private showLoading(): void {
    this.listContainer.replaceChildren();
    const loading = el("div", { class: "sp-loading" });
    loading.setAttribute("role", "status");
    loading.setAttribute("aria-live", "polite");
    loading.setAttribute("aria-label", this.t("panel.loading"));
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
    // Cancel any in-flight request to prevent stale responses from overwriting newer results
    this.loadController?.abort();
    this.loadController = new AbortController();
    const { signal } = this.loadController;

    // Reset to page 1 on fresh load (filter/search change)
    this.currentPage = 1;

    const search = this.searchInput.value.trim() || undefined;
    const typeFilter = this.activeFilters.has("all") ? undefined : (Array.from(this.activeFilters)[0] as FeedbackType);
    const statusFilter = this.activeStatusFilter === "all" ? undefined : this.activeStatusFilter;

    const options: { page: number; limit: number; type?: FeedbackType; status?: FeedbackStatus; search?: string } = {
      page: 1,
      limit: PAGE_SIZE,
    };
    if (typeFilter) options.type = typeFilter;
    if (statusFilter) options.status = statusFilter;
    if (search) options.search = search;

    // Only show spinner on first load (empty list) — otherwise keep current content visible
    const hasContent = this.feedbacks.length > 0;
    if (!hasContent) this.showLoading();

    try {
      const { feedbacks, total } = await this.client.getFeedbacks(this.projectName, options);
      if (signal.aborted) return; // Stale response — a newer request superseded this one
      this.feedbacks = feedbacks;
      this.totalFeedbacks = total;
      this.stats.update(feedbacks, total);
      this.bulk.reset();
      this.renderList();
      this.markers.render(feedbacks);
    } catch (error) {
      if (signal.aborted) return; // Expected abort, not a real error
      if (!hasContent) this.showError();
      this.bus.emit("feedback:error", error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async loadMoreFeedbacks(): Promise<void> {
    if (this.isLoadingMore) return;
    this.isLoadingMore = true;

    // Capture current controller — if loadFeedbacks() runs while we're in-flight,
    // it replaces the controller, signaling that our results are stale.
    const controller = this.loadController;

    const nextPage = this.currentPage + 1;
    const search = this.searchInput.value.trim() || undefined;
    const typeFilter = this.activeFilters.has("all") ? undefined : (Array.from(this.activeFilters)[0] as FeedbackType);
    const statusFilter = this.activeStatusFilter === "all" ? undefined : this.activeStatusFilter;

    const options: { page: number; limit: number; type?: FeedbackType; status?: FeedbackStatus; search?: string } = {
      page: nextPage,
      limit: PAGE_SIZE,
    };
    if (typeFilter) options.type = typeFilter;
    if (statusFilter) options.status = statusFilter;
    if (search) options.search = search;

    // Show spinner on the "Load more" button
    const loadMoreBtn = this.listContainer.querySelector<HTMLButtonElement>(".sp-btn-load-more");
    let restoreBtn: (() => void) | undefined;
    if (loadMoreBtn) restoreBtn = this.setButtonLoading(loadMoreBtn);

    try {
      const { feedbacks, total } = await this.client.getFeedbacks(this.projectName, options);
      if (controller !== this.loadController) return; // Filter/search changed — discard stale page
      this.currentPage = nextPage;
      this.totalFeedbacks = total;
      this.feedbacks = [...this.feedbacks, ...feedbacks];
      this.stats.update(this.feedbacks, total);
      this.renderList();
      this.markers.render(this.feedbacks);
    } catch (error) {
      if (restoreBtn) restoreBtn();
      this.bus.emit("feedback:error", error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.isLoadingMore = false;
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

    // Apply sorting
    const sorted = sortFeedbacks(this.feedbacks, this.sortControls.sortMode);

    // Select all bar
    const feedbackIds = sorted.map((f) => f.id);
    const selectAllBar = this.bulk.createSelectAllBar(feedbackIds, this.bulkI18n["bulk.selectAll"]);
    this.listContainer.appendChild(selectAllBar);

    if (this.sortControls.groupByPage) {
      // Group by page rendering
      const groups = groupFeedbacksByPage(sorted);
      let globalIndex = 0;
      for (const [pagePath, groupFeedbacks] of groups) {
        const groupHeader = createPageGroupHeader(pagePath, groupFeedbacks.length, this.colors);
        this.listContainer.appendChild(groupHeader);

        const groupContent = el("div", { class: "sp-group-content" });
        for (const feedback of groupFeedbacks) {
          const card = this.createCard(feedback, globalIndex + 1);
          card.style.setProperty("--sp-card-i", String(globalIndex));
          groupContent.appendChild(card);
          globalIndex++;
        }
        this.listContainer.appendChild(groupContent);
      }
    } else {
      // Flat list rendering
      sorted.forEach((feedback, index) => {
        const card = this.createCard(feedback, index + 1);
        card.style.setProperty("--sp-card-i", String(index));
        this.listContainer.appendChild(card);
      });
    }

    // "Load more" button when there are remaining feedbacks
    const remaining = this.totalFeedbacks - this.feedbacks.length;
    if (remaining > 0) {
      const loadMoreWrap = el("div", { class: "sp-load-more-wrap" });
      const loadMoreBtn = document.createElement("button");
      loadMoreBtn.className = "sp-btn-ghost sp-btn-load-more";
      setText(loadMoreBtn, this.t("panel.loadMore").replace("{remaining}", String(remaining)));
      loadMoreBtn.addEventListener("click", () => this.loadMoreFeedbacks().catch(() => {}));
      loadMoreWrap.appendChild(loadMoreBtn);
      this.listContainer.appendChild(loadMoreWrap);
    }
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
      `Feedback #${number}: ${getTypeLabel(feedback.type, this.t)} — ${feedback.message.slice(0, 80)}`,
    );
    card.dataset.feedbackId = feedback.id;

    // Color bar
    const bar = el("div", { class: "sp-card-bar" });
    bar.style.background = isResolved ? "#9ca3af" : typeColor;

    // Body
    const body = el("div", { class: "sp-card-body" });

    // Header: checkbox + #number + badge + date
    const header = el("div", { class: "sp-card-header" });

    // Bulk checkbox — inline in the header row
    const checkbox = this.bulk.createCheckbox(feedback.id);
    header.appendChild(checkbox);

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
    expandBtn.dataset.action = "expand";
    setText(expandBtn, this.t("panel.showMore"));
    expandBtn.style.display = "none";
    expandBtn.setAttribute("aria-expanded", "false");

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
    resolveBtn.dataset.action = "resolve";
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

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "sp-btn-delete";
    deleteBtn.dataset.action = "delete";
    deleteBtn.appendChild(parseSvg(ICON_TRASH));
    const deleteBtnLabel = document.createElement("span");
    setText(deleteBtnLabel, ` ${this.t("panel.delete")}`);
    deleteBtn.appendChild(deleteBtnLabel);

    footer.appendChild(resolveBtn);
    footer.appendChild(deleteBtn);

    body.appendChild(header);
    body.appendChild(message);
    body.appendChild(expandBtn);
    body.appendChild(footer);

    card.appendChild(bar);
    card.appendChild(body);

    return card;
  }

  // ---------------------------------------------------------------------------
  // Bulk operations
  // ---------------------------------------------------------------------------

  private async bulkResolve(ids: string[]): Promise<void> {
    try {
      await Promise.all(ids.map((id) => this.client.resolveFeedback(id, true)));
      await this.loadFeedbacks();
    } catch (error) {
      this.bus.emit("feedback:error", error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private async bulkDelete(ids: string[]): Promise<void> {
    try {
      await Promise.all(ids.map((id) => this.client.deleteFeedback(id)));
      for (const id of ids) this.bus.emit("feedback:deleted", id);
      await this.loadFeedbacks();
    } catch (error) {
      this.bus.emit("feedback:error", error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Existing methods (preserved)
  // ---------------------------------------------------------------------------

  private async confirmDeleteAll(): Promise<void> {
    const confirmed = await this.showConfirmDialog(
      this.t("panel.deleteAllConfirmTitle"),
      this.t("panel.deleteAllConfirmMessage"),
    );
    if (!confirmed) return;

    this.deleteAllBtn.disabled = true;
    try {
      await this.client.deleteAllFeedbacks(this.projectName);
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

  private setButtonLoading(btn: HTMLButtonElement): () => void {
    const snapshot = Array.from(btn.childNodes).map((n) => n.cloneNode(true));
    btn.disabled = true;
    btn.replaceChildren(el("div", { class: "sp-spinner sp-spinner--sm" }));
    return () => {
      btn.replaceChildren(...snapshot);
      btn.disabled = false;
    };
  }

  private async deleteFeedback(feedback: FeedbackResponse, btn: HTMLButtonElement): Promise<void> {
    this.pendingMutations.add(feedback.id);
    const restore = this.setButtonLoading(btn);
    try {
      await this.client.deleteFeedback(feedback.id);
      this.bus.emit("feedback:deleted", feedback.id);
      await this.loadFeedbacks();
    } catch (error) {
      restore();
      this.bus.emit("feedback:error", error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.pendingMutations.delete(feedback.id);
    }
  }

  private async toggleResolve(feedback: FeedbackResponse, btn: HTMLButtonElement): Promise<void> {
    this.pendingMutations.add(feedback.id);
    const restore = this.setButtonLoading(btn);
    try {
      const newResolved = feedback.status !== "resolved";
      await this.client.resolveFeedback(feedback.id, newResolved);
      await this.loadFeedbacks();
    } catch (error) {
      restore();
      this.bus.emit("feedback:error", error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.pendingMutations.delete(feedback.id);
    }
  }

  private buildTypeDropdown(): HTMLElement {
    this.typeOptions = [
      {
        value: "all",
        label: this.t("panel.filterAll"),
        icon: ICON_LAYERS,
        color: this.colors.accent,
        bg: this.colors.accentLight,
      },
      {
        value: "question",
        label: this.t("type.question"),
        icon: ICON_QUESTION,
        color: this.colors.typeQuestion,
        bg: this.colors.typeQuestionBg,
      },
      {
        value: "change",
        label: this.t("type.change"),
        icon: ICON_CHANGE,
        color: this.colors.typeChange,
        bg: this.colors.typeChangeBg,
      },
      {
        value: "bug",
        label: this.t("type.bug"),
        icon: ICON_BUG,
        color: this.colors.typeBug,
        bg: this.colors.typeBugBg,
      },
      {
        value: "other",
        label: this.t("type.other"),
        icon: ICON_OTHER,
        color: this.colors.typeOther,
        bg: this.colors.typeOtherBg,
      },
    ];

    this.typeDropdownContainer = el("div", { class: "sp-filter-dropdown" });

    this.typeDropdownBtn = document.createElement("button");
    this.typeDropdownBtn.type = "button";
    this.typeDropdownBtn.className = "sp-filter-dropdown-btn";
    this.typeDropdownBtn.setAttribute("aria-haspopup", "listbox");
    this.typeDropdownBtn.setAttribute("aria-expanded", "false");
    this.renderTypeDropdownTrigger();

    this.typeDropdownBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.typeDropdownMenu) this.closeTypeDropdown();
      else this.openTypeDropdown();
    });

    this.typeDropdownContainer.appendChild(this.typeDropdownBtn);
    return this.typeDropdownContainer;
  }

  private renderTypeDropdownTrigger(): void {
    const active = this.typeOptions.find((o) => this.activeFilters.has(o.value)) ?? this.typeOptions[0];
    if (!active) return;

    this.typeDropdownBtn.replaceChildren();
    this.typeDropdownBtn.style.setProperty("--sp-chip-color", active.color);
    this.typeDropdownBtn.style.setProperty("--sp-chip-bg", active.bg);
    this.typeDropdownBtn.dataset.filter = active.value;
    this.typeDropdownBtn.classList.toggle("sp-filter-dropdown-btn--filtered", active.value !== "all");
    this.typeDropdownBtn.setAttribute("aria-label", `${this.t("type.label")}: ${active.label}`);

    const iconWrap = el("span", { class: "sp-filter-dropdown-btn__icon" });
    iconWrap.appendChild(parseSvg(active.icon));
    this.typeDropdownBtn.appendChild(iconWrap);

    const labelWrap = el("span", { class: "sp-filter-dropdown-btn__label" });
    const prefix = el("span", { class: "sp-filter-dropdown-btn__prefix" });
    setText(prefix, this.t("type.label"));
    const value = el("span", { class: "sp-filter-dropdown-btn__value" });
    setText(value, active.label);
    labelWrap.appendChild(prefix);
    labelWrap.appendChild(value);
    this.typeDropdownBtn.appendChild(labelWrap);

    const chevron = el("span", { class: "sp-filter-dropdown-btn__chevron" });
    chevron.appendChild(parseSvg(ICON_CHEVRON_DOWN));
    this.typeDropdownBtn.appendChild(chevron);
  }

  private openTypeDropdown(): void {
    this.typeDropdownMenu = el("div", { class: "sp-filter-dropdown-menu" });
    this.typeDropdownMenu.setAttribute("role", "listbox");
    this.typeDropdownMenu.setAttribute("aria-label", this.t("type.label"));
    this.typeDropdownBtn.setAttribute("aria-expanded", "true");

    for (const option of this.typeOptions) {
      const item = document.createElement("button");
      item.type = "button";
      const isActive = this.activeFilters.has(option.value);
      item.className = `sp-filter-dropdown-option${isActive ? " sp-filter-dropdown-option--active" : ""}`;
      item.style.setProperty("--sp-chip-color", option.color);
      item.style.setProperty("--sp-chip-bg", option.bg);
      item.dataset.filter = option.value;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(isActive));

      const iconWrap = el("span", { class: "sp-filter-dropdown-option__icon" });
      iconWrap.appendChild(parseSvg(option.icon));
      item.appendChild(iconWrap);

      const labelEl = el("span", { class: "sp-filter-dropdown-option__label" });
      setText(labelEl, option.label);
      item.appendChild(labelEl);

      if (isActive) {
        const checkWrap = el("span", { class: "sp-filter-dropdown-option__check" });
        checkWrap.appendChild(parseSvg(ICON_CHECK));
        item.appendChild(checkWrap);
      }

      item.addEventListener("click", (e) => {
        e.stopPropagation();
        this.selectTypeFilter(option.value);
      });

      this.typeDropdownMenu.appendChild(item);
    }

    this.typeDropdownContainer.appendChild(this.typeDropdownMenu);

    requestAnimationFrame(() => {
      this.typeDropdownOutsideHandler = (e: MouseEvent) => {
        if (this.typeDropdownMenu && !this.typeDropdownContainer.contains(e.target as Node)) {
          this.closeTypeDropdown();
        }
      };
      document.addEventListener("click", this.typeDropdownOutsideHandler, true);
    });

    this.typeDropdownMenu.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeTypeDropdown();
        this.typeDropdownBtn.focus();
      }
    });
  }

  private closeTypeDropdown(): void {
    if (this.typeDropdownMenu) {
      this.typeDropdownMenu.remove();
      this.typeDropdownMenu = null;
    }
    this.typeDropdownBtn.setAttribute("aria-expanded", "false");
    if (this.typeDropdownOutsideHandler) {
      document.removeEventListener("click", this.typeDropdownOutsideHandler, true);
      this.typeDropdownOutsideHandler = null;
    }
  }

  private selectTypeFilter(value: string): void {
    this.activeFilters.clear();
    this.activeFilters.add(value);
    this.renderTypeDropdownTrigger();
    this.closeTypeDropdown();
    this.loadFeedbacks().catch(() => {});
  }

  private buildStatusSegmented(): HTMLElement {
    this.statusOptions = [
      {
        value: "all",
        label: this.t("panel.statusAll"),
        icon: ICON_LAYERS,
        color: this.colors.accent,
        bg: this.colors.accentLight,
      },
      {
        value: "open",
        label: this.t("panel.statusOpen"),
        icon: ICON_DOT_OPEN,
        color: this.colors.statusOpen,
        bg: this.colors.statusOpenBg,
      },
      {
        value: "resolved",
        label: this.t("panel.statusResolved"),
        icon: ICON_CHECK,
        color: this.colors.statusResolved,
        bg: this.colors.statusResolvedBg,
      },
    ];

    this.statusSegmented = el("div", { class: "sp-segmented", role: "radiogroup" });
    this.statusSegmented.setAttribute("aria-label", this.t("status.label"));

    for (const option of this.statusOptions) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `sp-segmented__btn sp-segmented__btn--${option.value}`;
      btn.dataset.statusFilter = option.value;
      btn.setAttribute("role", "radio");
      const isActive = this.activeStatusFilter === option.value;
      btn.setAttribute("aria-checked", String(isActive));
      btn.tabIndex = isActive ? 0 : -1;
      if (isActive) btn.classList.add("sp-segmented__btn--active");
      btn.style.setProperty("--sp-chip-color", option.color);
      btn.style.setProperty("--sp-chip-bg", option.bg);

      const iconWrap = el("span", { class: "sp-segmented__icon" });
      iconWrap.appendChild(parseSvg(option.icon));
      btn.appendChild(iconWrap);

      const labelEl = el("span", { class: "sp-segmented__label" });
      setText(labelEl, option.label);
      btn.appendChild(labelEl);

      btn.addEventListener("click", () => this.selectStatusFilter(option.value));
      btn.addEventListener("keydown", (e) => this.handleSegmentedKey(e, option.value));

      this.statusSegmented.appendChild(btn);
    }

    return this.statusSegmented;
  }

  private handleSegmentedKey(e: KeyboardEvent, current: "all" | FeedbackStatus): void {
    const values = this.statusOptions.map((o) => o.value);
    const idx = values.indexOf(current);
    let nextIdx: number;
    switch (e.key) {
      case "ArrowLeft":
        nextIdx = (idx - 1 + values.length) % values.length;
        break;
      case "ArrowRight":
        nextIdx = (idx + 1) % values.length;
        break;
      case "Home":
        nextIdx = 0;
        break;
      case "End":
        nextIdx = values.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    const next = values[nextIdx];
    if (!next) return;
    this.selectStatusFilter(next);
    const btn = this.statusSegmented.querySelector<HTMLButtonElement>(`[data-status-filter="${next}"]`);
    btn?.focus();
  }

  private selectStatusFilter(value: "all" | FeedbackStatus): void {
    this.activeStatusFilter = value;
    const buttons = this.statusSegmented.querySelectorAll<HTMLButtonElement>(".sp-segmented__btn");
    for (const btn of buttons) {
      const isActive = btn.dataset.statusFilter === value;
      btn.classList.toggle("sp-segmented__btn--active", isActive);
      btn.setAttribute("aria-checked", String(isActive));
      btn.tabIndex = isActive ? 0 : -1;
    }
    this.loadFeedbacks().catch(() => {});
  }

  /** Get the focused feedback (for keyboard shortcuts) */
  private getFocusedFeedback(): FeedbackResponse | undefined {
    const idx = getFocusedCardIndex(this.listContainer);
    if (idx < 0) return undefined;
    const card = this.listContainer.querySelectorAll<HTMLElement>(".sp-card")[idx];
    if (!card) return undefined;
    return this.feedbacks.find((f) => f.id === card.dataset.feedbackId);
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
    this.loadController?.abort();
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.listContainer.removeEventListener("click", this.onListClick);
    this.listContainer.removeEventListener("keydown", this.onListKeydown);
    this.listContainer.removeEventListener("mouseover", this.onListMouseover);
    this.listContainer.removeEventListener("mouseout", this.onListMouseout);
    document.removeEventListener("sp-marker-click", this.onMarkerClick);
    this.closeTypeDropdown();
    this.sortControls.destroy();
    this.bulk.destroy();
    this.exportBtn.destroy();
    this.shortcuts.destroy();
    this.detail.destroy();
    this.root.remove();
  }
}

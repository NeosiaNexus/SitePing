import {
  CLOSED_FEEDBACK_STATUSES,
  type CommentResponse,
  FEEDBACK_STATUSES,
  type FeedbackResponse,
  type FeedbackResponseList,
  type FeedbackStatus,
  type FeedbackType,
  isClosedStatus,
  MAX_PAGE_LIMIT,
  type PageScope,
  type SitepingPanelAction,
} from "@siteping/core";
import type { GetFeedbacksOptions, WidgetClient } from "./api-client.js";
import { SegmentedControl } from "./components/segmented-control.js";
import { PAGE_SIZE } from "./constants.js";
import { el, formatRelativeDate, onClickOutside, parseSvg, setButtonLoading, setHidden, setText } from "./dom-utils.js";
import type { EventBus, WidgetEvents } from "./events.js";
import { ExportButton } from "./export-utils.js";
import { registerEscapeLayer } from "./host-isolation.js";
import { getStatusLabel, getTypeLabel, type TFunction, tWithParams } from "./i18n/index.js";
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
  ICON_USER,
} from "./icons.js";
import type { Identity } from "./identity.js";
import type { MarkerManager } from "./markers.js";
import type { OwnFeedback } from "./own-feedback.js";
import { normalizePanelActions } from "./panel-actions.js";
import { BulkActions, type TriagePermission } from "./panel-bulk.js";
import { DetailView } from "./panel-detail.js";
import { createPageGroupHeader, groupFeedbacksByPage, PanelSortControls, sortFeedbacks } from "./panel-sort.js";
import { PanelStats } from "./panel-stats.js";
import { buildThread } from "./panel-thread.js";
import { focusCardByIndex, getFocusedCardIndex, KeyboardShortcuts } from "./shortcuts.js";
import { getStatusBgColor, getStatusColor, getTypeBgColor, getTypeColor, type ThemeColors } from "./styles/theme.js";
import { isCoarsePointer, isCompactViewport } from "./viewport.js";

/** Non-terminal statuses — complement of `CLOSED_FEEDBACK_STATUSES`; backs the panel's "Open" tab bucket. */
const OPEN_FEEDBACK_STATUSES: readonly FeedbackStatus[] = FEEDBACK_STATUSES.filter((s) => !isClosedStatus(s));

/**
 * Side panel (400px) with feedback history, filters, search, stats,
 * sort/group, bulk actions, export, detail view, and keyboard shortcuts.
 * On phones it is a bottom sheet over a scrim — swipe its header down to close.
 *
 * Lives inside the Shadow DOM.
 * Glassmorphism: glass background, staggered card animations,
 * loading states, resolve feedback with disabled state.
 */
export class Panel {
  private root: HTMLElement;
  private scrim: HTMLElement;
  private listContainer: HTMLElement;
  private searchInput: HTMLInputElement;
  private closeBtn: HTMLButtonElement;
  private deleteAllBtn: HTMLButtonElement;
  private activeFilters = new Set<string>(["all"]);
  private typeDropdownBtn!: HTMLButtonElement;
  private typeDropdownContainer!: HTMLElement;
  private typeDropdownMenu: HTMLElement | null = null;
  private removeTypeDropdownOutsideClick: (() => void) | null = null;
  private statusSegmented!: SegmentedControl<"all" | FeedbackStatus>;
  private typeOptions!: ReadonlyArray<{ value: string; label: string; icon: string; color: string; bg: string }>;
  private feedbacks: FeedbackResponse[] = [];
  private currentPage = 1;
  private totalFeedbacks = 0;
  private isLoadingMore = false;
  private isOpen = false;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  private loadController: AbortController | null = null;
  /** True while `loadFeedbacks()` waits for the list it will render. */
  private isLoading = false;
  /**
   * Feedback a marker click asked to reveal while the list was loading (a
   * marker click on a closed panel opens it first): scrolled to and flashed
   * once that load renders, dropped if the panel closes meanwhile.
   */
  private pendingScrollId: string | null = null;
  /** Tracks feedback IDs with in-flight mutations to prevent spam-click race conditions */
  private pendingMutations = new Set<string>();
  /** Whether the backend takes replies — advertised by the last list response. */
  private canComment = false;
  /** Reviewer mode (`config.readOnly`): no triage action, whatever the server allows. */
  private readonly readOnly: boolean;
  /** The visitor a reply is posted as — `null` when they dismiss the identity prompt. */
  private readonly resolveIdentity: () => Promise<Identity | null>;

  // New feature modules
  private readonly stats: PanelStats;
  private readonly sortControls: PanelSortControls;
  private readonly bulk: BulkActions;
  private readonly exportBtn: ExportButton;
  private readonly shortcuts: KeyboardShortcuts;
  private readonly detail: DetailView;
  private readonly shadowRoot: ShadowRoot;

  // i18n: t is shared with all submodules.

  // Page scope — supplied by launcher so the panel can scope its results to
  // the current page (or template) and filter markers accordingly.
  private readonly getScope: () => PageScope;
  private readonly scopeAnnotationsByUrl: boolean;
  /** "this" = current url, "template" = url pattern, "all" = no scope filter */
  private scopeSegmented!: SegmentedControl<"this" | "template" | "all">;
  /** Cached initial scope value — applied after construction in `buildScopeSegmented`. */
  private readonly initialScopeFilter: "this" | "template" | "all" = "this";
  /** "Mine" filter: only the feedback sent from this browser, whose ids the launcher remembers. */
  private mineOnly = false;
  private readonly ownFeedback: Pick<OwnFeedback, "ids" | "remove">;

  constructor(
    shadowRoot: ShadowRoot,
    private readonly colors: ThemeColors,
    private readonly bus: EventBus<WidgetEvents>,
    private readonly client: WidgetClient,
    private readonly projectName: string,
    private readonly markers: MarkerManager,
    private readonly t: TFunction,
    private readonly locale: string,
    options?: {
      getScope: () => PageScope;
      scopeAnnotationsByUrl: boolean;
      panelActions?: readonly SitepingPanelAction[] | undefined;
      ownFeedback?: Pick<OwnFeedback, "ids" | "remove"> | undefined;
      resolveIdentity?: () => Promise<Identity | null>;
      readOnly?: boolean | undefined;
    },
  ) {
    this.shadowRoot = shadowRoot;
    this.readOnly = !!options?.readOnly;
    this.resolveIdentity = options?.resolveIdentity ?? (async () => null);
    this.getScope = options?.getScope ?? (() => ({ url: window.location.pathname, urlPattern: null }));
    this.scopeAnnotationsByUrl = options?.scopeAnnotationsByUrl ?? true;
    this.ownFeedback = options?.ownFeedback ?? { ids: () => new Set(), remove: () => {} };

    // Phone layout: dims the page behind the sheet; a tap on it closes the panel.
    this.scrim = el("div", { class: "sp-scrim" });
    this.scrim.addEventListener("click", () => this.close());

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
    // Until a list says whether this visitor may use it.
    setHidden(this.deleteAllBtn, true);

    // Export button
    this.exportBtn = new ExportButton(colors, () => this.feedbacks, this.t);

    const headerRight = el("div", { class: "sp-panel-header-right" });
    headerRight.appendChild(this.exportBtn.element);
    headerRight.appendChild(this.deleteAllBtn);
    headerRight.appendChild(this.closeBtn);

    header.appendChild(title);
    header.appendChild(headerRight);

    // --- Stats ---
    this.stats = new PanelStats(colors, this.t);

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

    // Filter bar (type dropdown + status segmented + scope segmented + "Mine").
    // The scope control gives users a fast way to widen results to "this type
    // of page" or "all pages" when the host provides a route template.
    const filterBar = el("div", { class: "sp-filter-bar" });
    filterBar.appendChild(this.buildTypeDropdown());
    filterBar.appendChild(this.buildStatusSegmented());
    filterBar.appendChild(this.buildScopeSegmented());
    filterBar.appendChild(this.buildMineToggle());

    // Sort controls
    this.sortControls = new PanelSortControls(colors, () => this.renderList(), this.t);

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
        permits: (ids, permission) => this.feedbacks.every((f) => !ids.includes(f.id) || this.can(f, permission)),
      },
      this.t,
    );
    this.bulk.setListContainer(this.listContainer);

    // --- Detail View ---
    this.detail = new DetailView(
      colors,
      {
        onBack: () => this.detail.hide(),
        onResolve: async (fb) => {
          try {
            // Client-facing binary action: closed statuses (resolved, wont_fix)
            // reopen, everything else (open, in_progress) resolves.
            const newResolved = !isClosedStatus(fb.status);
            await this.client.resolveFeedback(fb.id, newResolved);
            await this.loadFeedbacks();
            this.detail.hide();
          } catch (error) {
            // Surface the failure to the host (config.onError) like the list
            // and bulk paths do, then rethrow so DetailView restores its
            // buttons and stays open.
            this.bus.emit("feedback:error", error instanceof Error ? error : new Error(String(error)));
            throw error;
          }
        },
        onDelete: async (fb) => {
          try {
            await this.client.deleteFeedback(fb.id);
            this.bus.emit("feedback:deleted", fb.id);
            await this.loadFeedbacks();
            this.detail.hide();
          } catch (error) {
            this.bus.emit("feedback:error", error instanceof Error ? error : new Error(String(error)));
            throw error;
          }
        },
        // Same rule as the page markers: another page's scroll offset and
        // anchor mean nothing here (reachable via the "all pages" scope).
        canGoToAnnotation: (fb) => !this.scopeAnnotationsByUrl || fb.url === this.getScope().url,
        onGoToAnnotation: (fb) => {
          if (fb.annotations.length > 0) {
            const ann = fb.annotations[0];
            if (!ann) return;
            // Follow the live pin: the stored offsets come from the author's
            // layout and miss on another screen size. They remain the fallback
            // when no pin is on screen (anchor lost, or markers hidden).
            if (!this.markers.revealPin(fb.id)) {
              window.scrollTo({ left: ann.scrollX, top: ann.scrollY, behavior: "smooth" });
              this.markers.pinHighlight(fb);
            }
            // The phone sheet covers the page it just scrolled — get out of the way.
            if (isCompactViewport()) this.close();
          }
        },
        onCustomAction: async (action, fb) => {
          try {
            await action.onAction(fb, { refresh: () => this.refreshDetail(fb.id), close: () => this.close() });
          } catch (error) {
            this.reportActionError(error);
          }
        },
        onCustomActionError: (error) => this.reportActionError(error),
        permits: (fb, permission) => this.can(fb, permission),
        buildThread: (fb) =>
          buildThread(fb, {
            t: this.t,
            locale,
            canPost: this.canComment && fb.permissions?.canComment !== false,
            post: (body, clientId) => this.postComment(fb, body, clientId),
          }),
      },
      this.t,
      locale,
      normalizePanelActions(options?.panelActions),
    );

    // --- Keyboard Shortcuts ---
    this.shortcuts = new KeyboardShortcuts(
      colors,
      {
        onNavigate: (dir) => {
          const idx = getFocusedCardIndex(this.listContainer);
          focusCardByIndex(this.listContainer, dir === "down" ? idx + 1 : idx - 1);
        },
        onResolve: () => this.pressInFocusedCard('[data-action="resolve"]'),
        onDelete: () => this.pressInFocusedCard('[data-action="delete"]'),
        onFocusSearch: () => this.searchInput.focus(),
        onToggleSelect: () => this.pressInFocusedCard(".sp-bulk-checkbox"),
        // The detail view covers the whole list (and would hide the help overlay).
        isSuspended: () => this.detail.isVisible,
      },
      this.t,
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
    shadowRoot.appendChild(this.scrim);
    shadowRoot.appendChild(this.root);
    this.attachSheetDrag();

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
        if (feedback) this.detail.show(feedback, Number(card.dataset.number));
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
      if (feedback) this.detail.show(feedback, Number(card.dataset.number));
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

    // Keyboard handling: Escape to close + focus trap. Nested layers (menus,
    // confirm dialog) stop Escape before it bubbles here; the help overlay's
    // handler sits on this same shadow root but runs later, so defer to it.
    registerEscapeLayer(shadowRoot, () => this.isOpen);
    shadowRoot.addEventListener("keydown", (e) => {
      const ke = e as KeyboardEvent;
      if (ke.key === "Escape" && this.isOpen) {
        if (this.shortcuts.isHelpVisible) return;
        // If detail view is open, close it instead
        if (this.detail.isVisible) {
          this.detail.hide();
          return;
        }
        this.close();
        return;
      }
      if (ke.key === "Tab" && this.isOpen) {
        // Filter out non-tabbable elements: those hidden via `display: none`
        // (either on themselves or any ancestor up to this.root) and elements
        // explicitly disabled. Without this filter, the trap can jump to a
        // button inside a closed detail view and effectively swallow the Tab
        // key. We use a walk of style.display rather than `offsetParent`
        // because the latter is unreliable in jsdom (always null without
        // layout) and breaks unit tests.
        const isVisible = (el: HTMLElement): boolean => {
          let cur: HTMLElement | null = el;
          while (cur && cur !== this.root) {
            if (cur.style.display === "none") return false;
            cur = cur.parentElement;
          }
          return true;
        };
        const focusable = Array.from(
          this.root.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => isVisible(el) && !el.hasAttribute("disabled"));
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
    this.scrim.classList.add("sp-scrim--open");
    this.root.setAttribute("aria-hidden", "false");
    this.bus.emit("open");
    this.shortcuts.enable(this.shadowRoot);
    await this.loadFeedbacks();
    // Move focus into the panel. Touch: the close button — focusing the
    // search field would throw the keyboard over the list.
    requestAnimationFrame(() => {
      (isCoarsePointer() ? this.closeBtn : this.searchInput).focus();
    });
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.root.classList.remove("sp-panel--open");
    this.scrim.classList.remove("sp-scrim--open");
    this.root.setAttribute("aria-hidden", "true");
    this.bus.emit("close");
    this.shortcuts.disable();
    this.detail.hide();
    this.pendingScrollId = null;
    // Restore focus to the FAB
    const fab = (this.root.getRootNode() as ShadowRoot).querySelector<HTMLButtonElement>(".sp-fab");
    fab?.focus();
  }

  /**
   * Swipe-down-to-close for the phone sheet. Only the headers (panel and
   * detail) are drag handles, so scrolling the list never dismisses it.
   */
  private attachSheetDrag(): void {
    let startY = 0;
    let startTime = 0;
    let offset = 0;
    let dragging = false;
    this.root.addEventListener("pointerdown", (e) => {
      const target = e.target as Element;
      if (
        e.pointerType === "mouse" ||
        !isCompactViewport() ||
        target.closest("button") ||
        !target.closest(".sp-panel-header, .sp-detail-header")
      )
        return;
      dragging = true;
      startY = e.clientY;
      startTime = e.timeStamp;
      offset = 0;
      this.root.style.transition = "none";
      this.root.setPointerCapture?.(e.pointerId);
    });
    this.root.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      offset = Math.max(0, e.clientY - startY);
      this.root.style.transform = `translateY(${offset}px)`;
    });
    const release = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      // Hand the transform back to the stylesheet: the sheet animates from
      // where the finger left it, to closed or back to open.
      this.root.style.transition = "";
      this.root.style.transform = "";
      const flick = offset > 40 && offset / Math.max(1, e.timeStamp - startTime) > 0.5;
      if (flick || offset > this.root.offsetHeight / 4) this.close();
    };
    this.root.addEventListener("pointerup", release);
    this.root.addEventListener("pointercancel", release);
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

  /**
   * Map a status tab value to the bucket of statuses it represents. The panel's
   * binary tabs use bucket semantics (matching markers / FAB badge / stats):
   * "open" covers open + in_progress, "resolved" covers resolved + wont_fix,
   * and "all" applies no status filter. Returns `undefined` when unfiltered.
   */
  private statusBucket(tab: "all" | FeedbackStatus): readonly FeedbackStatus[] | undefined {
    if (tab === "all") return undefined;
    return isClosedStatus(tab) ? CLOSED_FEEDBACK_STATUSES : OPEN_FEEDBACK_STATUSES;
  }

  /**
   * Load the list from page 1. `pages` > 1 re-fetches that many pages before
   * rendering, so a panel action's `refresh()` keeps what "Load more" added.
   */
  private async loadFeedbacks(pages = 1): Promise<void> {
    // Cancel any in-flight request to prevent stale responses from overwriting newer results
    this.loadController?.abort();
    this.loadController = new AbortController();
    const { signal } = this.loadController;

    // Reset to page 1 on fresh load (filter/search change)
    this.currentPage = 1;

    const search = this.searchInput.value.trim() || undefined;
    const typeFilter = this.activeFilters.has("all") ? undefined : (Array.from(this.activeFilters)[0] as FeedbackType);
    const statuses = this.statusBucket(this.statusSegmented.value);

    const scope = this.getScope();
    // Refresh scope-filter button visibility based on current scope (SPA nav).
    this.syncScopeAvailability();
    const currentScope = this.scopeSegmented.value;
    const options: GetFeedbacksOptions & { page: number; limit: number } = {
      page: 1,
      limit: PAGE_SIZE,
    };
    if (typeFilter) options.type = typeFilter;
    if (statuses) options.statuses = statuses;
    if (search) options.search = search;
    if (currentScope === "this") {
      options.url = scope.url;
    } else if (currentScope === "template" && scope.urlPattern) {
      options.urlPattern = scope.urlPattern;
    }

    // Only show spinner on first load (empty list) — otherwise keep current content visible
    const hasContent = this.feedbacks.length > 0;
    if (!hasContent) this.showLoading();

    // Page markers, and the FAB badge counted from them, show the page's
    // feedbacks whatever the list's filters or scope: a "Resolved" tab must
    // not wipe the open markers. The list result serves them when its query
    // is theirs; otherwise their query runs alongside the list's.
    const listIsMarkerQuery = !this.mineOnly && this.isMarkerQuery(options, scope);
    this.isLoading = true;
    try {
      const listRequest = this.mineOnly
        ? this.fetchOwnFeedbacks(options, signal)
        : this.client.getFeedbacks(this.projectName, options);
      if (!listIsMarkerQuery) void this.loadPageMarkers(scope, signal);
      const first = await listRequest;
      let { feedbacks, total } = first;
      let page = 1;
      while (page < pages && feedbacks.length < total && !signal.aborted) {
        page++;
        const more = await this.client.getFeedbacks(this.projectName, { ...options, page });
        feedbacks = [...feedbacks, ...more.feedbacks];
        total = more.total;
      }
      if (signal.aborted) return; // Stale response — a newer request superseded this one
      this.currentPage = page;
      this.feedbacks = feedbacks;
      this.totalFeedbacks = total;
      // Absent from a server that predates threads — which then has none.
      this.canComment = first.capabilities?.comments === true;
      setHidden(this.deleteAllBtn, this.readOnly || first.permissions?.canDeleteAll === false);
      this.stats.update(feedbacks, total);
      this.bulk.reset();
      this.renderList();
      if (this.pendingScrollId) this.flashCard(this.pendingScrollId);
      if (listIsMarkerQuery) this.renderPageMarkers(feedbacks, scope);
    } catch (error) {
      if (signal.aborted) return; // Expected abort, not a real error
      if (!hasContent) this.showError();
      this.bus.emit("feedback:error", error instanceof Error ? error : new Error(String(error)));
    } finally {
      // An aborted load leaves both to the load that superseded it
      if (!signal.aborted) {
        this.isLoading = false;
        this.pendingScrollId = null;
      }
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
    const statuses = this.statusBucket(this.statusSegmented.value);

    const scope = this.getScope();
    const currentScope = this.scopeSegmented.value;
    const options: GetFeedbacksOptions & { page: number; limit: number } = {
      page: nextPage,
      limit: PAGE_SIZE,
    };
    if (typeFilter) options.type = typeFilter;
    if (statuses) options.statuses = statuses;
    if (search) options.search = search;
    if (currentScope === "this") {
      options.url = scope.url;
    } else if (currentScope === "template" && scope.urlPattern) {
      options.urlPattern = scope.urlPattern;
    }

    // Show spinner on the "Load more" button
    const loadMoreBtn = this.listContainer.querySelector<HTMLButtonElement>(".sp-btn-load-more");
    let restoreBtn: (() => void) | undefined;
    if (loadMoreBtn) restoreBtn = setButtonLoading(loadMoreBtn);

    try {
      const { feedbacks, total } = await this.client.getFeedbacks(this.projectName, options);
      if (controller !== this.loadController) return; // Filter/search changed — discard stale page
      this.currentPage = nextPage;
      this.totalFeedbacks = total;
      this.feedbacks = [...this.feedbacks, ...feedbacks];
      this.stats.update(this.feedbacks, total);
      this.renderList();
      // Under a filter, the markers keep the page query's result
      if (this.isMarkerQuery(options, scope)) this.renderPageMarkers(this.feedbacks, scope);
    } catch (error) {
      if (restoreBtn) restoreBtn();
      this.bus.emit("feedback:error", error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.isLoadingMore = false;
    }
  }

  /** Whether a list query returns the page markers' feedbacks too: no filter, and the markers' URL scope. */
  private isMarkerQuery(options: GetFeedbacksOptions, scope: PageScope): boolean {
    const markerUrl = this.scopeAnnotationsByUrl ? scope.url : undefined;
    return !options.type && !options.statuses && !options.search && !options.urlPattern && options.url === markerUrl;
  }

  /**
   * The "Mine" list: the feedback of the list query that this browser sent,
   * all of it at once. The server cannot filter by sender (see
   * own-feedback.ts), so the query's pages are walked until every
   * remembered id has turned up or none are left.
   */
  private async fetchOwnFeedbacks(options: GetFeedbacksOptions, signal: AbortSignal): Promise<FeedbackResponseList> {
    const own = this.ownFeedback.ids();
    // By id: a feedback created mid-walk shifts the pages, so one can come twice
    const found = new Map<string, FeedbackResponse>();
    const met = new Set<string>();
    let seen = 0;
    let firstTotal: number | undefined;
    let steady = true; // The total never changed: no page shifted under the walk
    // What the server takes (replies) and allows (Delete all), as the plain list reports it
    let capabilities: FeedbackResponseList["capabilities"];
    let permissions: FeedbackResponseList["permissions"];
    for (let page = 1; found.size < own.size && !signal.aborted; page++) {
      const list = await this.client.getFeedbacks(this.projectName, {
        ...options,
        page,
        limit: MAX_PAGE_LIMIT,
      });
      const { feedbacks, total } = list;
      capabilities = list.capabilities;
      permissions = list.permissions;
      firstTotal ??= total;
      steady &&= total === firstTotal;
      for (const feedback of feedbacks) {
        met.add(feedback.id);
        if (own.has(feedback.id)) found.set(feedback.id, feedback);
      }
      seen += feedbacks.length;
      if (feedbacks.length === 0 || seen >= total) break;
    }
    // A steady walk that met every feedback of the project (no filter: only
    // `page` and `limit` set) proves the remembered ids it missed deleted,
    // from the dashboard say. Forgetting them lets the next walk stop early.
    const wholeProject = Object.keys(options).every((key) => key === "page" || key === "limit");
    if (wholeProject && steady && met.size === firstTotal) {
      this.ownFeedback.remove(...[...own].filter((id) => !found.has(id)));
    }
    return { feedbacks: [...found.values()], total: found.size, capabilities, permissions };
  }

  /** Fetch the page markers' own query (the launcher's) when the list shows a filtered or wider one. */
  private async loadPageMarkers(scope: PageScope, signal: AbortSignal): Promise<void> {
    const query = this.scopeAnnotationsByUrl ? { limit: PAGE_SIZE, url: scope.url } : { limit: PAGE_SIZE };
    try {
      const { feedbacks } = await this.client.getFeedbacks(this.projectName, query);
      if (!signal.aborted) this.renderPageMarkers(feedbacks, scope); // Else a newer load owns the markers
    } catch {
      // Non-critical: the current markers stay
    }
  }

  /**
   * Markers render only the current-URL slice, even when the panel shows a
   * wider scope, so the user never sees out-of-context dots on the page. The
   * filter is defensive: a backend may ignore the `url` query.
   */
  private renderPageMarkers(feedbacks: FeedbackResponse[], scope: PageScope): void {
    this.markers.render(this.scopeAnnotationsByUrl ? feedbacks.filter((f) => f.url === scope.url) : feedbacks);
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

    // Select all bar — over the feedbacks a bulk action can reach
    const feedbackIds = sorted.filter((f) => this.selectable(f)).map((f) => f.id);
    if (feedbackIds.length > 0) {
      this.listContainer.appendChild(this.bulk.createSelectAllBar(feedbackIds, this.t("bulk.selectAll")));
    }

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
      setText(loadMoreBtn, tWithParams(this.t, "panel.loadMore", { remaining }));
      loadMoreBtn.addEventListener("click", () => this.loadMoreFeedbacks().catch(() => {}));
      loadMoreWrap.appendChild(loadMoreBtn);
      this.listContainer.appendChild(loadMoreWrap);
    }
  }

  private createCard(feedback: FeedbackResponse, number: number): HTMLElement {
    // Closed = terminal (resolved, wont_fix): muted card + "Reopen" action.
    const isResolved = isClosedStatus(feedback.status);
    const typeColor = getTypeColor(feedback.type, this.colors);

    const card = el("div", {
      class: `sp-card ${isResolved ? "sp-card--resolved" : ""}`,
    });
    card.classList.toggle("sp-card--selected", this.bulk.isSelected(feedback.id));
    card.setAttribute("role", "listitem");
    card.setAttribute("tabindex", "0");
    card.setAttribute(
      "aria-label",
      `Feedback #${number}: ${getTypeLabel(feedback.type, this.t)} — ${feedback.message.slice(0, 80)}`,
    );
    card.dataset.feedbackId = feedback.id;
    // Display (sort-order) number — the detail title must match the card's #.
    card.dataset.number = String(number);

    // Color bar
    const bar = el("div", { class: "sp-card-bar" });
    bar.style.background = isResolved ? "#9ca3af" : typeColor;

    // Body
    const body = el("div", { class: "sp-card-body" });

    // Header: checkbox + #number + badge + date
    const header = el("div", { class: "sp-card-header" });

    // Bulk checkbox — inline in the header row, when a bulk action can reach the card
    if (this.selectable(feedback)) header.appendChild(this.bulk.createCheckbox(feedback.id));

    const num = el("span", { class: "sp-card-number" });
    setText(num, `#${number}`);

    const badge = el("span", { class: "sp-badge" });
    const typeBg = getTypeBgColor(feedback.type, this.colors);
    badge.style.background = typeBg;
    badge.style.color = typeColor;
    setText(badge, getTypeLabel(feedback.type, this.t));

    // Status badge — renders the record's actual status (open, in_progress,
    // resolved, wont_fix) even though panel actions stay binary.
    const statusBadge = el("span", { class: "sp-badge sp-badge--status" });
    statusBadge.dataset.status = feedback.status;
    statusBadge.style.background = getStatusBgColor(feedback.status, this.colors);
    statusBadge.style.color = getStatusColor(feedback.status, this.colors);
    setText(statusBadge, getStatusLabel(feedback.status, this.t));

    const date = el("span", { class: "sp-card-date" });
    setText(date, formatRelativeDate(feedback.createdAt, this.locale));

    header.appendChild(num);
    header.appendChild(badge);
    header.appendChild(statusBadge);
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
    resolveBtn.appendChild(parseSvg(isResolved ? ICON_UNDO : ICON_CHECK));
    const resolveBtnLabel = document.createElement("span");
    setText(resolveBtnLabel, ` ${this.t(isResolved ? "panel.reopen" : "panel.resolve")}`);
    resolveBtn.appendChild(resolveBtnLabel);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "sp-btn-delete";
    deleteBtn.dataset.action = "delete";
    deleteBtn.appendChild(parseSvg(ICON_TRASH));
    const deleteBtnLabel = document.createElement("span");
    setText(deleteBtnLabel, ` ${this.t("panel.delete")}`);
    deleteBtn.appendChild(deleteBtnLabel);

    if (this.can(feedback, "canChangeStatus")) footer.appendChild(resolveBtn);
    if (this.can(feedback, "canDelete")) footer.appendChild(deleteBtn);

    body.appendChild(header);
    body.appendChild(message);
    body.appendChild(expandBtn);
    if (footer.hasChildNodes()) body.appendChild(footer);

    card.appendChild(bar);
    card.appendChild(body);

    return card;
  }

  /** Whether the visitor may triage `feedback` this way: never in reviewer mode, else unless the server refuses. */
  private can(feedback: FeedbackResponse, permission: TriagePermission): boolean {
    return !this.readOnly && feedback.permissions?.[permission] !== false;
  }

  /** Whether a bulk action can reach `feedback` — else it gets no checkbox. */
  private selectable(feedback: FeedbackResponse): boolean {
    return this.can(feedback, "canChangeStatus") || this.can(feedback, "canDelete");
  }

  // ---------------------------------------------------------------------------
  // Bulk operations
  // ---------------------------------------------------------------------------

  private async bulkResolve(ids: string[]): Promise<void> {
    // Skip closed items: resolving would turn a wont_fix into resolved and
    // overwrite a resolved item's closure timestamp.
    const closed = new Set(this.feedbacks.filter((f) => isClosedStatus(f.status)).map((f) => f.id));
    const targets = ids.filter((id) => !closed.has(id));
    const results = await Promise.allSettled(targets.map((id) => this.client.resolveFeedback(id, true)));
    await this.settleBulk(targets, results);
  }

  private async bulkDelete(ids: string[]): Promise<void> {
    const results = await Promise.allSettled(ids.map((id) => this.client.deleteFeedback(id)));
    ids.forEach((id, i) => {
      if (results[i]?.status === "fulfilled") this.bus.emit("feedback:deleted", id);
    });
    await this.settleBulk(ids, results);
  }

  /**
   * Finish a bulk action. Reload when any item succeeded — it must leave the
   * list (and its markers the page) even when another item failed. When every
   * item failed nothing changed, so skip the reload: during an outage it would
   * only fail again and report a second error. Then re-select the failed items
   * still listed, so the user can retry them, and surface the first failure,
   * rethrown so BulkActions restores its buttons.
   */
  private async settleBulk(ids: string[], results: PromiseSettledResult<unknown>[]): Promise<void> {
    const failed = ids.filter((_, i) => results[i]?.status === "rejected");
    if (failed.length < ids.length) await this.loadFeedbacks();
    const failure = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
    if (!failure) return;
    const listed = new Set(this.feedbacks.map((f) => f.id));
    this.bulk.selectAll(failed.filter((id) => listed.has(id)));
    const error = failure.reason instanceof Error ? failure.reason : new Error(String(failure.reason));
    this.bus.emit("feedback:error", error);
    throw error;
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
          ke.stopPropagation(); // Cancel the dialog only, not the panel
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

  private async deleteFeedback(feedback: FeedbackResponse, btn: HTMLButtonElement): Promise<void> {
    this.pendingMutations.add(feedback.id);
    const restore = setButtonLoading(btn);
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
    const restore = setButtonLoading(btn);
    try {
      // Closed statuses (resolved, wont_fix) reopen; open/in_progress resolve.
      const newResolved = !isClosedStatus(feedback.status);
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

    // Escape from the trigger too: a click leaves focus there, not in the menu.
    this.typeDropdownContainer.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || !this.typeDropdownMenu) return;
      e.stopPropagation(); // Close the menu only, not the panel
      this.closeTypeDropdown();
      this.typeDropdownBtn.focus();
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

    // Armed now (see PanelSortControls.openMenu): a frame could outlive the menu.
    this.removeTypeDropdownOutsideClick = onClickOutside(this.typeDropdownContainer, () => this.closeTypeDropdown());
  }

  private closeTypeDropdown(): void {
    if (this.typeDropdownMenu) {
      this.typeDropdownMenu.remove();
      this.typeDropdownMenu = null;
    }
    this.typeDropdownBtn.setAttribute("aria-expanded", "false");
    this.removeTypeDropdownOutsideClick?.();
    this.removeTypeDropdownOutsideClick = null;
  }

  private selectTypeFilter(value: string): void {
    this.activeFilters.clear();
    this.activeFilters.add(value);
    this.renderTypeDropdownTrigger();
    this.closeTypeDropdown();
    this.loadFeedbacks().catch(() => {});
  }

  private buildStatusSegmented(): HTMLElement {
    this.statusSegmented = new SegmentedControl<"all" | FeedbackStatus>({
      options: [
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
      ],
      value: "all",
      onChange: () => {
        this.loadFeedbacks().catch(() => {});
      },
      ariaLabel: this.t("status.label"),
      datasetKey: "statusFilter",
      modifierPrefix: "sp-segmented__btn--",
    });

    return this.statusSegmented.element;
  }

  /**
   * Build the page-scope segmented control: "this page / this type / all".
   * The "this type" button is hidden when the current scope has no urlPattern
   * (host did not provide one for this route). Visibility is refreshed on
   * every `loadFeedbacks` so SPA navigation stays consistent.
   */
  private buildScopeSegmented(): HTMLElement {
    this.scopeSegmented = new SegmentedControl<"this" | "template" | "all">({
      options: [
        { value: "this", label: this.t("scope.thisPage") },
        { value: "template", label: this.t("scope.thisType") },
        { value: "all", label: this.t("scope.all") },
      ],
      value: this.initialScopeFilter,
      onChange: () => {
        this.loadFeedbacks().catch(() => {});
      },
      ariaLabel: this.t("scope.label"),
      datasetKey: "scopeFilter",
      modifierPrefix: "sp-segmented__btn--scope-",
      extraClass: "sp-segmented--scope",
    });

    // Initial visibility — "this type" only meaningful when scope has urlPattern
    this.syncScopeAvailability();
    return this.scopeSegmented.element;
  }

  /**
   * Hide the "this type" button when the current scope has no urlPattern, and
   * fall back to "this page" if it was the active selection. Called on every
   * `loadFeedbacks` so SPA navigation stays consistent.
   */
  private syncScopeAvailability(): void {
    if (!this.scopeSegmented) return;
    const scope = this.getScope();
    const showTemplate = !!scope.urlPattern;
    this.scopeSegmented.setOptionVisible("template", showTemplate);
    if (!showTemplate && this.scopeSegmented.value === "template") {
      this.scopeSegmented.select("this");
    }
  }

  /** "Mine" toggle: narrows the list to the feedback sent from this browser. */
  private buildMineToggle(): HTMLButtonElement {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "sp-mine-toggle";
    toggle.title = this.t("panel.filterMineHint");
    toggle.setAttribute("aria-pressed", "false");
    toggle.append(parseSvg(ICON_USER), this.t("panel.filterMine"));
    toggle.addEventListener("click", () => {
      this.mineOnly = !this.mineOnly;
      toggle.classList.toggle("sp-mine-toggle--active", this.mineOnly);
      toggle.setAttribute("aria-pressed", String(this.mineOnly));
      this.loadFeedbacks().catch(() => {});
    });
    return toggle;
  }

  /**
   * Click a control of the focused card, as the visitor would: a shortcut
   * does nothing on a card without it — one the visitor may not triage.
   */
  private pressInFocusedCard(selector: string): void {
    const card = this.listContainer.querySelectorAll(".sp-card")[getFocusedCardIndex(this.listContainer)];
    card?.querySelector<HTMLElement>(selector)?.click();
  }

  scrollToFeedback(feedbackId: string): void {
    // The rendered cards are about to be replaced (or not rendered yet, when
    // the marker click opened the panel): wait for the load to render them.
    if (this.isLoading) {
      this.pendingScrollId = feedbackId;
      return;
    }
    this.flashCard(feedbackId);
  }

  private flashCard(feedbackId: string): void {
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
      // Phones: the sheet hides the pin that was tapped — open its details
      // rather than leaving the user to find the card in the list.
      const feedback = this.feedbacks.find((f) => f.id === feedbackId);
      if (feedback && isCompactViewport()) this.detail.show(feedback, Number(card.dataset.number));
    }
  }

  /**
   * Post a reply as the visitor and add it to the cached feedback, so the
   * thread still holds it when the visitor comes back to this feedback.
   * Resolves `null` when they dismissed the identity prompt — nothing was
   * sent, and nothing went wrong.
   */
  private async postComment(
    feedback: FeedbackResponse,
    body: string,
    clientId: string,
  ): Promise<CommentResponse | null> {
    const identity = await this.resolveIdentity();
    if (!identity) return null;
    try {
      const comment = await this.client.addComment(feedback.id, {
        body,
        clientId,
        authorName: identity.name,
        authorEmail: identity.email,
        authorRole: "client",
      });
      feedback.comments = [...(feedback.comments ?? []), comment];
      this.bus.emit("comment:added", comment);
      return comment;
    } catch (error) {
      this.bus.emit("feedback:error", error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Host `panelActions` failures go to `config.onError` through their own
   * event — never `feedback:error`, which settles a pending popup submission.
   */
  private reportActionError(error: unknown): void {
    this.bus.emit("panel:action-error", error instanceof Error ? error : new Error(String(error)));
  }

  /**
   * `refresh()` handed to panel actions: reload the list (every page loaded
   * so far) and markers, then re-render the detail view with the updated
   * record — or go back to the list when it no longer matches the filters.
   * Leaves the view alone when the user has already moved on to another
   * feedback.
   */
  private async refreshDetail(feedbackId: string): Promise<void> {
    if (this.isOpen) await this.loadFeedbacks(this.currentPage);
    if (this.detail.feedbackId !== feedbackId) return;
    const index = this.feedbacks.findIndex((f) => f.id === feedbackId);
    const fresh = this.feedbacks[index];
    if (fresh) this.detail.show(fresh, index + 1);
    else this.detail.hide();
  }

  /** Refresh the panel after a new feedback is submitted */
  async refresh(): Promise<void> {
    if (this.isOpen) {
      await this.loadFeedbacks();
    }
  }

  /** Whether the panel is currently open — used by the launcher to coordinate marker refreshes. */
  get isCurrentlyOpen(): boolean {
    return this.isOpen;
  }

  destroy(): void {
    // A panel action's context can outlive the widget: its refresh() and
    // close() only act on an open panel.
    this.isOpen = false;
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
    this.scrim.remove();
    this.root.remove();
  }
}

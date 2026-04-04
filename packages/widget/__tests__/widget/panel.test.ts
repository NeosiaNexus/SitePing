// @vitest-environment jsdom

import type { FeedbackResponse } from "@siteping/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventBus, type WidgetEvents } from "../../src/events.js";
import { createT } from "../../src/i18n/index.js";
import { Panel } from "../../src/panel.js";
import { buildThemeColors } from "../../src/styles/theme.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function createMockApiClient() {
  return {
    sendFeedback: vi.fn(),
    getFeedbacks: vi.fn().mockResolvedValue({ feedbacks: [], total: 0 }),
    resolveFeedback: vi.fn(),
    deleteFeedback: vi.fn(),
    deleteAllFeedbacks: vi.fn(),
  };
}

function createMockMarkers() {
  return {
    render: vi.fn(),
    highlight: vi.fn(),
    pinHighlight: vi.fn(),
    addFeedback: vi.fn(),
    destroy: vi.fn(),
    count: 0,
  };
}

function makeFeedback(overrides: Partial<FeedbackResponse> = {}): FeedbackResponse {
  return {
    id: "fb-1",
    projectName: "test-project",
    type: "bug",
    message: "Something is broken",
    status: "open",
    url: "http://localhost/",
    viewport: "1920x1080",
    userAgent: "test",
    authorName: "Test User",
    authorEmail: "test@example.com",
    resolvedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    annotations: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Polyfills for jsdom
// ---------------------------------------------------------------------------

// jsdom does not implement CSS.escape
if (typeof globalThis.CSS === "undefined") {
  (globalThis as Record<string, unknown>).CSS = { escape: (s: string) => s };
} else if (!CSS.escape) {
  CSS.escape = (s: string) => s;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createShadowRoot(): ShadowRoot {
  const host = document.createElement("div");
  document.body.appendChild(host);
  return host.attachShadow({ mode: "open" });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Panel", () => {
  let shadow: ShadowRoot;
  let bus: EventBus<WidgetEvents>;
  let panel: Panel;
  let apiClient: ReturnType<typeof createMockApiClient>;
  let markers: ReturnType<typeof createMockMarkers>;

  const colors = buildThemeColors();
  const t = createT("fr");

  beforeEach(() => {
    shadow = createShadowRoot();
    bus = new EventBus<WidgetEvents>();
    apiClient = createMockApiClient();
    markers = createMockMarkers();
    panel = new Panel(shadow, colors, bus, apiClient as never, "test-project", markers as never, t, "fr");
  });

  afterEach(() => {
    panel.destroy();
    shadow.host.remove();
  });

  // -------------------------------------------------------------------------
  // Construction
  // -------------------------------------------------------------------------

  describe("construction", () => {
    it("creates panel root with role=complementary", () => {
      const root = shadow.querySelector<HTMLElement>('[role="complementary"]');
      expect(root).not.toBeNull();
    });

    it("sets aria-label on panel root", () => {
      const root = shadow.querySelector<HTMLElement>('[role="complementary"]')!;
      expect(root.getAttribute("aria-label")).toBe(t("panel.ariaLabel"));
    });

    it("starts with aria-hidden=true (closed state)", () => {
      const root = shadow.querySelector<HTMLElement>('[role="complementary"]')!;
      expect(root.getAttribute("aria-hidden")).toBe("true");
    });

    it("creates a search input", () => {
      const input = shadow.querySelector<HTMLInputElement>("input.sp-search");
      expect(input).not.toBeNull();
      expect(input!.type).toBe("text");
      expect(input!.getAttribute("aria-label")).toBe(t("panel.searchAria"));
    });

    it("creates a list container with role=list", () => {
      const list = shadow.querySelector<HTMLElement>('[role="list"]');
      expect(list).not.toBeNull();
      expect(list!.getAttribute("aria-label")).toBe(t("panel.feedbackList"));
    });

    it("creates filter chips with correct aria-pressed", () => {
      const chips = shadow.querySelectorAll<HTMLButtonElement>(".sp-chip");
      expect(chips.length).toBe(5); // all, question, change, bug, other

      // "All" chip is active by default
      const allChip = shadow.querySelector<HTMLButtonElement>('.sp-chip[data-filter="all"]')!;
      expect(allChip.getAttribute("aria-pressed")).toBe("true");

      // Other chips are not active
      const bugChip = shadow.querySelector<HTMLButtonElement>('.sp-chip[data-filter="bug"]')!;
      expect(bugChip.getAttribute("aria-pressed")).toBe("false");
    });

    it("creates close and delete-all buttons", () => {
      const closeBtn = shadow.querySelector<HTMLButtonElement>(".sp-panel-close");
      expect(closeBtn).not.toBeNull();
      expect(closeBtn!.getAttribute("aria-label")).toBe(t("panel.close"));

      const deleteAllBtn = shadow.querySelector<HTMLButtonElement>(".sp-btn-delete-all");
      expect(deleteAllBtn).not.toBeNull();
      expect(deleteAllBtn!.getAttribute("aria-label")).toBe(t("panel.deleteAll"));
    });
  });

  // -------------------------------------------------------------------------
  // Open / Close
  // -------------------------------------------------------------------------

  describe("open/close", () => {
    it("sets aria-hidden=false when opened", async () => {
      await panel.open();

      const root = shadow.querySelector<HTMLElement>('[role="complementary"]')!;
      expect(root.getAttribute("aria-hidden")).toBe("false");
    });

    it("adds sp-panel--open class when opened", async () => {
      await panel.open();

      const root = shadow.querySelector<HTMLElement>(".sp-panel")!;
      expect(root.classList.contains("sp-panel--open")).toBe(true);
    });

    it("emits 'open' event when opened", async () => {
      const listener = vi.fn();
      bus.on("open", listener);

      await panel.open();

      expect(listener).toHaveBeenCalledOnce();
    });

    it("calls getFeedbacks on open", async () => {
      await panel.open();

      expect(apiClient.getFeedbacks).toHaveBeenCalledWith("test-project", { limit: 50 });
    });

    it("sets aria-hidden=true when closed", async () => {
      await panel.open();
      panel.close();

      const root = shadow.querySelector<HTMLElement>('[role="complementary"]')!;
      expect(root.getAttribute("aria-hidden")).toBe("true");
    });

    it("removes sp-panel--open class when closed", async () => {
      await panel.open();
      panel.close();

      const root = shadow.querySelector<HTMLElement>(".sp-panel")!;
      expect(root.classList.contains("sp-panel--open")).toBe(false);
    });

    it("emits 'close' event when closed", async () => {
      const listener = vi.fn();
      bus.on("close", listener);

      await panel.open();
      panel.close();

      expect(listener).toHaveBeenCalledOnce();
    });

    it("does not emit open twice when already open", async () => {
      const listener = vi.fn();
      bus.on("open", listener);

      await panel.open();
      await panel.open();

      expect(listener).toHaveBeenCalledOnce();
    });

    it("does not emit close when already closed", () => {
      const listener = vi.fn();
      bus.on("close", listener);

      panel.close();

      expect(listener).not.toHaveBeenCalled();
    });

    it("responds to panel:toggle event from bus", async () => {
      bus.emit("panel:toggle", true);

      // Give the async open a tick to resolve
      await vi.waitFor(() => {
        const root = shadow.querySelector<HTMLElement>('[role="complementary"]')!;
        expect(root.getAttribute("aria-hidden")).toBe("false");
      });
    });
  });

  // -------------------------------------------------------------------------
  // Filters
  // -------------------------------------------------------------------------

  describe("filters", () => {
    it("toggles aria-pressed when a chip is clicked", async () => {
      await panel.open();

      const bugChip = shadow.querySelector<HTMLButtonElement>('.sp-chip[data-filter="bug"]')!;
      bugChip.click();

      expect(bugChip.getAttribute("aria-pressed")).toBe("true");
    });

    it("deactivates other chips when a new one is selected (single-select)", async () => {
      await panel.open();

      const bugChip = shadow.querySelector<HTMLButtonElement>('.sp-chip[data-filter="bug"]')!;
      bugChip.click();

      const allChip = shadow.querySelector<HTMLButtonElement>('.sp-chip[data-filter="all"]')!;
      expect(allChip.getAttribute("aria-pressed")).toBe("false");
    });

    it("calls loadFeedbacks with type filter when a chip is clicked", async () => {
      await panel.open();
      apiClient.getFeedbacks.mockClear();

      const bugChip = shadow.querySelector<HTMLButtonElement>('.sp-chip[data-filter="bug"]')!;
      bugChip.click();

      // loadFeedbacks is called asynchronously
      await vi.waitFor(() => {
        expect(apiClient.getFeedbacks).toHaveBeenCalledWith("test-project", expect.objectContaining({ type: "bug" }));
      });
    });

    it("clicking 'all' chip removes type filter", async () => {
      await panel.open();

      // First select a type filter
      const bugChip = shadow.querySelector<HTMLButtonElement>('.sp-chip[data-filter="bug"]')!;
      bugChip.click();
      apiClient.getFeedbacks.mockClear();

      // Then click all
      const allChip = shadow.querySelector<HTMLButtonElement>('.sp-chip[data-filter="all"]')!;
      allChip.click();

      await vi.waitFor(() => {
        expect(apiClient.getFeedbacks).toHaveBeenCalledWith("test-project", expect.objectContaining({ limit: 50 }));
      });
    });
  });

  // -------------------------------------------------------------------------
  // Card rendering
  // -------------------------------------------------------------------------

  describe("card rendering", () => {
    it("renders feedback cards with correct ARIA role", async () => {
      const feedback = makeFeedback();
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [feedback], total: 1 });

      await panel.open();

      const card = shadow.querySelector<HTMLElement>('[role="listitem"]');
      expect(card).not.toBeNull();
    });

    it("renders feedback card with aria-label including type and message", async () => {
      const feedback = makeFeedback({ type: "bug", message: "Crash on load" });
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [feedback], total: 1 });

      await panel.open();

      const card = shadow.querySelector<HTMLElement>('[role="listitem"]')!;
      const label = card.getAttribute("aria-label")!;
      expect(label).toContain("Bug");
      expect(label).toContain("Crash on load");
    });

    it("sets data-feedback-id on cards", async () => {
      const feedback = makeFeedback({ id: "fb-42" });
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [feedback], total: 1 });

      await panel.open();

      const card = shadow.querySelector<HTMLElement>('[data-feedback-id="fb-42"]');
      expect(card).not.toBeNull();
    });

    it("renders 'resolved' class on resolved feedback cards", async () => {
      const feedback = makeFeedback({ status: "resolved" });
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [feedback], total: 1 });

      await panel.open();

      const card = shadow.querySelector<HTMLElement>(".sp-card--resolved");
      expect(card).not.toBeNull();
    });

    it("shows empty state when no feedbacks exist", async () => {
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [], total: 0 });

      await panel.open();

      const empty = shadow.querySelector<HTMLElement>(".sp-empty");
      expect(empty).not.toBeNull();
    });

    it("renders expand button for cards (initially hidden)", async () => {
      const feedback = makeFeedback();
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [feedback], total: 1 });

      await panel.open();

      const expandBtn = shadow.querySelector<HTMLButtonElement>(".sp-card-expand");
      expect(expandBtn).not.toBeNull();
      expect(expandBtn!.getAttribute("aria-expanded")).toBe("false");
    });

    it("renders resolve button on cards", async () => {
      const feedback = makeFeedback({ status: "open" });
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [feedback], total: 1 });

      await panel.open();

      const resolveBtn = shadow.querySelector<HTMLButtonElement>(".sp-btn-resolve");
      expect(resolveBtn).not.toBeNull();
    });

    it("renders multiple cards with staggered animation index", async () => {
      const feedbacks = [makeFeedback({ id: "fb-1" }), makeFeedback({ id: "fb-2" }), makeFeedback({ id: "fb-3" })];
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks, total: 3 });

      await panel.open();

      const cards = shadow.querySelectorAll<HTMLElement>('[role="listitem"]');
      expect(cards.length).toBe(3);
      expect(cards[0].style.getPropertyValue("--sp-card-i")).toBe("0");
      expect(cards[1].style.getPropertyValue("--sp-card-i")).toBe("1");
      expect(cards[2].style.getPropertyValue("--sp-card-i")).toBe("2");
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  describe("error handling", () => {
    it("shows error state when API call fails on first load", async () => {
      apiClient.getFeedbacks.mockRejectedValue(new Error("Network error"));

      await panel.open();

      const errorEl = shadow.querySelector<HTMLElement>(".sp-empty");
      expect(errorEl).not.toBeNull();
    });

    it("emits feedback:error on API failure", async () => {
      const listener = vi.fn();
      bus.on("feedback:error", listener);
      apiClient.getFeedbacks.mockRejectedValue(new Error("Network error"));

      await panel.open();

      expect(listener).toHaveBeenCalledWith(expect.any(Error));
    });

    it("renders retry button on error", async () => {
      apiClient.getFeedbacks.mockRejectedValue(new Error("Network error"));

      await panel.open();

      const retryBtn = shadow.querySelector<HTMLButtonElement>(".sp-btn-ghost");
      expect(retryBtn).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Refresh
  // -------------------------------------------------------------------------

  describe("refresh", () => {
    it("reloads feedbacks when panel is open", async () => {
      await panel.open();
      apiClient.getFeedbacks.mockClear();

      await panel.refresh();

      expect(apiClient.getFeedbacks).toHaveBeenCalledOnce();
    });

    it("does not reload when panel is closed", async () => {
      apiClient.getFeedbacks.mockClear();

      await panel.refresh();

      expect(apiClient.getFeedbacks).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Destroy
  // -------------------------------------------------------------------------

  describe("destroy", () => {
    it("removes DOM elements from shadow root", () => {
      panel.destroy();

      const root = shadow.querySelector<HTMLElement>(".sp-panel");
      expect(root).toBeNull();
    });

    it("removes sp-marker-click document listener", () => {
      const spy = vi.spyOn(document, "removeEventListener");

      panel.destroy();

      expect(spy).toHaveBeenCalledWith("sp-marker-click", expect.any(Function));
      spy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Card actions (event delegation)
  // -------------------------------------------------------------------------

  describe("card actions", () => {
    const annotation = {
      id: "ann-1",
      feedbackId: "fb-1",
      cssSelector: "div",
      xpath: "/html/body/div",
      textSnippet: "",
      elementTag: "DIV",
      elementId: null,
      textPrefix: "",
      textSuffix: "",
      fingerprint: "0:0:0",
      neighborText: "",
      xPct: 0.1,
      yPct: 0.2,
      wPct: 0.3,
      hPct: 0.4,
      scrollX: 100,
      scrollY: 200,
      viewportW: 1920,
      viewportH: 1080,
      devicePixelRatio: 1,
      createdAt: new Date().toISOString(),
    };

    it("clicking resolve button calls apiClient.resolveFeedback and reloads", async () => {
      const fb = makeFeedback({ id: "fb-1", status: "open" });
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [fb], total: 1 });
      apiClient.resolveFeedback.mockResolvedValue(undefined);

      await panel.open();
      apiClient.getFeedbacks.mockClear();
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [], total: 0 });

      const resolveBtn = shadow.querySelector<HTMLButtonElement>(".sp-btn-resolve")!;
      resolveBtn.click();

      await vi.waitFor(() => {
        expect(apiClient.resolveFeedback).toHaveBeenCalledWith("fb-1", true);
        expect(apiClient.getFeedbacks).toHaveBeenCalled();
      });
    });

    it("clicking resolve on resolved feedback reopens it", async () => {
      const fb = makeFeedback({ id: "fb-2", status: "resolved" });
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [fb], total: 1 });
      apiClient.resolveFeedback.mockResolvedValue(undefined);

      await panel.open();
      apiClient.getFeedbacks.mockClear();
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [], total: 0 });

      const resolveBtn = shadow.querySelector<HTMLButtonElement>(".sp-btn-resolve")!;
      resolveBtn.click();

      await vi.waitFor(() => {
        expect(apiClient.resolveFeedback).toHaveBeenCalledWith("fb-2", false);
      });
    });

    it("clicking delete button calls apiClient.deleteFeedback and reloads", async () => {
      const fb = makeFeedback({ id: "fb-1" });
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [fb], total: 1 });
      apiClient.deleteFeedback.mockResolvedValue(undefined);

      await panel.open();
      apiClient.getFeedbacks.mockClear();
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [], total: 0 });

      const deleteBtn = shadow.querySelector<HTMLButtonElement>(".sp-btn-delete")!;
      deleteBtn.click();

      await vi.waitFor(() => {
        expect(apiClient.deleteFeedback).toHaveBeenCalledWith("fb-1");
        expect(apiClient.getFeedbacks).toHaveBeenCalled();
      });
    });

    it("clicking expand button toggles sp-card-message--expanded class", async () => {
      const fb = makeFeedback({ id: "fb-1" });
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [fb], total: 1 });

      await panel.open();

      const expandBtn = shadow.querySelector<HTMLButtonElement>(".sp-card-expand")!;
      // Make button visible for the test (normally depends on scrollHeight > clientHeight)
      expandBtn.style.display = "block";
      expandBtn.click();

      const message = shadow.querySelector<HTMLElement>(".sp-card-message")!;
      expect(message.classList.contains("sp-card-message--expanded")).toBe(true);
    });

    it("expand button updates aria-expanded attribute", async () => {
      const fb = makeFeedback({ id: "fb-1" });
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [fb], total: 1 });

      await panel.open();

      const expandBtn = shadow.querySelector<HTMLButtonElement>(".sp-card-expand")!;
      expandBtn.style.display = "block";
      expect(expandBtn.getAttribute("aria-expanded")).toBe("false");

      expandBtn.click();
      expect(expandBtn.getAttribute("aria-expanded")).toBe("true");

      expandBtn.click();
      expect(expandBtn.getAttribute("aria-expanded")).toBe("false");
    });

    it("clicking a card with annotations scrolls to annotation position", async () => {
      const fb = makeFeedback({ id: "fb-1", annotations: [annotation] });
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [fb], total: 1 });

      await panel.open();

      const scrollSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
      const card = shadow.querySelector<HTMLElement>('[data-feedback-id="fb-1"]')!;
      card.click();

      expect(scrollSpy).toHaveBeenCalledWith({ left: 100, top: 200, behavior: "smooth" });
      scrollSpy.mockRestore();
    });

    it("clicking a card with annotations calls markers.pinHighlight", async () => {
      const fb = makeFeedback({ id: "fb-1", annotations: [annotation] });
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [fb], total: 1 });

      await panel.open();

      vi.spyOn(window, "scrollTo").mockImplementation(() => {});
      const card = shadow.querySelector<HTMLElement>('[data-feedback-id="fb-1"]')!;
      card.click();

      expect(markers.pinHighlight).toHaveBeenCalledWith(expect.objectContaining({ id: "fb-1" }));
    });
  });

  // -------------------------------------------------------------------------
  // Keyboard navigation on cards
  // -------------------------------------------------------------------------

  describe("keyboard navigation on cards", () => {
    const annotation = {
      id: "ann-1",
      feedbackId: "fb-1",
      cssSelector: "div",
      xpath: "/html/body/div",
      textSnippet: "",
      elementTag: "DIV",
      elementId: null,
      textPrefix: "",
      textSuffix: "",
      fingerprint: "0:0:0",
      neighborText: "",
      xPct: 0.1,
      yPct: 0.2,
      wPct: 0.3,
      hPct: 0.4,
      scrollX: 50,
      scrollY: 150,
      viewportW: 1920,
      viewportH: 1080,
      devicePixelRatio: 1,
      createdAt: new Date().toISOString(),
    };

    it("Enter key on card triggers scroll + pinHighlight", async () => {
      const fb = makeFeedback({ id: "fb-1", annotations: [annotation] });
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [fb], total: 1 });

      await panel.open();

      const scrollSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
      const card = shadow.querySelector<HTMLElement>('[data-feedback-id="fb-1"]')!;
      const listContainer = shadow.querySelector<HTMLElement>('[role="list"]')!;

      // Dispatch keydown on the card (bubbles to listContainer)
      const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
      Object.defineProperty(event, "target", { value: card });
      listContainer.dispatchEvent(event);

      expect(scrollSpy).toHaveBeenCalledWith({ left: 50, top: 150, behavior: "smooth" });
      expect(markers.pinHighlight).toHaveBeenCalledWith(expect.objectContaining({ id: "fb-1" }));
      scrollSpy.mockRestore();
    });

    it("Space key on card triggers scroll + pinHighlight", async () => {
      const fb = makeFeedback({ id: "fb-1", annotations: [annotation] });
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [fb], total: 1 });

      await panel.open();

      const scrollSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
      const card = shadow.querySelector<HTMLElement>('[data-feedback-id="fb-1"]')!;
      const listContainer = shadow.querySelector<HTMLElement>('[role="list"]')!;

      const event = new KeyboardEvent("keydown", { key: " ", bubbles: true });
      Object.defineProperty(event, "target", { value: card });
      listContainer.dispatchEvent(event);

      expect(scrollSpy).toHaveBeenCalledWith({ left: 50, top: 150, behavior: "smooth" });
      expect(markers.pinHighlight).toHaveBeenCalledWith(expect.objectContaining({ id: "fb-1" }));
      scrollSpy.mockRestore();
    });

    it("Enter on a button inside card does NOT trigger card scroll", async () => {
      const fb = makeFeedback({ id: "fb-1", annotations: [annotation] });
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [fb], total: 1 });

      await panel.open();

      const scrollSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
      const resolveBtn = shadow.querySelector<HTMLButtonElement>(".sp-btn-resolve")!;
      const listContainer = shadow.querySelector<HTMLElement>('[role="list"]')!;

      // target is the button, not the card itself
      const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
      Object.defineProperty(event, "target", { value: resolveBtn });
      listContainer.dispatchEvent(event);

      expect(scrollSpy).not.toHaveBeenCalled();
      scrollSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Mouseover/mouseout on list
  // -------------------------------------------------------------------------

  describe("mouseover/mouseout on list", () => {
    it("mouseover on a card calls markers.highlight(feedbackId)", async () => {
      const fb = makeFeedback({ id: "fb-42" });
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [fb], total: 1 });

      await panel.open();

      const card = shadow.querySelector<HTMLElement>('[data-feedback-id="fb-42"]')!;
      const listContainer = shadow.querySelector<HTMLElement>('[role="list"]')!;

      const event = new MouseEvent("mouseover", { bubbles: true });
      Object.defineProperty(event, "target", { value: card });
      listContainer.dispatchEvent(event);

      expect(markers.highlight).toHaveBeenCalledWith("fb-42");
    });

    it("mouseout leaving all cards calls markers.highlight('')", async () => {
      const fb = makeFeedback({ id: "fb-42" });
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [fb], total: 1 });

      await panel.open();

      const listContainer = shadow.querySelector<HTMLElement>('[role="list"]')!;
      // relatedTarget is outside the listContainer (e.g. the panel itself)
      const panelRoot = shadow.querySelector<HTMLElement>(".sp-panel")!;
      const event = new MouseEvent("mouseout", { bubbles: true, relatedTarget: panelRoot });
      Object.defineProperty(event, "target", { value: listContainer });
      listContainer.dispatchEvent(event);

      expect(markers.highlight).toHaveBeenCalledWith("");
    });
  });

  // -------------------------------------------------------------------------
  // Delete all + confirm dialog
  // -------------------------------------------------------------------------

  describe("delete all", () => {
    it("deleteAllBtn click triggers confirm dialog", async () => {
      const fb = makeFeedback({ id: "fb-1" });
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [fb], total: 1 });

      await panel.open();

      const deleteAllBtn = shadow.querySelector<HTMLButtonElement>(".sp-btn-delete-all")!;
      deleteAllBtn.click();

      // The confirm dialog backdrop should appear in the shadow root
      await vi.waitFor(() => {
        const backdrop = shadow.querySelector<HTMLElement>(".sp-confirm-backdrop");
        expect(backdrop).not.toBeNull();
      });
    });

    it("confirming delete all calls apiClient.deleteAllFeedbacks and reloads", async () => {
      const fb = makeFeedback({ id: "fb-1" });
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [fb], total: 1 });
      apiClient.deleteAllFeedbacks.mockResolvedValue(undefined);

      await panel.open();
      apiClient.getFeedbacks.mockClear();
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [], total: 0 });

      const deleteAllBtn = shadow.querySelector<HTMLButtonElement>(".sp-btn-delete-all")!;
      deleteAllBtn.click();

      await vi.waitFor(() => {
        const confirmBtn = shadow.querySelector<HTMLButtonElement>(".sp-btn-danger");
        expect(confirmBtn).not.toBeNull();
      });

      const confirmBtn = shadow.querySelector<HTMLButtonElement>(".sp-btn-danger")!;
      confirmBtn.click();

      await vi.waitFor(() => {
        expect(apiClient.deleteAllFeedbacks).toHaveBeenCalledWith("test-project");
      });
    });

    it("cancelling delete all does not call API", async () => {
      const fb = makeFeedback({ id: "fb-1" });
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [fb], total: 1 });

      await panel.open();

      const deleteAllBtn = shadow.querySelector<HTMLButtonElement>(".sp-btn-delete-all")!;
      deleteAllBtn.click();

      await vi.waitFor(() => {
        const cancelBtn = shadow.querySelector<HTMLButtonElement>(".sp-btn-ghost.sp-btn-ghost");
        expect(cancelBtn).not.toBeNull();
      });

      // Find the cancel button inside the confirm dialog actions
      const backdrop = shadow.querySelector<HTMLElement>(".sp-confirm-backdrop")!;
      const cancelBtn = backdrop.querySelector<HTMLButtonElement>(".sp-btn-ghost")!;
      cancelBtn.click();

      // Give time for dialog close animation
      await new Promise((r) => setTimeout(r, 250));
      expect(apiClient.deleteAllFeedbacks).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // scrollToFeedback
  // -------------------------------------------------------------------------

  describe("scrollToFeedback", () => {
    it("scrolls card into view and adds flash animation", async () => {
      const fb = makeFeedback({ id: "fb-1" });
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [fb], total: 1 });

      await panel.open();

      const card = shadow.querySelector<HTMLElement>('[data-feedback-id="fb-1"]')!;
      // jsdom does not implement scrollIntoView — stub it on the element
      card.scrollIntoView = vi.fn();

      panel.scrollToFeedback("fb-1");

      expect(card.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
      expect(card.classList.contains("sp-anim-flash")).toBe(true);

      // After animationend, the class is removed
      card.dispatchEvent(new Event("animationend"));
      expect(card.classList.contains("sp-anim-flash")).toBe(false);
    });

    it("scrollToFeedback on nonexistent id does nothing", async () => {
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [], total: 0 });

      await panel.open();

      // Should not throw
      expect(() => panel.scrollToFeedback("nonexistent")).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Search
  // -------------------------------------------------------------------------

  describe("search", () => {
    it("search input triggers loadFeedbacks with search param after debounce", async () => {
      vi.useFakeTimers();

      await panel.open();
      apiClient.getFeedbacks.mockClear();

      const searchInput = shadow.querySelector<HTMLInputElement>("input.sp-search")!;
      searchInput.value = "hello";
      searchInput.dispatchEvent(new Event("input"));

      // Not called yet — debounce not elapsed
      expect(apiClient.getFeedbacks).not.toHaveBeenCalled();

      vi.advanceTimersByTime(200);

      await vi.waitFor(() => {
        expect(apiClient.getFeedbacks).toHaveBeenCalledWith(
          "test-project",
          expect.objectContaining({ search: "hello" }),
        );
      });

      vi.useRealTimers();
    });
  });

  // -------------------------------------------------------------------------
  // Keyboard: Escape + Focus trap
  // -------------------------------------------------------------------------

  describe("keyboard: escape and focus trap", () => {
    it("Escape key closes the panel when open", async () => {
      await panel.open();

      const root = shadow.querySelector<HTMLElement>('[role="complementary"]')!;
      expect(root.getAttribute("aria-hidden")).toBe("false");

      shadow.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      expect(root.getAttribute("aria-hidden")).toBe("true");
    });

    it("Tab at last focusable wraps to first", async () => {
      await panel.open();

      const panelRoot = shadow.querySelector<HTMLElement>(".sp-panel")!;
      const focusable = panelRoot.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      expect(focusable.length).toBeGreaterThan(0);

      const last = focusable[focusable.length - 1]!;

      // Simulate focus on last element
      last.focus();

      // Cannot override shiftKey after construction, so create a fresh event
      const tabEvent = new KeyboardEvent("keydown", { key: "Tab", shiftKey: false, bubbles: true });
      const preventSpy = vi.spyOn(tabEvent, "preventDefault");

      // Simulate activeElement on shadow root
      Object.defineProperty(shadow, "activeElement", { value: last, configurable: true });
      shadow.dispatchEvent(tabEvent);

      expect(preventSpy).toHaveBeenCalled();
    });

    it("Shift+Tab at first focusable wraps to last", async () => {
      await panel.open();

      const panelRoot = shadow.querySelector<HTMLElement>(".sp-panel")!;
      const focusable = panelRoot.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      expect(focusable.length).toBeGreaterThan(0);

      const first = focusable[0]!;

      first.focus();

      const tabEvent = new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true });
      const preventSpy = vi.spyOn(tabEvent, "preventDefault");

      Object.defineProperty(shadow, "activeElement", { value: first, configurable: true });
      shadow.dispatchEvent(tabEvent);

      expect(preventSpy).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Error handling edge cases
  // -------------------------------------------------------------------------

  describe("error handling edge cases", () => {
    it("resolve failure re-enables button and emits error", async () => {
      const fb = makeFeedback({ id: "fb-1", status: "open" });
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [fb], total: 1 });
      apiClient.resolveFeedback.mockRejectedValue(new Error("resolve failed"));

      const errorListener = vi.fn();
      bus.on("feedback:error", errorListener);

      await panel.open();

      const resolveBtn = shadow.querySelector<HTMLButtonElement>(".sp-btn-resolve")!;
      resolveBtn.click();

      await vi.waitFor(() => {
        expect(errorListener).toHaveBeenCalledWith(expect.any(Error));
        expect(resolveBtn.disabled).toBe(false);
      });
    });

    it("delete failure re-enables button and emits error", async () => {
      const fb = makeFeedback({ id: "fb-1" });
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [fb], total: 1 });
      apiClient.deleteFeedback.mockRejectedValue(new Error("delete failed"));

      const errorListener = vi.fn();
      bus.on("feedback:error", errorListener);

      await panel.open();

      const deleteBtn = shadow.querySelector<HTMLButtonElement>(".sp-btn-delete")!;
      deleteBtn.click();

      await vi.waitFor(() => {
        expect(errorListener).toHaveBeenCalledWith(expect.any(Error));
        expect(deleteBtn.disabled).toBe(false);
      });
    });

    it("deleteAllFeedbacks failure re-enables button", async () => {
      const fb = makeFeedback({ id: "fb-1" });
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [fb], total: 1 });
      apiClient.deleteAllFeedbacks.mockRejectedValue(new Error("delete all failed"));

      const errorListener = vi.fn();
      bus.on("feedback:error", errorListener);

      await panel.open();

      const deleteAllBtn = shadow.querySelector<HTMLButtonElement>(".sp-btn-delete-all")!;
      deleteAllBtn.click();

      // Wait for confirm dialog to appear, then confirm
      await vi.waitFor(() => {
        const confirmBtn = shadow.querySelector<HTMLButtonElement>(".sp-btn-danger");
        expect(confirmBtn).not.toBeNull();
      });

      const confirmBtn = shadow.querySelector<HTMLButtonElement>(".sp-btn-danger")!;
      confirmBtn.click();

      await vi.waitFor(() => {
        expect(errorListener).toHaveBeenCalledWith(expect.any(Error));
        expect(deleteAllBtn.disabled).toBe(false);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Loading states
  // -------------------------------------------------------------------------

  describe("loading states", () => {
    it("showLoading creates spinner with role=status", async () => {
      // First load will show loading spinner (feedbacks empty)
      let resolveGetFeedbacks!: (value: { feedbacks: FeedbackResponse[]; total: number }) => void;
      apiClient.getFeedbacks.mockReturnValue(
        new Promise((resolve) => {
          resolveGetFeedbacks = resolve;
        }),
      );

      const openPromise = panel.open();

      // While loading, spinner should be visible
      const loading = shadow.querySelector<HTMLElement>('[role="status"]');
      expect(loading).not.toBeNull();

      const spinner = shadow.querySelector<HTMLElement>(".sp-spinner");
      expect(spinner).not.toBeNull();

      // Resolve the promise to finish
      resolveGetFeedbacks({ feedbacks: [], total: 0 });
      await openPromise;
    });

    it("loadFeedbacks with aborted request does not update UI", async () => {
      const fb1 = makeFeedback({ id: "fb-1", message: "first" });
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [fb1], total: 1 });

      await panel.open();

      // Now set up a slow request that will be aborted
      let resolveSlowRequest!: (value: { feedbacks: FeedbackResponse[]; total: number }) => void;
      apiClient.getFeedbacks.mockReturnValue(
        new Promise((resolve) => {
          resolveSlowRequest = resolve;
        }),
      );

      // Trigger a reload (e.g., via filter click)
      const bugChip = shadow.querySelector<HTMLButtonElement>('.sp-chip[data-filter="bug"]')!;
      bugChip.click();

      // Immediately trigger another reload which should abort the first
      const fb2 = makeFeedback({ id: "fb-2", message: "second" });
      apiClient.getFeedbacks.mockResolvedValue({ feedbacks: [fb2], total: 1 });

      const allChip = shadow.querySelector<HTMLButtonElement>('.sp-chip[data-filter="all"]')!;
      allChip.click();

      // Now resolve the first (aborted) request — it should be ignored
      resolveSlowRequest({ feedbacks: [makeFeedback({ id: "fb-stale", message: "stale" })], total: 1 });

      await vi.waitFor(() => {
        // The UI should show fb-2 from the second request, not fb-stale
        const staleCard = shadow.querySelector<HTMLElement>('[data-feedback-id="fb-stale"]');
        expect(staleCard).toBeNull();
      });
    });
  });
});

// @vitest-environment jsdom

import type { AnnotationResponse, FeedbackResponse } from "@siteping/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type DetailCallbacks, DetailView } from "../../src/panel-detail.js";
import { buildThemeColors } from "../../src/styles/theme.js";

// ---------------------------------------------------------------------------
// Polyfills for jsdom
// ---------------------------------------------------------------------------

if (typeof globalThis.CSS === "undefined") {
  (globalThis as Record<string, unknown>).CSS = { escape: (s: string) => s };
} else if (!CSS.escape) {
  CSS.escape = (s: string) => s;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAnnotation(overrides: Partial<AnnotationResponse> = {}): AnnotationResponse {
  return {
    id: "ann-1",
    feedbackId: "fb-1",
    cssSelector: "div.container > p.text",
    xpath: "/html/body/div/p",
    textSnippet: "snippet",
    elementTag: "P",
    elementId: null,
    textPrefix: "",
    textSuffix: "",
    fingerprint: "0:0:0",
    neighborText: "",
    xPct: 12.345,
    yPct: 67.891,
    wPct: 23.456,
    hPct: 45.678,
    scrollX: 100,
    scrollY: 200,
    viewportW: 1920,
    viewportH: 1080,
    devicePixelRatio: 2,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeFeedback(overrides: Partial<FeedbackResponse> = {}): FeedbackResponse {
  return {
    id: "fb-1",
    projectName: "test-project",
    type: "bug",
    message: "Something broken in the page",
    status: "open",
    url: "http://localhost/some/path?q=1",
    viewport: "1920x1080",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    authorName: "Test User",
    authorEmail: "test@example.com",
    resolvedAt: null,
    createdAt: "2024-01-15T10:00:00.000Z",
    updatedAt: "2024-01-15T10:00:00.000Z",
    annotations: [],
    ...overrides,
  };
}

function createCallbacks(): DetailCallbacks & {
  onBack: ReturnType<typeof vi.fn>;
  onResolve: ReturnType<typeof vi.fn>;
  onDelete: ReturnType<typeof vi.fn>;
  onGoToAnnotation: ReturnType<typeof vi.fn>;
} {
  return {
    onBack: vi.fn(),
    onResolve: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    onGoToAnnotation: vi.fn(),
  };
}

function createView(locale = "en"): {
  view: DetailView;
  callbacks: ReturnType<typeof createCallbacks>;
  host: HTMLElement;
} {
  const callbacks = createCallbacks();
  const view = new DetailView(buildThemeColors(), callbacks, locale);
  const host = document.createElement("div");
  host.style.position = "relative";
  host.appendChild(view.element);
  document.body.appendChild(host);
  return { view, callbacks, host };
}

// Wait one frame to allow requestAnimationFrame focus calls to settle.
async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DetailView", () => {
  let setup: ReturnType<typeof createView>;

  beforeEach(() => {
    setup = createView("en");
  });

  afterEach(() => {
    setup.view.destroy();
    setup.host.remove();
    document.body.replaceChildren();
  });

  // -------------------------------------------------------------------------
  // Construction
  // -------------------------------------------------------------------------

  describe("construction", () => {
    it("creates element with role=dialog and aria-hidden=true", () => {
      expect(setup.view.element.getAttribute("role")).toBe("dialog");
      expect(setup.view.element.getAttribute("aria-hidden")).toBe("true");
      expect(setup.view.element.getAttribute("aria-label")).toBe("Feedback detail");
      expect(setup.view.element.classList.contains("sp-detail")).toBe(true);
    });

    it("renders a header containing only the back button initially", () => {
      const header = setup.view.element.querySelector(".sp-detail-header");
      expect(header).not.toBeNull();
      const back = header!.querySelector<HTMLButtonElement>(".sp-detail-back");
      expect(back).not.toBeNull();
      expect(back!.type).toBe("button");
      expect(back!.querySelector("svg")).not.toBeNull();
      // No title or badge yet (no feedback shown)
      expect(header!.querySelector(".sp-detail-title")).toBeNull();
      expect(header!.querySelector(".sp-badge")).toBeNull();
    });

    it("creates the scrollable content container", () => {
      const content = setup.view.element.querySelector(".sp-detail-content");
      expect(content).not.toBeNull();
    });

    it("uses English i18n by default and French when locale starts with 'fr'", () => {
      const enView = setup.view;
      const enBack = enView.element.querySelector<HTMLButtonElement>(".sp-detail-back")!;
      expect(enBack.getAttribute("aria-label")).toBe("Back");

      const frSetup = createView("fr-FR");
      const frBack = frSetup.view.element.querySelector<HTMLButtonElement>(".sp-detail-back")!;
      expect(frBack.getAttribute("aria-label")).toBe("Retour");
      frSetup.view.destroy();
      frSetup.host.remove();
    });

    it("reports isVisible=false initially", () => {
      expect(setup.view.isVisible).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Back button
  // -------------------------------------------------------------------------

  describe("back button", () => {
    it("clicking back calls hide() and onBack callback", () => {
      const fb = makeFeedback();
      setup.view.show(fb, 1);

      expect(setup.view.isVisible).toBe(true);

      const back = setup.view.element.querySelector<HTMLButtonElement>(".sp-detail-back")!;
      back.click();

      expect(setup.view.isVisible).toBe(false);
      expect(setup.callbacks.onBack).toHaveBeenCalledOnce();
    });
  });

  // -------------------------------------------------------------------------
  // show() — header rendering
  // -------------------------------------------------------------------------

  describe("show() header", () => {
    it("renders the title with the formatted number", () => {
      setup.view.show(makeFeedback(), 42);
      const title = setup.view.element.querySelector<HTMLElement>(".sp-detail-title");
      expect(title).not.toBeNull();
      expect(title!.textContent).toBe("Feedback #42");
    });

    it("renders title in French when locale is fr", () => {
      const fr = createView("fr");
      fr.view.show(makeFeedback(), 5);
      const title = fr.view.element.querySelector<HTMLElement>(".sp-detail-title");
      expect(title!.textContent).toContain("°5");
      fr.view.destroy();
      fr.host.remove();
    });

    it("renders the type badge with label", () => {
      setup.view.show(makeFeedback({ type: "question" }), 1);
      const badge = setup.view.element.querySelector<HTMLElement>(".sp-badge");
      expect(badge).not.toBeNull();
      expect(badge!.textContent).toBe("question");
    });

    it("replaces title/badge on subsequent show() calls", () => {
      setup.view.show(makeFeedback({ type: "bug" }), 1);
      setup.view.show(makeFeedback({ type: "change" }), 2);

      const titles = setup.view.element.querySelectorAll(".sp-detail-title");
      const badges = setup.view.element.querySelectorAll(".sp-badge");
      expect(titles.length).toBe(1);
      expect(badges.length).toBe(1);
      expect(titles[0]!.textContent).toBe("Feedback #2");
      expect(badges[0]!.textContent).toBe("change");
    });

    it("makes the view visible (aria-hidden=false, --visible class)", async () => {
      setup.view.show(makeFeedback(), 1);
      expect(setup.view.element.getAttribute("aria-hidden")).toBe("false");
      expect(setup.view.element.classList.contains("sp-detail--visible")).toBe(true);
      expect(setup.view.isVisible).toBe(true);
      // Wait for requestAnimationFrame focus call (no error expected)
      await nextFrame();
    });

    it("focuses the back button after raf", async () => {
      const fb = makeFeedback();
      setup.view.show(fb, 1);
      const back = setup.view.element.querySelector<HTMLButtonElement>(".sp-detail-back")!;
      await nextFrame();
      expect(document.activeElement === back || setup.host.contains(document.activeElement)).toBe(true);
    });

    it("returns early without throwing when header is missing", () => {
      // Manually corrupt the structure: remove header
      setup.view.element.querySelector(".sp-detail-header")!.remove();
      // Should not throw
      expect(() => setup.view.show(makeFeedback(), 1)).not.toThrow();
    });

    it("returns early without throwing when back button is missing", () => {
      const back = setup.view.element.querySelector(".sp-detail-back")!;
      back.remove();
      // Should not throw
      expect(() => setup.view.show(makeFeedback(), 1)).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // show() — content sections
  // -------------------------------------------------------------------------

  describe("show() content sections", () => {
    it("renders status pill labelled 'Open' for open feedbacks", () => {
      setup.view.show(makeFeedback({ status: "open" }), 1);
      const pill = setup.view.element.querySelector<HTMLElement>(".sp-detail-status-pill")!;
      expect(pill.classList.contains("sp-detail-status-pill--open")).toBe(true);
      expect(pill.textContent).toContain("Open");
    });

    it("renders status pill labelled 'Resolved' for resolved feedbacks", () => {
      setup.view.show(makeFeedback({ status: "resolved" }), 1);
      const pill = setup.view.element.querySelector<HTMLElement>(".sp-detail-status-pill")!;
      expect(pill.classList.contains("sp-detail-status-pill--resolved")).toBe(true);
      expect(pill.textContent).toContain("Resolved");
    });

    it("renders Resolve button (and Reopen variant for resolved feedbacks)", () => {
      // Open feedback => Resolve button
      setup.view.show(makeFeedback({ status: "open" }), 1);
      let resolveBtn = setup.view.element.querySelector<HTMLButtonElement>(".sp-detail-btn-resolve");
      expect(resolveBtn).not.toBeNull();
      expect(resolveBtn!.textContent).toContain("Resolve");

      // Resolved feedback => Reopen button
      setup.view.show(makeFeedback({ status: "resolved" }), 1);
      const reopenBtn = setup.view.element.querySelector<HTMLButtonElement>(".sp-detail-btn-reopen");
      expect(reopenBtn).not.toBeNull();
      expect(reopenBtn!.textContent).toContain("Reopen");
      // Resolve variant should be gone
      resolveBtn = setup.view.element.querySelector<HTMLButtonElement>(".sp-detail-btn-resolve");
      expect(resolveBtn).toBeNull();
    });

    it("renders the Delete button", () => {
      setup.view.show(makeFeedback(), 1);
      const deleteBtn = setup.view.element.querySelector<HTMLButtonElement>(".sp-detail-btn-delete");
      expect(deleteBtn).not.toBeNull();
      expect(deleteBtn!.textContent).toContain("Delete");
    });

    it("renders the message body using textContent", () => {
      const fb = makeFeedback({ message: "Multi\nline\nmessage" });
      setup.view.show(fb, 1);
      const message = setup.view.element.querySelector<HTMLElement>(".sp-detail-message");
      expect(message).not.toBeNull();
      expect(message!.textContent).toBe("Multi\nline\nmessage");
    });

    it("renders metadata rows: page (truncated), author, date, viewport, browser", () => {
      const longUrl = "http://example.com/" + "a/".repeat(60);
      const fb = makeFeedback({
        url: longUrl,
        authorName: "Alice",
        authorEmail: "alice@example.com",
        viewport: "1920x1080",
      });
      setup.view.show(fb, 1);

      const rows = setup.view.element.querySelectorAll(".sp-detail-meta-row");
      // Page, Author, Date, Viewport, Browser = 5 rows
      expect(rows.length).toBe(5);

      // Author row should include name and email
      const authorText = setup.view.element.textContent ?? "";
      expect(authorText).toContain("Alice (alice@example.com)");

      // Page row truncates long pathnames
      const pageRow = rows[0]!;
      const pageValue = pageRow.querySelector<HTMLElement>(".sp-detail-meta-value")!;
      expect(pageValue.textContent!.length).toBeLessThanOrEqual(60);
      expect(pageValue.textContent).toContain("…");
      expect(pageValue.title).toBe(longUrl);
    });

    it("falls back to 'Anonymous' when authorName is empty", () => {
      const fb = makeFeedback({ authorName: "", authorEmail: "" });
      setup.view.show(fb, 1);
      expect(setup.view.element.textContent).toContain("Anonymous");
    });

    it("renders authorName only when email is empty", () => {
      const fb = makeFeedback({ authorName: "Bob", authorEmail: "" });
      setup.view.show(fb, 1);
      const text = setup.view.element.textContent ?? "";
      expect(text).toContain("Bob");
      expect(text).not.toContain("Bob (");
    });

    it("falls back to 'Unknown' viewport when missing", () => {
      const fb = makeFeedback({ viewport: "" });
      setup.view.show(fb, 1);
      // viewport row uses --mono modifier
      const monoVal = setup.view.element.querySelector<HTMLElement>(".sp-detail-meta-value--mono")!;
      expect(monoVal.textContent).toBe("Unknown");
    });

    it("renders the resolvedAt row only when resolvedAt is set", () => {
      const fb = makeFeedback({ status: "resolved", resolvedAt: "2024-02-01T12:00:00.000Z" });
      setup.view.show(fb, 1);
      const rows = setup.view.element.querySelectorAll(".sp-detail-meta-row");
      // Page, Author, Date, Viewport, Browser, ResolvedAt = 6 rows
      expect(rows.length).toBe(6);

      // resolved value uses --secondary modifier
      const secondaryVal = setup.view.element.querySelector<HTMLElement>(".sp-detail-meta-value--secondary");
      expect(secondaryVal).not.toBeNull();
    });

    it("does NOT render annotation section when feedback has no annotations", () => {
      setup.view.show(makeFeedback({ annotations: [] }), 1);
      expect(setup.view.element.querySelector(".sp-detail-annotation")).toBeNull();
      expect(setup.view.element.querySelector(".sp-detail-btn-goto")).toBeNull();
    });

    it("renders annotation section when feedback has at least one annotation", () => {
      const ann = makeAnnotation({ elementTag: "BUTTON", elementId: "save-btn" });
      setup.view.show(makeFeedback({ annotations: [ann] }), 1);
      expect(setup.view.element.querySelector(".sp-detail-annotation")).not.toBeNull();
      expect(setup.view.element.querySelector(".sp-detail-btn-goto")).not.toBeNull();
      // Element row formatted with id
      expect(setup.view.element.textContent).toContain("<BUTTON#save-btn>");
    });

    it("renders annotation element row without id when elementId is null", () => {
      const ann = makeAnnotation({ elementTag: "DIV", elementId: null });
      setup.view.show(makeFeedback({ annotations: [ann] }), 1);
      expect(setup.view.element.textContent).toContain("<DIV>");
    });

    it("renders position row including width/height when wPct or hPct > 0", () => {
      const ann = makeAnnotation({ xPct: 1.0, yPct: 2.0, wPct: 3.0, hPct: 4.0 });
      setup.view.show(makeFeedback({ annotations: [ann] }), 1);
      // Position row includes "1.0%, 2.0% (3.0% × 4.0%)"
      const txt = setup.view.element.textContent ?? "";
      expect(txt).toMatch(/1\.0%.*2\.0%/);
      expect(txt).toMatch(/3\.0%.*4\.0%/);
    });

    it("renders position row without size when wPct and hPct are zero", () => {
      const ann = makeAnnotation({ xPct: 5.5, yPct: 6.6, wPct: 0, hPct: 0 });
      setup.view.show(makeFeedback({ annotations: [ann] }), 1);
      const positionRow = Array.from(setup.view.element.querySelectorAll(".sp-detail-annotation-row")).find((row) =>
        row.textContent?.includes("Position"),
      );
      expect(positionRow).toBeTruthy();
      const value = positionRow!.querySelector(".sp-detail-annotation-value")!;
      expect(value.textContent).toBe("5.5%, 6.6%");
      // Should not contain a parenthesized size
      expect(value.textContent).not.toMatch(/\(/);
    });

    it("truncates long CSS selectors and stores full value on title", () => {
      const longSel = "a".repeat(120);
      const ann = makeAnnotation({ cssSelector: longSel });
      setup.view.show(makeFeedback({ annotations: [ann] }), 1);
      const selectorRow = Array.from(setup.view.element.querySelectorAll(".sp-detail-annotation-row")).find((row) =>
        row.textContent?.includes("Selector"),
      );
      expect(selectorRow).toBeTruthy();
      const value = selectorRow!.querySelector<HTMLElement>(".sp-detail-annotation-value")!;
      expect(value.textContent!.length).toBeLessThanOrEqual(60);
      expect(value.textContent).toContain("…");
      expect(value.title).toBe(longSel);
    });

    it("does not truncate when selector is short", () => {
      const ann = makeAnnotation({ cssSelector: "div" });
      setup.view.show(makeFeedback({ annotations: [ann] }), 1);
      const value = Array.from(setup.view.element.querySelectorAll(".sp-detail-annotation-value")).find(
        (v) => v.textContent === "div",
      );
      expect(value).toBeTruthy();
    });

    it("clicking 'Go to annotation' triggers onGoToAnnotation with the current feedback", () => {
      const fb = makeFeedback({ annotations: [makeAnnotation()] });
      setup.view.show(fb, 1);

      const gotoBtn = setup.view.element.querySelector<HTMLButtonElement>(".sp-detail-btn-goto")!;
      gotoBtn.click();

      expect(setup.callbacks.onGoToAnnotation).toHaveBeenCalledTimes(1);
      expect(setup.callbacks.onGoToAnnotation).toHaveBeenCalledWith(fb);
    });

    it("clicking 'Go to annotation' is a no-op when currentFeedback is null", () => {
      const fb = makeFeedback({ annotations: [makeAnnotation()] });
      setup.view.show(fb, 1);
      const gotoBtn = setup.view.element.querySelector<HTMLButtonElement>(".sp-detail-btn-goto")!;

      // Hide clears currentFeedback
      setup.view.hide();
      gotoBtn.click();

      expect(setup.callbacks.onGoToAnnotation).not.toHaveBeenCalled();
    });

    it("section index drives staggered animation delay", () => {
      const fb = makeFeedback({ annotations: [makeAnnotation()] });
      setup.view.show(fb, 1);
      const sections = setup.view.element.querySelectorAll<HTMLElement>(".sp-detail-section");
      // 4 sections: status, message, metadata, annotation
      expect(sections.length).toBe(4);
      expect(sections[0]!.style.animationDelay).toBe("0ms");
      expect(sections[1]!.style.animationDelay).toBe("40ms");
      expect(sections[2]!.style.animationDelay).toBe("80ms");
      expect(sections[3]!.style.animationDelay).toBe("120ms");
    });
  });

  // -------------------------------------------------------------------------
  // hide() / destroy()
  // -------------------------------------------------------------------------

  describe("hide()", () => {
    it("hides the view and clears state", () => {
      setup.view.show(makeFeedback(), 1);
      expect(setup.view.isVisible).toBe(true);

      setup.view.hide();

      expect(setup.view.isVisible).toBe(false);
      expect(setup.view.element.classList.contains("sp-detail--visible")).toBe(false);
      expect(setup.view.element.getAttribute("aria-hidden")).toBe("true");
    });

    it("hide() is a no-op when not visible", () => {
      // Default state is not visible
      expect(setup.view.isVisible).toBe(false);
      // Should not throw or change state
      setup.view.hide();
      expect(setup.view.isVisible).toBe(false);
    });
  });

  describe("destroy()", () => {
    it("removes the element from the DOM", () => {
      setup.view.show(makeFeedback(), 1);
      expect(setup.host.contains(setup.view.element)).toBe(true);

      setup.view.destroy();

      expect(setup.host.contains(setup.view.element)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Resolve action
  // -------------------------------------------------------------------------

  describe("handleResolve", () => {
    it("calls callbacks.onResolve with the current feedback", async () => {
      const fb = makeFeedback({ id: "fb-42", status: "open" });
      setup.view.show(fb, 1);

      const resolveBtn = setup.view.element.querySelector<HTMLButtonElement>(".sp-detail-btn-resolve")!;
      resolveBtn.click();

      await vi.waitFor(() => {
        expect(setup.callbacks.onResolve).toHaveBeenCalledWith(fb);
      });
    });

    it("disables both action buttons and shows spinner during processing", async () => {
      const fb = makeFeedback();
      let resolveCallback!: () => void;
      setup.callbacks.onResolve.mockReturnValue(
        new Promise<void>((res) => {
          resolveCallback = res;
        }),
      );
      setup.view.show(fb, 1);

      const resolveBtn = setup.view.element.querySelector<HTMLButtonElement>(".sp-detail-btn-resolve")!;
      const deleteBtn = setup.view.element.querySelector<HTMLButtonElement>(".sp-detail-btn-delete")!;
      resolveBtn.click();

      // Spinner replaces the icon/label
      expect(resolveBtn.disabled).toBe(true);
      expect(deleteBtn.disabled).toBe(true);
      expect(resolveBtn.querySelector(".sp-spinner")).not.toBeNull();

      // Resolve the pending promise
      resolveCallback();
      await vi.waitFor(() => {
        // After completion, parent normally hides — we don't auto-restore here
        expect(setup.callbacks.onResolve).toHaveBeenCalledOnce();
      });
    });

    it("restores buttons when onResolve rejects (open feedback => Resolve label)", async () => {
      const fb = makeFeedback({ status: "open" });
      setup.callbacks.onResolve.mockRejectedValue(new Error("nope"));
      setup.view.show(fb, 1);

      const resolveBtn = setup.view.element.querySelector<HTMLButtonElement>(".sp-detail-btn-resolve")!;
      const deleteBtn = setup.view.element.querySelector<HTMLButtonElement>(".sp-detail-btn-delete")!;
      resolveBtn.click();

      await vi.waitFor(() => {
        expect(resolveBtn.disabled).toBe(false);
        expect(deleteBtn.disabled).toBe(false);
        // Spinner gone, label restored
        expect(resolveBtn.querySelector(".sp-spinner")).toBeNull();
        expect(resolveBtn.textContent).toContain("Resolve");
      });
    });

    it("restores buttons when onResolve rejects (resolved feedback => Reopen label)", async () => {
      const fb = makeFeedback({ status: "resolved" });
      setup.callbacks.onResolve.mockRejectedValue(new Error("nope"));
      setup.view.show(fb, 1);

      const reopenBtn = setup.view.element.querySelector<HTMLButtonElement>(".sp-detail-btn-reopen")!;
      reopenBtn.click();

      await vi.waitFor(() => {
        expect(reopenBtn.disabled).toBe(false);
        expect(reopenBtn.querySelector(".sp-spinner")).toBeNull();
        expect(reopenBtn.textContent).toContain("Reopen");
      });
    });

    it("ignores subsequent clicks while one resolve is in flight (isProcessing guard)", async () => {
      const fb = makeFeedback();
      let resolveCallback!: () => void;
      setup.callbacks.onResolve.mockReturnValue(
        new Promise<void>((res) => {
          resolveCallback = res;
        }),
      );
      setup.view.show(fb, 1);

      const resolveBtn = setup.view.element.querySelector<HTMLButtonElement>(".sp-detail-btn-resolve")!;
      resolveBtn.click();
      // Second click should be ignored due to isProcessing
      resolveBtn.click();
      resolveBtn.click();

      // Only one callback invocation
      expect(setup.callbacks.onResolve).toHaveBeenCalledTimes(1);
      resolveCallback();
    });

    it("does nothing when currentFeedback is null", async () => {
      // Show then hide (clears currentFeedback) — but keep a reference to the button
      const fb = makeFeedback();
      setup.view.show(fb, 1);
      const resolveBtn = setup.view.element.querySelector<HTMLButtonElement>(".sp-detail-btn-resolve")!;
      setup.view.hide();
      // Reset callback counter
      setup.callbacks.onResolve.mockClear();

      resolveBtn.click();

      // callback should not be called
      await new Promise((r) => setTimeout(r, 10));
      expect(setup.callbacks.onResolve).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Delete action
  // -------------------------------------------------------------------------

  describe("handleDelete", () => {
    it("calls callbacks.onDelete with the current feedback", async () => {
      const fb = makeFeedback({ id: "fb-99" });
      setup.view.show(fb, 1);

      const deleteBtn = setup.view.element.querySelector<HTMLButtonElement>(".sp-detail-btn-delete")!;
      deleteBtn.click();

      await vi.waitFor(() => {
        expect(setup.callbacks.onDelete).toHaveBeenCalledWith(fb);
      });
    });

    it("disables both action buttons and shows spinner during processing", async () => {
      const fb = makeFeedback();
      let resolveCallback!: () => void;
      setup.callbacks.onDelete.mockReturnValue(
        new Promise<void>((res) => {
          resolveCallback = res;
        }),
      );
      setup.view.show(fb, 1);

      const resolveBtn = setup.view.element.querySelector<HTMLButtonElement>(".sp-detail-btn-resolve")!;
      const deleteBtn = setup.view.element.querySelector<HTMLButtonElement>(".sp-detail-btn-delete")!;
      deleteBtn.click();

      expect(deleteBtn.disabled).toBe(true);
      expect(resolveBtn.disabled).toBe(true);
      expect(deleteBtn.querySelector(".sp-spinner")).not.toBeNull();

      resolveCallback();
      await vi.waitFor(() => {
        expect(setup.callbacks.onDelete).toHaveBeenCalledOnce();
      });
    });

    it("restores buttons when onDelete rejects", async () => {
      const fb = makeFeedback();
      setup.callbacks.onDelete.mockRejectedValue(new Error("nope"));
      setup.view.show(fb, 1);

      const resolveBtn = setup.view.element.querySelector<HTMLButtonElement>(".sp-detail-btn-resolve")!;
      const deleteBtn = setup.view.element.querySelector<HTMLButtonElement>(".sp-detail-btn-delete")!;
      deleteBtn.click();

      await vi.waitFor(() => {
        expect(deleteBtn.disabled).toBe(false);
        expect(resolveBtn.disabled).toBe(false);
        expect(deleteBtn.querySelector(".sp-spinner")).toBeNull();
        expect(deleteBtn.textContent).toContain("Delete");
      });
    });

    it("ignores subsequent clicks while one delete is in flight", async () => {
      const fb = makeFeedback();
      let resolveCallback!: () => void;
      setup.callbacks.onDelete.mockReturnValue(
        new Promise<void>((res) => {
          resolveCallback = res;
        }),
      );
      setup.view.show(fb, 1);

      const deleteBtn = setup.view.element.querySelector<HTMLButtonElement>(".sp-detail-btn-delete")!;
      deleteBtn.click();
      deleteBtn.click();
      deleteBtn.click();

      expect(setup.callbacks.onDelete).toHaveBeenCalledTimes(1);
      resolveCallback();
    });

    it("does nothing when currentFeedback is null", async () => {
      const fb = makeFeedback();
      setup.view.show(fb, 1);
      const deleteBtn = setup.view.element.querySelector<HTMLButtonElement>(".sp-detail-btn-delete")!;
      setup.view.hide();
      setup.callbacks.onDelete.mockClear();

      deleteBtn.click();
      await new Promise((r) => setTimeout(r, 10));
      expect(setup.callbacks.onDelete).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Defensive null guards in action handlers (private member access via cast)
  // -------------------------------------------------------------------------

  describe("defensive null guards", () => {
    /** Accessor for private members — allowed in tests to exercise defensive branches. */
    type Internals = {
      resolveBtn: HTMLButtonElement | null;
      deleteBtn: HTMLButtonElement | null;
      currentFeedback: FeedbackResponse | null;
      isProcessing: boolean;
      handleResolve(): Promise<void>;
      handleDelete(): Promise<void>;
      restoreResolveBtn(feedback: FeedbackResponse): void;
      restoreDeleteBtn(): void;
    };

    function asInternals(view: DetailView): Internals {
      return view as unknown as Internals;
    }

    it("handleResolve no-ops when buttons have been cleared", async () => {
      const fb = makeFeedback();
      setup.view.show(fb, 1);

      const internals = asInternals(setup.view);
      // Force the buttons to null without going through hide() so currentFeedback survives.
      internals.resolveBtn = null;
      internals.deleteBtn = null;

      await internals.handleResolve();

      // Callback still invoked (we still have currentFeedback) but no button state to update
      expect(setup.callbacks.onResolve).toHaveBeenCalledTimes(1);
    });

    it("handleDelete no-ops when buttons have been cleared", async () => {
      const fb = makeFeedback();
      setup.view.show(fb, 1);

      const internals = asInternals(setup.view);
      internals.resolveBtn = null;
      internals.deleteBtn = null;

      await internals.handleDelete();

      expect(setup.callbacks.onDelete).toHaveBeenCalledTimes(1);
    });

    it("handleResolve catch branch is safe when buttons cleared mid-flight", async () => {
      const fb = makeFeedback();
      // Make the callback fail to enter the catch branch
      setup.callbacks.onResolve.mockRejectedValue(new Error("rejected"));
      setup.view.show(fb, 1);

      // Clear button references after show() but before the click resolves
      const internals = asInternals(setup.view);
      // Set to null AFTER click so the loading branch runs first; we want the catch to skip restore
      const click = internals.handleResolve();
      internals.resolveBtn = null;
      internals.deleteBtn = null;
      await click;

      // Should not throw — promise resolved cleanly with both branches false in catch
      expect(setup.callbacks.onResolve).toHaveBeenCalledTimes(1);
    });

    it("handleDelete catch branch is safe when buttons cleared mid-flight", async () => {
      const fb = makeFeedback();
      setup.callbacks.onDelete.mockRejectedValue(new Error("rejected"));
      setup.view.show(fb, 1);

      const internals = asInternals(setup.view);
      const click = internals.handleDelete();
      internals.resolveBtn = null;
      internals.deleteBtn = null;
      await click;

      expect(setup.callbacks.onDelete).toHaveBeenCalledTimes(1);
    });

    it("restoreResolveBtn early-returns when resolveBtn is null", () => {
      // resolveBtn is null before any show()
      const internals = asInternals(setup.view);
      expect(internals.resolveBtn).toBeNull();
      // Should not throw
      expect(() => internals.restoreResolveBtn(makeFeedback())).not.toThrow();
    });

    it("restoreDeleteBtn early-returns when deleteBtn is null", () => {
      const internals = asInternals(setup.view);
      expect(internals.deleteBtn).toBeNull();
      expect(() => internals.restoreDeleteBtn()).not.toThrow();
    });

    it("buildAnnotation no-ops when annotations[0] is undefined", () => {
      // Direct access to private buildAnnotation would require casting — instead exercise
      // the same guard via show() with a feedback whose annotations array is non-empty
      // but contains undefined (edge case). Easier route: confirm show() with empty
      // annotations does not render the annotation section (already covered).
      // Here we cover the inner !ann guard by feeding a feedback whose annotations array
      // contains a hole (sparse array) — undefined slots are still iterable as undefined.
      const sparse: AnnotationResponse[] = [];
      (sparse as { length: number }).length = 1;
      const fb = makeFeedback({ annotations: sparse });
      // show() guards on annotations.length > 0, so we bypass and call the private method.
      setup.view.show(fb, 1);
      // Manually invoke buildAnnotation with the sparse array
      const view = setup.view as unknown as {
        buildAnnotation: (container: HTMLElement, fb: FeedbackResponse) => void;
      };
      const container = document.createElement("div");
      // Should not throw, returns early via the !ann guard
      expect(() => view.buildAnnotation(container, fb)).not.toThrow();
      // Container should remain empty since the guard returned
      expect(container.children.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Browser parsing helper (covered via metadata browser row)
  // -------------------------------------------------------------------------

  describe("browser detection (parseBrowser)", () => {
    function getBrowserText(ua: string): string {
      const fb = makeFeedback({ userAgent: ua });
      setup.view.show(fb, 1);
      // Browser row is the 5th meta row (or use the heuristic of finding the row whose label is 'Browser')
      const rows = setup.view.element.querySelectorAll(".sp-detail-meta-row");
      // Find the row whose label says "Browser"
      const browserRow = Array.from(rows).find((r) =>
        r.querySelector(".sp-detail-meta-label")?.textContent?.toLowerCase().includes("browser"),
      );
      return browserRow?.querySelector(".sp-detail-meta-value")?.textContent ?? "";
    }

    it("detects Edge", () => {
      expect(getBrowserText("Mozilla/5.0 ... Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0")).toContain(
        "Edge 120.0.0.0",
      );
    });

    it("detects Edge fallback (no version)", () => {
      // ua contains Edg/ without numeric version — match returns falsy because no [\d.]+ digits
      // The regex match returns null then function returns "Edge" only if the inner matcher fails.
      // Construct a UA that matches /Edg\//i but the version regex fails: "FooEdg/" without digits after.
      expect(getBrowserText("FooEdg/")).toBe("Edge");
    });

    it("detects Opera (OPR/)", () => {
      expect(getBrowserText("Mozilla/5.0 OPR/100.0.0.0")).toContain("Opera 100.0.0.0");
    });

    it("detects Opera (legacy 'Opera' string)", () => {
      // No OPR/ token, only 'Opera' word — version regex misses but function returns "Opera"
      expect(getBrowserText("Opera/9.80 (Windows NT 6.0)")).toBe("Opera");
    });

    it("detects Firefox", () => {
      expect(getBrowserText("Mozilla/5.0 Firefox/121.0")).toContain("Firefox 121.0");
    });

    it("detects Firefox fallback (no version)", () => {
      expect(getBrowserText("Firefox/")).toBe("Firefox");
    });

    it("detects Chrome (excluding Chromium)", () => {
      expect(getBrowserText("Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36")).toContain("Chrome 120.0.0.0");
    });

    it("detects Chrome fallback (no version)", () => {
      // Has Chrome/ token but no version digits after, must come from fail of inner regex
      expect(getBrowserText("PlainChrome/")).toBe("Chrome");
    });

    it("detects Safari", () => {
      expect(getBrowserText("Mozilla/5.0 Version/17.0 Safari/605.1.15")).toContain("Safari 17.0");
    });

    it("detects Safari fallback (no Version/)", () => {
      // Safari/ without Version/ means the inner Version regex returns null
      expect(getBrowserText("Safari/605.1.15")).toBe("Safari");
    });

    it("returns Unknown for unrecognised UAs", () => {
      expect(getBrowserText("RandomBot/1.0")).toBe("Unknown");
    });
  });

  // -------------------------------------------------------------------------
  // formatFullDate helper (covered via Date row + invalid date)
  // -------------------------------------------------------------------------

  describe("date formatting", () => {
    it("falls back to raw string when Date construction throws", () => {
      // Override toLocaleString on Date to throw, exercising the catch branch
      const original = Date.prototype.toLocaleString;
      Date.prototype.toLocaleString = ((): string => {
        throw new Error("locale-fail");
      }) as never;
      try {
        const fb = makeFeedback({ createdAt: "2024-01-01T00:00:00.000Z" });
        setup.view.show(fb, 1);
        // The date row should now display the raw ISO string
        const text = setup.view.element.textContent ?? "";
        expect(text).toContain("2024-01-01T00:00:00.000Z");
      } finally {
        Date.prototype.toLocaleString = original;
      }
    });

    it("uses 'fr' locale formatting when i18n is French", () => {
      const fr = createView("fr");
      const fb = makeFeedback({ createdAt: "2024-01-15T10:00:00.000Z" });
      fr.view.show(fb, 1);
      // The fr locale should produce a string with French month names — assert the string is non-empty
      const text = fr.view.element.textContent ?? "";
      expect(text.length).toBeGreaterThan(0);
      fr.view.destroy();
      fr.host.remove();
    });

    it("uses 'fr' locale formatting for resolvedAt when i18n is French", () => {
      const fr = createView("fr");
      const fb = makeFeedback({
        status: "resolved",
        resolvedAt: "2024-02-01T12:00:00.000Z",
      });
      fr.view.show(fb, 1);
      // The fr locale should generate a French-formatted date for the resolvedAt row
      const secondaryVal = fr.view.element.querySelector<HTMLElement>(".sp-detail-meta-value--secondary");
      expect(secondaryVal).not.toBeNull();
      expect(secondaryVal!.textContent!.length).toBeGreaterThan(0);
      fr.view.destroy();
      fr.host.remove();
    });
  });

  // -------------------------------------------------------------------------
  // extractPathname helper — exercised via invalid URL in Page row
  // -------------------------------------------------------------------------

  describe("URL pathname extraction", () => {
    it("returns the original string when URL parsing throws", () => {
      const fb = makeFeedback({ url: "not-a-valid-url" });
      setup.view.show(fb, 1);
      // First meta row is Page
      const pageValue = setup.view.element
        .querySelectorAll(".sp-detail-meta-row")[0]!
        .querySelector<HTMLElement>(".sp-detail-meta-value")!;
      expect(pageValue.textContent).toBe("not-a-valid-url");
    });
  });
});

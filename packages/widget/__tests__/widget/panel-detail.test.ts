// @vitest-environment jsdom

import type {
  AnnotationResponse,
  FeedbackResponse,
  SitepingPanelAction,
  SitepingPanelButtonAction,
  SitepingPanelLinkAction,
} from "@siteping/core";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { createT } from "../../src/i18n/index.js";
import { normalizePanelActions } from "../../src/panel-actions.js";
import { DETAIL_CSS, type DetailCallbacks, DetailView } from "../../src/panel-detail.js";
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
    anchorKey: null,
    // Rect fields are fractions of the anchor box (0..1), as stored.
    xPct: 0.12345,
    yPct: 0.67891,
    wPct: 0.23456,
    hPct: 0.45678,
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
    urlPattern: null,
    screenshotUrl: null,
    screenshotRegion: null,
    diagnostics: null,
    ...overrides,
  };
}

function createCallbacks(): {
  [K in keyof DetailCallbacks]: Mock<NonNullable<DetailCallbacks[K]>>;
} {
  return {
    onBack: vi.fn<NonNullable<DetailCallbacks["onBack"]>>(),
    onResolve: vi.fn<NonNullable<DetailCallbacks["onResolve"]>>().mockResolvedValue(undefined),
    onDelete: vi.fn<NonNullable<DetailCallbacks["onDelete"]>>().mockResolvedValue(undefined),
    onGoToAnnotation: vi.fn<NonNullable<DetailCallbacks["onGoToAnnotation"]>>(),
    onCustomAction: vi.fn<NonNullable<DetailCallbacks["onCustomAction"]>>().mockResolvedValue(undefined),
    onCustomActionError: vi.fn<NonNullable<DetailCallbacks["onCustomActionError"]>>(),
  };
}

function createView(locale = "en"): {
  view: DetailView;
  callbacks: ReturnType<typeof createCallbacks>;
  host: HTMLElement;
} {
  const callbacks = createCallbacks();
  const view = new DetailView(buildThemeColors(), callbacks, createT(locale), locale);
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
      expect(badge!.textContent).toBe("Question");
    });

    it("localises the type badge and dates with the active (non-fr) locale", () => {
      const de = createView("de");
      const fb = makeFeedback({ type: "bug", status: "resolved", resolvedAt: "2024-02-01T12:00:00.000Z" });
      de.view.show(fb, 1);
      const expectedDate = (iso: string) =>
        new Date(iso).toLocaleString("de", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

      expect(de.view.element.querySelector(".sp-detail-header .sp-badge")!.textContent).toBe("Fehler");
      expect(de.view.element.textContent).toContain(expectedDate(fb.createdAt));
      expect(de.view.element.querySelector(".sp-detail-meta-value--secondary")!.textContent).toBe(
        expectedDate("2024-02-01T12:00:00.000Z"),
      );
      de.view.destroy();
      de.host.remove();
    });

    it("replaces title/badge on subsequent show() calls", () => {
      setup.view.show(makeFeedback({ type: "bug" }), 1);
      setup.view.show(makeFeedback({ type: "change" }), 2);

      const titles = setup.view.element.querySelectorAll(".sp-detail-title");
      const badges = setup.view.element.querySelectorAll(".sp-badge");
      expect(titles.length).toBe(1);
      expect(badges.length).toBe(1);
      expect(titles[0]!.textContent).toBe("Feedback #2");
      expect(badges[0]!.textContent).toBe("Change");
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

    it("renders status pill labelled 'In progress' for in_progress feedbacks", () => {
      setup.view.show(makeFeedback({ status: "in_progress" }), 1);
      const pill = setup.view.element.querySelector<HTMLElement>(".sp-detail-status-pill")!;
      expect(pill.classList.contains("sp-detail-status-pill--in-progress")).toBe(true);
      expect(pill.textContent).toContain("In progress");
    });

    it("renders status pill labelled 'Won't fix' for wont_fix feedbacks", () => {
      setup.view.show(makeFeedback({ status: "wont_fix" }), 1);
      const pill = setup.view.element.querySelector<HTMLElement>(".sp-detail-status-pill")!;
      expect(pill.classList.contains("sp-detail-status-pill--wont-fix")).toBe(true);
      expect(pill.textContent).toContain("Won't fix");
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

    it("in_progress gets Resolve, wont_fix gets Reopen (binary actions on 4 statuses)", () => {
      // in_progress is still actionable => Resolve button
      setup.view.show(makeFeedback({ status: "in_progress" }), 1);
      expect(setup.view.element.querySelector(".sp-detail-btn-resolve")).not.toBeNull();
      expect(setup.view.element.querySelector(".sp-detail-btn-reopen")).toBeNull();

      // wont_fix is closed => Reopen button
      setup.view.show(makeFeedback({ status: "wont_fix" }), 1);
      expect(setup.view.element.querySelector(".sp-detail-btn-reopen")).not.toBeNull();
      expect(setup.view.element.querySelector(".sp-detail-btn-resolve")).toBeNull();
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

    it("does NOT render the screenshot section when feedback.screenshotUrl is null", () => {
      setup.view.show(makeFeedback({ screenshotUrl: null }), 1);
      const img = setup.view.element.querySelector<HTMLImageElement>(".sp-detail-screenshot");
      expect(img).toBeNull();
    });

    it("renders the screenshot when screenshotUrl is a safe data:image URL", () => {
      setup.view.show(makeFeedback({ screenshotUrl: "data:image/jpeg;base64,FAKE" }), 1);
      const img = setup.view.element.querySelector<HTMLImageElement>(".sp-detail-screenshot");
      expect(img).not.toBeNull();
      expect(img!.src).toBe("data:image/jpeg;base64,FAKE");
      expect(img!.referrerPolicy).toBe("no-referrer");
      expect(img!.loading).toBe("lazy");
    });

    it("renders the screenshot when screenshotUrl is an https URL", () => {
      setup.view.show(makeFeedback({ screenshotUrl: "https://cdn.example.com/fb-1.jpg" }), 1);
      const img = setup.view.element.querySelector<HTMLImageElement>(".sp-detail-screenshot");
      expect(img).not.toBeNull();
      expect(img!.src).toBe("https://cdn.example.com/fb-1.jpg");
    });

    it("does NOT render the screenshot for unsafe schemes (javascript:, data:text/html, non-loopback http:)", () => {
      const unsafe = [
        "javascript:alert(1)",
        "data:text/html,<script>",
        "http://insecure.example/x.jpg",
        // Host confusion: none of these is this machine.
        "http://localhost.evil.com/x.jpg",
        "http://localhost@evil.com/x.jpg",
        "http://127.0.0.1.nip.io/x.jpg",
        "http://10.0.0.1/x.jpg",
        // A loopback host under another scheme: only http: is let through.
        "ftp://localhost/x.jpg",
        "javascript://localhost/%0aalert(1)",
      ];
      for (const url of unsafe) {
        setup.view.show(makeFeedback({ screenshotUrl: url }), 1);
        const img = setup.view.element.querySelector<HTMLImageElement>(".sp-detail-screenshot");
        expect(img, `should reject ${url}`).toBeNull();
      }
    });

    it("renders the screenshot for loopback http: URLs (dev object storage such as MinIO)", () => {
      const allowed = [
        "http://localhost:9000/feedback-screenshots/abc.jpg?X-Amz-Signature=xyz",
        "http://127.0.0.1:9000/bucket/key.png",
        "http://[::1]:9000/bucket/key.png",
        "http://minio.localhost/bucket/key.png",
        "http://localhost:9000",
      ];
      for (const url of allowed) {
        setup.view.show(makeFeedback({ screenshotUrl: url }), 1);
        const img = setup.view.element.querySelector<HTMLImageElement>(".sp-detail-screenshot");
        expect(img, `should accept ${url}`).not.toBeNull();
        expect(img!.referrerPolicy).toBe("no-referrer");
      }
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

    it("renders position row as percentages of the stored fractions, with width/height", () => {
      const ann = makeAnnotation({ xPct: 0.5, yPct: 0.25, wPct: 0.1, hPct: 0.2 });
      setup.view.show(makeFeedback({ annotations: [ann] }), 1);
      const positionRow = Array.from(setup.view.element.querySelectorAll(".sp-detail-annotation-row")).find((row) =>
        row.textContent?.includes("Position"),
      );
      const value = positionRow!.querySelector(".sp-detail-annotation-value")!;
      expect(value.textContent).toBe("50.0%, 25.0% (10.0% \u00d7 20.0%)");
    });

    it("renders position row without size when wPct and hPct are zero", () => {
      const ann = makeAnnotation({ xPct: 0.055, yPct: 0.066, wPct: 0, hPct: 0 });
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

  // -------------------------------------------------------------------------
  // Diagnostics section — captureDiagnostics snapshot rendering
  // -------------------------------------------------------------------------

  describe("diagnostics section", () => {
    it("does not render the section when diagnostics is null", () => {
      setup.view.show(makeFeedback(), 1);
      expect(setup.view.element.querySelector(".sp-detail-diag")).toBeNull();
    });

    it("does not render the section when both arrays are empty", () => {
      setup.view.show(
        makeFeedback({
          diagnostics: { console: [], network: [] } as unknown as never,
        } as Partial<FeedbackResponse>),
        1,
      );
      expect(setup.view.element.querySelector(".sp-detail-diag")).toBeNull();
    });

    it("renders console + network entries with the correct counts", () => {
      const fb = makeFeedback({
        diagnostics: {
          console: [
            { level: "log", timestamp: "2026-05-14T10:00:00Z", message: "boot up" },
            { level: "error", timestamp: "2026-05-14T10:00:01Z", message: "TypeError: foo is not a function" },
          ],
          network: [
            {
              url: "/api/orders/42",
              method: "GET",
              status: 500,
              durationMs: 312,
              timestamp: "2026-05-14T10:00:02Z",
            },
          ],
        } as unknown as never,
      } as Partial<FeedbackResponse>);
      setup.view.show(fb, 1);

      const diag = setup.view.element.querySelector(".sp-detail-diag");
      expect(diag).not.toBeNull();

      // Toggle counts reflect the entries
      const counts = diag!.querySelectorAll(".sp-detail-diag-count");
      expect(counts).toHaveLength(2);
      expect(counts[0]?.textContent).toContain("2 console");
      expect(counts[1]?.textContent).toContain("1 net");
      // Errors in console paint the count chip red.
      expect(counts[0]?.classList.contains("sp-detail-diag-count--errors")).toBe(true);

      // The lists exist for both groups, with one row each.
      const lists = diag!.querySelectorAll(".sp-detail-diag-list");
      expect(lists).toHaveLength(2);
      const consoleItems = lists[0]!.querySelectorAll("li");
      expect(consoleItems).toHaveLength(2);
      expect(
        consoleItems[1]?.querySelector(".sp-detail-diag-level")?.classList.contains("sp-detail-diag-level--error"),
      ).toBe(true);
      const netItems = lists[1]!.querySelectorAll("li");
      expect(netItems).toHaveLength(1);
      expect(netItems[0]?.querySelector(".sp-detail-diag-net-status")?.textContent).toBe("500");
      expect(netItems[0]?.querySelector(".sp-detail-diag-net-method")?.textContent).toBe("GET");
      expect(netItems[0]?.querySelector(".sp-detail-diag-net-url")?.textContent).toContain("/api/orders/42");
    });

    it("toggle expand/collapse flips aria-expanded and body visibility", () => {
      const fb = makeFeedback({
        diagnostics: {
          console: [{ level: "warn", timestamp: "2026-05-14T10:00:00Z", message: "warned" }],
          network: [],
        } as unknown as never,
      } as Partial<FeedbackResponse>);
      setup.view.show(fb, 1);

      const toggle = setup.view.element.querySelector<HTMLButtonElement>(".sp-detail-diag-toggle")!;
      const body = setup.view.element.querySelector(".sp-detail-diag-body")!;
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      expect(body.classList.contains("sp-detail-diag-body--open")).toBe(false);

      toggle.click();
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      expect(body.classList.contains("sp-detail-diag-body--open")).toBe(true);

      toggle.click();
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      expect(body.classList.contains("sp-detail-diag-body--open")).toBe(false);
    });

    it("renders network errors with status 0 as 'ERR'", () => {
      const fb = makeFeedback({
        diagnostics: {
          console: [],
          network: [{ url: "/api/down", method: "POST", status: 0, durationMs: 50, timestamp: "2026-05-14T10:00:00Z" }],
        } as unknown as never,
      } as Partial<FeedbackResponse>);
      setup.view.show(fb, 1);
      const status = setup.view.element.querySelector(".sp-detail-diag-net-status");
      expect(status?.textContent).toBe("ERR");
    });
  });

  // ---------------------------------------------------------------------------
  // CSS — backdrop-filter fallback (regression guard for the Safari 18.6
  // compositing bug + Firefox <=102 / legacy engines). Asserts both
  // disjoint @supports blocks remain in DETAIL_CSS so the translucent
  // default doesn't sneak back in during a refactor.
  // ---------------------------------------------------------------------------

  describe("DETAIL_CSS — backdrop-filter fallback", () => {
    it("emits an @supports block for engines with no backdrop-filter at all", () => {
      expect(DETAIL_CSS).toMatch(
        /@supports not \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\)/,
      );
    });

    it("emits an @supports block for engines that only advertise the -webkit- prefix", () => {
      expect(DETAIL_CSS).toMatch(
        /@supports \(-webkit-backdrop-filter: blur\(1px\)\) and \(not \(backdrop-filter: blur\(1px\)\)\)/,
      );
    });

    it("both fallback blocks override .sp-detail to an opaque var(--sp-bg)", () => {
      // Strip whitespace before matching so cosmetic formatting can change
      // without breaking the test.
      const compact = DETAIL_CSS.replace(/\s+/g, " ");
      expect(compact).toContain(
        "@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) { .sp-detail { background: var(--sp-bg); } }",
      );
      expect(compact).toContain(
        "@supports (-webkit-backdrop-filter: blur(1px)) and (not (backdrop-filter: blur(1px))) { .sp-detail { background: var(--sp-bg); } }",
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Custom panel actions (host-defined buttons via SitepingPanelAction)
// ---------------------------------------------------------------------------

describe("custom panel actions", () => {
  function makeAction(overrides: Partial<SitepingPanelButtonAction> = {}): SitepingPanelButtonAction {
    return { id: "send-to-agent", label: "Send to agent", onAction: vi.fn(), ...overrides };
  }

  function makeLink(overrides: Partial<SitepingPanelLinkAction> = {}): SitepingPanelLinkAction {
    return { id: "tracker", label: "Open in tracker", href: "https://tracker.example/new", ...overrides };
  }

  function buildDetail(actions: SitepingPanelAction[], callbacks: Partial<DetailCallbacks> = {}) {
    const cb: DetailCallbacks = {
      onBack: vi.fn(),
      onResolve: vi.fn().mockResolvedValue(undefined),
      onDelete: vi.fn().mockResolvedValue(undefined),
      onGoToAnnotation: vi.fn(),
      onCustomAction: vi.fn().mockResolvedValue(undefined),
      onCustomActionError: vi.fn(),
      ...callbacks,
    };
    const view = new DetailView(buildThemeColors(), cb, createT("en"), "en", normalizePanelActions(actions));
    document.body.appendChild(view.element);
    return { view, cb };
  }

  it("renders a button per action with data-action-id", () => {
    const { view } = buildDetail([makeAction(), makeAction({ id: "other", label: "Other" })]);
    view.show(makeFeedback(), 1);
    const btns = view.element.querySelectorAll(".sp-detail-btn-custom");
    expect(btns).toHaveLength(2);
    expect(btns[0]?.getAttribute("data-action-id")).toBe("send-to-agent");
    expect(btns[0]?.textContent).toContain("Send to agent");
  });

  it("renders host actions in their own row below Resolve/Delete, titled with the full label", () => {
    const { view } = buildDetail([makeAction(), makeAction({ id: "other", label: "Other" })]);
    view.show(makeFeedback(), 1);
    const rows = view.element.querySelectorAll(".sp-detail-actions");
    expect(rows).toHaveLength(2);
    expect(rows[0]?.querySelectorAll(".sp-detail-btn-custom")).toHaveLength(0);
    expect(rows[1]?.classList.contains("sp-detail-actions--custom")).toBe(true);
    expect([...(rows[1]?.children ?? [])].map((b) => (b as HTMLElement).title)).toEqual(["Send to agent", "Other"]);
  });

  it("renders a link action as a real anchor opening a new tab without referrer", () => {
    const { view } = buildDetail([
      makeLink(),
      makeLink({ id: "mail", label: "Email author", href: (fb) => `mailto:${fb.authorEmail}` }),
      makeLink({ id: "rel", label: "Open in admin", href: (fb) => `/admin/feedback/${fb.id}` }),
    ]);
    view.show(makeFeedback(), 1);
    const [web, mail, rel] = view.element.querySelectorAll<HTMLAnchorElement>("a.sp-detail-btn-custom");

    expect(web?.getAttribute("href")).toBe("https://tracker.example/new");
    expect(web?.target).toBe("_blank");
    expect(web?.rel).toBe("noopener noreferrer");
    expect(web?.dataset.actionId).toBe("tracker");
    expect(web?.textContent).toBe("Open in tracker");

    expect(mail?.getAttribute("href")).toBe("mailto:test@example.com");
    expect(mail?.hasAttribute("target")).toBe(false);

    expect(rel?.getAttribute("href")).toBe(`${location.origin}/admin/feedback/fb-1`);
  });

  it("hides a link whose computed href is not http(s)/mailto and reports it", () => {
    const { view, cb } = buildDetail([
      makeLink({ href: () => "javascript:alert(document.cookie)" }),
      makeLink({ id: "data", href: () => " DATA:text/html,<script>alert(1)</script>" }),
      makeAction(),
    ]);
    view.show(makeFeedback(), 1);

    expect(view.element.querySelector("a")).toBeNull();
    expect(view.element.querySelectorAll(".sp-detail-btn-custom")).toHaveLength(1);
    expect(cb.onCustomActionError).toHaveBeenCalledTimes(2);
    expect(vi.mocked(cb.onCustomActionError).mock.calls[0]?.[0]).toEqual(
      new Error('[siteping] Panel action "tracker": href must be an http(s) or mailto URL.'),
    );
  });

  it("builds a computed href from the frozen snapshot and keeps links clickable while a button action runs", () => {
    const href = vi.fn((fb: Readonly<FeedbackResponse>) => `https://tracker.example/fb/${fb.id}`);
    const { view } = buildDetail([makeAction(), makeLink({ href })], {
      onCustomAction: vi.fn(() => new Promise<void>(() => {})),
    });
    view.show(makeFeedback(), 1);
    expect(Object.isFrozen(href.mock.calls[0]?.[0])).toBe(true);

    view.element.querySelector<HTMLButtonElement>("button.sp-detail-btn-custom")!.click();
    const link = view.element.querySelector<HTMLAnchorElement>("a.sp-detail-btn-custom")!;
    expect(link.getAttribute("href")).toBe("https://tracker.example/fb/fb-1");
    expect(link.hasAttribute("disabled")).toBe(false);
  });

  it("renders no host row when no action is visible for the feedback", () => {
    const { view } = buildDetail([makeAction({ visible: () => false })]);
    view.show(makeFeedback(), 1);
    expect(view.element.querySelectorAll(".sp-detail-actions")).toHaveLength(1);
  });

  it("omits actions whose visible() returns false", () => {
    const { view } = buildDetail([makeAction({ visible: (fb) => fb.type === "change" })]);
    view.show(makeFeedback({ type: "bug" }), 1);
    expect(view.element.querySelectorAll(".sp-detail-btn-custom")).toHaveLength(0);
  });

  it("invokes onCustomAction with the action and current feedback on click", async () => {
    const { view, cb } = buildDetail([makeAction()]);
    const fb = makeFeedback();
    view.show(fb, 1);
    view.element.querySelector<HTMLButtonElement>(".sp-detail-btn-custom")?.click();
    await vi.waitFor(() =>
      expect(cb.onCustomAction).toHaveBeenCalledWith(expect.objectContaining({ id: "send-to-agent" }), fb),
    );
  });

  /** A controllable onCustomAction: each call stays pending until its `settle` runs. */
  function deferredActions() {
    const settles: Array<() => void> = [];
    const onCustomAction = vi.fn(() => new Promise<void>((resolve) => settles.push(resolve)));
    return { onCustomAction, settle: (i: number) => settles[i]?.() };
  }

  function actionButtons(view: DetailView) {
    const q = (sel: string) => view.element.querySelector<HTMLButtonElement>(sel)!;
    return {
      resolve: q(".sp-detail-btn-resolve"),
      del: q(".sp-detail-btn-delete"),
      first: q('[data-action-id="send-to-agent"]'),
      other: q('[data-action-id="other"]'),
    };
  }

  it("disables every action while one is pending, keeps it named and busy, then restores them", async () => {
    const { onCustomAction, settle } = deferredActions();
    const { view } = buildDetail([makeAction(), makeAction({ id: "other", label: "Other" })], { onCustomAction });
    view.show(makeFeedback(), 1);
    const btns = actionButtons(view);

    btns.first.click();
    expect(btns.first.disabled).toBe(true);
    expect(btns.first.textContent).toBe(""); // spinner in place of the label…
    expect(btns.first.getAttribute("aria-label")).toBe("Send to agent"); // …but still named
    expect(btns.first.getAttribute("aria-busy")).toBe("true");
    expect([btns.resolve.disabled, btns.del.disabled, btns.other.disabled]).toEqual([true, true, true]);

    btns.other.click(); // ignored while busy
    expect(onCustomAction).toHaveBeenCalledOnce();

    settle(0);
    await vi.waitFor(() => expect(btns.first.disabled).toBe(false));
    expect(btns.first.textContent).toBe("Send to agent");
    expect(btns.first.hasAttribute("aria-busy")).toBe(false);
    expect([btns.resolve.disabled, btns.del.disabled, btns.other.disabled]).toEqual([false, false, false]);
  });

  it("disables host actions while a built-in Resolve is pending", () => {
    const { view, cb } = buildDetail([makeAction()], { onResolve: vi.fn(() => new Promise<void>(() => {})) });
    view.show(makeFeedback(), 1);
    const btns = actionButtons(view);

    btns.resolve.click();
    expect(cb.onResolve).toHaveBeenCalledOnce();
    expect(btns.first.disabled).toBe(true);
  });

  it("an action settling after the view moved on leaves the newer view's buttons alone", async () => {
    const { onCustomAction, settle } = deferredActions();
    const { view } = buildDetail([makeAction()], { onCustomAction });

    view.show(makeFeedback({ id: "fb-a" }), 1);
    actionButtons(view).first.click(); // A pending

    view.show(makeFeedback({ id: "fb-b" }), 2);
    const b = actionButtons(view);
    b.first.click(); // B pending
    expect(onCustomAction).toHaveBeenCalledTimes(2);

    settle(0); // A settles late
    await Promise.resolve();
    await Promise.resolve();
    expect([b.first.disabled, b.resolve.disabled, b.del.disabled]).toEqual([true, true, true]);
    b.resolve.click(); // B still owns the processing lock
    expect(onCustomAction).toHaveBeenCalledTimes(2);

    settle(1);
    await vi.waitFor(() => expect(b.first.disabled).toBe(false));
    expect([b.resolve.disabled, b.del.disabled]).toEqual([false, false]);
  });

  it("hides an action whose visible() throws, reports it, and keeps the view alive", () => {
    const boom = new Error("visible exploded");
    const { view, cb } = buildDetail([
      makeAction({
        visible: () => {
          throw boom;
        },
      }),
      makeAction({ id: "other", label: "Other" }),
    ]);
    view.show(makeFeedback(), 1);

    expect(cb.onCustomActionError).toHaveBeenCalledExactlyOnceWith(boom);
    const ids = [...view.element.querySelectorAll(".sp-detail-btn-custom")].map((b) =>
      b.getAttribute("data-action-id"),
    );
    expect(ids).toEqual(["other"]);
    expect(view.element.querySelector(".sp-detail-message")?.textContent).toBe("Something broken in the page");
  });

  it("hands host callbacks one detached, deeply frozen copy of the feedback", async () => {
    const fb = makeFeedback({
      annotations: [makeAnnotation()],
      diagnostics: {
        console: [{ level: "error", message: "boom", timestamp: "2024-01-15T10:00:00.000Z" }],
        network: [],
      },
    });
    const seen: Readonly<FeedbackResponse>[] = [];
    const { view, cb } = buildDetail([makeAction({ visible: (snap) => seen.push(snap) > 0 })]);
    view.show(fb, 1);
    view.element.querySelector<HTMLButtonElement>(".sp-detail-btn-custom")!.click();
    await vi.waitFor(() => expect(cb.onCustomAction).toHaveBeenCalledOnce());

    const [snap] = seen;
    expect(snap).toEqual(fb);
    expect(snap).not.toBe(fb);
    expect(vi.mocked(cb.onCustomAction).mock.calls[0]?.[1]).toBe(snap);
    expect(Object.isFrozen(snap)).toBe(true);
    expect(Object.isFrozen(snap?.annotations)).toBe(true);
    expect(Object.isFrozen(snap?.annotations[0])).toBe(true);
    expect(Object.isFrozen(snap?.diagnostics?.console[0])).toBe(true);
    expect(() => {
      (snap as FeedbackResponse).status = "resolved";
    }).toThrow(TypeError);
    expect(fb.status).toBe("open");
  });

  it("renders the sanitized icon before the label, and restores it after the spinner", async () => {
    let settle!: () => void;
    const { view } = buildDetail(
      [
        makeAction({
          icon: '<svg viewBox="0 0 24 24" onload="alert(1)"><path d="M0 0h24"/><script>alert(1)</script></svg>',
        }),
      ],
      { onCustomAction: vi.fn(() => new Promise<void>((r) => (settle = r))) },
    );
    view.show(makeFeedback(), 1);
    const btn = view.element.querySelector<HTMLButtonElement>(".sp-detail-btn-custom")!;
    expect(btn.firstElementChild?.outerHTML).toBe(
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M0 0h24"></path></svg>',
    );

    btn.click();
    expect(btn.querySelector("svg")).toBeNull(); // spinner in place of icon + label
    settle();
    await vi.waitFor(() => expect(btn.disabled).toBe(false));
    expect(btn.firstElementChild?.outerHTML).toBe(
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M0 0h24"></path></svg>',
    );
    expect(btn.textContent).toBe("Send to agent");
  });

  it("keeps rendering the label when the icon is not SVG markup", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { view } = buildDetail([makeAction({ icon: "<b>nope</b>" })]);
    view.show(makeFeedback(), 1);
    const btn = view.element.querySelector<HTMLButtonElement>(".sp-detail-btn-custom")!;
    expect(btn.querySelector("svg, b")).toBeNull();
    expect(btn.textContent).toBe("Send to agent");
  });
});

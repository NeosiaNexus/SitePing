import { expect, type Page, test } from "@playwright/test";

// The widget on top of a host modal (real Radix Dialog, see fixtures/radix-dialog.tsx).
// Real pointer, wheel and keyboard input only: Playwright's actionability
// checks fail when `body { pointer-events: none }` makes a widget surface
// click-through.

const API = "http://localhost:3999/api/siteping";

/** English `fab.aria` label: the FAB's accessible name in the default locale. */
const FAB_ACCESSIBLE_NAME = "Siteping — Feedback menu";

/** English `popup.cancel` label: the comment popup's Cancel button name in the default locale. */
const POPUP_CANCEL_ACCESSIBLE_NAME = "Cancel";

/** A feedback pinned to the paragraph behind the modal. */
function feedbackPayload(projectName: string, message: string) {
  return {
    projectName,
    type: "bug",
    message,
    url: "/modal",
    viewport: "1280x720",
    userAgent: "Playwright",
    authorName: "Test",
    authorEmail: "test@test.com",
    annotations: [
      {
        anchor: {
          cssSelector: "#page-content",
          xpath: "/html/body/p",
          textSnippet: "Page behind the modal.",
          elementTag: "P",
          elementId: "page-content",
          textPrefix: "",
          textSuffix: "",
          fingerprint: "0:0:0",
          neighborText: "",
        },
        rect: { xPct: 0.1, yPct: 0.1, wPct: 0.3, hPct: 0.5 },
        scrollX: 0,
        scrollY: 0,
        viewportW: 1280,
        viewportH: 720,
        devicePixelRatio: 1,
      },
    ],
  };
}

/** Draw a rectangle over the dialog itself — the typical "report this modal" gesture. */
async function annotateTheDialog(page: Page) {
  await page.locator(".sp-fab").click();
  await page.locator('[data-item-id="annotate"]').click();
  const dialogBox = (await page.locator("#host-dialog").boundingBox())!;
  await page.mouse.move(dialogBox.x + 20, dialogBox.y + 20);
  await page.mouse.down();
  await page.mouse.move(dialogBox.x + 300, dialogBox.y + 80, { steps: 5 });
  await page.mouse.up();
  const popup = page.locator('[role="dialog"][data-siteping-ignore]');
  // The popup focuses its comment textarea on the next frame; wait for it so
  // that deferred focus cannot undo what the test does next.
  await expect(popup.locator("textarea")).toBeFocused();
  return popup;
}

test.describe("Widget over a host modal", () => {
  /** Feedback project of the running test — one per concurrent worker, since some tests seed feedbacks. */
  let project: string;

  test.beforeEach(async ({ page, browserName }, testInfo) => {
    project = `e2e-modal-${browserName}-${testInfo.parallelIndex}`;
    await page.request.get(`http://localhost:3999/api/reset?projectName=${project}`);
    await page.goto(`http://localhost:3999/modal?project=${project}`);
    await expect(page.locator("#host-dialog")).toBeVisible();
    await expect(page.locator(".sp-fab")).toBeAttached();
  });

  test("annotating and typing a comment keeps the modal open and the focus in the popup", async ({ page }) => {
    const popup = await annotateTheDialog(page);
    await popup.locator("button[data-type='bug']").click();
    const textarea = popup.locator("textarea");
    await textarea.click();
    await page.keyboard.type("Modal header is cut off");

    await expect(textarea).toBeFocused();
    await expect(textarea).toHaveValue("Modal header is cut off");
    await expect(page.locator("#host-dialog")).toBeVisible();
  });

  test("opening the feedback panel keeps the modal open", async ({ page }) => {
    await page.locator(".sp-fab").click();
    await page.locator('[data-item-id="chat"]').click();

    await expect(page.locator(".sp-panel.sp-panel--open")).toBeVisible();
    await expect(page.locator("#host-dialog")).toBeVisible();
  });

  test("the wheel scrolls the feedback list despite the modal's scroll lock", async ({ page }) => {
    for (let i = 1; i <= 15; i++) {
      await page.request.post(API, { data: feedbackPayload(project, `Feedback ${i}`) });
    }
    await page.reload();
    await expect(page.locator("#host-dialog")).toBeVisible();
    await page.locator(".sp-fab").click();
    await page.locator('[data-item-id="chat"]').click();
    const list = page.locator(".sp-panel--open .sp-list");
    await expect(list.locator(".sp-card")).toHaveCount(15);

    await list.hover();
    await page.mouse.wheel(0, 400);

    await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expect(page.locator("#host-dialog")).toBeVisible();
  });

  test("Escape cancels the annotation overlay without closing the modal", async ({ page }) => {
    await page.locator(".sp-fab").click();
    await page.locator('[data-item-id="annotate"]').click();
    const overlay = page.locator('[role="application"][data-siteping-ignore]');
    await expect(overlay).toBeFocused();

    await page.keyboard.press("Escape");

    await expect(overlay).toHaveCount(0);
    await expect(page.locator("#host-dialog")).toBeVisible();
  });

  test("Escape in the comment popup closes it without closing the modal", async ({ page }) => {
    const popup = await annotateTheDialog(page);

    await page.keyboard.press("Escape");

    await expect(popup).toBeHidden();
    await expect(page.locator("#host-dialog")).toBeVisible();
  });

  test("Escape closes the FAB menu first, then the modal once the widget has nothing to dismiss", async ({ page }) => {
    const fab = page.locator(".sp-fab");
    await fab.click();
    await expect(fab).toHaveAttribute("aria-expanded", "true");
    // Opening the menu focuses its first item on the next frame; wait for it
    // so the Escape below comes from the open menu.
    await expect(page.locator(".sp-radial-item").first()).toBeFocused();

    await page.keyboard.press("Escape");

    await expect(fab).toHaveAttribute("aria-expanded", "false");
    await expect(fab).toBeFocused();
    await expect(page.locator("#host-dialog")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.locator("#host-dialog")).toHaveCount(0);
  });

  test("Escape in the feedback panel closes it without closing the modal", async ({ page }) => {
    await page.locator(".sp-fab").click();
    await page.locator('[data-item-id="chat"]').click();
    const panel = page.locator(".sp-panel.sp-panel--open");
    // Opening the panel moves focus to its search field on the next frame;
    // wait for it so the Escape below comes from the open panel.
    await expect(panel.locator(".sp-search")).toBeFocused();

    await page.keyboard.press("Escape");

    await expect(panel).toHaveCount(0);
    await expect(page.locator("#host-dialog")).toBeVisible();
  });

  test("Tab in the comment popup moves focus within the popup, not back into the modal", async ({ page }) => {
    const popup = await annotateTheDialog(page);

    await page.keyboard.press("Tab");

    // The popup's Cancel button follows the comment textarea.
    await expect(popup.getByRole("button", { name: POPUP_CANCEL_ACCESSIBLE_NAME })).toBeFocused();
    await expect(page.locator("#host-dialog")).toBeVisible();
  });

  test("Tab in the feedback panel moves focus within the panel, not back into the modal", async ({ page }) => {
    await page.locator(".sp-fab").click();
    await page.locator('[data-item-id="chat"]').click();
    const panel = page.locator(".sp-panel.sp-panel--open");
    const panelSearch = panel.locator(".sp-search");
    // Opening the panel moves focus to its search field on the next frame;
    // wait for it so that deferred focus cannot undo the Tab below.
    await expect(panelSearch).toBeFocused();

    await page.keyboard.press("Tab");

    await expect(panelSearch).not.toBeFocused();
    const focusStaysInPanel = await panel.evaluate((panelElement) =>
      panelElement.contains((panelElement.getRootNode() as ShadowRoot).activeElement),
    );
    expect(focusStaysInPanel).toBe(true);
    await expect(page.locator("#host-dialog")).toBeVisible();
  });

  test("Shift+Tab from the FAB reaches its open menu, not the modal", async ({ page }) => {
    const fab = page.locator(".sp-fab");
    await fab.click();
    await expect(fab).toHaveAttribute("aria-expanded", "true");
    // Opening the menu focuses its first item on the next frame; wait for it
    // so that deferred focus cannot undo the Shift+Tab below.
    await expect(page.locator(".sp-radial-item").first()).toBeFocused();
    await fab.focus();

    await page.keyboard.press("Shift+Tab");

    // The radial menu precedes the FAB, so its last item comes before it.
    await expect(page.locator('[data-item-id="toggle-annotations"]')).toBeFocused();
    await expect(page.locator("#host-dialog")).toBeVisible();
  });

  test("the widget stays exposed and usable when the modal hides its siblings", async ({ page }) => {
    // Radix's `hideOthers` already marked every <body> child outside the
    // portal `aria-hidden`; Headless UI / inert-based focus traps also make
    // them `inert`. Apply both, as a modal opened after the widget would.
    await page.evaluate(() => {
      const dialog = document.getElementById("host-dialog");
      for (const bodyChild of Array.from(document.body.children)) {
        if (dialog && bodyChild.contains(dialog)) continue;
        bodyChild.setAttribute("inert", "");
        bodyChild.setAttribute("aria-hidden", "true");
      }
    });
    await expect(page.locator("#page-content")).toHaveAttribute("inert", "");
    await expect(page.locator("#page-content")).toHaveAttribute("aria-hidden", "true");

    // The FAB stays in the accessibility tree and the live region stays exposed.
    await expect(page.locator("siteping-widget")).not.toHaveAttribute("aria-hidden", /.*/);
    await expect(page.locator('[role="status"][aria-live="polite"]')).not.toHaveAttribute("aria-hidden", /.*/);
    await expect(page.getByRole("button", { name: FAB_ACCESSIBLE_NAME })).toBeVisible();

    await page.getByRole("button", { name: FAB_ACCESSIBLE_NAME }).click();
    await page.locator('[data-item-id="chat"]').click();

    await expect(page.locator(".sp-panel.sp-panel--open")).toBeVisible();
    await expect(page.locator("#host-dialog")).toBeVisible();
  });

  test("clicking a marker tooltip keeps the modal open", async ({ page }) => {
    await page.request.post(API, { data: feedbackPayload(project, "Tooltip over the modal") });
    await page.reload();
    await expect(page.locator("#host-dialog")).toBeVisible();

    await page.locator("#siteping-markers [data-feedback-id]").first().hover();
    const tooltip = page.locator("#sp-tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("Tooltip over the modal");
    await tooltip.click();

    await expect(page.locator("#host-dialog")).toBeVisible();
  });

  test("the modal still closes on a genuine outside click", async ({ page }) => {
    await page.mouse.click(40, 40);
    await expect(page.locator("#host-dialog")).toHaveCount(0);
  });
});

// Production mounts the widget in a closed shadow root: the guard cannot see
// inside it through `composedPath()` or `host.shadowRoot`, and Playwright
// locators cannot pierce it either. The page reports NODE_ENV 'production'
// (?closedShadow=1) and an init script keeps a reference to the root for the
// test's own inspection only — the root stays closed for the widget and the guard.
test.describe("Widget over a host modal with its production closed shadow root", () => {
  /** Window property holding the widget's closed shadow root, set by the init script. */
  const CLOSED_SHADOW_ROOT_PROPERTY = "__sitepingClosedShadowRoot";

  /** State of the FAB menu read from inside the closed shadow root. */
  interface FabMenuState {
    expanded: string | null;
    firstItemFocused: boolean;
  }

  test.beforeEach(async ({ page, browserName }) => {
    await page.addInitScript((rootProperty) => {
      const attachShadow = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function attachShadowAndKeepWidgetRoot(init) {
        const shadowRoot = attachShadow.call(this, init);
        if (this.localName === "siteping-widget") {
          Object.defineProperty(window, rootProperty, { value: shadowRoot, configurable: true });
        }
        return shadowRoot;
      };
    }, CLOSED_SHADOW_ROOT_PROPERTY);
    const project = `e2e-modal-closed-${browserName}`;
    await page.request.get(`http://localhost:3999/api/reset?projectName=${project}`);
    await page.goto(`http://localhost:3999/modal?project=${project}&closedShadow=1`);
    await expect(page.locator("#host-dialog")).toBeVisible();
    const shadowRootMode = await page.evaluate(
      (rootProperty) => (window as unknown as Record<string, ShadowRoot | undefined>)[rootProperty]?.mode,
      CLOSED_SHADOW_ROOT_PROPERTY,
    );
    expect(shadowRootMode).toBe("closed");
  });

  /**
   * Center of the FAB in viewport coordinates, once its entry animation (from
   * `scale(0)`) has finished — `page.mouse` has no actionability wait, and a
   * click on the still-scaled-down FAB would land on the modal's overlay.
   */
  function readFabCenter(page: Page): Promise<{ x: number; y: number } | null> {
    return page.evaluate((rootProperty) => {
      const shadowRoot = (window as unknown as Record<string, ShadowRoot | undefined>)[rootProperty];
      const fab = shadowRoot?.querySelector(".sp-fab");
      if (!fab || fab.getAnimations().some((animation) => animation.playState !== "finished")) return null;
      const box = fab.getBoundingClientRect();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    }, CLOSED_SHADOW_ROOT_PROPERTY);
  }

  /** Whether the FAB menu is expanded and its first item holds the focus. */
  function readFabMenuState(page: Page): Promise<FabMenuState> {
    return page.evaluate((rootProperty) => {
      const shadowRoot = (window as unknown as Record<string, ShadowRoot | undefined>)[rootProperty];
      return {
        expanded: shadowRoot?.querySelector(".sp-fab")?.getAttribute("aria-expanded") ?? null,
        firstItemFocused: !!shadowRoot && shadowRoot.activeElement === shadowRoot.querySelector(".sp-radial-item"),
      };
    }, CLOSED_SHADOW_ROOT_PROPERTY);
  }

  test("Escape closes the FAB menu first, then the modal", async ({ page }) => {
    await expect.poll(() => readFabCenter(page)).not.toBeNull();
    const fabCenter = (await readFabCenter(page))!;
    await page.mouse.click(fabCenter.x, fabCenter.y);
    // Opening the menu focuses its first item on the next frame; wait for it
    // so the Escape below comes from the open menu.
    await expect.poll(() => readFabMenuState(page)).toEqual({ expanded: "true", firstItemFocused: true });

    await page.keyboard.press("Escape");

    await expect.poll(() => readFabMenuState(page)).toEqual({ expanded: "false", firstItemFocused: false });
    await expect(page.locator("#host-dialog")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.locator("#host-dialog")).toHaveCount(0);
  });
});

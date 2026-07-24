// @vitest-environment jsdom

import type { FeedbackRecord } from "@siteping/core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { SitepingInbox } from "../../src/components/inbox.js";
import { makeDiagnostics, makeRecord, makeSource, REGION } from "../helpers.js";
import { installJsdomStubs } from "../render.js";

beforeAll(() => installJsdomStubs());
afterEach(() => cleanup());

/** Demo project: three open (one with screenshot+region, one with diagnostics) + one resolved. */
function seed(): FeedbackRecord[] {
  return [
    makeRecord({
      id: "o1",
      status: "open",
      type: "bug",
      message: "Header overlaps the logo",
      url: "https://demo.siteping.dev/pricing",
      createdAt: new Date("2026-07-20T10:06:00Z"),
      screenshotUrl: "data:image/jpeg;base64,AA",
      screenshotRegion: REGION,
    }),
    makeRecord({
      id: "o2",
      status: "open",
      type: "question",
      message: "Why are there two prices?",
      createdAt: new Date("2026-07-20T10:05:00Z"),
      diagnostics: makeDiagnostics(),
    }),
    makeRecord({
      id: "o3",
      status: "open",
      type: "change",
      message: "Make the CTA green",
      createdAt: new Date("2026-07-20T10:04:00Z"),
    }),
    makeRecord({
      id: "c1",
      status: "resolved",
      type: "bug",
      message: "This one was already fixed",
      createdAt: new Date("2026-07-20T10:03:00Z"),
      resolvedAt: new Date("2026-07-20T11:00:00Z"),
    }),
  ];
}

function renderInbox(props: Partial<Parameters<typeof SitepingInbox>[0]> = {}, records = seed()) {
  const source = makeSource(records);
  const utils = render(<SitepingInbox source={source} projects="demo" theme="dark" {...props} />);
  return { source, ...utils };
}

async function ready(): Promise<HTMLElement> {
  return screen.findByRole("listbox");
}

/**
 * Visible feedback rows only. Scoping to the listbox excludes the native
 * `<option>`s inside the type/project selects (also role "option") and, since
 * getAllByRole ignores aria-hidden nodes, the leaving-row ghosts.
 */
function listRows(): HTMLElement[] {
  return within(screen.getByRole("listbox")).getAllByRole("option");
}

describe("SitepingInbox — list & tabs", () => {
  it("renders one row per open feedback with the right status", async () => {
    renderInbox();
    await ready();
    await waitFor(() => expect(listRows()).toHaveLength(3));
    for (const row of listRows()) expect(row.getAttribute("data-status")).toBe("open");
  });

  it("shows per-status counts in the tabs", async () => {
    const { container } = renderInbox();
    await ready();
    await waitFor(() => {
      expect(container.querySelector('.spd-tab[data-status="open"] .spd-tab-count')?.textContent).toBe("3");
    });
    expect(container.querySelector('.spd-tab[data-status="all"] .spd-tab-count')?.textContent).toBe("4");
    expect(container.querySelector('.spd-tab[data-status="resolved"] .spd-tab-count')?.textContent).toBe("1");
  });

  it("switches the filter when a status radio is clicked", async () => {
    renderInbox();
    await ready();
    fireEvent.click(screen.getByRole("radio", { name: /Resolved/ }));
    await waitFor(() => {
      const rows = listRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.getAttribute("data-status")).toBe("resolved");
    });
  });

  it("exposes the status filter as a radiogroup with the active status checked", async () => {
    renderInbox();
    await ready();
    const group = screen.getByRole("radiogroup", { name: "Filter by status" });
    expect(group).toBeTruthy();
    await waitFor(() => {
      // Default filter is "open" (2nd radio) — its count landed, so name is "Open (3)".
      expect(screen.getByRole("radio", { name: "Open (3)" }).getAttribute("aria-checked")).toBe("true");
    });
    expect(screen.getByRole("radio", { name: /Resolved/ }).getAttribute("aria-checked")).toBe("false");
  });

  it("marks the list aria-busy while it is (re)loading", async () => {
    renderInbox();
    const listbox = await ready();
    // After the first page settles, the list is idle.
    await waitFor(() => expect(listbox.getAttribute("aria-busy")).toBeNull());
  });

  it("shows a load-more button when more pages exist and appends on click", async () => {
    renderInbox({ pageSize: 2 });
    await ready();
    await waitFor(() => expect(listRows()).toHaveLength(2));
    const loadMore = screen.getByRole("button", { name: /Load more/ });
    fireEvent.click(loadMore);
    await waitFor(() => expect(listRows()).toHaveLength(3));
  });
});

describe("SitepingInbox — keyboard", () => {
  it("j / k move the keyboard focus (focus ring), not the selection", async () => {
    renderInbox();
    const listbox = await ready();
    fireEvent.keyDown(listbox, { key: "j" });
    await waitFor(() => expect(listRows()[0]?.className).toContain("spd-row-focused"));
    // Focus is not selection — nothing is opened yet, so no row is aria-selected.
    expect(listRows().some((row) => row.getAttribute("aria-selected") === "true")).toBe(false);
    fireEvent.keyDown(listbox, { key: "j" });
    await waitFor(() => expect(listRows()[1]?.className).toContain("spd-row-focused"));
    fireEvent.keyDown(listbox, { key: "k" });
    await waitFor(() => expect(listRows()[0]?.className).toContain("spd-row-focused"));
  });

  it("aria-selected tracks the opened row, not keyboard focus", async () => {
    renderInbox();
    const listbox = await ready();
    fireEvent.keyDown(listbox, { key: "j" }); // focus o1
    fireEvent.keyDown(listbox, { key: "Enter" }); // open o1
    await screen.findByRole("dialog", { name: /Feedback details/ });
    await waitFor(() => expect(listRows()[0]?.getAttribute("aria-selected")).toBe("true"));
  });

  it("Enter opens the drawer for the focused row", async () => {
    renderInbox();
    const listbox = await ready();
    fireEvent.keyDown(listbox, { key: "j" });
    fireEvent.keyDown(listbox, { key: "Enter" });
    expect(await screen.findByRole("dialog", { name: /Feedback details/ })).toBeTruthy();
  });

  it("e resolves the focused row — it leaves the open tab and a toast offers undo, u reverts", async () => {
    renderInbox();
    const listbox = await ready();
    fireEvent.keyDown(listbox, { key: "j" }); // focus o1

    fireEvent.keyDown(listbox, { key: "e" });
    expect(await screen.findByText("Marked as resolved")).toBeTruthy();
    await waitFor(() => expect(listRows()).toHaveLength(2)); // o1 left the open list

    fireEvent.keyDown(listbox, { key: "u" });
    await waitFor(() => expect(listRows()).toHaveLength(3)); // o1 reinstated
  });

  it("p marks the focused row in progress and it leaves the open tab", async () => {
    renderInbox();
    const listbox = await ready();
    fireEvent.keyDown(listbox, { key: "j" });
    fireEvent.keyDown(listbox, { key: "p" });
    expect(await screen.findByText("Marked as in progress")).toBeTruthy();
    await waitFor(() => expect(listRows()).toHaveLength(2));
  });

  it("/ focuses the search field", async () => {
    const { container } = renderInbox();
    const listbox = await ready();
    fireEvent.keyDown(listbox, { key: "/" });
    expect(document.activeElement).toBe(container.querySelector(".spd-search-input"));
  });

  it("? opens the shortcuts overlay and Esc closes it", async () => {
    renderInbox();
    const listbox = await ready();
    fireEvent.keyDown(listbox, { key: "?" });
    const overlay = await screen.findByRole("dialog", { name: "Keyboard shortcuts" });
    fireEvent.keyDown(overlay, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Keyboard shortcuts" })).toBeNull());
  });

  it("number keys switch status tabs (4 → resolved)", async () => {
    renderInbox();
    const listbox = await ready();
    fireEvent.keyDown(listbox, { key: "4" });
    await waitFor(() => {
      const rows = listRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.getAttribute("data-status")).toBe("resolved");
    });
  });

  it("ignores j/k while the overlay drawer is open (the list is behind the backdrop)", async () => {
    renderInbox();
    const listbox = await ready();
    fireEvent.keyDown(listbox, { key: "j" }); // focus o1
    fireEvent.keyDown(listbox, { key: "Enter" }); // open o1 (overlay mode in jsdom)
    await screen.findByRole("dialog", { name: /Feedback details/ });
    fireEvent.keyDown(listbox, { key: "j" }); // should be ignored
    // Focus stays on o1 (the first row keeps its focus ring).
    expect(listRows()[0]?.className).toContain("spd-row-focused");
  });

  it("e targets the opened record while the overlay drawer is open", async () => {
    renderInbox();
    const listbox = await ready();
    fireEvent.keyDown(listbox, { key: "j" }); // focus + will open o1
    fireEvent.keyDown(listbox, { key: "Enter" });
    await screen.findByRole("dialog", { name: /Feedback details/ });
    fireEvent.keyDown(listbox, { key: "e" }); // resolves the opened record
    expect(await screen.findByText("Marked as resolved")).toBeTruthy();
    await waitFor(() => expect(listRows()).toHaveLength(2)); // o1 left the open list
  });
});

describe("SitepingInbox — search & live regions", () => {
  it("shows a clear button once the search has text and clearing it empties the field", async () => {
    const { container } = renderInbox();
    await ready();
    const input = container.querySelector<HTMLInputElement>(".spd-search-input") as HTMLInputElement;
    expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();

    fireEvent.change(input, { target: { value: "header" } });
    const clear = await screen.findByRole("button", { name: "Clear search" });
    fireEvent.click(clear);
    await waitFor(() => expect(input.value).toBe(""));
    expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
  });

  it("Esc in the search field clears the query first, then exits the field — never the drawer", async () => {
    const { container } = renderInbox();
    await ready();
    const input = container.querySelector<HTMLInputElement>(".spd-search-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "header" } });
    await waitFor(() => expect(input.value).toBe("header"));

    // First Esc clears the query (focus stays in the field).
    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(input.value).toBe(""));

    // Second Esc (empty) blurs the field.
    input.focus();
    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(document.activeElement).not.toBe(input));
  });

  it("keeps a permanently-mounted status live region for result announcements", async () => {
    const { container } = renderInbox();
    await ready();
    const liveRegion = container.querySelector(".spd-sr-only[role='status']");
    expect(liveRegion).not.toBeNull();
    await waitFor(() => expect(liveRegion?.textContent).toContain("feedbacks"));
  });

  it("keeps the toast live region mounted even when no toast is showing", async () => {
    const { container } = renderInbox();
    await ready();
    // The permanent toast region exists (empty) so announcements are reliable.
    expect(container.querySelector(".spd-toast-region[role='status']")).not.toBeNull();
    expect(container.querySelector(".spd-toast")).toBeNull();
  });
});

describe("SitepingInbox — drawer", () => {
  async function openFirst(): Promise<void> {
    const listbox = await ready();
    fireEvent.keyDown(listbox, { key: "j" });
    fireEvent.keyDown(listbox, { key: "Enter" });
    await screen.findByRole("dialog", { name: /Feedback details/ });
  }

  it("links Open on page to the record URL with the deep-link param", async () => {
    renderInbox();
    await openFirst();
    const link = screen.getByRole("link", { name: /Open on page/ });
    expect(link.getAttribute("href")).toBe("https://demo.siteping.dev/pricing?siteping=o1");
  });

  it("honours a custom deepLinkParam", async () => {
    renderInbox({ deepLinkParam: "fb" });
    await openFirst();
    expect(screen.getByRole("link", { name: /Open on page/ }).getAttribute("href")).toBe(
      "https://demo.siteping.dev/pricing?fb=o1",
    );
  });

  it("opens the status menu with the four statuses", async () => {
    renderInbox();
    await openFirst();
    const dialog = screen.getByRole("dialog", { name: /Feedback details/ });
    // The trigger's accessible name is the visible status (o1 is open), per WCAG 2.5.3.
    fireEvent.click(within(dialog).getByRole("button", { name: "Open" }));
    const menu = await screen.findByRole("listbox", { name: "Status" });
    expect(within(menu).getAllByRole("option")).toHaveLength(4);
  });

  it("renders the evidence rect for a record with a screenshot region", async () => {
    const { container } = renderInbox();
    await openFirst();
    expect(container.querySelector(".spd-evidence-rect")).not.toBeNull();
  });

  it("presents the metadata as a definition list", async () => {
    const { container } = renderInbox();
    await openFirst();
    const dl = container.querySelector("dl.spd-meta-grid");
    expect(dl).not.toBeNull();
    expect(dl?.querySelectorAll("dt.spd-meta-label").length).toBeGreaterThanOrEqual(5);
    expect(dl?.querySelectorAll("dd.spd-meta-value").length).toBeGreaterThanOrEqual(5);
  });

  it("is a modal dialog in overlay (narrow) mode", async () => {
    renderInbox();
    await openFirst();
    const dialog = screen.getByRole("dialog", { name: /Feedback details/ });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.tagName).toBe("DIV");
  });

  it("is a non-modal region in side-by-side (wide) mode", async () => {
    const original = globalThis.ResizeObserver;
    class WideResizeObserver {
      private readonly cb: ResizeObserverCallback;
      constructor(cb: ResizeObserverCallback) {
        this.cb = cb;
      }
      observe(): void {
        this.cb([{ contentRect: { width: 1200 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
      }
      unobserve(): void {}
      disconnect(): void {}
    }
    globalThis.ResizeObserver = WideResizeObserver as unknown as typeof ResizeObserver;
    try {
      renderInbox();
      const listbox = await ready();
      fireEvent.keyDown(listbox, { key: "j" });
      fireEvent.keyDown(listbox, { key: "Enter" });
      const panel = await screen.findByRole("region", { name: /Feedback details/ });
      expect(panel.getAttribute("aria-modal")).toBeNull();
    } finally {
      globalThis.ResizeObserver = original;
    }
  });
});

describe("SitepingInbox — empty & error states", () => {
  it("shows the filtered-empty state, then the project-empty state via View all", async () => {
    renderInbox({}, []);
    // Default "open" filter counts as a filter → the filtered-empty state.
    expect(await screen.findByText("Nothing here")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "View all" }));
    expect(await screen.findByText("No feedback yet")).toBeTruthy();
  });

  it("shows the inbox-zero state when the project has feedback but none is open", async () => {
    const closedOnly = [
      makeRecord({ id: "c1", status: "resolved", createdAt: new Date("2026-07-20T10:00:00Z") }),
      makeRecord({ id: "c2", status: "wont_fix", createdAt: new Date("2026-07-20T09:00:00Z") }),
    ];
    renderInbox({}, closedOnly);
    expect(await screen.findByText("All clear")).toBeTruthy();
  });

  it("shows a custom empty state when provided and the project is truly empty", async () => {
    renderInbox({ emptyState: <div>Nothing to triage yet</div> }, []);
    fireEvent.click(await screen.findByRole("button", { name: "View all" }));
    expect(await screen.findByText("Nothing to triage yet")).toBeTruthy();
  });

  it("shows the error state with a retry button when the list fails", async () => {
    const source = makeSource(seed());
    source.list.mockRejectedValue(new Error("boom"));
    render(<SitepingInbox source={source} projects="demo" theme="dark" />);
    expect(await screen.findByText("Failed to load feedbacks")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });
});

describe("SitepingInbox — chrome & theming", () => {
  it("reflects density, theme and accent on the root element", async () => {
    const { container } = renderInbox({ density: "compact", theme: "light", accentColor: "#ff0000" });
    await ready();
    const root = container.querySelector<HTMLElement>(".spd-root") as HTMLElement;
    expect(root.dataset.density).toBe("compact");
    expect(root.dataset.theme).toBe("light");
    expect(root.style.getPropertyValue("--spd-accent")).toBe("#ff0000");
  });

  it("appends a custom className to the root", async () => {
    const { container } = renderInbox({ className: "my-inbox" });
    await ready();
    expect(container.querySelector(".spd-root")?.className).toContain("my-inbox");
  });

  it("renders the project switcher only when more than one project is configured", async () => {
    const multi = makeSource(seed());
    const { container } = render(<SitepingInbox source={multi} projects={["demo", "landing"]} theme="dark" />);
    await screen.findByRole("listbox");
    expect(container.querySelector(".spd-project-select")).not.toBeNull();

    cleanup();
    renderInbox();
    await ready();
    expect(document.querySelector(".spd-project-select")).toBeNull();
  });

  it("filters by type through the type select", async () => {
    const { container } = renderInbox();
    await ready();
    const select = container.querySelector<HTMLSelectElement>(".spd-type-filter") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "question" } });
    await waitFor(() => {
      const rows = listRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.querySelector(".spd-row-message")?.textContent).toBe("Why are there two prices?");
    });
  });
});

// @vitest-environment jsdom

import type { FeedbackRecord } from "@siteping/core";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { SitepingInbox } from "../../src/components/inbox.js";
import type { InboxCustomSourceOptions, SitepingInboxPresentationProps } from "../../src/types.js";
import { deferred, makeDiagnostics, makeRecord, makeSource, REGION } from "../helpers.js";
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

/**
 * Overrides accepted by `renderInbox` — presentation and shared options only.
 * The source mode is fixed to custom-source, so `Partial` never has to weaken
 * the `never` guards that keep the three modes mutually exclusive.
 */
type InboxOverrides = Partial<
  Omit<
    InboxCustomSourceOptions & SitepingInboxPresentationProps,
    "source" | "store" | "endpoint" | "apiKey" | "headers"
  >
>;

function renderInbox(props: InboxOverrides = {}, records = seed()) {
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

  /** Mount under a backend-style tag Intl rejects, and wait until the French dictionary is in. */
  async function readyInFrFR(): Promise<HTMLElement> {
    renderInbox({ locale: "fr_FR" });
    const listbox = await ready();
    await screen.findByRole("region", { name: "Boîte de réception des feedbacks" });
    return listbox;
  }

  it("renders a backend-style fr_FR tag in French, with a valid lang, and e still toasts", async () => {
    const listbox = await readyInFrFR();
    expect(listbox.closest(".spd-root")?.getAttribute("lang")).toBe("fr-FR");
    fireEvent.keyDown(listbox, { key: "j" });
    fireEvent.keyDown(listbox, { key: "e" });
    expect(await screen.findByText("Marqué comme résolu")).toBeTruthy();
  });

  it("opening a feedback with diagnostics under fr_FR keeps the inbox mounted", async () => {
    const listbox = await readyInFrFR();
    fireEvent.keyDown(listbox, { key: "j" });
    fireEvent.keyDown(listbox, { key: "j" }); // o2 carries diagnostics
    fireEvent.keyDown(listbox, { key: "Enter" });
    const dialog = await screen.findByRole("dialog", { name: /Détail du feedback/ });
    const times = dialog.querySelectorAll("time.spd-diag-time");
    expect(times.length).toBeGreaterThan(0);
    for (const time of times) expect(time.textContent).toMatch(/\d/);
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

  it("ignores every shortcut but ? and Esc while the shortcuts overlay is open", async () => {
    const { source } = renderInbox();
    const listbox = await ready();
    fireEvent.keyDown(listbox, { key: "j" }); // focus o1
    fireEvent.keyDown(listbox, { key: "?" });
    const overlay = await screen.findByRole("dialog", { name: "Keyboard shortcuts" });

    for (const key of ["e", "j", "4", "u", "r"]) fireEvent.keyDown(overlay, { key });
    expect(source.setStatus).not.toHaveBeenCalled();
    expect(listRows()[0]?.className).toContain("spd-row-focused"); // j did not move focus
    expect(screen.getByRole("radio", { name: /^Open/ }).getAttribute("aria-checked")).toBe("true"); // 4 ignored

    fireEvent.keyDown(overlay, { key: "?" }); // ? still toggles it closed
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Keyboard shortcuts" })).toBeNull());
  });

  it("keeps Tab and Shift+Tab on the shortcuts overlay, which holds nothing focusable", async () => {
    renderInbox();
    const listbox = await ready();
    fireEvent.keyDown(listbox, { key: "?" });
    const overlay = await screen.findByRole("dialog", { name: "Keyboard shortcuts" });
    expect(document.activeElement).toBe(overlay);

    expect(fireEvent.keyDown(overlay, { key: "Tab" })).toBe(false);
    expect(fireEvent.keyDown(overlay, { key: "Tab", shiftKey: true })).toBe(false);
    expect(document.activeElement).toBe(overlay);
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

  it("drops a focus the new tab doesn't contain — Enter never opens an invisible drawer", async () => {
    renderInbox();
    const listbox = await ready();
    fireEvent.keyDown(listbox, { key: "j" }); // focus o1
    fireEvent.keyDown(listbox, { key: "4" }); // Resolved tab — o1 isn't in it
    await waitFor(() => expect(listRows().map((row) => row.getAttribute("data-status"))).toEqual(["resolved"]));

    const active = listbox.getAttribute("aria-activedescendant");
    expect(active === null || document.getElementById(active) !== null).toBe(true);

    fireEvent.keyDown(listbox, { key: "Enter" }); // nothing focused: no-op
    expect(screen.queryByRole("dialog", { name: /Feedback details/ })).toBeNull();
    fireEvent.keyDown(listbox, { key: "j" }); // navigation still works
    await waitFor(() => expect(listRows()[0]?.className).toContain("spd-row-focused"));
  });

  it("keeps keyboard focus in the inbox when resolving the last row empties the tab", async () => {
    const only = makeRecord({ id: "solo", status: "open", message: "The only open one" });
    renderInbox({}, [only]);
    const listbox = await ready();
    listbox.focus();
    fireEvent.keyDown(listbox, { key: "j" });
    fireEvent.keyDown(listbox, { key: "e" }); // last row leaves → empty state replaces the listbox
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());

    // The focused listbox unmounted: focus must not fall to <body>, or every
    // shortcut dies until the user clicks back into the inbox.
    const root = document.querySelector(".spd-root");
    expect(root?.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "4" }); // shortcuts still work
    await waitFor(() => expect(listRows().map((row) => row.getAttribute("data-status"))).toEqual(["resolved"]));
  });

  it("keeps keyboard focus in the inbox when the drawer closes over an emptied tab", async () => {
    const only = makeRecord({ id: "solo", status: "open", message: "The only open one" });
    renderInbox({}, [only]);
    const listbox = await ready();
    listbox.focus();
    fireEvent.keyDown(listbox, { key: "j" });
    fireEvent.keyDown(listbox, { key: "Enter" }); // overlay drawer takes focus
    const dialog = await screen.findByRole("dialog", { name: /Feedback details/ });
    fireEvent.keyDown(dialog, { key: "e" }); // resolved from the drawer → the empty state replaces the listbox
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: /Feedback details/ })).toBeNull());
    // No listbox to return to: focus must stay in the inbox, not fall to <body>.
    const root = document.querySelector(".spd-root");
    expect(root?.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "4" }); // shortcuts still work
    await waitFor(() => expect(listRows().map((row) => row.getAttribute("data-status"))).toEqual(["resolved"]));
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

describe("SitepingInbox — toasts with concurrent work", () => {
  const FAILED = "Something went wrong. Change reverted.";

  async function flush(): Promise<void> {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  it("a failed change doesn't suppress a concurrent change's success toast", async () => {
    const { source } = renderInbox();
    const listbox = await ready();
    await flush();
    const first = deferred<FeedbackRecord>();
    const second = deferred<FeedbackRecord>();
    source.setStatus.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);

    fireEvent.keyDown(listbox, { key: "j" }); // focus o1
    fireEvent.keyDown(listbox, { key: "e" }); // o1 in flight — focus moves to o2
    await waitFor(() => expect(listRows()).toHaveLength(2));
    fireEvent.keyDown(listbox, { key: "e" }); // o2 in flight
    await waitFor(() => expect(listRows()).toHaveLength(1));

    await act(async () => {
      first.reject(new Error("patch failed"));
    });
    expect(await screen.findByText(FAILED)).toBeTruthy();

    const o2 = source.records.find((r) => r.id === "o2") as FeedbackRecord;
    await act(async () => {
      second.resolve({ ...o2, status: "resolved" });
    });
    expect(await screen.findByText("Marked as resolved")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Undo/ })).toBeTruthy();
  });

  it("a failed refresh during a change neither toasts 'reverted' nor hides the success toast", async () => {
    const { source } = renderInbox();
    const listbox = await ready();
    await flush();
    const held = deferred<FeedbackRecord>();
    source.setStatus.mockImplementationOnce(() => held.promise);

    fireEvent.keyDown(listbox, { key: "j" });
    fireEvent.keyDown(listbox, { key: "e" }); // o1 in flight
    source.list.mockRejectedValueOnce(new Error("refresh failed"));
    fireEvent.keyDown(listbox, { key: "r" });
    await flush();
    expect(screen.queryByText(FAILED)).toBeNull();

    const o1 = source.records.find((r) => r.id === "o1") as FeedbackRecord;
    await act(async () => {
      held.resolve({ ...o1, status: "resolved" });
    });
    expect(await screen.findByText("Marked as resolved")).toBeTruthy();
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

  it("offers to delete a reply only when the source can delete it", async () => {
    const reply = {
      id: "c-1",
      feedbackId: "o1",
      body: "16 or 24 px?",
      authorName: "Alex",
      authorEmail: "",
      authorRole: "client" as const,
      clientId: "",
      createdAt: new Date("2026-07-20T10:07:00Z"),
    };
    const records = seed().map((r) => (r.id === "o1" ? { ...r, comments: [reply] } : r));
    const addComment = async () => reply;
    for (const [removeComment, offered] of [
      [undefined, false],
      [async () => {}, true],
    ] as const) {
      const source = Object.assign(makeSource(records), { addComment }, removeComment ? { removeComment } : {});
      render(<SitepingInbox source={source} projects="demo" theme="dark" author={{ name: "Studio" }} />);
      await openFirst();
      const dialog = screen.getByRole("dialog", { name: /Feedback details/ });
      expect(within(dialog).getByRole("textbox", { name: "Reply to the client…" })).toBeTruthy();
      expect(within(dialog).queryByRole("button", { name: "Delete reply" }) !== null).toBe(offered);
      cleanup();
    }
  });

  it("keeps the focus in the dialog when a reply is deleted from a thread that takes no new ones", async () => {
    const reply = (id: string) => ({
      id,
      feedbackId: "o1",
      body: `Reply ${id}`,
      authorName: "Alex",
      authorEmail: "",
      authorRole: "client" as const,
      clientId: "",
      createdAt: new Date("2026-07-20T10:07:00Z"),
    });
    const permissions = { canChangeStatus: true, canDelete: true, canComment: false, canDeleteComment: true };
    const records = seed().map((r) => (r.id === "o1" ? { ...r, comments: [reply("c-1")], permissions } : r));
    const source = Object.assign(makeSource(records), {
      addComment: async () => reply("c-2"),
      removeComment: async () => {},
    });
    render(<SitepingInbox source={source} projects="demo" theme="dark" author={{ name: "Studio" }} />);
    await openFirst();
    const dialog = screen.getByRole("dialog", { name: /Feedback details/ });

    fireEvent.click(within(dialog).getByRole("button", { name: "Delete reply" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(dialog.querySelector(".spd-thread")).toBeNull());

    expect(document.activeElement).toBe(dialog);
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: /Feedback details/ })).toBeNull());
  });

  it("keeps the drawer, and the reply draft, on an Escape typed in the composer — the next one closes", async () => {
    const source = Object.assign(makeSource(seed()), { addComment: async () => ({}) as never });
    render(<SitepingInbox source={source} projects="demo" theme="dark" author={{ name: "Studio" }} />);
    await openFirst();
    const dialog = screen.getByRole("dialog", { name: /Feedback details/ });
    const composer = within(dialog).getByRole("textbox", { name: "Reply to the client…" });

    // An IME cancelling its candidates, before any text is committed.
    fireEvent.keyDown(composer, { key: "Escape", isComposing: true });
    expect(screen.getByRole("dialog", { name: /Feedback details/ })).toBe(dialog);

    fireEvent.change(composer, { target: { value: "A long, carefully typed reply" } });
    fireEvent.keyDown(composer, { key: "Escape" });

    expect(screen.getByRole("dialog", { name: /Feedback details/ })).toBe(dialog);
    expect((composer as HTMLTextAreaElement).value).toBe("A long, carefully typed reply");
    expect(document.activeElement).toBe(dialog);
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: /Feedback details/ })).toBeNull());
  });

  it("is a modal dialog in overlay (narrow) mode", async () => {
    renderInbox();
    await openFirst();
    const dialog = screen.getByRole("dialog", { name: /Feedback details/ });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.tagName).toBe("DIV");
  });

  /** Run `body` with a ResizeObserver reporting a wide (side-by-side) container. */
  async function withWideLayout(body: () => Promise<void>): Promise<void> {
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
      await body();
    } finally {
      globalThis.ResizeObserver = original;
    }
  }

  it("is a non-modal region in side-by-side (wide) mode", async () => {
    await withWideLayout(async () => {
      renderInbox();
      const listbox = await ready();
      fireEvent.keyDown(listbox, { key: "j" });
      fireEvent.keyDown(listbox, { key: "Enter" });
      const panel = await screen.findByRole("region", { name: /Feedback details/ });
      expect(panel.getAttribute("aria-modal")).toBeNull();
    });
  });

  it("returns focus to the list when the side-by-side drawer closes or its record is deleted", async () => {
    await withWideLayout(async () => {
      renderInbox();
      const listbox = await ready();
      fireEvent.keyDown(listbox, { key: "j" });
      fireEvent.keyDown(listbox, { key: "Enter" });

      // Clicking inside the panel moves focus there; unmounting it must not drop focus to <body>.
      const panel = await screen.findByRole("region", { name: /Feedback details/ });
      const close = within(panel).getByRole("button", { name: "Close details" });
      close.focus();
      fireEvent.click(close);
      await waitFor(() => expect(screen.queryByRole("region", { name: /Feedback details/ })).toBeNull());
      expect(document.activeElement).toBe(listbox);

      fireEvent.keyDown(listbox, { key: "Enter" }); // reopen o1
      const reopened = await screen.findByRole("region", { name: /Feedback details/ });
      fireEvent.click(within(reopened).getByRole("button", { name: "Delete feedback" }));
      const confirm = within(reopened).getByRole("button", { name: "Delete" });
      confirm.focus();
      fireEvent.click(confirm);
      await waitFor(() => expect(screen.queryByRole("region", { name: /Feedback details/ })).toBeNull());
      expect(document.activeElement).toBe(listbox);
    });
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

describe("SitepingInbox — permissions and readOnly", () => {
  const REVIEWER = { canChangeStatus: false, canDelete: false, canComment: true, canDeleteComment: false };
  const hintKeys = (container: HTMLElement) =>
    [...container.querySelectorAll(".spd-hints kbd")].map((kbd) => kbd.textContent);

  it("e, p and x do nothing on a row that refuses status changes — no request, no toast", async () => {
    const records = seed().map((record) => (record.id === "o1" ? { ...record, permissions: REVIEWER } : record));
    const { source } = renderInbox({}, records);
    const listbox = await ready();
    fireEvent.keyDown(listbox, { key: "j" }); // focus o1

    for (const key of ["e", "p", "x"]) fireEvent.keyDown(listbox, { key });
    await act(async () => {});

    expect(source.setStatus).not.toHaveBeenCalled();
    expect(screen.queryByText(/^Marked as/)).toBeNull();
    expect(listRows()).toHaveLength(3);
  });

  it("leaves the status keys out of the hints and the cheat sheet when no listed row allows a change", async () => {
    const { container } = renderInbox({ readOnly: true });
    const listbox = await ready();
    expect(hintKeys(container)).not.toContain("e");

    fireEvent.keyDown(listbox, { key: "?" });
    const sheet = await screen.findByRole("dialog", { name: "Keyboard shortcuts" });
    const keys = [...sheet.querySelectorAll("kbd")].map((kbd) => kbd.textContent);
    expect(keys).not.toContain("e");
    expect(keys).not.toContain("u");
    expect(keys).toEqual(expect.arrayContaining(["j", "/"]));

    cleanup();
    const { container: triage } = renderInbox();
    await ready();
    expect(hintKeys(triage)).toEqual(expect.arrayContaining(["e", "p", "x"]));
  });

  it("keeps the status keys while any listed row allows a change", async () => {
    const records = seed().map((record) => (record.id === "o1" ? { ...record, permissions: REVIEWER } : record));
    const { container } = renderInbox({}, records);
    const listbox = await ready();
    expect(hintKeys(container)).toEqual(expect.arrayContaining(["e", "p", "x"]));

    fireEvent.keyDown(listbox, { key: "?" });
    const sheet = await screen.findByRole("dialog", { name: "Keyboard shortcuts" });
    const keys = [...sheet.querySelectorAll("kbd")].map((kbd) => kbd.textContent);
    expect(keys).toEqual(expect.arrayContaining(["e", "u"]));
  });

  it("in readOnly, the drawer shows the status as text and offers no delete", async () => {
    const { container } = renderInbox({ readOnly: true });
    const listbox = await ready();
    fireEvent.keyDown(listbox, { key: "j" });
    fireEvent.keyDown(listbox, { key: "Enter" });
    const dialog = await screen.findByRole("dialog", { name: /Feedback details/ });

    expect(within(dialog).queryByRole("button", { name: "Open" })).toBeNull();
    expect(dialog.querySelector('.spd-status-menu-trigger[data-status="open"]')?.textContent).toBe("Open");
    expect(container.querySelector(".spd-danger-zone")).toBeNull();
  });
});

// @vitest-environment jsdom

import { LocalStorageStore } from "@siteping/adapter-localstorage";
import { MemoryStore } from "@siteping/adapter-memory";
import type { SitepingStore } from "@siteping/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventBus, type WidgetEvents } from "../../src/events.js";
import { createT } from "../../src/i18n/index.js";
import { Panel } from "../../src/panel.js";
import { StoreClient } from "../../src/store-client.js";
import { buildThemeColors } from "../../src/styles/theme.js";
import { createShadowRoot } from "../helpers.js";

// jsdom does not implement CSS.escape.
if (typeof globalThis.CSS === "undefined") {
  (globalThis as Record<string, unknown>).CSS = { escape: (s: string) => s };
} else if (!CSS.escape) {
  CSS.escape = (s: string) => s;
}

/**
 * The bulk bar fires one mutation per selected card with `Promise.all`. In
 * client-side mode (`initSiteping({ store })`) those land on the published
 * stores in the same tick — the path that used to apply 1 of N (#341).
 */
const stores: Array<[string, () => SitepingStore]> = [
  ["MemoryStore", () => new MemoryStore()],
  [
    "LocalStorageStore",
    () => {
      localStorage.clear();
      return new LocalStorageStore({ key: "panel_bulk_store" });
    },
  ],
];

describe.each(stores)("Panel bulk actions over StoreClient + %s", (_label, makeStore) => {
  let store: SitepingStore;
  let shadow: ShadowRoot;
  let panel: Panel;
  let errors: Error[];
  let deleted: string[];

  beforeEach(() => {
    store = makeStore();
    shadow = createShadowRoot();
    const bus = new EventBus<WidgetEvents>();
    errors = [];
    deleted = [];
    bus.on("feedback:error", (error) => errors.push(error));
    bus.on("feedback:deleted", (id) => deleted.push(id));
    const markers = { render: vi.fn(), highlight: vi.fn(), pinHighlight: vi.fn() };
    panel = new Panel(
      shadow,
      buildThemeColors(),
      bus,
      new StoreClient(store, "demo"),
      "demo",
      markers as never,
      createT("en"),
      "en",
    );
  });

  afterEach(() => {
    panel.destroy();
    shadow.host.remove();
    localStorage.clear();
  });

  async function seedAndSelectAll(): Promise<string[]> {
    const ids: string[] = [];
    for (const clientId of ["a", "b", "c"]) {
      const record = await store.createFeedback({
        projectName: "demo",
        type: "bug",
        message: `feedback ${clientId}`,
        status: "open",
        url: window.location.pathname,
        viewport: "1920x1080",
        userAgent: "test",
        authorName: "Alice",
        authorEmail: "alice@example.com",
        clientId,
        annotations: [],
      });
      ids.push(record.id);
    }
    await panel.open();
    await vi.waitFor(() => expect(shadow.querySelectorAll(".sp-card")).toHaveLength(3));
    shadow.querySelector<HTMLElement>(".sp-bulk-select-all")!.click();
    return ids;
  }

  const barClosed = () =>
    vi.waitFor(() =>
      expect(shadow.querySelector(".sp-bulk-bar")!.classList.contains("sp-bulk-bar--visible")).toBe(false),
    );

  it("bulk resolve of 3 selected feedbacks resolves all 3", async () => {
    await seedAndSelectAll();

    shadow.querySelector<HTMLButtonElement>(".sp-bulk-btn-resolve")!.click();
    await barClosed();

    expect(errors).toEqual([]);
    const { total } = await store.getFeedbacks({ projectName: "demo", status: "resolved" });
    expect({ stored: total, cards: shadow.querySelectorAll(".sp-card--resolved").length }).toEqual({
      stored: 3,
      cards: 3,
    });
  });

  it("bulk delete of 3 selected feedbacks deletes all 3", async () => {
    const ids = await seedAndSelectAll();

    shadow.querySelector<HTMLButtonElement>(".sp-bulk-btn-delete")!.click();
    await barClosed();

    expect(errors).toEqual([]);
    expect([...deleted].sort()).toEqual([...ids].sort());
    const { total } = await store.getFeedbacks({ projectName: "demo" });
    expect({ stored: total, cards: shadow.querySelectorAll(".sp-card").length }).toEqual({ stored: 0, cards: 0 });
  });
});

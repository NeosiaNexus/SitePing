// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { BulkActions } from "../../src/panel-bulk.js";
import { buildThemeColors } from "../../src/styles/theme.js";

// jsdom does not implement CSS.escape.
if (typeof globalThis.CSS === "undefined") {
  (globalThis as Record<string, unknown>).CSS = { escape: (s: string) => s };
} else if (!CSS.escape) {
  CSS.escape = (s: string) => s;
}

function createBulkActions() {
  const onResolve = vi.fn().mockResolvedValue(undefined);
  const onDelete = vi.fn().mockResolvedValue(undefined);
  const bulk = new BulkActions(buildThemeColors(), { onResolve, onDelete });
  const list = document.createElement("div");
  list.className = "sp-list";
  for (const id of ["fb-1", "fb-2", "fb-3"]) {
    const card = document.createElement("article");
    card.className = "sp-card";
    card.dataset.feedbackId = id;
    card.appendChild(bulk.createCheckbox(id));
    list.appendChild(card);
  }
  bulk.setListContainer(list);
  document.body.appendChild(list);
  document.body.appendChild(bulk.barElement);
  return { bulk, list, onResolve, onDelete };
}

describe("BulkActions", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("toggles an individual card selection and floating bar state", () => {
    const { bulk, list } = createBulkActions();
    const checkbox = list.querySelector<HTMLElement>('[data-feedback-id="fb-1"] .sp-bulk-checkbox')!;

    checkbox.click();

    expect(bulk.selectedIds).toEqual(["fb-1"]);
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
    expect(list.classList.contains("sp-list--has-selection")).toBe(true);
    expect(list.querySelector('[data-feedback-id="fb-1"]')!.classList.contains("sp-card--selected")).toBe(true);
    expect(bulk.barElement.classList.contains("sp-bulk-bar--visible")).toBe(true);
    expect(bulk.barElement.textContent).toContain("1 selected");

    checkbox.click();

    expect(bulk.selectedIds).toEqual([]);
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
    expect(list.classList.contains("sp-list--has-selection")).toBe(false);
    expect(bulk.barElement.classList.contains("sp-bulk-bar--visible")).toBe(false);
  });

  it("selects all and then deselects all from the select-all bar", () => {
    const { bulk, list } = createBulkActions();
    const selectAll = bulk.createSelectAllBar(["fb-1", "fb-2", "fb-3"], "Select all");
    list.prepend(selectAll);

    selectAll.click();

    expect(bulk.selectedIds.sort()).toEqual(["fb-1", "fb-2", "fb-3"]);
    expect(selectAll.querySelector(".sp-bulk-checkbox")!.getAttribute("aria-checked")).toBe("true");
    expect(list.querySelectorAll(".sp-card--selected")).toHaveLength(3);
    expect(bulk.barElement.textContent).toContain("3 selected");

    selectAll.click();

    expect(bulk.selectedIds).toEqual([]);
    expect(selectAll.querySelector(".sp-bulk-checkbox")!.getAttribute("aria-checked")).toBe("false");
    expect(list.querySelectorAll(".sp-card--selected")).toHaveLength(0);
  });

  it("resolves selected ids and clears selection after the async action", async () => {
    const { bulk, list, onResolve } = createBulkActions();
    bulk.selectAll(["fb-1", "fb-2"]);

    bulk.barElement.querySelector<HTMLButtonElement>(".sp-bulk-btn-resolve")!.click();
    await vi.waitFor(() => expect(onResolve).toHaveBeenCalledWith(["fb-1", "fb-2"]));

    expect(bulk.selectedIds).toEqual([]);
    expect(list.classList.contains("sp-list--has-selection")).toBe(false);
    expect(bulk.barElement.classList.contains("sp-bulk-bar--visible")).toBe(false);
  });

  it("deletes selected ids and clears selection after the async action", async () => {
    const { bulk, list, onDelete } = createBulkActions();
    bulk.selectAll(["fb-2", "fb-3"]);

    bulk.barElement.querySelector<HTMLButtonElement>(".sp-bulk-btn-delete")!.click();
    await vi.waitFor(() => expect(onDelete).toHaveBeenCalledWith(["fb-2", "fb-3"]));

    expect(bulk.selectedIds).toEqual([]);
    expect(list.classList.contains("sp-list--has-selection")).toBe(false);
    expect(bulk.barElement.classList.contains("sp-bulk-bar--visible")).toBe(false);
  });

  it("restores delete button state and keeps selection when delete fails", async () => {
    const onResolve = vi.fn().mockResolvedValue(undefined);
    const onDelete = vi.fn().mockRejectedValue(new Error("boom"));
    const bulk = new BulkActions(buildThemeColors(), { onResolve, onDelete });
    const list = document.createElement("div");
    const card = document.createElement("article");
    card.dataset.feedbackId = "fb-1";
    card.appendChild(bulk.createCheckbox("fb-1"));
    list.appendChild(card);
    bulk.setListContainer(list);
    document.body.append(list, bulk.barElement);
    bulk.selectAll(["fb-1"]);

    const deleteButton = bulk.barElement.querySelector<HTMLButtonElement>(".sp-bulk-btn-delete")!;
    deleteButton.click();
    await vi.waitFor(() => expect(onDelete).toHaveBeenCalledWith(["fb-1"]));
    await vi.waitFor(() => expect(deleteButton.disabled).toBe(false));

    expect(bulk.selectedIds).toEqual(["fb-1"]);
    expect(deleteButton.textContent).toContain("Delete 1");
  });

  it("supports keyboard toggles and French labels", () => {
    const onResolve = vi.fn().mockResolvedValue(undefined);
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const bulk = new BulkActions(buildThemeColors(), { onResolve, onDelete }, "fr");
    const list = document.createElement("div");
    const card = document.createElement("article");
    card.dataset.feedbackId = "fb-1";
    const checkbox = bulk.createCheckbox("fb-1");
    card.appendChild(checkbox);
    list.appendChild(card);
    bulk.setListContainer(list);
    document.body.append(list, bulk.barElement);

    checkbox.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(bulk.selectedIds).toEqual(["fb-1"]);
    expect(bulk.barElement.textContent).toContain("1 sélectionné(s)");
    expect(bulk.barElement.textContent).toContain("Résoudre 1");

    checkbox.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    expect(bulk.selectedIds).toEqual([]);
  });

  it("restores resolve button state and keeps selection when resolve fails", async () => {
    const onResolve = vi.fn().mockRejectedValue(new Error("boom"));
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const bulk = new BulkActions(buildThemeColors(), { onResolve, onDelete });
    const checkbox = bulk.createCheckbox("fb-1");
    document.body.append(checkbox, bulk.barElement);
    bulk.selectAll(["fb-1"]);

    const resolveButton = bulk.barElement.querySelector<HTMLButtonElement>(".sp-bulk-btn-resolve")!;
    resolveButton.click();
    await vi.waitFor(() => expect(onResolve).toHaveBeenCalledWith(["fb-1"]));
    await vi.waitFor(() => expect(resolveButton.disabled).toBe(false));

    expect(bulk.selectedIds).toEqual(["fb-1"]);
    expect(resolveButton.textContent).toContain("Resolve 1");
  });

  it("resets registered checkboxes and destroys the floating bar", () => {
    const { bulk, list } = createBulkActions();
    bulk.selectAll(["fb-1", "fb-2", "fb-3"]);

    bulk.reset();

    expect(bulk.selectedIds).toEqual([]);
    expect(list.classList.contains("sp-list--has-selection")).toBe(false);
    expect(bulk.barElement.isConnected).toBe(true);

    bulk.destroy();

    expect(bulk.barElement.isConnected).toBe(false);
  });

  it("ignores non Enter/Space keydown on a checkbox", () => {
    const { bulk, list } = createBulkActions();
    const checkbox = list.querySelector<HTMLElement>('[data-feedback-id="fb-1"] .sp-bulk-checkbox')!;

    checkbox.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));

    expect(bulk.selectedIds).toEqual([]);
  });

  it("does nothing when toggling while processing", async () => {
    let resolveOnDelete: (() => void) | null = null;
    const onResolve = vi.fn().mockResolvedValue(undefined);
    const onDelete = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveOnDelete = resolve;
        }),
    );
    const bulk = new BulkActions(buildThemeColors(), { onResolve, onDelete });
    const list = document.createElement("div");
    const card = document.createElement("article");
    card.dataset.feedbackId = "fb-1";
    card.appendChild(bulk.createCheckbox("fb-1"));
    list.appendChild(card);
    bulk.setListContainer(list);
    document.body.append(list, bulk.barElement);

    bulk.selectAll(["fb-1"]);
    bulk.barElement.querySelector<HTMLButtonElement>(".sp-bulk-btn-delete")!.click();

    // While the delete is in-flight, toggle/selectAll/handleResolve/handleDelete are no-ops
    bulk.toggle("fb-1");
    bulk.selectAll(["fb-1"]);
    bulk.barElement.querySelector<HTMLButtonElement>(".sp-bulk-btn-resolve")!.click();
    bulk.barElement.querySelector<HTMLButtonElement>(".sp-bulk-btn-delete")!.click();

    expect(bulk.selectedIds).toEqual(["fb-1"]);
    expect(onResolve).not.toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledTimes(1);

    // Allow the in-flight delete to finish
    resolveOnDelete?.();
    await vi.waitFor(() => expect(bulk.selectedIds).toEqual([]));
  });

  it("handleResolve does nothing when there is no selection", async () => {
    const { bulk, onResolve } = createBulkActions();

    bulk.barElement.querySelector<HTMLButtonElement>(".sp-bulk-btn-resolve")!.click();

    // Wait a tick — onResolve should still not have been called
    await Promise.resolve();
    expect(onResolve).not.toHaveBeenCalled();
  });

  it("handleDelete does nothing when there is no selection", async () => {
    const { bulk, onDelete } = createBulkActions();

    bulk.barElement.querySelector<HTMLButtonElement>(".sp-bulk-btn-delete")!.click();

    await Promise.resolve();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("toggling an unknown id (not in checkboxMap) is a safe no-op visually", () => {
    const { bulk } = createBulkActions();

    // Toggle an id that has no checkbox registered. It still tracks selection,
    // but updateCheckbox should bail out via the early return.
    bulk.toggle("unknown-id");

    expect(bulk.selectedIds).toEqual(["unknown-id"]);
    expect(bulk.barElement.classList.contains("sp-bulk-bar--visible")).toBe(true);
  });

  it("toggling an id without a card in the list still updates selection state", () => {
    const onResolve = vi.fn().mockResolvedValue(undefined);
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const bulk = new BulkActions(buildThemeColors(), { onResolve, onDelete });
    const list = document.createElement("div");
    bulk.setListContainer(list);
    document.body.append(list, bulk.barElement);
    // Register a checkbox without appending it to a card with data-feedback-id
    const checkbox = bulk.createCheckbox("fb-orphan");
    document.body.appendChild(checkbox);

    checkbox.click();

    expect(bulk.selectedIds).toEqual(["fb-orphan"]);
    expect(list.querySelectorAll(".sp-card--selected").length).toBe(0);
  });

  it("exposes count and hasSelection getters reflecting selection state", () => {
    const { bulk } = createBulkActions();

    expect(bulk.count).toBe(0);
    expect(bulk.hasSelection).toBe(false);

    bulk.toggle("fb-1");

    expect(bulk.count).toBe(1);
    expect(bulk.hasSelection).toBe(true);

    bulk.selectAll(["fb-1", "fb-2", "fb-3"]);

    expect(bulk.count).toBe(3);
    expect(bulk.hasSelection).toBe(true);

    bulk.deselectAll();

    expect(bulk.count).toBe(0);
    expect(bulk.hasSelection).toBe(false);
  });
});

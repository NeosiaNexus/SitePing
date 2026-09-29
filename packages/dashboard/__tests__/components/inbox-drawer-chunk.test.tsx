// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { SitepingInbox } from "../../src/components/inbox.js";
import { makeRecord, makeSource } from "../helpers.js";
import { installJsdomStubs } from "../render.js";

// The drawer's chunk cannot be fetched (offline, a stale deploy).
vi.mock("../../src/components/drawer.js", () => {
  throw new Error("Failed to fetch dynamically imported module");
});

beforeAll(() => installJsdomStubs());
afterEach(() => cleanup());

describe("SitepingInbox — drawer chunk", () => {
  it("keeps the inbox working when the drawer's chunk fails to load", async () => {
    const source = makeSource([
      makeRecord({ id: "a", message: "First", createdAt: new Date("2026-07-20T10:02:00Z") }),
      makeRecord({ id: "b", message: "Second", createdAt: new Date("2026-07-20T10:01:00Z") }),
    ]);
    render(<SitepingInbox source={source} projects="demo" theme="dark" />);
    const listbox = await screen.findByRole("listbox");

    fireEvent.keyDown(listbox, { key: "j" });
    fireEvent.keyDown(listbox, { key: "Enter" });
    // The failed import settles into a closed drawer: nothing opened, nothing
    // left selected, and j/k move again (an open overlay drawer ignores them).
    await waitFor(() => expect(listbox.querySelector('[aria-selected="true"]')).toBeNull());
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.keyDown(listbox, { key: "j" });
    await waitFor(() => expect(listbox.querySelector(".spd-row-focused")?.textContent).toContain("Second"));
  });
});

// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { SitepingInbox } from "../../src/components/inbox.js";
import { makeRecord, makeSource } from "../helpers.js";
import { installJsdomStubs } from "../render.js";

// The drawer's chunk cannot be fetched (offline, a stale deploy) for its
// first `failures` attempts; a failed import is attempted again.
const chunk = vi.hoisted(() => ({ attempts: 0, failures: 0 }));
vi.mock("../../src/components/drawer.js", async (importOriginal) => {
  chunk.attempts += 1;
  if (chunk.attempts <= chunk.failures) throw new Error("Failed to fetch dynamically imported module");
  return importOriginal();
});

beforeAll(() => installJsdomStubs());
afterEach(() => cleanup());

describe("SitepingInbox — drawer chunk", () => {
  it("keeps the inbox working, reports a failed open and fetches the chunk again", async () => {
    // The preload on mount, the first open, and the retry once it closes.
    chunk.failures = 3;
    const onError = vi.fn();
    const source = makeSource([
      makeRecord({ id: "a", message: "First", createdAt: new Date("2026-07-20T10:02:00Z") }),
      makeRecord({ id: "b", message: "Second", createdAt: new Date("2026-07-20T10:01:00Z") }),
    ]);
    render(<SitepingInbox source={source} projects="demo" theme="dark" onError={onError} />);
    const listbox = await screen.findByRole("listbox");
    await waitFor(() => expect(chunk.attempts).toBe(1));
    // A failed preload is not an error yet: nothing asked for the drawer.
    expect(onError).not.toHaveBeenCalled();

    fireEvent.keyDown(listbox, { key: "j" });
    fireEvent.keyDown(listbox, { key: "Enter" });
    // The failed import settles into a closed drawer: nothing opened, nothing
    // left selected, and j/k move again (an open overlay drawer ignores them).
    await waitFor(() => expect(listbox.querySelector('[aria-selected="true"]')).toBeNull());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));

    fireEvent.keyDown(listbox, { key: "j" });
    await waitFor(() => expect(listbox.querySelector(".spd-row-focused")?.textContent).toContain("Second"));
    await waitFor(() => expect(chunk.attempts).toBe(3));

    fireEvent.keyDown(listbox, { key: "Enter" });
    expect(await screen.findByRole("dialog", { name: /Feedback details/ })).toBeTruthy();
    expect(onError).toHaveBeenCalledOnce();
  });
});

// @vitest-environment jsdom

import type { FeedbackPage, FeedbackRecord, SitepingStore } from "@siteping/core";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InboxSource } from "../../src/types.js";
import { useSitepingInbox } from "../../src/use-inbox.js";
import { makeRecord, makeSource } from "../helpers.js";

// Six-record demo project: three open (mixed types), one of each other status.
function demoRecords(): FeedbackRecord[] {
  return [
    makeRecord({
      id: "r1",
      status: "open",
      type: "bug",
      message: "alpha overlap",
      createdAt: new Date("2026-07-20T10:06:00Z"),
    }),
    makeRecord({
      id: "r2",
      status: "open",
      type: "question",
      message: "beta question",
      createdAt: new Date("2026-07-20T10:05:00Z"),
    }),
    makeRecord({
      id: "r3",
      status: "open",
      type: "bug",
      message: "gamma bug",
      createdAt: new Date("2026-07-20T10:04:00Z"),
    }),
    makeRecord({
      id: "r4",
      status: "in_progress",
      type: "change",
      message: "delta change",
      createdAt: new Date("2026-07-20T10:03:00Z"),
    }),
    makeRecord({
      id: "r5",
      status: "resolved",
      type: "bug",
      message: "epsilon done",
      createdAt: new Date("2026-07-20T10:02:00Z"),
    }),
    makeRecord({
      id: "r6",
      status: "wont_fix",
      type: "other",
      message: "zeta skipped",
      createdAt: new Date("2026-07-20T10:01:00Z"),
    }),
  ];
}

const ids = (items: readonly FeedbackRecord[]): string[] => items.map((r) => r.id);

afterEach(() => {
  // Unmount every rendered hook: RTL auto-cleanup is inactive without vitest
  // globals, and an unmounted-never component keeps its 250ms search-debounce
  // timer armed — firing after environment teardown as an unhandled
  // "window is not defined" (issue #206).
  cleanup();
  vi.restoreAllMocks();
});

describe("useSitepingInbox — initial fetch & counts", () => {
  it("loads page 1 for the default open filter and populates counts", async () => {
    const source = makeSource(demoRecords());
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source }));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.status).toBe("open");
    expect(ids(result.current.items)).toEqual(["r1", "r2", "r3"]);
    expect(result.current.total).toBe(3);
    expect(result.current.counts).toMatchObject({ all: 6, open: 3, in_progress: 1, resolved: 1, wont_fix: 1 });
    expect(result.current.projects).toEqual(["demo"]);
  });

  it("normalizes a single project string into an array", async () => {
    const source = makeSource(demoRecords());
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.project).toBe("demo");
  });

  it("throws when projects is empty", () => {
    const source = makeSource();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useSitepingInbox({ projects: [], source }))).toThrow(/at least one project/);
    spy.mockRestore();
  });

  it("throws when no source, store or endpoint is provided", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useSitepingInbox({ projects: "demo" }))).toThrow(/requires one of/);
    spy.mockRestore();
  });
});

describe("useSitepingInbox — filters refetch", () => {
  it("setStatus refetches with the new status", async () => {
    const source = makeSource(demoRecords());
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setStatus("resolved"));
    await waitFor(() => expect(ids(result.current.items)).toEqual(["r5"]));
    expect(result.current.total).toBe(1);
  });

  it("setType refetches within the current status", async () => {
    const source = makeSource(demoRecords());
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setType("question"));
    await waitFor(() => expect(ids(result.current.items)).toEqual(["r2"]));
  });

  it("setProject resets focus/drawer and refetches the new project", async () => {
    const source = makeSource([
      ...demoRecords(),
      makeRecord({ id: "L1", projectName: "landing", status: "open", createdAt: new Date("2026-07-20T09:00:00Z") }),
    ]);
    const { result } = renderHook(() => useSitepingInbox({ projects: ["demo", "landing"], source }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.focus("r1"));
    act(() => result.current.openFeedback("r1"));
    expect(result.current.openedId).toBe("r1");

    act(() => result.current.setProject("landing"));
    expect(result.current.focusedId).toBeNull();
    expect(result.current.openedId).toBeNull();
    await waitFor(() => expect(ids(result.current.items)).toEqual(["L1"]));
    expect(result.current.project).toBe("landing");
  });

  it("debounces search — no refetch until the delay elapses, then refetches", async () => {
    const source = makeSource(demoRecords());
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSearch("gamma"));
    // Synchronous: `search` updates immediately, the refetch has not fired yet.
    expect(result.current.search).toBe("gamma");
    expect(source.list).not.toHaveBeenCalledWith(expect.objectContaining({ search: "gamma", limit: 50 }));

    await waitFor(
      () => expect(source.list).toHaveBeenCalledWith(expect.objectContaining({ search: "gamma", page: 1, limit: 50 })),
      { timeout: 1500 },
    );
    await waitFor(() => expect(ids(result.current.items)).toEqual(["r3"]));
  });
});

describe("useSitepingInbox — pagination", () => {
  it("clamps pageSize into 1..100 (default 50)", async () => {
    const cases: Array<[number | undefined, number]> = [
      [200, 100],
      [0, 1],
      [Number.NaN, 50],
      [undefined, 50],
      [37, 37],
    ];
    for (const [input, expected] of cases) {
      const source = makeSource(demoRecords());
      const { result, unmount } = renderHook(() => useSitepingInbox({ projects: "demo", source, pageSize: input }));
      await waitFor(() => expect(result.current.loading).toBe(false));
      // The first list() call is always the main page-1 query.
      const mainQuery = source.list.mock.calls[0]?.[0] as { limit: number } | undefined;
      expect(mainQuery?.limit).toBe(expected);
      unmount();
    }
  });

  it("loadMore appends the next page and dedupes overlapping ids", async () => {
    const r1 = makeRecord({ id: "r1", status: "open" });
    const r2 = makeRecord({ id: "r2", status: "open" });
    const r3 = makeRecord({ id: "r3", status: "open" });
    const list = vi.fn(async (q): Promise<FeedbackPage> => {
      if (q.limit === 1) return { feedbacks: [], total: 3 }; // best-effort counts
      if (q.page === 1) return { feedbacks: [r1, r2], total: 3 };
      return { feedbacks: [r2, r3], total: 3 }; // page 2 repeats r2
    });
    const source: InboxSource = { list, setStatus: vi.fn(), remove: vi.fn() };

    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source, pageSize: 2 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(ids(result.current.items)).toEqual(["r1", "r2"]);
    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      await result.current.loadMore();
    });
    expect(ids(result.current.items)).toEqual(["r1", "r2", "r3"]);
    expect(result.current.hasMore).toBe(false);
  });

  it("loadMore is a no-op when everything is already loaded", async () => {
    const source = makeSource(demoRecords());
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const callsBefore = source.list.mock.calls.length;
    await act(async () => {
      await result.current.loadMore();
    });
    expect(source.list.mock.calls.length).toBe(callsBefore);
  });
});

describe("useSitepingInbox — focus", () => {
  it("focusNext/focusPrev walk the loaded rows and clamp at the ends", async () => {
    const source = makeSource(demoRecords());
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.focusNext()); // from null → first
    expect(result.current.focusedId).toBe("r1");
    act(() => result.current.focusNext());
    expect(result.current.focusedId).toBe("r2");
    act(() => result.current.focusPrev());
    expect(result.current.focusedId).toBe("r1");
    act(() => result.current.focusPrev()); // clamp at first
    expect(result.current.focusedId).toBe("r1");
  });
});

describe("useSitepingInbox — changeStatus / undo", () => {
  it("optimistically removes a row that leaves the filter, advances focus, and undo reinserts it", async () => {
    const source = makeSource(demoRecords());
    const onStatusChange = vi.fn();
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source, onStatusChange }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.focus("r2"));
    await act(async () => {
      await result.current.changeStatus("r2", "resolved");
    });

    // r2 (now resolved) left the "open" list; focus moved to the row that took its slot.
    expect(ids(result.current.items)).toEqual(["r1", "r3"]);
    expect(result.current.focusedId).toBe("r3");
    expect(result.current.pendingUndo).toEqual({ id: "r2", previousStatus: "open" });
    expect(result.current.counts.open).toBe(2);
    expect(result.current.counts.resolved).toBe(2);
    expect(onStatusChange).toHaveBeenCalledWith(expect.objectContaining({ id: "r2", status: "resolved" }), "open");

    await act(async () => {
      await result.current.undo();
    });
    expect(ids(result.current.items)).toEqual(["r1", "r2", "r3"]);
    expect(result.current.pendingUndo).toBeNull();
    expect(result.current.counts.open).toBe(3);
  });

  it("keeps the row in place and updates it when the filter still includes the new status", async () => {
    const source = makeSource(demoRecords());
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setStatus("all"));
    await waitFor(() => expect(ids(result.current.items)).toHaveLength(6));

    await act(async () => {
      await result.current.changeStatus("r1", "in_progress");
    });
    expect(ids(result.current.items)).toContain("r1");
    expect(result.current.items.find((r) => r.id === "r1")?.status).toBe("in_progress");
  });

  it("rolls back and reports on a failed status change", async () => {
    const source = makeSource(demoRecords());
    source.control.failNextSetStatus = new Error("patch failed");
    const onError = vi.fn();
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source, onError }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await expect(result.current.changeStatus("r2", "resolved")).rejects.toThrow("patch failed");
    });

    expect(ids(result.current.items)).toEqual(["r1", "r2", "r3"]);
    expect(result.current.items.find((r) => r.id === "r2")?.status).toBe("open");
    expect(result.current.pendingUndo).toBeNull();
    expect(result.current.counts.open).toBe(3);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("changeStatus to the same status is a no-op", async () => {
    const source = makeSource(demoRecords());
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.changeStatus("r1", "open");
    });
    expect(source.setStatus).not.toHaveBeenCalled();
  });
});

describe("useSitepingInbox — deleteFeedback", () => {
  it("optimistically removes and calls onDelete", async () => {
    const source = makeSource(demoRecords());
    const onDelete = vi.fn();
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source, onDelete }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.focus("r2"));
    await act(async () => {
      await result.current.deleteFeedback("r2");
    });

    expect(ids(result.current.items)).toEqual(["r1", "r3"]);
    expect(result.current.counts.open).toBe(2);
    expect(result.current.counts.all).toBe(5);
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "r2" }));
  });

  it("rolls back a failed delete", async () => {
    const source = makeSource(demoRecords());
    source.control.failNextRemove = new Error("delete failed");
    const onError = vi.fn();
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source, onError }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await expect(result.current.deleteFeedback("r2")).rejects.toThrow("delete failed");
    });

    expect(ids(result.current.items)).toEqual(["r1", "r2", "r3"]);
    expect(result.current.counts.open).toBe(3);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe("useSitepingInbox — latest-wins", () => {
  it("discards a slow stale response when a newer fetch has superseded it", async () => {
    const resolvers: Array<(page: FeedbackPage) => void> = [];
    const list = vi.fn(() => new Promise<FeedbackPage>((res) => resolvers.push(res)));
    const source: InboxSource = { list, setStatus: vi.fn(), remove: vi.fn() };

    const recA = makeRecord({ id: "A" });
    const recB = makeRecord({ id: "B" });

    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1)); // main A pending

    act(() => result.current.setStatus("all"));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2)); // main B pending

    // Resolve the OLD request first — it must be ignored (token superseded).
    await act(async () => {
      resolvers[0]?.({ feedbacks: [recA], total: 1 });
    });
    // Resolve the NEW request — it wins.
    await act(async () => {
      resolvers[1]?.({ feedbacks: [recB], total: 1 });
    });
    await waitFor(() => expect(list).toHaveBeenCalledTimes(7)); // main B + 5 counts

    expect(ids(result.current.items)).toEqual(["B"]);

    // Drain the count promises so none stay pending.
    await act(async () => {
      for (let i = 2; i < resolvers.length; i++) resolvers[i]?.({ feedbacks: [], total: 0 });
    });
  });
});

describe("useSitepingInbox — refresh & project prop changes", () => {
  it("refresh re-runs the current query", async () => {
    const source = makeSource(demoRecords());
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const before = source.list.mock.calls.length;
    await act(async () => {
      await result.current.refresh();
    });
    expect(source.list.mock.calls.length).toBeGreaterThan(before);
  });

  it("resets to the first project when the projects prop no longer includes the selection", async () => {
    const source = makeSource([
      ...demoRecords(),
      makeRecord({ id: "L1", projectName: "landing", createdAt: new Date("2026-07-20T09:00:00Z") }),
    ]);
    const { result, rerender } = renderHook(
      ({ projects }: { projects: readonly string[] }) => useSitepingInbox({ projects, source }),
      { initialProps: { projects: ["demo", "landing"] as readonly string[] } },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setProject("landing"));
    await waitFor(() => expect(result.current.project).toBe("landing"));

    rerender({ projects: ["demo"] as readonly string[] });
    await waitFor(() => expect(result.current.project).toBe("demo"));
  });
});

describe("useSitepingInbox — source selection", () => {
  it("builds a store source when `store` is provided", async () => {
    const getFeedbacks = vi.fn(async () => ({ feedbacks: [makeRecord({ id: "s1" })], total: 1 }));
    const store = {
      getFeedbacks,
      updateFeedback: vi.fn(),
      deleteFeedback: vi.fn(),
      createFeedback: vi.fn(),
      findByClientId: vi.fn(),
      deleteAllFeedbacks: vi.fn(),
    } as unknown as SitepingStore;

    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", store }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(ids(result.current.items)).toEqual(["s1"]);
    expect(getFeedbacks).toHaveBeenCalled();
  });

  it("builds an endpoint source and forwards a headers function", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ feedbacks: [], total: 0 }), { status: 200 }));
    const headers = vi.fn(() => ({ "X-From": "fn" }));

    const { result } = renderHook(() =>
      useSitepingInbox({ projects: "demo", endpoint: "https://api.example/siteping", apiKey: "k", headers }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchSpy).toHaveBeenCalled();
    expect(headers).toHaveBeenCalled();
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    const sent = init.headers as Record<string, string>;
    expect(sent.Authorization).toBe("Bearer k");
    expect(sent["X-From"]).toBe("fn");
    fetchSpy.mockRestore();
  });

  it("builds an endpoint source and forwards a static headers object", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ feedbacks: [], total: 0 }), { status: 200 }));

    const { result } = renderHook(() =>
      useSitepingInbox({ projects: "demo", endpoint: "https://api.example/siteping", headers: { "X-Team": "acme" } }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)["X-Team"]).toBe("acme");
    fetchSpy.mockRestore();
  });
});

describe("useSitepingInbox — resilience & drawer survival", () => {
  it("keeps the list when the background count queries fail", async () => {
    const list = vi.fn(async (q): Promise<FeedbackPage> => {
      if (q.limit === 1) throw new Error("count failed"); // best-effort counts blow up
      return { feedbacks: [makeRecord({ id: "x" })], total: 1 };
    });
    const source: InboxSource = { list, setStatus: vi.fn(), remove: vi.fn() };
    const onError = vi.fn();

    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source, onError }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(ids(result.current.items)).toEqual(["x"]);
    expect(result.current.error).toBeNull();
    expect(result.current.counts).toEqual({}); // every count stayed undefined
    expect(onError).not.toHaveBeenCalled();
  });

  it("surfaces an error when loadMore fails", async () => {
    const r1 = makeRecord({ id: "r1", status: "open" });
    const r2 = makeRecord({ id: "r2", status: "open" });
    const list = vi.fn(async (q): Promise<FeedbackPage> => {
      if (q.limit === 1) return { feedbacks: [], total: 3 };
      if (q.page === 1) return { feedbacks: [r1, r2], total: 3 };
      throw new Error("page 2 failed");
    });
    const source: InboxSource = { list, setStatus: vi.fn(), remove: vi.fn() };
    const onError = vi.fn();

    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source, pageSize: 2, onError }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.loadMore();
    });
    expect(result.current.error?.message).toBe("page 2 failed");
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("keeps the opened record available after its row leaves the filtered list", async () => {
    const source = makeSource(demoRecords());
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.openFeedback("r2"));
    expect(result.current.opened?.id).toBe("r2");

    await act(async () => {
      await result.current.changeStatus("r2", "resolved");
    });
    // r2 left the "open" list, but the drawer still resolves it from the cache.
    expect(ids(result.current.items)).not.toContain("r2");
    expect(result.current.opened?.id).toBe("r2");
    expect(result.current.opened?.status).toBe("resolved");
  });

  it("clears a pending undo when the same feedback is deleted", async () => {
    const source = makeSource(demoRecords());
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setStatus("all"));
    await waitFor(() => expect(result.current.items).toHaveLength(6));

    await act(async () => {
      await result.current.changeStatus("r1", "in_progress"); // stays in the "all" list → pendingUndo set
    });
    expect(result.current.pendingUndo).toEqual({ id: "r1", previousStatus: "open" });

    await act(async () => {
      await result.current.deleteFeedback("r1");
    });
    expect(result.current.pendingUndo).toBeNull();
    expect(ids(result.current.items)).not.toContain("r1");
  });
});

describe("useSitepingInbox — edge branches", () => {
  it("wraps a non-Error rejection from setStatus", async () => {
    const source = makeSource(demoRecords());
    source.setStatus.mockRejectedValueOnce("string failure");
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await expect(result.current.changeStatus("r2", "resolved")).rejects.toThrow("string failure");
    });
  });

  it("reinserts an undone row at the tail when it is the oldest", async () => {
    const source = makeSource(demoRecords());
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.changeStatus("r3", "resolved"); // r3 is the oldest open row
    });
    expect(ids(result.current.items)).toEqual(["r1", "r2"]);
    await act(async () => {
      await result.current.undo();
    });
    expect(ids(result.current.items)).toEqual(["r1", "r2", "r3"]); // appended back at the tail
  });

  it("builds an endpoint source with no headers option", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ feedbacks: [], total: 0 }), { status: 200 }));
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", endpoint: "https://api.example/x" }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("loadMore paginates while on the 'all' filter", async () => {
    const source = makeSource(demoRecords());
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source, pageSize: 2 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setStatus("all"));
    // Gate on total===6 (unique to the "all" filter) so we don't race the
    // initial open-filter load, which also shows 2 rows at pageSize 2.
    await waitFor(() => expect(result.current.total).toBe(6));
    expect(result.current.items).toHaveLength(2);
    await act(async () => {
      await result.current.loadMore();
    });
    expect(result.current.items).toHaveLength(4);
  });

  it("focusNext/focusPrev are no-ops on an empty list", async () => {
    const source = makeSource([]);
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.focusNext());
    expect(result.current.focusedId).toBeNull();
    act(() => result.current.focusPrev());
    expect(result.current.focusedId).toBeNull();
  });

  it("focusNext clamps at the last row", async () => {
    const source = makeSource(demoRecords());
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.focus("r3"));
    act(() => result.current.focusNext());
    expect(result.current.focusedId).toBe("r3");
  });

  it("changeStatus is a no-op for an unknown id", async () => {
    const source = makeSource(demoRecords());
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.changeStatus("nope", "resolved");
    });
    expect(source.setStatus).not.toHaveBeenCalled();
  });

  it("undo is a no-op when there is nothing pending", async () => {
    const source = makeSource(demoRecords());
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.undo();
    });
    expect(source.setStatus).not.toHaveBeenCalled();
    expect(result.current.pendingUndo).toBeNull();
  });

  it("deleteFeedback is a no-op for an unknown id", async () => {
    const source = makeSource(demoRecords());
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.deleteFeedback("nope");
    });
    expect(source.remove).not.toHaveBeenCalled();
  });

  it("keeps focus when a non-focused row leaves the filter", async () => {
    const source = makeSource(demoRecords());
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.focus("r1"));
    await act(async () => {
      await result.current.changeStatus("r3", "resolved"); // r3 leaves, r1 stays focused
    });
    expect(result.current.focusedId).toBe("r1");
    expect(ids(result.current.items)).toEqual(["r1", "r2"]);
  });

  it("clears focus when the last visible row is deleted", async () => {
    const source = makeSource(demoRecords());
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setStatus("resolved"));
    await waitFor(() => expect(ids(result.current.items)).toEqual(["r5"]));
    act(() => result.current.focus("r5"));
    await act(async () => {
      await result.current.deleteFeedback("r5");
    });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.focusedId).toBeNull();
  });

  it("leaves unknown counts untouched on a mutation", async () => {
    const rec = makeRecord({ id: "x", status: "open" });
    const list = vi.fn(async (q): Promise<FeedbackPage> => {
      if (q.limit === 1) throw new Error("counts unavailable"); // counts stay undefined
      return { feedbacks: [rec], total: 1 };
    });
    const setStatus = vi.fn(async (_id: string, _p: string, status): Promise<FeedbackRecord> => ({ ...rec, status }));
    const source: InboxSource = { list, setStatus, remove: vi.fn() };

    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.counts).toEqual({});

    await act(async () => {
      await result.current.changeStatus("x", "resolved");
    });
    expect(result.current.counts).toEqual({}); // adjustCounts skipped the unknown keys
  });

  it("focusPrev from an unknown focused id selects the first row", async () => {
    const source = makeSource(demoRecords());
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.focus("ghost"));
    act(() => result.current.focusPrev());
    expect(result.current.focusedId).toBe("r1");
  });

  it("deletes an opened record that already left the list via the drawer cache", async () => {
    const source = makeSource(demoRecords());
    const onDelete = vi.fn();
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source, onDelete }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.openFeedback("r2"));
    await act(async () => {
      await result.current.changeStatus("r2", "resolved"); // r2 leaves the open list, stays open in the drawer
    });
    expect(ids(result.current.items)).not.toContain("r2");
    expect(result.current.openedId).toBe("r2");

    await act(async () => {
      await result.current.deleteFeedback("r2"); // resolved via the opened cache
    });
    expect(result.current.openedId).toBeNull();
    expect(result.current.opened).toBeNull();
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "r2" }));
  });
});

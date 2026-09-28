// @vitest-environment jsdom

import type { FeedbackPage, FeedbackRecord, SitepingStore } from "@siteping/core";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InboxSource } from "../../src/types.js";
import { useSitepingInbox } from "../../src/use-inbox.js";
import { deferred, makeRecord, makeSource, type TestSource } from "../helpers.js";

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
    // The union rejects this at compile time — the runtime guard exists for
    // JS consumers, and this test is what keeps it alive.
    // @ts-expect-error - no source, store or endpoint supplied
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

describe("useSitepingInbox — focus survives only in the list it points into", () => {
  it("clears focusedId when a new list doesn't contain it, keeps it when it does", async () => {
    const { result } = await mountDemo();
    act(() => result.current.focus("r2"));
    await act(async () => {
      await result.current.refresh(); // r2 is still there
    });
    expect(result.current.focusedId).toBe("r2");

    act(() => result.current.setStatus("resolved"));
    await waitFor(() => expect(ids(result.current.items)).toEqual(["r5"]));
    expect(result.current.focusedId).toBeNull();
  });

  it("openFeedback ignores an id that is neither listed nor cached", async () => {
    const { result } = await mountDemo();
    act(() => result.current.openFeedback("ghost"));
    expect(result.current.openedId).toBeNull();
    expect(result.current.focusedId).toBeNull();
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

  it("the opened record tracks an in-flight change (and its rollback) after its row left the list", async () => {
    const source = makeSource(demoRecords());
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.openFeedback("r1"));
    await act(async () => {
      await result.current.changeStatus("r1", "resolved"); // leaves the open list
    });
    const held = deferred<FeedbackRecord>();
    source.setStatus.mockImplementationOnce(() => held.promise);
    let change!: Promise<unknown>;
    act(() => {
      change = result.current.changeStatus("r1", "in_progress").catch((e: unknown) => e);
    });
    expect(result.current.opened?.status).toBe("in_progress");

    await act(async () => {
      held.reject(new Error("patch failed"));
      await change;
    });
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

/** Let every pending microtask/macrotask settle (e.g. a load's background count queries). */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** Mount the demo project and wait until both page 1 and the tab counts have landed. */
async function mountDemo(source = makeSource(demoRecords())) {
  const hook = renderHook(() => useSitepingInbox({ projects: "demo", source }));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  await settle();
  return { source, ...hook };
}

/** Hold the next setStatus: the source applies it (server state changes) only once the returned gate resolves. */
function holdNextSetStatus(source: TestSource) {
  const real = source.setStatus.getMockImplementation();
  const gate = deferred<void>();
  source.setStatus.mockImplementationOnce(async (id, projectName, status) => {
    await gate.promise;
    if (!real) throw new Error("no setStatus implementation");
    return real(id, projectName, status);
  });
  return gate;
}

describe("useSitepingInbox — concurrent mutations roll back per record", () => {
  it("a failed change restores only its own row — a concurrent success survives", async () => {
    const { source, result } = await mountDemo();
    const held = deferred<FeedbackRecord>();
    source.setStatus.mockImplementationOnce(() => held.promise);

    let first!: Promise<unknown>;
    act(() => {
      first = result.current.changeStatus("r1", "resolved").catch((e: unknown) => e);
    });
    await act(async () => {
      await result.current.changeStatus("r2", "resolved");
    });
    expect(ids(result.current.items)).toEqual(["r3"]);

    await act(async () => {
      held.reject(new Error("patch failed"));
      await first;
    });

    // r2's confirmed change stands; only r1 comes back.
    expect(ids(result.current.items)).toEqual(["r1", "r3"]);
    expect(result.current.items.find((r) => r.id === "r1")?.status).toBe("open");
    expect(result.current.total).toBe(2);
    expect(result.current.counts).toMatchObject({ all: 6, open: 2, resolved: 2 });
  });

  it("two failed changes each put their own row back", async () => {
    const { source, result } = await mountDemo();
    const heldA = deferred<FeedbackRecord>();
    const heldB = deferred<FeedbackRecord>();
    source.setStatus.mockImplementationOnce(() => heldA.promise).mockImplementationOnce(() => heldB.promise);

    let a!: Promise<unknown>;
    let b!: Promise<unknown>;
    act(() => {
      a = result.current.changeStatus("r1", "resolved").catch((e: unknown) => e);
    });
    act(() => {
      b = result.current.changeStatus("r2", "resolved").catch((e: unknown) => e);
    });
    expect(ids(result.current.items)).toEqual(["r3"]);

    await act(async () => {
      heldA.reject(new Error("a failed"));
      await a;
    });
    await act(async () => {
      heldB.reject(new Error("b failed"));
      await b;
    });

    expect(ids(result.current.items)).toEqual(["r1", "r2", "r3"]);
    expect(result.current.total).toBe(3);
    expect(result.current.counts).toMatchObject({ all: 6, open: 3, resolved: 1 });
  });

  it("a failed change does not resurrect a record deleted meanwhile", async () => {
    const { source, result } = await mountDemo();
    act(() => result.current.setStatus("all"));
    await waitFor(() => expect(result.current.items).toHaveLength(6));
    await settle();

    const held = deferred<FeedbackRecord>();
    source.setStatus.mockImplementationOnce(() => held.promise);
    let change!: Promise<unknown>;
    act(() => {
      change = result.current.changeStatus("r1", "resolved").catch((e: unknown) => e);
    });
    await act(async () => {
      await result.current.deleteFeedback("r1");
    });
    await act(async () => {
      held.reject(new Error("patch failed"));
      await change;
    });

    expect(ids(result.current.items)).not.toContain("r1");
    expect(result.current.total).toBe(5);
    // r1 was open on the server and is now deleted: open and all each lose one.
    expect(result.current.counts).toMatchObject({ all: 5, open: 2, resolved: 1 });
  });

  it("a change and its undo both failing leave the record as the server has it", async () => {
    const { source, result } = await mountDemo();
    const heldChange = deferred<FeedbackRecord>();
    const heldUndo = deferred<FeedbackRecord>();
    source.setStatus.mockImplementationOnce(() => heldChange.promise).mockImplementationOnce(() => heldUndo.promise);

    let change!: Promise<unknown>;
    let undo!: Promise<unknown>;
    act(() => {
      change = result.current.changeStatus("r1", "resolved").catch((e: unknown) => e);
    });
    act(() => {
      undo = result.current.undo().catch((e: unknown) => e);
    });
    expect(ids(result.current.items)).toEqual(["r1", "r2", "r3"]);

    await act(async () => {
      heldChange.reject(new Error("change failed"));
      await change;
    });
    await act(async () => {
      heldUndo.reject(new Error("undo failed"));
      await undo;
    });

    expect(ids(result.current.items)).toEqual(["r1", "r2", "r3"]);
    expect(result.current.items.find((r) => r.id === "r1")?.status).toBe("open");
    expect(result.current.total).toBe(3);
    expect(result.current.counts).toMatchObject({ all: 6, open: 3, resolved: 1 });
  });

  it("a change made after the latest one failed still chains behind an earlier one in flight", async () => {
    const { source, result } = await mountDemo();
    act(() => result.current.setStatus("all"));
    await waitFor(() => expect(result.current.items).toHaveLength(6));
    await settle();
    const heldA = deferred<FeedbackRecord>();
    const heldB = deferred<FeedbackRecord>();
    source.setStatus.mockImplementationOnce(() => heldA.promise).mockImplementationOnce(() => heldB.promise);

    // e, e (toggles back), B fails, e again (succeeds), then A fails.
    let a!: Promise<unknown>;
    let b!: Promise<unknown>;
    act(() => {
      a = result.current.changeStatus("r1", "resolved").catch((e: unknown) => e);
    });
    act(() => {
      b = result.current.changeStatus("r1", "open").catch((e: unknown) => e);
    });
    await act(async () => {
      heldB.reject(new Error("b failed"));
      await b;
    });
    expect(result.current.items.find((r) => r.id === "r1")?.status).toBe("resolved");
    await act(async () => {
      await result.current.changeStatus("r1", "open");
    });
    await act(async () => {
      heldA.reject(new Error("a failed"));
      await a;
    });

    // The server holds r1 open: A's failure is superseded by the later success.
    expect(source.records.find((r) => r.id === "r1")?.status).toBe("open");
    expect(result.current.items.find((r) => r.id === "r1")?.status).toBe("open");
    expect(result.current.counts).toMatchObject({ all: 6, open: 3, resolved: 1 });
  });

  it("an earlier failure never rebases onto a change started after a later success", async () => {
    const { source, result } = await mountDemo();
    act(() => result.current.setStatus("all"));
    await waitFor(() => expect(result.current.items).toHaveLength(6));
    await settle();
    const heldA = deferred<FeedbackRecord>();
    source.setStatus.mockImplementationOnce(() => heldA.promise);

    let a!: Promise<unknown>;
    act(() => {
      a = result.current.changeStatus("r1", "resolved").catch((e: unknown) => e);
    });
    await act(async () => {
      await result.current.changeStatus("r1", "open");
    });
    const heldD = deferred<FeedbackRecord>();
    source.setStatus.mockImplementationOnce(() => heldD.promise);
    let d!: Promise<unknown>;
    act(() => {
      d = result.current.changeStatus("r1", "resolved").catch((e: unknown) => e);
    });
    await act(async () => {
      heldA.reject(new Error("a failed"));
      await a;
    });
    await act(async () => {
      heldD.reject(new Error("d failed"));
      await d;
    });

    expect(result.current.items.find((r) => r.id === "r1")?.status).toBe("open");
    expect(result.current.counts).toMatchObject({ all: 6, open: 3, resolved: 1 });
  });

  it("leaves no settled mutation behind to hide its row from loadMore", async () => {
    const source = makeSource([
      makeRecord({ id: "q", status: "resolved", createdAt: new Date("2026-07-20T10:09:00Z") }),
      makeRecord({ id: "p", status: "open", createdAt: new Date("2026-07-20T10:08:00Z") }),
    ]);
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source, pageSize: 1 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setStatus("all"));
    await waitFor(() => expect(ids(result.current.items)).toEqual(["q"]));
    await settle();
    await act(async () => {
      await result.current.loadMore();
    });
    expect(ids(result.current.items)).toEqual(["q", "p"]);

    // Z, A, B on p: A fails (rebased onto B), B fails as the latest, then Z fails.
    const held = [deferred<FeedbackRecord>(), deferred<FeedbackRecord>(), deferred<FeedbackRecord>()] as const;
    for (const gate of held) source.setStatus.mockImplementationOnce(() => gate.promise);
    const runs: Promise<unknown>[] = [];
    for (const next of ["resolved", "open", "resolved"] as const) {
      act(() => {
        runs.push(result.current.changeStatus("p", next).catch((e: unknown) => e));
      });
    }
    for (const index of [1, 2, 0]) {
      await act(async () => {
        held[index]?.reject(new Error("patch failed"));
        await runs[index];
      });
    }

    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.loadMore();
    });
    expect(ids(result.current.items)).toEqual(["q", "p"]);
    expect(result.current.hasMore).toBe(false);
  });

  it("a failed change keeps a refresh that was already in flight when it started", async () => {
    const { source, result } = await mountDemo();
    const r0 = makeRecord({ id: "r0", status: "open", createdAt: new Date("2026-07-20T10:07:00Z") });
    const page = deferred<FeedbackPage>();
    source.list.mockImplementationOnce(() => page.promise);

    let refreshing!: Promise<void>;
    act(() => {
      refreshing = result.current.refresh();
    });
    const held = deferred<FeedbackRecord>();
    source.setStatus.mockImplementationOnce(() => held.promise);
    let change!: Promise<unknown>;
    act(() => {
      change = result.current.changeStatus("r2", "resolved").catch((e: unknown) => e);
    });

    // The refresh lands with the server's view: r0 is new, r2 is still open.
    const open = source.records.filter((r) => r.status === "open");
    await act(async () => {
      page.resolve({ feedbacks: [r0, ...open], total: 4 });
      await refreshing;
    });
    // Those counts raced the change, so its settling starts a recount: hold it,
    // or its fresh totals would mask what the rollback did to the counts.
    const real = source.list.getMockImplementation();
    if (!real) throw new Error("no list implementation");
    const recount = deferred<void>();
    source.list.mockImplementation(async (query) => {
      if (query.limit === 1) await recount.promise;
      return real(query);
    });
    await act(async () => {
      held.reject(new Error("patch failed"));
      await change;
    });

    expect(ids(result.current.items)).toEqual(["r0", "r1", "r2", "r3"]);
    expect(result.current.items.find((r) => r.id === "r2")?.status).toBe("open");
    expect(result.current.total).toBe(4);
    // The refresh's counts already hold the server's view — the failure must not invert its deltas there.
    expect(result.current.counts).toMatchObject({ all: 6, open: 3, resolved: 1 });
    await act(async () => {
      recount.resolve();
    });
    await settle();
    expect(result.current.counts).toMatchObject({ all: 6, open: 3, resolved: 1 });
  });
});

describe("useSitepingInbox — a failure on a record the loaded list no longer holds", () => {
  /** m0..m3 open, pageSize 2: both pages loaded, m3 opened, then a refresh leaves it in the drawer only. */
  async function mountDrawerOnly(status: "open" | "all") {
    const source = makeSource(
      Array.from({ length: 4 }, (_, i) =>
        makeRecord({ id: `m${i}`, status: "open", createdAt: new Date(Date.UTC(2026, 6, 20, 10, 10 - i)) }),
      ),
    );
    const hook = renderHook(() => useSitepingInbox({ projects: "demo", source, pageSize: 2 }));
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    act(() => hook.result.current.setStatus(status));
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    await settle();
    await act(async () => {
      await hook.result.current.loadMore();
    });
    act(() => hook.result.current.openFeedback("m3"));
    await act(async () => {
      await hook.result.current.refresh();
    });
    await settle();
    expect(ids(hook.result.current.items)).toEqual(["m0", "m1"]);
    expect(hook.result.current.opened?.id).toBe("m3");
    return { source, ...hook };
  }

  it("a failed drawer change doesn't leave the record appended to the loaded page", async () => {
    const { source, result } = await mountDrawerOnly("all");
    source.setStatus.mockRejectedValueOnce(new Error("patch failed"));
    await act(async () => {
      await result.current.changeStatus("m3", "in_progress").catch(() => undefined);
    });

    expect(ids(result.current.items)).toEqual(["m0", "m1"]);
    expect(result.current.total).toBe(4);
    expect(result.current.counts).toMatchObject({ all: 4, open: 4, in_progress: 0 });
    expect(result.current.opened?.status).toBe("open");
  });

  it("a failed drawer delete doesn't insert the record into the loaded page", async () => {
    const { source, result } = await mountDrawerOnly("open");
    source.remove.mockRejectedValueOnce(new Error("delete failed"));
    await act(async () => {
      await result.current.deleteFeedback("m3").catch(() => undefined);
    });

    expect(ids(result.current.items)).toEqual(["m0", "m1"]);
    expect(result.current.total).toBe(4);
    expect(result.current.counts).toMatchObject({ all: 4, open: 4 });
    expect(result.current.opened?.id).toBe("m3");
  });

  it("a failed change leaves a page 1 refetched meanwhile as the server sent it", async () => {
    const { source, result } = await mountDrawerOnly("open");
    await act(async () => {
      await result.current.loadMore();
    });
    const held = deferred<FeedbackRecord>();
    source.setStatus.mockImplementationOnce(() => held.promise);
    let change!: Promise<unknown>;
    act(() => {
      change = result.current.changeStatus("m3", "resolved").catch((e: unknown) => e);
    });
    await act(async () => {
      await result.current.refresh(); // back to page 1: m3 sits on page 2 again
    });
    await act(async () => {
      held.reject(new Error("patch failed"));
      await change;
    });

    expect(ids(result.current.items)).toEqual(["m0", "m1"]);
    expect(result.current.total).toBe(4);
  });

  it("a failed undo takes back the row it re-inserted, and the focus with it", async () => {
    const { source, result } = await mountDemo();
    await act(async () => {
      await result.current.changeStatus("r1", "resolved");
    });
    const held = deferred<FeedbackRecord>();
    source.setStatus.mockImplementationOnce(() => held.promise);
    let undo!: Promise<unknown>;
    act(() => {
      undo = result.current.undo().catch((e: unknown) => e);
    });
    expect(ids(result.current.items)).toEqual(["r1", "r2", "r3"]);
    act(() => result.current.focus("r1"));

    await act(async () => {
      held.reject(new Error("undo failed"));
      await undo;
    });

    expect(ids(result.current.items)).toEqual(["r2", "r3"]);
    expect(result.current.total).toBe(2);
    expect(result.current.focusedId).toBe("r2");
  });
});

describe("useSitepingInbox — loadMore while a mutation is in flight", () => {
  // Six open records, m0 newest.
  function sixOpen(): FeedbackRecord[] {
    return Array.from({ length: 6 }, (_, i) =>
      makeRecord({ id: `m${i}`, status: "open", createdAt: new Date(Date.UTC(2026, 6, 20, 10, 10 - i)) }),
    );
  }

  /** Two pages (4 rows) loaded at pageSize 2, counts settled. */
  async function mountPaged() {
    const source = makeSource(sixOpen());
    const hook = renderHook(() => useSitepingInbox({ projects: "demo", source, pageSize: 2 }));
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    await settle();
    await act(async () => {
      await hook.result.current.loadMore();
    });
    expect(ids(hook.result.current.items)).toEqual(["m0", "m1", "m2", "m3"]);
    return { source, ...hook };
  }

  it("a mutation failing after a loadMore still rolls back its row and the total", async () => {
    const { source, result } = await mountPaged();
    const held = deferred<FeedbackRecord>();
    source.setStatus.mockImplementationOnce(() => held.promise);
    let change!: Promise<unknown>;
    act(() => {
      change = result.current.changeStatus("m0", "resolved").catch((e: unknown) => e);
    });
    await act(async () => {
      await result.current.loadMore(); // the server still has m0 open: page 2 is all duplicates
    });
    await act(async () => {
      held.reject(new Error("patch failed"));
      await change;
    });

    expect(ids(result.current.items)).toEqual(["m0", "m1", "m2", "m3"]);
    expect(result.current.total).toBe(6);
    expect(result.current.hasMore).toBe(true);
  });

  it("a duplicate-only page caused by an in-flight removal does not end pagination", async () => {
    const { source, result } = await mountPaged();
    const gate = holdNextSetStatus(source);
    let change!: Promise<void>;
    act(() => {
      change = result.current.changeStatus("m0", "resolved");
    });
    await act(async () => {
      await result.current.loadMore();
    });
    await act(async () => {
      gate.resolve();
      await change;
    });

    expect(ids(result.current.items)).toEqual(["m1", "m2", "m3"]);
    expect(result.current.total).toBe(5);
    expect(result.current.hasMore).toBe(true);
    await act(async () => {
      await result.current.loadMore();
    });
    await act(async () => {
      await result.current.loadMore();
    });
    expect(ids(result.current.items)).toEqual(["m1", "m2", "m3", "m4", "m5"]);
    expect(result.current.hasMore).toBe(false);
  });

  it("does not re-add a row whose removal is still in flight", async () => {
    const { source, result } = await mountPaged();
    const gate = holdNextSetStatus(source);
    let change!: Promise<void>;
    act(() => {
      change = result.current.changeStatus("m3", "resolved");
    });
    await act(async () => {
      await result.current.loadMore(); // server page 2 is still [m2, m3(open)]
    });
    expect(ids(result.current.items)).toEqual(["m0", "m1", "m2"]);

    await act(async () => {
      gate.resolve();
      await change;
    });
    expect(ids(result.current.items)).toEqual(["m0", "m1", "m2"]);
    expect(result.current.total).toBe(5);
    await act(async () => {
      await result.current.loadMore();
    });
    await act(async () => {
      await result.current.loadMore();
    });
    expect(ids(result.current.items)).toEqual(["m0", "m1", "m2", "m4", "m5"]);
    expect(result.current.hasMore).toBe(false);
  });
});

describe("useSitepingInbox — counts racing a mutation", () => {
  it("count responses that predate a mutation don't leave the tabs stale", async () => {
    const { source, result } = await mountDemo();
    // Hold the refresh's count queries on a snapshot of the server taken when they were sent.
    const real = source.list.getMockImplementation();
    if (!real) throw new Error("no list implementation");
    const heldCounts: Array<() => void> = [];
    source.list.mockImplementation((query) => {
      if (query.limit !== 1) return real(query);
      const snapshot = real(query);
      return new Promise((resolve) => heldCounts.push(() => resolve(snapshot)));
    });

    let refreshing!: Promise<void>;
    act(() => {
      refreshing = result.current.refresh();
    });
    await waitFor(() => expect(heldCounts).toHaveLength(5));
    await act(async () => {
      await result.current.changeStatus("r1", "resolved");
    });
    expect(result.current.counts).toMatchObject({ open: 2, resolved: 2 });

    source.list.mockImplementation(real);
    await act(async () => {
      for (const release of heldCounts) release();
      await refreshing;
    });
    await settle();

    expect(ids(result.current.items)).toEqual(["r2", "r3"]);
    expect(result.current.counts).toMatchObject({ all: 6, open: 2, resolved: 2 });
  });

  it("starts no recount once unmounted", async () => {
    const { source, result, unmount } = await mountDemo();
    const held = deferred<FeedbackRecord>();
    source.setStatus.mockImplementationOnce(() => held.promise);
    let change!: Promise<unknown>;
    act(() => {
      change = result.current.changeStatus("r1", "resolved").catch((e: unknown) => e);
    });
    await act(async () => {
      await result.current.refresh(); // its counts race the pending change: a recount is due
    });

    unmount();
    source.list.mockClear();
    const r1 = source.records.find((r) => r.id === "r1") as FeedbackRecord;
    await act(async () => {
      held.resolve({ ...r1, status: "resolved" });
      await change;
    });
    await settle();

    expect(source.list).not.toHaveBeenCalled();
  });
});

describe("useSitepingInbox — a success landing in a list refetched meanwhile", () => {
  it("removes the saved record when it no longer matches the refetched list", async () => {
    const { source, result } = await mountDemo();
    act(() => result.current.focus("r1"));
    const gate = holdNextSetStatus(source);
    let change!: Promise<void>;
    act(() => {
      change = result.current.changeStatus("r1", "resolved");
    });
    await act(async () => {
      await result.current.refresh(); // the server still has r1 open
    });
    expect(ids(result.current.items)).toEqual(["r1", "r2", "r3"]);

    await act(async () => {
      gate.resolve();
      await change;
    });

    // The Open tab must not show r1 as resolved.
    expect(ids(result.current.items)).toEqual(["r2", "r3"]);
    expect(result.current.total).toBe(2);
    expect(result.current.focusedId).toBe("r2");
  });

  it("adds a saved record the refetched list lacks when it now fits there (e, then 4)", async () => {
    const { source, result } = await mountDemo();
    const gate = holdNextSetStatus(source);
    let change!: Promise<void>;
    act(() => {
      change = result.current.changeStatus("r1", "resolved");
    });
    act(() => result.current.setStatus("resolved"));
    // The Resolved tab loads before the server applied the change.
    await waitFor(() => expect(ids(result.current.items)).toEqual(["r5"]));
    await settle();

    await act(async () => {
      gate.resolve();
      await change;
    });

    expect(ids(result.current.items)).toEqual(["r1", "r5"]);
    expect(result.current.total).toBe(2);
  });

  it("does not append a saved record the refetched page no longer reaches", async () => {
    const source = makeSource(
      Array.from({ length: 6 }, (_, i) =>
        makeRecord({ id: `m${i}`, status: "open", createdAt: new Date(Date.UTC(2026, 6, 20, 10, 10 - i)) }),
      ),
    );
    const { result } = renderHook(() => useSitepingInbox({ projects: "demo", source, pageSize: 2 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setStatus("all"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await settle();
    await act(async () => {
      await result.current.loadMore();
    });
    expect(ids(result.current.items)).toEqual(["m0", "m1", "m2", "m3"]);

    const gate = holdNextSetStatus(source);
    let change!: Promise<void>;
    act(() => {
      change = result.current.changeStatus("m3", "in_progress"); // stays in the "all" tab
    });
    await act(async () => {
      await result.current.refresh(); // back to page 1: m3 now sits on page 2
    });
    await act(async () => {
      gate.resolve();
      await change;
    });

    expect(ids(result.current.items)).toEqual(["m0", "m1"]);
    expect(result.current.total).toBe(6);
    await act(async () => {
      await result.current.loadMore();
    });
    expect(ids(result.current.items)).toEqual(["m0", "m1", "m2", "m3"]);
    expect(result.current.items[3]?.status).toBe("in_progress");
  });
});

describe("useSitepingInbox — re-entering rows respect the whole query", () => {
  it("undo does not insert a row the type filter excludes, nor count it", async () => {
    const { result } = await mountDemo();
    await act(async () => {
      await result.current.changeStatus("r1", "resolved"); // r1 is a bug
    });
    act(() => result.current.setType("question"));
    await waitFor(() => expect(ids(result.current.items)).toEqual(["r2"]));
    await settle();
    expect(result.current.counts).toMatchObject({ all: 1, open: 1, resolved: 0 });

    await act(async () => {
      await result.current.undo();
    });

    expect(ids(result.current.items)).toEqual(["r2"]);
    expect(result.current.total).toBe(1);
    expect(result.current.counts).toMatchObject({ all: 1, open: 1, resolved: 0 });
  });

  it("a drawer status change does not insert a row the search excludes (case-insensitive)", async () => {
    const { result } = await mountDemo();
    act(() => result.current.openFeedback("r1"));
    await act(async () => {
      await result.current.changeStatus("r1", "resolved"); // leaves the list, stays in the drawer
    });
    act(() => result.current.setSearch("BETA"));
    await waitFor(() => expect(ids(result.current.items)).toEqual(["r2"]), { timeout: 1500 });
    await settle();

    await act(async () => {
      await result.current.changeStatus("r1", "open"); // "alpha overlap" doesn't match "beta"
    });

    expect(ids(result.current.items)).toEqual(["r2"]);
    expect(result.current.total).toBe(1);
    expect(result.current.counts).toMatchObject({ all: 1, open: 1, resolved: 0 });
    expect(result.current.opened?.status).toBe("open");
  });

  it("undo still re-inserts a row matching type and search", async () => {
    const { result } = await mountDemo();
    act(() => result.current.setSearch("Gamma"));
    await waitFor(() => expect(ids(result.current.items)).toEqual(["r3"]), { timeout: 1500 });
    await settle();
    await act(async () => {
      await result.current.changeStatus("r3", "resolved");
    });
    expect(result.current.items).toHaveLength(0);
    await act(async () => {
      await result.current.undo();
    });
    expect(ids(result.current.items)).toEqual(["r3"]);
    expect(result.current.counts).toMatchObject({ all: 1, open: 1, resolved: 0 });
  });
});

describe("useSitepingInbox — a server search broader than the local predicate", () => {
  /** Searches "cafe" on a server that also matches "Café" (c2), like MySQL's accent-insensitive collations. */
  async function mountCafeSearch(status: "open" | "all", pageSize = 50) {
    const source = makeSource([
      makeRecord({ id: "c1", status: "open", message: "Cafe typo", createdAt: new Date("2026-07-20T10:06:00Z") }),
      makeRecord({ id: "c2", status: "open", message: "Café crash", createdAt: new Date("2026-07-20T10:05:00Z") }),
      makeRecord({ id: "x1", status: "open", message: "unrelated", createdAt: new Date("2026-07-20T10:04:00Z") }),
    ]);
    const real = source.list.getMockImplementation();
    if (!real) throw new Error("no list implementation");
    const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    source.list.mockImplementation(async ({ search, ...query }) => {
      if (!search) return real(query);
      const { page = 1, limit = 50 } = query;
      const all = await real({ ...query, page: 1, limit: 100 });
      const matching = all.feedbacks.filter((r) => fold(r.message).includes(fold(search)));
      return { feedbacks: matching.slice((page - 1) * limit, page * limit), total: matching.length };
    });
    const hook = renderHook(() => useSitepingInbox({ projects: "demo", source, pageSize }));
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    act(() => hook.result.current.setStatus(status));
    act(() => hook.result.current.setSearch("cafe"));
    await waitFor(() => expect(hook.result.current.total).toBe(2), { timeout: 1500 });
    await settle();
    expect(hook.result.current.counts).toMatchObject({ all: 2, open: 2, resolved: 0 });
    return { source, ...hook };
  }

  it("keeps a row it listed and moves the counts on a change or a delete", async () => {
    const { result } = await mountCafeSearch("all");
    await act(async () => {
      await result.current.changeStatus("c2", "resolved");
    });
    expect(ids(result.current.items)).toEqual(["c1", "c2"]);
    expect(result.current.counts).toMatchObject({ all: 2, open: 1, resolved: 1 });

    await act(async () => {
      await result.current.deleteFeedback("c2");
    });
    expect(ids(result.current.items)).toEqual(["c1"]);
    expect(result.current.counts).toMatchObject({ all: 1, open: 1, resolved: 0 });
  });

  it("brings a row it listed back on undo and on a failed change", async () => {
    const { source, result } = await mountCafeSearch("open", 1);
    await act(async () => {
      await result.current.loadMore();
    });
    expect(ids(result.current.items)).toEqual(["c1", "c2"]);

    await act(async () => {
      await result.current.changeStatus("c2", "resolved");
    });
    expect(ids(result.current.items)).toEqual(["c1"]);
    expect(result.current.counts).toMatchObject({ all: 2, open: 1, resolved: 1 });
    await act(async () => {
      await result.current.undo();
    });
    expect(ids(result.current.items)).toEqual(["c1", "c2"]);
    expect(result.current.counts).toMatchObject({ all: 2, open: 2, resolved: 0 });

    source.setStatus.mockRejectedValueOnce(new Error("patch failed"));
    await act(async () => {
      await result.current.changeStatus("c2", "resolved").catch(() => undefined);
    });
    expect(ids(result.current.items)).toEqual(["c1", "c2"]);
    expect(result.current.total).toBe(2);
    expect(result.current.counts).toMatchObject({ all: 2, open: 2, resolved: 0 });
  });
});

describe("useSitepingInbox — undo state after a failed mutation", () => {
  it("does not restore another project's undo when a mutation fails after a project switch", async () => {
    const source = makeSource([
      makeRecord({ id: "a1", projectName: "A", status: "open", createdAt: new Date("2026-07-20T10:02:00Z") }),
      makeRecord({ id: "a2", projectName: "A", status: "open", createdAt: new Date("2026-07-20T10:01:00Z") }),
      makeRecord({ id: "b1", projectName: "B", status: "open", createdAt: new Date("2026-07-20T10:00:00Z") }),
    ]);
    const { result } = renderHook(() => useSitepingInbox({ projects: ["A", "B"], source }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await settle();

    await act(async () => {
      await result.current.changeStatus("a1", "resolved");
    });
    const held = deferred<FeedbackRecord>();
    source.setStatus.mockImplementationOnce(() => held.promise);
    let change!: Promise<unknown>;
    act(() => {
      change = result.current.changeStatus("a2", "resolved").catch((e: unknown) => e);
    });

    act(() => result.current.setProject("B"));
    await waitFor(() => expect(ids(result.current.items)).toEqual(["b1"]));
    await act(async () => {
      held.reject(new Error("patch failed"));
      await change;
    });

    expect(result.current.pendingUndo).toBeNull();
    source.setStatus.mockClear();
    await act(async () => {
      await result.current.undo();
    });
    expect(source.setStatus).not.toHaveBeenCalled();
    expect(ids(result.current.items)).toEqual(["b1"]);
  });

  it("keeps a concurrent success's undo when an earlier change fails", async () => {
    const { source, result } = await mountDemo();
    const held = deferred<FeedbackRecord>();
    source.setStatus.mockImplementationOnce(() => held.promise);

    let first!: Promise<unknown>;
    act(() => {
      first = result.current.changeStatus("r1", "resolved").catch((e: unknown) => e);
    });
    await act(async () => {
      await result.current.changeStatus("r2", "resolved");
    });
    await act(async () => {
      held.reject(new Error("patch failed"));
      await first;
    });

    expect(result.current.pendingUndo).toEqual({ id: "r2", previousStatus: "open" });
  });

  it("a failed delete that never touched the undo leaves it to the change that set it", async () => {
    const { source, result } = await mountDemo();
    const heldChange = deferred<FeedbackRecord>();
    source.setStatus.mockImplementationOnce(() => heldChange.promise);
    const heldDelete = deferred<void>();
    source.remove.mockImplementationOnce(() => heldDelete.promise);

    let change!: Promise<unknown>;
    let del!: Promise<unknown>;
    act(() => {
      change = result.current.changeStatus("r1", "resolved").catch((e: unknown) => e);
    });
    act(() => {
      del = result.current.deleteFeedback("r2").catch((e: unknown) => e);
    });
    await act(async () => {
      heldDelete.reject(new Error("delete failed"));
      await del;
    });
    expect(result.current.pendingUndo).toEqual({ id: "r1", previousStatus: "open" });
    await act(async () => {
      heldChange.reject(new Error("change failed"));
      await change;
    });

    expect(ids(result.current.items)).toEqual(["r1", "r2", "r3"]);
    expect(result.current.pendingUndo).toBeNull();
  });

  it("an earlier change still takes back the undo a later failed change handed back to it", async () => {
    const { source, result } = await mountDemo();
    const heldA = deferred<FeedbackRecord>();
    const heldB = deferred<FeedbackRecord>();
    source.setStatus.mockImplementationOnce(() => heldA.promise).mockImplementationOnce(() => heldB.promise);

    let a!: Promise<unknown>;
    let b!: Promise<unknown>;
    act(() => {
      a = result.current.changeStatus("r1", "resolved").catch((e: unknown) => e);
    });
    act(() => {
      b = result.current.changeStatus("r2", "resolved").catch((e: unknown) => e);
    });
    await act(async () => {
      heldB.reject(new Error("b failed"));
      await b;
    });
    expect(result.current.pendingUndo).toEqual({ id: "r1", previousStatus: "open" });
    await act(async () => {
      heldA.reject(new Error("a failed"));
      await a;
    });

    expect(ids(result.current.items)).toEqual(["r1", "r2", "r3"]);
    expect(result.current.pendingUndo).toBeNull();
  });

  it("drops the undo as soon as the project switches — an undo in the same tick does nothing", async () => {
    const source = makeSource([
      makeRecord({ id: "a1", projectName: "A", status: "open" }),
      makeRecord({ id: "b1", projectName: "B", status: "open" }),
    ]);
    const { result } = renderHook(() => useSitepingInbox({ projects: ["A", "B"], source }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // "All" tab: the resolved row stays listed, so only the cleared undo stops the undo.
    act(() => result.current.setStatus("all"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await settle();
    await act(async () => {
      await result.current.changeStatus("a1", "resolved");
    });
    source.setStatus.mockClear();

    await act(async () => {
      result.current.setProject("B");
      await result.current.undo();
    });

    expect(source.setStatus).not.toHaveBeenCalled();
    expect(result.current.pendingUndo).toBeNull();
  });
});

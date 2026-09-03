import { describe, expect, it, vi } from "vitest";
import {
  createCollectionStore,
  type FeedbackCreateInput,
  type FeedbackRecord,
  StorePersistenceError,
} from "../src/index.js";

function input(clientId: string): FeedbackCreateInput {
  return {
    projectName: "p",
    type: "bug",
    message: "m",
    status: "open",
    url: "/",
    viewport: "1x1",
    userAgent: "ua",
    authorName: "a",
    authorEmail: "a@example.com",
    clientId,
    annotations: [],
  };
}

/**
 * Cached KV backend — the natural async shape of the engine's JSDoc example:
 * `load()` hands out an in-memory cache (a live array), `persist()` writes
 * through to durable storage and refreshes the cache. When the durable write
 * fails, the cache must be exactly what it was.
 */
function kvBackend() {
  const state = { kv: [] as FeedbackRecord[], cache: null as FeedbackRecord[] | null, failPersist: false, seq: 0 };
  const persist = vi.fn((next: FeedbackRecord[]) => {
    if (state.failPersist) throw new StorePersistenceError("kv write failed");
    state.kv = structuredClone(next);
    state.cache = next;
  });
  const load = vi.fn(() => {
    state.cache ??= structuredClone(state.kv);
    return state.cache;
  });
  const store = createCollectionStore({ load, persist, generateId: () => `id-${++state.seq}` });
  return { store, state, load, persist };
}

describe("createCollectionStore — snapshot immutability", () => {
  it("hands persist a new array instead of mutating the loaded one", async () => {
    const { store, load, persist } = kvBackend();
    await store.createFeedback(input("c1"));

    const loaded = load.mock.results[0]?.value as FeedbackRecord[];
    const persisted = persist.mock.calls[0]?.[0] as FeedbackRecord[];
    expect(persisted).not.toBe(loaded);
    expect(loaded).toHaveLength(0);
    expect(persisted).toHaveLength(1);
  });

  it("a failed createFeedback leaves no record behind", async () => {
    const { store, state } = kvBackend();
    state.failPersist = true;

    await expect(store.createFeedback(input("c1"))).rejects.toThrow(StorePersistenceError);

    expect((await store.getFeedbacks({ projectName: "p" })).total).toBe(0);
  });

  it("a retry after a failed createFeedback is written for real, not deduplicated against a phantom", async () => {
    const { store, state } = kvBackend();
    state.failPersist = true;
    await store.createFeedback(input("c1")).catch(() => {});

    // Storage recovers; the widget's retry queue replays the same clientId.
    state.failPersist = false;
    const record = await store.createFeedback(input("c1"));

    expect(state.kv.map((f) => f.id)).toContain(record.id);
  });

  it("still drops the screenshot and retries once when the first persist fails", async () => {
    const { store, state, persist } = kvBackend();
    persist.mockImplementationOnce(() => {
      throw new StorePersistenceError("quota");
    });

    const record = await store.createFeedback({ ...input("c1"), screenshotDataUrl: "data:image/jpeg;base64,xxx" });

    expect(record.screenshotUrl).toBeNull();
    expect(persist).toHaveBeenCalledTimes(2);
    expect(state.kv).toHaveLength(1);
  });

  it("a failed updateFeedback does not change the record", async () => {
    const { store, state } = kvBackend();
    const created = await store.createFeedback(input("c1"));

    state.failPersist = true;
    await expect(store.updateFeedback(created.id, { status: "resolved", resolvedAt: new Date() })).rejects.toThrow(
      StorePersistenceError,
    );

    const { feedbacks } = await store.getFeedbacks({ projectName: "p" });
    expect(feedbacks[0]?.status).toBe("open");
    expect(feedbacks[0]?.resolvedAt).toBeNull();
  });

  it("a successful updateFeedback returns the record now held in the snapshot", async () => {
    const { store, state } = kvBackend();
    const created = await store.createFeedback(input("c1"));

    const updated = await store.updateFeedback(created.id, { status: "in_progress", resolvedAt: null });

    expect(updated.status).toBe("in_progress");
    expect(state.kv[0]?.status).toBe("in_progress");
    expect((await store.getFeedbacks({ projectName: "p" })).feedbacks[0]).toBe(updated);
  });

  it("a failed deleteFeedback does not remove the record", async () => {
    const { store, state } = kvBackend();
    const created = await store.createFeedback(input("c1"));

    state.failPersist = true;
    await expect(store.deleteFeedback(created.id)).rejects.toThrow(StorePersistenceError);

    expect((await store.getFeedbacks({ projectName: "p" })).total).toBe(1);
  });
});

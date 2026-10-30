import { MemoryStore } from "@siteping/adapter-memory";
import { describe, expect, it, vi } from "vitest";
import { createSitepingHandler, isSitepingConfigError, type SitepingStore } from "../src/index.js";

/** What `createSitepingHandler` threw, for its `code` to be read. */
function creationError(create: () => unknown): unknown {
  try {
    create();
  } catch (error) {
    return error;
  }
  throw new Error("createSitepingHandler did not throw");
}

/**
 * A JavaScript caller's store without `verifyProjectOwnership`: the type now
 * requires it, so only an untyped store reaches the runtime check.
 */
function storeWithoutOwnershipCheck(): SitepingStore {
  const backing = new MemoryStore();
  const store: Omit<SitepingStore, "verifyProjectOwnership"> = {
    createFeedback: (data) => backing.createFeedback(data),
    getFeedbacks: (query) => backing.getFeedbacks(query),
    findByClientId: (clientId) => backing.findByClientId(clientId),
    updateFeedback: (id, data) => backing.updateFeedback(id, data),
    deleteFeedback: (id) => backing.deleteFeedback(id),
    deleteAllFeedbacks: (projectName) => backing.deleteAllFeedbacks(projectName),
  };
  return store as SitepingStore;
}

describe("createSitepingHandler — configuration errors carry a stable code", () => {
  it.each([
    ["CONFIG_STORE_MISSING", () => createSitepingHandler({} as { store: SitepingStore })],
    ["CONFIG_MAX_BODY_BYTES_INVALID", () => createSitepingHandler({ store: new MemoryStore(), maxBodyBytes: 0 })],
    [
      "CONFIG_OWNERSHIP_CHECK_MISSING",
      () =>
        createSitepingHandler({
          store: storeWithoutOwnershipCheck(),
          access: { authenticate: () => "reviewer", authorize: () => true },
        }),
    ],
    [
      "CONFIG_WEBHOOK_TIMEOUT_INVALID",
      () =>
        createSitepingHandler({
          store: new MemoryStore(),
          webhooks: { url: "https://hooks.example.com", timeoutMs: 0 },
        }),
    ],
  ])("throws %s", (code, create) => {
    const error = creationError(create);
    expect(isSitepingConfigError(error)).toBe(true);
    expect(error).toMatchObject({ code, name: "SitepingConfigError" });
  });

  it("throws CONFIG_API_KEY_REQUIRED in production without an apiKey", () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      const error = creationError(() => createSitepingHandler({ store: new MemoryStore() }));
      expect(isSitepingConfigError(error)).toBe(true);
      expect(error).toMatchObject({ code: "CONFIG_API_KEY_REQUIRED" });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("is told apart from any other error", () => {
    expect(isSitepingConfigError(new Error("[siteping] createSitepingHandler requires a `store`."))).toBe(false);
  });
});

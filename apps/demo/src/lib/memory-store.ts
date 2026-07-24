import { MemoryStore } from "@siteping/adapter-memory";
import { seedDemoStore } from "./seed";

const RESET_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// Singleton — survives Next.js hot reloads in dev
const g = globalThis as typeof globalThis & { __sitepingStore?: MemoryStore };
if (!g.__sitepingStore) {
  const store = new MemoryStore();
  g.__sitepingStore = store;
  void seedDemoStore(store);
  setInterval(() => {
    store.clear();
    void seedDemoStore(store);
  }, RESET_INTERVAL_MS);
}

export const memoryStore = g.__sitepingStore;

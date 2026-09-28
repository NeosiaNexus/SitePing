import type { ScreenshotObject, ScreenshotObjectStore } from "../core/object-store.js";
import { createPublicUrlMapping } from "../core/public-url.js";

export interface MemoryObjectStoreOptions {
  /** Where `createScreenshotServeHandler` is mounted, e.g. `https://app.example.com/api/siteping/screenshots`. */
  publicBaseUrl: string;
}

/** Screenshots kept in process memory — for development, demos and tests. Lost on restart. */
export function createMemoryObjectStore({ publicBaseUrl }: MemoryObjectStoreOptions): ScreenshotObjectStore & {
  /** Keys currently stored. */
  keys(): string[];
} {
  const objects = new Map<string, Omit<ScreenshotObject, "key">>();
  return {
    name: "memory",
    ...createPublicUrlMapping(publicBaseUrl),
    async put({ key, bytes, contentType }) {
      objects.set(key, { bytes: bytes.slice(), contentType });
    },
    async remove(key) {
      objects.delete(key);
    },
    async get(key) {
      return objects.get(key) ?? null;
    },
    keys: () => [...objects.keys()],
  };
}

export type { ScreenshotObjectStore } from "../core/object-store.js";

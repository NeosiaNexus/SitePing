import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { CONTENT_TYPE_SIDECAR_SUFFIX, UNKNOWN_CONTENT_TYPE } from "../constants/filesystem.js";
import { CONTENT_TYPE_EXTENSIONS, GENERATED_KEY_PATTERN } from "../constants/screenshots.js";
import type { ScreenshotObjectStore } from "../core/object-store.js";
import { createPublicUrlMapping } from "../core/public-url.js";

export interface FilesystemObjectStoreOptions {
  /** Directory the screenshots are written to (created when missing). */
  directory: string;
  /** Where `createScreenshotServeHandler` is mounted, e.g. `https://app.example.com/api/siteping/screenshots`. */
  publicBaseUrl: string;
}

/** Fallback for files written without a sidecar (before it existed). */
const CONTENT_TYPE_BY_EXTENSION = new Map(
  Object.entries(CONTENT_TYPE_EXTENSIONS).map(([contentType, extension]) => [`.${extension}`, contentType]),
);

function isMissingFile(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
}

/** Contents of `path`, or `null` when it does not exist. */
async function readOptionalFile(path: string): Promise<Buffer | null> {
  try {
    return await readFile(path);
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
}

/**
 * Screenshots as files on the local disk (Node.js). Serve them with
 * `createScreenshotServeHandler`, or point `publicBaseUrl` at a static file
 * server for `directory`. Not suited to serverless platforms with ephemeral disks.
 *
 * Each screenshot `<key>` is stored with a `<key>.content-type` sidecar holding
 * its content type, so any type allowed by `createScreenshotStorage` is served
 * back with the type it was uploaded with.
 */
export function createFilesystemObjectStore({
  directory,
  publicBaseUrl,
}: FilesystemObjectStoreOptions): ScreenshotObjectStore {
  /** Keys are generated, but re-check before touching the disk so no path can escape `directory`. */
  const pathOf = (key: string): string => {
    if (!GENERATED_KEY_PATTERN.test(key)) throw new Error(`[siteping] filesystem store: refusing key "${key}"`);
    return join(directory, key);
  };

  return {
    name: "filesystem",
    ...createPublicUrlMapping(publicBaseUrl),
    async put({ key, bytes, contentType }) {
      const path = pathOf(key);
      await mkdir(directory, { recursive: true });
      // Sidecar first: once the image exists, its type is already known to `get`.
      await writeFile(`${path}${CONTENT_TYPE_SIDECAR_SUFFIX}`, contentType, { flag: "wx" });
      await writeFile(path, bytes, { flag: "wx" });
    },
    async remove(key) {
      const path = pathOf(key);
      await rm(path, { force: true });
      await rm(`${path}${CONTENT_TYPE_SIDECAR_SUFFIX}`, { force: true });
    },
    async get(key) {
      const path = pathOf(key);
      const bytes = await readOptionalFile(path);
      if (!bytes) return null;
      const storedContentType = (await readOptionalFile(`${path}${CONTENT_TYPE_SIDECAR_SUFFIX}`))?.toString("utf8");
      const contentType = storedContentType || (CONTENT_TYPE_BY_EXTENSION.get(extname(key)) ?? UNKNOWN_CONTENT_TYPE);
      return { bytes: new Uint8Array(bytes), contentType };
    },
  };
}

export type { ScreenshotObjectStore } from "../core/object-store.js";

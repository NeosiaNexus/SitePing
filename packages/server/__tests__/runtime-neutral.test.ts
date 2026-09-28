import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";
import type { FeedbackRecord } from "@siteping/core";
import { build } from "tsup";
import { beforeAll, describe, expect, it } from "vitest";
import * as zod from "zod";
import type * as Server from "../src/index.js";
import { validPayloadNoAnnotations } from "./fixtures.js";

// The package builds for the `neutral` platform so it runs on edge workers,
// Deno and Bun as well as Node. This runs the bundle — built from source,
// with core inlined as in the published package — in a VM context holding
// only the Web APIs such runtimes share: no `process`, no `Buffer`, and a
// `require` that resolves `zod` alone, so a Node built-in creeping back in
// (node:crypto, Buffer, an unguarded process.env) fails here.

const ENTRY = fileURLToPath(new URL("../src/index.ts", import.meta.url));

/** The package bundle as CommonJS, like its published `index.cjs`. */
async function bundleServer(): Promise<string> {
  const outDir = await mkdtemp(join(tmpdir(), "siteping-server-"));
  try {
    await build({
      entry: { index: ENTRY },
      format: ["cjs"],
      platform: "neutral",
      target: "es2022",
      outDir,
      noExternal: [/^@siteping\/core(\/|$)/],
      external: ["zod"],
      config: false,
      silent: true,
    });
    return await readFile(join(outDir, "index.cjs"), "utf8");
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

/** Evaluate the bundle where only Web-standard globals exist. */
function loadInWebRuntime(code: string): typeof Server {
  const module = { exports: {} as typeof Server };
  const context = createContext({
    Request,
    Response,
    Headers,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    AbortController,
    AbortSignal,
    fetch,
    crypto,
    console,
    setTimeout,
    clearTimeout,
    queueMicrotask,
    structuredClone,
    module,
    exports: module.exports,
    require: (id: string) => {
      if (id === "zod") return zod;
      throw new Error(`"${id}" is not available outside Node`);
    },
  });
  runInContext(code, context);
  return module.exports;
}

/** A minimal store over an array. */
function arrayStore(): Server.SitepingStore {
  const records: FeedbackRecord[] = [];
  return {
    async createFeedback({ screenshotDataUrl, annotations: _annotations, ...data }) {
      const now = new Date();
      const record: FeedbackRecord = {
        ...data,
        id: `fb-${records.length + 1}`,
        urlPattern: data.urlPattern ?? null,
        screenshotUrl: screenshotDataUrl ?? null,
        screenshotRegion: data.screenshotRegion ?? null,
        diagnostics: data.diagnostics ?? null,
        resolvedAt: null,
        createdAt: now,
        updatedAt: now,
        annotations: [],
      };
      records.push(record);
      return record;
    },
    async getFeedbacks({ projectName }) {
      const feedbacks = records.filter((record) => record.projectName === projectName);
      return { feedbacks, total: feedbacks.length };
    },
    async findByClientId(clientId) {
      return records.find((record) => record.clientId === clientId) ?? null;
    },
    async updateFeedback(id, data) {
      const record = records.find((candidate) => candidate.id === id);
      if (!record) throw Object.assign(new Error("not found"), { code: "STORE_NOT_FOUND" });
      Object.assign(record, data);
      return record;
    },
    async deleteFeedback() {},
    async deleteAllFeedbacks() {},
  };
}

describe("@siteping/server outside Node", () => {
  let server: typeof Server;

  beforeAll(async () => {
    server = loadInWebRuntime(await bundleServer());
  }, 30_000);

  it("serves a create, a list and an API-key update with Web APIs only", async () => {
    const endpoint = "https://example.com/api/siteping";
    const handler = server.createSitepingHandler({ store: arrayStore(), apiKey: "secret-key" });

    const created = await handler.POST(
      new Request(endpoint, { method: "POST", body: JSON.stringify(validPayloadNoAnnotations) }),
    );
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as FeedbackRecord;

    const listed = await handler.GET(
      new Request(`${endpoint}?projectName=${validPayloadNoAnnotations.projectName}`, {
        headers: { Authorization: "Bearer secret-key" },
      }),
    );
    expect(((await listed.json()) as { total: number }).total).toBe(1);

    const update = (authorization: string) =>
      handler.PATCH(
        new Request(endpoint, {
          method: "PATCH",
          headers: { Authorization: authorization },
          body: JSON.stringify({ id, projectName: validPayloadNoAnnotations.projectName, status: "resolved" }),
        }),
      );
    expect((await update("Bearer secret-kex")).status).toBe(401);
    expect((await update("Bearer secret-key")).status).toBe(200);
  });

  it("starts without an apiKey where there is no process.env to read", () => {
    expect(() => server.createSitepingHandler({ store: arrayStore() })).not.toThrow();
  });

  it("exports only the handler and webhook dispatch as values: schemas and payload builders stay internal", () => {
    expect(Object.keys(server).sort()).toEqual(["createSitepingHandler", "dispatchWebhook", "dispatchWebhooks"]);
  });
});

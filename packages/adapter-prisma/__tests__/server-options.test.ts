import { describe, expect, it, vi } from "vitest";
import { createSitepingHandler } from "../src/index.js";
import { fakePrisma } from "./fake-prisma.js";
import { validPayloadNoAnnotations } from "./fixtures.js";

// adapter-prisma's handler is @siteping/server's over a PrismaStore: these
// lock what the wrapper adds (Prisma's setup hint) and what it forwards.

const LIST = "http://localhost/api/siteping?projectName=test-project";

/** A Prisma client whose table is missing, as before `npx prisma db push`. */
function prismaWithoutTable() {
  const prisma = fakePrisma();
  const missingTable = Object.assign(new Error("The table `SitepingFeedback` does not exist"), { code: "P2021" });
  vi.spyOn(prisma.sitepingFeedback, "findMany").mockRejectedValue(missingTable);
  return prisma;
}

const silentLogger = () => ({ error: vi.fn() });

describe("createSitepingHandler — @siteping/server options", () => {
  it("answers Prisma's missing-table error with the db push hint", async () => {
    const handler = createSitepingHandler({ prisma: prismaWithoutTable(), logger: silentLogger() });

    const response = await handler.GET(new Request(LIST));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Table 'SitepingFeedback' not found. Run 'npx prisma db push' to create it.",
    });
  });

  it("lets a describeError hint win over the Prisma one", async () => {
    const handler = createSitepingHandler({
      prisma: prismaWithoutTable(),
      logger: silentLogger(),
      describeError: () => "Run our migration script",
    });

    expect(await (await handler.GET(new Request(LIST))).json()).toEqual({ error: "Run our migration script" });
  });

  it("forwards a custom access policy", async () => {
    const handler = createSitepingHandler({
      prisma: fakePrisma(),
      access: {
        authenticate: (request) => (request.headers.get("x-session") === "reviewer" ? { id: "reviewer" } : null),
      },
    });

    expect((await handler.GET(new Request(LIST))).status).toBe(401);
    expect((await handler.GET(new Request(LIST, { headers: { "x-session": "reviewer" } }))).status).toBe(200);
  });

  it("forwards the lifecycle hooks", async () => {
    const onCreated = vi.fn();
    const handler = createSitepingHandler({ prisma: fakePrisma(), hooks: { onCreated } });

    const response = await handler.POST(
      new Request("http://localhost/api/siteping", { method: "POST", body: JSON.stringify(validPayloadNoAnnotations) }),
    );

    expect(response.status).toBe(201);
    expect(onCreated).toHaveBeenCalledOnce();
  });

  it("forwards the logger", async () => {
    const logger = silentLogger();
    const handler = createSitepingHandler({ prisma: prismaWithoutTable(), logger });

    await handler.GET(new Request(LIST));

    expect(logger.error).toHaveBeenCalledWith(
      "[siteping] Failed to fetch feedbacks",
      expect.objectContaining({ method: "GET" }),
    );
  });
});

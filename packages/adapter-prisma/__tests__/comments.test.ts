import type { FeedbackResponse, FeedbackResponseList } from "@siteping/core";
import { describe, expect, it, vi } from "vitest";
import { createSitepingHandler, PrismaStore } from "../src/index.js";
import { fakePrisma } from "./fake-prisma.js";
import { validPayloadNoAnnotations } from "./fixtures.js";

// The comment contract itself runs in the conformance suite (prisma-store.test.ts);
// these lock what is Prisma-specific: a client generated before the
// `SitepingComment` model existed.

const ENDPOINT = "http://localhost/api/siteping";

function post(body: unknown): Request {
  return new Request(ENDPOINT, { method: "POST", body: JSON.stringify(body) });
}

describe("PrismaStore — comment capability", () => {
  it("offers addComment and deleteComment only when the client has the SitepingComment delegate", () => {
    const current = new PrismaStore(fakePrisma());
    const beforeThreads = new PrismaStore(fakePrisma({ comments: false }));

    expect(current.addComment).toBeTypeOf("function");
    expect(current.deleteComment).toBeTypeOf("function");
    expect(beforeThreads.addComment).toBeUndefined();
    expect(beforeThreads.deleteComment).toBeUndefined();
  });

  it("reads the thread only from a client that has the model", async () => {
    const current = fakePrisma();
    const beforeThreads = fakePrisma({ comments: false });
    const currentRead = vi.spyOn(current.sitepingFeedback, "findMany");
    const legacyRead = vi.spyOn(beforeThreads.sitepingFeedback, "findMany");

    await new PrismaStore(current).getFeedbacks({ projectName: "p" });
    await new PrismaStore(beforeThreads).getFeedbacks({ projectName: "p" });

    expect(currentRead.mock.calls[0]?.[0]).toHaveProperty("include", {
      annotations: true,
      comments: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
    });
    // An unknown relation in `include` is a PrismaClientValidationError on every read.
    expect(legacyRead.mock.calls[0]?.[0]).toHaveProperty("include", { annotations: true });
  });
});

describe("createSitepingHandler — a schema synced before threads", () => {
  it("keeps serving feedbacks with empty threads and answers comment posts with 501", async () => {
    const handler = createSitepingHandler({ prisma: fakePrisma({ comments: false }) });
    const created = await handler.POST(post(validPayloadNoAnnotations));
    const feedback = (await created.json()) as FeedbackResponse;

    const comment = await handler.POST(
      post({
        projectName: validPayloadNoAnnotations.projectName,
        feedbackId: feedback.id,
        body: "Anyone there?",
        authorName: "Alice",
        authorEmail: "alice@example.com",
        clientId: "comment-1",
      }),
    );
    const listed = (await (
      await handler.GET(new Request(`${ENDPOINT}?projectName=${validPayloadNoAnnotations.projectName}`))
    ).json()) as FeedbackResponseList;

    expect(comment.status).toBe(501);
    expect(listed.capabilities).toEqual({ comments: false });
    expect(listed.feedbacks[0]?.comments).toEqual([]);
  });
});

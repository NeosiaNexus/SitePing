// @vitest-environment jsdom

import type { CommentResponse, FeedbackResponse } from "@siteping/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createT } from "../../src/i18n/index.js";
import { buildThread, type ThreadOptions } from "../../src/panel-thread.js";

const t = createT("en");

function makeComment(overrides: Partial<CommentResponse> = {}): CommentResponse {
  return {
    id: "c-1",
    feedbackId: "fb-1",
    body: "Is it 16 or 24 px?",
    authorName: "Alice",
    authorEmail: "",
    authorRole: "client",
    createdAt: "2026-01-15T10:00:00.000Z",
    ...overrides,
  };
}

function makeFeedback(comments?: CommentResponse[]): FeedbackResponse {
  return {
    id: "fb-1",
    projectName: "p",
    type: "question",
    message: "Which size?",
    status: "open",
    url: "/",
    viewport: "1280x720",
    userAgent: "test",
    authorName: "Alice",
    authorEmail: "",
    resolvedAt: null,
    createdAt: "2026-01-15T09:00:00.000Z",
    updatedAt: "2026-01-15T09:00:00.000Z",
    annotations: [],
    urlPattern: null,
    screenshotUrl: null,
    screenshotRegion: null,
    diagnostics: null,
    ...(comments ? { comments } : {}),
  };
}

function mount(feedback: FeedbackResponse, options: Partial<ThreadOptions> = {}) {
  const post = vi.fn<ThreadOptions["post"]>();
  const root = buildThread(feedback, { t, locale: "en", canPost: true, post, ...options });
  if (root) document.body.appendChild(root);
  return {
    root,
    post,
    input: () => root?.querySelector("textarea") ?? null,
    send: () => root?.querySelector<HTMLButtonElement>(".sp-thread-foot button") ?? null,
    error: () => root?.querySelector<HTMLElement>('[role="alert"]') ?? null,
    replies: () => [...(root?.querySelectorAll(".sp-comment") ?? [])],
  };
}

/** Let the awaited post and the `finally` that follows it settle. */
async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("buildThread", () => {
  it("is left out when there is nothing to read and no way to reply", () => {
    expect(buildThread(makeFeedback([]), { t, locale: "en", canPost: false, post: vi.fn() })).toBeNull();
  });

  it("reads a feedback from a server that predates threads (no `comments` key) without throwing", () => {
    const feedback = makeFeedback();
    expect(feedback).not.toHaveProperty("comments");
    expect(buildThread(feedback, { t, locale: "en", canPost: false, post: vi.fn() })).toBeNull();
    const { replies, input } = mount(feedback);
    expect(replies()).toHaveLength(0);
    expect(input()).not.toBeNull();
  });

  it("renders the replies read-only when the backend takes none", () => {
    const { replies, input } = mount(makeFeedback([makeComment()]), { canPost: false });
    expect(replies()).toHaveLength(1);
    expect(replies()[0]?.textContent).toContain("Is it 16 or 24 px?");
    expect(input()).toBeNull();
  });

  it("renders bodies and names as text, never as markup", () => {
    const { replies } = mount(
      makeFeedback([makeComment({ authorName: "<b>Eve</b>", body: '<img src=x onerror="alert(1)">' })]),
    );
    const reply = replies()[0]!;
    expect(reply.querySelector("img, b")).toBeNull();
    expect(reply.textContent).toContain('<img src=x onerror="alert(1)">');
  });

  it("marks the team's replies, and only theirs", () => {
    const { replies } = mount(
      makeFeedback([makeComment({ id: "a" }), makeComment({ id: "b", authorRole: "team", authorName: "Studio" })]),
    );
    const [client, team] = replies();
    expect(client?.getAttribute("data-role")).toBe("client");
    expect(client?.querySelector(".sp-badge")).toBeNull();
    expect(team?.getAttribute("data-role")).toBe("team");
    expect(team?.querySelector(".sp-badge")?.textContent).toBe(t("comments.team"));
    expect(team?.querySelector("time")?.getAttribute("datetime")).toBe("2026-01-15T10:00:00.000Z");
  });

  it("labels the composer and shows the platform's send shortcut", () => {
    const { input, send, root } = mount(makeFeedback([]));
    expect(input()?.getAttribute("aria-label")).toBe(t("comments.placeholder"));
    expect(input()?.maxLength).toBe(5000);
    expect(send()?.textContent).toBe(t("popup.submit"));
    // jsdom reports neither userAgentData nor a Mac platform.
    expect(root?.querySelector(".sp-thread-foot span")?.textContent).toBe(t("popup.submitHintOther"));
  });

  it("posts the trimmed text, appends the reply and clears the field", async () => {
    const { post, input, send, replies, error } = mount(makeFeedback([]));
    post.mockResolvedValue(makeComment({ body: "Done" }));
    input()!.value = "  Done  ";
    send()!.click();
    await flush();

    expect(post).toHaveBeenCalledWith("Done", expect.any(String));
    expect(replies().map((r) => r.textContent)).toEqual([expect.stringContaining("Done")]);
    expect(input()!.value).toBe("");
    expect(error()!.textContent).toBe("");
  });

  it("ignores an empty reply", () => {
    const { post, input, send } = mount(makeFeedback([]));
    input()!.value = "   ";
    send()!.click();
    expect(post).not.toHaveBeenCalled();
  });

  it("sends on Ctrl+Enter and on ⌘+Enter, not on Enter alone", async () => {
    const { post, input } = mount(makeFeedback([]));
    post.mockResolvedValue(makeComment());
    input()!.value = "Line one";
    input()!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(post).not.toHaveBeenCalled();
    input()!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true }));
    await flush();
    input()!.value = "Again";
    input()!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", metaKey: true, bubbles: true }));
    await flush();
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("sends once while a post is in flight", async () => {
    const { post, input, send } = mount(makeFeedback([]));
    post.mockReturnValue(new Promise(() => {}));
    input()!.value = "Once";
    send()!.click();
    send()!.click();
    input()!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true }));
    await flush();
    expect(post).toHaveBeenCalledOnce();
    // Read-only rather than disabled, so the focus stays in the field.
    expect(input()!.readOnly).toBe(true);
    expect(input()!.disabled).toBe(false);
  });

  it("keeps the text and announces a failure, then resends it under the same clientId", async () => {
    const { post, input, send, error, replies } = mount(makeFeedback([]));
    post.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(makeComment({ body: "Retry me" }));
    input()!.value = "Retry me";
    send()!.click();
    await flush();

    expect(error()!.textContent).toBe(t("comments.error"));
    expect(input()!.value).toBe("Retry me");
    expect(input()!.readOnly).toBe(false);
    expect(send()!.disabled).toBe(false);

    send()!.click();
    await flush();
    const [[, first], [, resent]] = post.mock.calls as [[string, string], [string, string]];
    expect(resent).toBe(first);
    expect(error()!.textContent).toBe("");
    expect(replies()).toHaveLength(1);
  });

  it("gives the next reply a new clientId", async () => {
    const { post, input, send } = mount(makeFeedback([]));
    post.mockResolvedValue(makeComment());
    input()!.value = "First";
    send()!.click();
    await flush();
    input()!.value = "Second";
    send()!.click();
    await flush();
    const [[, first], [, second]] = post.mock.calls as [[string, string], [string, string]];
    expect(second).not.toBe(first);
  });

  it("treats a dismissed identity prompt as a silent abort", async () => {
    const { post, input, send, error, replies } = mount(makeFeedback([]));
    post.mockResolvedValue(null);
    input()!.value = "Not yet";
    send()!.click();
    await flush();

    expect(error()!.textContent).toBe("");
    expect(input()!.value).toBe("Not yet");
    expect(replies()).toHaveLength(0);
    expect(send()!.disabled).toBe(false);
  });
});

// @vitest-environment jsdom

import type { CommentRecord } from "@siteping/core";
import { act, cleanup, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Thread } from "../../src/components/thread.js";
import { createT } from "../../src/i18n/index.js";
import { deferred, makeRecord } from "../helpers.js";
import { renderWithUi } from "../render.js";

const t = createT("en");

function makeComment(overrides: Partial<CommentRecord> = {}): CommentRecord {
  return {
    id: "c-1",
    feedbackId: "fb-1",
    body: "Is it 16 or 24 px?",
    authorName: "Alex Client",
    authorEmail: "",
    authorRole: "client",
    clientId: "",
    createdAt: new Date("2026-07-20T10:05:00.000Z"),
    ...overrides,
  };
}

function renderThread({
  comments,
  canComment = true,
  canDelete = canComment,
  onAdd = vi.fn(async () => {}),
  onDelete = vi.fn(async () => {}),
}: {
  comments?: CommentRecord[];
  canComment?: boolean;
  canDelete?: boolean;
  onAdd?: (body: string, clientId: string) => Promise<void>;
  onDelete?: (commentId: string) => Promise<void>;
} = {}) {
  const record = makeRecord({ id: "fb-1", ...(comments ? { comments } : {}) });
  const view = renderWithUi(
    <Thread record={record} canComment={canComment} canDelete={canDelete} onAdd={onAdd} onDelete={onDelete} />,
  );
  const q = <E extends Element>(selector: string) => view.container.querySelector<E>(selector);
  return {
    ...view,
    onAdd,
    onDelete,
    input: () => q<HTMLTextAreaElement>("textarea"),
    send: () => q<HTMLButtonElement>(".spd-thread-composer button"),
    alert: () => q<HTMLElement>('[role="alert"]'),
    replies: () => [...view.container.querySelectorAll(".spd-comment")],
  };
}

/** A thread over its own record, which its callbacks update like the inbox does. */
function LiveThread({ initial, canComment }: { initial: CommentRecord[]; canComment: boolean }) {
  const [comments, setComments] = useState(initial);
  return (
    <Thread
      record={makeRecord({ id: "fb-1", comments })}
      canComment={canComment}
      canDelete
      onAdd={async (body) =>
        setComments((thread) => [...thread, makeComment({ id: `new-${thread.length}`, body, authorName: "Studio" })])
      }
      onDelete={async (id) => setComments((thread) => thread.filter((comment) => comment.id !== id))}
    />
  );
}

async function type(input: HTMLTextAreaElement | null, value: string): Promise<void> {
  await act(async () => {
    fireEvent.change(input as HTMLTextAreaElement, { target: { value } });
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Thread", () => {
  it("renders nothing when there is nothing to read and no way to reply", () => {
    const { container } = renderThread({ comments: [], canComment: false });
    expect(container.innerHTML).toBe("");
  });

  it("renders the replies read-only, oldest first, as a labelled region", () => {
    const { container, replies, input } = renderThread({
      comments: [makeComment({ id: "a", body: "First" }), makeComment({ id: "b", body: "Second" })],
      canComment: false,
    });
    const region = container.querySelector("section");
    const title = container.querySelector(`#${CSS.escape(region?.getAttribute("aria-labelledby") ?? "")}`);
    expect(title?.textContent).toBe(t("comments.title"));
    expect(replies().map((r) => r.querySelector(".spd-message")?.textContent)).toEqual(["First", "Second"]);
    expect(input()).toBeNull();
    expect(container.querySelector("[data-comment-delete]")).toBeNull();
  });

  it("marks the team's replies and dates every reply", () => {
    const { replies } = renderThread({
      comments: [makeComment({ id: "a" }), makeComment({ id: "b", authorRole: "team", authorName: "Studio" })],
    });
    const [client, team] = replies();
    expect(client?.querySelector(".spd-comment-team")).toBeNull();
    expect(team?.getAttribute("data-role")).toBe("team");
    expect(team?.querySelector(".spd-comment-team")?.textContent).toBe(t("comments.team"));
    expect(team?.querySelector("time")?.getAttribute("dateTime")).toBe("2026-07-20T10:05:00.000Z");
  });

  it("posts the trimmed draft and clears it, then gives the next reply a new clientId", async () => {
    const view = renderThread({ comments: [] });
    expect(view.input()?.getAttribute("aria-label")).toBe(t("comments.placeholder"));

    await type(view.input(), "  On it  ");
    await act(async () => view.send()?.click());
    await type(view.input(), "Done");
    await act(async () => view.send()?.click());

    const calls = vi.mocked(view.onAdd).mock.calls;
    expect(calls.map(([body]) => body)).toEqual(["On it", "Done"]);
    expect(calls[1]?.[1]).not.toBe(calls[0]?.[1]);
    expect(view.input()?.value).toBe("");
    expect(view.input()).toBe(document.activeElement);
  });

  it("sends on Ctrl+Enter or ⌘+Enter, never on Enter alone", async () => {
    const view = renderThread({ comments: [] });
    await type(view.input(), "Line");
    await act(async () => {
      fireEvent.keyDown(view.input() as HTMLTextAreaElement, { key: "Enter" });
    });
    expect(view.onAdd).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.keyDown(view.input() as HTMLTextAreaElement, { key: "Enter", ctrlKey: true });
    });
    await type(view.input(), "Again");
    await act(async () => {
      fireEvent.keyDown(view.input() as HTMLTextAreaElement, { key: "Enter", metaKey: true });
    });
    expect(view.onAdd).toHaveBeenCalledTimes(2);
  });

  it("ignores a blank draft and a second send while the first is in flight", async () => {
    const pending = deferred<void>();
    const view = renderThread({ comments: [], onAdd: vi.fn(() => pending.promise) });
    await act(async () => view.send()?.click());
    await type(view.input(), "Once");
    await act(async () => view.send()?.click());
    await act(async () => view.send()?.click());
    expect(view.onAdd).toHaveBeenCalledOnce();
    // Read-only, not disabled, so the keyboard focus stays where it was.
    expect(view.input()?.readOnly).toBe(true);
    expect(view.send()?.disabled).toBe(false);
    // Send says so: busy, and inert to clicks until the post settles.
    expect(view.send()?.getAttribute("aria-busy")).toBe("true");
    expect(view.send()?.getAttribute("aria-disabled")).toBe("true");
    await act(async () => pending.resolve());
    expect(view.send()?.getAttribute("aria-busy")).toBe("false");
  });

  it("keeps the draft and says so when a post fails, then resends it under the same clientId", async () => {
    const onAdd = vi.fn<(body: string, clientId: string) => Promise<void>>();
    onAdd.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
    const view = renderThread({ comments: [], onAdd });

    await type(view.input(), "Retry me");
    await act(async () => view.send()?.click());
    expect(view.alert()?.textContent).toBe(t("comments.failed"));
    expect(view.input()?.value).toBe("Retry me");

    await act(async () => view.send()?.click());
    expect(onAdd.mock.calls[1]?.[1]).toBe(onAdd.mock.calls[0]?.[1]);
    expect(view.alert()?.textContent).toBe("");
  });

  it("gives an edited draft a new clientId after a failure, so a first attempt that landed cannot replace it", async () => {
    const onAdd = vi.fn<(body: string, clientId: string) => Promise<void>>();
    onAdd.mockRejectedValueOnce(new Error("response lost")).mockResolvedValueOnce(undefined);
    const view = renderThread({ comments: [], onAdd });

    await type(view.input(), "see v2");
    await act(async () => view.send()?.click());
    await type(view.input(), "see v3");
    await act(async () => view.send()?.click());

    expect(onAdd.mock.calls[1]?.[0]).toBe("see v3");
    expect(onAdd.mock.calls[1]?.[1]).not.toBe(onAdd.mock.calls[0]?.[1]);
  });

  it("ignores a second delete while the first is in flight, and marks it busy", async () => {
    const pending = deferred<void>();
    const view = renderThread({ comments: [makeComment()], onDelete: vi.fn(() => pending.promise) });
    await act(async () => view.container.querySelector<HTMLButtonElement>("[data-comment-delete]")?.click());
    const confirm = () => view.container.querySelector<HTMLButtonElement>(".spd-confirm .spd-btn-danger");

    await act(async () => confirm()?.click());
    await act(async () => confirm()?.click());

    expect(view.onDelete).toHaveBeenCalledOnce();
    expect(confirm()?.getAttribute("aria-busy")).toBe("true");
    await act(async () => pending.resolve());
    expect(view.alert()?.textContent).toBe("");
  });

  it("announces a reply that comes in, and one that goes, in a status of its own — never the delete question", async () => {
    const view = renderWithUi(<LiveThread initial={[makeComment({ id: "a" })]} canComment />);
    const status = () => view.container.querySelector('[role="status"]');
    expect(view.container.querySelector("[aria-live]")).toBeNull();
    expect(status()?.textContent).toBe("");

    await type(view.container.querySelector("textarea"), "Done");
    await act(async () => view.container.querySelector<HTMLButtonElement>(".spd-thread-composer button")?.click());
    expect(status()?.textContent).toBe("Reply from Studio");

    await act(async () => view.container.querySelector<HTMLButtonElement>('[data-comment-delete="a"]')?.click());
    const confirm = view.container.querySelector<HTMLButtonElement>(".spd-confirm .spd-btn-danger");
    const question = view.container.querySelector(`#${CSS.escape(confirm?.getAttribute("aria-describedby") ?? "")}`);
    expect(question?.textContent).toBe(t("comments.deleteConfirm"));
    expect(confirm?.closest('[aria-live], [role="status"]')).toBeNull();

    await act(async () => confirm?.click());
    expect(status()?.textContent).toBe(t("comments.deleted"));
  });

  it("hands the focus to the next reply's delete, else the previous one's, else the drawer — never <body>", async () => {
    const ids = ["a", "b", "c"];
    const view = renderWithUi(
      // The drawer: a focusable container around the thread.
      <div className="drawer" tabIndex={-1}>
        <LiveThread initial={ids.map((id) => makeComment({ id }))} canComment={false} />
      </div>,
    );
    const trash = (id: string) => view.container.querySelector<HTMLButtonElement>(`[data-comment-delete="${id}"]`);
    const remove = async (id: string) => {
      await act(async () => trash(id)?.click());
      await act(async () => view.container.querySelector<HTMLButtonElement>(".spd-confirm .spd-btn-danger")?.click());
    };

    await remove("b");
    expect(document.activeElement).toBe(trash("c"));
    await remove("c");
    expect(document.activeElement).toBe(trash("a"));
    // The thread leaves with its last reply, the composer being off.
    await remove("a");
    expect(view.container.querySelector("section")).toBeNull();
    expect(document.activeElement).toBe(view.container.querySelector(".drawer"));
  });

  it("asks before deleting a reply, moving the focus to the question and back", async () => {
    const view = renderThread({ comments: [makeComment()] });
    const trash = view.container.querySelector<HTMLButtonElement>("[data-comment-delete]");
    expect(trash?.getAttribute("aria-label")).toBe(t("comments.delete"));

    await act(async () => trash?.click());
    expect(trash?.getAttribute("aria-expanded")).toBe("true");
    const confirm = view.container.querySelector<HTMLButtonElement>(".spd-confirm .spd-btn-danger");
    expect(document.activeElement).toBe(confirm);
    expect(view.onDelete).not.toHaveBeenCalled();

    await act(async () => view.container.querySelector<HTMLButtonElement>(".spd-confirm .spd-btn-ghost")?.click());
    expect(view.container.querySelector(".spd-confirm")).toBeNull();
    expect(document.activeElement).toBe(trash);

    await act(async () => trash?.click());
    await act(async () => view.container.querySelector<HTMLButtonElement>(".spd-confirm .spd-btn-danger")?.click());
    expect(view.onDelete).toHaveBeenCalledWith("c-1");
    expect(view.container.querySelector(".spd-confirm")).toBeNull();
    expect(document.activeElement).toBe(view.input());
  });

  it("offers no delete when replies can be posted but not deleted", () => {
    const view = renderThread({ comments: [makeComment()], canDelete: false });
    expect(view.input()).not.toBeNull();
    expect(view.container.querySelector("[data-comment-delete]")).toBeNull();
  });

  it("keeps the question open and says so when a delete fails", async () => {
    const view = renderThread({
      comments: [makeComment()],
      onDelete: vi.fn(async () => Promise.reject(new Error("403"))),
    });
    await act(async () => view.container.querySelector<HTMLButtonElement>("[data-comment-delete]")?.click());
    await act(async () => view.container.querySelector<HTMLButtonElement>(".spd-confirm .spd-btn-danger")?.click());
    expect(view.alert()?.textContent).toBe(t("comments.failed"));
    expect(view.container.querySelector(".spd-confirm")).not.toBeNull();
  });

  it("renders bodies as text, never as markup", () => {
    const { replies } = renderThread({ comments: [makeComment({ body: "<img src=x onerror=alert(1)>" })] });
    expect(replies()[0]?.querySelector("img")).toBeNull();
    expect(replies()[0]?.textContent).toContain("<img src=x onerror=alert(1)>");
  });
});

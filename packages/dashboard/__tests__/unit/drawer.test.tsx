// @vitest-environment jsdom

import type { FeedbackPermissions } from "@siteping/core";
import { act, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Drawer } from "../../src/components/drawer.js";
import { makeRecord } from "../helpers.js";
import { renderWithUi } from "../render.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderDrawer(recordOverrides = {}, permissions: Partial<FeedbackPermissions> = {}) {
  const record = makeRecord(recordOverrides);
  const onAddComment = vi.fn(async () => {});
  const { container } = renderWithUi(
    <Drawer
      record={record}
      overlay={false}
      deepLinkParam="siteping"
      onClose={vi.fn()}
      onChangeStatus={vi.fn()}
      onDelete={vi.fn()}
      permissions={{
        canChangeStatus: true,
        canDelete: true,
        canComment: false,
        canDeleteComment: false,
        ...permissions,
      }}
      onAddComment={onAddComment}
      onDeleteComment={vi.fn(async () => {})}
    />,
  );
  return { record, container, onAddComment };
}

describe("Drawer — invalid createdAt", () => {
  it("renders a placeholder submitted date instead of throwing", () => {
    const { container } = renderDrawer({ createdAt: new Date("nope") });
    const time = container.querySelector(".spd-meta-grid time");
    expect(time?.textContent).toBe("—");
    expect(time?.hasAttribute("datetime")).toBe(false);
  });
});

describe("Drawer — author line", () => {
  it("renders the author email in angle brackets when present", () => {
    const { container } = renderDrawer({ authorName: "Alex Client", authorEmail: "alex@client.example" });
    const author = container.querySelector(".spd-meta-value");
    expect(author?.textContent).toContain("Alex Client");
    expect(author?.textContent).toContain("<alex@client.example>");
  });

  it("renders no empty '<>' shell when authorEmail is redacted to an empty string", () => {
    const { container } = renderDrawer({ authorName: "Alex Client", authorEmail: "" });
    const author = container.querySelector(".spd-meta-value");
    expect(author?.textContent).toContain("Alex Client");
    expect(author?.textContent).not.toContain("<>");
  });
});

describe("Drawer — discussion thread", () => {
  it("shows the thread before the danger zone and posts replies for the opened record", async () => {
    const { record, container, onAddComment } = renderDrawer({}, { canComment: true, canDeleteComment: true });
    const thread = container.querySelector(".spd-thread");
    expect(thread?.compareDocumentPosition(container.querySelector(".spd-danger-zone") as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    await act(async () => {
      fireEvent.change(container.querySelector("textarea") as HTMLTextAreaElement, { target: { value: "On it" } });
    });
    await act(async () => container.querySelector<HTMLButtonElement>(".spd-thread-composer button")?.click());

    expect(onAddComment).toHaveBeenCalledWith(record.id, "On it", expect.any(String));
  });

  it("offers deletion only when the inbox can delete replies", () => {
    const comments = [
      {
        id: "c-1",
        feedbackId: "fb-1",
        body: "16 px",
        authorName: "Alex",
        authorEmail: "",
        authorRole: "client" as const,
        clientId: "",
        createdAt: new Date("2026-07-20T10:05:00.000Z"),
      },
    ];
    const { container } = renderDrawer({ comments }, { canComment: true });
    expect(container.querySelector(".spd-thread textarea")).not.toBeNull();
    expect(container.querySelector("[data-comment-delete]")).toBeNull();
  });

  it("leaves the thread out of a read-only drawer with nothing to read", () => {
    const { container } = renderDrawer({});
    expect(container.querySelector(".spd-thread")).toBeNull();
  });
});

describe("Drawer — permissions", () => {
  it("shows the status as plain text, without a menu, when it may not change", () => {
    const { container } = renderDrawer({ status: "in_progress" }, { canChangeStatus: false });
    const status = container.querySelector(".spd-drawer-head .spd-status-menu-trigger");
    expect(status?.tagName).toBe("SPAN");
    expect(status?.getAttribute("data-status")).toBe("in_progress");
    expect(container.querySelector('[aria-haspopup="listbox"]')).toBeNull();
  });

  it("offers the status menu when it may change", () => {
    const { container } = renderDrawer({ status: "in_progress" });
    expect(container.querySelector('.spd-drawer-head button[aria-haspopup="listbox"]')).not.toBeNull();
  });

  it("leaves out the danger zone when the record may not be deleted", () => {
    expect(renderDrawer({}, { canDelete: false }).container.querySelector(".spd-danger-zone")).toBeNull();
    cleanup();
    expect(renderDrawer({}).container.querySelector(".spd-danger-zone")).not.toBeNull();
  });
});

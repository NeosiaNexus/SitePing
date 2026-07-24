// @vitest-environment jsdom

import { cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Row } from "../../src/components/row.js";
import { makeRecord } from "../helpers.js";
import { renderWithUi } from "../render.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderRow(recordOverrides = {}, props: Partial<Parameters<typeof Row>[0]> = {}) {
  const record = makeRecord(recordOverrides);
  const onSelect = vi.fn();
  const refCallback = vi.fn();
  const { container } = renderWithUi(
    <Row
      record={record}
      domId={`row-${record.id}`}
      focused={false}
      selected={false}
      leaving={false}
      onSelect={onSelect}
      refCallback={refCallback}
      {...props}
    />,
  );
  return { record, onSelect, refCallback, row: container.querySelector<HTMLElement>(".spd-row") as HTMLElement };
}

describe("Row", () => {
  it("renders status, type, message, path and author with the right attributes", () => {
    const { row } = renderRow({
      status: "in_progress",
      type: "question",
      message: "The CTA is misaligned",
      url: "https://demo.dev/pricing#plans",
      authorName: "Sam",
    });
    expect(row.dataset.status).toBe("in_progress");
    expect(row.getAttribute("role")).toBe("option");
    expect(row.querySelector(".spd-row-status")?.getAttribute("aria-label")).toBe("In progress");
    expect(row.querySelector<HTMLElement>(".spd-type-square")?.dataset.type).toBe("question");
    expect(row.querySelector(".spd-row-message")?.textContent).toBe("The CTA is misaligned");
    expect(row.querySelector(".spd-row-path")?.textContent).toBe("/pricing#plans");
    expect(row.querySelector(".spd-row-author")?.textContent).toBe("Sam");
  });

  it("adds the focused class (keyboard focus) but does not set aria-selected", () => {
    const { row } = renderRow({}, { focused: true, selected: false });
    expect(row.className).toContain("spd-row-focused");
    expect(row.getAttribute("aria-selected")).toBe("false");
  });

  it("sets aria-selected only when it is the opened (selected) row", () => {
    const { row } = renderRow({}, { focused: false, selected: true });
    expect(row.getAttribute("aria-selected")).toBe("true");
    expect(row.className).not.toContain("spd-row-focused");
  });

  it("exposes the type label to assistive tech and hides the visual duplicate", () => {
    const { row } = renderRow({ type: "question" });
    const type = row.querySelector(".spd-row-type") as HTMLElement;
    expect(type.querySelector(".spd-sr-only")?.textContent).toBe("Question");
    expect(type.querySelector(".spd-type-label")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("carries title tooltips on the truncated fields", () => {
    const { row } = renderRow({
      message: "The header overlaps the logo on mobile",
      url: "https://demo.dev/pricing#plans",
      authorName: "Sam",
    });
    expect(row.querySelector(".spd-row-message")?.getAttribute("title")).toBe("The header overlaps the logo on mobile");
    expect(row.querySelector(".spd-row-path")?.getAttribute("title")).toBe("/pricing#plans");
    expect(row.querySelector(".spd-row-author")?.getAttribute("title")).toBe("Sam");
  });

  it("does not open when the click follows a text selection", () => {
    vi.spyOn(window, "getSelection").mockReturnValue({ toString: () => "selected text" } as unknown as Selection);
    const { row, onSelect } = renderRow();
    fireEvent.click(row);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("shows the camera glyph only when a screenshot exists", () => {
    const withShot = renderRow({ screenshotUrl: "data:image/jpeg;base64,AA" });
    expect(withShot.row.querySelector(".spd-row-camera")).not.toBeNull();
    const without = renderRow({ screenshotUrl: null });
    expect(without.row.querySelector(".spd-row-camera")).toBeNull();
  });

  it("renders the timestamp with an absolute title and machine-readable dateTime", () => {
    const { row, record } = renderRow();
    const time = row.querySelector("time");
    expect(time?.getAttribute("datetime")).toBe(record.createdAt.toISOString());
    expect(time?.getAttribute("title")).toBeTruthy();
  });

  it("calls onSelect when clicked", () => {
    const { row, onSelect } = renderRow();
    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("is inert while leaving — aria-hidden and no click handler", () => {
    const { row, onSelect } = renderRow({}, { leaving: true });
    expect(row.getAttribute("aria-hidden")).toBe("true");
    expect(row.className).toContain("spd-row-leaving");
    fireEvent.click(row);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

// @vitest-environment jsdom

import { cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Row } from "../../src/components/row.js";
import { makeRecord } from "../helpers.js";
import { renderWithUi } from "../render.js";

afterEach(() => cleanup());

function renderRow(recordOverrides = {}, props: Partial<Parameters<typeof Row>[0]> = {}) {
  const record = makeRecord(recordOverrides);
  const onSelect = vi.fn();
  const refCallback = vi.fn();
  const { container } = renderWithUi(
    <Row
      record={record}
      domId={`row-${record.id}`}
      focused={false}
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

  it("adds the focused class and aria-selected when focused", () => {
    const { row } = renderRow({}, { focused: true });
    expect(row.className).toContain("spd-row-focused");
    expect(row.getAttribute("aria-selected")).toBe("true");
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

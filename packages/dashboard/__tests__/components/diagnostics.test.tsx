// @vitest-environment jsdom

import type { DiagnosticsSnapshot } from "@siteping/core";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Diagnostics } from "../../src/components/diagnostics.js";
import { makeDiagnostics } from "../helpers.js";
import { renderWithUi } from "../render.js";

afterEach(() => cleanup());

describe("Diagnostics", () => {
  it("merges console + network entries in chronological order", () => {
    const { container } = renderWithUi(<Diagnostics diagnostics={makeDiagnostics()} />);
    const entries = [...container.querySelectorAll(".spd-diag-entry")];
    // warn @10:00:00 · network @10:00:01 · error @10:00:02
    expect(entries).toHaveLength(3);
    expect(entries[0]?.textContent).toContain("Deprecated API used");
    expect(entries[1]?.textContent).toContain("GET");
    expect(entries[1]?.textContent).toContain("/orders");
    expect(entries[2]?.textContent).toContain("TypeError");
  });

  it("shows the merged count in the section header", () => {
    renderWithUi(<Diagnostics diagnostics={makeDiagnostics()} />);
    expect(screen.getByText(/Diagnostics · 3/)).toBeTruthy();
  });

  it("flags failed network entries (status >= 400)", () => {
    const { container } = renderWithUi(<Diagnostics diagnostics={makeDiagnostics()} />);
    const failed = container.querySelector<HTMLElement>('.spd-diag-entry[data-level="error"] .spd-diag-status');
    expect(failed?.textContent).toBe("500");
    expect(failed?.dataset.failed).toBe("true");
  });

  it("marks a 2xx network entry as info, not failed", () => {
    const diagnostics: DiagnosticsSnapshot = {
      console: [],
      network: [
        { url: "https://api/ok", method: "POST", status: 200, durationMs: 12, timestamp: "2026-07-20T10:00:00.000Z" },
      ],
    };
    const { container } = renderWithUi(<Diagnostics diagnostics={diagnostics} />);
    expect(container.querySelector('.spd-diag-entry[data-level="info"]')).not.toBeNull();
    expect(container.querySelector<HTMLElement>(".spd-diag-status")?.dataset.failed).toBeUndefined();
  });

  it("collapses to the first six entries with a Show all button, then reveals the rest", () => {
    const diagnostics: DiagnosticsSnapshot = {
      console: Array.from({ length: 8 }, (_v, i) => ({
        level: "log" as const,
        timestamp: `2026-07-20T10:00:0${i}.000Z`,
        message: `line ${i}`,
      })),
      network: [],
    };
    const { container } = renderWithUi(<Diagnostics diagnostics={diagnostics} />);
    expect(container.querySelectorAll(".spd-diag-entry")).toHaveLength(6);
    const showAll = screen.getByRole("button", { name: "Show all (8)" });
    fireEvent.click(showAll);
    expect(container.querySelectorAll(".spd-diag-entry")).toHaveLength(8);
  });

  it("expands a clamped console message on click and collapses again", () => {
    const { container } = renderWithUi(<Diagnostics diagnostics={makeDiagnostics()} />);
    const msg = container.querySelector<HTMLElement>(".spd-diag-msg") as HTMLElement;
    expect(msg.getAttribute("role")).toBe("button");
    expect(msg.getAttribute("style")).toBeNull();
    fireEvent.click(msg);
    expect(msg.getAttribute("style")).toContain("max-height");
    fireEvent.click(msg);
    // React clears the inline style; jsdom keeps an empty attribute, so assert
    // the clamp override is gone rather than the attribute being absent.
    expect(msg.getAttribute("style") ?? "").not.toContain("max-height");
  });

  it("expands a console message with the keyboard (Enter)", () => {
    const { container } = renderWithUi(<Diagnostics diagnostics={makeDiagnostics()} />);
    const msg = container.querySelector<HTMLElement>(".spd-diag-msg") as HTMLElement;
    fireEvent.keyDown(msg, { key: "Enter" });
    expect(msg.getAttribute("style")).toContain("max-height");
  });
});

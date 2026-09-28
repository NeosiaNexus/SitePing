// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { isCoarsePointer, isCompactViewport, trackKeyboardInset } from "../../src/viewport.js";
import { mockMediaQueries, mockVisualViewport } from "../helpers.js";

describe("viewport", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "matchMedia");
  });

  describe("media helpers", () => {
    it("report false where matchMedia is unavailable", () => {
      Reflect.deleteProperty(window, "matchMedia");
      expect(isCompactViewport()).toBe(false);
      expect(isCoarsePointer()).toBe(false);
    });

    it("isCompactViewport reads the 640px phone breakpoint", () => {
      mockMediaQueries(["(max-width: 640px)"]);
      expect(isCompactViewport()).toBe(true);
      expect(isCoarsePointer()).toBe(false);
    });

    it("isCoarsePointer reads pointer: coarse", () => {
      mockMediaQueries(["(pointer: coarse)"]);
      expect(isCoarsePointer()).toBe(true);
      expect(isCompactViewport()).toBe(false);
    });
  });

  describe("trackKeyboardInset", () => {
    it("is a no-op without the Visual Viewport API", () => {
      const onChange = vi.fn();
      const stop = trackKeyboardInset(onChange);
      expect(onChange).not.toHaveBeenCalled();
      expect(() => stop()).not.toThrow();
    });

    it("reports the keyboard inset immediately and on every visual viewport change", () => {
      const vv = mockVisualViewport();
      try {
        const onChange = vi.fn();
        const stop = trackKeyboardInset(onChange);
        expect(onChange).toHaveBeenLastCalledWith(0, window.innerHeight);

        vv.keyboard(300);
        expect(onChange).toHaveBeenLastCalledWith(300, window.innerHeight - 300);

        // iOS scrolls the visual viewport down to reveal the focused field
        vv.keyboard(300, 120);
        expect(onChange).toHaveBeenLastCalledWith(300, window.innerHeight - 420);

        vv.viewport.dispatchEvent(new Event("scroll"));
        expect(onChange).toHaveBeenCalledTimes(4);

        stop();
        vv.keyboard(0);
        expect(onChange).toHaveBeenCalledTimes(4);
      } finally {
        vv.restore();
      }
    });

    it("never reports a negative inset (visual viewport taller than the layout one)", () => {
      const vv = mockVisualViewport();
      try {
        vv.viewport.height = window.innerHeight + 40;
        const onChange = vi.fn();
        trackKeyboardInset(onChange)();
        expect(onChange).toHaveBeenCalledWith(0, window.innerHeight + 40);
      } finally {
        vv.restore();
      }
    });
  });
});

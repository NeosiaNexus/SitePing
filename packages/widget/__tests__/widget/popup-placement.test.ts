import { describe, expect, it } from "vitest";
import { computePopupPosition } from "../../src/popup-placement.js";

const viewport = { width: 1280, height: 720 };
const popup = { width: 300, height: 260 };

function anchor(top: number, bottom: number, left = 100, right = 400) {
  return { top, bottom, left, right };
}

describe("computePopupPosition", () => {
  it("places the popup below the anchor when it fits", () => {
    expect(computePopupPosition(anchor(100, 200), popup, viewport)).toEqual({ top: 208, left: 100 });
  });

  it("uses the measured height to decide whether the popup fits below", () => {
    // 460 + 8 + 220 = 688 fits a 220px popup, but not the 260px one → above.
    expect(computePopupPosition(anchor(400, 460), { width: 300, height: 220 }, viewport).top).toBe(468);
    expect(computePopupPosition(anchor(400, 460), popup, viewport).top).toBe(400 - 8 - 260);
  });

  it("does not flip above into the band reserved by a top toolbar", () => {
    // Above would be 280 - 8 - 260 = 12, inside the 52px toolbar band.
    const position = computePopupPosition(anchor(280, 650), popup, viewport, { top: 52, bottom: 0 });
    expect(position.top).toBeGreaterThanOrEqual(52 + 8);
    expect(position.top + popup.height).toBeLessThanOrEqual(viewport.height - 8);
  });

  it("keeps the popup above a toolbar relocated to the bottom edge", () => {
    const position = computePopupPosition(anchor(300, 400), popup, viewport, { top: 0, bottom: 52 });
    // Below would end at 408 + 260 = 668, inside the 668..720 toolbar band → above.
    expect(position.top + popup.height).toBeLessThanOrEqual(viewport.height - 52 - 8);
  });

  it("clamps inside the usable viewport keeping the bottom actions visible", () => {
    const position = computePopupPosition(anchor(60, 700), popup, viewport, { top: 52, bottom: 0 });
    expect(position.top).toBe(720 - 8 - 260);
  });

  it("flips to the anchor's right edge when it would overflow horizontally", () => {
    expect(computePopupPosition(anchor(100, 200, 1100, 1250), popup, viewport).left).toBe(1250 - 300);
  });

  it("never positions the popup past the viewport margins", () => {
    const narrowViewport = { width: 320, height: 720 };
    const position = computePopupPosition(anchor(100, 200, 200, 250), popup, narrowViewport);
    expect(position.left).toBe(8);
  });
});

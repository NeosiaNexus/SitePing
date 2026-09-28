import { describe, expect, it } from "vitest";
import { screenshotMimeType } from "../src/index.js";

describe("screenshotMimeType", () => {
  it.each([
    ["data:image/jpeg;base64,/9j/", "image/jpeg"],
    ["data:image/png;base64,iVBORw0KGgo=", "image/png"],
    ["data:image/webp;base64,UklGRg==", "image/webp"],
    // MIME types are case-insensitive; the reported one is lowercase.
    ["data:IMAGE/PNG;base64,iVBORw0KGgo=", "image/png"],
  ])("reports the type %s declares", (dataUrl, mimeType) => {
    expect(screenshotMimeType(dataUrl)).toBe(mimeType);
  });

  it.each([
    // Script-capable when served inline under its own label.
    "data:image/svg+xml;base64,PHN2Zz4=",
    "data:text/html,<script>",
    "data:image/pngx;base64,AAAA",
    "data:;base64,/9j/",
  ])("reports JPEG, the widget's capture format, for %s", (dataUrl) => {
    expect(screenshotMimeType(dataUrl)).toBe("image/jpeg");
  });
});

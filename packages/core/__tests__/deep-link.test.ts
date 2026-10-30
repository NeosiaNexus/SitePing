import { describe, expect, it } from "vitest";
import { buildDeepLink, isSafeImageUrl, parseHttpUrl } from "../src/deep-link.js";

describe("isSafeImageUrl", () => {
  it("accepts the captured raster formats, https storage and loopback http", () => {
    expect(isSafeImageUrl("data:image/jpeg;base64,AAAA")).toBe(true);
    expect(isSafeImageUrl("data:image/png;base64,AAAA")).toBe(true);
    expect(isSafeImageUrl("data:image/webp;base64,AAAA")).toBe(true);
    expect(isSafeImageUrl("https://bucket.r2.dev/shot.png")).toBe(true);
    expect(isSafeImageUrl("http://localhost:9000/shots/a.png")).toBe(true);
    expect(isSafeImageUrl("http://127.0.0.1/a.png")).toBe(true);
    expect(isSafeImageUrl("http://minio.localhost/a.png")).toBe(true);
    expect(isSafeImageUrl("http://[::1]:9000/a.png")).toBe(true);
  });

  it("refuses scripts, SVG, other data URLs, remote http and loopback look-alikes", () => {
    expect(isSafeImageUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeImageUrl("data:image/svg+xml,<svg/>")).toBe(false);
    expect(isSafeImageUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeImageUrl("http://tracker.example.com/pixel.png")).toBe(false);
    expect(isSafeImageUrl("http://localhost.evil.com/a.png")).toBe(false);
    expect(isSafeImageUrl("http://localhost@evil.com/a.png")).toBe(false);
    expect(isSafeImageUrl("javascript://localhost/%0aalert(1)")).toBe(false);
    expect(isSafeImageUrl("not a url")).toBe(false);
  });
});

describe("parseHttpUrl", () => {
  it("resolves relative URLs against the base and keeps absolute ones", () => {
    expect(parseHttpUrl("/pricing?plan=pro", "https://acme.test/app/")?.href).toBe(
      "https://acme.test/pricing?plan=pro",
    );
    expect(parseHttpUrl("http://other.test/p", "https://acme.test")?.href).toBe("http://other.test/p");
  });

  it("refuses non-http(s) schemes, unparseable values and relative URLs without a base", () => {
    expect(parseHttpUrl("javascript:alert(1)", "https://acme.test")).toBeNull();
    expect(parseHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(parseHttpUrl("http://[")).toBeNull();
    expect(parseHttpUrl("/pricing")).toBeNull();
  });
});

describe("buildDeepLink", () => {
  it("adds the feedback id under the given parameter, keeping the page's own query", () => {
    expect(buildDeepLink({ id: "fb-1", url: "https://acme.test/p?step=2" }, "siteping")).toBe(
      "https://acme.test/p?step=2&siteping=fb-1",
    );
  });

  it("resolves the widget's default pathname URL against the base", () => {
    expect(buildDeepLink({ id: "fb-1", url: "/pricing" }, "fb", "https://acme.test")).toBe(
      "https://acme.test/pricing?fb=fb-1",
    );
    expect(buildDeepLink({ id: "fb-1", url: "/pricing" }, "fb")).toBeNull();
  });

  it("links nowhere for a non-http(s) record URL", () => {
    expect(buildDeepLink({ id: "fb-1", url: "javascript:alert(1)" }, "siteping", "https://acme.test")).toBeNull();
  });
});

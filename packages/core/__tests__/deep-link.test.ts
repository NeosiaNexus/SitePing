import { describe, expect, it } from "vitest";
import { buildDeepLink, parseHttpUrl } from "../src/deep-link.js";

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

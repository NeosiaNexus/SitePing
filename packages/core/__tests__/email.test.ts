import { describe, expect, it } from "vitest";
import { EMAIL_PATTERN, isValidEmail } from "../src/index.js";

describe("EMAIL_PATTERN / isValidEmail", () => {
  it.each([
    "alice@example.com",
    "user+tag@example.co.uk",
    "o'brien@example.ie",
    "john@company.local",
    // Internationalised addresses — the audience this widget serves.
    "françois@exemple.fr",
    "user@münchen.de",
    "user@xn--mnchen-3ya.de",
    `${"x".repeat(64)}@example.com`,
  ])("accepts %s", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    ["missing @", "alice.example.com"],
    ["no dot in the domain", "user@example"],
    ["single-character final label", "a@b.c"],
    ["underscore in the domain", "user@exa_mple.com"],
    ["domain label starting with a hyphen", "user@-dash.com"],
    ["leading dot in the local part", ".lead@example.com"],
    ["trailing dot in the local part", "user.@example.com"],
    ["doubled dot", "user..dot@example.com"],
    ["quoted local part", '"john doe"@x.com'],
    ["whitespace", "john doe@example.com"],
    ["local part over 64 characters", `${"x".repeat(65)}@example.com`],
  ])("rejects %s", (_label, email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it("is anchored — a valid address embedded in noise is rejected", () => {
    expect(EMAIL_PATTERN.test("prefix alice@example.com")).toBe(false);
    expect(EMAIL_PATTERN.test("alice@example.com\n")).toBe(false);
  });
});

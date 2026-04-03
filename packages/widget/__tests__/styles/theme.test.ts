import { describe, expect, it } from "vitest";
import { buildThemeColors, getTypeColor } from "../../src/styles/theme.js";

describe("buildThemeColors", () => {
  it("uses default accent when none provided", () => {
    const colors = buildThemeColors();
    expect(colors.accent).toBe("#0066ff");
  });

  it("normalizes 6-digit hex", () => {
    const colors = buildThemeColors("#ff5500");
    expect(colors.accent).toBe("#ff5500");
    expect(colors.accentLight).toBe("#ff550014");
  });

  it("expands 3-digit shorthand hex", () => {
    const colors = buildThemeColors("#f50");
    expect(colors.accent).toBe("#ff5500");
  });

  it("strips alpha from 8-digit hex", () => {
    const colors = buildThemeColors("#ff5500cc");
    expect(colors.accent).toBe("#ff5500");
  });

  it("falls back to default for rgb() format", () => {
    const colors = buildThemeColors("rgb(255,85,0)");
    expect(colors.accent).toBe("#0066ff");
  });

  it("falls back to default for invalid string", () => {
    const colors = buildThemeColors("not-a-color");
    expect(colors.accent).toBe("#0066ff");
  });

  it("falls back to default for empty string", () => {
    const colors = buildThemeColors("");
    expect(colors.accent).toBe("#0066ff");
  });
});

describe("getTypeColor", () => {
  const colors = buildThemeColors();

  it("returns blue for question", () => {
    expect(getTypeColor("question", colors)).toBe(colors.typeQuestion);
  });

  it("returns orange for changement", () => {
    expect(getTypeColor("changement", colors)).toBe(colors.typeChangement);
  });

  it("returns red for bug", () => {
    expect(getTypeColor("bug", colors)).toBe(colors.typeBug);
  });

  it("returns gray for autre and unknown", () => {
    expect(getTypeColor("autre", colors)).toBe(colors.typeAutre);
    expect(getTypeColor("unknown", colors)).toBe(colors.typeAutre);
  });
});

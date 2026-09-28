import { afterEach, describe, expect, it, vi } from "vitest";
import { createI18n, intlLocale } from "../src/i18n.js";

describe("intlLocale", () => {
  it("keeps a tag Intl accepts, canonicalized", () => {
    expect(intlLocale("fr")).toBe("fr");
    expect(intlLocale("pt-br")).toBe("pt-BR");
  });

  it("reads a backend-style underscore tag as BCP-47", () => {
    expect(intlLocale("fr_FR")).toBe("fr-FR");
    expect(() => new Date(0).toLocaleTimeString(intlLocale("fr_FR"))).not.toThrow();
  });

  it("falls back to English for a tag Intl still rejects", () => {
    expect(intlLocale("e!")).toBe("en");
    expect(intlLocale("")).toBe("en");
  });
});

describe("createI18n — locale normalisation", () => {
  afterEach(() => vi.restoreAllMocks());

  const i18n = createI18n<{ hello: string }>(
    { hello: "Hello" },
    {
      de: async () => ({ hello: "Hallo" }),
      es: async () => ({ hello: "Hola" }),
      fr: async () => ({ hello: "Bonjour" }),
      it: async () => ({ hello: "Ciao" }),
      pt: async () => ({ hello: "Olá" }),
      ru: async () => ({ hello: "Привет" }),
    },
  );

  it("resolves a backend-style fr_FR tag to the built-in French dictionary", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await i18n.loadLocale("fr_FR")).toEqual({ hello: "Bonjour" });
    expect(i18n.createT("fr_FR")("hello")).toBe("Bonjour");
    expect(warn).not.toHaveBeenCalled();
  });
});

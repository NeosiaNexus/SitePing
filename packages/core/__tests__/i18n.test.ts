import { afterEach, describe, expect, it, vi } from "vitest";
import { canonicalizeLocale, createI18n, intlLocale } from "../src/i18n.js";

afterEach(() => {
  vi.restoreAllMocks();
});

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

describe("canonicalizeLocale", () => {
  it.each([
    ["fr_FR", "fr-FR"],
    ["pt_BR", "pt-BR"],
    ["zh_hant_tw", "zh-Hant-TW"],
    ["EN", "en"],
    ["fr-ca", "fr-CA"],
  ])("turns %j into the tag Intl accepts (%j)", (input, expected) => {
    expect(canonicalizeLocale(input)).toBe(expected);
    // The whole point: every Intl constructor accepts the result.
    expect(() => new Intl.RelativeTimeFormat(canonicalizeLocale(input))).not.toThrow();
  });

  it.each(["", "not a locale", "fr__FR"])("falls back to en, with a warning, for the malformed tag %j", (input) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(canonicalizeLocale(input)).toBe("en");
    expect(warn).toHaveBeenCalledExactlyOnceWith(`[siteping] Invalid locale "${input}", falling back to "en"`);
  });
});

describe("createI18n — locale normalisation", () => {
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

  it("resolves a dictionary registered under the base language for an underscore tag", () => {
    const custom = createI18n({ hello: "Hello" }, {} as never);
    custom.registerLocale("fr_FR", { hello: "Bonjour" });
    expect(custom.createT("fr_BE")("hello")).toBe("Bonjour");
    expect(custom.createT("fr-CA")("hello")).toBe("Bonjour");
  });
});

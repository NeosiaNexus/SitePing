import { BUILTIN_LOCALES } from "@siteping/core";
import { describe, expect, it, vi } from "vitest";
import { en } from "../../src/i18n/en.js";
import {
  createT,
  getStatusLabel,
  getTypeLabel,
  interpolate,
  loadLocale,
  registerLocale,
  tWithParams,
} from "../../src/i18n/index.js";
import type { TranslationKey } from "../../src/i18n/types.js";

// Every loop below is driven by BUILTIN_LOCALES: adding a locale to core's
// list requires zero edits here — the new dictionary is picked up, checked
// for key parity, empty values and placeholder parity automatically.
const NON_EN_LOCALES = BUILTIN_LOCALES.filter((locale) => locale !== "en");
const EN_KEYS = Object.keys(en).sort() as TranslationKey[];

/** The distinct `{placeholder}` names a template expects, sorted. */
function placeholdersOf(template: string): string[] {
  return [...new Set([...template.matchAll(/\{(\w+)\}/g)].map(([, name]) => name as string))].sort();
}

// ---------------------------------------------------------------------------
// loadLocale — every built-in resolves to a complete dictionary
// ---------------------------------------------------------------------------

describe("loadLocale", () => {
  it.each(NON_EN_LOCALES)("resolves the built-in locale %s with en's exact key set", async (locale) => {
    const dict = await loadLocale(locale);
    expect(dict).not.toBeNull();
    expect(Object.keys(dict ?? {}).sort()).toEqual(EN_KEYS);
  });

  it("returns the English dictionary as-is", async () => {
    expect(await loadLocale("en")).toBe(en);
  });

  it("returns null for an unknown locale code", async () => {
    expect(await loadLocale("zz")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createT — locale resolution
// ---------------------------------------------------------------------------

describe("createT", () => {
  it.each(NON_EN_LOCALES)("routes %s through its loaded dictionary", async (locale) => {
    const dict = await loadLocale(locale);
    const t = createT(locale);
    for (const key of EN_KEYS) {
      expect(t(key), `${locale} key "${key}"`).toBe(dict?.[key]);
    }
  });

  it.each(NON_EN_LOCALES)("resolves the language prefix of a full BCP-47 tag (%s-XX)", async (locale) => {
    const dict = await loadLocale(locale);
    const t = createT(`${locale}-XX`);
    expect(t("panel.close")).toBe(dict?.["panel.close"]);
  });

  it("returns English translations for 'en'", () => {
    const t = createT("en");
    expect(t("panel.title")).toBe("Feedbacks");
    expect(t("panel.close")).toBe("Close panel");
    expect(t("popup.submit")).toBe("Send");
  });

  // Spot check on the primary non-English audience locale — the loops above
  // guarantee structure, this one guards the actual French wording.
  it("returns French translations for 'fr'", () => {
    const t = createT("fr");
    expect(t("panel.title")).toBe("Feedbacks");
    expect(t("panel.close")).toBe("Fermer le panneau");
    expect(t("popup.submit")).toBe("Envoyer");
  });

  it("is case-insensitive on the locale prefix", () => {
    expect(createT("EN")("panel.close")).toBe("Close panel");
    expect(createT("FR-FR")("panel.close")).toBe("Fermer le panneau");
  });

  it("falls back to English for an unknown locale, with a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(createT("zz")("panel.close")).toBe("Close panel");
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("falls back to English for an empty locale string", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(createT("")("panel.close")).toBe("Close panel");
    warn.mockRestore();
  });

  it("returns the key itself for a missing translation key", () => {
    const t = createT("fr") as (key: string) => string;
    expect(t("nonexistent.key")).toBe("nonexistent.key");
  });
});

// ---------------------------------------------------------------------------
// registerLocale — custom + partial dictionaries
// ---------------------------------------------------------------------------

describe("registerLocale", () => {
  it("makes a custom locale available to createT", () => {
    registerLocale("xx", { ...en, "panel.close": "CLOSE IT" });
    expect(createT("xx")("panel.close")).toBe("CLOSE IT");
  });

  it("falls back to English per key for a partial dictionary", () => {
    registerLocale("yy", { "panel.close": "Somente isto" });
    const t = createT("yy");
    expect(t("panel.close")).toBe("Somente isto");
    expect(t("popup.submit")).toBe(en["popup.submit"]);
  });
});

// ---------------------------------------------------------------------------
// interpolate / tWithParams
// ---------------------------------------------------------------------------

describe("interpolate", () => {
  it("substitutes named placeholders", () => {
    expect(interpolate("{count} feedback markers displayed", { count: 3 })).toBe("3 feedback markers displayed");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(interpolate("Hi {name}", { other: 1 })).toBe("Hi {name}");
  });

  it("stringifies numbers and booleans", () => {
    expect(interpolate("{n} / {flag}", { n: 5, flag: true })).toBe("5 / true");
  });

  it("tWithParams interpolates a translated template", () => {
    expect(tWithParams(createT("en"), "marker.count", { count: 7 })).toBe("7 feedback markers displayed");
  });

  it("tWithParams fills every placeholder of a multi-param template", () => {
    expect(tWithParams(createT("en"), "marker.aria", { number: 2, type: "Bug", message: "oops" })).toBe(
      "Feedback #2: Bug — oops",
    );
  });
});

// ---------------------------------------------------------------------------
// getTypeLabel / getStatusLabel
// ---------------------------------------------------------------------------

describe("getTypeLabel", () => {
  it.each([
    ["question", "Question"],
    ["change", "Change"],
    ["bug", "Bug"],
    ["other", "Other"],
  ] as const)("maps %s to %s in English", (type, label) => {
    expect(getTypeLabel(type, createT("en"))).toBe(label);
  });

  it("returns localized labels", () => {
    const t = createT("fr");
    expect(getTypeLabel("question", t)).toBe("Question");
    expect(getTypeLabel("change", t)).toBe("Changement");
    expect(getTypeLabel("bug", t)).toBe("Bug");
    expect(getTypeLabel("other", t)).toBe("Autre");
  });

  it("returns the raw type string for an unknown type", () => {
    expect(getTypeLabel("unknown-type", createT("fr"))).toBe("unknown-type");
  });
});

describe("getStatusLabel", () => {
  it.each([
    ["open", "panel.statusOpen"],
    ["in_progress", "panel.statusInProgress"],
    ["resolved", "panel.statusResolved"],
    ["wont_fix", "panel.statusWontFix"],
  ] as const)("maps %s to the %s catalog entry", (status, key) => {
    expect(getStatusLabel(status, createT("en"))).toBe(en[key]);
  });

  it("returns the raw value for an unknown status", () => {
    expect(getStatusLabel("archived", createT("en"))).toBe("archived");
  });
});

// ---------------------------------------------------------------------------
// Translation completeness — structure, emptiness, placeholder parity
// ---------------------------------------------------------------------------

describe("translation completeness", () => {
  it.each(BUILTIN_LOCALES)("%s has no empty translation values", async (locale) => {
    const dict = await loadLocale(locale);
    expect(dict).not.toBeNull();
    for (const [key, value] of Object.entries(dict ?? {})) {
      expect(value, `${locale} key "${key}" is empty`).not.toBe("");
    }
  });

  it.each(NON_EN_LOCALES)("%s uses exactly en's placeholders in every key", async (locale) => {
    const dict = await loadLocale(locale);
    expect(dict).not.toBeNull();
    for (const key of EN_KEYS) {
      const translated = dict?.[key];
      expect(translated, `${locale} is missing key "${key}"`).toBeDefined();
      expect(placeholdersOf(translated ?? ""), `${locale} key "${key}" placeholder mismatch`).toEqual(
        placeholdersOf(en[key]),
      );
    }
  });
});

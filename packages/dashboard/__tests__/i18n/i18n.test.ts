import { BUILTIN_LOCALES } from "@siteping/core";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { de } from "../../src/i18n/de.js";
import { en } from "../../src/i18n/en.js";
import { es } from "../../src/i18n/es.js";
import { fr } from "../../src/i18n/fr.js";
import {
  createT,
  getStatusLabel,
  getTypeLabel,
  interpolate,
  loadLocale,
  registerLocale,
  tWithParams,
} from "../../src/i18n/index.js";
import { it as italian } from "../../src/i18n/it.js";
import { pt } from "../../src/i18n/pt.js";
import { ru } from "../../src/i18n/ru.js";

// ---------------------------------------------------------------------------
// Lazy-load upgrade — must run before anything else touches the "de" registry
// ---------------------------------------------------------------------------

describe("loadLocale — lazy upgrade", () => {
  it("falls back to English before a builtin loads, then upgrades once registered", async () => {
    const before = createT("de");
    expect(before("status.open")).toBe(en["status.open"]); // not loaded yet → en

    const dict = await loadLocale("de");
    expect(dict).not.toBeNull();
    expect(dict?.["status.open"]).toBe(de["status.open"]);

    const after = createT("de");
    expect(after("status.open")).toBe(de["status.open"]); // now German
  });

  it("returns null for an unknown locale code", async () => {
    expect(await loadLocale("zz")).toBeNull();
  });

  it("returns the cached English dictionary without a dynamic import", async () => {
    const dict = await loadLocale("en");
    expect(dict).toBe(en);
  });

  it.each(BUILTIN_LOCALES.filter((l) => l !== "en"))("dynamically imports the builtin locale %s", async (locale) => {
    const dict = await loadLocale(locale);
    expect(dict).not.toBeNull();
    expect(Object.keys(dict ?? {}).sort()).toEqual(Object.keys(en).sort());
  });
});

// ---------------------------------------------------------------------------
// createT — locale resolution
// ---------------------------------------------------------------------------

describe("createT", () => {
  beforeAll(async () => {
    await Promise.all([loadLocale("fr"), loadLocale("es"), loadLocale("ru"), loadLocale("it"), loadLocale("pt")]);
  });

  it("returns English for 'en'", () => {
    const t = createT("en");
    expect(t("status.open")).toBe("Open");
    expect(t("inbox.refresh")).toBe("Refresh");
  });

  it("returns French for 'fr'", () => {
    expect(createT("fr")("status.open")).toBe(fr["status.open"]);
  });

  it("resolves a language prefix from a full BCP-47 tag", () => {
    expect(createT("fr-FR")("status.open")).toBe(fr["status.open"]);
    expect(createT("es-MX")("status.open")).toBe(es["status.open"]);
  });

  it("is case-insensitive on the locale prefix", () => {
    expect(createT("EN")("status.open")).toBe("Open");
  });

  it("falls back to English for an unknown non-builtin locale", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(createT("zz")("status.open")).toBe("Open");
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("falls back to English for an empty locale string", () => {
    expect(createT("")("status.open")).toBe("Open");
  });

  it("returns the key itself for a missing translation key", () => {
    const t = createT("fr") as (key: string) => string;
    expect(t("nonexistent.key")).toBe("nonexistent.key");
  });
});

// ---------------------------------------------------------------------------
// registerLocale
// ---------------------------------------------------------------------------

describe("registerLocale", () => {
  it("makes a custom locale available to createT", () => {
    const custom = { ...en, "status.open": "OPENED" } as typeof en;
    registerLocale("xx", custom);
    expect(createT("xx")("status.open")).toBe("OPENED");
  });
});

// ---------------------------------------------------------------------------
// interpolate / tWithParams
// ---------------------------------------------------------------------------

describe("interpolate", () => {
  it("substitutes named placeholders", () => {
    expect(interpolate("Load more ({count} left)", { count: 3 })).toBe("Load more (3 left)");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(interpolate("Hi {name}", { other: 1 })).toBe("Hi {name}");
  });

  it("stringifies numbers and booleans", () => {
    expect(interpolate("{n} / {flag}", { n: 5, flag: true })).toBe("5 / true");
  });

  it("tWithParams interpolates a translated template", () => {
    expect(tWithParams(createT("en"), "inbox.loadMore", { count: 7 })).toBe("Load more (7)");
  });
});

// ---------------------------------------------------------------------------
// getStatusLabel / getTypeLabel
// ---------------------------------------------------------------------------

describe("getStatusLabel", () => {
  const t = createT("en");
  it.each([
    ["all", "All"],
    ["open", "Open"],
    ["in_progress", "In progress"],
    ["resolved", "Resolved"],
    ["wont_fix", "Won't fix"],
  ] as const)("maps %s to %s", (status, label) => {
    expect(getStatusLabel(status, t)).toBe(label);
  });

  it("returns the raw value for an unknown status", () => {
    expect(getStatusLabel("archived", t)).toBe("archived");
  });
});

describe("getTypeLabel", () => {
  const t = createT("en");
  it.each([
    ["question", "Question"],
    ["change", "Change"],
    ["bug", "Bug"],
    ["other", "Other"],
  ] as const)("maps %s to %s", (type, label) => {
    expect(getTypeLabel(type, t)).toBe(label);
  });

  it("returns the raw value for an unknown type", () => {
    expect(getTypeLabel("praise", t)).toBe("praise");
  });
});

// ---------------------------------------------------------------------------
// Translation completeness — every locale mirrors en's key set exactly
// ---------------------------------------------------------------------------

describe("translation completeness", () => {
  const enKeys = Object.keys(en).sort();
  const locales: Array<[string, Record<string, string>]> = [
    ["fr", fr],
    ["de", de],
    ["es", es],
    ["it", italian],
    ["pt", pt],
    ["ru", ru],
  ];

  it.each(locales)("%s has exactly the same keys as en", (_name, dict) => {
    expect(Object.keys(dict).sort()).toEqual(enKeys);
  });

  it.each([["en", en], ...locales])("%s has no empty translation values", (_name, dict) => {
    for (const [key, value] of Object.entries(dict)) {
      expect(value, `${_name} key "${key}" is empty`).not.toBe("");
    }
  });
});

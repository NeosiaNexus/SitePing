import { afterEach, describe, expect, it, vi } from "vitest";
import { canonicalizeLocale, createI18n, intlLocale, type LocaleLoaders } from "../src/i18n.js";

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
  // Only French is loaded here. The cast keeps this map from needing an edit
  // per new built-in locale: the widget and dashboard maps are the exhaustive,
  // compiler-checked ones.
  const i18n = createI18n<{ hello: string }>({ hello: "Hello" }, {
    fr: async () => ({ hello: "Bonjour" }),
  } as LocaleLoaders<{ hello: string }>);

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

describe("createI18n — registerLocale overrides (#303)", () => {
  type Catalog = { greet: string; submit: string; cancel: string };
  const en: Catalog = { greet: "Hello", submit: "Send", cancel: "Cancel" };
  const fr: Catalog = { greet: "Bonjour", submit: "Envoyer", cancel: "Annuler" };

  // A fresh registry per test; `release` settles the French chunk on demand.
  function setup() {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const loader = vi.fn(async () => {
      await gate;
      return fr;
    });
    const i18n = createI18n<Catalog>(en, { fr: loader } as unknown as LocaleLoaders<Catalog>);
    return { i18n, loader, release };
  }

  function expectFrenchWithOverride(t: (key: keyof Catalog) => string) {
    expect(t("greet")).toBe("Salut");
    expect(t("submit")).toBe("Envoyer");
    expect(t("cancel")).toBe("Annuler");
  }

  it("keeps the built-in dictionary under an override registered before loadLocale", async () => {
    const { i18n, loader, release } = setup();
    i18n.registerLocale("fr", { greet: "Salut" });
    release();
    expect(await i18n.loadLocale("fr")).toEqual({ ...fr, greet: "Salut" });
    expect(loader).toHaveBeenCalledOnce();
    expectFrenchWithOverride(i18n.createT("fr"));
  });

  it("keeps the built-in dictionary under an override registered after loadLocale", async () => {
    const { i18n, release } = setup();
    release();
    await i18n.loadLocale("fr");
    i18n.registerLocale("fr", { greet: "Salut" });
    expectFrenchWithOverride(i18n.createT("fr"));
  });

  it("keeps an override registered while the built-in chunk is in flight", async () => {
    const { i18n, release } = setup();
    const t = i18n.createT("fr");
    const loading = i18n.loadLocale("fr");
    i18n.registerLocale("fr", { greet: "Salut" });
    expect(t("greet")).toBe("Salut");
    expect(t("submit")).toBe("Send"); // English until the chunk lands
    release();
    await loading;
    expectFrenchWithOverride(t);
  });

  it("overrides a single English string", async () => {
    const { i18n, loader } = setup();
    i18n.registerLocale("en", { submit: "Post" });
    const t = i18n.createT("en");
    expect(t("submit")).toBe("Post");
    expect(t("greet")).toBe("Hello");
    expect(await i18n.loadLocale("en")).toEqual({ ...en, submit: "Post" });
    expect(loader).not.toHaveBeenCalled();
  });

  it("falls back to English for the keys a custom locale leaves out", async () => {
    const { i18n, loader } = setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    i18n.registerLocale("nl", { greet: "Hallo" });
    const t = i18n.createT("nl-BE");
    expect(t("greet")).toBe("Hallo");
    expect(t("submit")).toBe("Send");
    expect(await i18n.loadLocale("nl")).toEqual({ greet: "Hallo" });
    expect(await i18n.loadLocale("xx")).toBeNull();
    expect(loader).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("accumulates repeated registerLocale calls for the same code", async () => {
    const { i18n, release } = setup();
    i18n.registerLocale("fr", { greet: "Coucou" });
    i18n.registerLocale("fr_FR", { submit: "Valider" });
    i18n.registerLocale("fr", { greet: "Salut" });
    release();
    await i18n.loadLocale("fr");
    const t = i18n.createT("fr");
    expect(t("greet")).toBe("Salut");
    expect(t("submit")).toBe("Valider");
    expect(t("cancel")).toBe("Annuler");
  });

  it("treats an inherited key like `constructor` as an unknown code until registered", async () => {
    const { i18n, loader } = setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await i18n.loadLocale("constructor")).toBeNull();
    expect(i18n.createT("constructor")("greet")).toBe("Hello");
    expect(warn).toHaveBeenCalledOnce();

    i18n.registerLocale("constructor", { greet: "Yo" });
    expect(Object.hasOwn(Object, "greet")).toBe(false); // the global Object is untouched
    expect(i18n.createT("constructor")("greet")).toBe("Yo");
    expect(await i18n.loadLocale("constructor")).toEqual({ greet: "Yo" });
    expect(loader).not.toHaveBeenCalled();
  });
});

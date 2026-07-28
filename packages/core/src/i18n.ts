/**
 * Generic i18n machinery shared by the widget and the dashboard.
 *
 * Each package owns its `Translations` interface (their key sets differ) and
 * its locale dictionaries; everything else — locale normalization, the
 * custom-locale registry, lazy loading of built-ins, the translate-function
 * factory, interpolation — is identical and lives here once.
 *
 * The `loaders` map is typed `Record<Exclude<BuiltinLocale, "en">, …>`: the
 * moment a locale code is added to {@link BUILTIN_LOCALES}, every consuming
 * package fails to compile until its loader entry (and therefore its
 * dictionary file) exists. Adding a locale cannot silently fall back to
 * English anymore.
 */

import { BUILTIN_LOCALES, type BuiltinLocale } from "./types.js";

/**
 * Lazy dictionary loaders for every non-English built-in locale. Use static
 * `() => import("./xx.js").then((m) => m.xx)` thunks — bundlers keep
 * emitting one chunk per locale, and only the requested one ships.
 */
export type LocaleLoaders<T> = Record<Exclude<BuiltinLocale, "en">, () => Promise<T>>;

/** Translate function over the message catalog `T`. */
export type TranslateFunction<T> = (key: keyof T & string) => string;

/** The i18n API returned by {@link createI18n}. */
export interface I18n<T> {
  /**
   * Create a translation function for the given locale.
   *
   * Locale resolution: exact language match > English fallback, per key.
   * Non-English built-in locales are lazy-loaded via `loadLocale` — call
   * `await loadLocale(locale)` at init if you want the UI to render in the
   * target language immediately; until the dictionary lands, keys resolve
   * to English.
   */
  createT(locale: string): TranslateFunction<T>;
  /**
   * Dynamically import a built-in locale and register it. Returns the
   * loaded dictionary, or `null` if the locale isn't a known built-in.
   * Custom locales registered via `registerLocale` bypass this loader —
   * they are already in the registry (and are returned as registered, so a
   * partial custom dictionary comes back partial).
   */
  loadLocale(locale: string): Promise<Partial<T> | null>;
  /**
   * Register a custom locale at runtime. Partial dictionaries are welcome —
   * missing keys fall back to English per key, so overriding a single
   * string never requires copying the whole catalog.
   */
  registerLocale(code: string, translations: Partial<T>): void;
}

/** Normalise a BCP-47 tag down to the base language used for dictionary lookups. */
function normaliseLang(locale: string): string {
  return (locale.split("-")[0] ?? locale).toLowerCase();
}

/**
 * Build the i18n machinery for one message catalog.
 *
 * @param en — the complete English catalog, bundled synchronously as the fallback.
 * @param loaders — lazy import thunks for every other built-in locale.
 */
export function createI18n<T extends Record<keyof T & string, string>>(en: T, loaders: LocaleLoaders<T>): I18n<T> {
  const locales: Record<string, Partial<T>> = { en };

  function isBuiltinNonEn(lang: string): lang is Exclude<BuiltinLocale, "en"> {
    return lang !== "en" && (BUILTIN_LOCALES as readonly string[]).includes(lang);
  }

  return {
    registerLocale(code, translations) {
      locales[normaliseLang(code)] = translations;
    },

    async loadLocale(locale) {
      const lang = normaliseLang(locale);
      const cached = locales[lang];
      if (cached) return cached; // already loaded (en, custom, or previously fetched)
      if (!isBuiltinNonEn(lang)) return null;
      const dict = await loaders[lang]();
      locales[lang] = dict;
      return dict;
    },

    createT(locale) {
      const lang = normaliseLang(locale);
      if (lang !== "en" && !locales[lang] && !isBuiltinNonEn(lang)) {
        console.warn(`[siteping] Unknown locale "${locale}", falling back to "en"`);
      }
      // Read the registry at call time so the returned function picks up
      // dictionaries registered/loaded after it was created.
      return (key) => {
        const dict = locales[lang];
        return dict?.[key] ?? en[key] ?? key;
      };
    },
  };
}

/**
 * Interpolate `{paramName}` placeholders in a translated string with the
 * values from `params`. Stringifies numbers and booleans inline so callers
 * can pass `t("marker.count")` along with `{ count: 3 }` directly.
 *
 * Unknown placeholders are left as-is.
 */
export function interpolate(template: string, params: Readonly<Record<string, string | number | boolean>>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

/** Shorthand for `interpolate(t(key), params)` — key-checked against the catalog. */
export function tWithParams<K extends string>(
  t: (key: K) => string,
  key: K,
  params: Readonly<Record<string, string | number | boolean>>,
): string {
  return interpolate(t(key), params);
}

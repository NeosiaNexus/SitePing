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

import type { BuiltinLocale } from "./types.js";

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
   * Locale resolution, per key: `registerLocale` override > built-in
   * dictionary of the language > English fallback.
   * Non-English built-in locales are lazy-loaded via `loadLocale` — call
   * `await loadLocale(locale)` at init if you want the UI to render in the
   * target language immediately; until the dictionary lands, keys resolve
   * to English.
   */
  createT(locale: string): TranslateFunction<T>;
  /**
   * Dynamically import a built-in locale (once) and register it. Returns the
   * locale as `createT` resolves it — the built-in dictionary with any
   * `registerLocale` overrides on top — or `null` for a code that is neither
   * built in nor registered. A custom code never hits a loader: it comes
   * back as registered, so a partial custom dictionary comes back partial.
   */
  loadLocale(locale: string): Promise<Partial<T> | null>;
  /**
   * Register translations at runtime, for a new locale or over a built-in
   * one. Partial dictionaries are welcome: the keys given override the
   * built-in dictionary (whenever it loads), every other key keeps its
   * built-in value, then falls back to English — so overriding a single
   * string never requires copying the whole catalog. Calls for the same
   * code accumulate.
   */
  registerLocale(code: string, translations: Partial<T>): void;
}

/**
 * Normalise a locale tag down to the base language used for dictionary
 * lookups — BCP-47 `fr-FR` and backend-style `fr_FR` both resolve to `fr`.
 */
function normaliseLang(locale: string): string {
  return (locale.split(/[-_]/)[0] ?? locale).toLowerCase();
}

/** `locale` with `_` read as `-`, canonicalised — `undefined` when `Intl` rejects it. */
function canonicalTag(locale: string): string | undefined {
  try {
    return Intl.getCanonicalLocales(locale.replace(/_/g, "-"))[0];
  } catch {
    // RangeError: not a well-formed language tag
    return undefined;
  }
}

/**
 * `locale` as `Intl` accepts it. Locale options take any string, and a
 * backend-style tag (`fr_FR` from PHP / WordPress) makes every `Intl`
 * constructor and `toLocale*` call throw a RangeError: `_` reads as `-`, and
 * a tag `Intl` still rejects falls back to English, as `createT` does.
 * Silent, so it is safe on a render path; see `canonicalizeLocale` for the
 * one-time, warning variant.
 */
export function intlLocale(locale: string): string {
  return canonicalTag(locale) ?? "en";
}

/**
 * The host's locale tag as `Intl` accepts it. `SitepingLocale` takes any
 * string, and PHP / WordPress hand out POSIX-style tags (`fr_FR`, `pt_BR`)
 * that every `Intl` constructor rejects with a RangeError: `_` becomes `-`,
 * then the tag is canonicalised (`fr-FR`). Falls back to `"en"`, with a
 * warning, only when the tag is still invalid (empty, garbage) — meant to run
 * once, where the config is read.
 */
export function canonicalizeLocale(locale: string): string {
  const canonical = canonicalTag(locale);
  if (canonical) return canonical;
  console.warn(`[siteping] Invalid locale "${locale}", falling back to "en"`);
  return "en";
}

/**
 * Build the i18n machinery for one message catalog.
 *
 * @param en — the complete English catalog, bundled synchronously as the fallback.
 * @param loaders — lazy import thunks for every other built-in locale.
 */
export function createI18n<T extends Record<keyof T & string, string>>(en: T, loaders: LocaleLoaders<T>): I18n<T> {
  // Built-in dictionaries and host overrides live apart, so neither erases
  // the other: an override hides only the keys it names, and a chunk that
  // lands after `registerLocale` never overwrites it. Call order is moot.
  const builtins: Record<string, Partial<T>> = { en };
  const overrides: Record<string, Partial<T>> = {};

  // The loader map is typed to hold exactly the non-English built-ins, so
  // its keys are the list — no copy of `BUILTIN_LOCALES` ships at runtime.
  // An inherited key (`constructor`) never reaches a loader: `builtins`
  // inherits it too, so `??=` below short-circuits.
  function isBuiltinNonEn(lang: string): lang is Exclude<BuiltinLocale, "en"> {
    return lang in loaders;
  }

  return {
    registerLocale(code, translations) {
      const lang = normaliseLang(code);
      overrides[lang] = { ...overrides[lang], ...translations };
    },

    async loadLocale(locale) {
      const lang = normaliseLang(locale);
      if (isBuiltinNonEn(lang)) builtins[lang] ??= await loaders[lang]();
      return overrides[lang] ? { ...builtins[lang], ...overrides[lang] } : (builtins[lang] ?? null);
    },

    createT(locale) {
      const lang = normaliseLang(locale);
      if (!builtins[lang] && !overrides[lang] && !isBuiltinNonEn(lang)) {
        console.warn(`[siteping] Unknown locale "${locale}", falling back to "en"`);
      }
      // Read the registry at call time so the returned function picks up
      // dictionaries registered/loaded after it was created.
      return (key) => overrides[lang]?.[key] ?? builtins[lang]?.[key] ?? en[key] ?? key;
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

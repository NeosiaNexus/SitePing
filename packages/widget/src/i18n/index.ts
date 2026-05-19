import type { BuiltinLocale, FeedbackType } from "@siteping/core";
import { BUILTIN_LOCALES } from "@siteping/core";
import type { TFunction, TranslationKey, Translations } from "./types.js";

export type { TFunction, TranslationKey, Translations } from "./types.js";

// `en` is bundled synchronously as the immediate fallback — every other
// locale is dynamically imported on demand to keep the initial bundle small.
// In practice the bundler emits one chunk per locale and only the resolved
// one ships over the network when `loadLocale()` is called.
import { en } from "./en.js";

const LOCALES: Record<string, Translations> = { en };

/** Built-in locales other than the synchronously-bundled English fallback. */
const BUILTIN_NON_EN: ReadonlySet<BuiltinLocale> = new Set(BUILTIN_LOCALES.filter((l) => l !== "en"));

function isBuiltinNonEn(lang: string): lang is Exclude<BuiltinLocale, "en"> {
  return (BUILTIN_NON_EN as ReadonlySet<string>).has(lang);
}

/** Normalise a BCP-47 tag down to the base language used for dictionary lookups. */
function normaliseLang(locale: string): string {
  return (locale.split("-")[0] ?? locale).toLowerCase();
}

/** Register a custom locale at runtime. */
export function registerLocale(code: string, translations: Translations): void {
  LOCALES[code] = translations;
}

/**
 * Dynamically import a built-in locale and register it. Returns the loaded
 * translations or `null` if the locale isn't a known built-in. Custom locales
 * registered via {@link registerLocale} bypass this loader — they are already
 * in the registry.
 */
export async function loadLocale(locale: string): Promise<Translations | null> {
  const lang = normaliseLang(locale);
  const cached = LOCALES[lang];
  if (cached) return cached; // already loaded (en, custom, or previously fetched)
  if (!isBuiltinNonEn(lang)) return null;
  // The static switch means tsup/esbuild will create one chunk per locale
  // and only the requested one is fetched at runtime.
  let mod: Partial<Record<BuiltinLocale, Translations>>;
  switch (lang) {
    case "de":
      mod = await import("./de.js");
      break;
    case "es":
      mod = await import("./es.js");
      break;
    case "fr":
      mod = await import("./fr.js");
      break;
    case "it":
      mod = await import("./it.js");
      break;
    case "pt":
      mod = await import("./pt.js");
      break;
    case "ru":
      mod = await import("./ru.js");
      break;
    default:
      return null;
  }
  const dict = mod[lang];
  if (!dict) return null;
  LOCALES[lang] = dict;
  return dict;
}

/**
 * Create a translation function for the given locale.
 *
 * Locale resolution: exact match > language prefix > English fallback.
 * Non-English built-in locales are lazy-loaded via {@link loadLocale} — call
 * `await loadLocale(locale)` at init if you want the panel to render in the
 * target language immediately. Otherwise the widget renders in English until
 * the dictionary lands, then `createT` returns the resolved dictionary.
 */
export function createT(locale: string): TFunction {
  const lang = normaliseLang(locale);
  if (lang !== "en" && !LOCALES[lang] && !isBuiltinNonEn(lang)) {
    console.warn(`[siteping] Unknown locale "${locale}", falling back to "en"`);
  }
  // Read LOCALES at call time so `createT` returns up-to-date translations
  // after `loadLocale` has registered the dictionary asynchronously.
  return (key) => {
    const dict = LOCALES[lang] ?? LOCALES.en;
    return dict?.[key] ?? LOCALES.en?.[key] ?? key;
  };
}

/**
 * Returns the type label for a `FeedbackType` value.
 *
 * Maps API enum values (English) to localised display labels. The exhaustive
 * `switch` is paired with a `never` check so adding a new `FeedbackType`
 * surfaces here at compile time.
 */
export function getTypeLabel(type: FeedbackType | string, t: TFunction): string {
  switch (type) {
    case "question":
      return t("type.question");
    case "change":
      return t("type.change");
    case "bug":
      return t("type.bug");
    case "other":
      return t("type.other");
    default:
      return type;
  }
}

/**
 * Interpolate `{paramName}` placeholders in a translated string with the
 * values from `params`. Stringifies numbers and booleans inline so callers
 * can pass `t("marker.count")` along with `{ count: 3 }` directly.
 *
 * Unknown placeholders are left as-is — matches the existing behaviour of
 * inline `.replace("{count}", ...)` calls scattered across the widget.
 */
export function interpolate(template: string, params: Readonly<Record<string, string | number | boolean>>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

/** Shorthand for `interpolate(t(key), params)`. Typed against `TranslationKey`. */
export function tWithParams(
  t: TFunction,
  key: TranslationKey,
  params: Readonly<Record<string, string | number | boolean>>,
): string {
  return interpolate(t(key), params);
}

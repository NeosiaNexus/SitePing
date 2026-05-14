import type { TFunction, Translations } from "./types.js";

export type { TFunction, Translations } from "./types.js";

// `en` is bundled synchronously as the immediate fallback — every other
// locale is dynamically imported on demand to keep the initial bundle small.
// In practice the bundler emits one chunk per locale and only the resolved
// one ships over the network when `loadLocale()` is called.
import { en } from "./en.js";

const LOCALES: Record<string, Translations> = { en };

/** Built-in locales other than the synchronously-bundled English fallback. */
const BUILTIN_LOCALES = new Set(["de", "es", "fr", "it", "pt", "ru"]);

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
  const lang = (locale.split("-")[0] ?? locale).toLowerCase();
  if (LOCALES[lang]) return LOCALES[lang]; // already loaded (en, custom, or previously fetched)
  if (!BUILTIN_LOCALES.has(lang)) return null;
  // The static template means tsup/esbuild will create one chunk per locale
  // and only the requested one is fetched at runtime.
  let mod: { [k: string]: Translations };
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
  const lang = (locale.split("-")[0] ?? locale).toLowerCase();
  if (lang !== "en" && !LOCALES[lang] && !BUILTIN_LOCALES.has(lang)) {
    console.warn(`[siteping] Unknown locale "${locale}", falling back to "en"`);
  }
  // Read LOCALES at call time so `createT` returns up-to-date translations
  // after `loadLocale` has registered the dictionary asynchronously.
  return (key) => {
    const dict = LOCALES[lang] ?? LOCALES.en ?? ({} as Translations);
    return dict[key] ?? LOCALES.en?.[key] ?? key;
  };
}

/**
 * Returns the type label for a FeedbackType value.
 * Maps API enum values (english) to localized display labels.
 */
export function getTypeLabel(type: string, t: TFunction): string {
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

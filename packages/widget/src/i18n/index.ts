import type { FeedbackStatus, FeedbackType } from "@siteping/core";
import { tWithParams as coreTWithParams, createI18n, interpolate } from "@siteping/core";
import type { TFunction, TranslationKey, Translations } from "./types.js";

export type { TFunction, TranslationKey, Translations } from "./types.js";
export { interpolate };

// `en` is bundled synchronously as the immediate fallback — every other
// locale is a static import() thunk, so the bundler emits one chunk per
// locale and only the resolved one ships over the network when
// `loadLocale()` is called.
//
// The loader map is typed against core's BUILTIN_LOCALES: adding a locale
// code there is a compile error here until the dictionary + loader exist.
import { en } from "./en.js";

const i18n = createI18n<Translations>(en, {
  de: () => import("./de.js").then((m) => m.de),
  es: () => import("./es.js").then((m) => m.es),
  fr: () => import("./fr.js").then((m) => m.fr),
  it: () => import("./it.js").then((m) => m.it),
  pt: () => import("./pt.js").then((m) => m.pt),
  ru: () => import("./ru.js").then((m) => m.ru),
});

/**
 * Register a custom locale at runtime. Partial dictionaries are welcome —
 * missing keys fall back to English per key, so overriding a single string
 * never requires copying the whole catalog.
 */
export const registerLocale: (code: string, translations: Partial<Translations>) => void = i18n.registerLocale;

/**
 * Dynamically import a built-in locale and register it. Returns the loaded
 * translations or `null` if the locale isn't a known built-in. Custom
 * locales registered via {@link registerLocale} bypass this loader.
 */
export const loadLocale: (locale: string) => Promise<Partial<Translations> | null> = i18n.loadLocale;

/**
 * Create a translation function for the given locale.
 *
 * Locale resolution: exact match > language prefix > English fallback.
 * Non-English built-in locales are lazy-loaded via {@link loadLocale} — call
 * `await loadLocale(locale)` at init if you want the panel to render in the
 * target language immediately. Otherwise the widget renders in English until
 * the dictionary lands, then `createT` returns the resolved dictionary.
 */
export const createT: (locale: string) => TFunction = i18n.createT;

/** Shorthand for `interpolate(t(key), params)`. Typed against `TranslationKey`. */
export const tWithParams: (
  t: TFunction,
  key: TranslationKey,
  params: Readonly<Record<string, string | number | boolean>>,
) => string = coreTWithParams;

/**
 * Returns the type label for a `FeedbackType` value.
 *
 * Maps API enum values (English) to localised display labels. Unknown
 * values fall through and render raw instead of crashing.
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
 * Returns the status label for a `FeedbackStatus` value.
 *
 * Maps API enum values (English) to localised display labels. Unknown
 * values fall through and render raw instead of crashing.
 */
export function getStatusLabel(status: FeedbackStatus | string, t: TFunction): string {
  switch (status) {
    case "open":
      return t("panel.statusOpen");
    case "in_progress":
      return t("panel.statusInProgress");
    case "resolved":
      return t("panel.statusResolved");
    case "wont_fix":
      return t("panel.statusWontFix");
    default:
      return status;
  }
}

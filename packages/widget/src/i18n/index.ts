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
  ja: () => import("./ja.js").then((m) => m.ja),
  ko: () => import("./ko.js").then((m) => m.ko),
  pt: () => import("./pt.js").then((m) => m.pt),
  ru: () => import("./ru.js").then((m) => m.ru),
});

/**
 * Register translations at runtime, for a new locale or over a built-in one —
 * call it before `initSiteping`. Partial dictionaries are welcome: under a
 * built-in code (`registerLocale("fr", { "fab.annotate": "Commenter" })`) the
 * keys given override the built-in dictionary and every other key keeps its
 * built-in value; elsewhere missing keys fall back to English per key. So
 * overriding a single string never requires copying the whole catalog.
 * Calls for the same code accumulate.
 */
export const registerLocale: (code: string, translations: Partial<Translations>) => void = i18n.registerLocale;

/**
 * Dynamically import a built-in locale (once) and register it. Returns the
 * locale as the widget resolves it — the built-in dictionary with any
 * {@link registerLocale} overrides on top — or `null` for a code that is
 * neither built in nor registered. A custom code never hits a loader.
 */
export const loadLocale: (locale: string) => Promise<Partial<Translations> | null> = i18n.loadLocale;

/**
 * Create a translation function for the given locale.
 *
 * Locale resolution, per key: {@link registerLocale} override > built-in
 * dictionary of the language (`fr-CA` reads `fr`) > English fallback.
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

import type { FeedbackStatus, FeedbackType } from "@siteping/core";
import {
  tWithParams as coreTWithParams,
  createI18n,
  FEEDBACK_STATUSES,
  FEEDBACK_TYPES,
  interpolate,
} from "@siteping/core";
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
 * call it before the inbox mounts. Partial dictionaries are welcome: under a
 * built-in code (`registerLocale("fr", { "status.open": "À traiter" })`) the
 * keys given override the built-in dictionary and every other key keeps its
 * built-in value; elsewhere missing keys fall back to English per key. So
 * overriding a single string never requires copying the whole catalog.
 * Calls for the same code accumulate.
 */
export const registerLocale: (code: string, translations: Partial<Translations>) => void = i18n.registerLocale;

/**
 * Dynamically import a built-in locale (once) and register it. Returns the
 * locale as the inbox resolves it — the built-in dictionary with any
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
 * `await loadLocale(locale)` at init if you want the inbox to render in the
 * target language immediately. Otherwise it renders in English until the
 * dictionary lands, then `createT` returns the resolved dictionary.
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
 * Maps API enum values (English) to their `type.*` display label — a type
 * added to core without one fails to compile here. Unknown values fall
 * through and render raw instead of crashing.
 */
export function getTypeLabel(type: FeedbackType | string, t: TFunction): string {
  return FEEDBACK_TYPES.includes(type as FeedbackType) ? t(`type.${type as FeedbackType}`) : type;
}

/**
 * Returns the status label for a `FeedbackStatus` value or the `"all"`
 * pseudo-status used by the filter tabs.
 *
 * Maps API enum values (English) to their `status.*` display label — a
 * status added to core without one fails to compile here. Unknown values
 * fall through and render raw instead of crashing.
 */
export function getStatusLabel(status: FeedbackStatus | "all" | string, t: TFunction): string {
  return status === "all" || FEEDBACK_STATUSES.includes(status as FeedbackStatus)
    ? t(`status.${status as FeedbackStatus | "all"}`)
    : status;
}

import type { TFunction, Translations } from "./types.js";

export type { TFunction, Translations } from "./types.js";

// Static imports — bundler (tsup) will include them all.
// For tree-shaking in consumer apps, use dynamic import() with a bundler plugin.
import { de } from "./de.js";
import { en } from "./en.js";
import { es } from "./es.js";
import { fr } from "./fr.js";
import { it } from "./it.js";
import { pt } from "./pt.js";
import { ru } from "./ru.js";

const LOCALES: Record<string, Translations> = { de, en, es, fr, it, pt, ru };

/** Register a custom locale at runtime. */
export function registerLocale(code: string, translations: Translations): void {
  LOCALES[code] = translations;
}

/**
 * Create a translation function for the given locale.
 *
 * Locale resolution: exact match > language prefix > English fallback.
 */
export function createT(locale: string): TFunction {
  const lang = (locale.split("-")[0] ?? locale).toLowerCase();
  if (!LOCALES[lang]) {
    console.warn(`[siteping] Unknown locale "${locale}", falling back to "en"`);
  }
  const dict = LOCALES[lang] ?? LOCALES.en ?? ({} as Translations);
  return (key) => dict[key] ?? key;
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

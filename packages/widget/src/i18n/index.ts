import type { TFunction, Translations } from "./types.js";

export type { TFunction, Translations } from "./types.js";

// Static imports — bundler (tsup) will include both.
// For tree-shaking in consumer apps, use dynamic import() with a bundler plugin.
import { en } from "./en.js";
import { fr } from "./fr.js";

const LOCALES: Record<string, Translations> = { fr, en };

/**
 * Create a translation function for the given locale.
 *
 * Locale resolution: exact match > language prefix > French fallback.
 */
export function createT(locale: string): TFunction {
  const lang = locale.split("-")[0].toLowerCase();
  const dict = LOCALES[lang] ?? LOCALES.fr;
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

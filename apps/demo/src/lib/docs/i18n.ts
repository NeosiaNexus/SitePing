import { defineI18n } from "fumadocs-core/i18n";

export const i18n = defineI18n({
  defaultLanguage: "en",
  languages: ["en", "fr"],
  // English URLs stay bare (/docs/...), French is prefixed (/fr/docs/...).
  hideLocale: "default-locale",
  // Pages without a .fr.mdx twin still appear in the French tree, in English.
  fallbackLanguage: "en",
});

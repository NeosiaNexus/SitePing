import { BUILTIN_LOCALES } from "@siteping/core";
import { loadLocale } from "../src/i18n/index.js";

// Every built-in locale is lazy-loaded in production. Tests call `t(key)`
// synchronously, so resolve the whole registry once here — driven by
// BUILTIN_LOCALES, so a new locale needs no edit to this file.
await Promise.all(BUILTIN_LOCALES.map((locale) => loadLocale(locale)));

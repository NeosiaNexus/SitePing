import { describe, expect, it } from "vitest";
import { de } from "../../src/i18n/de.js";
import { en } from "../../src/i18n/en.js";
import { es } from "../../src/i18n/es.js";
import { fr } from "../../src/i18n/fr.js";
import { createT, getTypeLabel } from "../../src/i18n/index.js";
import { it as italian } from "../../src/i18n/it.js";
import { pt } from "../../src/i18n/pt.js";
import { ru } from "../../src/i18n/ru.js";

// ---------------------------------------------------------------------------
// createT — locale resolution
// ---------------------------------------------------------------------------

describe("createT", () => {
  it("returns French translations for 'fr'", () => {
    const t = createT("fr");
    expect(t("panel.title")).toBe("Feedbacks");
    expect(t("panel.close")).toBe("Fermer le panneau");
    expect(t("popup.submit")).toBe("Envoyer");
  });

  it("returns English translations for 'en'", () => {
    const t = createT("en");
    expect(t("panel.title")).toBe("Feedbacks");
    expect(t("panel.close")).toBe("Close panel");
    expect(t("popup.submit")).toBe("Send");
  });

  it("returns Spanish translations for 'es' and 'es-MX'", () => {
    const t = createT("es-MX");
    expect(t("panel.close")).toBe("Cerrar panel");
    expect(t("popup.submit")).toBe("Enviar");
    expect(t("type.question")).toBe("Pregunta");
  });

  it("returns Russian translations for 'ru'", () => {
    const t = createT("ru");
    expect(t("panel.title")).toBe("Обратная связь");
    expect(t("panel.close")).toBe("Закрыть панель");
    expect(t("popup.submit")).toBe("Отправить");
  });

  it("returns German translations for 'de' and 'de-DE'", () => {
    const t = createT("de-DE");
    expect(t("panel.close")).toBe("Panel schließen");
    expect(t("popup.submit")).toBe("Senden");
    expect(t("type.question")).toBe("Frage");
  });

  it("returns Italian translations for 'it' and 'it-IT'", () => {
    const t = createT("it-IT");
    expect(t("panel.close")).toBe("Chiudi pannello");
    expect(t("popup.submit")).toBe("Invia");
    expect(t("type.question")).toBe("Domanda");
  });

  it("returns Brazilian Portuguese translations for 'pt' and 'pt-BR'", () => {
    const t = createT("pt-BR");
    expect(t("panel.close")).toBe("Fechar painel");
    expect(t("popup.submit")).toBe("Enviar");
    expect(t("type.question")).toBe("Pergunta");
  });

  it("resolves language prefix from full locale tag (e.g. 'fr-FR')", () => {
    const t = createT("fr-FR");
    expect(t("panel.close")).toBe("Fermer le panneau");
  });

  it("resolves language prefix from full locale tag (e.g. 'en-US')", () => {
    const t = createT("en-US");
    expect(t("panel.close")).toBe("Close panel");
  });

  it("falls back to English for unknown locale", () => {
    const t = createT("zz");
    expect(t("panel.close")).toBe("Close panel");
  });

  it("falls back to English for empty string locale", () => {
    const t = createT("");
    expect(t("panel.close")).toBe("Close panel");
  });

  it("is case-insensitive for locale prefix", () => {
    const t = createT("EN");
    expect(t("panel.close")).toBe("Close panel");
  });

  it("returns the key itself for a missing translation key", () => {
    const t = createT("fr");
    // Force a key that doesn't exist (the type system prevents this normally,
    // but we test runtime safety)
    const result = (t as (key: string) => string)("nonexistent.key");
    expect(result).toBe("nonexistent.key");
  });
});

// ---------------------------------------------------------------------------
// getTypeLabel — maps FeedbackType to localized label
// ---------------------------------------------------------------------------

describe("getTypeLabel", () => {
  it("returns correct French labels for each type", () => {
    const t = createT("fr");
    expect(getTypeLabel("question", t)).toBe("Question");
    expect(getTypeLabel("change", t)).toBe("Changement");
    expect(getTypeLabel("bug", t)).toBe("Bug");
    expect(getTypeLabel("other", t)).toBe("Autre");
  });

  it("returns correct English labels for each type", () => {
    const t = createT("en");
    expect(getTypeLabel("question", t)).toBe("Question");
    expect(getTypeLabel("change", t)).toBe("Change");
    expect(getTypeLabel("bug", t)).toBe("Bug");
    expect(getTypeLabel("other", t)).toBe("Other");
  });

  it("returns the raw type string for unknown types", () => {
    const t = createT("fr");
    expect(getTypeLabel("unknown-type", t)).toBe("unknown-type");
  });
});

// ---------------------------------------------------------------------------
// Translation completeness — en.ts and fr.ts must have the same keys
// ---------------------------------------------------------------------------

describe("translation completeness", () => {
  const enKeys = Object.keys(en).sort();
  const deKeys = Object.keys(de).sort();
  const esKeys = Object.keys(es).sort();
  const frKeys = Object.keys(fr).sort();
  const itKeys = Object.keys(italian).sort();
  const ptKeys = Object.keys(pt).sort();
  const ruKeys = Object.keys(ru).sort();

  it("en.ts and fr.ts have the same set of keys", () => {
    expect(enKeys).toEqual(frKeys);
  });

  it("en.ts and de.ts have the same set of keys", () => {
    expect(enKeys).toEqual(deKeys);
  });

  it("en.ts and es.ts have the same set of keys", () => {
    expect(enKeys).toEqual(esKeys);
  });

  it("en.ts and it.ts have the same set of keys", () => {
    expect(enKeys).toEqual(itKeys);
  });

  it("en.ts and pt.ts have the same set of keys", () => {
    expect(enKeys).toEqual(ptKeys);
  });

  it("en.ts and ru.ts have the same set of keys", () => {
    expect(enKeys).toEqual(ruKeys);
  });

  it("no translation value is an empty string in fr.ts", () => {
    for (const [key, value] of Object.entries(fr)) {
      expect(value, `fr.ts key "${key}" is empty`).not.toBe("");
    }
  });

  it("no translation value is an empty string in de.ts", () => {
    for (const [key, value] of Object.entries(de)) {
      expect(value, `de.ts key "${key}" is empty`).not.toBe("");
    }
  });

  it("no translation value is an empty string in es.ts", () => {
    for (const [key, value] of Object.entries(es)) {
      expect(value, `es.ts key "${key}" is empty`).not.toBe("");
    }
  });

  it("no translation value is an empty string in en.ts", () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value, `en.ts key "${key}" is empty`).not.toBe("");
    }
  });

  it("no translation value is an empty string in it.ts", () => {
    for (const [key, value] of Object.entries(italian)) {
      expect(value, `it.ts key "${key}" is empty`).not.toBe("");
    }
  });

  it("no translation value is an empty string in pt.ts", () => {
    for (const [key, value] of Object.entries(pt)) {
      expect(value, `pt.ts key "${key}" is empty`).not.toBe("");
    }
  });

  it("no translation value is an empty string in ru.ts", () => {
    for (const [key, value] of Object.entries(ru)) {
      expect(value, `ru.ts key "${key}" is empty`).not.toBe("");
    }
  });

  it("all keys in en.ts exist in fr.ts", () => {
    for (const key of enKeys) {
      expect(fr).toHaveProperty(key);
    }
  });

  it("all keys in en.ts exist in es.ts", () => {
    for (const key of enKeys) {
      expect(es).toHaveProperty(key);
    }
  });

  it("all keys in fr.ts exist in en.ts", () => {
    for (const key of frKeys) {
      expect(en).toHaveProperty(key);
    }
  });

  it("all keys in en.ts exist in de.ts", () => {
    for (const key of enKeys) {
      expect(de).toHaveProperty(key);
    }
  });

  it("all keys in en.ts exist in it.ts", () => {
    for (const key of enKeys) {
      expect(italian).toHaveProperty(key);
    }
  });

  it("all keys in en.ts exist in pt.ts", () => {
    for (const key of enKeys) {
      expect(pt).toHaveProperty(key);
    }
  });

  it("all keys in en.ts exist in ru.ts", () => {
    for (const key of enKeys) {
      expect(ru).toHaveProperty(key);
    }
  });
});

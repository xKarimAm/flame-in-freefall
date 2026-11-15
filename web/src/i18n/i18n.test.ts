// Generated with Muse Spark, SI-assisted.
// Tests for contracts/I18N.md: every <locale>.json loads, no locale has keys en lacks,
// chrome text falls back (requested locale, en, then the key). Beat-text order lives in text.test.ts.
import { describe, expect, it } from "vitest";
import { dicts, makeT } from "./index";
import type { Locale } from "../contract";

const BEAT_KEY = "story.moon-air.moon-air-main.compare.public"; // never translated: scripts/translate.py scope is ui.* + titles

describe("i18n dictionaries", () => {
  it("loads every <locale>.json in the folder except .meta.json", () => {
    expect(Object.keys(dicts)).toContain("en");
    expect(dicts.en).toBeTruthy();
    for (const k of Object.keys(dicts)) expect(k).toMatch(/^[a-z]{2}$/);
  });

  it("no locale has keys that en lacks", () => {
    const enKeys = new Set(Object.keys(dicts.en!));
    for (const [locale, d] of Object.entries(dicts)) {
      if (locale === "en") continue;
      for (const k of Object.keys(d!)) expect(enKeys.has(k), `${locale} has ${k}`).toBe(true);
    }
  });

  it("beat text stays English in every locale", () => {
    for (const locale of Object.keys(dicts)) {
      if (locale === "en") continue;
      expect(dicts[locale as Locale]![BEAT_KEY]).toBeUndefined();
    }
    expect(dicts.en![BEAT_KEY]).toBeTypeOf("string");
  });

  it("chrome text falls back from the locale to en, then to the key", () => {
    for (const locale of Object.keys(dicts) as Locale[]) {
      const t = makeT(() => locale);
      for (const key of ["ui.chrome.brand", "ui.panel.answer"]) expect(t(key)).toBe(dicts[locale]![key] ?? dicts.en![key]);
      expect(t(BEAT_KEY)).toBe(dicts.en![BEAT_KEY]);
    }
    expect(makeT(() => "en")("no.such.key")).toBe("no.such.key");
  });
});

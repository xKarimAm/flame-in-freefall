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

  it("the chart labels name the recorded-air subset, never every test (task 30)", () => {
    // the planes draw 986 of 1,883 tests: only the ones with the air recorded
    expect(dicts.en!["ui.stage.tilt.micro"]).toBe("NASA tests with the air recorded");
    expect(dicts.en!["ui.stage.microg-plane"]).toContain("air recorded");
    expect(dicts.en!["ui.stage.microg-plane"]).not.toMatch(/every/i);
  });

  it("no string reintroduces the every-test chart claim (task 30 audit)", () => {
    const banned = ["Every NASA test so far", "where every NASA PSI fire test ran"];
    for (const [key, value] of Object.entries(dicts.en!)) {
      for (const old of banned) expect(value, key).not.toContain(old);
    }
  });

  it("no string claims no Moon-gravity test ever ran (task 31 audit, R1)", () => {
    // lunar_margins reports materials measured in lunar gravity: scope every such
    // sentence to the PSI archive
    const banned = ["No fire test has run", "Nobody has lit", "No test ran in"];
    for (const [key, value] of Object.entries(dicts.en!)) {
      for (const old of banned) expect(value, key).not.toContain(old);
    }
  });

  it("corrected sentences fall back to English, never a hand translation (R15)", () => {
    // R6 and R3 corrected these sentences in English; the old translations
    // inferred (flow-terminated) or mis-scoped (dial-noair), so both keys are
    // deleted from the locales and fall back to the English text
    for (const locale of ["es", "hi"] as Locale[]) {
      expect(dicts[locale]!["ui.outcome.flow-terminated"]).toBeUndefined();
      expect(dicts[locale]!["ui.stage.dial-noair"]).toBeUndefined();
      for (const value of Object.values(dicts[locale]!)) expect(value).not.toContain("Seguía ardiendo");
    }
    expect(makeT(() => "es")("ui.outcome.flow-terminated")).toBe("Flow was terminated (as recorded)");
    expect(makeT(() => "hi")("ui.stage.dial-noair")).toBe("is outside every air marked on this dial.");
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

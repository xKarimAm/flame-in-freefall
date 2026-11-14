// Generated with Claude, SI-assisted
import { describe, expect, it } from "vitest";
import { resolveText } from "./text";

const keys = { public: "k.pub", astronaut: "k.astro" };

describe("resolveText fallback order (contracts/I18N.md)", () => {
  it("1: requested locale + requested lens", () => {
    const d = { es: { "k.astro": "es astro", "k.pub": "es pub" }, en: { "k.astro": "en astro", "k.pub": "en pub" } };
    expect(resolveText(d, keys, "astronaut", "es")).toBe("es astro");
  });
  it("2: en + same lens, before the locale's public text", () => {
    const d = { es: { "k.pub": "es pub" }, en: { "k.astro": "en astro", "k.pub": "en pub" } };
    expect(resolveText(d, keys, "astronaut", "es")).toBe("en astro");
  });
  it("3: requested locale + public, before en public", () => {
    const d = { es: { "k.pub": "es pub" }, en: { "k.pub": "en pub" } };
    expect(resolveText(d, keys, "astronaut", "es")).toBe("es pub");
  });
  it("4: en + public", () => {
    expect(resolveText({ en: { "k.pub": "en pub" } }, keys, "astronaut", "es")).toBe("en pub");
  });
  it("returns the public key when nothing is found", () => {
    expect(resolveText({ en: {} }, keys, "astronaut", "es")).toBe("k.pub");
  });
  it("a lens without a key uses the public key", () => {
    const d = { en: { "k.pub": "en pub", "k.astro": "en astro" } };
    expect(resolveText(d, keys, "analyst", "en")).toBe("en pub");
    expect(resolveText(d, keys, "public", "en")).toBe("en pub");
  });
});

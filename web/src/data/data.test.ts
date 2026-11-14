import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  DATA_URL_BASE,
  parseExperiments,
  parseIncidents,
  parseMoon,
  parseTests,
} from "./index";

function golden(name: string): unknown {
  const url = new URL(`../../../contracts/golden/${name}`, import.meta.url);
  return JSON.parse(readFileSync(fileURLToPath(url), "utf8"));
}

function curated(name: string): unknown {
  const url = new URL(`../../../data/curated/${name}`, import.meta.url);
  return JSON.parse(readFileSync(fileURLToPath(url), "utf8"));
}

describe("data loader", () => {
  it("exposes a single base path for all data files", () => {
    expect(typeof DATA_URL_BASE).toBe("string");
    expect(DATA_URL_BASE.length).toBeGreaterThan(0);
  });

  it("parses golden experiments with traceable sources", () => {
    const exps = parseExperiments(golden("experiments.json"));
    expect(exps.length).toBeGreaterThan(0);
    for (const e of exps) {
      expect(e.psi_url).toMatch(/^https?:\/\//);
      if (e.o2_pct_range) {
        const [lo, hi] = e.o2_pct_range;
        expect(lo).toBeGreaterThanOrEqual(0);
        expect(hi).toBeLessThanOrEqual(100);
        expect(lo).toBeLessThanOrEqual(hi);
      }
    }
  });

  it("parses golden tests with units in range and source rows", () => {
    const tests = parseTests(golden("tests.json"));
    expect(tests.length).toBeGreaterThan(0);
    for (const t of tests) {
      if (t.o2_pct !== null) {
        expect(t.o2_pct).toBeGreaterThanOrEqual(0);
        expect(t.o2_pct).toBeLessThanOrEqual(100);
      }
      if (t.pressure_kpa !== null) {
        expect(t.pressure_kpa).toBeGreaterThanOrEqual(0);
        expect(t.pressure_kpa).toBeLessThanOrEqual(400);
      }
      expect(t.source.file.length).toBeGreaterThan(0);
      expect(t.source.row).toBeGreaterThanOrEqual(1);
      expect(t.source.url).toMatch(/^https?:\/\//);
    }
  });

  it("parses curated moon facts without inventing numbers", () => {
    const moon = parseMoon(curated("moon.json"));
    const heo = moon.atmospheres.find((a) => a.pressure_kpa === 56.5);
    expect(heo).toBeDefined();
    expect(heo!.o2_pct_min).toBe(33.7);
    expect(heo!.o2_pct_max).toBe(40);
    for (const a of moon.atmospheres) {
      expect(a.url).toMatch(/^https?:\/\//);
    }
  });

  it("parses curated incidents with source links", () => {
    const inc = parseIncidents(curated("incidents.json"));
    expect(inc.incidents.length).toBeGreaterThan(0);
    for (const i of inc.incidents) {
      expect(i.url).toMatch(/^https?:\/\//);
    }
    expect(inc.pattern.url).toMatch(/^https?:\/\//);
  });

  it("rejects malformed payloads instead of guessing", () => {
    expect(() => parseExperiments(null)).toThrow();
    expect(() => parseTests({})).toThrow();
    expect(() => parseMoon([])).toThrow();
    expect(() => parseIncidents(null)).toThrow();
  });
});

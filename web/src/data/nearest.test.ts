// Tests for the DataApi and the nearest-tests distance (contracts/DISTANCE.md).
// Generated with Claude, SI-assisted.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createDataApi, nearestTests, parseExperiments, parseIncidents, parseMoon, parseTests } from "./index";
import type { Atmosphere, AppData, Experiment, PlacedTest } from "../contract";

const read = (rel: string): unknown => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));
const tests = parseTests(read("../../../contracts/golden/tests.json"));
const moon = parseMoon(read("../../../data/curated/moon.json"));
const incidents = parseIncidents(read("../../../data/curated/incidents.json"));
const goldenExperiments = parseExperiments(read("../../../contracts/golden/experiments.json"));

// The golden experiments file only has PSI-98; PSI-69 (droplets) and PSI-159 (gas jets) are minimal fixtures.
const fixture = (id: string, family: Experiment["family"]): Experiment => ({
  id, acronym: id, title: id, family, doi: null, psi_url: `https://psi.nasa.gov/${id}`, license: "test fixture",
  objective: "", test_count: 1, has_outcomes: true, publications: [],
});
const experiments = [...goldenExperiments, fixture("PSI-69", "droplets"), fixture("PSI-159", "gas jets")];
const data: AppData = { experiments, tests, moon, incidents };
const api = createDataApi(data);

const row = (id: string) => tests.find((t) => t.id === id)!;
const heo = moon.atmospheres.find((a) => a.id === "heo-dm-1006")!;

describe("placed / notPlaced / coverage", () => {
  it("places micro-g tests with O2 and pressure; sorted by id; url is the source url", () => {
    expect(api.placed().map((p) => p.id)).toEqual(["PSI-159#1", "PSI-69#2"]);
    expect(api.placed()[1]!.url).toBe(row("PSI-69#2").source.url);
    expect(api.placed()[1]!.family).toBe("droplets");
    expect(api.placed()).toBe(api.placed()); // cached: same array
  });

  // DISTANCE case 3: PSI-98#1 has pressure null, so it is not drawn and not a nearest result.
  it("keeps PSI-98#1 (pressure null) out of placed and nearest, and lists it as not placed", () => {
    expect(row("PSI-98#1").pressure_kpa).toBeNull();
    expect(api.placed().some((p) => p.id === "PSI-98#1")).toBe(false);
    const all = api.nearest({ kind: "atmosphere", id: "heo-dm-1006" }, 100);
    expect(all.rows.some((r) => r.id === "PSI-98#1")).toBe(false);
    const np = api.notPlaced();
    expect(np).toHaveLength(1);
    expect(np[0]).toMatchObject({ id: "PSI-98#1", reason: "no pressure recorded", family: goldenExperiments.find((e) => e.id === "PSI-98")!.family });
    expect(api.notPlaced("droplets")).toEqual([]);
  });

  it("coverage is placed length of total tests", () => {
    expect(api.coverage()).toEqual({ plotted: 2, total: tests.length });
  });

  it("gives every reason in words", () => {
    const base = row("PSI-69#2");
    const mk = (id: string, patch: object) => ({ ...base, id, ...patch });
    const a = createDataApi({
      ...data,
      tests: [
        mk("x1", { gravity: "1-g" }),
        mk("x2", { o2_pct: null }),
        mk("x3", { pressure_kpa: null, o2_pct: null }),
        mk("x4", { investigation: "PSI-999" }),
      ] as AppData["tests"],
    });
    expect(a.placed()).toEqual([]);
    expect(Object.fromEntries(a.notPlaced().map((r) => [r.id, r.reason]))).toEqual({
      x1: "not microgravity",
      x2: "no oxygen recorded",
      x3: "no oxygen or pressure recorded",
      x4: "investigation not in experiments.json",
    });
  });
});

describe("nearest", () => {
  // DISTANCE case 1: the query is the pressure and O2 of PSI-69#2, read from the row, so its d is 0:
  // sqrt(((p - p)/25)^2 + ((o - o)/5)^2) = sqrt(0 + 0) = 0. PSI-159#1 is farther, so PSI-69#2 is first.
  it("a point query equal to PSI-69#2 gives that row first with d = 0", () => {
    const g = row("PSI-69#2");
    const res = api.nearest({ kind: "point", pressure_kpa: g.pressure_kpa!, o2_pct: g.o2_pct! });
    expect(res.rows[0]!.id).toBe("PSI-69#2");
    expect(res.rows[0]!.d).toBe(0);
    expect(res.rows[1]!.d).toBeGreaterThan(0);
  });

  // DISTANCE case 2: Moon box heo-dm-1006: p = 56.5, band 33.7-40. PSI-159#1 has O2 39.39 (inside the band,
  // O2 term 0) and p_t = 94.44, so d = |56.5 - 94.44| / 25 = 37.94 / 25 = 1.5176 -> 1.518.
  it("Moon box query ranks PSI-159#1 with d = 1.518", () => {
    const g = row("PSI-159#1");
    expect(g.o2_pct!).toBeGreaterThanOrEqual(heo.o2_pct_min);
    expect(g.o2_pct!).toBeLessThanOrEqual(heo.o2_pct_max!);
    const expected = Math.round((Math.abs(heo.pressure_kpa - g.pressure_kpa!) / 25) * 1000) / 1000;
    const res = api.nearest({ kind: "atmosphere", id: "heo-dm-1006" });
    expect(res.rows[0]!.id).toBe("PSI-159#1");
    expect(res.rows[0]!.d).toBe(expected);
    expect(res.rows[0]!.d).toBe(1.518);
  });

  // PSI-69#2 vs the Moon box: O2 21 is below 33.7, gap 12.7 -> 12.7/5 = 2.54; dp = (101.59 - 56.5)/25 = 1.8036;
  // d = sqrt(2.54^2 + 1.8036^2) = sqrt(6.4516 + 3.2530) = 3.115.
  it("adds the O2 gap below the band", () => {
    const res = api.nearest({ kind: "atmosphere", id: "heo-dm-1006" });
    expect(res.rows.map((r) => r.id)).toEqual(["PSI-159#1", "PSI-69#2"]);
    expect(res.rows[1]!.d).toBe(3.115);
  });

  // ppo2 = 94.44 * 39.39 / 100 = 37.2 (37.199...); 101.59 * 21 / 100 = 21.3 (21.33).
  it("computes ppo2_kpa to 1 dp and a family mix, and keeps gravity micro-g", () => {
    const res = api.nearest({ kind: "atmosphere", id: "heo-dm-1006" });
    expect(res.rows.map((r) => r.ppo2_kpa)).toEqual([37.2, 21.3]);
    expect(res.rows.every((r) => r.gravity === "micro-g")).toBe(true);
    expect(res.familyMix).toEqual([{ family: "droplets", count: 1 }, { family: "gas jets", count: 1 }]);
  });

  // PSI-69#2 ends in extinction (went-out), PSI-159#1 self-extinguished (went-out): no burned test exists.
  it("finds the nearest went-out test over all placed tests and null burned when none", () => {
    const res = api.nearest({ kind: "atmosphere", id: "heo-dm-1006" }, 1);
    expect(res.rows).toHaveLength(1);
    expect(res.nearestWentOut!.id).toBe("PSI-159#1");
    expect(res.nearestBurned).toBeNull();
  });

  it("filters by family before ranking and honours n", () => {
    const res = api.nearest({ kind: "point", pressure_kpa: 56.5, o2_pct: 35 }, 10, "droplets");
    expect(res.rows.map((r) => r.id)).toEqual(["PSI-69#2"]);
    expect(api.nearest({ kind: "point", pressure_kpa: 56.5, o2_pct: 35 }, 1).rows).toHaveLength(1);
    expect(api.nearest({ kind: "point", pressure_kpa: 56.5, o2_pct: 35 }, 10, "smoke detection").rows).toEqual([]);
  });
});

describe("nearestTests (pure)", () => {
  const p = (id: string, pressure_kpa: number, o2_pct: number, over: Partial<PlacedTest> = {}): PlacedTest => ({
    id, investigation: "PSI-69", family: "droplets", fuel: null, o2_pct, pressure_kpa, flow_cm_s: null,
    outcome: "extinction", url: "https://psi.nasa.gov/x", ...over,
  });
  const at = { kind: "point", pressure_kpa: 50, o2_pct: 20 } as const;

  // Same coordinates, so equal d: the id decides ("a" before "b"), whatever the input order.
  it("breaks ties by id", () => {
    const res = nearestTests([p("b", 60, 20), p("a", 60, 20), p("c", 60, 20)], at, null, 10);
    expect(res.rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  // Both are 25.01 and 25.005 kPa away at equal O2: d = 25.01/25 = 1.0004 and 25.005/25 = 1.0002.
  // Both round to 1.000, but b is nearer unrounded, so b sorts before a although "a" < "b".
  it("sorts on the unrounded distance and rounds afterwards", () => {
    const res = nearestTests([p("a", 75.01, 20), p("b", 75.005, 20)], at, null, 10);
    expect(res.rows.map((r) => r.id)).toEqual(["b", "a"]);
    expect(res.rows.map((r) => r.d)).toEqual([1, 1]);
  });

  // Moon box band (read from moon.json), p = 56.5 as in the file. A test at the band top + 5 O2 points:
  // O2 term 5/5 = 1, p term 0, d = 1. A test inside the band: d = 0.
  it("O2 term is zero inside the band and the gap above it", () => {
    const above = p("above", heo.pressure_kpa, heo.o2_pct_max! + 5);
    const inside = p("in", heo.pressure_kpa, heo.o2_pct_min);
    const res = nearestTests([above, inside], { kind: "atmosphere", id: "heo-dm-1006" }, heo, 10);
    expect(res.rows.map((r) => [r.id, r.d])).toEqual([["in", 0], ["above", 1]]);
  });

  it("refuses an open band as a query (o2_pct_max null) and a missing atmosphere", () => {
    const open = moon.atmospheres.find((a) => a.id === "moon-base-brief")!;
    expect(open.o2_pct_max).toBeNull();
    const asHeo = { ...open, id: "heo-dm-1006" } as Atmosphere;
    expect(() => nearestTests([p("a", 60, 20)], { kind: "atmosphere", id: "heo-dm-1006" }, asHeo, 10)).toThrow(/open/);
    expect(() => nearestTests([p("a", 60, 20)], { kind: "atmosphere", id: "heo-dm-1006" }, null, 10)).toThrow();
  });

  // familyMix: 2 droplets, 2 gas jets, 1 smoke: ties by family name ("droplets" < "gas jets"), largest first.
  it("orders the family mix by count, then name", () => {
    const rows = [
      p("1", 50, 20, { family: "smoke detection" }), p("2", 51, 20, { family: "gas jets" }),
      p("3", 52, 20, { family: "gas jets" }), p("4", 53, 20), p("5", 54, 20),
    ];
    expect(nearestTests(rows, at, null, 10).familyMix).toEqual([
      { family: "droplets", count: 2 }, { family: "gas jets", count: 2 }, { family: "smoke detection", count: 1 },
    ]);
  });

  // nearestBurned looks past the first n: n=1 returns the went-out test, the burned one is farther.
  it("nearestBurned and nearestWentOut search all placed tests, not only the first n", () => {
    const res = nearestTests([p("near", 50, 20), p("far", 90, 20, { outcome: "completion" })], at, null, 1);
    expect(res.rows.map((r) => r.id)).toEqual(["near"]);
    expect(res.nearestWentOut!.id).toBe("near");
    expect(res.nearestBurned!.id).toBe("far");
    expect(res.nearestBurned!.d).toBe(1.6); // |50 - 90| / 25
  });
});

describe("atmosphere", () => {
  it("returns the moon.json object and throws on an unknown id", () => {
    expect(api.atmosphere("heo-dm-1006")).toBe(heo);
    expect(() => api.atmosphere("nope" as never)).toThrow();
  });
});

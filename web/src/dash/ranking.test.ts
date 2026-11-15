// Tests for the dashboard ranking (contracts/DISTANCE.md "Ranking investigations
// for a chosen air", web-lane task 50). Oracle: pipeline/tests/data/ranking_cases.json.
// Generated with Muse Spark, SI-assisted.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createDataApi } from "../data/index";
import type { AppData, Atmosphere, Experiment, MoonData, NearestQuery, TestRun } from "../contract";
import { rankForAir } from "./ranking";

const read = (rel: string): unknown => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));

const tests = read("../../../data/build/tests.json") as TestRun[];
const experiments = read("../../../data/build/experiments.json") as Experiment[];
const moon = read("../../../data/curated/moon.json") as MoonData;
const cases = read("../../../pipeline/tests/data/ranking_cases.json") as {
  id: string;
  pressure_kpa: number;
  o2_pct?: number;
  o2_pct_min?: number;
  o2_pct_max?: number;
  top: { investigation: string; acronym: string; d_min: number; near: number; placed: number; tests: number }[];
}[];

const atmosById = new Map(moon.atmospheres.map((a) => [a.id, a]));
const api = createDataApi({ experiments, tests, moon, incidents: { incidents: [], pattern: { text: "", source: "", url: "" } } } as AppData);

/** Same derivation as pipeline/tests/test_ranking_b18.py query_for: band for the Moon box, point otherwise. */
function queryFor(id: "heo-dm-1006" | "iss-air" | "exp-10-2"): { query: NearestQuery; atmosphere: Atmosphere | null } {
  const a = atmosById.get(id)!;
  expect(a, `moon.json holds ${id}`).toBeDefined();
  if (id === "heo-dm-1006") return { query: { kind: "atmosphere", id: "heo-dm-1006" }, atmosphere: a };
  const o2 = id === "exp-10-2" ? a.o2_pct_max : a.o2_pct_min;
  expect(o2, `${id} has a query oxygen`).not.toBeNull();
  return { query: { kind: "point", pressure_kpa: a.pressure_kpa, o2_pct: o2! }, atmosphere: null };
}

describe("ranking oracle (ranking_cases.json)", () => {
  it("covers the three query airs from moon.json", () => {
    expect(cases.map((c) => c.id)).toEqual(["heo-dm-1006", "iss-air", "exp-10-2"]);
  });

  for (const id of ["heo-dm-1006", "iss-air", "exp-10-2"] as const) {
    it(`${id} matches the oracle top exactly`, () => {
      const oracle = cases.find((c) => c.id === id)!;
      const { query, atmosphere } = queryFor(id);
      const got = rankForAir(api, query, atmosphere);
      expect(got.query).toEqual(query);
      expect(got.ranked.slice(0, 5)).toEqual(oracle.top);
    });
  }

  it("lists every investigation exactly once: ranked plus unrankable", () => {
    const { query, atmosphere } = queryFor("heo-dm-1006");
    const got = rankForAir(api, query, atmosphere);
    const rankedIds = got.ranked.map((r) => r.investigation);
    const unrankedIds = got.unrankable.map((r) => r.investigation);
    expect([...rankedIds, ...unrankedIds].sort()).toEqual(experiments.map((e) => e.id).sort());
    // Only the four investigations with placed tests are rankable (B18 note).
    expect(rankedIds).toHaveLength(4);
    expect(unrankedIds).toHaveLength(experiments.length - 4);
  });

  it("orders the unrankable investigations by acronym", () => {
    const { query, atmosphere } = queryFor("heo-dm-1006");
    const acronyms = rankForAir(api, query, atmosphere).unrankable.map((r) => r.acronym);
    expect([...acronyms].sort()).toEqual(acronyms);
  });
});

describe("ranking order rules (DISTANCE.md)", () => {
  const base = (id: string, over: Partial<TestRun> = {}): TestRun => ({
    id, investigation: "PSI-X", fuel: null, fuel_class: "droplet", gravity: "micro-g",
    o2_pct: 21, pressure_kpa: 101.4, outcome: "extinction", source: { file: "f", row: 1, url: "https://psi.nasa.gov/x" },
    ...over,
  });
  const exp = (id: string, acronym: string): Experiment => ({
    id, acronym, title: acronym, family: "droplets", doi: null, psi_url: `https://psi.nasa.gov/${id}`,
    license: "test fixture", objective: "", test_count: 0, has_outcomes: true, publications: [],
  });
  const q: NearestQuery = { kind: "point", pressure_kpa: 101.4, o2_pct: 21 };

  it("sorts by d_min, then near descending, then placed descending, then acronym", () => {
    // PSI-A and PSI-B share the same nearest distance; B has more tests within d <= 1.0.
    const data = {
      experiments: [exp("PSI-A", "Aaa"), exp("PSI-B", "Bbb"), exp("PSI-C", "Ccc")],
      tests: [
        base("a1", { investigation: "PSI-A", o2_pct: 26 }), // d = 1.0 exactly: near
        base("a2", { investigation: "PSI-A", o2_pct: 26 }),
        base("b1", { investigation: "PSI-B", o2_pct: 26 }), // d = 1.0: near
        base("c1", { investigation: "PSI-C", o2_pct: 31 }), // d = 2.0: not near
        base("c2", { investigation: "PSI-C", o2_pct: 26 }), // d = 1.0: near
        base("c3", { investigation: "PSI-C", o2_pct: 26 }),
      ],
      moon, incidents: { incidents: [], pattern: { text: "", source: "", url: "" } },
    } as AppData;
    const got = rankForAir(createDataApi(data), q, null);
    // All three tie on d_min = 1.0 (o2 26 is 5 points above 21). A and C tie on near = 2,
    // so placed breaks it (C has 3, A has 2); B is last on near = 1.
    expect(got.ranked.map((r) => r.investigation)).toEqual(["PSI-C", "PSI-A", "PSI-B"]);
    expect(got.ranked[0]).toMatchObject({ d_min: 1, near: 2, placed: 3, tests: 3 });
    expect(got.ranked[1]).toMatchObject({ d_min: 1, near: 2, placed: 2, tests: 2 });
    expect(got.ranked[2]).toMatchObject({ d_min: 1, near: 1, placed: 1, tests: 1 });
  });

  it("counts near on the unrounded distance (d = 1.0004 rounds to 1 but is not near)", () => {
    const data = {
      experiments: [exp("PSI-X", "Xxx")],
      // 25.01 kPa away at equal O2: d = 1.0004 -> rounds to 1, but 1.0004 > 1.0 so not near.
      tests: [base("x1", { pressure_kpa: 101.4 + 25.01 })],
      moon, incidents: { incidents: [], pattern: { text: "", source: "", url: "" } },
    } as AppData;
    const got = rankForAir(createDataApi(data), q, null);
    expect(got.ranked[0]).toMatchObject({ d_min: 1, near: 0 });
  });

  it("breaks full ties by acronym", () => {
    const data = {
      experiments: [exp("PSI-B", "Bbb"), exp("PSI-A", "Aaa")],
      tests: [base("a1", { investigation: "PSI-A" }), base("b1", { investigation: "PSI-B" })],
      moon, incidents: { incidents: [], pattern: { text: "", source: "", url: "" } },
    } as AppData;
    const got = rankForAir(createDataApi(data), q, null);
    expect(got.ranked.map((r) => r.investigation)).toEqual(["PSI-A", "PSI-B"]);
  });

  it("ranks nothing when no test is placed: every investigation is unrankable", () => {
    const data = {
      experiments: [exp("PSI-A", "Aaa")],
      tests: [base("a1", { pressure_kpa: null })],
      moon, incidents: { incidents: [], pattern: { text: "", source: "", url: "" } },
    } as AppData;
    const got = rankForAir(createDataApi(data), q, null);
    expect(got.ranked).toEqual([]);
    expect(got.unrankable).toEqual([{ investigation: "PSI-A", acronym: "Aaa" }]);
  });

  it("refuses an open band as a query and a missing atmosphere", () => {
    const open = moon.atmospheres.find((a) => a.id === "moon-base-brief")!;
    expect(open.o2_pct_max).toBeNull();
    const asHeo = { ...open, id: "heo-dm-1006" } as Atmosphere;
    expect(() => rankForAir(api, { kind: "atmosphere", id: "heo-dm-1006" }, asHeo)).toThrow(/open/);
    expect(() => rankForAir(api, { kind: "atmosphere", id: "heo-dm-1006" }, null)).toThrow();
  });
});

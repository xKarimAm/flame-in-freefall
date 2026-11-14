// @vitest-environment jsdom
// Tests for the SVG stage, driven by the real golden files. Generated with Claude, SI-assisted.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { AtmosphereId, DataApi, Experiment, Family, IncidentsData, MoonData, NearestQuery, PlacedTest, Story, TestRun } from "../contract";
import { dicts, makeT } from "../i18n/index";
import { createStore, initialState } from "../store";
import { mount } from "./index";
import { chartScales, niceDomain, stageBox, wrap } from "./layout";
import { dotKind, pressuresForDomain } from "./plan";

const read = <T>(rel: string): T => JSON.parse(readFileSync(new URL(rel, import.meta.url), "utf8")) as T;
const tests = read<TestRun[]>("../../../contracts/golden/tests.json");
const goldenExperiments = read<Experiment[]>("../../../contracts/golden/experiments.json");
const demo = read<Story>("../../../contracts/golden/story-demo.json");
const moon = read<MoonData>("../../../data/curated/moon.json");
const incidents = read<IncidentsData>("../../../data/curated/incidents.json");

// the golden experiments file only has PSI-98; these two are minimal fixtures for the other golden rows
const fixture = (id: string, family: Family): Experiment => ({ id, family }) as Experiment;
const families: Record<string, Family> = Object.fromEntries(
  [...goldenExperiments, fixture("PSI-69", "droplets"), fixture("PSI-159", "gas jets")].map((e) => [e.id, e.family]),
);

function fakeApi(): DataApi & { nearestSpy: ReturnType<typeof vi.fn> } {
  const placed: PlacedTest[] = tests
    .filter((r) => r.gravity === "micro-g" && r.o2_pct !== null && r.pressure_kpa !== null)
    .map((r) => ({
      id: r.id, investigation: r.investigation, family: families[r.investigation]!, fuel: r.fuel,
      o2_pct: r.o2_pct!, pressure_kpa: r.pressure_kpa!, flow_cm_s: r.flow_cm_s ?? null, outcome: r.outcome, url: r.source.url,
    }));
  const nearestSpy = vi.fn((query: NearestQuery) => ({
    query,
    rows: placed.map((p, i) => ({ ...p, ppo2_kpa: 0, gravity: "micro-g" as const, d: i })),
    familyMix: [], nearestBurned: null, nearestWentOut: null,
  }));
  return {
    data: { experiments: goldenExperiments, tests, moon, incidents },
    experiment: () => null, familyOf: (inv) => families[inv] ?? null,
    placed: () => placed, notPlaced: () => [],
    coverage: () => ({ plotted: placed.length, total: tests.length }),
    nearest: nearestSpy as unknown as DataApi["nearest"],
    nearestSpy,
    atmosphere(id: AtmosphereId) {
      const a = moon.atmospheres.find((x) => x.id === id);
      if (!a) throw new Error(`no atmosphere ${id}`);
      return a;
    },
  };
}

const SIZE = { w: 1200, h: 700 };
function setup(stage = initialState.stage, sliders = initialState.sliders) {
  const api = fakeApi();
  const store = createStore({ ...initialState, stage, sliders });
  const host = document.createElement("div");
  document.body.append(host);
  mount(host, { api, store, dicts, t: makeT(() => "en") }, { size: SIZE });
  const layer = (name: string) => host.querySelector(`[data-layer="${name}"]`)!;
  return { api, store, host, layer };
}
const compareStage = demo.scenes[0]!.beats[1]!.stage;
const allFamilies = Object.values(families);

describe("scale helpers", () => {
  it("maps a pressure and an O2 value to the expected pixel", () => {
    // box 500 x 528: plot x 52..484 (432 wide), y 28..420 (392 high, 28 = top 8 + label row 20, 420 = 528 - 108)
    // maxPressure 100 -> axis 0..100, so x(50) = 52 + 0.5*432 = 268; y(25) = 420 - 0.25*392 = 322
    const s = chartScales({ left: 0, top: 0, width: 500, height: 528 }, 100, 0);
    expect(s.xMax).toBe(100);
    expect(s.x(50)).toBeCloseTo(268);
    expect(s.y(25)).toBeCloseTo(322);
    expect(s.y(0)).toBe(420);
    expect(s.y(100)).toBe(28);
  });
  it("takes the x domain from the data and keeps 4 to 6 ticks", () => {
    expect(niceDomain(101.59).max).toBe(125); // 5 steps of 25
    expect(niceDomain(60).max).toBe(60);
    for (const max of [3, 17, 56.5, 101.59, 250, 999]) {
      const d = niceDomain(max);
      expect(d.max).toBeGreaterThanOrEqual(max);
      expect(d.ticks.length).toBeGreaterThanOrEqual(4);
      expect(d.ticks.length).toBeLessThanOrEqual(6);
    }
  });
  it("insets the plot: wide leaves the story cards and the slider panel, narrow uses the top 55%", () => {
    expect(stageBox({ w: 1200, h: 700 }, false)).toEqual({ left: 512, top: 0, width: 688, height: 700 });
    expect(stageBox({ w: 1200, h: 700 }, true).width).toBe(1200 - 512 - 412);
    expect(stageBox({ w: 400, h: 800 }, true)).toEqual({ left: 0, top: 0, width: 400, height: 440 });
  });
  it("wraps words by length", () => {
    expect(wrap("aa bb cc dd", 5)).toEqual(["aa bb", "cc dd"]);
  });
});

describe("what is drawn", () => {
  it("draws one dot per placed test in the shown families, none when show_families is omitted", () => {
    const withAll = setup({ view: "micro-g", show_families: allFamilies });
    const placed = withAll.api.placed().filter((p) => allFamilies.includes(p.family));
    expect(placed.length).toBe(2); // PSI-98 has no pressure, so it is not placed
    expect(withAll.layer("tests").querySelectorAll("circle").length).toBe(placed.length);

    const oneFamily = setup({ view: "micro-g", show_families: ["droplets"] });
    expect(oneFamily.layer("tests").querySelectorAll("circle").length).toBe(oneFamily.api.placed().filter((p) => p.family === "droplets").length);

    expect(setup({ view: "micro-g" }).layer("tests").querySelectorAll("circle").length).toBe(0);
    expect(setup({ view: "micro-g", show_families: [] }).layer("tests").querySelectorAll("circle").length).toBe(0);
  });

  it("colours a highlighted dot by what its record says", () => {
    const { layer } = setup({ view: "micro-g", show_families: allFamilies, highlight: { family: "droplets" } });
    const droplet = layer("tests").querySelector('[data-id="PSI-69#2"]')!;
    expect(droplet.getAttribute("class")).toBe("dot went-out"); // extinction
    expect(layer("tests").querySelector('[data-id="PSI-159#1"]')!.getAttribute("class")).toBe("dot"); // not named
    const burned = { ...fakeApi().placed()[0]!, outcome: "completion" as const };
    expect(dotKind(burned, { investigation: burned.investigation })).toBe("burned");
    expect(dotKind(burned, { test_ids: ["other"] })).toBe("default");
  });

  it("draws the Moon box at its data values", () => {
    const { layer, api } = setup({ view: "micro-g", show_families: allFamilies, reference: ["heo-dm-1006"] });
    const atm = moon.atmospheres.find((a) => a.id === "heo-dm-1006")!;
    const s = chartScales(stageBox(SIZE, false), Math.max(...pressuresForDomain(api.placed(), { bands: [{ atm, shape: "moon-box" }], paper: [] }, null)), 0);
    const rect = layer("refs").querySelector('[data-ref="heo-dm-1006"]')!;
    expect(rect.getAttribute("class")).toContain("moon-box");
    expect(+rect.getAttribute("y")!).toBeCloseTo(s.y(atm.o2_pct_max!));
    expect(+rect.getAttribute("y")! + +rect.getAttribute("height")!).toBeCloseTo(s.y(atm.o2_pct_min));
    expect(+rect.getAttribute("x")! + +rect.getAttribute("width")! / 2).toBeCloseTo(s.x(atm.pressure_kpa));
  });

  it("draws open bands dashed, ISS air as a marker, and the paper tests as diamonds", () => {
    const { layer } = setup({ view: "micro-g", reference: ["moon-base-brief", "iss-air", "saffire-vi"] });
    expect(layer("refs").querySelector('[data-ref="moon-base-brief"]')!.getAttribute("class")).toContain("open");
    expect(layer("refs").querySelector('[data-ref="iss-air"]')!.getAttribute("class")).toContain("marker");
    expect(layer("refs").querySelectorAll("path.paper").length).toBe(moon.paper_tests.points.length);
  });

  it("shows the lunar band, its annotation and the coverage numbers for the demo beat", () => {
    const { host, layer, api } = setup(compareStage);
    expect(layer("lunar-band").querySelector("rect.lunar-band")).not.toBeNull();
    const text = layer("lunar-band").textContent!;
    expect(text).toContain(dicts.en!["ui.stage.lunar-plane"]!);
    expect(text).toContain(dicts.en!["story.moon-air.moon-air-main.compare.annotation"]!);
    expect(text).toContain(dicts.en!["ui.stage.microg-plane"]!);
    const { plotted, total } = api.coverage();
    expect(layer("refs").querySelector(".coverage")!.textContent).toBe(`Plotted ${plotted} of ${total} tests`);
    expect(host.querySelector("svg")!.getAttribute("role")).toBe("img");
    expect(host.querySelector("svg")!.getAttribute("aria-label")).toBe(dicts.en!["ui.stage.title"]);
  });

  it("draws no lunar band in the micro-g view and only axes in the empty view", () => {
    expect(setup({ view: "micro-g" }).layer("lunar-band").querySelector("rect.lunar-band")).toBeNull();
    const empty = setup({ view: "empty", show_families: allFamilies, reference: ["iss-air"], coverage: true });
    expect(empty.layer("tests").children.length).toBe(0);
    expect(empty.layer("refs").children.length).toBe(0);
    expect(empty.layer("axes").querySelectorAll("line.grid").length).toBeGreaterThan(0);
  });

  it("shows one card per incident id instead of the chart", () => {
    const ids = incidents.incidents.slice(0, 2).map((i) => i.id);
    const { host } = setup({ view: "incident", incident_ids: ids });
    const cards = host.querySelectorAll(".incident-card");
    expect(cards.length).toBe(2);
    expect(cards[0]!.textContent).toContain(incidents.incidents[0]!.what_happened);
    expect(cards[0]!.querySelector("a")!.getAttribute("href")).toBe(incidents.incidents[0]!.url);
    expect((host.querySelector(".stage-root") as HTMLElement).hidden).toBe(true);
  });
});

describe("live layer", () => {
  it("nearest layer holds exactly the ids api.nearest returned, the crosshair follows the sliders", () => {
    const { layer, api, store, host } = setup({ view: "micro-g", show_families: allFamilies }, { pressure_kpa: 56.5, o2_pct: 34 });
    const ids = () => [...layer("nearest").querySelectorAll("circle")].map((c) => c.getAttribute("data-id"));
    const expected = api.nearest({ kind: "point", pressure_kpa: 56.5, o2_pct: 34 }, 10).rows.map((r) => r.id);
    expect(ids()).toEqual(expected);
    expect(api.nearestSpy).toHaveBeenCalledWith({ kind: "point", pressure_kpa: 56.5, o2_pct: 34 }, 10, undefined);
    expect(layer("you").textContent).toBe(dicts.en!["ui.stage.your-air"]);
    expect(host.querySelector(".stage-legend")!.textContent).toContain(dicts.en!["ui.stage.legend.nearest"]!);

    // moving a slider redraws the live layers but keeps the grey dots untouched
    const grey = layer("tests").querySelector("circle")!;
    const before = layer("you").innerHTML;
    store.set({ sliders: { pressure_kpa: 80, o2_pct: 25 } });
    expect(layer("tests").querySelector("circle")).toBe(grey);
    expect(layer("you").innerHTML).not.toBe(before);
    expect(api.nearestSpy).toHaveBeenLastCalledWith({ kind: "point", pressure_kpa: 80, o2_pct: 25 }, 10, undefined);
  });

  it("has no nearest dots without a query", () => {
    expect(setup({ view: "micro-g", show_families: allFamilies }).layer("nearest").children.length).toBe(0);
  });
});

describe("motion", () => {
  it("the stylesheet switches transitions and animations off under prefers-reduced-motion", () => {
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "stage.css"), "utf8");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*transition:\s*none/);
  });
});

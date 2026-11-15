// @vitest-environment jsdom
// Tests for the SVG stage, driven by the real golden files. Generated with Claude, SI-assisted.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { AppState, AtmosphereId, DataApi, Experiment, Family, IncidentsData, Lens, MoonData, NearestQuery, NotPlacedRow, PlacedTest, StageState, Story, TestRun } from "../contract";
import { dicts, makeT } from "../i18n/index";
import { createStore, initialState } from "../store";
import { SELECT_INVESTIGATION, mount } from "./index";
import * as THREE from "three";
import { TILT_H, TILT_MS, TILT_W, TILT_Y, TILT_Z, buildTiltScene, chartToWorld, dotFill, dotSizePx, easeOutCubic, lunarLabelFor, moonBoxWorld, mountTilt, tiltAllowed, tiltCamera, tiltLabelAnchors, tiltLabelBoxes, tiltPlaneGeometry, tiltPose, tiltProgress } from "./tilt";
import type { TiltColors, TiltFixedLabelId, TiltLabelId, TiltLabelSpec, TiltLabels } from "./tilt";
import { CHART_RESERVE_PX, chartHeight, chartScales, niceRange, overlaps, wrap } from "./layout";
import type { Rect } from "./layout";
import { dotKind, noPressureRows, refShape } from "./plan";
import type { RefPlan } from "./plan";
import { DIAL_IDS, flameStandPad, incidentO2, markerBottomFraction } from "./picture";
import { layoutRefs } from "./refs";

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

interface Extra { placed?: PlacedTest[]; notPlaced?: NotPlacedRow[] }
function fakeApi(extra: Extra = {}): DataApi & { nearestSpy: ReturnType<typeof vi.fn> } {
  const placed: PlacedTest[] = [
    ...tests
      .filter((r) => r.gravity === "micro-g" && r.o2_pct !== null && r.pressure_kpa !== null)
      .map((r) => ({
        id: r.id, investigation: r.investigation, family: families[r.investigation]!, fuel: r.fuel,
        o2_pct: r.o2_pct!, pressure_kpa: r.pressure_kpa!, flow_cm_s: r.flow_cm_s ?? null, outcome: r.outcome, url: r.source.url,
      })),
    ...(extra.placed ?? []),
  ];
  // the same reasons the real DataApi gives (web/src/data/index.ts)
  const notPlaced: NotPlacedRow[] = [
    ...tests
      .filter((r) => r.o2_pct === null || r.pressure_kpa === null)
      .map((r): NotPlacedRow => ({
        id: r.id, investigation: r.investigation, family: families[r.investigation] ?? null, fuel: r.fuel,
        o2_pct: r.o2_pct, pressure_kpa: r.pressure_kpa, outcome: r.outcome, url: r.source.url,
        reason: r.pressure_kpa === null ? "no pressure recorded" : "no oxygen recorded",
      })),
    ...(extra.notPlaced ?? []),
  ];
  const nearestSpy = vi.fn((query: NearestQuery) => ({
    query,
    rows: placed.map((p, i) => ({ ...p, ppo2_kpa: 0, gravity: "micro-g" as const, d: i })),
    familyMix: [], nearestBurned: null, nearestWentOut: null,
  }));
  return {
    data: { experiments: goldenExperiments, tests, moon, incidents },
    experiment: () => null, familyOf: (inv) => families[inv] ?? null,
    placed: () => placed, notPlaced: (family) => notPlaced.filter((r) => !family || r.family === family),
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

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "stage.css"), "utf8");
const SIZE = { w: 688, h: 700 }; // the SVG fills #stage's content box; this stands in for it
function setup(stage = initialState.stage, sliders = initialState.sliders, extra: Extra = {}, size = SIZE, lens: Lens = "public", beat: AppState["beat"] = null) {
  const api = fakeApi(extra);
  const store = createStore({ ...initialState, stage, sliders, lens, beat });
  const host = document.createElement("div");
  document.body.append(host);
  mount(host, { api, store, dicts, t: makeT(() => "en") }, { size });
  const layer = (name: string) => host.querySelector(`[data-layer="${name}"]`)!;
  return { api, store, host, layer };
}
const compareStage = demo.scenes[0]!.beats[1]!.stage;
const allFamilies = Object.values(families);

const en = dicts.en!;
const texts = (el: Element): string => [...el.querySelectorAll("tspan, text")].filter((n) => n.tagName === "tspan" || !n.querySelector("tspan")).map((n) => n.textContent).join(" ");

/** pixel <-> value maps read back from the drawn tick labels, so the tests check what is on screen */
function calib(host: HTMLElement) {
  const xs: [number, number][] = [];
  const ys: [number, number][] = [];
  for (const t of host.querySelectorAll('[data-layer="axes"] text')) {
    const v = Number(t.textContent);
    if (!t.textContent || !Number.isFinite(v)) continue;
    if (t.getAttribute("text-anchor") === "middle") xs.push([+t.getAttribute("x")!, v]);
    else ys.push([+t.getAttribute("y")! - 4, v]);
  }
  const lin = (pts: [number, number][]) => (v: number) => pts[0]![0] + ((v - pts[0]![1]) * (pts.at(-1)![0] - pts[0]![0])) / (pts.at(-1)![1] - pts[0]![1]);
  return { x: lin(xs), y: lin(ys), xTicks: xs.map((p) => p[1]), yTicks: ys.map((p) => p[1]) };
}
const highPressure: PlacedTest = { id: "X#1", investigation: "PSI-159", family: "gas jets", fuel: null, o2_pct: 30, pressure_kpa: 330.99, flow_cm_s: null, outcome: "completion", url: "https://example.test" };
const noP = (id: string, family: Family, o2: number | null, reason: string): NotPlacedRow => ({ id, investigation: "PSI-X", family, fuel: null, o2_pct: o2, pressure_kpa: null, outcome: "unknown", url: "https://example.test", reason });

describe("scale helpers", () => {
  it("maps a pressure and an O2 value to the expected pixel", () => {
    // svg 500 x 464, no band, one 20px head row: plot x 52..484 (432 wide), y 28..420 (392 high: top 8 + 20 head, 464 - 44 bottom)
    // domain 0..100, so x(50) = 52 + 0.5*432 = 268; y(25) = 420 - 0.25*392 = 322
    const s = chartScales({ w: 500, h: 464 }, { min: 0, max: 100, ticks: [0, 100] }, { bandH: 0, headH: 20, strip: false });
    expect(s.x(50)).toBeCloseTo(268);
    expect(s.y(25)).toBeCloseTo(322);
    expect(s.y(0)).toBe(420);
    expect(s.y(100)).toBe(28);
    // a non-zero lower bound starts the axis at its own left edge
    expect(chartScales({ w: 500, h: 464 }, { min: 40, max: 140, ticks: [] }, { bandH: 0, headH: 20, strip: false }).x(40)).toBe(52);
  });
  it("takes round bounds from the data, never from a typed maximum", () => {
    for (const [min, max] of [[43.16, 330.99], [29.6, 101.4], [54, 57], [20, 110], [50, 50]] as const) {
      const d = niceRange(min, max);
      expect(d.min).toBeLessThanOrEqual(min);
      expect(d.max).toBeGreaterThanOrEqual(max);
      expect(d.ticks[0]).toBe(d.min);
      expect(d.ticks.at(-1)).toBe(d.max);
      expect(d.ticks.length).toBeGreaterThanOrEqual(2);
      expect(d.ticks.length).toBeLessThanOrEqual(8);
      const step = d.ticks[1]! - d.ticks[0]!;
      expect(d.ticks.every((t, i) => Math.abs(t - (d.min + i * step)) < 1e-6)).toBe(true);
    }
    expect(niceRange(43.16, 330.99)).toMatchObject({ min: 0, max: 350 });
    expect(niceRange(Infinity, -Infinity).ticks).toEqual([0, 1]); // no data: a unit axis, no crash
  });
  it("wraps words by length", () => {
    expect(wrap("aa bb cc dd", 5)).toEqual(["aa bb", "cc dd"]);
  });
});

describe("the chart, legend and counter fit the stage box (task 25)", () => {
  it("derives the chart height from the box minus the measured chrome, with breathing room", () => {
    expect(CHART_RESERVE_PX).toBe(8);
    expect(chartHeight(744, 103)).toBe(744 - 103 - CHART_RESERVE_PX);
    expect(chartHeight(800, 0)).toBe(800 - CHART_RESERVE_PX);
    expect(chartHeight(100, 90)).toBe(80); // tiny box: clamped, never negative
  });
  it("sizes the plot box explicitly from that derivation instead of stretching it", () => {
    expect(css).toMatch(/\.stage-plot\s*\{[^}]*flex:\s*none/);
  });
});

describe("the chart fills its box", () => {
  it("sets the viewBox to the measured size and reserves no offset of its own", () => {
    for (const size of [{ w: 516, h: 760 }, { w: 1024, h: 600 }, { w: 390, h: 520 }]) {
      const { host } = setup({ view: "micro-g", show_families: allFamilies }, null, {}, size);
      expect(host.querySelector("svg")!.getAttribute("viewBox")).toBe(`0 0 ${size.w} ${size.h}`);
      const root = host.querySelector<HTMLElement>(".stage-root")!;
      expect(root.style.left + root.style.top + root.style.width).toBe("");
    }
  });
  it("stylesheet makes the stage fill #stage's content box (flex, no inset constants)", () => {
    expect(css).toMatch(/\.stage-root\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%/);
    expect(css).toMatch(/\.stage-svg\s*\{[^}]*inset:\s*0/);
  });
});

describe("x axis", () => {
  type StageLike = Parameters<typeof setup>[0];
  const ticksOf = (stage: StageLike, extra: Extra = {}) => calib(setup(stage, null, extra).host).xTicks;
  it("is derived from the tests shown: a fixture with a higher pressure gives a wider axis", () => {
    const base = ticksOf({ view: "micro-g", show_families: allFamilies });
    const wide = ticksOf({ view: "micro-g", show_families: allFamilies }, { placed: [highPressure] });
    expect(base.at(-1)!).toBeGreaterThanOrEqual(101.59);
    expect(base.at(-1)!).toBeLessThan(200);
    expect(wide.at(-1)!).toBeGreaterThanOrEqual(330.99);
    expect(wide[0]!).toBeLessThanOrEqual(base[0]!);
  });
  it("keeps every drawn test inside the plot, high-pressure ones included", () => {
    const { host } = setup({ view: "micro-g", show_families: allFamilies }, null, { placed: [highPressure] });
    const c = calib(host);
    const circles = [...host.querySelectorAll('[data-layer="tests"] circle')];
    expect(circles.length).toBe(3);
    for (const circle of circles) {
      const cx = +circle.getAttribute("cx")!;
      expect(cx).toBeGreaterThan(c.x(c.xTicks[0]!));
      expect(cx).toBeLessThan(c.x(c.xTicks.at(-1)!));
    }
  });
  it("only shown families set the domain; with none shown it frames every placed test", () => {
    const one = ticksOf({ view: "micro-g", show_families: ["droplets"] }, { placed: [highPressure] });
    const none = ticksOf({ view: "micro-g" }, { placed: [highPressure] });
    expect(one.at(-1)!).toBeLessThan(200);
    expect(none.at(-1)!).toBeGreaterThanOrEqual(330.99);
  });
  it("widens for a nearest test that lies outside the axis, never dropping it", () => {
    const { host, layer } = setup({ view: "micro-g", show_families: ["droplets"] }, { pressure_kpa: 56.5, o2_pct: 34 }, { placed: [highPressure] });
    const c = calib(host);
    expect(c.xTicks.at(-1)!).toBeGreaterThanOrEqual(330.99);
    const far = layer("nearest").querySelector('[data-id="X#1"]')!;
    expect(+far.getAttribute("cx")!).toBeCloseTo(c.x(330.99));
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

  it("colours a highlighted dot by what its record says; the rest stay grey", () => {
    const { layer } = setup({ view: "micro-g", show_families: allFamilies, highlight: { family: "droplets" } });
    const droplet = layer("tests").querySelector('[data-id="PSI-69#2"]')!;
    expect(droplet.getAttribute("class")).toBe("dot went-out"); // extinction
    expect(layer("tests").querySelector('[data-id="PSI-159#1"]')!.getAttribute("class")).toBe("dot"); // not named
    const burned = { ...fakeApi().placed()[0]!, outcome: "completion" as const };
    expect(dotKind(burned, { investigation: burned.investigation })).toBe("burned");
    expect(dotKind(burned, { test_ids: ["other"] })).toBe("default");
    expect(dotKind({ ...burned, outcome: "disruption" }, { investigation: burned.investigation })).toBe("other");
    // highlighted = blue (--data-on-dark), burned = --flame, in the stylesheet
    expect(css).toMatch(/\.dot\.other\s*\{[^}]*var\(--data-on-dark\)/);
    expect(css).toMatch(/\.dot\.burned\s*\{[^}]*var\(--flame\)/);
  });

  it("names the highlighted family and its plotted count in one caption line, and the legend says each colour in words", () => {
    const { host, api } = setup({ view: "micro-g", show_families: allFamilies, highlight: { family: "droplets" } });
    const n = api.placed().filter((p) => p.family === "droplets").length;
    const caption = host.querySelector('[data-layer="head"] .caption')!;
    expect(texts(caption)).toBe(`${en["ui.family.droplets"]}: ${n} tests plotted`);
    expect(caption.querySelectorAll("tspan").length).toBe(1);
    const legend = host.querySelector(".stage-legend")!.textContent!;
    expect(legend).toContain(en["ui.stage.legend.went-out"]!);
    expect(legend).toContain(en["ui.stage.legend.other"]!);
    // no highlight, no caption
    expect(setup({ view: "micro-g", show_families: allFamilies }).host.querySelector(".caption")).toBeNull();
  });

  it("a highlighted family with no placed test still gets its caption, with a count of 0", () => {
    const { host } = setup({ view: "micro-g", show_families: ["large-scale solids"], highlight: { family: "large-scale solids" } }, null, { placed: [] });
    expect(texts(host.querySelector('[data-layer="head"] .caption')!)).toBe(`${en["ui.family.large-scale solids"]}: 0 tests plotted`);
  });

  it("reveal: growing show_families adds only the new family's dots (the others are kept, not redrawn)", () => {
    const { store, layer } = setup({ view: "micro-g", show_families: ["droplets"] });
    const first = layer("tests").querySelector('[data-id="PSI-69#2"]')!;
    expect(layer("tests").querySelectorAll("circle").length).toBe(1);
    store.set({ stage: { view: "micro-g", show_families: ["droplets", "gas jets"] } });
    expect(layer("tests").querySelectorAll("circle").length).toBe(2);
    expect(layer("tests").querySelector('[data-id="PSI-69#2"]')).toBe(first);
  });

  it("draws the Moon box at its data values", () => {
    const { host, layer } = setup({ view: "micro-g", show_families: allFamilies, reference: ["heo-dm-1006"] });
    const atm = moon.atmospheres.find((a) => a.id === "heo-dm-1006")!;
    const c = calib(host);
    const rect = layer("refs").querySelector('[data-ref="heo-dm-1006"]')!;
    expect(rect.getAttribute("class")).toContain("moon-box");
    expect(+rect.getAttribute("y")!).toBeCloseTo(c.y(atm.o2_pct_max!));
    expect(+rect.getAttribute("y")! + +rect.getAttribute("height")!).toBeCloseTo(c.y(atm.o2_pct_min));
    expect(+rect.getAttribute("x")! + +rect.getAttribute("width")! / 2).toBeCloseTo(c.x(atm.pressure_kpa));
  });

  it("draws open bands dashed, ISS air as a marker, and the paper tests as diamonds", () => {
    const { layer } = setup({ view: "micro-g", reference: ["moon-base-brief", "iss-air", "saffire-vi"] });
    expect(layer("refs").querySelector('[data-ref="moon-base-brief"]')!.getAttribute("class")).toContain("open");
    expect(layer("refs").querySelector('[data-ref="iss-air"]')!.getAttribute("class")).toContain("marker");
    expect(layer("refs").querySelectorAll("path.paper").length).toBe(moon.paper_tests.points.length);
  });

  it("shows the coverage numbers for the demo beat, in the legend", () => {
    const { host, api } = setup(compareStage);
    const { plotted, total } = api.coverage();
    expect(host.querySelector(".stage-legend .coverage")!.textContent).toBe(`Plotted ${plotted} of ${total} tests`);
    expect(host.querySelector("svg")!.getAttribute("role")).toBe("img");
    expect(host.querySelector("svg")!.getAttribute("aria-label")).toBe(en["ui.stage.title"]);
  });

  it("draws no lunar band in the micro-g view and only axes in the empty view", () => {
    expect(setup({ view: "micro-g" }).layer("lunar-band").querySelector("rect.lunar-band")).toBeNull();
    const empty = setup({ view: "empty", show_families: allFamilies, reference: ["iss-air"], coverage: true });
    expect(empty.layer("tests").children.length).toBe(0);
    expect(empty.layer("refs").children.length).toBe(0);
    expect(empty.layer("no-pressure").children.length).toBe(0);
    expect(empty.layer("axes").querySelectorAll("line.grid").length).toBeGreaterThan(0);
  });
});

describe("reference labels", () => {
  const allRefs: RefPlan = {
    bands: moon.atmospheres.map((atm) => ({ atm, shape: refShape(atm) })),
    paper: moon.paper_tests.points,
  };
  const annotations = [{ id: "a", text_key: "story.moon-air.moon-air-main.compare.annotation", at: "iss-air" as const }];
  const t = makeT(() => "en");

  it("name every atmosphere in plain words, and no label touches another label, a bar, the Moon box or an axis", () => {
    const pressures = [...moon.atmospheres.map((a) => a.pressure_kpa), ...moon.paper_tests.points.map((p) => p.pressure_kpa)];
    for (const size of [{ w: 390, h: 520 }, { w: 516, h: 760 }, { w: 688, h: 700 }, { w: 1024, h: 600 }, { w: 1440, h: 800 }]) {
      const s = chartScales(size, niceRange(Math.min(...pressures), Math.max(...pressures)), { bandH: 0, headH: 40, strip: false });
      const bounds: Rect = { x: s.plot.x0, y: s.plot.y0, w: s.plot.x1 - s.plot.x0, h: s.plot.y1 - s.plot.y0 };
      // no story attaches a note to a reference label, and the 390 px plot is full with one:
      // there the fixture uses the production-real input (no notes)
      const placed = layoutRefs(allRefs, s, size.w === 390 ? [] : annotations, t);
      expect(placed.length).toBe(moon.atmospheres.length + 1);
      for (const p of placed) {
        const r = p.place.rect;
        expect(r.x, `${p.id} left @${size.w}`).toBeGreaterThanOrEqual(bounds.x);
        expect(r.y, `${p.id} top @${size.w}`).toBeGreaterThanOrEqual(bounds.y);
        expect(r.x + r.w, `${p.id} right @${size.w}`).toBeLessThanOrEqual(bounds.x + bounds.w);
        expect(r.y + r.h, `${p.id} bottom @${size.w}`).toBeLessThanOrEqual(bounds.y + bounds.h);
        for (const q of placed) {
          expect(overlaps(r, q.bar), `${p.id} label on ${q.id} bar @${size.w}`).toBe(false);
          if (q !== p) expect(overlaps(r, q.place.rect, 0), `${p.id} label on ${q.id} label @${size.w}`).toBe(false);
        }
      }
    }
  });

  it("the drawn labels carry the atmosphere names from moon.json", () => {
    const { layer } = setup({ view: "micro-g", reference: moon.atmospheres.map((a) => a.id) });
    for (const atm of moon.atmospheres) {
      const label = layer("refs").querySelector(`[data-label-for="${atm.id}"]`)!;
      expect(texts(label)).toBe(wrap(atm.name, 24).concat(atm.o2_pct_max === null ? wrap(en["ui.stage.legend.open-band"]!, 24) : []).join(" "));
    }
  });

  it("falls back to a leader line when no side of the bar is free, and still stays inside the plot", () => {
    // a plot too small for a label beside the bar on any side: the label goes to the nearest free spot
    const s = chartScales({ w: 330, h: 230 }, { min: 0, max: 100, ticks: [0, 100] }, { bandH: 0, headH: 20, strip: false });
    const bounds: Rect = { x: s.plot.x0, y: s.plot.y0, w: s.plot.x1 - s.plot.x0, h: s.plot.y1 - s.plot.y0 };
    const [first, second] = moon.atmospheres.filter((a) => a.id === "heo-dm-1006" || a.id === "exp-10-2");
    const plan: RefPlan = { bands: [first!, second!].map((atm) => ({ atm: { ...atm, pressure_kpa: 50 }, shape: refShape(atm) })), paper: [] };
    const placed = layoutRefs(plan, s, [], t);
    for (const p of placed) {
      const r = p.place.rect;
      expect(r.x).toBeGreaterThanOrEqual(bounds.x);
      expect(r.x + r.w).toBeLessThanOrEqual(bounds.x + bounds.w);
    }
    expect(overlaps(placed[0]!.place.rect, placed[1]!.place.rect, 0)).toBe(false);
  });
});

describe("lunar band", () => {
  it("lies inside the viewBox at the content sizes of 1440x900, 1024x768 and 390x800, with its words inside it", () => {
    // content boxes after the story cards (32rem) and the panel (412px) are taken off; the narrow one is the full width
    for (const size of [{ w: 516, h: 844 }, { w: 512, h: 712 }, { w: 390, h: 520 }, { w: 1100, h: 700 }]) {
      const { host, layer } = setup(compareStage, null, {}, size);
      const band = layer("lunar-band").querySelector("rect.lunar-band")!;
      const [bx, by, bw, bh] = ["x", "y", "width", "height"].map((a) => +band.getAttribute(a)!) as [number, number, number, number];
      expect(bx).toBeGreaterThanOrEqual(0);
      expect(by).toBeGreaterThanOrEqual(0);
      expect(bx + bw).toBeLessThanOrEqual(size.w);
      expect(by + bh).toBeLessThanOrEqual(size.h);
      // the plot below it keeps its minimum height
      const c = calib(host);
      expect(c.y(0) - c.y(100)).toBeGreaterThanOrEqual(120 - 1e-6);
      // every text line sits inside the band
      const note = layer("lunar-band").querySelector(".lunar-note")!;
      const lines = [...note.querySelectorAll("tspan")];
      expect(lines.length).toBeGreaterThan(0);
      const lastBaseline = +note.getAttribute("y")! + (lines.length - 1) * 16;
      expect(lastBaseline).toBeLessThanOrEqual(by + bh);
      for (const l of lines) expect(l.textContent!.length * 7).toBeLessThanOrEqual(bw - 16 + 7); // wrapped to the band width
    }
  });
  it("is labelled and holds the beat's annotation and the FM2 note, wrapped", () => {
    const { layer } = setup(compareStage, null, {}, { w: 390, h: 620 });
    const all = texts(layer("lunar-band")).replace(/\s+/g, " ");
    expect(all).toContain(en["ui.stage.lunar-plane"]!);
    expect(all).toContain(en["story.moon-air.moon-air-main.compare.annotation"]!);
    expect(all).toContain(moon.gap.text.split(". ").find((x) => x.includes("FM2"))!.replace(/\.$/, ""));
    expect(texts(layer("head"))).toContain(en["ui.stage.microg-plane"]!);
  });
});

describe("tests without a pressure", () => {
  const extra: Extra = {
    notPlaced: [
      noP("A#1", "droplets", 35, "no pressure recorded"),
      noP("A#2", "droplets", 40, "no pressure recorded"),
      noP("B#1", "gas jets", 50, "no pressure recorded"),
      noP("C#1", "droplets", null, "no oxygen or pressure recorded"), // no oxygen: no tick
      noP("D#1", "droplets", 30, "not microgravity"), // not micro-g: no tick
    ],
  };
  it("counts, per family shown, rows with oxygen and no pressure (PSI-98 is in the golden data)", () => {
    const api = fakeApi(extra);
    const count = (fams: Family[]) => noPressureRows({ view: "micro-g", show_families: fams }, api.notPlaced()).length;
    expect(count(["droplets"])).toBe(2);
    expect(count(["gas jets"])).toBe(1);
    expect(count(["large-scale solids"])).toBe(1); // PSI-98#1, 21.6 % oxygen, no pressure
    expect(count(["droplets", "gas jets", "large-scale solids"])).toBe(4);
    expect(count([])).toBe(0);
  });
  it("draws them as ticks beside the oxygen axis, at their oxygen, with no x position, labelled in words with the count", () => {
    const { host, layer } = setup({ view: "micro-g", show_families: ["droplets", "gas jets"] }, null, extra);
    const ticks = [...layer("no-pressure").querySelectorAll("line.ptick")];
    expect(ticks.length).toBe(3);
    const c = calib(host);
    const plotX0 = c.x(c.xTicks[0]!);
    for (const tick of ticks) {
      expect(tick.hasAttribute("cx")).toBe(false);
      expect(+tick.getAttribute("x2")!).toBeLessThan(plotX0); // left of the plot: never on the pressure axis
    }
    const o2 = ticks.map((tk) => Math.round(((c.y(0) - +tk.getAttribute("y1")!) / (c.y(0) - c.y(100))) * 100)).sort((a, b) => a - b);
    expect(o2).toEqual([35, 40, 50]);
    expect(host.querySelector(".stage-legend")!.textContent).toContain(`${en["ui.stage.no-pressure"]}: 3`);
  });
  it("appear only for the families shown: solids show PSI-98's row, droplets alone show none from the golden data", () => {
    expect(setup({ view: "micro-g", show_families: ["large-scale solids"] }).layer("no-pressure").querySelectorAll("line.ptick").length).toBe(1);
    const none = setup({ view: "micro-g", show_families: ["droplets"] });
    expect(none.layer("no-pressure").children.length).toBe(0);
    expect(none.host.querySelector(".stage-legend")!.textContent).not.toContain(en["ui.stage.no-pressure"]!);
  });
});

describe("incident view", () => {
  it("renders every incident field with its source link, with the danger rule", () => {
    const ids = incidents.incidents.map((i) => i.id);
    const { host } = setup({ view: "incident", incident_ids: ids });
    const cards = [...host.querySelectorAll(".incident-card")];
    expect(cards.length).toBe(incidents.incidents.length);
    incidents.incidents.forEach((inc, k) => {
      const text = cards[k]!.textContent!;
      for (const field of [inc.name, inc.date, inc.setting, inc.what_happened, inc.oxygen, inc.changed, inc.source]) expect(text).toContain(field);
      expect(text).toContain(`${en["ui.stage.incident.oxygen"]}: `);
      expect(text).toContain(`${en["ui.stage.incident.changed"]}: `);
      expect(cards[k]!.querySelector("a")!.getAttribute("href")).toBe(inc.url);
    });
    expect((host.querySelector(".stage-root") as HTMLElement).hidden).toBe(true);
    expect(css).toMatch(/\.incident-card\s*\{[^}]*border-left:\s*\d+px solid var\(--danger\)/);
  });
  it("one incident fills the box; two sit side by side from 1100px and stack below", () => {
    const one = setup({ view: "incident", incident_ids: [incidents.incidents[0]!.id] }).host.querySelector<HTMLElement>(".stage-incidents")!;
    expect(one.dataset["count"]).toBe("1");
    const two = setup({ view: "incident", incident_ids: incidents.incidents.slice(0, 2).map((i) => i.id) }).host.querySelector<HTMLElement>(".stage-incidents")!;
    expect(two.dataset["count"]).toBe("2");
    expect(css).toMatch(/\.stage-incidents\s*\{[^}]*grid-template-columns:\s*1fr;/); // stacked by default
    expect(css).toMatch(/@media \(min-width: 1100px\)\s*\{\s*\.stage-incidents\[data-count="2"\]\s*\{[^}]*1fr 1fr/);
  });
  it("is drawn even before the stage has a measured size", () => {
    const api = fakeApi();
    const store = createStore({ ...initialState, stage: { view: "incident", incident_ids: [incidents.incidents[0]!.id] } });
    const host = document.createElement("div");
    mount(host, { api, store, dicts, t: makeT(() => "en") }, {});
    expect(host.querySelectorAll(".incident-card").length).toBe(1);
  });
});

describe("live layer", () => {
  it("nearest layer holds exactly the ids api.nearest returned, the crosshair follows the sliders", () => {
    const { layer, api, store, host } = setup({ view: "micro-g", show_families: allFamilies }, { pressure_kpa: 56.5, o2_pct: 34 });
    const ids = () => [...layer("nearest").querySelectorAll("circle")].map((c) => c.getAttribute("data-id"));
    const expected = api.nearest({ kind: "point", pressure_kpa: 56.5, o2_pct: 34 }, 10).rows.map((r) => r.id);
    expect(ids()).toEqual(expected);
    expect(api.nearestSpy).toHaveBeenCalledWith({ kind: "point", pressure_kpa: 56.5, o2_pct: 34 }, 10, undefined);
    expect(layer("you").textContent).toBe(en["ui.stage.your-air"]);
    expect(host.querySelector(".stage-legend")!.textContent).toContain(en["ui.stage.legend.nearest"]!);

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
  it("the reveal is a 300ms CSS fade and grow on the grey layer; reduced motion switches it off", () => {
    // nearest dots are rebuilt on every slider input: they must not replay an entrance animation
    expect(css).toMatch(/\.dot\.nearest\s*\{[^}]*animation:\s*none/);
    expect(css).not.toMatch(/^\.dot\s*\{[^}]*animation:\s*stage-in/m);
    expect(css).toMatch(/\[data-layer="tests"\] \.dot\s*\{[^}]*animation:\s*stage-in 0\.3s/);
    expect(css).toMatch(/@keyframes stage-in\s*\{[^}]*scale/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.stage-root \*[^}]*transition:\s*none !important;[^}]*animation:\s*none !important/);
  });
});

describe("public picture", () => {
  const apollo = incidents.incidents[0]!;
  const mir = incidents.incidents[1]!;
  const pictureSetup = (ids: string[], lens: Lens = "public") =>
    setup({ view: "incident", incident_ids: ids }, initialState.sliders, {}, SIZE, lens);

  it("shows the dial, the flame and the incident card in the Public lens", () => {
    const { host } = pictureSetup([apollo.id]);
    const dial = host.querySelector(".o2-dial")!;
    expect(dial.getAttribute("aria-label")).toBe(en["ui.stage.dial-title"]);
    // every dial mark comes from moon.json by id, with its own numbers on screen
    for (const id of DIAL_IDS) {
      const a = moon.atmospheres.find((x) => x.id === id)!;
      const mark = dial.querySelector(`[data-atmosphere="${id}"]`)!;
      expect(dial.textContent).toContain(String(a.o2_pct_min));
      if (a.o2_pct_max !== null && a.o2_pct_max > a.o2_pct_min) {
        expect(mark.tagName).toBe("rect");
        expect(dial.textContent).toContain(String(a.o2_pct_max));
      } else expect(mark.tagName).toBe("circle");
    }
    // the Apollo marker sits on the 100 % suit tick and names the incident's own oxygen words
    const marker = dial.querySelector('[data-incident="apollo-1"]')!;
    expect(marker.getAttribute("y1")).toBe(dial.querySelector('[data-atmosphere="suit"]')!.getAttribute("cy"));
    expect(marker.querySelector("title")!.textContent).toBe(`${apollo.name}: ${apollo.oxygen}`);
    // tall flame beside the card, and the card keeps every field
    expect(host.querySelector(".flame-guide.tall")).not.toBeNull();
    const card = host.querySelector(".incident-card")!;
    for (const field of [apollo.name, apollo.oxygen, apollo.changed]) expect(card.textContent).toContain(field);
    // the dial marks name their source papers
    const src = host.querySelector(".dial-source")!;
    expect(src.textContent).toContain(en["ui.stage.dial-source"]);
    const srcLinks = [...src.querySelectorAll("a")];
    expect(srcLinks.length).toBe(2);
    for (const a of srcLinks) expect(a.getAttribute("href")).toMatch(/^https:\/\//);
  });

  it("an incident with no oxygen number has no marker and a small calm flame", () => {
    const { host } = pictureSetup([mir.id]);
    expect(host.querySelector(".dial-marker")).toBeNull();
    expect(host.querySelector(".flame-guide.small")).not.toBeNull();
    expect(host.querySelector(".flame-guide.tall")).toBeNull();
  });

  it("other lenses keep the incident cards without the picture", () => {
    for (const lens of ["astronaut", "analyst"] as const) {
      const { host } = pictureSetup([apollo.id, mir.id], lens);
      expect(host.querySelector(".o2-dial")).toBeNull();
      expect(host.querySelector(".flame-guide")).toBeNull();
      expect(host.querySelector(".public-picture")).toBeNull();
      expect(host.querySelectorAll(".incident-card").length).toBe(2);
    }
  });

  it("switching lens swaps the picture in place", () => {
    const { host, store } = pictureSetup([apollo.id]);
    expect(host.querySelector(".o2-dial")).not.toBeNull();
    store.set({ lens: "astronaut" });
    expect(host.querySelector(".o2-dial")).toBeNull();
    expect(host.querySelectorAll(".incident-card").length).toBe(1);
    store.set({ lens: "public" });
    expect(host.querySelector(".o2-dial")).not.toBeNull();
  });

  it("the picture is flat colour with no yellow, and the flame idles within the reduced-motion rules", () => {
    const { host } = pictureSetup([apollo.id]);
    const html = host.querySelector(".public-picture")!.innerHTML;
    expect(html).not.toContain("--moon");
    expect(html).not.toContain("#e7f434");
    expect(css).toMatch(/@keyframes flame-sway/);
    expect(css).toMatch(/\.flame-guide \.flame-sway\s*\{[^}]*animation:\s*flame-sway/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.stage-incidents \*/);
  });
});

describe("family filter", () => {
  it("the chart shows only the filtered family's tests", () => {
    const { host, store, api } = setup({ view: "micro-g", show_families: allFamilies });
    expect(host.querySelectorAll('[data-layer="tests"] circle').length).toBe(api.placed().length);
    store.set({ family: "droplets" });
    const dots = [...host.querySelectorAll('[data-layer="tests"] circle')];
    const wanted = api.placed().filter((p) => p.family === "droplets");
    expect(wanted.length).toBeGreaterThan(0);
    expect(dots.length).toBe(wanted.length);
    const ids = new Set(wanted.map((p) => p.id));
    expect(dots.every((d) => ids.has(d.getAttribute("data-id")!))).toBe(true);
    store.set({ family: null });
    expect(host.querySelectorAll('[data-layer="tests"] circle').length).toBe(api.placed().length);
  });
});

describe("explainer boxes", () => {
  const whyStage: StageState = { view: "micro-g", show_families: ["droplets"], coverage: true };
  const whyBeat = { story: "what-nasa-tested", scene: "what-nasa-tested-main", beat: "why-test", kind: "hook" as const };
  const revealStage: StageState = { view: "micro-g", show_families: allFamilies, reference: ["iss-air", "heo-dm-1006"] };
  const revealBeat = { story: "moon-air", scene: "moon-air-main", beat: "reveal", kind: "reveal" as const };

  it("explains the axes, a dot and the coverage once on the introducing page", () => {
    const { host, api } = setup(whyStage, initialState.sliders, {}, SIZE, "public", whyBeat);
    const boxes = [...host.querySelectorAll(".stage-explainers .exp")];
    expect(boxes.map((b) => b.getAttribute("data-for"))).toEqual(["axis", "dot", "coverage"]);
    const text = host.querySelector(".stage-explainers")!.textContent!;
    const { plotted, total } = api.coverage();
    expect(text).toContain(`${plotted} of ${total} tests`);
    for (const b of boxes) {
      expect(b.querySelector("h4")!.textContent!.length).toBeGreaterThan(0);
      expect(b.querySelectorAll("p").length).toBe(2);
    }
  });

  it("explains the Moon box and Earth air with moon.json numbers on the reveal", () => {
    const { host } = setup(revealStage, initialState.sliders, {}, SIZE, "public", revealBeat);
    const boxes = [...host.querySelectorAll(".stage-explainers .exp")];
    expect(boxes.map((b) => b.getAttribute("data-for"))).toEqual(["moon-box", "iss-air"]);
    const heo = moon.atmospheres.find((a) => a.id === "heo-dm-1006")!;
    const iss = moon.atmospheres.find((a) => a.id === "iss-air")!;
    const text = host.querySelector(".stage-explainers")!.textContent!;
    for (const v of [heo.pressure_kpa, heo.o2_pct_min, heo.o2_pct_max!, iss.pressure_kpa, iss.o2_pct_min]) {
      expect(text).toContain(String(v));
    }
  });

  it("links every explainer number with its unit to its moon.json source (task 32)", () => {
    const { host } = setup(revealStage, initialState.sliders, {}, SIZE, "public", revealBeat);
    const heo = moon.atmospheres.find((a) => a.id === "heo-dm-1006")!;
    const iss = moon.atmospheres.find((a) => a.id === "iss-air")!;
    const link = (box: string, text: string): HTMLAnchorElement => {
      const el = [...host.querySelectorAll(`.stage-explainers .exp[data-for="${box}"] .exp-what a`)].find(
        (a) => a.textContent === text,
      );
      expect(el, `${box} links ${text}`).not.toBeUndefined();
      return el as HTMLAnchorElement;
    };
    // the unit is inside the link, and the href is the atmosphere's own moon.json url
    expect(link("moon-box", `${heo.pressure_kpa} kPa`).getAttribute("href")).toBe(heo.url);
    expect(link("moon-box", String(heo.o2_pct_min)).getAttribute("href")).toBe(heo.url);
    expect(link("moon-box", String(heo.o2_pct_max)).getAttribute("href")).toBe(heo.url);
    expect(link("iss-air", `${iss.pressure_kpa} kPa`).getAttribute("href")).toBe(iss.url);
    expect(link("iss-air", String(iss.o2_pct_min)).getAttribute("href")).toBe(iss.url);
  });

  it("stays silent on other pages and lenses", () => {
    const otherBeat = { story: "what-nasa-tested", scene: "what-nasa-tested-main", beat: "droplets", kind: "reveal" as const };
    for (const [stage, beat, lens] of [
      [whyStage, otherBeat, "public"],
      [whyStage, whyBeat, "astronaut"],
      [revealStage, revealBeat, "analyst"],
    ] as const) {
      const { host } = setup(stage, initialState.sliders, {}, SIZE, lens, beat);
      expect(host.querySelector(".stage-explainers")!.hasAttribute("hidden")).toBe(true);
      expect(host.querySelectorAll(".stage-explainers .exp").length).toBe(0);
    }
  });
});

describe("linked selection", () => {
  const linkedSetup = () => setup({ view: "micro-g", show_families: allFamilies });
  const testDot = (host: HTMLElement, id: string) =>
    [...host.querySelectorAll('[data-layer="tests"] [data-id]')].find((d) => d.getAttribute("data-id") === id)!;

  it("clicking a dot selects its investigation and highlights its dots", () => {
    const { host, api } = linkedSetup();
    const placed = api.placed();
    const a = placed[0]!;
    const other = placed.find((p) => p.investigation !== a.investigation)!;
    const seen: (string | null)[] = [];
    window.addEventListener(SELECT_INVESTIGATION, (e) =>
      seen.push((e as CustomEvent<{ investigation: string | null }>).detail.investigation));
    const cls = (id: string) => testDot(host, id).getAttribute("class");
    expect(cls(a.id)).toBe("dot");
    testDot(host, a.id).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(seen).toEqual([a.investigation]);
    expect(cls(a.id)).not.toBe("dot");
    expect(cls(other.id)).toBe("dot");
    testDot(host, a.id).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(seen).toEqual([a.investigation, null]);
    expect(cls(a.id)).toBe("dot");
  });

  it("an incoming selection highlights dots without a store change", () => {
    const { host, store, api } = linkedSetup();
    const a = api.placed()[0]!;
    const before = store.get();
    window.dispatchEvent(new CustomEvent(SELECT_INVESTIGATION, { detail: { investigation: a.investigation } }));
    expect(store.get()).toBe(before);
    const dots = [...host.querySelectorAll('[data-layer="tests"] circle')];
    const same = dots.filter((d) => {
      const id = d.getAttribute("data-id")!;
      return id === a.id || id.startsWith(`${a.investigation}#`);
    });
    expect(same.length).toBeGreaterThan(0);
    expect(same.every((d) => d.getAttribute("class") !== "dot")).toBe(true);
    expect(dots.filter((d) => !same.includes(d)).every((d) => d.getAttribute("class") === "dot")).toBe(true);
  });
});

describe("three.js tilt", () => {
  it("stays on the SVG chart when WebGL is missing", () => {
    const host = document.createElement("div");
    mount(host, { api: fakeApi(), store: createStore(), dicts, t: makeT(() => "en") }, { size: SIZE });
    const ctx = { api: fakeApi(), store: createStore(), dicts, t: makeT(() => "en") };
    expect(mountTilt(host, ctx, () => {})).toBeNull();
  });

  it("stays on the SVG chart under reduced motion", () => {
    const real = (window as unknown as Record<string, unknown>)["matchMedia"];
    (window as unknown as Record<string, unknown>)["matchMedia"] = () => ({ matches: true });
    try {
      const host = document.createElement("div");
      const ctx = { api: fakeApi(), store: createStore(), dicts, t: makeT(() => "en") };
      expect(mountTilt(host, ctx, () => {})).toBeNull();
    } finally {
      if (real !== undefined) (window as unknown as Record<string, unknown>)["matchMedia"] = real;
      else delete (window as unknown as Record<string, unknown>)["matchMedia"];
    }
  });

  it("eases the camera over 600 ms from flat to tilted", () => {
    expect(TILT_MS).toBe(600);
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875);
    // flat: straight at the microgravity plane, chart-like; tilted: tipped to show all three planes
    const geo = tiltPlaneGeometry();
    const flat = tiltPose(0);
    const tilted = tiltPose(1);
    expect(flat.pos[0]).toBe(0);
    expect(flat.look).toEqual([0, geo.micro.center[1], geo.micro.center[2]]);
    expect(tilted.pos[1]).toBeLessThan(flat.pos[1]);
    expect(tilted.pos[2]).toBeGreaterThan(flat.pos[2]);
    expect(tilted.look).not.toEqual(flat.look);
  });

  it("runs the ease on the TILT_MS clock: halfway at 300 ms, done from 600 ms on", () => {
    expect(tiltProgress(0, 1, 0)).toBe(0);
    expect(tiltProgress(0, 1, 300)).toBe(0.5);
    expect(tiltProgress(0, 1, TILT_MS)).toBe(1);
    expect(tiltProgress(0, 1, TILT_MS + 400)).toBe(1);
    expect(tiltProgress(1, 0, 300)).toBe(0.5);
    expect(tiltProgress(1, 0, TILT_MS)).toBe(0);
  });

  it("keeps the SVG lunar band and a visible chart on tilt pages without WebGL", () => {
    const { host, layer } = setup(compareStage, null, {}, SIZE);
    expect(layer("lunar-band").querySelector("rect.lunar-band")).not.toBeNull();
    expect(host.querySelector(".stage-tilt")!.hasAttribute("hidden")).toBe(true);
    expect((host.querySelector(".stage-svg") as SVGSVGElement).style.display).not.toBe("none");
    expect(en["ui.stage.earth-line"]).toBe("Earth gravity (1 g)");
  });
});

describe("three.js tilt rebuild (task 20)", () => {
  it("the Analyst lens never gets the tilt: only public and astronaut on lunar pages", () => {
    expect(tiltAllowed("analyst", "tilt-lunar")).toBe(false);
    expect(tiltAllowed("public", "tilt-lunar")).toBe(true);
    expect(tiltAllowed("astronaut", "tilt-lunar")).toBe(true);
    expect(tiltAllowed("public", "micro-g")).toBe(false);
    expect(tiltAllowed("public", "empty")).toBe(false);
    expect(tiltAllowed("analyst", "micro-g")).toBe(false);
  });

  it("the Moon label comes from the beat annotation, with the plane label as fallback", () => {
    const t = (k: string) => `[${k}]`;
    expect(lunarLabelFor([{ id: "a", text_key: "story.x.annotation", at: "lunar-plane" }], t, "fallback")).toBe("[story.x.annotation]");
    expect(lunarLabelFor([], t, "fallback")).toBe("fallback");
    expect(lunarLabelFor([{ id: "b", text_key: "story.x.other", at: "moon-box" }], t, "fallback")).toBe("fallback");
  });

  it("colours dots exactly as the SVG chart: grey, blue for nearest, orange for kept burning", () => {
    expect(dotFill("burned", false)).toBe("burned");
    expect(dotFill("completion", false)).toBe("burned");
    expect(dotFill("flow-terminated", false)).toBe("burned");
    expect(dotFill("extinction", false)).toBe("muted");
    expect(dotFill("self-extinguished", false)).toBe("muted");
    expect(dotFill("disruption", false)).toBe("muted");
    expect(dotFill("no-ignition", false)).toBe("muted");
    expect(dotFill("unknown", false)).toBe("muted");
    expect(dotFill("burned", true)).toBe("near");
    expect(dotFill("extinction", true)).toBe("near");
  });

  it("draws every dot at least 5 px on screen, nearest larger", () => {
    expect(dotSizePx(false)).toBeGreaterThanOrEqual(5);
    expect(dotSizePx(true)).toBeGreaterThan(dotSizePx(false));
  });

  it("puts the Moon box at the moon.json pressure and across the whole oxygen band", () => {
    const s = chartScales({ w: 500, h: 464 }, { min: 0, max: 100, ticks: [0, 100] }, { bandH: 0, headH: 20, strip: false });
    const atm = moon.atmospheres.find((a) => a.id === "heo-dm-1006")!;
    expect([atm.pressure_kpa, atm.o2_pct_min, atm.o2_pct_max]).toEqual([56.5, 33.7, 40]);
    const toWorld = chartToWorld(s);
    const box = moonBoxWorld(atm, s);
    expect(box.w).toBeGreaterThan(0);
    expect(box.top).toBeGreaterThan(box.bottom);
    expect(box.cx).toBeCloseTo(toWorld(s.x(56.5), 0)[0], 10);
    expect(box.top).toBeCloseTo(toWorld(0, s.y(40))[1], 10);
    expect(box.bottom).toBeCloseTo(toWorld(0, s.y(33.7))[1], 10);
  });

  it("frames all three planes inside the stage box with the Moon plane in the middle", () => {
    for (const size of [{ w: 900, h: 600 }, { w: 688, h: 700 }, { w: 600, h: 800 }]) {
      const camera = tiltCamera(tiltPose(1, size.w / size.h), size.w / size.h);
      camera.updateMatrixWorld();
      const ndc = (p: readonly [number, number, number]): THREE.Vector3 => new THREE.Vector3(...p).project(camera);
      const geo = tiltPlaneGeometry();
      for (const plane of Object.values(geo)) {
        for (const c of [...plane.corners, plane.center]) {
          const v = ndc(c);
          expect(v.x).toBeGreaterThanOrEqual(-1);
          expect(v.x).toBeLessThanOrEqual(1);
          expect(v.y).toBeGreaterThanOrEqual(-1);
          expect(v.y).toBeLessThanOrEqual(1);
        }
      }
      // the Moon plane sits in the middle of the frame, the micro plane above it
      expect(Math.abs(ndc(geo.lunar.center).y)).toBeLessThan(0.4);
      expect(ndc(geo.micro.center).y).toBeGreaterThan(ndc(geo.lunar.center).y);
      expect(ndc(geo.earth.center).y).toBeLessThan(ndc(geo.lunar.center).y);
      // labels sit just outside their plane corners: keep room so they are not clipped
      for (const plane of [geo.micro, geo.lunar, geo.earth]) {
        expect(ndc(plane.corners[3]).y).toBeLessThan(0.85); // top-left corner, label above
        expect(ndc(plane.corners[0]).y).toBeGreaterThan(-0.85); // bottom-left corner, labels below
      }
    }
  });

  const tiltColors: TiltColors = { ground: "#111111", edge: "#222222", muted: "#333333", near: "#444444", burned: "#555555", moon: "#666666", ink: "#777777" };
  const tiltTexts: TiltLabels = { micro: "Every NASA test so far", lunar: "No fire test has run in Moon gravity.", earth: "Earth gravity (1 g)", x: "Air pressure (kPa)", y: "Oxygen in the air (%)", you: "Your air" };
  const tiltScales = () => chartScales({ w: 500, h: 464 }, { min: 0, max: 100, ticks: [0, 100] }, { bandH: 0, headH: 20, strip: false });

  it("builds three filled planes with clear edges, dots only on the micro plane, the Moon box alone on the lunar plane", () => {
    const view = buildTiltScene(tiltColors, tiltTexts);
    try {
      const mesh = (name: string): THREE.Mesh => {
        const o = view.scene.getObjectByName(name);
        expect(o).toBeTruthy();
        return o as THREE.Mesh;
      };
      expect(mesh("plane-micro").geometry.type).toBe("PlaneGeometry");
      expect(mesh("plane-lunar").geometry.type).toBe("PlaneGeometry");
      expect(mesh("plane-earth").geometry.type).toBe("PlaneGeometry");
      expect(view.scene.getObjectByName("edge-micro")).toBeTruthy();
      expect(view.scene.getObjectByName("edge-lunar")).toBeTruthy();
      expect(view.scene.getObjectByName("edge-earth")).toBeTruthy();
      // Earth is a thin reference strip, not a full plane
      const earthH = (mesh("plane-earth").geometry as THREE.PlaneGeometry).parameters.height;
      const microH = (mesh("plane-micro").geometry as THREE.PlaneGeometry).parameters.height;
      expect(earthH).toBeLessThan(microH);
      const s = tiltScales();
      const cw = chartToWorld(s);
      const dataToWorld = (p: number, o: number): [number, number] => cw(s.x(p), s.y(o));
      const atm = moon.atmospheres.find((a) => a.id === "heo-dm-1006")!;
      view.setDots(
        [
          { id: "a", outcome: "burned", pressure_kpa: 60, o2_pct: 30 } as PlacedTest,
          { id: "b", outcome: "extinction", pressure_kpa: 50, o2_pct: 25 } as PlacedTest,
        ],
        new Set(["b"]),
        { toWorld: dataToWorld, box: moonBoxWorld(atm, s), you: null },
        tiltTexts,
      );
      const kids = (name: string): string[] => (view.scene.getObjectByName(name)?.children ?? []).map((c) => c.name);
      // the real tests live on the micro plane: one orange kept-burning dot, one blue nearest dot
      expect(kids("group-micro")).toEqual(expect.arrayContaining(["plane-micro", "edge-micro", "dots-muted", "dots-burned", "dots-near"]));
      const count = (name: string): number => (view.scene.getObjectByName(name) as THREE.Points).geometry.getAttribute("position").count;
      expect(count("dots-burned")).toBe(1);
      expect(count("dots-near")).toBe(1);
      expect(count("dots-muted")).toBe(0);
      expect(((view.scene.getObjectByName("dots-burned") as THREE.Points).material as THREE.PointsMaterial).color.getStyle()).toBe(new THREE.Color(tiltColors.burned).getStyle());
      expect(((view.scene.getObjectByName("dots-near") as THREE.Points).material as THREE.PointsMaterial).color.getStyle()).toBe(new THREE.Color(tiltColors.near).getStyle());
      // the Moon box is the ONLY thing on the lunar plane: no dots, no marks
      expect(kids("group-lunar")).toEqual(expect.arrayContaining(["plane-lunar", "edge-lunar", "moon-box"]));
      expect(view.scene.getObjectByName("group-lunar")!.children.filter((c) => c.type === "Points")).toEqual([]);
      expect(((view.scene.getObjectByName("moon-box") as THREE.Mesh).material as THREE.MeshBasicMaterial).color.getStyle()).toBe(new THREE.Color(tiltColors.moon).getStyle());
      // every plane carries a large HTML label fixed to it, plus the axis titles
      const label = (cls: string): HTMLElement => {
        const el = view.element.querySelector(`.tilt-label.${cls}`) as HTMLElement | null;
        expect(el).not.toBeNull();
        return el!;
      };
      expect(label("plane-micro").textContent).toBe(tiltTexts.micro);
      expect(label("plane-lunar").textContent).toBe(tiltTexts.lunar);
      expect(label("plane-earth").textContent).toBe(tiltTexts.earth);
      expect(label("axis-x").textContent).toBe(tiltTexts.x);
      expect(label("axis-y").textContent).toBe(tiltTexts.y);
      view.setFrame(800, 600);
      view.setPose(1);
      for (const cls of ["plane-micro", "plane-lunar", "plane-earth", "axis-x", "axis-y"]) {
        const el = label(cls);
        expect(el.style.left).toMatch(/px$/);
        expect(el.style.top).toMatch(/px$/);
        expect(Number.isFinite(parseFloat(el.style.left))).toBe(true);
      }
      // without sliders there is no "your air" mark
      expect(view.scene.getObjectByName("you-mark")).toBeUndefined();
      expect(label("you").hidden).toBe(true);
    } finally {
      view.dispose();
    }
  });

  it("draws the your-air mark on the micro plane when the sliders are live", () => {
    const view = buildTiltScene(tiltColors, tiltTexts);
    try {
      const s = tiltScales();
      const cw = chartToWorld(s);
      view.setDots([], new Set(), { toWorld: (p, o) => cw(s.x(p), s.y(o)), box: null, you: cw(s.x(56.5), s.y(34)) }, tiltTexts);
      expect(view.scene.getObjectByName("you-mark")).not.toBeUndefined();
      const you = view.element.querySelector(".tilt-label.you") as HTMLElement;
      expect(you.hidden).toBe(false);
      expect(you.textContent).toBe(tiltTexts.you);
    } finally {
      view.dispose();
    }
  });
});

describe("tilt label placement (task 28)", () => {
  // the real words on the tilt pages (en); sizes stand in for offsetWidth/offsetHeight,
  // which jsdom cannot measure (20 px bold plane labels, 12 px axis titles).
  // The lunar label wraps at the plot edge (max-width: 100%): model the wrapped box.
  const specsFor = (project: (group: "micro" | "lunar" | "earth", local: readonly [number, number, number]) => { x: number; y: number }, frameW: number): TiltLabelSpec[] => {
    const defs = tiltLabelAnchors();
    const lunarW = Math.min(frameW, 650);
    const words: Record<TiltLabelId, { text: string; w: number; h: number }> = {
      micro: { text: "NASA tests with the air recorded", w: 360, h: 30 },
      lunar: { text: "None of the tests in NASA's PSI archive ran in Moon gravity.", w: lunarW, h: 30 * Math.ceil(650 / lunarW) },
      earth: { text: "Earth gravity (1 g)", w: 200, h: 30 },
      x: { text: "Air pressure (kPa)", w: 130, h: 22 },
      y: { text: "Oxygen in the air (%)", w: 150, h: 22 },
      you: { text: "Your air", w: 60, h: 22 },
    };
    return (Object.keys(words) as TiltLabelId[])
      .filter((id): id is TiltFixedLabelId => id !== "you") // hidden without live sliders: placed nowhere
      .map((id) => ({ id, anchor: project(defs[id].group, defs[id].local), ...words[id] }));
  };
  const projectAt = (w: number, h: number) => {
    const camera = tiltCamera(tiltPose(1, w / h), w / h);
    camera.updateMatrixWorld();
    const off = { micro: TILT_Y.micro, lunar: TILT_Y.lunar, earth: TILT_Y.earth };
    const offZ = { micro: TILT_Z.micro, lunar: TILT_Z.lunar, earth: TILT_Z.earth };
    return (group: "micro" | "lunar" | "earth", local: readonly [number, number, number]): { x: number; y: number } => {
      const v = new THREE.Vector3(local[0], off[group] + local[1], offZ[group] + local[2]).project(camera);
      return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h };
    };
  };
  const inside = (frame: { w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean =>
    b.x >= 0 && b.y >= 0 && b.x + b.w <= frame.w && b.y + b.h <= frame.h;
  const disjoint = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean =>
    a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;

  for (const frame of [{ w: 900, h: 600 }, { w: 688, h: 700 }, { w: 600, h: 800 }]) {
    it(`gives every label its own place inside ${frame.w}x${frame.h}: none clipped, none overlapping`, () => {
      const boxes = tiltLabelBoxes(frame, specsFor(projectAt(frame.w, frame.h), frame.w));
      expect(boxes.map((b) => b.id).sort()).toEqual(["earth", "micro", "x", "y", "lunar"].sort());
      for (const b of boxes) expect(inside(frame, b)).toBe(true);
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(disjoint(boxes[i]!, boxes[j]!)).toBe(true);
      // the two reported defects: the Moon-plane label cut off on the right, the oxygen title clipped on the left
      const lunar = boxes.find((b) => b.id === "lunar")!;
      expect(lunar.x + lunar.w).toBeLessThanOrEqual(frame.w);
      const yAxis = boxes.find((b) => b.id === "y")!;
      expect(yAxis.x).toBeGreaterThanOrEqual(0);
    });
  }

  it("the scene puts its HTML labels exactly where the placement says (jsdom: zero-size boxes)", () => {
    const colors: TiltColors = { ground: "#111111", edge: "#222222", muted: "#333333", near: "#444444", burned: "#555555", moon: "#666666", ink: "#777777" };
    const texts: TiltLabels = { micro: "m", lunar: "l", earth: "e", x: "x", y: "y", you: "you" };
    const view = buildTiltScene(colors, texts);
    try {
      view.setDots([], new Set(), { toWorld: () => [0, 0], box: null, you: null }, texts);
      view.setFrame(800, 600);
      view.setPose(1);
      const frame = { w: 800, h: 600 };
      const expected = tiltLabelBoxes(frame, specsFor(projectAt(800, 600), 800).map((s) => ({ ...s, w: 0, h: 0 })));
      for (const box of expected) {
        const cls = box.id === "micro" ? "plane-micro" : box.id === "lunar" ? "plane-lunar" : box.id === "earth" ? "plane-earth" : box.id === "x" ? "axis-x" : "axis-y";
        const el = view.element.querySelector(`.tilt-label.${cls}`) as HTMLElement;
        // the scene writes toFixed(1) and jsdom normalises "400.0px" to "400px": compare the rounded numbers
        expect(parseFloat(el.style.left)).toBe(parseFloat(box.x.toFixed(1)));
        expect(parseFloat(el.style.top)).toBe(parseFloat(box.y.toFixed(1)));
      }
    } finally {
      view.dispose();
    }
  });

  it("the Moon box uses exactly the micro-plane mapping for the moon.json values", () => {
    const atm = moon.atmospheres.find((a) => a.id === "heo-dm-1006")!;
    expect([atm.pressure_kpa, atm.o2_pct_min, atm.o2_pct_max]).toEqual([56.5, 33.7, 40]);
    for (const dom of [
      { min: 0, max: 350, ticks: [0, 350] }, // the real span: slider range plus the 331 kPa tests
      { min: 0, max: 120, ticks: [0, 120] }, // slider widening only
      { min: 40, max: 80, ticks: [40, 80] }, // a narrow zoom: agreement must not depend on the domain
    ]) {
      const s = chartScales({ w: 688, h: 700 }, dom, { bandH: 0, headH: 20, strip: false });
      const toWorld = chartToWorld(s);
      const box = moonBoxWorld(atm, s);
      // a dot at the Moon air's own numbers lands exactly on the box corners
      expect(box.cx).toBeCloseTo(toWorld(s.x(56.5), 0)[0], 10);
      expect(box.top).toBeCloseTo(toWorld(0, s.y(40))[1], 10);
      expect(box.bottom).toBeCloseTo(toWorld(0, s.y(33.7))[1], 10);
      // the box sits on the lunar plane itself, clear of every edge
      expect(box.cx - box.w / 2).toBeGreaterThan(-TILT_W / 2);
      expect(box.cx + box.w / 2).toBeLessThan(TILT_W / 2);
      expect(box.bottom).toBeGreaterThan(-TILT_H / 2 + 1);
      expect(box.top).toBeLessThan(TILT_H / 2 - 1);
    }
  });
});

describe("every plotted count links to the data file", () => {
  const full: StageState = { view: "micro-g", show_families: allFamilies, coverage: true };

  it("the coverage line links its numbers to the tests file", () => {
    const { host, api } = setup(full);
    const { plotted, total } = api.coverage();
    const links = [...host.querySelectorAll(".stage-legend .coverage a")];
    expect(links.map((a) => a.textContent)).toEqual([String(plotted), String(total)]);
    for (const a of links) {
      expect((a as HTMLAnchorElement).getAttribute("href")).toBe("data/tests.json");
      expect(a.hasAttribute("download")).toBe(true);
    }
  });

  it("the parade counts link to the data file", () => {
    const { host } = setup(full);
    const num = host.querySelector(".parade-num")!;
    expect(num.tagName).toBe("A");
    expect((num as HTMLAnchorElement).getAttribute("href")).toBe("data/tests.json");
    const rows = [...host.querySelectorAll(".parade-families li")];
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      const a = r.querySelector("a.parade-n")!;
      expect(a.getAttribute("href")).toBe("data/tests.json");
    }
  });
});

describe("act 1 public picture layout (task 21)", () => {
  const hook = { view: "incident", incident_ids: ["apollo-1"] } as StageState;
  const reveal = { view: "incident", incident_ids: ["apollo-1", "mir-1997"] } as StageState;

  it("maps a dial marker to the flame's standing height: Apollo's 100 % mark stands the flame at the top", () => {
    // dial viewBox is 560 high with y(100) = 28: (560 - 28) / 560 = 0.95
    expect(markerBottomFraction(100)).toBeCloseTo(0.95, 10);
    expect(markerBottomFraction(0)).toBeCloseTo((560 - 524) / 560, 10);
  });

  it("reserves headroom for the flame's overhang: a tall flame at the 100 % mark needs 179 px", () => {
    // tall flame 190, dial 224 high, mark at 0.95: 190 - 0.05 * 224 = 178.8, rounded up
    expect(flameStandPad(100, true)).toBe(179);
    expect(flameStandPad(0, true)).toBe(0);
    expect(flameStandPad(undefined, false)).toBe(0);
  });

  it("the hook page shows Apollo 1 alone with the flame standing at the dial's 100 % mark", () => {
    const { host } = setup(hook, null, {}, SIZE);
    const cards = [...host.querySelectorAll(".stage-incidents article.incident-card")];
    expect(cards.map((c) => c.querySelector("h3")!.textContent)).toEqual(["Apollo 1"]);
    const flame = host.querySelector(".flame-at-mark") as HTMLElement;
    expect(flame).not.toBeNull();
    expect(flame.style.bottom).toBe("95%");
    expect((host.querySelector(".picture-side") as HTMLElement).style.getPropertyValue("--flame-overhang")).toBe("179px");
  });

  it("the reveal page shows both incidents as two compact cards, flame still at Apollo's mark", () => {
    const { host } = setup(reveal, null, {}, SIZE);
    expect(host.querySelector('.stage-incidents')!.getAttribute("data-count")).toBe("2");
    const cards = [...host.querySelectorAll(".stage-incidents article.incident-card")];
    expect(cards.map((c) => c.querySelector("h3")!.textContent)).toEqual(["Apollo 1", "Mir oxygen generator fire"]);
    expect((host.querySelector(".flame-at-mark") as HTMLElement).style.bottom).toBe("95%");
  });

  it("an incident with no oxygen number leaves the flame on the ground", () => {
    const { host } = setup({ view: "incident", incident_ids: ["mir-1997"] } as StageState, null, {}, SIZE);
    expect((host.querySelector(".flame-at-mark") as HTMLElement).style.bottom).toBe("0%");
  });

  it("other lenses keep the plain cards with no picture side", () => {
    const { host } = setup(hook, null, {}, SIZE, "astronaut");
    expect(host.querySelector(".picture-side")).toBeNull();
    expect(host.querySelector(".flame-at-mark")).toBeNull();
    expect(host.querySelector("article.incident-card h3")!.textContent).toBe("Apollo 1");
  });

  it("stylesheet lays the picture out inside the stage box: narrow dial, side column with room for the flame, compact cards", () => {
    expect(css).toMatch(/\.public-picture \.o2-dial\s*\{[^}]*width:\s*120px/);
    expect(css).toMatch(/\.picture-side\s*\{[^}]*width:\s*251px/);
    expect(css).toMatch(/\.flame-at-mark\s*\{[^}]*position:\s*absolute/);
    expect(css).toMatch(/\.public-picture \.incident-card\s*\{[^}]*font-size:\s*16px/);
    expect(css).toMatch(/\.stage-incidents\.public-picture\[data-count="2"\]\s*\{[^}]*251px minmax\(0,\s*1fr\) minmax\(0,\s*1fr\)/);
    expect(css).toMatch(/\.picture-side\s*\{[^}]*padding-top:\s*var\(--flame-overhang/);
  });
});

describe("plain air names (task 22)", () => {
  const moonRef = { view: "micro-g", show_families: allFamilies, reference: ["heo-dm-1006"] } as StageState;
  it("the dial marks speak plain words in Public; other lenses show no dial", () => {
    const pub = setup({ view: "incident", incident_ids: ["apollo-1"] } as StageState, null, {}, SIZE);
    const marks = [...pub.host.querySelectorAll(".dial-mark")].map((n) => n.textContent);
    expect(marks.some((m) => m!.includes("Planned Moon-base air"))).toBe(true);
    expect(marks.some((m) => m!.includes("HEO-DM-1006"))).toBe(false);
    const astro = setup({ view: "incident", incident_ids: ["apollo-1"] } as StageState, null, {}, SIZE, "astronaut");
    expect(astro.host.querySelectorAll(".dial-mark").length).toBe(0);
  });
  it("names the second exploration air without claiming a sequence (task 33)", () => {
    // moon.json and STORY.md do not support "earlier stage": it is just another planned air
    expect(en["ui.air.exp-10-2"]).toBe("A second planned exploration air");
  });
  it("the legend names the Moon box plainly in Public and from moon.json for Analyst", () => {
    const pub = setup(moonRef, null, {}, SIZE);
    expect(pub.host.querySelector(".stage-legend")!.textContent).toContain("Planned Moon-base air");
    expect(pub.host.querySelector(".stage-legend")!.textContent).not.toContain("HEO-DM-1006");
    const ana = setup(moonRef, null, {}, SIZE, "analyst");
    expect(ana.host.querySelector(".stage-legend")!.textContent).toContain("Exploration atmosphere HEO-DM-1006 (8.2 psia)");
  });
});

describe("incidentO2", () => {
  it("reads the leading oxygen number of the incident's own words, else null", () => {
    expect(incidentO2("100% oxygen at pressure")).toBe(100);
    expect(incidentO2("26.5% nominal")).toBe(26.5);
    expect(incidentO2("Chemical oxygen generator (lithium perchlorate candle)")).toBeNull();
    expect(incidentO2("120% oxygen")).toBeNull();
  });
});

describe("family parade", () => {
  const act2 = (show_families: Family[]): StageState => ({ view: "micro-g", show_families, coverage: true });
  const full: StageState = { view: "micro-g", show_families: allFamilies, coverage: true };

  it("lists one pictogram and plain-word name per shown family, with its plotted count", () => {
    const { host, api } = setup(act2(["droplets"]));
    const parade = host.querySelector(".stage-parade")!;
    expect((parade as HTMLElement).hidden).toBe(false);
    const rows = [...parade.querySelectorAll(".parade-families li")];
    expect(rows.length).toBe(1);
    expect(rows[0]!.querySelector("svg")).not.toBeNull();
    expect(rows[0]!.textContent).toContain(en["ui.family.droplets"]);
    const n = api.placed().filter((p) => p.family === "droplets").length;
    expect(n).toBeGreaterThan(0);
    expect(rows[0]!.textContent).toContain(en["ui.stage.parade.plotted"]!.replace("{n}", String(n)));
  });

  it("counts up to the shown plotted count, the real total once every family has arrived", async () => {
    const one = setup(act2(["droplets"]));
    const oneTarget = one.api.placed().filter((p) => p.family === "droplets").length;
    expect(one.host.querySelector(".parade-num")!.getAttribute("data-count")).toBe(String(oneTarget));
    const all = setup(full);
    expect(all.host.querySelector(".parade-num")!.getAttribute("data-count")).toBe(String(all.api.coverage().plotted));
    await new Promise((r) => setTimeout(r, 900));
    expect(one.host.querySelector(".parade-num")!.textContent).toBe(String(oneTarget));
    expect(all.host.querySelector(".parade-num")!.textContent).toBe(String(all.api.coverage().plotted));
  });

  it("families with no pressure recorded show their listed count, never dots", () => {
    const smokeRow: NotPlacedRow = {
      id: "PSI-101#1", investigation: "PSI-101", family: "smoke detection", fuel: null,
      o2_pct: null, pressure_kpa: null, outcome: "unknown", url: "https://example.test", reason: "no oxygen or pressure recorded",
    };
    const { host, api } = setup(act2(["droplets", "smoke detection"]), initialState.sliders, { notPlaced: [smokeRow] });
    const rows = [...host.querySelectorAll(".parade-families li")];
    expect(rows.length).toBe(2);
    const smoke = rows.find((r) => r.textContent!.includes(en["ui.family.smoke detection"]!))!;
    expect(api.placed().filter((p) => p.family === "smoke detection").length).toBe(0);
    const listed = api.notPlaced("smoke detection").length;
    expect(listed).toBeGreaterThan(0);
    expect(smoke.textContent).toContain(en["ui.stage.parade.listed"]!.replace("{n}", String(listed)));
  });

  it("stays off the Moon-box and slider pages, and off other lenses", () => {
    for (const stage of [
      { ...full, reference: ["heo-dm-1006" as const] },
      { ...full, sliders: { pressure_kpa: 56.5, o2_pct: 34 } },
    ]) {
      expect(setup(stage).host.querySelector(".stage-parade")!.hasAttribute("hidden")).toBe(true);
      expect(setup(stage).host.querySelector(".stage-parade")!.children.length).toBe(0);
    }
    expect(setup(full, initialState.sliders, {}, SIZE, "astronaut").host.querySelector(".parade-num")).toBeNull();
  });

  it("is still and complete under reduced motion", () => {
    const real = (window as unknown as Record<string, unknown>)["matchMedia"];
    (window as unknown as Record<string, unknown>)["matchMedia"] = () => ({ matches: true });
    try {
      const { host, api } = setup(full);
      const target = api.coverage().plotted;
      expect(host.querySelector(".parade-num")!.textContent).toBe(String(target));
    } finally {
      if (real !== undefined) (window as unknown as Record<string, unknown>)["matchMedia"] = real;
      else delete (window as unknown as Record<string, unknown>)["matchMedia"];
    }
  });

  it("uses flat token colour, never yellow", () => {
    const { host } = setup(full);
    expect(host.querySelector(".stage-parade")!.innerHTML).not.toContain("--moon");
    expect(host.querySelector(".stage-parade")!.innerHTML).not.toContain("#e7f434");
    const rules = css.match(/\.(stage-parade|parade-[a-z-]+)[^{]*\{[^}]*\}/g) ?? [];
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.join("")).not.toContain("--moon");
  });
});

// @vitest-environment jsdom
// Tests for the SVG stage, driven by the real golden files. Generated with Claude, SI-assisted.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { AtmosphereId, DataApi, Experiment, Family, IncidentsData, Lens, MoonData, NearestQuery, NotPlacedRow, PlacedTest, StageState, Story, TestRun } from "../contract";
import { dicts, makeT } from "../i18n/index";
import { createStore, initialState } from "../store";
import { SELECT_INVESTIGATION, mount } from "./index";
import { chartScales, niceRange, overlaps, wrap } from "./layout";
import type { Rect } from "./layout";
import { dotKind, noPressureRows, refShape } from "./plan";
import type { RefPlan } from "./plan";
import { DIAL_IDS, incidentO2 } from "./picture";
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
function setup(stage = initialState.stage, sliders = initialState.sliders, extra: Extra = {}, size = SIZE, lens: Lens = "public") {
  const api = fakeApi(extra);
  const store = createStore({ ...initialState, stage, sliders, lens });
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
      const placed = layoutRefs(allRefs, s, annotations, t);
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

// Pure "what to draw" decisions for the stage (no DOM). Generated with Claude, SI-assisted.
import { OUTCOME_GROUP } from "../contract";
import type { Atmosphere, DataApi, Family, Lens, NotPlacedRow, Outcome, PlacedTest, StageState } from "../contract";
import { airName } from "../ui/dom";

/** default = quiet grey (not highlighted). Highlighted tests: burned = orange, went-out = hollow blue,
 *  other = filled blue (the record says neither burned nor went out). */
export type DotKind = "default" | "burned" | "went-out" | "other";

/** Tests drawn on the grey layer: only the families the beat has revealed (omitted/empty = none). */
export function drawnTests(stage: StageState, placed: PlacedTest[]): PlacedTest[] {
  if (!stage.show_families?.length) return [];
  const families = new Set(stage.show_families);
  return placed.filter((t) => families.has(t.family));
}

/** Highlight criteria that are given must all match (family AND investigation AND test_ids).
 *  A test that matches is coloured by what its record says; every other test stays "default". */
export function dotKind(t: { id: string; investigation: string; family: Family | null; outcome: Outcome }, h: StageState["highlight"]): DotKind {
  if (!h || !(h.family || h.investigation || h.test_ids)) return "default";
  if (h.family && t.family !== h.family) return "default";
  if (h.investigation && t.investigation !== h.investigation) return "default";
  if (h.test_ids && !h.test_ids.includes(t.id)) return "default";
  return OUTCOME_GROUP[t.outcome];
}

export type RefShape = "moon-box" | "open" | "marker" | "bar";
export interface RefBand { atm: Atmosphere; shape: RefShape }

export function refShape(a: Atmosphere): RefShape {
  if (a.id === "heo-dm-1006") return "moon-box";
  if (a.o2_pct_max === null) return "open";
  if (a.o2_pct_max === a.o2_pct_min) return "marker";
  return "bar";
}

export interface RefPlan {
  bands: RefBand[];
  paper: { name: string; pressure_kpa: number; o2_pct: number }[];
}

/** Atmospheres and paper tests named by stage.reference. An id moon.json does not have is skipped. */
export function planReferences(stage: StageState, api: DataApi): RefPlan {
  const bands: RefBand[] = [];
  let paper: RefPlan["paper"] = [];
  for (const id of stage.reference ?? []) {
    if (id === "saffire-vi") { paper = api.data.moon.paper_tests.points; continue; }
    try {
      const atm = api.atmosphere(id);
      bands.push({ atm, shape: refShape(atm) });
    } catch (err) {
      console.warn(`stage: unknown reference ${id}`, err);
    }
  }
  return { bands, paper };
}

/** Pressures the x axis must reach: the tests drawn now, every drawn reference and, while the sliders
 *  are live, the slider range. With no test drawn yet it frames every placed test instead, so a beat that
 *  shows only a reference does not get a one-point axis and the first reveal does not rescale it.
 *  extra = pressures that must also fit (nearest tests found outside the range). */
export function pressuresForDomain(drawn: PlacedTest[], placed: PlacedTest[], refs: RefPlan, sliders: [number, number] | null, extra: number[] = []): number[] {
  return [
    ...(drawn.length ? drawn : placed).map((t) => t.pressure_kpa),
    ...refs.bands.map((b) => b.atm.pressure_kpa),
    ...refs.paper.map((p) => p.pressure_kpa),
    ...(sliders ?? []),
    ...extra,
  ];
}

/** Tests with oxygen recorded but no pressure, in the families the beat has revealed.
 *  They are never given an x position. */
export function noPressureRows(stage: StageState, rows: NotPlacedRow[]): (NotPlacedRow & { o2_pct: number })[] {
  if (!stage.show_families?.length) return [];
  const families = new Set<Family>(stage.show_families);
  return rows.filter((r): r is NotPlacedRow & { o2_pct: number } => r.reason === "no pressure recorded" && r.o2_pct !== null && r.family !== null && families.has(r.family));
}

export type Swatch = DotKind | "nearest" | "tick" | "paper" | "moon" | "ref" | "open" | "you";
export interface LegendItem { swatch: Swatch; text: string }

/** Legend in words, only for what is on screen right now. Atmosphere names are plain words in Public. */
export function legendItems(
  t: (key: string) => string,
  drawn: { kinds: ReadonlySet<DotKind>; nearest: boolean; refs: RefPlan; you: boolean; noPressure: number },
  lens: Lens,
): LegendItem[] {
  const items: LegendItem[] = [];
  if (drawn.kinds.has("default")) items.push({ swatch: "default", text: t("ui.stage.legend.other") });
  if (drawn.nearest) items.push({ swatch: "nearest", text: t("ui.stage.legend.nearest") });
  if (drawn.kinds.has("other")) items.push({ swatch: "other", text: t("ui.stage.legend.highlight") });
  if (drawn.kinds.has("burned")) items.push({ swatch: "burned", text: t("ui.stage.legend.burned") });
  if (drawn.kinds.has("went-out")) items.push({ swatch: "went-out", text: t("ui.stage.legend.went-out") });
  if (drawn.noPressure > 0) items.push({ swatch: "tick", text: `${t("ui.stage.no-pressure")}: ${drawn.noPressure}` });
  if (drawn.refs.paper.length) items.push({ swatch: "paper", text: t("ui.stage.legend.paper") });
  for (const b of drawn.refs.bands) {
    const swatch: Swatch = b.shape === "moon-box" ? "moon" : b.shape === "open" ? "open" : "ref";
    const name = airName(lens, b.atm, t);
    items.push({ swatch, text: b.shape === "open" ? `${name}. ${t("ui.stage.legend.open-band")}` : name });
  }
  if (drawn.you) items.push({ swatch: "you", text: t("ui.stage.your-air") });
  return items;
}

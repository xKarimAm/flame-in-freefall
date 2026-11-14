// Pure "what to draw" decisions for the stage (no DOM). Generated with Claude, SI-assisted.
import { OUTCOME_GROUP } from "../contract";
import type { Atmosphere, DataApi, PlacedTest, StageState } from "../contract";

/** default = quiet grey; burned/went-out colour by recorded outcome; other = grey at full opacity */
export type DotKind = "default" | "burned" | "went-out" | "other";

/** Tests drawn on the grey layer: only the families the beat has revealed (omitted/empty = none). */
export function drawnTests(stage: StageState, placed: PlacedTest[]): PlacedTest[] {
  if (!stage.show_families?.length) return [];
  const families = new Set(stage.show_families);
  return placed.filter((t) => families.has(t.family));
}

/** Highlight criteria that are given must all match (family AND investigation AND test_ids).
 *  A test that matches is coloured by what its record says; every other test stays "default". */
export function dotKind(t: PlacedTest, h: StageState["highlight"]): DotKind {
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

/** Pressures the x axis must reach: every placed test (so the axis does not jump as families
 *  appear), every drawn reference, and the slider maximum while the sliders are live. */
export function pressuresForDomain(placed: PlacedTest[], refs: RefPlan, sliderMax: number | null): number[] {
  return [
    ...placed.map((t) => t.pressure_kpa),
    ...refs.bands.map((b) => b.atm.pressure_kpa),
    ...refs.paper.map((p) => p.pressure_kpa),
    ...(sliderMax === null ? [] : [sliderMax]),
  ];
}

export type Swatch = DotKind | "nearest" | "paper" | "moon" | "ref" | "open" | "you";
export interface LegendItem { swatch: Swatch; text: string }

/** Legend in words, only for what is on screen right now. */
export function legendItems(
  t: (key: string) => string,
  drawn: { kinds: ReadonlySet<DotKind>; nearest: boolean; refs: RefPlan; you: boolean },
): LegendItem[] {
  const items: LegendItem[] = [];
  if (drawn.kinds.has("default") || drawn.kinds.has("other")) items.push({ swatch: "default", text: t("ui.stage.legend.other") });
  if (drawn.nearest) items.push({ swatch: "nearest", text: t("ui.stage.legend.nearest") });
  if (drawn.kinds.has("burned")) items.push({ swatch: "burned", text: t("ui.stage.legend.burned") });
  if (drawn.kinds.has("went-out")) items.push({ swatch: "went-out", text: t("ui.stage.legend.went-out") });
  if (drawn.refs.paper.length) items.push({ swatch: "paper", text: t("ui.stage.legend.paper") });
  for (const b of drawn.refs.bands) {
    const swatch: Swatch = b.shape === "moon-box" ? "moon" : b.shape === "open" ? "open" : "ref";
    items.push({ swatch, text: b.shape === "open" ? `${b.atm.name}. ${t("ui.stage.legend.open-band")}` : b.atm.name });
  }
  if (drawn.you) items.push({ swatch: "you", text: t("ui.stage.your-air") });
  return items;
}

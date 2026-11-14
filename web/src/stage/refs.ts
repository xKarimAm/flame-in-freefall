// Where the reference atmospheres, the paper tests and their word labels go (no DOM).
// Generated with Claude, SI-assisted.
import type { StageState } from "../contract";
import { placeLabel, textSize, wrap } from "./layout";
import type { LabelPlace, Rect, Scales } from "./layout";
import type { RefPlan, RefShape } from "./plan";

export const BAR_W = 12; // fixed pixel width of reference bars
export const DIAMOND = 5; // half-size of a paper-test diamond
const WRAP_CHARS = 24;

export interface PlacedRef {
  /** atmosphere id, or "saffire-vi" for the paper tests */
  id: string;
  shape: RefShape | "paper";
  /** the bar (or the box around all paper diamonds), in SVG pixels */
  bar: Rect;
  lines: string[];
  place: LabelPlace;
}

/** Plain-words labels, placed one after another (Moon box first) so none overlaps another label,
 *  any reference bar, or the plot edge (see placeLabel). Order of the result = drawing order. */
export function layoutRefs(
  refs: RefPlan,
  s: Scales,
  annotations: NonNullable<StageState["annotation"]>,
  t: (key: string) => string,
): PlacedRef[] {
  const bounds: Rect = { x: s.plot.x0, y: s.plot.y0, w: s.plot.x1 - s.plot.x0, h: s.plot.y1 - s.plot.y0 };
  const note = (at: string | null): string[] => (at ? annotations.filter((a) => a.at === at).flatMap((a) => wrap(t(a.text_key), WRAP_CHARS)) : []);

  const items: Omit<PlacedRef, "place">[] = refs.bands.map(({ atm, shape }) => {
    const cx = s.x(atm.pressure_kpa);
    const yTop = s.y(atm.o2_pct_max ?? 100);
    const yBot = s.y(atm.o2_pct_min);
    const bar: Rect = shape === "marker" ? { x: cx - BAR_W / 2, y: yBot - 2, w: BAR_W, h: 4 } : { x: cx - BAR_W / 2, y: yTop, w: BAR_W, h: Math.max(4, yBot - yTop) };
    const lines = [
      ...wrap(atm.name, WRAP_CHARS),
      ...(shape === "open" ? wrap(t("ui.stage.legend.open-band"), WRAP_CHARS) : []),
      ...note(atm.id === "heo-dm-1006" ? "moon-box" : atm.id === "iss-air" ? "iss-air" : null),
    ];
    return { id: atm.id, shape, bar, lines };
  });
  if (refs.paper.length) {
    const xs = refs.paper.map((p) => s.x(p.pressure_kpa));
    const ys = refs.paper.map((p) => s.y(p.o2_pct));
    const x = Math.min(...xs) - DIAMOND;
    const y = Math.min(...ys) - DIAMOND;
    items.push({ id: "saffire-vi", shape: "paper", bar: { x, y, w: Math.max(...xs) + DIAMOND - x, h: Math.max(...ys) + DIAMOND - y }, lines: wrap(t("ui.stage.legend.paper"), WRAP_CHARS) });
  }
  // the Moon box is the picture's subject: it chooses its spot first
  items.sort((a, b) => Number(b.shape === "moon-box") - Number(a.shape === "moon-box"));

  const taken: Rect[] = items.map((i) => i.bar);
  return items.map((i) => {
    const size = textSize(i.lines);
    const place = placeLabel(size, i.bar, bounds, taken);
    taken.push(place.rect);
    return { ...i, place };
  });
}

// Where the reference atmospheres, the paper tests and their word labels go (no DOM).
// Generated with Claude, SI-assisted.
import type { StageState } from "../contract";
import { overlaps, placeLabel, textSize, wrap } from "./layout";
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

/** Plain-words labels, each in its own slot (Moon box first) so none overlaps another
 *  label. The Moon box keeps first pick through placeLabel; every other label stacks in
 *  its own slot along the right plot edge with a thin leader line back to its bar (R17:
 *  the Moon-air page crowded them onto each other and the dots). `avoid` holds boxes
 *  the stack must also keep clear (the live "Your air" label). Order of the result =
 *  drawing order. */
export function layoutRefs(
  refs: RefPlan,
  s: Scales,
  annotations: NonNullable<StageState["annotation"]>,
  t: (key: string) => string,
  avoid: Rect[] = [],
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

  const taken: Rect[] = [...avoid, ...items.map((i) => i.bar)];
  const out: PlacedRef[] = [];
  const [first, ...rest] = items;
  if (first) {
    const size = textSize(first.lines);
    const place = placeLabel(size, first.bar, bounds, taken);
    taken.push(place.rect);
    out.push({ ...first, place });
  }
  // the stack: one slot per label down the right plot edge, sliding past whatever is
  // taken; a label the stack cannot hold falls back to the nearest free spot
  const GAP = 8;
  let cursor = bounds.y + 4;
  for (const item of rest) {
    const size = textSize(item.lines);
    let rect: Rect = { x: bounds.x + bounds.w - size.w - 4, y: cursor, w: size.w, h: size.h };
    let guard = 0;
    while (taken.some((o) => overlaps(rect, o)) && guard++ < 1000) rect = { ...rect, y: rect.y + 4 };
    let place: LabelPlace;
    if (rect.y + rect.h <= bounds.y + bounds.h && !taken.some((o) => overlaps(rect, o))) {
      const cx = item.bar.x + item.bar.w / 2;
      const cy = item.bar.y + item.bar.h / 2;
      const lx = Math.min(Math.max(cx, rect.x), rect.x + rect.w);
      const ly = Math.min(Math.max(cy, rect.y), rect.y + rect.h);
      place = { rect, anchor: "start", textX: rect.x, leader: { x1: cx, y1: cy, x2: lx, y2: ly } };
    } else {
      // the stack column is full: nearest free spot anywhere in the plot (placeLabel's
      // own fallback clamps only when nothing is free)
      place = placeLabel(size, item.bar, bounds, taken);
    }
    taken.push(place.rect);
    cursor = place.rect.y + place.rect.h + GAP;
    out.push({ ...item, place });
  }
  return out;
}

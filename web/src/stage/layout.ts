// Pure layout and scale helpers for the SVG stage (no DOM). Generated with Claude, SI-assisted.

export interface Size { w: number; h: number }
export interface Plot { x0: number; x1: number; y0: number; y1: number }
export interface Rect { x: number; y: number; w: number; h: number }
export interface Domain { min: number; max: number; ticks: number[] }

export interface Scales {
  plot: Plot;
  xMin: number;
  xMax: number;
  xTicks: number[];
  yTicks: number[];
  /** kPa -> pixel x inside the SVG */
  x(pressure_kpa: number): number;
  /** percent O2 -> pixel y inside the SVG (0 at the bottom, 100 at the top) */
  y(o2_pct: number): number;
}

/** Space inside the SVG: y tick labels on the left, the x tick row and axis title below. */
export const MARGIN = { left: 52, right: 16, top: 8, bottom: 44 };
/** Narrow strip beside the oxygen axis for tests with oxygen but no pressure. */
export const STRIP_W = 30;
/** The plot never gets shorter than this, even when the band text is long. */
export const MIN_PLOT_H = 120;

/** Round-number axis over [min, max]: a step of 1, 2, 2.5 or 5 times a power of ten, the smallest
 *  step that keeps the tick count at maxTicks or fewer. A small pad (4% of the span) keeps dots and
 *  bars off the edge. Bounds are multiples of the step, so they are round numbers. */
export function niceRange(min: number, max: number, maxTicks = 8): Domain {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1, ticks: [0, 1] }; // no data
  if (max < min) [min, max] = [max, min];
  const pad = Math.max((max - min) * 0.04, 1);
  const lo = min - pad;
  const hi = max + pad;
  const span = hi - lo;
  const power = Math.floor(Math.log10(span));
  let step = 0;
  for (let e = power - 2; e <= power + 1 && !step; e++) {
    for (const m of [1, 2, 2.5, 5]) {
      const s = m * 10 ** e;
      if (Math.ceil(hi / s - 1e-9) - Math.floor(lo / s + 1e-9) + 1 <= maxTicks) { step = s; break; }
    }
  }
  const a = Math.floor(lo / step + 1e-9);
  const b = Math.ceil(hi / step - 1e-9);
  return { min: +(a * step).toFixed(6), max: +(b * step).toFixed(6), ticks: Array.from({ length: b - a + 1 }, (_, i) => +((a + i) * step).toFixed(6)) };
}

/** Scales for an SVG of the given size. bandH = height of the lunar band above the chart (0 when
 *  absent); headH = height of the caption rows between the band and the plot; strip = leave room
 *  for the no-pressure strip. The plot fills everything the margins leave over. */
export function chartScales(size: Size, dom: Domain, opts: { bandH: number; headH: number; strip: boolean }): Scales {
  const y0 = MARGIN.top + (opts.bandH ? opts.bandH + 8 : 0) + opts.headH;
  const x0 = MARGIN.left + (opts.strip ? STRIP_W : 0);
  const plot: Plot = {
    x0,
    x1: Math.max(x0 + 1, size.w - MARGIN.right),
    y0,
    y1: Math.max(y0 + MIN_PLOT_H, size.h - MARGIN.bottom),
  };
  const span = dom.max - dom.min || 1;
  return {
    plot,
    xMin: dom.min,
    xMax: dom.max,
    xTicks: dom.ticks,
    yTicks: [0, 20, 40, 60, 80, 100],
    x: (p) => plot.x0 + ((p - dom.min) / span) * (plot.x1 - plot.x0),
    y: (o) => plot.y1 - (o / 100) * (plot.y1 - plot.y0),
  };
}

/** Greedy word wrap by character count (SVG text does not wrap). */
export function wrap(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > maxChars) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

// ---------- label placement ----------
export const CHAR_PX = 7; // rough width of one 12-13px character, for sizing SVG text
export const LINE_PX = 16;

export type Anchor = "start" | "end" | "middle";
export interface LabelPlace {
  rect: Rect;
  anchor: Anchor;
  /** x of the text origin for the anchor */
  textX: number;
  /** a line from the target to the label, when the label could not sit next to it */
  leader: { x1: number; y1: number; x2: number; y2: number } | null;
}

export function overlaps(a: Rect, b: Rect, pad = 2): boolean {
  return a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
}

const inside = (r: Rect, b: Rect): boolean => r.x >= b.x && r.y >= b.y && r.x + r.w <= b.x + b.w && r.y + r.h <= b.y + b.h;

export function textSize(lines: string[]): { w: number; h: number } {
  return { w: Math.max(0, ...lines.map((l) => l.length)) * CHAR_PX, h: lines.length * LINE_PX };
}

/** Put a label of size (w, h) next to target without touching bounds' edges or any rect in taken.
 *  Tries the four sides (right, left, above, below); if all are blocked, scans the bounds for the
 *  nearest free spot and joins it to the target with a leader line. When nothing is free it returns
 *  the right-hand spot clamped into bounds (the only case where an overlap can remain). */
export function placeLabel(size: { w: number; h: number }, target: Rect, bounds: Rect, taken: Rect[]): LabelPlace {
  const { w, h } = size;
  const gap = 6;
  const cy = target.y + target.h / 2;
  const cx = target.x + target.w / 2;
  const sides: { rect: Rect; anchor: Anchor }[] = [
    { rect: { x: target.x + target.w + gap, y: cy - h / 2, w, h }, anchor: "start" },
    { rect: { x: target.x - gap - w, y: cy - h / 2, w, h }, anchor: "end" },
    { rect: { x: cx - w / 2, y: target.y - gap - h, w, h }, anchor: "middle" },
    { rect: { x: cx - w / 2, y: target.y + target.h + gap, w, h }, anchor: "middle" },
  ];
  const free = (r: Rect): boolean => inside(r, bounds) && !taken.some((t) => overlaps(r, t));
  const at = (rect: Rect, anchor: Anchor, leader: LabelPlace["leader"]): LabelPlace => ({
    rect, anchor, leader, textX: anchor === "start" ? rect.x : anchor === "end" ? rect.x + rect.w : rect.x + rect.w / 2,
  });
  for (const s of sides) {
    // a side that is only blocked because the label is vertically centred may fit when slid into bounds
    const slid: Rect = { ...s.rect, y: Math.min(Math.max(s.rect.y, bounds.y), bounds.y + bounds.h - h) };
    if (free(s.rect)) return at(s.rect, s.anchor, null);
    if (s.anchor !== "middle" && free(slid)) return at(slid, s.anchor, null);
  }
  let best: Rect | null = null;
  let bestD = Infinity;
  for (let y = bounds.y; y + h <= bounds.y + bounds.h; y += 8) {
    for (let x = bounds.x; x + w <= bounds.x + bounds.w; x += 8) {
      const r = { x, y, w, h };
      if (!free(r)) continue;
      const d = Math.hypot(x + w / 2 - cx, y + h / 2 - cy);
      if (d < bestD) { bestD = d; best = r; }
    }
  }
  if (best) {
    // leader from the target's centre to the closest point of the label
    const lx = Math.min(Math.max(cx, best.x), best.x + best.w);
    const ly = Math.min(Math.max(cy, best.y), best.y + best.h);
    return at(best, "start", { x1: cx, y1: cy, x2: lx, y2: ly });
  }
  const r = sides[0]!.rect;
  const clamped = { ...r, x: Math.min(Math.max(r.x, bounds.x), Math.max(bounds.x, bounds.x + bounds.w - w)), y: Math.min(Math.max(r.y, bounds.y), Math.max(bounds.y, bounds.y + bounds.h - h)) };
  return at(clamped, "start", null);
}

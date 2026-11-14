// Pure layout and scale helpers for the SVG stage (no DOM). Generated with Claude, SI-assisted.

export interface Size { w: number; h: number }
/** Where the chart sits inside #stage, in pixels. */
export interface Box { left: number; top: number; width: number; height: number }
export interface Plot { x0: number; x1: number; y0: number; y1: number }

export interface Scales {
  plot: Plot;
  xMax: number;
  xTicks: number[];
  yTicks: number[];
  /** kPa -> pixel x inside the box */
  x(pressure_kpa: number): number;
  /** percent O2 -> pixel y inside the box (0 at the bottom, 100 at the top) */
  y(o2_pct: number): number;
}

/** Layout constants from the brief: story cards cover 32rem on the left (1rem = 16px),
 *  the slider panel covers var(--panel-w) 380px + 32px on the right. */
export const WIDE_MIN_PX = 900;
export const STORY_INSET_PX = 32 * 16;
export const PANEL_INSET_PX = 380 + 32;
export const NARROW_HEIGHT_SHARE = 0.55;

/** Space inside the box: axis labels, the plane label row and the legend strip. */
export const MARGIN = { left: 52, right: 16, top: 8, bottom: 108, labelRow: 20 };

export function stageBox(size: Size, slidersLive: boolean): Box {
  if (size.w >= WIDE_MIN_PX) {
    const left = STORY_INSET_PX;
    const right = slidersLive ? PANEL_INSET_PX : 0;
    return { left, top: 0, width: Math.max(0, size.w - left - right), height: size.h };
  }
  return { left: 0, top: 0, width: size.w, height: Math.round(size.h * NARROW_HEIGHT_SHARE) };
}

/** Round-number axis: 0..max rounded up to a step of 1, 2, 2.5 or 5 times a power of ten,
 *  using the smallest step that keeps the tick count (including 0) at 6 or fewer. */
export function niceDomain(max: number): { max: number; ticks: number[] } {
  if (!(max > 0)) return { max: 1, ticks: [0, 1] }; // no data: a unit axis, never divide by zero
  const power = Math.floor(Math.log10(max));
  let step = 0;
  for (let e = power - 1; e <= power + 1 && !step; e++) {
    for (const m of [1, 2, 2.5, 5]) {
      const s = m * 10 ** e;
      if (Math.ceil(max / s - 1e-9) + 1 <= 6) { step = s; break; }
    }
  }
  const n = Math.ceil(max / step - 1e-9);
  return { max: n * step, ticks: Array.from({ length: n + 1 }, (_, i) => +(i * step).toFixed(6)) };
}

/** Scales from the data: x = 0..(largest pressure rounded up), y = 0..100 percent.
 *  bandH = height of the lunar band above the chart (0 when absent). */
export function chartScales(box: Box, maxPressure: number, bandH: number): Scales {
  const dom = niceDomain(maxPressure);
  const y0 = MARGIN.top + (bandH ? bandH + 8 : 0) + MARGIN.labelRow;
  const plot: Plot = {
    x0: MARGIN.left,
    x1: Math.max(MARGIN.left + 1, box.width - MARGIN.right),
    y0,
    y1: Math.max(y0 + 1, box.height - MARGIN.bottom),
  };
  const yTop = 100;
  return {
    plot,
    xMax: dom.max,
    xTicks: dom.ticks,
    yTicks: [0, 20, 40, 60, 80, 100],
    x: (p) => plot.x0 + (p / dom.max) * (plot.x1 - plot.x0),
    y: (o) => plot.y1 - (o / yTop) * (plot.y1 - plot.y0),
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

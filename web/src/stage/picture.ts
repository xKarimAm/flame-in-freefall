// Generated with Muse Spark, SI-assisted.
// Public-lens picture for act 1: the oxygen dial and the flame guide beside the incident card.
// Flat SVG from tokens only (never yellow: the Moon box keeps that). Every mark comes from
// data/curated/moon.json atmospheres by id through ctx.api.atmosphere; the incident marker reads
// the incident's own oxygen words, and is absent when they hold no oxygen number.
import type { AtmosphereId, Ctx, Incident } from "../contract";
import { wrap } from "./layout";

const SVG_NS = "http://www.w3.org/2000/svg";

type Attrs = Record<string, string | number>;

function svg(tag: string, attrs: Attrs = {}, text?: string): SVGElement {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  if (text !== undefined) n.textContent = text;
  return n as SVGElement;
}

/** The atmosphere marks on the dial: station air, the planned Moon-base air as a band, spacesuit. */
export const DIAL_IDS = ["iss-air", "heo-dm-1006", "suit"] as const satisfies readonly AtmosphereId[];

/** Leading "NN%" of an incident's oxygen words, or null when it names no oxygen number (e.g. Mir). */
export function incidentO2(oxygen: string): number | null {
  const m = oxygen.match(/^\s*(\d+(?:\.\d+)?)\s*%/);
  if (!m) return null;
  const v = Number(m[1]);
  return v >= 0 && v <= 100 ? v : null;
}

const W = 300;
const H = 560;
const TOP = 28;
const BOTTOM = 524;
const AXIS_X = 56;

/** Where a marker sits as a fraction up from the dial's bottom edge (the flame stands there). */
export function markerBottomFraction(v: number): number {
  return (H - y(v)) / H;
}

/** Flame heights in flameSVG below: tall when a marker is shown, small and calm otherwise. */
export const FLAME_H = { tall: 190, small: 110 } as const;
/** Wide-screen dial width in stage.css: the dial art scales uniformly, so this is its height. */
export const DIAL_WIDE_W = 120;
export const dialWideH = (DIAL_WIDE_W * H) / W;

/** Headroom above the dial so a flame standing with its base at the mark never leaves the box:
 *  the flame's overhang past the dial top (0 when the mark sits low enough). Pure. */
export function flameStandPad(mark: number | undefined, tall: boolean): number {
  const flameH = tall ? FLAME_H.tall : FLAME_H.small;
  const f = mark === undefined ? 0 : markerBottomFraction(mark);
  return Math.max(0, Math.ceil(flameH - (1 - f) * dialWideH));
}

const y = (v: number): number => BOTTOM - (v / 100) * (BOTTOM - TOP);

/** Tall vertical gauge, 0 to 100 % oxygen, with the atmosphere marks and one marker per numeric incident. */
export function dialSVG(ctx: Ctx, shown: Incident[]): SVGSVGElement {
  const { api, t } = ctx;
  const chart = svg("svg", { class: "o2-dial", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": t("ui.stage.dial-title") });
  chart.append(svg("title", {}, t("ui.stage.dial-title")));
  // frame and scale ticks every 10
  chart.append(svg("line", { class: "dial-frame", x1: AXIS_X, x2: AXIS_X, y1: y(0), y2: y(100) }));
  for (let v = 0; v <= 100; v += 10) {
    chart.append(svg("line", { class: "dial-tick", x1: AXIS_X - 8, x2: AXIS_X, y1: y(v), y2: y(v) }));
    chart.append(svg("text", { class: "dial-num", x: AXIS_X - 12, y: y(v) + 4, "text-anchor": "end" }, String(v)));
  }
  chart.append(
    svg("text", { class: "dial-axis", transform: `translate(14 ${(y(0) + y(100)) / 2}) rotate(-90)`, "text-anchor": "middle" }, t("ui.stage.y-axis")),
  );
  // atmosphere marks, values read from moon.json by id
  for (const id of DIAL_IDS) {
    const a = api.atmosphere(id);
    const max = a.o2_pct_max;
    const label = max === null || max === a.o2_pct_min ? `${a.name} · ${a.o2_pct_min} %` : `${a.name} · ${a.o2_pct_min}–${max} %`;
    const lines = wrap(label, 30);
    if (max !== null && max > a.o2_pct_min) {
      chart.append(svg("rect", { class: "dial-band", x: AXIS_X - 6, y: y(max), width: 12, height: y(a.o2_pct_min) - y(max), "data-atmosphere": id }));
      lines.forEach((line, i) =>
        chart.append(svg("text", { class: "dial-mark", x: AXIS_X + 16, y: (y(a.o2_pct_min) + y(max)) / 2 + (i - (lines.length - 1) / 2) * 14, "text-anchor": "start" }, line)),
      );
    } else {
      chart.append(svg("circle", { class: "dial-point", cx: AXIS_X, cy: y(a.o2_pct_min), r: 4.5, "data-atmosphere": id }));
      lines.forEach((line, i) =>
        chart.append(svg("text", { class: "dial-mark", x: AXIS_X + 16, y: y(a.o2_pct_min) + 4 + (i - (lines.length - 1) / 2) * 14, "text-anchor": "start" }, line)),
      );
    }
  }
  // one marker per shown incident whose oxygen words name an oxygen number
  for (const inc of shown) {
    const v = incidentO2(inc.oxygen);
    if (v === null) continue;
    const mark = svg("line", { class: "dial-marker", x1: AXIS_X - 18, x2: AXIS_X + 18, y1: y(v), y2: y(v), "data-incident": inc.id });
    mark.append(svg("title", {}, `${inc.name}: ${inc.oxygen}`));
    chart.append(mark);
  }
  return chart as SVGSVGElement;
}

// Simplified flat layers of the Firebreak flame (web/src/ui/logo-mark.svg) in the brand fills:
// outer danger red, mid flame orange, inner amber, pale core. Decorative: aria-hidden, never measured.
const FLAME_LAYERS: { fill: string; d: string }[] = [
  { fill: "var(--danger)", d: "M50 8 C58 40 86 66 86 108 A36 40 0 1 1 14 108 C14 66 42 40 50 8 Z" },
  { fill: "var(--flame)", d: "M50 52 C54 68 70 82 70 104 A20 22 0 1 1 30 104 C30 82 46 68 50 52 Z" },
  { fill: "var(--flame-amber)", d: "M50 84 C52 94 60 100 60 112 A10 11 0 1 1 40 112 C40 100 48 94 50 84 Z" },
];

/** The flame guide: tall in high-oxygen air (an incident marker is shown), small and calm otherwise. */
export function flameSVG(tall: boolean): SVGSVGElement {
  const h = tall ? FLAME_H.tall : FLAME_H.small;
  const f = svg("svg", {
    class: `flame-guide ${tall ? "tall" : "small"}`,
    viewBox: "0 0 100 160",
    width: Math.round((h * 100) / 160),
    height: h,
    "aria-hidden": "true",
  });
  const g = svg("g", { class: "flame-sway" });
  for (const layer of FLAME_LAYERS) g.append(svg("path", { d: layer.d, fill: layer.fill }));
  g.append(svg("ellipse", { cx: 50, cy: 118, rx: 7, ry: 9, fill: "var(--flame-core)" }));
  f.append(g);
  return f as SVGSVGElement;
}

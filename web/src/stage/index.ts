// SVG evidence stage: x = air pressure kPa, y = oxygen %, drawn from ctx.api, redrawn on store changes.
// Generated with Claude, SI-assisted.
import "./stage.css";
import { SLIDER_RANGE } from "../contract";
import type { AppState, Ctx, Incident, NearestRow, PlacedTest } from "../contract";
import { queryFromState } from "../store";
import { chartScales, MARGIN, stageBox, wrap } from "./layout";
import type { Scales, Size } from "./layout";
import { dotKind, drawnTests, legendItems, planReferences, pressuresForDomain } from "./plan";
import type { DotKind, RefPlan } from "./plan";

const SVG_NS = "http://www.w3.org/2000/svg";
const BAR_W = 12; // fixed pixel width of reference bars
const CHAR_PX = 7; // rough width of one 13px character, for wrapping SVG text
const LINE_PX = 16;

type Attrs = Record<string, string | number>;

function svg(tag: string, attrs: Attrs = {}, text?: string): SVGElement {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  if (text !== undefined) n.textContent = text;
  return n as SVGElement;
}

function html<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/** A multi-line SVG text block; anchor "end" grows leftwards from x. */
function textBlock(x: number, y: number, anchor: "start" | "end" | "middle", lines: string[], cls: string): SVGElement {
  const t = svg("text", { x, y, "text-anchor": anchor, class: cls });
  lines.forEach((line, i) => t.append(svg("tspan", { x, dy: i === 0 ? 0 : LINE_PX }, line)));
  return t;
}

export interface MountOptions {
  /** fixed stage size; without it the stage measures itself (ResizeObserver, or window resize) */
  size?: Size;
}

export function mount(el: HTMLElement, ctx: Ctx, opts: MountOptions = {}): void {
  const { t, api, store } = ctx;

  const root = html("div", "stage-root");
  const chart = svg("svg", { class: "stage-svg", role: "img" }) as SVGSVGElement;
  const gAxes = svg("g", { "data-layer": "axes" });
  const gBand = svg("g", { "data-layer": "lunar-band" });
  const gTests = svg("g", { "data-layer": "tests" });
  const gRefs = svg("g", { "data-layer": "refs" });
  const gNearest = svg("g", { "data-layer": "nearest" });
  const gYou = svg("g", { "data-layer": "you" });
  chart.append(gAxes, gBand, gTests, gRefs, gNearest, gYou);
  const legend = html("ul", "stage-legend");
  root.append(chart, legend);
  const incidents = html("div", "stage-incidents");
  incidents.hidden = true;
  el.append(root, incidents);

  const dots = new Map<string, SVGElement>(); // test id -> circle, reused so class changes can transition
  let size: Size | null = opts.size ?? null;
  // what the last full draw decided; the live draw (sliders) reuses it
  let scales: Scales | null = null;
  let kinds: ReadonlySet<DotKind> = new Set();
  let refs: RefPlan = { bands: [], paper: [] };

  function nearestRows(state: AppState): NearestRow[] {
    const query = queryFromState(state);
    return query ? api.nearest(query, 10, state.family ?? undefined).rows : [];
  }

  function dotTitle(row: PlacedTest): string {
    return t("ui.stage.dot-title", {
      fuel: row.fuel ?? t("ui.stage.no-fuel"),
      o2: row.o2_pct,
      pressure: row.pressure_kpa,
      outcome: row.outcome,
    });
  }

  // ---------- full draw: axes, grey dots, references, lunar band, coverage ----------
  function drawAll(): void {
    if (!size || size.w <= 0 || size.h <= 0) return;
    const state = store.get();
    const stage = state.stage;
    const chartView = stage.view === "micro-g" || stage.view === "tilt-lunar" || stage.view === "empty";
    root.hidden = !chartView;
    incidents.hidden = chartView;
    if (!chartView) {
      drawIncidents(stage.incident_ids ?? []);
      return;
    }

    const box = stageBox(size, state.sliders !== null);
    Object.assign(root.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` });
    chart.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    chart.setAttribute("aria-label", t("ui.stage.title"));

    const empty = stage.view === "empty";
    const placed = api.placed();
    refs = empty ? { bands: [], paper: [] } : planReferences(stage, api);
    const sliderMax = state.sliders && !empty ? SLIDER_RANGE.pressure_kpa.max : null;

    // lunar band text first: its height moves the plot down
    const lunar = stage.view === "tilt-lunar";
    const bandW = box.width - MARGIN.left - MARGIN.right;
    const noteLines = lunar
      ? (stage.annotation ?? []).filter((a) => a.at === "lunar-plane").map((a) => wrap(t(a.text_key), Math.max(8, Math.floor((bandW - 16) / CHAR_PX))))
      : [];
    const bandH = lunar ? 28 + noteLines.flat().length * LINE_PX + 10 : 0;
    scales = chartScales(box, Math.max(0, ...pressuresForDomain(placed, refs, sliderMax)), bandH);
    const { plot, x, y } = scales;

    // axes, quiet gridlines, titles in words
    gAxes.replaceChildren();
    for (const v of scales.xTicks) {
      gAxes.append(svg("line", { class: "grid", x1: x(v), x2: x(v), y1: plot.y0, y2: plot.y1 }));
      gAxes.append(svg("text", { x: x(v), y: plot.y1 + 16, "text-anchor": "middle" }, String(v)));
    }
    for (const v of scales.yTicks) {
      gAxes.append(svg("line", { class: "grid", x1: plot.x0, x2: plot.x1, y1: y(v), y2: y(v) }));
      gAxes.append(svg("text", { x: plot.x0 - 8, y: y(v) + 4, "text-anchor": "end" }, String(v)));
    }
    gAxes.append(svg("text", { class: "axis-title", x: (plot.x0 + plot.x1) / 2, y: plot.y1 + 36, "text-anchor": "middle" }, t("ui.stage.x-axis")));
    gAxes.append(
      svg("text", { class: "axis-title", transform: `translate(14 ${(plot.y0 + plot.y1) / 2}) rotate(-90)`, "text-anchor": "middle" }, t("ui.stage.y-axis")),
    );

    gBand.replaceChildren();
    gRefs.replaceChildren();
    // grey dots: keep circles that stay drawn (so class changes can transition), drop the rest
    const wanted = empty ? [] : drawnTests(stage, placed);
    const wantedIds = new Set(wanted.map((w) => w.id));
    for (const [id, c] of dots) if (!wantedIds.has(id)) { c.remove(); dots.delete(id); }
    if (empty) {
      kinds = new Set();
      drawLive();
      return;
    }
    gBand.append(svg("text", { class: "plane-label", x: plot.x0, y: plot.y0 - 8 }, t("ui.stage.microg-plane")));
    if (lunar) {
      const top = MARGIN.top;
      gBand.append(svg("rect", { class: "lunar-band", x: plot.x0, y: top, width: plot.x1 - plot.x0, height: bandH }));
      gBand.append(svg("text", { class: "plane-label", x: plot.x0 + 8, y: top + 18 }, t("ui.stage.lunar-plane")));
      gBand.append(textBlock(plot.x0 + 8, top + 38, "start", noteLines.flat(), "lunar-note"));
    }

    // grey dots, one circle per drawn test; the highlight colours only the ones it names
    const kindSet = new Set<DotKind>();
    for (const test of wanted) {
      const kind = dotKind(test, stage.highlight);
      kindSet.add(kind);
      let c = dots.get(test.id);
      if (!c) {
        c = svg("circle", { "data-id": test.id });
        dots.set(test.id, c);
        gTests.append(c);
      }
      c.setAttribute("cx", String(x(test.pressure_kpa)));
      c.setAttribute("cy", String(y(test.o2_pct)));
      c.setAttribute("r", kind === "default" ? "2.5" : "3");
      c.setAttribute("class", kind === "default" ? "dot" : `dot ${kind}`);
    }
    kinds = kindSet;

    drawRefs(stage.annotation ?? []);
    if (stage.coverage) {
      gRefs.append(svg("text", { class: "coverage", x: plot.x1 - 8, y: plot.y0 + 16, "text-anchor": "end" }, t("ui.stage.coverage", api.coverage())));
    }
    drawLive();
  }

  function sideOf(px: number, s: Scales): "start" | "end" {
    return px > s.plot.x0 + 0.6 * (s.plot.x1 - s.plot.x0) ? "end" : "start";
  }

  function drawRefs(annotations: NonNullable<AppState["stage"]["annotation"]>): void {
    const s = scales!;
    const note = (at: string | null): string[] =>
      at ? annotations.filter((a) => a.at === at).flatMap((a) => wrap(t(a.text_key), 26)) : [];
    for (const { atm, shape } of refs.bands) {
      const cx = s.x(atm.pressure_kpa);
      const yTop = s.y(atm.o2_pct_max ?? 100);
      const yBot = s.y(atm.o2_pct_min);
      const attrs: Attrs = { class: `ref ${shape}`, "data-ref": atm.id, x: cx - BAR_W / 2, width: BAR_W };
      if (shape === "marker") Object.assign(attrs, { y: yBot - 2, height: 4 });
      else Object.assign(attrs, { y: yTop, height: yBot - yTop });
      const bar = svg("rect", attrs);
      bar.append(svg("title", {}, atm.name));
      gRefs.append(bar);
      const side = sideOf(cx, s);
      const lines = [
        ...wrap(atm.name, 26),
        ...(shape === "open" ? wrap(t("ui.stage.legend.open-band"), 26) : []),
        ...note(atm.id === "heo-dm-1006" ? "moon-box" : atm.id === "iss-air" ? "iss-air" : null),
      ];
      gRefs.append(textBlock(side === "start" ? cx + BAR_W / 2 + 6 : cx - BAR_W / 2 - 6, (shape === "marker" ? yBot : yTop) + 10, side, lines, "ref-label"));
    }
    refs.paper.forEach((p, i) => {
      const px = s.x(p.pressure_kpa);
      const py = s.y(p.o2_pct);
      const d = 5;
      const g = svg("path", { class: "paper", "data-paper": p.name, d: `M${px} ${py - d}L${px + d} ${py}L${px} ${py + d}L${px - d} ${py}Z` });
      g.append(svg("title", {}, p.name));
      gRefs.append(g);
      if (i === 0) {
        const side = sideOf(px, s);
        gRefs.append(textBlock(side === "start" ? px + d + 6 : px - d - 6, py + 4, side, [t("ui.stage.legend.paper")], "ref-label"));
      }
    });
  }

  // ---------- live draw: only the nearest layer, the crosshair and the legend ----------
  function drawLive(): void {
    if (!scales) return;
    const state = store.get();
    if (state.stage.view !== "micro-g" && state.stage.view !== "tilt-lunar") {
      gNearest.replaceChildren();
      gYou.replaceChildren();
      legend.replaceChildren();
      return;
    }
    const { x, y } = scales;
    const rows = nearestRows(state);
    gNearest.replaceChildren(
      ...rows.map((row) => {
        const c = svg("circle", { class: "dot nearest", cx: x(row.pressure_kpa), cy: y(row.o2_pct), r: 5, "data-id": row.id });
        c.append(svg("title", {}, dotTitle(row)));
        return c;
      }),
    );
    gYou.replaceChildren();
    if (state.sliders) {
      const px = x(state.sliders.pressure_kpa);
      const py = y(state.sliders.o2_pct);
      const arm = 10;
      gYou.append(
        svg("path", { class: "you-line", d: `M${px - arm} ${py}H${px + arm}M${px} ${py - arm}V${py + arm}` }),
        svg("circle", { class: "you-line", cx: px, cy: py, r: 4 }),
      );
      const side = sideOf(px, scales);
      gYou.append(svg("text", { class: "you-label", x: side === "start" ? px + arm + 4 : px - arm - 4, y: py - arm, "text-anchor": side }, t("ui.stage.your-air")));
    }
    legend.replaceChildren(
      ...legendItems(t, { kinds, nearest: rows.length > 0, refs, you: state.sliders !== null }).map((item) => {
        const li = html("li");
        const sw = html("span", `sw sw-${item.swatch}`);
        sw.setAttribute("aria-hidden", "true");
        li.append(sw, item.text);
        return li;
      }),
    );
  }

  // ---------- incident view ----------
  function drawIncidents(ids: string[]): void {
    const all = api.data.incidents.incidents;
    const cards = ids.map((id) => all.find((i) => i.id === id)).filter((i): i is Incident => !!i);
    incidents.replaceChildren(
      ...cards.map((i) => {
        const card = html("article", "incident-card");
        const line = (label: string, text: string): HTMLElement => {
          const p = html("p");
          p.append(html("strong", undefined, `${label}: `), text);
          return p;
        };
        const link = html("a", undefined, i.source);
        link.href = i.url;
        link.rel = "noopener";
        const src = html("p");
        src.append(link);
        card.append(html("h3", undefined, i.name), html("p", "incident-date", i.date), html("p", undefined, i.what_happened), line(t("ui.stage.incident.oxygen"), i.oxygen), line(t("ui.stage.incident.changed"), i.changed), src);
        return card;
      }),
    );
  }

  // ---------- wiring ----------
  store.subscribe((state, prev) => {
    const full = state.stage !== prev.stage || state.locale !== prev.locale || (state.sliders === null) !== (prev.sliders === null);
    if (full) drawAll();
    else if (state.sliders !== prev.sliders || state.family !== prev.family) drawLive();
  });

  if (!opts.size) {
    const measure = (): void => {
      const r = el.getBoundingClientRect();
      size = { w: r.width, h: r.height };
      drawAll();
    };
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(measure).observe(el);
    else window.addEventListener("resize", measure);
    measure();
  } else drawAll();
}

// SVG evidence stage: x = air pressure kPa, y = oxygen %, drawn from ctx.api, redrawn on store changes.
// The SVG fills #stage's content box (the UI pads #stage for the story cards and the panel); nothing here
// reserves space for them. Generated with Claude, SI-assisted.
import "./stage.css";
import { SLIDER_RANGE } from "../contract";
import type { AppState, Ctx, Incident, NearestRow, PlacedTest } from "../contract";
import { queryFromState } from "../store";
import { dataLink } from "../ui/dom";
import { CHAR_PX, LINE_PX, MARGIN, STRIP_W, chartHeight, chartScales, niceRange, wrap } from "./layout";
import type { Size } from "./layout";
import type { Scales } from "./layout";
import { dotKind, drawnTests, legendItems, noPressureRows, planReferences, pressuresForDomain } from "./plan";
import type { DotKind, RefPlan } from "./plan";
import { DIAL_IDS, dialSVG, flameStandPad, flameSVG, incidentO2, markerBottomFraction } from "./picture";
import { renderExplainers } from "./explain";
import { renderParade } from "./parade";
import { TILT_MS, lunarLabelFor, mountTilt, tiltAllowed, type TiltView } from "./tilt";
import { DIAMOND, layoutRefs } from "./refs";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Dot clicks and sheet rows select an investigation through this event (detail: { investigation: string | null }).
 *  The stage highlights that investigation's dots; the sheet opens its row. See ui/sheet.ts. */
export const SELECT_INVESTIGATION = "firebreak:select-investigation";

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

/** A multi-line SVG text block whose first baseline sits 12px under top. */
function textBlock(x: number, top: number, anchor: "start" | "end" | "middle", lines: string[], cls: string): SVGElement {
  const t = svg("text", { x, y: top + 12, "text-anchor": anchor, class: cls });
  lines.forEach((line, i) => t.append(svg("tspan", { x, dy: i === 0 ? 0 : LINE_PX }, line)));
  return t;
}

/** The sentences of moon.json's gap text that name FM2 (the planned lunar-gravity burns). */
export function fm2Sentences(gapText: string): string[] {
  return gapText.split(/(?<=\.)\s+/).filter((s) => /\bFM2\b/.test(s));
}

export interface MountOptions {
  /** fixed SVG size; without it the stage measures its own plot area (ResizeObserver, or window resize) */
  size?: Size;
}

export function mount(el: HTMLElement, ctx: Ctx, opts: MountOptions = {}): void {
  const { t, api, store } = ctx;

  const root = html("div", "stage-root");
  const plotBox = html("div", "stage-plot");
  const chart = svg("svg", { class: "stage-svg", role: "img" }) as SVGSVGElement;
  const gAxes = svg("g", { "data-layer": "axes" });
  const gHead = svg("g", { "data-layer": "head" });
  const gBand = svg("g", { "data-layer": "lunar-band" });
  const gStrip = svg("g", { "data-layer": "no-pressure" });
  const gTests = svg("g", { "data-layer": "tests" });
  const gRefs = svg("g", { "data-layer": "refs" });
  const gNearest = svg("g", { "data-layer": "nearest" });
  const gYou = svg("g", { "data-layer": "you" });
  chart.append(gAxes, gHead, gBand, gStrip, gTests, gRefs, gNearest, gYou);
  plotBox.append(chart);
  const legend = html("ul", "stage-legend");
  const parade = html("div", "stage-parade");
  parade.hidden = true;
  const explainers = html("div", "stage-explainers");
  explainers.hidden = true;
  root.append(plotBox, legend, parade, explainers);
  const incidents = html("div", "stage-incidents");
  incidents.hidden = true;
  el.append(root, incidents);

  const dots = new Map<string, SVGElement>(); // test id -> circle, reused so class changes can transition
  let selectedInv: string | null = null; // the linked selection (a dot click or a sheet row), not the story
  const tiltBox = html("div", "stage-tilt");
  tiltBox.hidden = true;
  plotBox.append(tiltBox);
  let tilt: TiltView | null | undefined; // undefined = not tried yet
  let tiltOn = false;
  let size: Size | null = opts.size ?? null;
  // what the last full draw decided; the live draw (sliders) reuses it
  let scales: Scales | null = null;
  let kinds: ReadonlySet<DotKind> = new Set();
  let noPressure = 0;
  let refs: RefPlan = { bands: [], paper: [] };
  // pressures of nearest tests that fell outside the axis; the axis widens to keep every one on the chart
  let extra: number[] = [];

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

  // ---------- full draw: axes, grey dots, references, lunar band, no-pressure strip, caption ----------
  function drawAll(): void {
    const state = store.get();
    const stage = state.stage;
    renderParade(parade, ctx);
    renderExplainers(explainers, ctx);
    const chartView = stage.view === "micro-g" || stage.view === "tilt-lunar" || stage.view === "empty";
    root.hidden = !chartView;
    incidents.hidden = chartView;
    if (!chartView) {
      incidents.dataset["count"] = String(Math.min(2, stage.incident_ids?.length ?? 0));
      drawIncidents(stage.incident_ids ?? []);
      return;
    }

    const empty = stage.view === "empty";
    const lunar = stage.view === "tilt-lunar";
    const placed = api.placed();
    refs = empty ? { bands: [], paper: [] } : planReferences(stage, api);
    // the family filter (panel or sheet) narrows the chart to that family's tests
    const fam = state.family ?? null;
    const wanted = empty ? [] : drawnTests(stage, placed).filter((w) => !fam || w.family === fam);
    const strip = empty ? [] : noPressureRows(stage, api.notPlaced()).filter((r) => !fam || r.family === fam);
    noPressure = strip.length;
    // A linked selection (dot click or sheet row) joins the beat highlight as the investigation.
    const hl = selectedInv ? { ...stage.highlight, investigation: selectedInv } : stage.highlight;
    // the legend (with the counter line) renders before the chart: the chart height is derived
    // from the stage box minus this measured chrome
    const kindSet = new Set<DotKind>();
    for (const test of wanted) kindSet.add(dotKind(test, hl));
    for (const row of strip) kindSet.add(dotKind(row, hl));
    kinds = kindSet;
    legend.replaceChildren(...legendHTML(nearestRows(state)));
    if (!opts.size) fit();
    if (!size || size.w <= 0 || size.h <= 0) return;
    chart.setAttribute("viewBox", `0 0 ${size.w} ${size.h}`);
    chart.setAttribute("aria-label", t("ui.stage.title"));

    // x domain: computed from the tests and references shown (see pressuresForDomain).
    // Every placed test in a shown family stays on the chart, high-pressure ones included: the axis grows
    // to reach them rather than dropping or clipping any, so a few very high-pressure tests make the
    // low-pressure cluster (where the Moon box sits) narrower. That is what the data looks like.
    const sliderRange: [number, number] | null = state.sliders && !empty ? [SLIDER_RANGE.pressure_kpa.min, SLIDER_RANGE.pressure_kpa.max] : null;
    const values = pressuresForDomain(wanted, placed, refs, sliderRange, extra);
    const dom = niceRange(Math.min(...values), Math.max(...values));

    // text that moves the plot down: the plane label + caption rows, and the lunar band
    const x0 = MARGIN.left + (strip.length ? STRIP_W : 0);
    const plotW = Math.max(40, size.w - MARGIN.right - x0);
    const headChars = Math.max(8, Math.floor((size.w - MARGIN.left - MARGIN.right) / (CHAR_PX + 0.5)));
    const planeLines = wrap(t("ui.stage.microg-plane"), headChars);
    const caption = captionOf(wanted, hl);
    const captionLines = caption ? wrap(caption, headChars) : [];
    const headH = empty ? 20 : (planeLines.length + captionLines.length) * LINE_PX + 8;
    const noteLines = lunar
      ? [
          ...(stage.annotation ?? []).filter((a) => a.at === "lunar-plane").map((a) => t(a.text_key)),
          ...fm2Sentences(api.data.moon.gap.text),
        ].flatMap((line) => wrap(line, Math.max(8, Math.floor((plotW - 16) / CHAR_PX))))
      : [];
    const bandH = lunar ? 28 + noteLines.length * LINE_PX + 10 : 0;
    scales = chartScales(size, dom, { bandH, headH, strip: strip.length > 0 });
    const { plot, x, y } = scales;

    // the three.js tilt replaces the SVG chart on the lunar-gravity pages when it can run;
    // otherwise the SVG lunar band below stays the chart (and the accessible version).
    // Any tilt failure falls back the same way, so a broken tilt can never break the stage.
    const disableTilt = (): void => {
      tiltOn = false;
      try {
        tilt?.dispose();
      } catch {
        /* already broken */
      }
      tilt = null;
      tiltBox.replaceChildren();
      tiltBox.hidden = true;
      chart.style.display = "";
    };
    if (tiltAllowed(state.lens, stage.view) && tilt === undefined) {
      try {
        tilt = mountTilt(tiltBox, ctx, disableTilt);
      } catch {
        tilt = null;
      }
      if (!tilt) tilt = null;
    }
    const useTilt = tiltAllowed(state.lens, stage.view) && tilt != null;
    if (useTilt !== tiltOn) {
      tiltOn = useTilt;
      if (useTilt) {
        tiltBox.hidden = false;
        tilt!.setTilted(true);
      } else {
        tilt!.setTilted(false);
        window.setTimeout(() => { if (!tiltOn) tiltBox.hidden = true; }, TILT_MS);
      }
    }
    chart.style.display = useTilt ? "none" : "";
    if (useTilt && size) {
      try {
        tilt!.resize(size.w, size.h);
        tilt!.update(wanted, new Set(nearestRows(state).map((r) => r.id)), scales, {
          refs,
          sliders: state.sliders,
          microLabel: t("ui.stage.tilt.micro"),
          lunarLabel: lunarLabelFor(stage.annotation ?? [], (k) => t(k), t("ui.stage.lunar-plane")),
          earthLabel: t("ui.stage.earth-line"),
        });
      } catch {
        disableTilt();
      }
    }

    // axes, quiet gridlines, titles in words
    gAxes.replaceChildren();
    for (const v of scales.xTicks) {
      gAxes.append(svg("line", { class: "grid", x1: x(v), x2: x(v), y1: plot.y0, y2: plot.y1 }));
      gAxes.append(svg("text", { x: x(v), y: plot.y1 + 16, "text-anchor": "middle" }, String(v)));
    }
    for (const v of scales.yTicks) {
      gAxes.append(svg("line", { class: "grid", x1: plot.x0, x2: plot.x1, y1: y(v), y2: y(v) }));
      gAxes.append(svg("text", { x: MARGIN.left - 8, y: y(v) + 4, "text-anchor": "end" }, String(v)));
    }
    gAxes.append(svg("text", { class: "axis-title", x: (plot.x0 + plot.x1) / 2, y: plot.y1 + 36, "text-anchor": "middle" }, t("ui.stage.x-axis")));
    gAxes.append(
      svg("text", { class: "axis-title", transform: `translate(14 ${(plot.y0 + plot.y1) / 2}) rotate(-90)`, "text-anchor": "middle" }, t("ui.stage.y-axis")),
    );

    gHead.replaceChildren();
    gBand.replaceChildren();
    gStrip.replaceChildren();
    gRefs.replaceChildren();
    // dots: keep circles that stay drawn (so changes can transition), drop the rest
    const wantedIds = new Set(wanted.map((w) => w.id));
    for (const [id, c] of dots) if (!wantedIds.has(id)) { c.remove(); dots.delete(id); }
    if (empty) {
      kinds = new Set();
      noPressure = 0;
      drawLive();
      return;
    }

    // the plane label and the one caption line above the plot
    const headTop = plot.y0 - headH;
    gHead.append(textBlock(MARGIN.left, headTop, "start", planeLines, "plane-label"));
    if (captionLines.length) gHead.append(textBlock(MARGIN.left, headTop + planeLines.length * LINE_PX, "start", captionLines, "caption"));

    // the lunar band: an empty plane, fully inside the SVG, with its words inside it
    if (lunar) {
      const top = MARGIN.top;
      gBand.append(svg("rect", { class: "lunar-band", x: plot.x0, y: top, width: plot.x1 - plot.x0, height: bandH }));
      gBand.append(svg("text", { class: "plane-label", x: plot.x0 + 8, y: top + 18 }, t("ui.stage.lunar-plane")));
      gBand.append(textBlock(plot.x0 + 8, top + 26, "start", noteLines, "lunar-note"));
    }

    // dots, one circle per drawn test; the highlight colours only the ones it names
    for (const test of wanted) {
      const kind = dotKind(test, hl);
      let c = dots.get(test.id);
      if (!c) {
        c = svg("circle", { "data-id": test.id });
        const inv = test.investigation;
        c.addEventListener("click", () =>
          window.dispatchEvent(new CustomEvent(SELECT_INVESTIGATION, { detail: { investigation: selectedInv === inv ? null : inv } })));
        dots.set(test.id, c);
        gTests.append(c);
      }
      c.setAttribute("cx", String(x(test.pressure_kpa)));
      c.setAttribute("cy", String(y(test.o2_pct)));
      c.setAttribute("r", kind === "default" ? "2.5" : "3");
      c.setAttribute("class", kind === "default" ? "dot" : `dot ${kind}`);
    }

    // tests with oxygen but no pressure: tick marks in the strip beside the oxygen axis, never given an x
    if (strip.length) {
      const sx = MARGIN.left;
      const sw = STRIP_W - 8;
      const rect = svg("rect", { class: "strip", x: sx, y: plot.y0, width: sw, height: plot.y1 - plot.y0 });
      rect.append(svg("title", {}, `${t("ui.stage.no-pressure")}: ${strip.length}`));
      gStrip.append(rect);
      for (const row of strip) {
        const kind = dotKind(row, hl);
        const tick = svg("line", { class: kind === "default" ? "ptick" : `ptick ${kind}`, x1: sx + 4, x2: sx + sw - 4, y1: y(row.o2_pct), y2: y(row.o2_pct), "data-id": row.id });
        tick.append(svg("title", {}, t("ui.stage.tick-title", { fuel: row.fuel ?? t("ui.stage.no-fuel"), o2: row.o2_pct, outcome: row.outcome })));
        const inv = row.investigation;
        tick.addEventListener("click", () =>
          window.dispatchEvent(new CustomEvent(SELECT_INVESTIGATION, { detail: { investigation: selectedInv === inv ? null : inv } })));
        gStrip.append(tick);
      }
    }

    drawRefs(stage.annotation ?? []);
    drawLive();
  }

  /** "Family name: N tests plotted" for what the highlight names (N may be 0: a family with no placed test
   *  still gets its name and "0 tests plotted"); null when the highlight names no family or investigation */
  function captionOf(wanted: PlacedTest[], h: AppState["stage"]["highlight"]): string | null {
    if (!h) return null;
    const name = h.family ? t(`ui.family.${h.family}`) : h.investigation ? (api.experiment(h.investigation)?.acronym ?? h.investigation) : null;
    if (!name) return null;
    const n = wanted.filter((w) => dotKind(w, h) !== "default").length;
    return t("ui.stage.caption", { name, n });
  }
  function drawRefs(annotations: NonNullable<AppState["stage"]["annotation"]>): void {
    const s = scales!;
    for (const r of layoutRefs(refs, s, annotations, t)) {
      if (r.shape === "paper") {
        refs.paper.forEach((p) => {
          const px = s.x(p.pressure_kpa);
          const py = s.y(p.o2_pct);
          const g = svg("path", { class: "paper", "data-paper": p.name, d: `M${px} ${py - DIAMOND}L${px + DIAMOND} ${py}L${px} ${py + DIAMOND}L${px - DIAMOND} ${py}Z` });
          g.append(svg("title", {}, p.name));
          gRefs.append(g);
        });
      } else {
        const bar = svg("rect", { class: `ref ${r.shape}`, "data-ref": r.id, x: r.bar.x, y: r.bar.y, width: r.bar.w, height: r.bar.h });
        bar.append(svg("title", {}, r.lines.join(" ")));
        gRefs.append(bar);
      }
      if (r.place.leader) gRefs.append(svg("line", { class: "leader", x1: r.place.leader.x1, y1: r.place.leader.y1, x2: r.place.leader.x2, y2: r.place.leader.y2 }));
      const label = textBlock(r.place.textX, r.place.rect.y, r.place.anchor, r.lines, "ref-label");
      label.setAttribute("data-label-for", r.id);
      gRefs.append(label);
    }
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
    const rows = nearestRows(state);
    const outside = rows.filter((r) => r.pressure_kpa < scales!.xMin || r.pressure_kpa > scales!.xMax).map((r) => r.pressure_kpa);
    if (outside.length) {
      extra = [...extra, ...outside]; // widen the axis once; the redraw puts every nearest test inside it
      drawAll();
      return;
    }
    const { x, y } = scales;
    gNearest.replaceChildren(
      ...rows.map((row) => {
        const c = svg("circle", { class: "dot nearest", cx: x(row.pressure_kpa), cy: y(row.o2_pct), r: 5, "data-id": row.id });
        c.append(svg("title", {}, dotTitle(row)));
        const inv = row.investigation;
        c.addEventListener("click", () =>
          window.dispatchEvent(new CustomEvent(SELECT_INVESTIGATION, { detail: { investigation: selectedInv === inv ? null : inv } })));
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
      // left of the crosshair when there is room: reference labels try the right-hand side first
      const label = t("ui.stage.your-air");
      const left = px - scales.plot.x0 >= label.length * CHAR_PX + arm + 8;
      gYou.append(svg("text", { class: "you-label", x: left ? px - arm - 4 : px + arm + 4, y: py - arm, "text-anchor": left ? "end" : "start" }, label));
    }
    legend.replaceChildren(...legendHTML(rows));
  }

  /** Legend in words plus the "Plotted N of M" counter line; needs no scales, so the full
   *  draw renders it before fitting the chart height to the box minus this chrome. */
  function legendHTML(rows: NearestRow[]): HTMLElement[] {
    const state = store.get();
    const items = legendItems(t, { kinds, nearest: rows.length > 0, refs, you: state.sliders !== null, noPressure }, state.lens);
    const out = items.map((item) => {
      const li = html("li");
      const sw = html("span", `sw sw-${item.swatch}`);
      sw.setAttribute("aria-hidden", "true");
      li.append(sw, item.text);
      return li;
    });
    if (state.stage.coverage) {
      const { plotted, total } = api.coverage();
      const kids: (Node | string)[] = [];
      for (const bit of t("ui.stage.coverage").split(/(\{\w+\})/g)) {
        const m = bit.match(/^\{(\w+)\}$/);
        if (!m) kids.push(bit);
        else if (m[1] === "plotted") kids.push(dataLink(String(plotted)));
        else if (m[1] === "total") kids.push(dataLink(String(total)));
        else kids.push(bit);
      }
      const li = html("li", "coverage");
      li.append(...kids);
      out.push(li);
    }
    return out;
  }

  /** Chart height derived from the stage box minus the measured legend, parade and explainer
   *  heights, with breathing room so the counter line is never cut at the stage edge. */
  function fit(): void {
    const chrome = legend.offsetHeight + (parade.hidden ? 0 : parade.offsetHeight) + (explainers.hidden ? 0 : explainers.offsetHeight);
    const w = Math.max(40, root.clientWidth);
    size = { w, h: chartHeight(root.clientHeight, chrome) };
    plotBox.style.height = `${size.h}px`;
  }

  // ---------- incident view: one large page per incident ----------
  // In the Public lens the pages also get the oxygen dial and the flame guide beside the card.
  function incidentCard(i: Incident): HTMLElement {
    const card = html("article", "incident-card");
    const line = (label: string, text: string): HTMLElement => {
      const p = html("p");
      p.append(html("strong", undefined, `${label}: `), text);
      return p;
    };
    const link = html("a", undefined, i.source);
    link.href = i.url;
    link.rel = "noopener";
    const src = html("p", "incident-source");
    src.append(link);
    card.append(
      html("h3", undefined, i.name),
      html("p", "incident-meta", `${i.date} · ${i.setting}`),
      html("p", "incident-lead", i.what_happened),
      line(t("ui.stage.incident.oxygen"), i.oxygen),
      line(t("ui.stage.incident.changed"), i.changed),
      src,
    );
    return card;
  }
  function drawIncidents(ids: string[]): void {
    const all = api.data.incidents.incidents;
    const pages = ids.map((id) => all.find((i) => i.id === id)).filter((i): i is Incident => !!i);
    const cards = pages.map(incidentCard);
    if (store.get().lens !== "public") {
      incidents.classList.remove("public-picture");
      incidents.replaceChildren(...cards);
      return;
    }
    incidents.classList.add("public-picture");
    const side = html("div", "picture-side");
    const dial = dialSVG(ctx, pages);
    // the flame stands with its base at the dial's current oxygen mark (the ground when there is none)
    const mark = pages.map((i) => incidentO2(i.oxygen)).find((v): v is number => v !== null);
    const flameWrap = html("span", "flame-at-mark");
    flameWrap.style.bottom = `${((mark === undefined ? 0 : markerBottomFraction(mark)) * 100).toFixed(1).replace(/\.0$/, "")}%`;
    flameWrap.append(flameSVG(mark !== undefined));
    // the flame stands against the dial (its % height is the dial's); the side keeps
    // headroom above the dial for the flame's overhang (wide screens only, via CSS)
    const dialWrap = html("span", "dial-wrap");
    dialWrap.append(dial, flameWrap);
    side.style.setProperty("--flame-overhang", `${flameStandPad(mark, mark !== undefined)}px`);
    side.append(dialWrap);
    const seen = new Set<string>();
    const src = html("p", "dial-source");
    src.append(`${t("ui.stage.dial-source")}: `);
    for (const id of DIAL_IDS) {
      const a = api.atmosphere(id);
      if (seen.has(a.url)) continue;
      seen.add(a.url);
      if (src.querySelectorAll("a").length) src.append(", ");
      const link = html("a", undefined, a.source);
      link.href = a.url;
      link.rel = "noopener";
      src.append(link);
    }
    incidents.replaceChildren(side, src, ...cards);
  }

  // ---------- wiring ----------
  window.addEventListener(SELECT_INVESTIGATION, (e) => {
    selectedInv = (e as CustomEvent<{ investigation: string | null }>).detail.investigation;
    drawAll();
  });
  store.subscribe((state, prev) => {
    const full = state.stage !== prev.stage || state.locale !== prev.locale || state.lens !== prev.lens || state.family !== prev.family || (state.sliders === null) !== (prev.sliders === null);
    if (state.stage !== prev.stage) extra = [];
    if (full) drawAll();
    else if (state.sliders !== prev.sliders || state.family !== prev.family) drawLive();
  });

  if (!opts.size) {
    // the chart height is derived inside drawAll from the stage box minus the measured
    // legend, parade and explainer heights, so measuring here only means a full redraw
    const measure = (): void => drawAll();
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(measure).observe(root);
    else window.addEventListener("resize", measure);
    measure();
  } else drawAll();
}

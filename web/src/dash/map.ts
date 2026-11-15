// Evidence map (web-lane task 51, backend lane D6): the chosen air, the six
// families, and the 22 investigations as bars, with a detail panel. Bar length
// is the test count and the filled part is the plotted share; investigations
// with no plotted test are grey. Rows are keyboard reachable (arrows move,
// Enter opens) and every selection notifies the stage.
// Generated with Muse Spark, SI-assisted.
import "./dash.css";
import type { Ctx, Experiment, NearestQuery } from "../contract";
import { FAMILIES } from "../contract";
import { OPEN_LIBRARY_EVENT } from "../engine/index";
import { SELECT_INVESTIGATION } from "../stage/index";
import { cite, h } from "../ui/dom";
import { linkedFile, rankingQuery, TESTS_FILE } from "./overview";
import { summarize } from "./compare";
import { rankForAir } from "./ranking";

const SVG_NS = "http://www.w3.org/2000/svg";
const ROW_H = 30;
const PAD = 10;
const AIR_X = 8;
const AIR_W = 142;
const FAM_X = 170;
const BAR_X = 330;
const BAR_MAX = 280;
const SVG_W = 640;

const f1 = (v: number): string => String(Number(v.toFixed(1)));
const missing = (ctx: Ctx): HTMLElement => h("span", { class: "missing" }, ctx.t("ui.sheet.not-recorded"));

function el(name: string, attrs: Record<string, string> = {}): SVGElement {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function text(str: string, x: number, y: number, cls: string, own = false): SVGTextElement {
  const t = el("text", { x: String(x), y: String(y), class: cls }) as SVGTextElement;
  if (own) t.setAttribute("data-own", "");
  t.textContent = str;
  return t;
}

export interface MapRow {
  exp: Experiment;
  tests: number;
  placed: number;
  y: number;
}

function rows(ctx: Ctx): MapRow[] {
  const placedIds = new Set(ctx.api.placed().map((p) => p.id));
  const all = ctx.api.data.experiments.map((exp) => {
    const rs = ctx.api.data.tests.filter((t) => t.investigation === exp.id);
    return { exp, tests: rs.length, placed: rs.filter((r) => placedIds.has(r.id)).length, y: 0 };
  });
  const byFam = new Map<string, MapRow[]>();
  for (const f of FAMILIES) byFam.set(f, []);
  for (const r of all) byFam.get(r.exp.family)!.push(r);
  const out: MapRow[] = [];
  for (const f of FAMILIES) {
    const group = byFam.get(f)!;
    group.sort((a, b) => b.tests - a.tests || a.exp.acronym.localeCompare(b.exp.acronym));
    out.push(...group);
  }
  out.forEach((r, i) => {
    r.y = PAD + i * ROW_H + ROW_H / 2;
  });
  return out;
}

function svgHeight(n: number): number {
  return PAD * 2 + n * ROW_H;
}

function airValues(ctx: Ctx, query: NearestQuery): { name: string; url: string; values: string; own: boolean } {
  if (query.kind === "point") {
    const s = ctx.store.get().sliders!;
    return { name: ctx.t("ui.dash.map.air-your"), url: "", values: `${f1(s.pressure_kpa)} kPa · ${f1(s.o2_pct)} %`, own: true };
  }
  const atm = ctx.api.atmosphere(query.id);
  return {
    name: atm.name,
    url: atm.url,
    values: atm.o2_pct_max == null
      ? `${f1(atm.pressure_kpa)} kPa · ${f1(atm.o2_pct_min)} % +`
      : `${f1(atm.pressure_kpa)} kPa · ${f1(atm.o2_pct_min)}–${f1(atm.o2_pct_max)} %`,
    own: false,
  };
}

function moonLink(vals: string): HTMLAnchorElement {
  const a = document.createElement("a");
  a.href = "data/moon.json";
  a.textContent = vals;
  return a;
}

function select(ctx: Ctx, id: string): void {
  window.dispatchEvent(new CustomEvent(SELECT_INVESTIGATION, { detail: { investigation: id } }));
}

function openLibrary(opener: HTMLElement): void {
  window.dispatchEvent(new CustomEvent(OPEN_LIBRARY_EVENT, { detail: opener }));
}

function detailPanel(ctx: Ctx, id: string): HTMLElement {
  const { t, api } = ctx;
  const exp = api.experiment(id)!;
  const rs = api.data.tests.filter((r) => r.investigation === id);
  const s = summarize(rs, new Set(api.placed().map((p) => p.id)));
  const rangeTile = (label: string, r: [number, number] | null, unit: string): HTMLElement => {
    const body = h("p", { class: "dash-tile-body" });
    if (!r) body.append(missing(ctx));
    else {
      const line = `${f1(r[0])}–${f1(r[1])} ${unit}`;
      body.append(...linkedFile(line, [
        { text: f1(r[0]), file: TESTS_FILE },
        { text: f1(r[1]), file: TESTS_FILE },
      ]));
    }
    return h("div", { class: "dash-tile" }, h("p", { class: "dash-tile-label" }, label), body);
  };
  const outcomeBody = h("div", { class: "dash-tile-body" });
  if (s.outcomes.length === 0) outcomeBody.append(missing(ctx));
  for (const o of s.outcomes) {
    outcomeBody.append(h("p", { class: "dash-outcome-line" },
      h("span", {}, t(`ui.outcome.${o.outcome}`)),
      " · ",
      ...linkedFile(t("ui.dash.compare.fuel-tests", { n: o.tests }), [
        { text: String(o.tests), file: TESTS_FILE },
      ])));
  }
  const sum = exp.summary;
  const openBtn = h("button", { type: "button", class: "btn primary dash-open-story" }, t("ui.dash.map.open-story"));
  openBtn.addEventListener("click", () => openLibrary(openBtn));
  return h("div", { class: "dash-detail" },
    h("p", { class: "dash-detail-acronym" }, cite(exp.acronym, exp.psi_url)),
    h("p", { class: "dash-detail-family" }, t(`ui.family.${exp.family}`)),
    h("p", { class: "dash-detail-title" }, cite(exp.title, exp.psi_url, "plain")),
    h("p", { class: "dash-detail-tests" }, ...linkedFile(t("ui.dash.ranked.on-chart", { placed: s.placed, tests: s.tests }), [
      { text: String(s.placed), file: TESTS_FILE },
      { text: String(s.tests), file: TESTS_FILE },
    ])),
    h("div", { class: "dash-tiles" },
      rangeTile(t("ui.sheet.col.o2"), s.o2, t("ui.panel.unit.pct")),
      rangeTile(t("ui.sheet.col.pressure"), s.pressure, t("ui.panel.unit.kpa")),
      h("div", { class: "dash-tile" }, h("p", { class: "dash-tile-label" }, t("ui.dash.compare.outcomes")), outcomeBody)),
    sum
      ? h("div", { class: "dash-detail-summary" },
        h("p", {}, h("span", { class: "ai-tag" }, t("ui.sheet.detail.summary"))),
        h("p", {}, cite(sum.text, exp.psi_url, "plain")),
        h("p", { class: "by", "data-own": true }, t("ui.sheet.detail.summary-by", { model: sum.model, made_at: sum.made_at })))
      : h("p", {}, missing(ctx)),
    openBtn);
}

export function renderMap(ctx: Ctx): HTMLElement {
  const { t, api } = ctx;
  const list = rows(ctx);
  const maxTests = Math.max(1, ...list.map((r) => r.tests));
  const { query } = rankingQuery(ctx);
  const top = rankForAir(api, query, query.kind === "atmosphere" ? api.atmosphere(query.id) : null).ranked[0];
  let current = top?.investigation ?? list[0]!.exp.id;

  const root = h("section", { class: "dash-map", "aria-label": t("ui.dash.map.title") });
  const airSlot = h("span", { class: "dash-map-airslot" });
  const svg = el("svg", { class: "dash-tree", viewBox: `0 0 ${SVG_W} ${svgHeight(list.length)}`, role: "group" }) as SVGSVGElement;
  const panelSlot = h("div", { class: "dash-detail-slot" });

  const famY = new Map<string, number>();
  for (const f of FAMILIES) {
    const members = list.filter((r) => r.exp.family === f);
    if (members.length > 0) famY.set(f, members.reduce((n, r) => n + r.y, 0) / members.length);
  }

  function paintAir(): void {
    // The air node reads as HTML links above the tree root; the SVG keeps a marker box.
    const q = rankingQuery(ctx).query;
    const air = airValues(ctx, q);
    const name = air.url ? cite(air.name, air.url) : h("span", {}, air.name);
    const vals = air.own
      ? h("span", { "data-own": true }, air.values)
      : moonLink(air.values);
    airSlot.replaceChildren(h("p", { class: "dash-map-air" }, name, " · ", vals));
  }

  function TreeSvg(): SVGSVGElement {
    // links: air marker -> families -> investigations
    const airMidY = PAD + 22;
    for (const [f, y] of famY) {
      const line = el("line", {
        x1: String(AIR_X + AIR_W), y1: String(airMidY),
        x2: String(FAM_X), y2: String(y), class: "dash-link",
      });
      svg.append(line);
    }
    for (const f of FAMILIES) {
      const y = famY.get(f);
      if (y == null) continue;
      const label = text(t(`ui.family.${f}`), FAM_X, y + 4, "dash-map-family");
      label.setAttribute("data-family", f);
      svg.append(label);
    }
    for (const r of list) {
      const w = (BAR_MAX * r.tests) / maxTests;
      const fillW = (BAR_MAX * r.placed) / maxTests;
      const g = el("g", {
        class: "dash-map-row",
        tabindex: "0",
        role: "button",
        "data-investigation": r.exp.id,
        "data-family": r.exp.family,
        "aria-label": `${r.exp.acronym}: ${r.tests} tests, ${r.placed} on the chart`,
      }) as SVGGElement;
      const anchor = el("a", { href: r.exp.psi_url }) as unknown as SVGAElement;
      const label = text(r.exp.acronym, BAR_X - 8, r.y + 4, "dash-row-label");
      label.setAttribute("text-anchor", "end");
      anchor.append(label);
      g.append(anchor);
      g.append(el("rect", {
        x: String(BAR_X), y: String(r.y - 7), width: String(w), height: "14",
        class: "dash-bar-track",
      }));
      if (r.placed > 0) {
        g.append(el("rect", {
          x: String(BAR_X), y: String(r.y - 7), width: String(fillW), height: "14",
          class: "dash-bar-fill",
        }));
      } else {
        // unrankable: the whole bar is grey, even when there is nothing to show
        g.append(el("rect", {
          x: String(BAR_X), y: String(r.y - 7), width: String(w), height: "14",
          class: "dash-bar-grey",
        }));
      }
      g.addEventListener("click", () => choose(r.exp.id));
      g.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          choose(r.exp.id);
        } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const rows = [...svg.querySelectorAll(".dash-map-row")];
          const i = rows.indexOf(g);
          const next = rows[(i + (e.key === "ArrowDown" ? 1 : rows.length - 1)) % rows.length] as SVGGElement;
          next.focus();
          choose(next.getAttribute("data-investigation")!);
        }
      });
      svg.append(g);
    }
    // air marker box at the tree root
    svg.prepend(el("rect", {
      x: String(AIR_X), y: String(PAD), width: String(AIR_W), height: "44", class: "dash-map-airbox",
    }));
    return svg;
  }

  function paintPanel(): void {
    panelSlot.replaceChildren(detailPanel(ctx, current));
    for (const g of svg.querySelectorAll(".dash-map-row")) {
      g.setAttribute("data-active", String(g.getAttribute("data-investigation") === current));
    }
  }

  function choose(id: string): void {
    if (!api.experiment(id)) return;
    current = id;
    paintPanel();
    select(ctx, id);
  }

  const unsub = ctx.store.subscribe(() => {
    if (!root.isConnected) {
      unsub();
      return;
    }
    paintAir();
  });

  root.append(
    h("h3", { class: "dash-map-title" }, t("ui.dash.map.title")),
    airSlot,
    h("div", { class: "dash-map-grid" }, svg, panelSlot),
  );
  TreeSvg();
  paintAir();
  paintPanel();
  return root;
}

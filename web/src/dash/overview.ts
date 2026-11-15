// Dashboard overview tab (web-lane task 56, backend lane D3): the row of five large
// numbers, "Ranked for this air", and small multiples on shared axes. (b) the chart
// is the stage beside the sheet, driven by the same store filters; (e) the table is
// the investigations tab after this one. Nothing here animates.
// Generated with Muse Spark, SI-assisted.
import "./dash.css";
import type { Atmosphere, Ctx, NearestQuery } from "../contract";
import { SELECT_INVESTIGATION } from "../stage/index";
import { queryFromState } from "../store";
import { cite, h } from "../ui/dom";
import { nearestPlacedTest, rankForAir } from "./ranking";

export const TESTS_FILE = "data/tests.json";
const EXPERIMENTS_FILE = "data/experiments.json";
const COVERAGE_FILE = "data/coverage.json";

/** The air the dashboard ranks for: live sliders win, otherwise the Moon box. */
export function rankingQuery(ctx: Ctx): { query: NearestQuery; atmosphere: Atmosphere | null } {
  const fromState = queryFromState(ctx.store.get());
  if (fromState) {
    return {
      query: fromState,
      atmosphere: fromState.kind === "atmosphere" ? ctx.api.atmosphere(fromState.id) : null,
    };
  }
  const atmosphere = ctx.api.atmosphere("heo-dm-1006");
  return { query: { kind: "atmosphere", id: "heo-dm-1006" }, atmosphere };
}

function select(id: string): void {
  window.dispatchEvent(new CustomEvent(SELECT_INVESTIGATION, { detail: { investigation: id } }));
}

/**
 * Like linkedText, but the targets are data files: the hrefs stay relative so the
 * file the number was counted from opens. cite() would flatten them to "#".
 */
export function linkedFile(text: string, links: { text: string; file: string }[]): (Node | string)[] {
  let parts: (Node | string)[] = [text];
  for (const { text: needle, file } of [...links].sort((a, b) => b.text.length - a.text.length)) {
    const next: (Node | string)[] = [];
    for (const part of parts) {
      if (typeof part !== "string" || !part.includes(needle)) {
        next.push(part);
        continue;
      }
      const i = part.indexOf(needle);
      next.push(part.slice(0, i), h("a", { href: file }, needle), part.slice(i + needle.length));
    }
    parts = next;
  }
  return parts;
}

function nameButton(id: string, acronym: string): HTMLButtonElement {
  const btn = h("button", { type: "button", class: "dash-name", "data-investigation": id }, acronym);
  btn.addEventListener("click", () => select(id));
  return btn;
}

function figure(label: string, value: number, file: string): HTMLElement {
  return h("figure", { class: "dash-figure" },
    h("a", { class: "dash-num", href: file }, String(value)),
    h("figcaption", {}, label));
}

/** (a) the row of five large numbers, each linked to the file it was counted from. */
function numbersSection(ctx: Ctx): HTMLElement {
  const { t, api } = ctx;
  const rows = api.data.tests;
  const withO2 = rows.filter((r) => r.o2_pct != null).length;
  const pubs = api.data.experiments.reduce((n, e) => n + e.publications.length, 0);
  const { plotted, total } = api.coverage();
  return h("div", { class: "dash-figures", role: "list", "aria-label": t("ui.dash.tab.overview") },
    h("div", { class: "dash-figure-wrap", role: "listitem" }, figure(t("ui.dash.numbers.investigations"), api.data.experiments.length, EXPERIMENTS_FILE)),
    h("div", { class: "dash-figure-wrap", role: "listitem" }, figure(t("ui.dash.numbers.tests"), total, TESTS_FILE)),
    h("div", { class: "dash-figure-wrap", role: "listitem" }, figure(t("ui.dash.numbers.plotted"), plotted, COVERAGE_FILE)),
    h("div", { class: "dash-figure-wrap", role: "listitem" }, figure(t("ui.dash.numbers.oxygen"), withO2, COVERAGE_FILE)),
    h("div", { class: "dash-figure-wrap", role: "listitem" }, figure(t("ui.dash.numbers.publications"), pubs, EXPERIMENTS_FILE)));
}

/** (c) "Ranked for this air": every ranked investigation with its numbers, then the rest. */
function rankingSection(ctx: Ctx, query: NearestQuery, atmosphere: Atmosphere | null): HTMLElement {
  const { t, api } = ctx;
  const { ranked, unrankable } = rankForAir(api, query, atmosphere);
  const rows = ranked.map((r) => {
    const exp = api.experiment(r.investigation)!;
    const near = nearestPlacedTest(api, r.investigation, query, atmosphere)!;
    const onChart = t("ui.dash.ranked.on-chart", { placed: r.placed, tests: r.tests });
    return h("li", { class: "dash-ranked-row" },
      nameButton(r.investigation, r.acronym),
      h("span", { class: "dash-id" }, cite(r.investigation, exp.psi_url, "dash-acronym")),
      h("span", { class: "dash-nums" },
        cite(`d ${r.d_min}`, near.url, "dash-d"),
        " · ",
        ...linkedFile(t("ui.dash.ranked.near", { n: r.near }), [{ text: String(r.near), file: TESTS_FILE }]),
        " · ",
        ...linkedFile(onChart, [
          { text: String(r.placed), file: TESTS_FILE },
          { text: String(r.tests), file: TESTS_FILE },
        ])));
  });
  const rest = unrankable.map((r) => {
    const exp = api.experiment(r.investigation)!;
    const link = cite(exp.id, exp.psi_url, "dash-acronym");
    link.setAttribute("data-investigation", r.investigation);
    return h("li", { class: "dash-unranked-row" }, link, `: ${t("ui.dash.ranked.unrankable")}`);
  });
  return h("section", { class: "dash-ranked", "aria-labelledby": "dash-ranked-title" },
    h("h3", { id: "dash-ranked-title" }, t("ui.dash.ranked.title")),
    // the rule's fixed scales are contract constants, marked data-own like the panel weighting
    h("p", { class: "dash-rule", "data-own": true }, t("ui.dash.ranked.rule")),
    h("ol", {}, ...rows),
    h("ul", { class: "dash-unranked" }, ...rest));
}

const SVG_W = 220;
const SVG_H = 140;
const SVG_M = { l: 34, r: 8, t: 8, b: 20 };

/** Shared pressure/oxygen domains across every multiple, from the placed tests. */
export function sharedDomains(ctx: Ctx): { x0: number; x1: number; y0: number; y1: number } {
  const placed = ctx.api.placed();
  return {
    x0: Math.min(...placed.map((p) => p.pressure_kpa)),
    x1: Math.max(...placed.map((p) => p.pressure_kpa)),
    y0: Math.min(...placed.map((p) => p.o2_pct)),
    y1: Math.max(...placed.map((p) => p.o2_pct)),
  };
}

const SVG_NS = "http://www.w3.org/2000/svg";

function miniChart(
  ctx: Ctx,
  investigation: string,
  d: { x0: number; x1: number; y0: number; y1: number },
): SVGSVGElement {
  const { t, api } = ctx;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${SVG_W} ${SVG_H}`);
  svg.setAttribute("role", "img");
  const pts = api.placed().filter((p) => p.investigation === investigation);
  const exp = api.experiment(investigation)!;
  svg.setAttribute("aria-label", `${exp.acronym}: ${pts.length} tests on the chart`);
  svg.setAttribute("data-investigation", investigation);
  svg.setAttribute("data-x0", String(d.x0));
  svg.setAttribute("data-x1", String(d.x1));
  svg.setAttribute("data-y0", String(d.y0));
  svg.setAttribute("data-y1", String(d.y1));
  const X = (p: number): number => SVG_M.l + ((p - d.x0) / (d.x1 - d.x0 || 1)) * (SVG_W - SVG_M.l - SVG_M.r);
  const Y = (o: number): number => SVG_M.t + (1 - (o - d.y0) / (d.y1 - d.y0 || 1)) * (SVG_H - SVG_M.t - SVG_M.b);
  const f = (v: number): string => String(Number(v.toFixed(1)));
  for (const v of [d.x0, (d.x0 + d.x1) / 2, d.x1]) {
    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("x", String(X(v)));
    text.setAttribute("y", String(SVG_H - 6));
    text.setAttribute("class", "dash-tick");
    text.setAttribute("data-own", "");
    text.textContent = f(v);
    svg.append(text);
  }
  for (const v of [d.y0, (d.y0 + d.y1) / 2, d.y1]) {
    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("x", String(4));
    text.setAttribute("y", String(Y(v) + 3));
    text.setAttribute("class", "dash-tick");
    text.setAttribute("data-own", "");
    text.textContent = f(v);
    svg.append(text);
  }
  const xt = document.createElementNS(SVG_NS, "text");
  xt.setAttribute("x", String(SVG_W - SVG_M.r));
  xt.setAttribute("y", String(SVG_H - 6));
  xt.setAttribute("class", "dash-axis");
  xt.textContent = `${t("ui.nearest.pressure")} (${t("ui.panel.unit.kpa")})`;
  svg.append(xt);
  const yt = document.createElementNS(SVG_NS, "text");
  yt.setAttribute("x", String(4));
  yt.setAttribute("y", String(SVG_M.t + 4));
  yt.setAttribute("class", "dash-axis");
  yt.textContent = `${t("ui.nearest.oxygen")} (${t("ui.panel.unit.pct")})`;
  svg.append(yt);
  for (const p of pts) {
    const c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("cx", String(X(p.pressure_kpa)));
    c.setAttribute("cy", String(Y(p.o2_pct)));
    c.setAttribute("r", "2");
    c.setAttribute("class", "dash-dot");
    svg.append(c);
  }
  return svg;
}

/** (d) small multiples: one mini chart per investigation with placed tests, same axes on all. */
function multiplesSection(ctx: Ctx): HTMLElement {
  const { t, api } = ctx;
  const d = sharedDomains(ctx);
  const placedIds = new Set(api.placed().map((p) => p.investigation));
  const cards: HTMLElement[] = [];
  for (const e of api.data.experiments) {
    if (placedIds.has(e.id)) {
      const rows = api.data.tests.filter((r) => r.investigation === e.id);
      const placed = api.placed().filter((p) => p.investigation === e.id).length;
      const onChart = t("ui.dash.ranked.on-chart", { placed, tests: rows.length });
      cards.push(h("div", { class: "dash-multiple" },
        nameButton(e.id, e.acronym),
        miniChart(ctx, e.id, d),
        h("p", { class: "dash-multiple-count" }, ...linkedFile(onChart, [
          { text: String(placed), file: TESTS_FILE },
          { text: String(rows.length), file: TESTS_FILE },
        ]))));
    } else {
      const rows = api.data.tests.filter((r) => r.investigation === e.id);
      const line = rows.length === 0
        ? t("ui.dash.multiples.no-rows")
        : linkedFile(t("ui.dash.multiples.unplaced", { n: rows.length }), [{ text: String(rows.length), file: TESTS_FILE }]);
      const link = cite(e.acronym, e.psi_url, "dash-acronym");
      link.setAttribute("data-investigation", e.id);
      cards.push(h("div", { class: "dash-missing" }, link, h("p", {}, ...(Array.isArray(line) ? line : [line]))));
    }
  }
  return h("section", { class: "dash-multiples", "aria-labelledby": "dash-multiples-title" },
    h("h3", { id: "dash-multiples-title" }, t("ui.dash.multiples.title")),
    h("div", { class: "dash-grid" }, ...cards));
}

/**
 * The dashboard overview tab. The ranking follows the store: a slider move rebuilds
 * only the ranking section, and the subscription cleans itself up once detached.
 */
export function renderOverview(ctx: Ctx): HTMLElement {
  const { t, store } = ctx;
  const root = h("section", { class: "dash-overview", "aria-label": t("ui.dash.tab.overview") });
  const first = rankingQuery(ctx);
  const rankSlot = h("div", { class: "dash-rank-slot" }, rankingSection(ctx, first.query, first.atmosphere));
  let lastQuery = JSON.stringify(first.query);
  const unsub = store.subscribe(() => {
    if (!root.isConnected) {
      unsub();
      return;
    }
    const next = rankingQuery(ctx);
    const sig = JSON.stringify(next.query);
    if (sig !== lastQuery) {
      lastQuery = sig;
      rankSlot.replaceChildren(rankingSection(ctx, next.query, next.atmosphere));
    }
  });
  root.append(numbersSection(ctx), rankSlot, multiplesSection(ctx));
  return root;
}

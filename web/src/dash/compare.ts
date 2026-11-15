// Compare two investigations side by side, and one investigation by fuel
// (web-lane task 57, backend lane D4). Ranges are recomputed here from the test
// rows by the pipeline's documented method; tests/test pin them to moments.json.
// Generated with Muse Spark, SI-assisted.
import "./dash.css";
import type { Ctx, Experiment, Outcome, TestRun } from "../contract";
import { SELECT_INVESTIGATION } from "../stage/index";
import { cite, h } from "../ui/dom";
import { linkedFile, rankingQuery, sharedDomains, TESTS_FILE } from "./overview";
import { rankForAir } from "./ranking";

export type Range1D = [number, number] | null;

export interface FuelGroup {
  fuel: string;
  tests: number;
  placed: number;
  o2: Range1D;
  pressure: Range1D;
  flow: Range1D;
}

export interface Summary {
  tests: number;
  placed: number;
  o2: Range1D;
  pressure: Range1D;
  flow: Range1D;
  outcomes: { outcome: Outcome; tests: number }[];
  fuels: FuelGroup[];
  nullFuel: number;
}

const nums = (vs: (number | null | undefined)[]): number[] => vs.filter((v): v is number => v != null);

/** Mirror of the pipeline's o2-range method: min of o2_pct_min (else o2_pct), max of o2_pct_max (else o2_pct). */
function o2Range(rows: TestRun[]): Range1D {
  const lo = nums(rows.map((r) => r.o2_pct_min ?? r.o2_pct));
  const hi = nums(rows.map((r) => r.o2_pct_max ?? r.o2_pct));
  return lo.length > 0 && hi.length > 0 ? [Math.min(...lo), Math.max(...hi)] : null;
}

/** Mirror of the pipeline's pressure/flow-range methods: min and max over recorded cells. */
function minMax(rows: TestRun[], pick: (r: TestRun) => number | null | undefined): Range1D {
  const v = nums(rows.map(pick));
  return v.length > 0 ? [Math.min(...v), Math.max(...v)] : null;
}

function groups(rows: TestRun[], placed: Set<string>): FuelGroup[] {
  const byFuel = new Map<string, TestRun[]>();
  for (const r of rows) {
    if (!r.fuel) continue;
    const list = byFuel.get(r.fuel) ?? [];
    list.push(r);
    byFuel.set(r.fuel, list);
  }
  return [...byFuel]
    .map(([fuel, rs]) => ({
      fuel,
      tests: rs.length,
      placed: rs.filter((r) => placed.has(r.id)).length,
      o2: o2Range(rs),
      pressure: minMax(rs, (r) => r.pressure_kpa),
      flow: minMax(rs, (r) => r.flow_cm_s ?? null),
    }))
    .sort((a, b) => b.tests - a.tests || a.fuel.localeCompare(b.fuel));
}

/** Everything the compare views show for one set of rows. */
export function summarize(rows: TestRun[], placed: Set<string>): Summary {
  const byOutcome = new Map<Outcome, number>();
  for (const r of rows) byOutcome.set(r.outcome, (byOutcome.get(r.outcome) ?? 0) + 1);
  return {
    tests: rows.length,
    placed: rows.filter((r) => placed.has(r.id)).length,
    o2: o2Range(rows),
    pressure: minMax(rows, (r) => r.pressure_kpa),
    flow: minMax(rows, (r) => r.flow_cm_s ?? null),
    outcomes: [...byOutcome]
      .map(([outcome, n]) => ({ outcome, tests: n }))
      .sort((a, b) => b.tests - a.tests || a.outcome.localeCompare(b.outcome)),
    fuels: groups(rows, placed),
    nullFuel: rows.filter((r) => !r.fuel).length,
  };
}

const f1 = (v: number): string => String(Number(v.toFixed(1)));
const missing = (ctx: Ctx): HTMLElement => h("span", { class: "missing" }, ctx.t("ui.sheet.not-recorded"));

function rangeLine(ctx: Ctx, label: string, r: Range1D, unit: string): HTMLElement {
  const p = h("p", { class: "dash-range" }, `${label}: `);
  if (!r) p.append(missing(ctx));
  else {
    const text = `${f1(r[0])}–${f1(r[1])} ${unit}`;
    for (const kid of linkedFile(text, [
      { text: f1(r[0]), file: TESTS_FILE },
      { text: f1(r[1]), file: TESTS_FILE },
    ])) p.append(kid);
  }
  return p;
}

function countLine(ctx: Ctx, n: number): (Node | string)[] {
  return linkedFile(ctx.t("ui.dash.compare.fuel-tests", { n }), [{ text: String(n), file: TESTS_FILE }]);
}

function column(ctx: Ctx, exp: Experiment, rows: TestRun[], placed: Set<string>): HTMLElement {
  const { t } = ctx;
  const s = summarize(rows, placed);
  const fuelItems = s.fuels.map((g) =>
    h("li", {},
      h("a", { href: TESTS_FILE }, g.fuel),
      " · ",
      ...countLine(ctx, g.tests)));
  if (s.nullFuel > 0) {
    fuelItems.push(h("li", {}, ...linkedFile(t("ui.dash.compare.no-fuel", { n: s.nullFuel }), [
      { text: String(s.nullFuel), file: TESTS_FILE },
    ])));
  }
  const outcomeItems = s.outcomes.map((o) =>
    h("li", {},
      h("span", {}, t(`ui.outcome.${o.outcome}`)),
      " · ",
      ...countLine(ctx, o.tests)));
  const col = h("section", { class: "dash-compare-col", "aria-label": exp.acronym },
    h("p", { class: "dash-compare-name" }, cite(exp.id, exp.psi_url, "dash-acronym")),
    h("p", { class: "dash-compare-family" }, `${t("ui.sheet.col.family")}: ${t(`ui.family.${exp.family}`)}`),
    h("p", { class: "dash-label" }, t("ui.sheet.detail.objective")),
    exp.objective
      ? h("blockquote", { class: "dash-objective" }, cite(exp.objective, exp.psi_url, "plain"))
      : h("p", {}, missing(ctx)),
    h("p", { class: "dash-label" }, t("ui.dash.compare.fuels")),
    s.fuels.length > 0 || s.nullFuel > 0 ? h("ul", { class: "dash-fuels" }, ...fuelItems) : h("p", {}, missing(ctx)),
    rangeLine(ctx, t("ui.sheet.col.o2"), s.o2, t("ui.panel.unit.pct")),
    rangeLine(ctx, t("ui.sheet.col.pressure"), s.pressure, t("ui.panel.unit.kpa")),
    rangeLine(ctx, t("ui.nearest.flow"), s.flow, "cm/s"),
    h("p", { class: "dash-label" }, t("ui.dash.compare.outcomes")),
    s.outcomes.length > 0
      ? h("ul", { class: "dash-outcomes" }, ...outcomeItems)
      : h("p", {}, missing(ctx)),
    h("p", { class: "dash-share" }, ...linkedFile(t("ui.dash.ranked.on-chart", { placed: s.placed, tests: s.tests }), [
      { text: String(s.placed), file: TESTS_FILE },
      { text: String(s.tests), file: TESTS_FILE },
    ])));
  return col;
}

const SVG_W = 560;
const SVG_H = 340;
const SVG_M = { l: 40, r: 10, t: 10, b: 26 };
const SVG_NS = "http://www.w3.org/2000/svg";

/** Both dot sets on one chart in two tones, on the shared domains. Circles are A, squares are B. */
function dotsChart(ctx: Ctx, a: Experiment, b: Experiment): HTMLElement | null {
  const { t, api } = ctx;
  const dotsA = api.placed().filter((p) => p.investigation === a.id);
  const dotsB = api.placed().filter((p) => p.investigation === b.id);
  if (dotsA.length + dotsB.length === 0) return null;
  const d = sharedDomains(ctx);
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${SVG_W} ${SVG_H}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `${a.acronym} and ${b.acronym} on the shared axes`);
  const X = (p: number): number => SVG_M.l + ((p - d.x0) / (d.x1 - d.x0 || 1)) * (SVG_W - SVG_M.l - SVG_M.r);
  const Y = (o: number): number => SVG_M.t + (1 - (o - d.y0) / (d.y1 - d.y0 || 1)) * (SVG_H - SVG_M.t - SVG_M.b);
  for (const v of [d.x0, (d.x0 + d.x1) / 2, d.x1]) {
    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("x", String(X(v)));
    text.setAttribute("y", String(SVG_H - 8));
    text.setAttribute("class", "dash-tick");
    text.setAttribute("data-own", "");
    text.textContent = f1(v);
    svg.append(text);
  }
  for (const v of [d.y0, (d.y0 + d.y1) / 2, d.y1]) {
    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("x", String(6));
    text.setAttribute("y", String(Y(v) + 3));
    text.setAttribute("class", "dash-tick");
    text.setAttribute("data-own", "");
    text.textContent = f1(v);
    svg.append(text);
  }
  const xt = document.createElementNS(SVG_NS, "text");
  xt.setAttribute("x", String(SVG_W - SVG_M.r));
  xt.setAttribute("y", String(SVG_H - 8));
  xt.setAttribute("class", "dash-axis");
  xt.textContent = `${t("ui.nearest.pressure")} (${t("ui.panel.unit.kpa")})`;
  svg.append(xt);
  const yt = document.createElementNS(SVG_NS, "text");
  yt.setAttribute("x", String(6));
  yt.setAttribute("y", String(SVG_M.t + 6));
  yt.setAttribute("class", "dash-axis");
  yt.textContent = `${t("ui.nearest.oxygen")} (${t("ui.panel.unit.pct")})`;
  svg.append(yt);
  for (const p of dotsA) {
    const c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("cx", String(X(p.pressure_kpa)));
    c.setAttribute("cy", String(Y(p.o2_pct)));
    c.setAttribute("r", "2.5");
    c.setAttribute("class", "dash-dot-a");
    svg.append(c);
  }
  for (const p of dotsB) {
    const c = document.createElementNS(SVG_NS, "rect");
    c.setAttribute("x", String(X(p.pressure_kpa) - 2.5));
    c.setAttribute("y", String(Y(p.o2_pct) - 2.5));
    c.setAttribute("width", "5");
    c.setAttribute("height", "5");
    c.setAttribute("class", "dash-dot-b");
    svg.append(c);
  }
  return h("div", { class: "dash-compare-chart" },
    h("p", { class: "dash-legend", "data-own": true },
      h("span", { class: "dash-swatch-a" }),
      h("span", {}, cite(a.acronym, a.psi_url)),
      h("span", { class: "dash-swatch-b" }),
      h("span", {}, cite(b.acronym, b.psi_url))),
    svg);
}

function pick(ctx: Ctx, cls: string, labelKey: string, current: string, onChange: (id: string) => void): HTMLElement {
  const { t, api } = ctx;
  // acronyms can hold digits (FLEX-2): names, not measurements
  const sel = h("select", { class: cls, "data-own": true }) as HTMLSelectElement;
  for (const e of api.data.experiments) {
    const o = document.createElement("option");
    o.value = e.id;
    o.textContent = e.acronym;
    sel.append(o);
  }
  sel.value = current;
  sel.addEventListener("change", () => onChange(sel.value));
  const id = `dash-pick-${cls}`;
  sel.id = id;
  return h("div", { class: "dash-pick" }, h("label", { for: id }, t(labelKey)), sel);
}

/** "Inside one investigation": its tests grouped by fuel with the ranges per group. */
function insideView(ctx: Ctx, focus: string, onFocus: (id: string) => void): HTMLElement {
  const { t, api } = ctx;
  const exp = api.experiment(focus)!;
  const rows = api.data.tests.filter((r) => r.investigation === focus);
  const s = summarize(rows, new Set(api.placed().map((p) => p.id)));
  const groupEls = s.fuels.map((g) =>
    h("div", { class: "dash-fuel-group" },
      h("p", { class: "dash-fuel-name" }, h("a", { href: TESTS_FILE }, g.fuel)),
      h("p", {}, ...countLine(ctx, g.tests)),
      rangeLine(ctx, t("ui.sheet.col.o2"), g.o2, t("ui.panel.unit.pct")),
      rangeLine(ctx, t("ui.sheet.col.pressure"), g.pressure, t("ui.panel.unit.kpa")),
      rangeLine(ctx, t("ui.nearest.flow"), g.flow, "cm/s")));
  if (s.nullFuel > 0) {
    groupEls.push(h("div", { class: "dash-fuel-group" },
      h("p", {}, ...linkedFile(t("ui.dash.compare.no-fuel", { n: s.nullFuel }), [
        { text: String(s.nullFuel), file: TESTS_FILE },
      ]))));
  }
  return h("section", { class: "dash-inside", "aria-labelledby": "dash-inside-title" },
    h("h3", { id: "dash-inside-title" }, t("ui.dash.compare.inside")),
    pick(ctx, "dash-inside-pick", "ui.dash.compare.focus", focus, onFocus),
    rows.length === 0
      ? h("p", {}, cite(exp.acronym, exp.psi_url), ` ${t("ui.dash.multiples.no-rows")}`)
      : h("div", { class: "dash-fuel-groups" }, ...groupEls));
}

/** The first two ranked for the current air; the experiments list order when fewer rank. */
function defaultPair(ctx: Ctx): [string, string] {
  const { query, atmosphere } = rankingQuery(ctx);
  const top = rankForAir(ctx.api, query, atmosphere).ranked.map((r) => r.investigation);
  const exps = ctx.api.data.experiments.map((e) => e.id);
  return [top[0] ?? exps[0]!, top[1] ?? exps.find((id) => id !== (top[0] ?? exps[0]))!];
}

export function renderCompare(ctx: Ctx): HTMLElement {
  const { t } = ctx;
  let [a, b] = defaultPair(ctx);
  let focus = a;
  const root = h("section", { class: "dash-compare", "aria-label": t("ui.dash.compare.title") });
  const pairSlot = h("div", { class: "dash-pair-slot" });
  const insideSlot = h("div", { class: "dash-inside-slot" });

  function renderPair(): void {
    const api = ctx.api;
    const expA = api.experiment(a)!;
    const expB = api.experiment(b)!;
    const placed = new Set(api.placed().map((p) => p.id));
    pairSlot.replaceChildren(
      column(ctx, expA, api.data.tests.filter((r) => r.investigation === a), placed),
      column(ctx, expB, api.data.tests.filter((r) => r.investigation === b), placed),
    );
    const chart = dotsChart(ctx, expA, expB);
    const old = pairSlot.querySelector(".dash-compare-chart");
    if (old) old.remove();
    if (chart) pairSlot.append(chart);
  }

  function renderInside(): void {
    insideSlot.replaceChildren(insideView(ctx, focus, (id) => {
      focus = id;
      renderInside();
    }));
  }

  const pickA = pick(ctx, "dash-compare-pick", "ui.dash.compare.first", a, (id) => {
    a = id;
    syncPicks();
    renderPair();
  });
  const pickB = pick(ctx, "dash-compare-pick", "ui.dash.compare.second", b, (id) => {
    b = id;
    syncPicks();
    renderPair();
  });
  // Keep the two slots distinct without ids: A is the first pick, B the second.
  function syncPicks(): void {
    const [sa, sb] = [...root.querySelectorAll("select.dash-compare-pick")] as HTMLSelectElement[];
    sa.value = a;
    sb.value = b;
  }

  const unsub = ctx.store.subscribe(() => {
    if (!root.isConnected) unsub();
  });
  window.addEventListener(SELECT_INVESTIGATION, function onSelect(e) {
    if (!root.isConnected) {
      window.removeEventListener(SELECT_INVESTIGATION, onSelect);
      return;
    }
    const id = (e as CustomEvent<{ investigation: string | null }>).detail.investigation;
    if (id && ctx.api.experiment(id)) {
      a = id;
      syncPicks();
      renderPair();
    }
  });

  root.append(
    h("h3", { class: "dash-compare-title" }, t("ui.dash.compare.title")),
    h("div", { class: "dash-compare-picks" }, pickA, pickB),
    pairSlot,
    insideSlot,
  );
  renderPair();
  renderInside();
  return root;
}

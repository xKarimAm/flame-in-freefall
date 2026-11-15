// @vitest-environment jsdom
// Generated with Claude, SI-assisted. Real golden and curated files; fixtures only for the two missing experiments.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppData, Ctx, DataApi, Experiment, NearestRow, PlacedTest, TestRun } from "../contract";
import { dicts as i18nDicts } from "../i18n/index";
import { SELECT_INVESTIGATION } from "../stage/index";
import { createDataApi } from "../data/index";
import { stories } from "../engine/stories";
import { makeT } from "../i18n/index";
import { createStore, initialState } from "../store";
import { airName } from "./dom";
import { mount } from "./index";

const read = (rel: string): any => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));
const tests: TestRun[] = read("../../../contracts/golden/tests.json");
const moon = read("../../../data/curated/moon.json");
const incidents = read("../../../data/curated/incidents.json");
const fixture = (id: string, family: Experiment["family"], n: number): Experiment => ({
  id, acronym: `fixture-${family}`, title: `Fixture for ${id}`, family, doi: null,
  psi_url: `https://psi.nasa.gov/physci/repo/data/investigations/${id}`, license: "CC0-1.0", objective: "",
  test_count: n, o2_pct_range: null, pressure_kpa_range: null, has_outcomes: true, publications: [],
});
const experiments: Experiment[] = [
  ...read("../../../contracts/golden/experiments.json"),
  fixture("PSI-69", "droplets", 1),
  fixture("PSI-159", "gas jets", 1),
];
const data: AppData = { experiments, tests, moon, incidents };

/** Just enough of the real data API for the UI: placed / nearest / notPlaced computed from the golden rows. */
function fakeApi(): DataApi {
  const base = createDataApi(data);
  const placed = (): PlacedTest[] =>
    tests.flatMap((t) => {
      const family = base.familyOf(t.investigation);
      if (t.gravity !== "micro-g" || t.o2_pct == null || t.pressure_kpa == null || !family) return [];
      return [{ id: t.id, investigation: t.investigation, family, fuel: t.fuel, o2_pct: t.o2_pct, pressure_kpa: t.pressure_kpa, flow_cm_s: t.flow_cm_s ?? null, outcome: t.outcome, url: t.source.url }];
    });
  return {
    ...base,
    placed,
    notPlaced: (family) =>
      tests
        .filter((t) => t.pressure_kpa == null || t.o2_pct == null)
        .map((t) => ({ id: t.id, investigation: t.investigation, family: base.familyOf(t.investigation), fuel: t.fuel, o2_pct: t.o2_pct, pressure_kpa: t.pressure_kpa, outcome: t.outcome, url: t.source.url, reason: "no pressure recorded" }))
        .filter((r) => !family || r.family === family),
    nearest(query, n = 10, family) {
      if (query.kind !== "point") throw new Error("fake: point queries only");
      const rows: NearestRow[] = placed()
        .filter((p) => !family || p.family === family)
        .map((p) => ({
          ...p,
          ppo2_kpa: Math.round(p.pressure_kpa * p.o2_pct) / 100,
          gravity: "micro-g" as const,
          d: Math.hypot((query.pressure_kpa - p.pressure_kpa) / 25, (query.o2_pct - p.o2_pct) / 5),
        }))
        .sort((a, b) => a.d - b.d || a.id.localeCompare(b.id))
        .slice(0, n);
      const wentOut = rows.find((r) => r.outcome === "extinction" || r.outcome === "self-extinguished") ?? null;
      return { query, rows, familyMix: [], nearestBurned: null, nearestWentOut: wentOut };
    },
  };
}

const roots = () => ({
  chrome: document.getElementById("chrome")!,
  panel: document.getElementById("panel")!,
  sheet: document.getElementById("sheet")!,
  overlay: document.getElementById("overlay")!,
});
const p159 = tests.find((t) => t.id === "PSI-159#1")!;
const p69 = tests.find((t) => t.id === "PSI-69#2")!;

function setup(sliders: { pressure_kpa: number; o2_pct: number } | null = { pressure_kpa: p159.pressure_kpa!, o2_pct: p159.o2_pct! }, dicts: Ctx["dicts"] = {}) {
  document.body.innerHTML = `<header id="chrome"></header><div id="story"></div><aside id="panel" hidden></aside><section id="sheet" hidden></section><div id="overlay" hidden></div>`;
  const store = createStore({ ...initialState, sliders });
  const ctx: Ctx = { api: fakeApi(), store, dicts, t: makeT(() => "en") };
  mount(roots(), ctx);
  return { store, ctx };
}

/** Text nodes with a digit that are neither inside an https link nor marked data-own. */
function unlinkedNumbers(root: Element): string[] {
  const out: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (/\d/.test(n.textContent ?? "") && !n.parentElement!.closest('a[href^="https://"], [data-own]')) out.push(n.textContent!.trim());
  }
  return out;
}

const buttons = (root: Element) => [...root.querySelectorAll("button")];

describe("ui", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("the rule check can fail: a bare number is reported", () => {
    const d = document.createElement("div");
    d.innerHTML = `<p>56 kPa</p><p data-own>5</p><a href="https://x.test/">7</a><a href="http://x.test/">8</a>`;
    expect(unlinkedNumbers(d)).toEqual(["56 kPa", "8"]);
  });

  it("every number in the panel and the sheet is linked to its source or marked data-own", () => {
    const { store } = setup();
    store.set({ lens: "analyst" });
    const sheet = roots().sheet;
    for (const root of [roots().panel, sheet]) expect(unlinkedNumbers(root)).toEqual([]);
    buttons(sheet)[1].click(); // margins tab
    expect(sheet.querySelector(".margin-table")).not.toBeNull();
    expect(unlinkedNumbers(sheet)).toEqual([]);
    expect(roots().panel.querySelectorAll("a.num").length).toBeGreaterThan(0);
  });

  describe("plain air names (task 22)", () => {
    const plain: Record<string, string> = {
      "iss-air": "Earth air (and the space station)",
      "heo-dm-1006": "Planned Moon-base air",
      "exp-10-2": "Planned Moon-base air, earlier stage",
      "moon-base-brief": "Moon base or rover",
      suit: "Inside a spacesuit",
    };
    it("airName speaks plain words in the Public lens and keeps the moon.json name elsewhere", () => {
      const t = makeT(() => "en");
      const en = i18nDicts.en!;
      for (const [id, words] of Object.entries(plain)) {
        expect(en[`ui.air.${id}`]).toBe(words);
        const atm = moon.atmospheres.find((a: { id: string }) => a.id === id)!;
        expect(airName("public", atm, t)).toBe(words);
        expect(airName("astronaut", atm, t)).toBe(atm.name);
        expect(airName("analyst", atm, t)).toBe(atm.name);
      }
    });
    it("slider presets speak plain words in Public and engineering names after a lens switch", () => {
      const { store } = setup(); // public
      const labels = () => [...roots().panel.querySelectorAll(".presets .btn")].map((b) => b.textContent);
      expect(labels()).toEqual(["Planned Moon-base air", "Planned Moon-base air, earlier stage", "Earth air (and the space station)"]);
      store.set({ lens: "astronaut" });
      expect(labels()).toEqual(
        ["heo-dm-1006", "exp-10-2", "iss-air"].map((id) => moon.atmospheres.find((a: { id: string; name: string }) => a.id === id)!.name),
      );
    });
  });

  it("shows the two exact sentences", () => {
    setup();
    const text = roots().panel.textContent!;
    expect(text).toContain("Nearest tested conditions, not a prediction. All tests ran in microgravity.");
    expect(text).toContain("Distance counts 5 oxygen points the same as 25 kPa of pressure.");
  });

  it("a slider input changes store.sliders and the list re-renders from the api", () => {
    const { store } = setup();
    const first = () => roots().panel.querySelector("ol.nearest li")!.textContent!;
    expect(first()).toContain(p159.fuel!);
    const o2 = roots().panel.querySelector<HTMLInputElement>("#slider-o2")!;
    const pr = roots().panel.querySelector<HTMLInputElement>("#slider-pressure")!;
    o2.value = String(p69.o2_pct);
    pr.value = String(p69.pressure_kpa);
    o2.dispatchEvent(new Event("input", { bubbles: true }));
    expect(store.get().sliders!.o2_pct).toBe(p69.o2_pct);
    expect(first()).toContain(p69.fuel!);
    expect(roots().panel.querySelector("#slider-o2")).toBe(o2); // not re-created while dragging
  });

  it("shows a null flow as 'not recorded', never 0", () => {
    setup({ pressure_kpa: p69.pressure_kpa!, o2_pct: p69.o2_pct! });
    const li = roots().panel.querySelector("ol.nearest li")!;
    expect(li.textContent).toContain(p69.fuel!);
    expect(li.textContent).toMatch(/Flow\s+\S*\s*not recorded/);
  });

  it("the Public lens leads with one answer sentence and the details behind a button", () => {
    const { ctx } = setup(); // public
    const panel = roots().panel;
    expect(unlinkedNumbers(panel)).toEqual([]);
    const first = ctx.api.nearest({ kind: "point", pressure_kpa: p159.pressure_kpa!, o2_pct: p159.o2_pct! }, 10).rows[0]!;
    const ans = panel.querySelector(".answer")!;
    const links = [...ans.querySelectorAll<HTMLAnchorElement>("a")];
    const o2 = links.find((a) => a.textContent!.includes("%"))!;
    const pressure = links.find((a) => a.textContent!.includes("kPa"))!;
    const fuel = links.find((a) => a !== o2 && a !== pressure)!;
    // one row, one source: every number a link to it
    expect(new Set(links.map((a) => a.href)).size).toBe(1);
    expect(links[0]!.href).toMatch(/^https:\/\//);
    // the sentence is built from the first nearest row: fuel, oxygen, pressure, outcome
    expect(fuel.textContent).toBe(first.fuel);
    expect(o2.textContent).toContain(String(Number(first.o2_pct.toFixed(1))));
    expect(pressure.textContent).toContain(String(Number(first.pressure_kpa.toFixed(1))));
    expect(ans.textContent).toContain(ctx.t(`ui.outcome.${first.outcome}`));
    const btnText = (label: string) => [...panel.querySelectorAll("button")].find((b) => b.textContent === label)!;
    const details = () => panel.querySelector(".nearest-details")!;
    expect(btnText("Show the details").getAttribute("aria-expanded")).toBe("false");
    expect(details().hasAttribute("hidden")).toBe(true);
    btnText("Show the details").click();
    expect(details().hasAttribute("hidden")).toBe(false);
    expect(btnText("Hide the details").getAttribute("aria-expanded")).toBe("true");
    expect(panel.querySelector("ol.nearest")).not.toBeNull();
    btnText("Hide the details").click();
    expect(details().hasAttribute("hidden")).toBe(true);
  });

  it("Astronaut and Analyst keep the full list with no answer sentence", () => {
    const { store } = setup();
    for (const lens of ["astronaut", "analyst"] as const) {
      store.set({ lens });
      const panel = roots().panel;
      expect(panel.querySelector(".answer")).toBeNull();
      expect(panel.querySelector(".nearest-details")).toBeNull();
      expect(panel.querySelector("ol.nearest")).not.toBeNull();
    }
  });

  it("lists the not-placed SAFFIRE rows and both nearest lines", () => {
    setup();
    const t = roots().panel.textContent!;
    expect(t).toContain("SIBAL Fabric");
    expect(t).toContain("no pressure recorded");
    expect(t).toContain("Nearest test that kept burning: none recorded");
    expect(t).toContain("Nearest test that went out by itself");
  });

  it("the panel is hidden while the sliders are locked", () => {
    const { store } = setup(null);
    expect(roots().panel.hidden).toBe(true);
    store.set({ sliders: { pressure_kpa: 50, o2_pct: 30 } });
    expect(roots().panel.hidden).toBe(false);
  });

  it("lens buttons set store.lens and toggle the sheet", () => {
    const { store } = setup();
    const btn = (lens: string) => roots().chrome.querySelector<HTMLButtonElement>(`[data-lens="${lens}"]`)!;
    expect(btn("public").getAttribute("aria-pressed")).toBe("true");
    expect(roots().sheet.hidden).toBe(true);
    btn("analyst").click();
    expect(store.get().lens).toBe("analyst");
    expect(btn("analyst").getAttribute("aria-pressed")).toBe("true");
    expect(roots().sheet.hidden).toBe(false);
    btn("astronaut").click();
    expect(roots().sheet.hidden).toBe(true);
  });

  it("header button groups wrap instead of clipping", () => {
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "ui.css"), "utf8");
    expect(css).toMatch(/\.lens-switch\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(css).toMatch(/\.locale-switch\s*\{[^}]*flex-wrap:\s*wrap/);
  });

  it("the panel is a bottom sheet under 1100px", () => {
    const base = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../styles/base.css"), "utf8");
    expect(base).toMatch(/@media\s*\(max-width:\s*1099px\)\s*\{[^}]*#panel\s*\{[^}]*bottom:\s*0/);
    expect(base).toMatch(/@media\s*\(max-width:\s*1099px\)\s*\{[^}]*#panel\s*\{[^}]*max-height:\s*45vh/);
  });

  it("the language picker lists the loaded locales and switches the store locale", () => {
    const { store } = setup(null, i18nDicts);
    const btns = [...roots().chrome.querySelectorAll<HTMLButtonElement>("button[data-locale]")];
    expect(btns.map((b) => b.getAttribute("data-locale")).sort()).toEqual(Object.keys(i18nDicts).sort());
    const target = (Object.keys(i18nDicts) as (keyof typeof i18nDicts)[]).find((l) => l !== "en") ?? "en";
    btns.find((b) => b.getAttribute("data-locale") === target)!.click();
    expect(store.get().locale).toBe(target);
    expect(roots().chrome.querySelector(`button[data-locale="${target}"]`)!.getAttribute("aria-pressed")).toBe("true");
  });

  it("the investigations table has one row per experiment, sorted by family then acronym", () => {
    const { store } = setup();
    store.set({ lens: "analyst" });
    const rows = [...roots().sheet.querySelectorAll("table.investigations tbody tr")];
    expect(rows.length).toBe(experiments.length);
    expect(rows.map((r) => r.children[2].textContent)).toEqual(["droplets", "gas jets", "large-scale solids"]);
    expect(roots().sheet.querySelector("caption")!.textContent).toBe(`3 investigations, ${tests.length} tests in the data`);
    expect(rows[2].textContent).toContain("not recorded"); // PSI-98 has no pressure range
  });

  it("Analyst replaces the story column with a full-height sheet", () => {
    const { store } = setup();
    store.set({ lens: "analyst" });
    expect(document.body.dataset.lens).toBe("analyst");
    expect(roots().sheet.hidden).toBe(false);
    const base = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../styles/base.css"), "utf8");
    expect(base).toMatch(/body\[data-lens="analyst"\] #story\s*\{\s*display:\s*none/);
    expect(base).toMatch(/body\[data-lens="analyst"\] #sheet\s*\{[^}]*width:\s*min\(52rem, 46vw\)/);
  });

  it("columns sort both ways and the family filter narrows the rows", () => {
    const { store } = setup();
    store.set({ lens: "analyst" });
    const sheet = roots().sheet;
    const acros = () => [...sheet.querySelectorAll("table.investigations tbody tr")].map((r) => r.children[0].textContent);
    const sortBtn = (label: string) => [...sheet.querySelectorAll<HTMLButtonElement>("th button.sort")].find((b) => b.textContent === label)!;
    const th = (label: string) => sortBtn(label).closest("th")!;
    sortBtn("Investigation").click();
    const asc = [...experiments].map((e) => e.acronym).sort((a, b) => a.localeCompare(b));
    expect(acros()).toEqual(asc);
    expect(th("Investigation").getAttribute("aria-sort")).toBe("ascending");
    sortBtn("Investigation").click();
    expect(acros()).toEqual([...asc].reverse());
    expect(th("Investigation").getAttribute("aria-sort")).toBe("descending");
    const sel = sheet.querySelector<HTMLSelectElement>("#sheet-family")!;
    sel.value = "droplets";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    expect(acros()).toEqual(experiments.filter((e) => e.family === "droplets").map((e) => e.acronym));
    sel.value = "";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    expect([...sheet.querySelectorAll("table.investigations tbody tr")].length).toBe(experiments.length);
  });

  it("a row opens its test rows with recorded values and source links", () => {
    const { store } = setup();
    store.set({ lens: "analyst" });
    const target = experiments.find((e) => e.id === "PSI-98")!;
    const btn = [...roots().sheet.querySelectorAll<HTMLButtonElement>("button.row-open")].find((b) => b.textContent === target.acronym)!;
    btn.click();
    const detail = roots().sheet.querySelector("tr.detail")!;
    const rows = tests.filter((r) => r.investigation === "PSI-98");
    expect(rows.length).toBeGreaterThan(0);
    const body = detail.querySelectorAll("table.test-rows tbody tr");
    expect(body.length).toBe(rows.length);
    rows.forEach((r, i) => {
      const cells = body[i]!.querySelectorAll("td");
      const link = cells[5]!.querySelector("a")!;
      expect(link.textContent).toBe(r.id);
      expect(link.getAttribute("href")).toBe(r.source.url);
      if (r.fuel) expect(cells[0]!.textContent).toContain(r.fuel);
      if (r.o2_pct !== null) expect(cells[1]!.textContent).toContain(String(Number(r.o2_pct.toFixed(1))));
      if (r.pressure_kpa !== null) expect(cells[2]!.textContent).toContain(String(Number(r.pressure_kpa.toFixed(1))));
    });
    expect(unlinkedNumbers(roots().sheet)).toEqual([]);
  });

  it("the Public lens explains the sliders once on the interactive page", () => {
    const { store } = setup();
    const panel = roots().panel;
    expect(panel.querySelector<HTMLElement>(".panel-exp")!.hidden).toBe(true);
    store.set({
      sliders: { pressure_kpa: 56.5, o2_pct: 34 },
      beat: { story: "moon-air", scene: "moon-air-main", beat: "interactive", kind: "interactive" },
    });
    const box = panel.querySelector<HTMLElement>(".panel-exp")!;
    expect(box.hidden).toBe(false);
    expect(box.textContent).toContain("sliders");
    store.set({ lens: "astronaut" });
    expect(panel.querySelector<HTMLElement>(".panel-exp")!.hidden).toBe(true);
  });

  it("selecting a row dispatches for the chart; an incoming selection opens the row", () => {
    const { store } = setup();
    store.set({ lens: "analyst" });
    const seen: (string | null)[] = [];
    window.addEventListener(SELECT_INVESTIGATION, (e) =>
      seen.push((e as CustomEvent<{ investigation: string | null }>).detail.investigation));
    const psi69 = experiments.find((e) => e.id === "PSI-69")!;
    const btn69 = [...roots().sheet.querySelectorAll<HTMLButtonElement>("button.row-open")].find((b) => b.textContent === psi69.acronym)!;
    btn69.click();
    expect(seen).toEqual(["PSI-69"]);
    expect(roots().sheet.querySelector("tr.detail")).not.toBeNull();
    const psi98 = experiments.find((e) => e.id === "PSI-98")!;
    window.dispatchEvent(new CustomEvent(SELECT_INVESTIGATION, { detail: { investigation: "PSI-98" } }));
    const openBtn = roots().sheet.querySelector("tr.detail")!.previousElementSibling!.querySelector("button.row-open")!;
    expect(openBtn.textContent).toBe(psi98.acronym);
    window.dispatchEvent(new CustomEvent(SELECT_INVESTIGATION, { detail: { investigation: null } }));
    expect(roots().sheet.querySelector("tr.detail")).toBeNull();
  });

  it("search and filters narrow the investigations table and the count follows", () => {
    const { store } = setup();
    store.set({ lens: "analyst" });
    const sheet = roots().sheet;
    const rows = () => [...sheet.querySelectorAll("table.investigations tbody tr")];
    const box = sheet.querySelector<HTMLInputElement>("#sheet-search")!;
    box.value = "droplet";
    box.dispatchEvent(new Event("input", { bubbles: true }));
    expect(rows().length).toBe(1);
    expect(sheet.querySelector("table.investigations caption")!.textContent).toContain("1 investigations");
    box.value = "";
    box.dispatchEvent(new Event("input", { bubbles: true }));
    expect(rows().length).toBe(experiments.length);
    const fuel = "Methanol";
    const fuelSel = sheet.querySelector<HTMLSelectElement>("#sheet-fuel")!;
    fuelSel.value = fuel;
    fuelSel.dispatchEvent(new Event("change", { bubbles: true }));
    const wanted = experiments.filter((e) => tests.some((t) => t.investigation === e.id && t.fuel === fuel));
    expect(wanted.length).toBeGreaterThan(0);
    expect(rows().length).toBe(wanted.length);
    fuelSel.value = "";
    fuelSel.dispatchEvent(new Event("change", { bubbles: true }));
    const outSel = sheet.querySelector<HTMLSelectElement>("#sheet-outcome")!;
    outSel.value = "burned";
    outSel.dispatchEvent(new Event("change", { bubbles: true }));
    expect(rows().length).toBe(experiments.filter((e) => tests.some((t) => t.investigation === e.id && t.outcome === "burned")).length);
    outSel.value = "";
    outSel.dispatchEvent(new Event("change", { bubbles: true }));
    const plotSel = sheet.querySelector<HTMLSelectElement>("#sheet-plotted")!;
    plotSel.value = "unplaced";
    plotSel.dispatchEvent(new Event("change", { bubbles: true }));
    expect(rows().length).toBe(1); // only PSI-98 has a row with no pressure recorded
    plotSel.value = "all";
    plotSel.dispatchEvent(new Event("change", { bubbles: true }));
    expect(rows().length).toBe(experiments.length);
    expect(unlinkedNumbers(sheet)).toEqual([]);
  });

  it("the tests tab sorts every column and its rows link to their PSI rows", () => {
    const { store } = setup();
    store.set({ lens: "analyst" });
    const sheet = roots().sheet;
    sheet.querySelectorAll<HTMLButtonElement>("button.tab")[2]!.click();
    const rows = () => [...sheet.querySelectorAll("table.tests-table tbody tr")];
    expect(rows().length).toBe(tests.length);
    expect(sheet.querySelector("table.tests-table caption")!.textContent).toContain(`${tests.length} matching test rows`);
    const sortBtn = (label: string) => [...sheet.querySelectorAll<HTMLButtonElement>("table.tests-table th button.sort")].find((b) => b.textContent === label)!;
    sortBtn("Oxygen").click();
    const o2s = rows().map((r) => r.children[2].textContent);
    const fmt = (v: number) => String(Number(v.toFixed(1)));
    const nums = tests.map((t) => t.o2_pct as number);
    expect(o2s[0]).toContain(fmt(Math.min(...nums)));
    sortBtn("Oxygen").click();
    expect(rows()[0]!.children[2].textContent).toContain(fmt(Math.max(...nums)));
    const link = rows()[0]!.querySelectorAll("td")[6]!.querySelector("a")!;
    expect(link.getAttribute("href")).toMatch(/^https:\/\//);
    expect(unlinkedNumbers(sheet)).toEqual([]);
  });

  it("the tests tab caption counts matching rows and missing values sort last both ways", () => {
    const extra: TestRun = {
      id: "PSI-26#x", investigation: "PSI-26", fuel: "cloth-x", fuel_class: "solid", gravity: "micro-g",
      o2_pct: null, pressure_kpa: null, outcome: "unknown",
      source: { file: "csv_26_0.csv", row: 1, url: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-26" },
    };
    tests.push(extra);
    try {
      const { store } = setup();
      store.set({ lens: "analyst" });
      const sheet = roots().sheet;
      sheet.querySelectorAll<HTMLButtonElement>("button.tab")[2]!.click();
      const rows = () => [...sheet.querySelectorAll("table.tests-table tbody tr")];
      const caption = () => sheet.querySelector("table.tests-table caption")!.textContent!;
      expect(caption()).toBe(`${tests.length} matching test rows`);
      const fuelSel = sheet.querySelector<HTMLSelectElement>("#sheet-fuel")!;
      fuelSel.value = "cloth-x";
      fuelSel.dispatchEvent(new Event("change", { bubbles: true }));
      expect(rows().length).toBe(1);
      expect(caption()).toBe("1 matching test rows");
      fuelSel.value = "";
      fuelSel.dispatchEvent(new Event("change", { bubbles: true }));
      const o2 = (r: Element) => r.children[2].textContent!;
      const sortBtn = (label: string) => [...sheet.querySelectorAll<HTMLButtonElement>("table.tests-table th button.sort")].find((b) => b.textContent === label)!;
      sortBtn("Oxygen").click(); // ascending: the unrecorded row sinks to the bottom
      expect(o2(rows().at(-1)!)).toContain("not recorded");
      sortBtn("Oxygen").click(); // descending: the unrecorded row stays at the bottom
      expect(o2(rows()[0]!)).not.toContain("not recorded");
      expect(o2(rows().at(-1)!)).toContain("not recorded");
      expect(unlinkedNumbers(sheet)).toEqual([]);
    } finally {
      tests.pop();
    }
  });

  it("the coverage panel counts every reason and the downloads link the data files", () => {
    const extra: TestRun = {
      id: "PSI-101#1", investigation: "PSI-101", fuel: null, fuel_class: "smoke", gravity: "micro-g",
      o2_pct: null, pressure_kpa: null, outcome: "unknown",
      source: { file: "csv_101_0.csv", row: 1, url: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-101" },
    };
    tests.push(extra);
    try {
      const { store, ctx } = setup();
      store.set({ lens: "analyst" });
      const sheet = roots().sheet;
      const { plotted, total } = ctx.api.coverage();
      expect(sheet.textContent).toContain(`Plotted ${plotted} of ${total} tests`);
      const reasons = new Map<string, number>();
      for (const r of ctx.api.notPlaced()) reasons.set(r.reason, (reasons.get(r.reason) ?? 0) + 1);
      expect(reasons.size).toBeGreaterThan(0);
      for (const [reason, n] of reasons) {
        const li = [...sheet.querySelectorAll(".coverage li")].find((e) => e.textContent!.startsWith(reason));
        expect(li!.textContent).toContain(String(n));
      }
      const hrefs = [...sheet.querySelectorAll(".downloads a")].map((a) => (a as HTMLAnchorElement).getAttribute("href"));
      expect(hrefs).toEqual(["data/tests.json", "data/experiments.json", "data/moments.json"]);
      expect(sheet.querySelectorAll(".downloads a[download]").length).toBe(3);
      expect(unlinkedNumbers(sheet)).toEqual([]);
    } finally {
      tests.pop();
    }
  });

  it("the default sheet tab follows the beat; the person can switch freely", () => {
    const { store } = setup();
    store.set({ lens: "analyst" });
    const selected = () => roots().sheet.querySelector('[aria-selected="true"]')!.textContent;
    expect(selected()).toBe("All investigations");
    store.set({ beat: { story: "s", scene: "a", beat: "b", kind: "focus" }, stage: { view: "tilt-lunar", analyst_sheet: "lunar-margins" } });
    expect(selected()).toBe("Moon-gravity margins");
    buttons(roots().sheet)[0].click();
    expect(selected()).toBe("All investigations");
    store.set({ beat: { story: "s", scene: "a", beat: "c", kind: "focus" }, stage: { view: "tilt-lunar", analyst_sheet: "table" } });
    expect(selected()).toBe("All investigations");
  });

  it("sheet tabs move with the arrow keys", () => {
    const { store } = setup();
    store.set({ lens: "analyst" });
    const sheet = roots().sheet;
    const tabs = () => [...sheet.querySelectorAll<HTMLButtonElement>("button.tab")];
    const selected = () => tabs().findIndex((b) => b.getAttribute("aria-selected") === "true");
    tabs()[0]!.focus();
    expect(selected()).toBe(0);
    tabs()[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(selected()).toBe(1);
    expect(document.activeElement).toBe(tabs()[1]);
    tabs()[1]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(selected()).toBe(0);
    expect(document.activeElement).toBe(tabs()[0]);
    tabs()[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(selected()).toBe(2); // wraps around
  });

  it("the brand is the Firebreak mark, the name and a blue ug; it scrolls to the top", () => {
    setup();
    const brand = roots().chrome.querySelector<HTMLButtonElement>("button.brand")!;
    expect(brand.querySelector(".brand-mark svg")).not.toBeNull();
    expect(brand.querySelector(".brand-mark")!.getAttribute("aria-hidden")).toBe("true");
    expect(brand.querySelector(".brand-name")!.textContent).toBe("Firebreak");
    expect(brand.querySelector("sup")!.textContent).toBe("μg");
    expect(brand.querySelector("text")).toBeNull(); // the mark carries no lettering
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    brand.click();
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  });

  it("the chapter rail has one chip per story, marks the one in view and scrolls to it", () => {
    const { store, ctx } = setup();
    const nav = roots().chrome.querySelector("nav.rail")!;
    expect(nav.getAttribute("aria-label")).toBe("Chapters");
    const chips = [...nav.querySelectorAll<HTMLButtonElement>("button.chip")];
    expect(stories.length).toBeGreaterThan(0);
    expect(chips.length).toBe(stories.length);
    expect(chips[0].textContent).toContain(String(stories[0].act));
    expect(chips[0].textContent).toContain(ctx.t(stories[0].title_key));
    expect(chips.map((c) => c.textContent).join(" ")).toContain("Build your Moon-base air");
    expect(chips.some((c) => c.getAttribute("aria-current") === "true")).toBe(false);
    store.set({ beat: { story: stories[0].id, scene: "s", beat: "b", kind: "focus" } });
    expect(chips.map((c) => c.getAttribute("aria-current"))).toEqual(stories.map((st, i) => (i === 0 ? "true" : null)));
    store.set({ beat: { story: "elsewhere", scene: "s", beat: "b", kind: "focus" } });
    expect(chips[0].hasAttribute("aria-current")).toBe(false);
    document.getElementById("story")!.innerHTML = `<section id="story-${stories[0].id}"></section>`;
    chips[0].click();
    expect((Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mock.contexts.at(-1)).toBe(document.getElementById(`story-${stories[0].id}`));
  });

  it("with no stories there is no rail", () => {
    const saved = stories.splice(0);
    try {
      setup();
      expect(roots().chrome.querySelector("nav.rail")).toBeNull();
    } finally {
      stories.push(...saved);
    }
  });

  describe("investigation detail", () => {
    const summary = {
      text: "SAFFIRE-I burned a 0.4 m wide fabric in a cargo vehicle.",
      quotes: ["determine how rapidly a large scale fire grows in low-gravity"],
      model: "muse-spark-1.3-contributor",
      made_at: "2026-11-15T01:00:00Z",
    };
    const saffire = () => experiments.find((e) => e.id === "PSI-98")!;
    const open = () => {
      const { store } = setup();
      store.set({ lens: "analyst" });
      const btn = [...roots().sheet.querySelectorAll<HTMLButtonElement>("button.row-open")].find((b) => b.textContent === saffire().acronym)!;
      btn.click();
      return { btn, detail: roots().sheet.querySelector("tr.detail")! };
    };

    it("opens from the acronym and shows the objective word for word, the AI summary with its tag, quotes, DOI links and the PSI link", () => {
      const before = { summary: saffire().summary, publications: saffire().publications };
      saffire().summary = summary;
      saffire().publications = [{ title: "A paper", authors: "A Writer", doi: "10.1234/abc", year: "2020" }, { title: "No DOI paper", authors: null, doi: null, year: null }];
      try {
        const { btn, detail } = open();
        expect(btn.getAttribute("aria-expanded")).toBe("true");
        expect(detail.textContent).toContain(saffire().objective);
        const tag = detail.querySelector(".ai-tag")!;
        expect(tag.textContent).toBe("AI summary");
        expect(detail.textContent).toContain(summary.text);
        expect(detail.textContent).toContain(`Written by ${summary.model} on ${summary.made_at}`);
        expect([...detail.querySelectorAll("ul.quotes li q")].map((q) => q.textContent)).toEqual(summary.quotes);
        const hrefs = [...detail.querySelectorAll("a")].map((a) => a.getAttribute("href"));
        expect(hrefs).toContain("https://doi.org/10.1234/abc");
        expect(hrefs).toContain(saffire().psi_url);
        expect(detail.querySelectorAll("ul.papers li")[1].textContent).toMatch(/DOI:\s*not recorded/);
        expect(unlinkedNumbers(roots().sheet)).toEqual([]);
        btn.click(); // the same button closes it
        expect(roots().sheet.querySelector("tr.detail")).toBeNull();
        expect(btn.getAttribute("aria-expanded")).toBe("false");
      } finally {
        Object.assign(saffire(), before);
      }
    });

    it("a missing summary or DOI says 'not recorded' and nothing is guessed", () => {
      const { detail } = open();
      expect(saffire().summary ?? null).toBeNull();
      expect(detail.querySelector(".ai-tag")!.textContent).toBe("AI summary");
      expect(detail.querySelector(".ai-summary")).toBeNull();
      expect(detail.textContent).toContain("not recorded");
      const withDoi = saffire().publications.filter((p) => p.doi);
      expect([...detail.querySelectorAll('a[href^="https://doi.org/"]')].length).toBe(withDoi.length);
      expect(detail.querySelectorAll("ul.papers li").length).toBe(saffire().publications.length);
      expect(detail.querySelectorAll("ul.papers li .missing").length).toBe(saffire().publications.length - withDoi.length);
      expect(unlinkedNumbers(roots().sheet)).toEqual([]);
    });
  });

  it("Skip scrolls to the first slider step; Stories opens, cards scroll, Escape closes and returns focus", () => {
    setup();
    document.getElementById("story")!.innerHTML =
      `<section id="story-moon-air" data-story="moon-air" data-act="3" data-title="Build your Moon-base air"><div class="step" id="x"></div><div class="step" id="y" data-sliders="true"></div></section>`;
    const scroll = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
    buttons(roots().chrome).find((b) => b.className.includes("primary"))!.click();
    expect(scroll.mock.contexts.at(-1)).toBe(document.getElementById("y"));

    const stories = buttons(roots().chrome).find((b) => b.textContent === "Stories")!;
    stories.click();
    expect(roots().overlay.hidden).toBe(false);
    const card = roots().overlay.querySelector<HTMLButtonElement>(".story-card")!;
    expect(card.textContent).toContain("Build your Moon-base air");
    card.click();
    expect(roots().overlay.hidden).toBe(true);
    expect(scroll.mock.contexts.at(-1)).toBe(document.getElementById("story-moon-air"));
    stories.click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(roots().overlay.hidden).toBe(true);
    expect(document.activeElement).toBe(stories);
  });

  it("the overlay search filters stories by title, family and acronym, with a count", () => {
    setup();
    document.getElementById("story")!.innerHTML =
      `<section id="story-moon-air" data-story="moon-air" data-act="3" data-title="Build your Moon-base air"></section><section id="story-what-nasa-tested" data-story="what-nasa-tested" data-act="2" data-title="What NASA has tested"></section>`;
    const storiesBtn = buttons(roots().chrome).find((b) => b.textContent === "Stories")!;
    storiesBtn.click();
    const box = roots().overlay.querySelector<HTMLInputElement>("#overlay-search")!;
    const visible = () => [...roots().overlay.querySelectorAll<HTMLElement>(".story-card")].filter((c) => !c.hidden);
    expect(visible().length).toBe(2);
    box.value = "flex";
    box.dispatchEvent(new Event("input", { bubbles: true }));
    expect(visible().length).toBe(1);
    expect(visible()[0]!.textContent).toContain("What NASA has tested");
    expect(roots().overlay.querySelector(".overlay-count")!.textContent).toBe("1 of 2 stories");
    box.value = "moon-base";
    box.dispatchEvent(new Event("input", { bubbles: true }));
    expect(visible().length).toBe(1);
    expect(visible()[0]!.textContent).toContain("Build your Moon-base air");
    box.value = "";
    box.dispatchEvent(new Event("input", { bubbles: true }));
    expect(visible().length).toBe(2);
  });

  it("the overlay search matches chapter questions", () => {
    setup();
    document.getElementById("story")!.innerHTML =
      `<section id="story-moon-air" data-story="moon-air" data-act="3" data-title="Build your Moon-base air"></section><section id="story-what-nasa-tested" data-story="what-nasa-tested" data-act="2" data-title="What NASA has tested"></section>`;
    const storiesBtn = buttons(roots().chrome).find((b) => b.textContent === "Stories")!;
    storiesBtn.click();
    const box = roots().overlay.querySelector<HTMLInputElement>("#overlay-search")!;
    const visible = () => [...roots().overlay.querySelectorAll<HTMLElement>(".story-card")].filter((c) => !c.hidden);
    box.value = "must still be tested"; // the-gap's question, but that story is not on the page
    box.dispatchEvent(new Event("input", { bubbles: true }));
    expect(visible().length).toBe(0);
    box.value = "care about fire"; // why-oxygen's question, but that story is not on the page either
    box.dispatchEvent(new Event("input", { bubbles: true }));
    expect(visible().length).toBe(0);
    box.value = "inside or outside"; // moon-air's question
    box.dispatchEvent(new Event("input", { bubbles: true }));
    expect(visible().length).toBe(1);
    expect(visible()[0]!.textContent).toContain("Build your Moon-base air");
    expect(roots().overlay.querySelector(".overlay-count")!.textContent).toBe("1 of 2 stories");
  });

  it("the engine ending card opens the Stories overlay through the open-overlay event", () => {
    setup();
    document.getElementById("story")!.innerHTML =
      `<section id="story-moon-air" data-story="moon-air" data-act="3" data-title="Build your Moon-base air"></section>`;
    expect(roots().overlay.hidden).toBe(true);
    const opener = document.createElement("button");
    window.dispatchEvent(new CustomEvent("firebreak:open-overlay", { detail: opener }));
    expect(roots().overlay.hidden).toBe(false);
    const cards = roots().overlay.querySelectorAll(".story-card");
    expect(cards.length).toBe(1);
    expect(cards[0]!.textContent).toContain("Build your Moon-base air");
  });
});

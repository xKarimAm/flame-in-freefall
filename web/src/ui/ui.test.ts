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
import { airName, cite, safeHref } from "./dom";
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
const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "ui.css"), "utf8");
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

  it("safeHref keeps only https: links, and cite uses it (task 39)", () => {
    expect(safeHref("https://ntrs.nasa.gov/citations/20220006612")).toBe("https://ntrs.nasa.gov/citations/20220006612");
    expect(safeHref("javascript:alert(1)")).toBe("#"); // taste-skill-ignore: the probe value under test
    expect(safeHref("http://example.com/x")).toBe("#"); // taste-skill-ignore: reserved example domain
    expect(safeHref("10.1016/j.fuel.2013.02.025")).toBe("#");
    expect(cite("x", "javascript:alert(1)").getAttribute("href")).toBe("#");
    expect(cite("x", "https://example.com").getAttribute("href")).toBe("https://example.com"); // taste-skill-ignore: reserved example domain
  });

  it("every number in the panel and the sheet is linked to its source or marked data-own", () => {
    const { store } = setup();
    store.set({ lens: "analyst" });
    const sheet = roots().sheet;
    for (const root of [roots().panel, sheet]) expect(unlinkedNumbers(root)).toEqual([]);
    buttons(sheet).find((b) => b.getAttribute("role") === "tab" && b.textContent === "Moon-gravity margins")!.click(); // margins tab
    expect(sheet.querySelector(".margin-table")).not.toBeNull();
    expect(unlinkedNumbers(sheet)).toEqual([]);
    expect(roots().panel.querySelectorAll("a.num").length).toBeGreaterThan(0);
  });

  describe("dashboard overview tab (backend lane D3)", () => {
    const overviewTab = () =>
      [...roots().sheet.querySelectorAll('[role="tab"]')].find((b) => b.getAttribute("data-tab") === "overview")!;

    it("mounts as the first tab with figures, ranking and multiples", () => {
      const { store } = setup();
      store.set({ lens: "analyst" });
      const sheet = roots().sheet;
      expect([...sheet.querySelectorAll('[role="tab"]')][0]!.textContent).toBe("Dashboard");
      (overviewTab() as HTMLButtonElement).click();
      expect(sheet.querySelectorAll(".dash-figures .dash-figure")).toHaveLength(5);
      expect(sheet.querySelector(".dash-ranked ol")!.children.length).toBeGreaterThan(0);
      expect(sheet.querySelector(".dash-multiples svg")).not.toBeNull();
      expect(sheet.querySelector(".dash-multiples .dash-missing")).not.toBeNull();
    });

    it("selecting a ranked row notifies the stage", () => {
      const { store } = setup();
      store.set({ lens: "analyst" });
      (overviewTab() as HTMLButtonElement).click();
      const seen: string[] = [];
      window.addEventListener(SELECT_INVESTIGATION, (e) => seen.push((e as CustomEvent).detail.investigation));
      (roots().sheet.querySelector(".dash-ranked ol li button") as HTMLButtonElement).click();
      expect(seen).toHaveLength(1);
    });

    it("the compare tab pairs two investigations with a two-tone chart and fuel groups", () => {
      const { store } = setup();
      store.set({ lens: "analyst" });
      const sheet = roots().sheet;
      const tabs = [...sheet.querySelectorAll('[role="tab"]')];
      expect(tabs[1]!.textContent).toBe("Compare");
      (tabs[1] as HTMLButtonElement).click();
      expect(sheet.querySelectorAll(".dash-compare-col")).toHaveLength(2);
      expect(sheet.querySelectorAll("select.dash-compare-pick")).toHaveLength(2);
      expect(sheet.querySelector(".dash-compare-chart svg")).not.toBeNull();
      expect(sheet.querySelector(".dash-inside .dash-fuel-group")).not.toBeNull();
    });

    it("the method tab mounts with its title", () => {
      const { store } = setup();
      store.set({ lens: "analyst" });
      const sheet = roots().sheet;
      const tabs = [...sheet.querySelectorAll('[role="tab"]')];
      expect(tabs[2]!.textContent).toBe("Method");
      (tabs[2] as HTMLButtonElement).click();
      expect(sheet.querySelector(".dash-method-title")!.textContent).toBe("How the data was made");
    });

    it("the map tab mounts the tree and the detail panel", () => {
      const { store } = setup();
      store.set({ lens: "analyst" });
      const sheet = roots().sheet;
      const tabs = [...sheet.querySelectorAll('[role="tab"]')];
      expect(tabs[3]!.textContent).toBe("Evidence map");
      (tabs[3] as HTMLButtonElement).click();
      expect(sheet.querySelectorAll(".dash-map-row").length).toBeGreaterThan(0);
      expect(sheet.querySelector(".dash-detail")).not.toBeNull();
      expect(sheet.querySelector(".dash-open-story")).not.toBeNull();
    });

    it("analyst tables right-align numeric cells and headers with tabular figures", () => {
      const { store } = setup();
      store.set({ lens: "analyst" });
      const sheet = roots().sheet;
      const colIndex = (table: Element, label: string): number =>
        [...table.querySelectorAll("thead th")].findIndex((th) => th.textContent === label);
      const checkCol = (table: Element, label: string): void => {
        const i = colIndex(table, label);
        expect(i, `${label} header`).toBeGreaterThanOrEqual(0);
        expect(table.querySelector(`thead th:nth-child(${i + 1})`)!.className).toContain("num");
        for (const tr of table.querySelectorAll("tbody tr")) {
          if (tr.classList.contains("detail")) continue;
          expect(tr.children[i]!.className, `${label} cell`).toContain("num");
        }
      };
      // investigations table: counts and ranges, not names or yes/no words
      const inv = sheet.querySelector("table.investigations")!;
      for (const label of ["Tests", "Oxygen range", "Pressure range", "Papers"]) checkCol(inv, label);
      expect(colIndex(inv, "Investigation")).toBeGreaterThanOrEqual(0);
      expect(inv.querySelector("thead th:first-child")!.className).not.toContain("num");
      // detail rows: oxygen, pressure, flow
      (sheet.querySelector("button.row-open") as HTMLButtonElement).click();
      const detail = sheet.querySelector("table.test-rows")!;
      for (const label of ["Oxygen", "Pressure", "Flow"]) checkCol(detail, label);
      // test rows tab
      sheet.querySelector<HTMLButtonElement>("button.tab[data-tab=tests]")!.click();
      const rows = sheet.querySelector("table.tests-table")!;
      for (const label of ["Oxygen", "Pressure", "Flow"]) checkCol(rows, label);
      // margins tab: the delta column
      sheet.querySelector<HTMLButtonElement>('button.tab[data-tab="margins"]')!.click();
      const margins = sheet.querySelector("table.margin-table")!;
      const deltaHeads = [...margins.querySelectorAll("thead th")].map((th) => th.textContent!);
      const delta = deltaHeads.indexOf("Oxygen margin (percentage points)");
      expect(delta, deltaHeads.join(" | ")).toBeGreaterThanOrEqual(0);
      expect(margins.querySelector(`thead th:nth-child(${delta + 1})`)!.className).toContain("num");
      for (const tr of margins.querySelectorAll("tbody tr")) {
        expect(tr.children[delta]!.className).toContain("num");
      }
      // the CSS right-aligns numeric cells and headers with tabular figures
      expect(css).toMatch(/#sheet\s+(td|th)\.num[^{]*\{[^}]*text-align:\s*right/);
      expect(css).toMatch(/font-variant-numeric:\s*tabular-nums/);
    });
  });

  describe("plain air names (task 22)", () => {
    const plain: Record<string, string> = {
      "iss-air": "Earth air (and the space station)",
      "heo-dm-1006": "Planned Moon-base air",
      "exp-10-2": "A second planned exploration air",
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
      const labels = () => [...roots().panel.querySelectorAll(".presets button")].map((b) => b.textContent);
      expect(labels()).toEqual(["Planned Moon-base air", "A second planned exploration air", "Earth air (and the space station)"]);
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

  it("public sentences read like plain words, with every number kept (task 27)", () => {
    const en = i18nDicts.en!;
    // the act-2 family beats, rewritten so a 10-year-old follows them
    expect(en["story.what-nasa-tested.what-nasa-tested-main.gas-jets.public"]).toBe(
      "Next, flames fed by a jet of gas. This is the biggest group, with 1,129 tests. Each dot is one test where NASA wrote down the air.");
    expect(en["story.what-nasa-tested.what-nasa-tested-main.solids-duct.public"]).toBe(
      "Then, solid materials burning in a duct of moving air. 251 tests are listed here, but none is a dot, because nobody wrote down the air pressure.");
    expect(en["story.what-nasa-tested.what-nasa-tested-main.large-scale.public"]).toBe(
      "Then, large fires on big samples, such as fabric. The 17 tests are listed here too, but none is a dot: nobody wrote down the air pressure.");
    expect(en["story.what-nasa-tested.what-nasa-tested-main.smoke.public"]).toBe(
      "Then, smoke. These are the only tests here on spotting smoke. All 117 are listed, but none is a dot: nobody wrote down the air pressure.");
    expect(en["story.what-nasa-tested.what-nasa-tested-main.ground.public"]).toBe(
      "Last, four studies that rely on computer models and work on the ground. They list no tests, so none of them is a dot.");
    expect(en["story.what-nasa-tested.what-nasa-tested-main.compare.public"]).toBe(
      "Side by side, only the drop and gas-flame tests have dots. The rest are listed, but they have no dot.");
    expect(en["story.what-nasa-tested.what-nasa-tested-main.takeaway.public"]).toBe(
      "So the tests are real, but only some are dots on the chart. Next, the air a Moon base would have.");
    // the legend and the distance rule in plain words too
    expect(en["ui.stage.legend.paper"]).toBe("Published in a paper, not in NASA's data archive");
    expect(en["ui.nearest.weighting"]).toBe("Distance counts 5 oxygen points the same as 25 kPa of pressure.");
    // the old phrasing appears in no public string anymore
    const publicText = Object.entries(en)
      .filter(([k]) => k.endsWith(".public") || k.startsWith("ui.stage.") || k.startsWith("ui.panel.") || k.startsWith("ui.nearest."))
      .map(([, v]) => v)
      .join("\n");
    for (const banned of ["Those with their air recorded", "is on the chart", "could not be placed", "not in PSI"]) {
      expect(publicText).not.toContain(banned);
    }
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
    const li = [...roots().panel.querySelectorAll("ol.nearest li")].find((r) => r.textContent!.includes(p69.fuel!))!;
    const det = li.querySelector(".row-details")!;
    expect(det.textContent).toContain("not recorded");
    expect(det.textContent).not.toMatch(/0\s*cm\/s/);
  });

  it("the Public lens leads with one answer sentence", () => {
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
    expect(panel.querySelector("ol.nearest")).not.toBeNull();
  });

  it("the answer says tested, with plain words for a missing fuel or outcome (task 34)", () => {
    // real rows from data/build: no fuel + unknown outcome, fuel + unknown outcome, no ignition
    const buildTests = read("../../../data/build/tests.json") as TestRun[];
    const buildExps = read("../../../data/build/experiments.json") as Experiment[];
    const row = (id: string): NearestRow => {
      const t = buildTests.find((r) => r.id === id)!;
      expect(t, `real row ${id}`).not.toBeUndefined();
      return {
        id: t.id, investigation: t.investigation, family: buildExps.find((e) => e.id === t.investigation)!.family,
        fuel: t.fuel, o2_pct: t.o2_pct!, pressure_kpa: t.pressure_kpa!,
        flow_cm_s: t.flow_cm_s ?? null, outcome: t.outcome, url: t.source.url,
        ppo2_kpa: Math.round(t.pressure_kpa! * t.o2_pct!) / 100, gravity: "micro-g" as const, d: 0,
      };
    };
    const answerFor = (id: string): string => {
      document.body.innerHTML = `<header id="chrome"></header><div id="story"></div><aside id="panel" hidden></aside><section id="sheet" hidden></section><div id="overlay" hidden></div>`;
      const store = createStore({ ...initialState, sliders: { pressure_kpa: 56.5, o2_pct: 34 } });
      const base = fakeApi();
      const api: DataApi = {
        ...base,
        nearest: (query) => ({ query, rows: [row(id)], familyMix: [], nearestBurned: null, nearestWentOut: null }),
      };
      mount(roots(), { api, store, dicts: {}, t: makeT(() => "en") });
      return roots().panel.querySelector(".answer")!.textContent!;
    };
    // no fuel, outcome unknown: verb and both missing parts in plain words
    const noFuel = answerFor("PSI-10#56-1");
    expect(noFuel).toContain("tested");
    expect(noFuel).toContain("a fuel that was not recorded");
    expect(noFuel).toContain("The outcome was not recorded.");
    expect(noFuel).not.toContain("burned");
    // fuel recorded, outcome unknown: fuel named, outcome in plain words
    const unknown = answerFor("PSI-39#1");
    expect(unknown).toContain("tested C12H26");
    expect(unknown).toContain("The outcome was not recorded.");
    expect(unknown).not.toContain("burned");
    // recorded no-ignition: tested, not burned; the record names what happened
    const noIgnition = answerFor("PSI-159#20");
    expect(noIgnition).toContain("tested 50% butane");
    expect(noIgnition).toContain("The record says: Did not ignite.");
    expect(noIgnition).not.toContain("burned");
  });

  it("chapter 3: the interactive air has two sliders and the one-sentence answer beside them (task 59)", () => {
    setup(); // sliders live
    const panel = roots().panel;
    expect(panel.querySelectorAll('.sliders input[type="range"]').length).toBe(2);
    expect(panel.querySelector(".answer")!.textContent!.length).toBeGreaterThan(20);
  });

  it("the Public panel leads with the answer in large type, then sliders, presets, family (task 44c)", () => {
    setup(); // public, sliders live
    const panel = roots().panel;
    const order = [...panel.children].map((el) => el.className);
    expect(order[0]).toBe("answer-wrap");
    expect(order.indexOf("sliders")).toBeGreaterThan(0);
    expect(order.indexOf("presets")).toBeGreaterThan(order.indexOf("sliders"));
    expect(order.indexOf("family")).toBeGreaterThan(order.indexOf("presets"));
    expect(order.indexOf("nearest-wrap")).toBeGreaterThan(order.indexOf("family"));
    expect(panel.querySelector(".answer-wrap .answer")).not.toBeNull();
    const presetBtn = panel.querySelector(".presets button")!;
    expect(presetBtn.classList.contains("btn")).toBe(false); // presets are plain buttons (task 44d)
  });

  it("each nearest row shows who, and its numbers live behind its own toggle (task 44f)", () => {
    setup();
    const panel = roots().panel;
    const rows = [...panel.querySelectorAll("ol.nearest li")];
    expect(rows.length).toBeGreaterThan(1);
    for (const li of rows.slice(0, 2)) {
      const who = li.querySelector(":scope > .who")!;
      expect(who.textContent).toContain(",");
      const toggle = li.querySelector<HTMLButtonElement>(":scope > button.row-toggle")!;
      expect(toggle.textContent).toBe("Show the details");
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      const det = li.querySelector(":scope > .row-details")!;
      expect(det.hasAttribute("hidden")).toBe(true);
      const links = [...det.querySelectorAll<HTMLAnchorElement>("a")];
      expect(links.length).toBeGreaterThanOrEqual(5); // oxygen, pressure, ppo2, flow, outcome, distance all linked
      for (const a of links) expect(a.getAttribute("href")).toMatch(/^https:\/\//);
      const text = det.textContent!;
      for (const unit of ["%", "kPa", "cm/s"]) expect(text).toContain(unit); // units, not just digits
      toggle.click();
      expect(det.hasAttribute("hidden")).toBe(false);
      expect(toggle.textContent).toBe("Hide the details");
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      expect(document.activeElement).toBe(toggle); // focus stays on the toggle (task 36c)
    }
  });

  it("the not-placed list is a data list of linked values (task 44h)", () => {
    setup();
    const panel = roots().panel;
    expect(panel.querySelector("ul.not-placed")).toBeNull();
    const dl = panel.querySelector("dl.not-placed")!;
    expect(dl.querySelectorAll("dt").length).toBeGreaterThan(0);
    for (const a of [...dl.querySelectorAll("a")]) expect(a.getAttribute("href")).toMatch(/^https:\/\//);
    expect(dl.textContent).toContain("SIBAL Fabric");
    expect(dl.textContent).toContain("no pressure recorded");
  });

  it("the panel explainer has no nested box (task 44)", () => {
    expect(css).not.toMatch(/\.panel-exp\s*\{[^}]*background/);
    expect(css).not.toMatch(/\.panel-exp\s*\{[^}]*border-left/);
  });

  it("the family filter is one label wrapping the select (task 44e)", () => {
    setup();
    const label = roots().panel.querySelector("label.family")!;
    expect(label.querySelector("select#family-filter")).not.toBeNull();
    expect(roots().panel.querySelector("div.family")).toBeNull();
  });

  it("the coverage box names air pressure or oxygen, never bare air (task 40b)", () => {
    expect(i18nDicts.en!["ui.stage.exp.coverage.why"]).toBe(
      "The rest are listed, not placed: nobody wrote down the air pressure or oxygen.",
    );
  });

  it("two columns on desktop, a pinned solid stage on small screens (task 41)", () => {
    const base = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../styles/base.css"), "utf8");
    // story column left 40 %, stage right 60 %: they never share space
    expect(base).toMatch(/grid-template-columns:\s*40% 60%/);
    // under 1100 px the stage pins under the header at 45 % height, solid, above the story
    expect(base).toMatch(/#stage\s*\{[^}]*height:\s*45vh[^}]*z-index:\s*12[^}]*background:\s*var\(--space-deep\)/);
    expect(base).toMatch(/body\[data-stage-hidden="true"\] #stage\s*\{\s*visibility:\s*hidden/);
  });

  it("the answer is large type", () => {
    expect(css).toMatch(/\.answer\s*\{[^}]*font-size:\s*var\(--text-card\)/);
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

  it("lens buttons show the final names: Student, Astronaut, Analyst (tasks 54, 55)", () => {
    setup(null, i18nDicts);
    const btn = (lens: string) => roots().chrome.querySelector<HTMLButtonElement>(`[data-lens="${lens}"]`)!;
    expect(btn("public").textContent).toBe("Student");
    expect(btn("astronaut").textContent).toBe("Astronaut");
    expect(btn("analyst").textContent).toBe("Analyst");
    // no other visible string names the Public lens (Publications is a different word)
    for (const v of Object.values(i18nDicts.en!)) expect(v).not.toBe("Public");
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

  it("analyst tables fit without sideways scroll: fixed layout, sticky header, wrapped titles", () => {
    expect(css).toMatch(/#sheet table\s*\{[^}]*table-layout:\s*fixed/);
    expect(css).toMatch(/#sheet thead th\s*\{[^}]*position:\s*sticky/);
    expect(css).toMatch(/#sheet (th|td)[^{]*\{[^}]*overflow-wrap:\s*anywhere/);
  });

  it("analyst workspace at 1280 px and wider: table left, chart in a right column of about 40 %", () => {
    const base = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../styles/base.css"), "utf8");
    expect(base).toMatch(/min-width:\s*1280px\)[\s\S]*?body\[data-lens="analyst"\] #sheet\s*\{[^}]*width:\s*60%/);
    expect(base).toMatch(/min-width:\s*1280px\)[\s\S]*?body\[data-lens="analyst"\] #stage\s*\{[^}]*padding-left:\s*60%/);
  });

  it("header button groups wrap instead of clipping; the locale picker is one compact select", () => {
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "ui.css"), "utf8");
    expect(css).toMatch(/\.lens-switch\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(css).not.toMatch(/\.locale-switch/);
    expect(css).toMatch(/\.locale-select\s*\{[^}]*min-height:\s*32px/);
    expect(css).toMatch(/min-width:\s*1280px\)\s*\{\s*\.chrome-bar\s*\{\s*flex-wrap:\s*nowrap/);
    expect(css).toMatch(/min-width:\s*1280px\)\s*\{.*?\.lens-switch\s*\{\s*flex-wrap:\s*nowrap/s);
    expect(css).toMatch(/min-width:\s*1280px\)\s*\{.*?\.chrome-bar\s*\{\s*flex-wrap:\s*nowrap;\s*min-height:\s*53px/s);
  });

  it("under 768 px the header is one row: mark, chapter numbers and a Menu holding the rest (task 46)", () => {
    const prev = window.matchMedia;
    let narrow = true;
    const fires = new Set<() => void>();
    window.matchMedia = ((query: string) => ({
      get matches() { return narrow && query.includes("767"); },
      media: query,
      addEventListener(_type: string, fn: () => void) { fires.add(fn); },
      removeEventListener(_type: string, fn: () => void) { fires.delete(fn); },
    })) as unknown as typeof window.matchMedia;
    try {
      const { store } = setup(null, i18nDicts);
      const bar = roots().chrome.querySelector(".chrome-bar")!;
      // one row: the brand, the chapter rail with one number per chapter, the Menu
      expect([...bar.children].map((c) => c.className)).toEqual(["brand", "rail", "chrome-menu"]);
      const summary = bar.querySelector("details.chrome-menu > summary")!;
      expect(summary.textContent).toBe(i18nDicts.en!["ui.chrome.menu"]);
      expect(summary.textContent).toBe("Menu");
      const chips = [...bar.querySelectorAll<HTMLButtonElement>(".rail .chip")];
      expect(chips.length).toBe(stories.length);
      for (const [i, c] of chips.entries()) expect(c.textContent).toContain(String(stories[i].act));
      // everything else lives inside the Menu: the lens switch, Stories, Skip, the picker
      const body = bar.querySelector("details.chrome-menu .menu-body")!;
      expect(body.querySelectorAll(".lens-switch button[data-lens]").length).toBe(3);
      expect(body.textContent).toContain(i18nDicts.en!["ui.chrome.stories"]);
      expect(body.textContent).toContain(i18nDicts.en!["ui.chrome.skip"]);
      const menuSelect = body.querySelector<HTMLSelectElement>("select.locale-select")!;
      // the picker still works from inside the Menu and keeps focus
      menuSelect.focus();
      menuSelect.value = "es";
      menuSelect.dispatchEvent(new Event("change", { bubbles: true }));
      expect(store.get().locale).toBe("es");
      expect(document.activeElement).toBe(roots().chrome.querySelector(".locale-select"));
      // back to wide: every control returns to the bar in order, Menu last
      // (the locale change rebuilt the bar, so re-query the live node)
      narrow = false;
      fires.forEach((fn) => fn());
      const wide = roots().chrome.querySelector(".chrome-bar")!;
      expect([...wide.children].map((c) => c.className)).toEqual(
        ["brand", "rail", "lens-switch", "btn", "btn primary", "locale-select", "chrome-menu"]);
    } finally {
      window.matchMedia = prev;
    }
  });

  it("phone header CSS: one 56 px row, mark only, real Menu; dots hide under 1100 px (task 46)", () => {
    expect(css).toMatch(/\.chrome-menu\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/max-width:\s*767px\)[\s\S]*?\.chrome-bar\s*\{[^}]*flex-wrap:\s*nowrap/s);
    expect(css).toMatch(/max-width:\s*767px\)[\s\S]*?\.chrome-bar\s*\{[^}]*height:\s*56px/s);
    expect(css).toMatch(/\.brand-name,\s*\.brand-ug\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/max-width:\s*767px\)[\s\S]*?\.chrome-menu\s*\{[^}]*display:\s*block/s);
    const engine = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../engine/engine.css"), "utf8");
    expect(engine).toMatch(/max-width:\s*1099px\)[\s\S]*?\.page-dots\s*\{[^}]*display:\s*none/s);
  });

  it("the panel is a centered bottom sheet at every width (task 44l)", () => {
    const base = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../styles/base.css"), "utf8");
    expect(base).toMatch(/#panel\s*\{[^}]*left:\s*50%[^}]*transform:\s*translateX\(-50%\)[^}]*bottom:\s*var\(--gap\)/);
    expect(base).toMatch(/#panel\s*\{[^}]*width:\s*min\(420px,[^}]*max-height:\s*45vh/);
  });

  it("the language picker is one compact select at the right end and switches the store locale", () => {
    const { store } = setup(null, i18nDicts);
    const chrome = roots().chrome;
    expect(chrome.querySelectorAll("select.locale-select").length).toBe(1);
    expect(chrome.querySelectorAll("button[data-locale]").length).toBe(0);
    const sel = chrome.querySelector<HTMLSelectElement>("select.locale-select")!;
    expect([...sel.options].map((o) => o.value).sort()).toEqual(Object.keys(i18nDicts).sort());
    // autonyms: never translated
    expect(sel.querySelector('option[value="en"]')!.textContent).toBe("English");
    if ("es" in i18nDicts) expect(sel.querySelector('option[value="es"]')!.textContent).toBe("Español");
    const target = (Object.keys(i18nDicts) as (keyof typeof i18nDicts)[]).find((l) => l !== "en") ?? "en";
    sel.value = target;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    expect(store.get().locale).toBe(target);
    // a locale change rebuilds the bar: re-query the live select
    const live = () => roots().chrome.querySelector<HTMLSelectElement>("select.locale-select")!;
    // at the right end of the bar, after the Skip button, with only the Menu after it
    expect(live().nextElementSibling!.tagName).toBe("DETAILS");
    expect(roots().chrome.querySelector(".chrome-bar")!.lastElementChild!.className).toBe("chrome-menu");
    expect(live().value).toBe(target);
    // and it follows the store back
    store.set({ locale: "en" });
    expect(live().value).toBe("en");
  });

  it("sorting, details and the language picker keep keyboard focus (task 36c)", () => {
    const { store } = setup();
    store.set({ lens: "analyst" });
    const sheet = roots().sheet;
    const sortBtn = [...sheet.querySelectorAll<HTMLButtonElement>("table.investigations th button.sort")].find(
      (b) => b.textContent === "Title",
    )!;
    sortBtn.click();
    const after = document.activeElement as HTMLButtonElement;
    expect(after.textContent).toBe("Title");
    expect(after.closest("table.investigations")).not.toBeNull();
    store.set({ lens: "public" });
    // the first row's own toggle now: focusing it is trivially kept, pin it anyway
    const toggle = [...roots().panel.querySelectorAll("button")].find((b) => b.textContent === "Show the details")!;
    toggle.click();
    expect((document.activeElement as HTMLButtonElement).textContent).toBe("Hide the details");
    const picker = roots().chrome.querySelector<HTMLSelectElement>(".locale-select")!;
    picker.value = "es";
    picker.dispatchEvent(new Event("change", { bubbles: true }));
    expect(document.activeElement).toBe(roots().chrome.querySelector(".locale-select"));
  });

  it("the Stories overlay uses its own title class, not the engine's (task 42)", () => {
    setup();
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<section id="story-moon-air" data-story="moon-air" data-act="3" data-title="x"></section>`,
    );
    const storiesBtn = [...roots().chrome.querySelectorAll("button")].find((b) => b.textContent === "Stories")!;
    storiesBtn.click();
    expect(roots().overlay.querySelectorAll(".story-card .overlay-story-title").length).toBe(1);
    expect(roots().overlay.querySelector(".story-card .story-title")).toBeNull();
    expect(css).toMatch(/\.overlay-story-title\s*\{/);
    expect(css).not.toMatch(/^\.story-title\s*\{/m);
  });

  it("every font size is a type token, nothing else (task 43)", () => {
    const files = ["../styles/base.css", "../styles/tokens.css", "../engine/engine.css", "../stage/stage.css", "./ui.css"];
    // 40 px is the task-43 phone exception for the cover title only
    const allowed = /^var\(--text-(meta|body|card|chapter|cover)\)$|^(inherit|initial|unset|0|smaller|larger|40px)$|em$|%$/;
    const bad: string[] = [];
    for (const f of files) {
      const cssText = readFileSync(join(dirname(fileURLToPath(import.meta.url)), f), "utf8");
      for (const m of cssText.matchAll(/font-size\s*:\s*([^;}{]+)/g)) {
        if (!allowed.test(m[1].trim())) bad.push(`${f}: ${m[1].trim()}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("drops the per-value panel labels that nothing renders any more (task 44i)", () => {
    // oxygen/pressure/flow/outcome stay: the analyst sheet labels its controls with them.
    // gravity stays too: the details still name it in words. ppo2 and distance lose their labels.
    for (const key of ["ui.nearest.ppo2", "ui.nearest.distance"]) {
      expect(i18nDicts.en![key as keyof typeof i18nDicts.en]).toBeUndefined();
    }
  });

  it("the five type tokens carry the house scale (task 43)", () => {
    const tokens = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../styles/tokens.css"), "utf8");
    for (const [name, size] of [["--text-meta", "14px"], ["--text-body", "17px"], ["--text-card", "24px"], ["--text-chapter", "44px"], ["--text-cover", "64px"]] as const) {
      expect(tokens).toContain(`${name}: ${size}`);
    }
  });

  it("the focus ring is white on dark and ink on the light sheet, never yellow (task 36d)", () => {
    const base = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../styles/base.css"), "utf8");
    expect(base).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid #fff/);
    expect(base).toMatch(/#sheet :focus-visible\s*\{[^}]*var\(--ink\)/);
    expect(base).not.toMatch(/focus-visible[^}]*var\(--moon\)/);
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

  it("rows with no range sort last in both directions (task 40a)", () => {
    const { store } = setup();
    store.set({ lens: "analyst" });
    const sheet = roots().sheet;
    const rows = () => [...sheet.querySelectorAll("table.investigations tbody tr")];
    const sortBtn = (label: string) => [...sheet.querySelectorAll<HTMLButtonElement>("table.investigations th button.sort")].find((b) => b.textContent === label)!;
    // PSI-98 has an oxygen range, the fixtures have none: descending must not float the gaps first
    sortBtn("Oxygen range").click();
    sortBtn("Oxygen range").click();
    expect(rows()[0]!.textContent).toContain("21.5");
    expect(rows().at(-1)!.textContent).toContain("not recorded");
    sortBtn("Pressure range").click();
    sortBtn("Pressure range").click();
    expect(rows().at(-1)!.textContent).toContain("not recorded");
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

  it("the sheet filters live in the store, so the chart draws the same set (task 35)", () => {
    const { store } = setup();
    store.set({ lens: "analyst" });
    const sheet = roots().sheet;
    expect(store.get().filters).toEqual({ search: "", fuel: null, outcome: null, plotted: "all" });
    const rows = () => sheet.querySelectorAll("table.investigations tbody tr").length;
    const box = sheet.querySelector<HTMLInputElement>("#sheet-search")!;
    box.value = "droplet";
    box.dispatchEvent(new Event("input", { bubbles: true }));
    expect(store.get().filters.search).toBe("droplet");
    expect(rows()).toBe(1);
    box.value = "";
    box.dispatchEvent(new Event("input", { bubbles: true }));
    const fuelSel = sheet.querySelector<HTMLSelectElement>("#sheet-fuel")!;
    fuelSel.value = "Methanol";
    fuelSel.dispatchEvent(new Event("change", { bubbles: true }));
    expect(store.get().filters.fuel).toBe("Methanol");
    expect(rows()).toBe(experiments.filter((e) => tests.some((t) => t.investigation === e.id && t.fuel === "Methanol")).length);
    fuelSel.value = "";
    fuelSel.dispatchEvent(new Event("change", { bubbles: true }));
    const outSel = sheet.querySelector<HTMLSelectElement>("#sheet-outcome")!;
    outSel.value = "burned";
    outSel.dispatchEvent(new Event("change", { bubbles: true }));
    expect(store.get().filters.outcome).toBe("burned");
    expect(rows()).toBe(experiments.filter((e) => tests.some((t) => t.investigation === e.id && t.outcome === "burned")).length);
    outSel.value = "";
    outSel.dispatchEvent(new Event("change", { bubbles: true }));
    const plotSel = sheet.querySelector<HTMLSelectElement>("#sheet-plotted")!;
    plotSel.value = "unplaced";
    plotSel.dispatchEvent(new Event("change", { bubbles: true }));
    expect(store.get().filters.plotted).toBe("unplaced");
    expect(rows()).toBe(1); // only PSI-98 has a row with no pressure recorded
    plotSel.value = "all";
    plotSel.dispatchEvent(new Event("change", { bubbles: true }));
    expect(store.get().filters).toEqual({ search: "", fuel: null, outcome: null, plotted: "all" });
    expect(rows()).toBe(experiments.length);
  });

  it("the tests tab sorts every column and its rows link to their PSI rows", () => {
    const { store } = setup();
    store.set({ lens: "analyst" });
    const sheet = roots().sheet;
    sheet.querySelector<HTMLButtonElement>("button.tab[data-tab=tests]")!.click();
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
      sheet.querySelector<HTMLButtonElement>("button.tab[data-tab=tests]")!.click();
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

  it("the analyst toolbar is one row: search grows, four selects inline, result count at the end", () => {
    const { store } = setup();
    store.set({ lens: "analyst" });
    const sheet = roots().sheet;
    const bar = sheet.querySelector(".sheet-toolbar")!;
    expect(bar.firstElementChild!.querySelector("input[type=\"search\"]")).not.toBeNull();
    expect(bar.firstElementChild!.classList.contains("grow")).toBe(true);
    expect(bar.querySelectorAll("select").length).toBe(4);
    expect(bar.lastElementChild!.className).toBe("sheet-count");
    // the count follows the current tab and the filters
    const count = () => bar.querySelector(".sheet-count")!.textContent!;
    expect(count()).toBe(`${experiments.length} investigations`);
    const box = sheet.querySelector<HTMLInputElement>("#sheet-search")!;
    box.value = "no-such-fuel-xyz";
    box.dispatchEvent(new Event("input", { bubbles: true }));
    expect(count()).toBe("0 investigations");
    box.value = "";
    box.dispatchEvent(new Event("input", { bubbles: true }));
    expect(count()).toBe(`${experiments.length} investigations`);
  });

  it("coverage is one compact row and the downloads link the six data files", () => {
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
      const row = sheet.querySelector(".coverage-row")!;
      expect(row.textContent).toContain(`Plotted ${plotted} of ${total} tests`);
      const reasons = new Map<string, number>();
      for (const r of ctx.api.notPlaced()) reasons.set(r.reason, (reasons.get(r.reason) ?? 0) + 1);
      expect(reasons.size).toBeGreaterThan(0);
      for (const [reason, n] of reasons) expect(row.textContent).toContain(`${reason}: ${n}`);
      const hrefs = [...sheet.querySelectorAll(".downloads a")].map((a) => (a as HTMLAnchorElement).getAttribute("href"));
      expect(hrefs).toEqual(["data/tests.json", "data/experiments.json", "data/moments.json", "data/library.json", "data/search.json", "data/coverage.json"]);
      expect(sheet.querySelectorAll(".downloads a[download]").length).toBe(6);
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
    buttons(roots().sheet).find((b) => b.getAttribute("data-tab") === "investigations")!.click();
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
    // investigations is selected by default; the four dashboard tabs sit first
    expect(tabs()[4]!.textContent).toBe("All investigations");
    tabs()[4]!.focus();
    expect(selected()).toBe(4);
    tabs()[4]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(selected()).toBe(5);
    expect(document.activeElement).toBe(tabs()[5]);
    tabs()[5]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(selected()).toBe(4);
    expect(document.activeElement).toBe(tabs()[4]);
    tabs()[4]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(selected()).toBe(3);
    expect(document.activeElement).toBe(tabs()[3]);
    tabs()[3]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(selected()).toBe(2);
    expect(document.activeElement).toBe(tabs()[2]);
    tabs()[2]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(selected()).toBe(1);
    expect(document.activeElement).toBe(tabs()[1]);
    tabs()[1]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(selected()).toBe(0);
    expect(document.activeElement).toBe(tabs()[0]);
    tabs()[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(selected()).toBe(6); // wraps around to the last of the seven tabs
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

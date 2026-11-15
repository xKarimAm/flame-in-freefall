// @vitest-environment jsdom
// Tests for the dashboard overview tab (web-lane task 56, backend lane D3).
// Generated with Muse Spark, SI-assisted.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDataApi } from "../data/index";
import { dicts, makeT } from "../i18n/index";
import { createStore, initialState } from "../store";
import { SELECT_INVESTIGATION } from "../stage/index";
import type { Ctx, Experiment, TestRun } from "../contract";
import { renderOverview } from "./overview";

const read = (rel: string): unknown => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));
const tests = read("../../../data/build/tests.json") as TestRun[];
const experiments = read("../../../data/build/experiments.json") as Experiment[];
const moon = read("../../../data/curated/moon.json") as Ctx["api"]["data"]["moon"];
const coverage = read("../../../data/build/coverage.json") as {
  total: number;
  plotted: number;
  by_reason: Record<string, number>;
};
const cases = read("../../../pipeline/tests/data/ranking_cases.json") as { id: string; top: { acronym: string }[] }[];

const ctxFor = (sliders: { pressure_kpa: number; o2_pct: number } | null = null): Ctx => {
  const store = createStore({ ...initialState, sliders });
  const api = createDataApi({ experiments, tests, moon, incidents: { incidents: [], pattern: { text: "", source: "", url: "" } } });
  return { api, store, dicts, t: makeT(() => "en") };
};

/** Every digit is inside an https source link, a data-file link, or a data-own mark. */
function dashNumbers(root: Element): string[] {
  const out: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement!;
    if (/\d/.test(n.textContent ?? "") && !el.closest('a[href^="https://"], a[href^="data/"], [data-own]')) {
      out.push(n.textContent!.trim());
    }
  }
  return out;
}

describe("overview numbers (task 56a)", () => {
  it("shows the five numbers recomputed from the files, each linked to its file", () => {
    const root = renderOverview(ctxFor());
    const figures = [...root.querySelectorAll(".dash-figures figure")];
    expect(figures).toHaveLength(5);
    const withO2 = tests.filter((t) => t.o2_pct != null).length;
    expect(withO2).toBe(coverage.total - coverage.by_reason["no oxygen recorded"] - coverage.by_reason["no oxygen or pressure recorded"]);
    const pubs = experiments.reduce((n, e) => n + e.publications.length, 0);
    const expected: [string, string][] = [
      [String(experiments.length), "data/experiments.json"],
      [String(coverage.total), "data/tests.json"],
      [String(coverage.plotted), "data/coverage.json"],
      [String(withO2), "data/tests.json"], // R4: counted from the tests file
      [String(pubs), "data/experiments.json"],
    ];
    for (const [i, [value, file]] of expected.entries()) {
      const a = figures[i]!.querySelector("a.dash-num")!;
      expect(a.textContent).toBe(value);
      expect(a.getAttribute("href")).toBe(file);
      expect(figures[i]!.querySelector("figcaption")!.textContent).not.toBe("");
    }
    // R4: the listings are summed, never deduped, and labelled as listings
    expect(figures[4]!.querySelector("figcaption")!.textContent).toBe("Publication listings");
  });
});

describe("overview ranking (task 50)", () => {
  it("defaults to the Moon box order from the oracle", () => {
    const root = renderOverview(ctxFor());
    const oracle = cases.find((c) => c.id === "heo-dm-1006")!;
    const names = [...root.querySelectorAll(".dash-ranked ol li")].map((li) => li.querySelector("button")!.textContent);
    expect(names).toEqual(oracle.top.map((t) => t.acronym));
  });

  it("follows the sliders as a point query", () => {
    const ctx = ctxFor();
    const root = renderOverview(ctx);
    document.body.append(root);
    const oracle = cases.find((c) => c.id === "iss-air")!;
    ctx.store.set({ sliders: { pressure_kpa: 101.4, o2_pct: 21 } });
    const names = [...root.querySelectorAll(".dash-ranked ol li")].map((li) => li.querySelector("button")!.textContent);
    expect(names).toEqual(oracle.top.map((t) => t.acronym));
    root.remove();
  });

  it("lists the unrankable investigations after the ranked ones, with the reason", () => {
    const root = renderOverview(ctxFor());
    const items = [...root.querySelectorAll(".dash-ranked .dash-unranked li")];
    expect(items).toHaveLength(experiments.length - 4);
    for (const li of items) expect(li.textContent).toContain("Not rankable");
    // every investigation appears exactly once across both lists
    const ranked = [...root.querySelectorAll(".dash-ranked ol li")].map((li) => li.querySelector("button")!.dataset.investigation);
    const unranked = items.map((li) => li.querySelector("a")!.dataset.investigation);
    expect([...ranked, ...unranked].sort()).toEqual(experiments.map((e) => e.id).sort());
  });

  it("links each d_min to its nearest test row and each investigation to its PSI page", () => {
    const root = renderOverview(ctxFor());
    // independent argmin with the DISTANCE.md band rule, band read from moon.json
    const heo = moon.atmospheres.find((a) => a.id === "heo-dm-1006")!;
    for (const li of root.querySelectorAll(".dash-ranked ol li")) {
      const inv = li.querySelector("button")!.dataset.investigation!;
      let best = "";
      let bestD = Infinity;
      for (const t of tests) {
        if (t.investigation !== inv || t.gravity !== "micro-g" || t.o2_pct == null || t.pressure_kpa == null) continue;
        const gap = t.o2_pct < heo.o2_pct_min ? heo.o2_pct_min - t.o2_pct : t.o2_pct > heo.o2_pct_max! ? t.o2_pct - heo.o2_pct_max! : 0;
        const d = Math.sqrt(((heo.pressure_kpa - t.pressure_kpa) / 25) ** 2 + (gap / 5) ** 2);
        if (d < bestD) { best = t.id; bestD = d; }
      }
      const dLink = li.querySelector("a.dash-d")!;
      expect(dLink.getAttribute("href")).toBe(tests.find((t) => t.id === best)!.source.url);
      const exp = experiments.find((e) => e.id === inv)!;
      expect(li.querySelector("a.dash-acronym")!.getAttribute("href")).toBe(exp.psi_url);
    }
  });

  it("the ranked title names the air and the rule explains near and d (R4)", () => {
    // default: the Moon-box air by its plain name and moon.json values, each number source-linked
    const heo = moon.atmospheres.find((a) => a.id === "heo-dm-1006")!;
    const f = (v: number): string => String(Number(v.toFixed(1)));
    const root = renderOverview(ctxFor());
    const title = root.querySelector(".dash-ranked h3")!;
    expect(title.textContent).toContain("Ranked for this air");
    expect(title.textContent).toContain("Planned Moon-base air");
    expect(title.textContent).toContain(f(heo.pressure_kpa));
    expect(title.textContent).toContain(f(heo.o2_pct_min));
    expect(title.textContent).toContain(f(heo.o2_pct_max!));
    const links = [...title.querySelectorAll("a")];
    expect(links.length).toBeGreaterThan(0);
    for (const a of links) expect(a.getAttribute("href")).toBe(heo.url);
    // sliders: the title carries the slider values instead
    const sliders = renderOverview(ctxFor({ pressure_kpa: 101.4, o2_pct: 21 }));
    const sliderTitle = sliders.querySelector(".dash-ranked h3")!;
    expect(sliderTitle.textContent).toContain("Ranked for this air");
    expect(sliderTitle.textContent).toContain("101.4");
    expect(sliderTitle.textContent).toContain("21");
    expect(sliderTitle.textContent).not.toContain("Moon-base");
    const rule = root.querySelector(".dash-rule")!.textContent!;
    expect(rule).toContain("1.0 or less");
    expect(rule).toMatch(/distance d\b/);
  });

  it("selecting a ranked row notifies the stage", () => {
    const root = renderOverview(ctxFor());
    document.body.append(root);
    const seen: string[] = [];
    window.addEventListener(SELECT_INVESTIGATION, (e) => seen.push((e as CustomEvent).detail.investigation));
    (root.querySelector(".dash-ranked ol li button") as HTMLButtonElement).click();
    expect(seen).toEqual(["PSI-159"]);
    root.remove();
  });
});

describe("overview small multiples (task 56d)", () => {
  it("draws one mini chart per investigation with placed tests, on shared axes", () => {
    const root = renderOverview(ctxFor());
    const svgs = [...root.querySelectorAll(".dash-multiples svg")];
    expect(svgs).toHaveLength(4);
    const domains = svgs.map((s) => [s.getAttribute("data-x0"), s.getAttribute("data-x1"), s.getAttribute("data-y0"), s.getAttribute("data-y1")].join("|"));
    expect(new Set(domains).size).toBe(1);
    // every placed test of PSI-159 is a dot, and every dot sits inside the shared domain
    const psi159 = svgs.find((s) => s.getAttribute("data-investigation") === "PSI-159")!;
    const placed159 = tests.filter((t) => t.investigation === "PSI-159" && t.gravity === "micro-g" && t.o2_pct != null && t.pressure_kpa != null);
    expect(psi159.querySelectorAll("circle").length).toBe(placed159.length);
    const [x0, x1, y0, y1] = domains[0]!.split("|").map(Number);
    for (const t of placed159) {
      expect(t.pressure_kpa!).toBeGreaterThanOrEqual(x0!);
      expect(t.pressure_kpa!).toBeLessThanOrEqual(x1!);
      expect(t.o2_pct!).toBeGreaterThanOrEqual(y0!);
      expect(t.o2_pct!).toBeLessThanOrEqual(y1!);
    }
  });

  it("gives the other investigations a one-line not-recorded card", () => {
    const root = renderOverview(ctxFor());
    const cards = [...root.querySelectorAll(".dash-multiples .dash-missing")];
    expect(cards).toHaveLength(experiments.length - 4);
    for (const c of cards) {
      const inv = c.querySelector("a")!.dataset.investigation!;
      const n = tests.filter((t) => t.investigation === inv).length;
      expect(c.textContent).toContain(
        n === 0 ? "No tests in the archive" : `${n} tests, none with oxygen and pressure recorded`,
      );
    }
  });
});

describe("overview audit", () => {
  it("every number is linked to its source or marked data-own", () => {
    const root = renderOverview(ctxFor());
    document.body.append(root);
    expect(dashNumbers(root)).toEqual([]);
    root.remove();
  });

  it("dash.css carries no motion: reduced motion is trivially honoured", () => {
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "dash.css"), "utf8");
    expect(css).not.toMatch(/@keyframes|animation|transition/);
  });
});

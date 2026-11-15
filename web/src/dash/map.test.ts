// @vitest-environment jsdom
// Tests for the evidence map (web-lane task 51, backend lane D6).
// Generated with Muse Spark, SI-assisted.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createDataApi } from "../data/index";
import { dicts, makeT } from "../i18n/index";
import { createStore, initialState } from "../store";
import { SELECT_INVESTIGATION } from "../stage/index";
import { OPEN_LIBRARY_EVENT } from "../engine/index";
import { FAMILIES } from "../contract";
import type { Ctx, Experiment, TestRun } from "../contract";
import { renderMap } from "./map";
import { summarize } from "./compare";
import { rankForAir } from "./ranking";

const read = (rel: string): unknown => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));
const tests = read("../../../data/build/tests.json") as TestRun[];
const experiments = read("../../../data/build/experiments.json") as Experiment[];
const moon = read("../../../data/curated/moon.json") as Ctx["api"]["data"]["moon"];

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

describe("evidence map tree", () => {
  const heoName = (moon as { atmospheres: { id: string; name: string }[] }).atmospheres.find((a) => a.id === "heo-dm-1006")!.name;

  it("draws the air, the six families and one row per investigation", () => {
    const root = renderMap(ctxFor());
    expect(root.querySelector(".dash-map-air")!.textContent).toContain(heoName);
    expect(root.querySelectorAll(".dash-map-family")).toHaveLength(6);
    const rows = [...root.querySelectorAll(".dash-map-row")];
    expect(rows).toHaveLength(experiments.length);
    // every investigation exactly once, grouped by the six families in contract order
    const fams = rows.map((r) => r.getAttribute("data-family"));
    const seen = [...new Set(fams)];
    expect(seen).toEqual([...FAMILIES].filter((f) => fams.includes(f)));
  });

  it("scales bars by test count and fills the plotted share; unrankable rows are grey", () => {
    const ctx = ctxFor();
    const root = renderMap(ctx);
    const maxTests = Math.max(...experiments.map((e) => tests.filter((t) => t.investigation === e.id).length));
    const topId = experiments.find((e) => tests.filter((t) => t.investigation === e.id).length === maxTests)!.id;
    const bar = (id: string): { track: number; fill: number } => {
      const row = root.querySelector(`.dash-map-row[data-investigation="${id}"]`)!;
      return {
        track: Number(row.querySelector(".dash-bar-track")!.getAttribute("width")),
        fill: Number(row.querySelector(".dash-bar-fill, .dash-bar-grey")!.getAttribute("width")),
      };
    };
    // the longest bar belongs to the investigation with the most rows, at full width
    const top = bar(topId);
    expect(top.track).toBe(Math.max(...experiments.map((e) => bar(e.id).track)));
    for (const e of experiments) {
      const b = bar(e.id);
      expect(b.track).toBeLessThanOrEqual(top.track);
      const n = tests.filter((t) => t.investigation === e.id).length;
      const placed = ctx.api.placed().filter((p) => p.investigation === e.id).length;
      expect(b.track).toBeCloseTo((top.track * n) / maxTests, 0);
      if (placed > 0) expect(b.fill).toBeCloseTo((top.track * placed) / maxTests, 0);
      else if (n > 0) expect(b.fill).toBeCloseTo(b.track, 0); // unrankable: the whole bar is grey
    }
    // PSI-60 has no rows at all: grey, empty
    const grey = root.querySelector('.dash-map-row[data-investigation="PSI-60"]')!;
    expect(grey.querySelector(".dash-bar-grey")).not.toBeNull();
    expect(grey.querySelector(".dash-bar-fill")).toBeNull();
  });

  it("follows the sliders as the air", () => {
    const ctx = ctxFor();
    const root = renderMap(ctx);
    document.body.append(root);
    expect(root.querySelector(".dash-map-air")!.textContent).toContain(heoName);
    ctx.store.set({ sliders: { pressure_kpa: 101.4, o2_pct: 21 } });
    expect(root.querySelector(".dash-map-air")!.textContent).toContain("Your air");
    root.remove();
  });
});

describe("evidence map detail", () => {
  it("defaults to the top-ranked investigation with numbers, tiles, summary and story button", () => {
    const ctx = ctxFor();
    const root = renderMap(ctx);
    const top = rankForAir(ctx.api, { kind: "atmosphere", id: "heo-dm-1006" }, ctx.api.atmosphere("heo-dm-1006")).ranked[0]!;
    const panel = root.querySelector(".dash-detail")!;
    const exp = experiments.find((e) => e.id === top.investigation)!;
    expect(panel.querySelector(".dash-detail-acronym")!.textContent).toContain(exp.acronym);
    expect(panel.textContent).toContain(exp.title);
    expect(panel.textContent).toContain(`${top.tests}`);
    expect(panel.querySelector(".dash-open-story")).not.toBeNull();
    // AI summary under its tag
    expect(panel.textContent).toContain("AI summary");
    expect(panel.textContent).toContain(exp.summary!.text.slice(0, 40));
  });

  it("selecting a row updates the panel and notifies the stage", () => {
    const ctx = ctxFor();
    const root = renderMap(ctx);
    document.body.append(root);
    const seen: string[] = [];
    window.addEventListener(SELECT_INVESTIGATION, (e) => seen.push((e as CustomEvent).detail.investigation));
    const row = root.querySelector('.dash-map-row[data-investigation="PSI-69"]') as SVGGElement;
    row.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const panel = root.querySelector(".dash-detail")!;
    expect(panel.querySelector(".dash-detail-acronym")!.textContent).toContain("FLEX");
    expect(seen).toEqual(["PSI-69"]);
    root.remove();
  });

  it("arrow keys move between rows and Enter opens", () => {
    const ctx = ctxFor();
    const root = renderMap(ctx);
    document.body.append(root);
    const seen: string[] = [];
    window.addEventListener(SELECT_INVESTIGATION, (e) => seen.push((e as CustomEvent).detail.investigation));
    const rows = [...root.querySelectorAll(".dash-map-row")];
    const first = rows.find((r) => r.getAttribute("data-investigation") === "PSI-159")!;
    (first as SVGGElement).dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(seen).toHaveLength(1);
    expect(seen[0]).not.toBe("PSI-159");
    const current = root.querySelector('.dash-map-row[data-active="true"]')!.getAttribute("data-investigation")!;
    (root.querySelector(`.dash-map-row[data-investigation="${current}"]`) as SVGGElement)
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(seen).toHaveLength(2);
    expect(seen[1]).toBe(current);
    root.remove();
  });

  it("tiles show ranges and recorded outcomes from the data", () => {
    const ctx = ctxFor();
    const root = renderMap(ctx);
    const s = summarize(
      tests.filter((t) => t.investigation === "PSI-159"),
      new Set(ctx.api.placed().map((p) => p.id)),
    );
    const panel = root.querySelector(".dash-detail")!;
    const f = (v: number): string => String(Number(v.toFixed(1)));
    expect(panel.textContent).toContain(f(s.o2![0]));
    expect(panel.textContent).toContain(f(s.o2![1]));
    for (const o of s.outcomes) {
      expect(panel.textContent).toContain(ctx.t(`ui.outcome.${o.outcome}`));
      expect(panel.textContent).toContain(`${o.tests}`);
    }
  });

  it("an investigation with no tests shows not recorded in every tile", () => {
    const ctx = ctxFor();
    const root = renderMap(ctx);
    document.body.append(root);
    (root.querySelector('.dash-map-row[data-investigation="PSI-60"]') as SVGGElement)
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const panel = root.querySelector(".dash-detail")!;
    expect(panel.textContent).toContain("ground tests and models");
    expect(panel.textContent).toContain("not recorded");
    root.remove();
  });

  it("Open the story asks the overlay for the library", () => {
    const ctx = ctxFor();
    const root = renderMap(ctx);
    document.body.append(root);
    const seen: unknown[] = [];
    window.addEventListener(OPEN_LIBRARY_EVENT, (e) => seen.push((e as CustomEvent).detail));
    (root.querySelector(".dash-open-story") as HTMLButtonElement).click();
    expect(seen).toHaveLength(1);
    root.remove();
  });

  it("every number is linked to its source or marked data-own", () => {
    const root = renderMap(ctxFor());
    document.body.append(root);
    expect(dashNumbers(root)).toEqual([]);
    root.remove();
  });
});

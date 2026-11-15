// @vitest-environment jsdom
// Tests for the compare view (web-lane task 57, backend lane D4).
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
import { renderCompare, summarize } from "./compare";

const read = (rel: string): unknown => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));
const tests = read("../../../data/build/tests.json") as TestRun[];
const experiments = read("../../../data/build/experiments.json") as Experiment[];
const moments = read("../../../data/build/moments.json") as {
  id: string; investigation: string; kind: string; value: number; value_max?: number; outcome?: string;
}[];
const moon = read("../../../data/curated/moon.json") as Ctx["api"]["data"]["moon"];
const cases = read("../../../pipeline/tests/data/ranking_cases.json") as { id: string; top: { investigation: string }[] }[];

const ctxFor = (sliders: { pressure_kpa: number; o2_pct: number } | null = null): Ctx => {
  const store = createStore({ ...initialState, sliders });
  const api = createDataApi({ experiments, tests, moon, incidents: { incidents: [], pattern: { text: "", source: "", url: "" } } });
  return { api, store, dicts, t: makeT(() => "en") };
};

const placedIds = (ctx: Ctx): Set<string> => new Set(ctx.api.placed().map((p) => p.id));

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

describe("summarize (ranges, fuels, outcomes)", () => {
  it("matches every pipeline moment where one exists", () => {
    const ctx = ctxFor();
    const ids = new Set(placedIds(ctx));
    for (const m of moments) {
      const rows = tests.filter((t) => t.investigation === m.investigation);
      const s = summarize(rows, ids);
      if (m.kind === "tests-count") expect(s.tests, m.id).toBe(m.value);
      if (m.kind === "o2-range") expect(s.o2, m.id).toEqual([m.value, m.value_max]);
      if (m.kind === "pressure-range") expect(s.pressure, m.id).toEqual([m.value, m.value_max]);
      if (m.kind === "flow-range") expect(s.flow, m.id).toEqual([m.value, m.value_max]);
      if (m.kind === "outcome-count") {
        expect(s.outcomes.find((o) => o.outcome === m.outcome)?.tests, m.id).toBe(m.value);
      }
    }
  });

  it("reports null ranges and empty lists when nothing is recorded", () => {
    const s = summarize([], new Set());
    expect(s).toMatchObject({ tests: 0, placed: 0, fuels: [], nullFuel: 0, o2: null, pressure: null, flow: null, outcomes: [] });
  });
});

describe("compare pair", () => {
  it("defaults to the top two ranked for the current air", () => {
    const root = renderCompare(ctxFor());
    const oracle = cases.find((c) => c.id === "heo-dm-1006")!;
    const [a, b] = [...root.querySelectorAll("select.dash-compare-pick")];
    expect((a as HTMLSelectElement).value).toBe(oracle.top[0]!.investigation);
    expect((b as HTMLSelectElement).value).toBe(oracle.top[1]!.investigation);
  });

  it("shows both investigations with families, objectives, fuels, ranges, outcomes and shares", () => {
    const ctx = ctxFor();
    const root = renderCompare(ctx);
    const cols = [...root.querySelectorAll(".dash-compare-col")];
    expect(cols).toHaveLength(2);
    for (const [i, inv] of ["PSI-159", "PSI-10"].entries()) {
      const exp = experiments.find((e) => e.id === inv)!;
      const col = cols[i]!;
      expect(col.querySelector("a.dash-acronym")!.getAttribute("href")).toBe(exp.psi_url);
      expect(col.textContent).toContain(exp.family);
      expect(col.textContent).toContain(exp.objective);
      const rows = tests.filter((t) => t.investigation === inv);
      // fuels with test counts per fuel
      const byFuel = new Map<string, number>();
      for (const r of rows) if (r.fuel) byFuel.set(r.fuel, (byFuel.get(r.fuel) ?? 0) + 1);
      for (const [fuel, n] of byFuel) {
        expect(col.textContent).toContain(`${n}`);
        expect(col.textContent).toContain(fuel);
      }
      // outcomes with counts
      const byOutcome = new Map<string, number>();
      for (const r of rows) byOutcome.set(r.outcome, (byOutcome.get(r.outcome) ?? 0) + 1);
      for (const [outcome, n] of byOutcome) {
        expect(col.textContent).toContain(ctx.t(`ui.outcome.${outcome}`));
        expect(col.textContent).toContain(`${n}`);
      }
      // ranges equal the pipeline moments where they exist
      for (const m of moments.filter((x) => x.investigation === inv && x.kind.endsWith("-range"))) {
        expect(col.textContent).toContain(`${Number((m.value as number).toFixed(1))}`);
        expect(col.textContent).toContain(`${Number((m.value_max as number).toFixed(1))}`);
      }
    }
  });

  it("draws both dot sets on one chart in two tones, on the shared axes", () => {
    const ctx = ctxFor();
    const root = renderCompare(ctx);
    const svg = root.querySelector(".dash-compare-chart svg")!;
    const a = ctx.api.placed().filter((p) => p.investigation === "PSI-159");
    const b = ctx.api.placed().filter((p) => p.investigation === "PSI-10");
    expect(svg.querySelectorAll("circle.dash-dot-a").length).toBe(a.length);
    expect(svg.querySelectorAll("rect.dash-dot-b").length).toBe(b.length);
    expect(svg.querySelectorAll("circle.dash-dot-b").length).toBe(0);
    expect(svg.querySelectorAll("rect.dash-dot-a").length).toBe(0);
  });

  it("changing a select re-renders that side; an investigation with no rows shows not recorded", () => {
    const ctx = ctxFor();
    const root = renderCompare(ctx);
    document.body.append(root);
    const [, b] = [...root.querySelectorAll("select.dash-compare-pick")] as HTMLSelectElement[];
    b.value = "PSI-60";
    b.dispatchEvent(new Event("change", { bubbles: true }));
    const cols = [...root.querySelectorAll(".dash-compare-col")];
    expect(cols[1]!.textContent).toContain("ground tests and models");
    expect(cols[1]!.textContent).toContain("not recorded");
    root.remove();
  });

  it("a stage selection sets the first slot", () => {
    const ctx = ctxFor();
    const root = renderCompare(ctx);
    document.body.append(root);
    window.dispatchEvent(new CustomEvent(SELECT_INVESTIGATION, { detail: { investigation: "PSI-69" } }));
    const [a] = [...root.querySelectorAll("select.dash-compare-pick")] as HTMLSelectElement[];
    expect(a.value).toBe("PSI-69");
    root.remove();
  });
});

describe("inside one investigation", () => {
  it("groups the focus investigation by fuel with ranges per group", () => {
    const ctx = ctxFor();
    const root = renderCompare(ctx);
    // focus defaults to the first slot: PSI-159, whose fuels include digit blends like 50% butane
    const inside = root.querySelector(".dash-inside")!;
    const groups = [...inside.querySelectorAll(".dash-fuel-group")];
    const fuels = [...new Set(tests.filter((t) => t.investigation === "PSI-159" && t.fuel).map((t) => t.fuel as string))];
    expect(groups).toHaveLength(fuels.length);
    for (const g of groups) {
      const name = g.querySelector(".dash-fuel-name")!.textContent;
      expect(fuels).toContain(name);
      const n = tests.filter((t) => t.investigation === "PSI-159" && t.fuel === name).length;
      expect(g.textContent).toContain(`${n}`);
    }
    expect(inside.textContent).toContain("50% butane");
  });

  it("follows its own select", () => {
    const ctx = ctxFor();
    const root = renderCompare(ctx);
    document.body.append(root);
    const sel = root.querySelector("select.dash-inside-pick") as HTMLSelectElement;
    sel.value = "PSI-10";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    // PSI-10 has C2H4, C3H8 and tests with no fuel recorded
    const inside = root.querySelector(".dash-inside")!;
    expect(inside.textContent).toContain("C2H4");
    expect(inside.textContent).toContain("C3H8");
    expect(inside.textContent).toContain("no fuel recorded");
    root.remove();
  });
});

describe("compare audit", () => {
  it("every number is linked to its source or marked data-own", () => {
    const root = renderCompare(ctxFor());
    document.body.append(root);
    expect(dashNumbers(root)).toEqual([]);
    root.remove();
  });

  it("dash.css has no motion and defines the two dot tones", () => {
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "dash.css"), "utf8");
    expect(css).not.toMatch(/@keyframes|animation|transition/);
    expect(css).toMatch(/\.dash-dot-a/);
    expect(css).toMatch(/\.dash-dot-b/);
  });
});

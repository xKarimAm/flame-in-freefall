// @vitest-environment jsdom
// Tests for the method page (web-lane task 58, backend lane D5).
// Generated with Muse Spark, SI-assisted.
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDataApi } from "../data/index";
import { dicts, makeT } from "../i18n/index";
import { createStore, initialState } from "../store";
import type { Ctx } from "../contract";
import { renderMethod } from "./method";

const read = (rel: string): unknown => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));
const tests = read("../../../data/build/tests.json") as { id: string; investigation: string }[];
const experiments = read("../../../data/build/experiments.json") as {
  id: string; summary?: { model: string; quotes: string[] };
}[];
const moon = read("../../../data/curated/moon.json");
const incidents = read("../../../data/curated/incidents.json");
const provenance = read("../../../data/build/provenance.json") as {
  file: string; investigation: string; mapped: boolean; rows_read: number; rows_mapped: number;
  reason?: string;
  fields: Record<string, { parsed: number; empty: number; unparsable: number }>;
  units: Record<string, { column: string; unit?: string; factor?: number; conversion?: string }>;
  unparsable_cells: { field: string; row: number; raw: string }[];
}[];
const coverage = read("../../../data/build/coverage.json") as {
  total: number; plotted: number; by_reason: Record<string, number>;
};
const dictionary = read("../../../data/build/dictionary.json") as {
  file: string; field: string; meaning: string; records: number; non_null: number;
}[];
const library = read("../../../data/build/library.json") as { id: string; ai: { model: string } }[];
const esMeta = read("../i18n/es.meta.json") as { model: string; made_at: string; keys: number };
const hiMeta = read("../i18n/hi.meta.json") as { model: string; made_at: string; keys: number };

const served: Record<string, unknown> = {
  "data/provenance.json": provenance,
  "data/coverage.json": coverage,
  "data/dictionary.json": dictionary,
  "data/library.json": library,
  "data/es.meta.json": esMeta,
  "data/hi.meta.json": hiMeta,
};

const ctxFor = (): Ctx => {
  const store = createStore({ ...initialState, sliders: null });
  const api = createDataApi({ experiments, tests, moon, incidents } as never);
  return { api, store, dicts, t: makeT(() => "en") };
};

const stubFetch = (fail: string[] = [], boom = false): void => {
  vi.stubGlobal("fetch", async (url: string) => {
    if (boom) throw new Error("network down");
    if (fail.includes(String(url))) return { ok: false, status: 404, json: async () => null };
    return { ok: true, json: async () => served[String(url)] };
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

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

describe("method provenance", () => {
  it("tables every source file: rows read and mapped, fields parsed, units, raw cells", async () => {
    stubFetch();
    const { element, loaded } = renderMethod(ctxFor());
    document.body.append(element);
    await loaded;
    const tables = [...element.querySelectorAll("table.dash-prov")];
    const mapped = provenance.filter((p) => p.mapped);
    // one table per mapped file plus one combined table for the skipped files
    expect(tables).toHaveLength(mapped.length + 1);
    // csv_69_34: 274 rows read and mapped, one unparsable pressure cell "0" at row 114
    // (units and raw cells render beside the table, in its wrapper div)
    const first = tables.find((t) => t.querySelector("caption")!.textContent!.includes("csv_69_34.csv"))!;
    const block = first.parentElement!;
    expect(first.querySelector("caption")!.textContent).toContain("274");
    expect(block.textContent).toContain("274");
    expect(block.textContent).toContain("mmHg");
    expect(block.textContent).toContain("0.133322");
    expect(block.textContent).toContain("mole fraction");
    expect(block.textContent).toContain('"0"');
    expect(block.textContent).toContain("114");
    element.remove();
  });

  it("lists skipped files with the pipeline's reason", async () => {
    stubFetch();
    const { element, loaded } = renderMethod(ctxFor());
    document.body.append(element);
    await loaded;
    const skipped = provenance.filter((p) => !p.mapped);
    expect(skipped.length).toBeGreaterThan(0);
    for (const s of skipped) {
      expect(element.textContent).toContain(s.file);
      expect(element.textContent).toContain(s.reason!);
    }
    element.remove();
  });
});

describe("method coverage, checks, AI, dictionary, downloads", () => {
  it("states the plotted rule with the coverage counts and reasons", async () => {
    stubFetch();
    const { element, loaded } = renderMethod(ctxFor());
    document.body.append(element);
    await loaded;
    expect(element.textContent).toContain(`${coverage.plotted}`);
    expect(element.textContent).toContain(`${coverage.total}`);
    for (const [reason, n] of Object.entries(coverage.by_reason)) {
      expect(element.textContent).toContain(reason);
      expect(element.textContent).toContain(`${n}`);
    }
    element.remove();
  });

  it("names the checks with counts recomputed from the files", async () => {
    stubFetch();
    const ctx = ctxFor();
    const { element, loaded } = renderMethod(ctx);
    document.body.append(element);
    await loaded;
    // numbers audit input: every digit run in the story.* strings of the loaded en dictionary
    let storyNumbers = 0;
    for (const [k, v] of Object.entries(dicts.en!)) {
      if (k.startsWith("story.") && typeof v === "string") storyNumbers += (v.match(/\d+/g) ?? []).length;
    }
    expect(element.textContent).toContain(`${storyNumbers}`);
    // AI text audit: summaries, quotes and library stories with their models
    const withSummary = experiments.filter((e) => e.summary);
    const quotes = withSummary.reduce((n: number, e) => n + (e.summary?.quotes.length ?? 0), 0);
    expect(element.textContent).toContain(`${withSummary.length}`);
    expect(element.textContent).toContain(`${quotes}`);
    expect(element.textContent).toContain(`${library.length}`);
    expect(element.textContent).toContain("claude-sonnet-5-5");
    expect(element.textContent).toContain("muse-spark-1.3-contributor");
    // schema tests: every dictionary field documented
    expect(element.textContent).toContain(`${dictionary.length}`);
    element.remove();
  });

  it("shows translation records with model, time and key counts", async () => {
    stubFetch();
    const { element, loaded } = renderMethod(ctxFor());
    document.body.append(element);
    await loaded;
    for (const meta of [esMeta, hiMeta]) {
      expect(element.textContent).toContain(meta.model);
      expect(element.textContent).toContain(`${meta.keys}`);
    }
    element.remove();
  });

  it("links every data file and contract for download", async () => {
    stubFetch();
    const { element, loaded } = renderMethod(ctxFor());
    document.body.append(element);
    await loaded;
    for (const f of ["tests.json", "experiments.json", "moments.json", "library.json", "search.json",
      "coverage.json", "provenance.json", "dictionary.json", "psi-text.json", "moon.json", "incidents.json",
      "es.meta.json", "hi.meta.json", "tests.schema.json", "story.schema.json"]) {
      const a = element.querySelector(`.dash-downloads a[href="data/${f}"]`);
      expect(a, `download link for ${f}`).not.toBeNull();
    }
    element.remove();
  });

  it("every number is linked to its source or marked data-own", async () => {
    stubFetch();
    const { element, loaded } = renderMethod(ctxFor());
    document.body.append(element);
    await loaded;
    expect(dashNumbers(element)).toEqual([]);
    element.remove();
  });
});

describe("method loading failures", () => {
  it("shows which file failed and still renders the rest", async () => {
    stubFetch(["data/dictionary.json"]);
    const { element, loaded } = renderMethod(ctxFor());
    document.body.append(element);
    await loaded;
    expect(element.textContent).toContain("data/dictionary.json");
    const mapped = provenance.filter((p) => p.mapped).length;
    expect(element.querySelectorAll("table.dash-prov").length).toBe(mapped + 1);
    element.remove();
  });

  it("survives a total network failure without throwing", async () => {
    stubFetch([], true);
    const { element, loaded } = renderMethod(ctxFor());
    document.body.append(element);
    await loaded;
    expect(element.textContent).toContain("Could not load");
    element.remove();
  });
});

// @vitest-environment jsdom
// Generated with Claude, SI-assisted. Evidence fan: real data/build files, nothing typed in.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Ctx } from "../contract";
import { createDataApi } from "../data/index";
import { makeT } from "../i18n/index";
import { createStore, initialState } from "../store";
import { parseLibrary } from "./library";
import { layoutGraph, renderStoryGraph, wrap } from "./storygraph";

const read = (rel: string): any => JSON.parse(readFileSync(new URL(rel, import.meta.url), "utf8"));
const stories = parseLibrary(read("../../../data/build/library.json"));
const api = createDataApi({
  experiments: read("../../../data/build/experiments.json"),
  tests: read("../../../data/build/tests.json"),
  moon: read("../../../data/curated/moon.json"),
  incidents: read("../../../data/curated/incidents.json"),
});
const ctx: Ctx = { api, store: createStore({ ...initialState }), dicts: { en: read("../i18n/en.json") }, t: makeT(() => "en") };

describe("storygraph", () => {
  it("draws one node per investigation and one line per node, counts from the data", () => {
    let opened = "";
    const el = renderStoryGraph(stories, ctx, (id) => (opened = id))!;
    const exps = api.data.experiments;
    expect(el.querySelectorAll(".sg-inv").length).toBe(exps.length);
    const fams = new Set(exps.map((e) => e.family)).size;
    expect(el.querySelectorAll(".sg-line").length).toBe(exps.length + fams);
    const first = el.querySelector<SVGElement>(".sg-inv[role=button]")!;
    expect(first.getAttribute("aria-label")).toBeTruthy();
    first.dispatchEvent(new Event("click"));
    expect(opened).not.toBe("");
    for (const e of exps) expect(el.textContent).toContain(`${e.test_count} test`);
  });

  it("layout keeps every node inside the width, in both widths", () => {
    const by = new Map<any, any[]>();
    for (const e of api.data.experiments) by.set(e.family, [...(by.get(e.family) ?? []), e]);
    for (const narrow of [false, true]) {
      const L = layoutGraph(by, narrow);
      for (const f of L.families) for (const i of f.items) expect(i.node.x + i.node.w).toBeLessThanOrEqual(L.width);
      expect(L.width).toBeLessThanOrEqual(narrow ? 400 : 1180);
    }
    expect(wrap("Moon-base air question", 10)).toEqual(["Moon-base", "air", "question"]);
  });
});

// @vitest-environment jsdom
// Generated with Muse Spark, SI-assisted. Library view tests: real data/build files, no typed-in content.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Ctx, DataApi } from "../contract";
import { createDataApi } from "../data/index";
import { makeT } from "../i18n/index";
import { createStore, initialState } from "../store";
import {
  parseLibrary,
  parseMoments,
  renderLibraryList,
  renderLibraryPage,
  type LibraryMoment,
  type LibraryStory,
} from "./library";
import { mountOverlay } from "./overlay";

const read = (rel: string): any => JSON.parse(readFileSync(new URL(rel, import.meta.url), "utf8"));
const stories: LibraryStory[] = parseLibrary(read("../../../data/build/library.json"));
const moments: LibraryMoment[] = parseMoments(read("../../../data/build/moments.json"));

function ctx(): Ctx {
  const api: DataApi = createDataApi({
    experiments: read("../../../data/build/experiments.json"),
    tests: read("../../../data/build/tests.json"),
    moon: read("../../../data/curated/moon.json"),
    incidents: read("../../../data/curated/incidents.json"),
  });
  const store = createStore({ ...initialState });
  return { api, store, dicts: { en: read("../i18n/en.json") }, t: makeT(() => "en") };
}

const story = (id: string): LibraryStory => stories.find((s) => s.id === id)!;
const mom = (id: string): LibraryMoment => moments.find((m) => m.id === id)!;
/** The same formatting the page uses: integers plain, others trimmed to two decimals. */
const fmtCheck = (v: number): string => (Number.isInteger(v) ? String(v) : String(Number(v.toFixed(2))));

/** Text nodes with a digit outside a link, outside data-own provenance, outside the title and the quoted source text. */
function unlinkedDataNumbers(root: Element): string[] {
  const out: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement!;
    if (el.closest("svg title")) continue; // tooltips are never rendered text
    if (!/\d/.test(n.textContent ?? "")) continue;
    if (el.closest('a[href^="https://"], a[href^="data/"], [data-own]')) continue;
    if (el.closest("h3.lib-title, blockquote.lib-quote")) continue; // names and verbatim source quotes
    out.push(n.textContent!.trim());
  }
  return out;
}

describe("library", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("parses the real library file: 19 stories, every moment id resolves", () => {
    expect(stories).toHaveLength(19);
    const ids = new Set(moments.map((m) => m.id));
    for (const s of stories) for (const m of s.moments) expect(ids.has(m)).toBe(true);
  });

  it("rejects garbage instead of guessing", () => {
    expect(() => parseLibrary(null)).toThrow();
    expect(() => parseLibrary([{ id: "x" }])).toThrow();
    expect(() => parseLibrary([{ ...stories[0], signature: "confetti" }])).toThrow();
    expect(() => parseMoments([{ id: "PSI-69.x", value: "lots" }])).toThrow();
  });

  it("the drafted text holds no digits: numbers come only from moments", () => {
    for (const s of stories) {
      expect(s.hook).not.toMatch(/\d/);
      expect(s.reveal).not.toMatch(/\d/);
      expect(s.bridge).not.toMatch(/\d/);
    }
  });

  it("public lens: signature first, then hook, one moment as a large number, then bridge (task 53)", () => {
    for (const s of stories) {
      const c = ctx();
      const page = renderLibraryPage(s, moments, c);
      expect(page.querySelector("h3.lib-title")!.textContent).toContain(s.title);
      expect(page.querySelector(".lib-voice")!.textContent).toContain(s.voice);
      const order = [...page.children].map((el) => el.className);
      const at = (sel: string): number => order.findIndex((k) => k.split(" ").some((w) => w === sel));
      expect(at("lib-sig")).toBeGreaterThanOrEqual(0); // the story's own signature view, first
      expect(at("lib-hook")).toBeGreaterThan(at("lib-sig"));
      expect(at("lib-bridge")).toBeGreaterThan(at("lib-hook"));
      expect(at("lib-ai")).toBeGreaterThan(at("lib-bridge"));
      expect(page.textContent).toContain(s.hook);
      expect(page.textContent).toContain(s.bridge);
      expect(page.textContent).not.toContain(s.reveal);
      expect(page.querySelector("blockquote.lib-quote")).toBeNull();
      expect(page.querySelectorAll(".lib-moment").length).toBe(0);
      if (!s.moments.length) {
        expect(page.querySelector(".lib-bignum")).toBeNull(); // no moments, no large number
      } else {
        const m = mom(s.moments[0]);
        const big = page.querySelector(".lib-bignum")!;
        expect(at("lib-bignum")).toBeGreaterThan(at("lib-hook"));
        expect(at("lib-bignum")).toBeLessThan(at("lib-bridge"));
        expect(big.textContent).toContain(m.label);
        const link = big.querySelector(`a[href="${m.url}"]`)!;
        expect(link.textContent).toContain(fmtCheck(m.value));
        if (m.value_max != null) expect(link.textContent).toContain(fmtCheck(m.value_max));
      }
      const ai = page.querySelector(".lib-ai")!;
      expect(ai.textContent).toContain("AI summary");
      expect(ai.textContent).toContain(s.ai.model);
      expect(ai.textContent).toContain(s.ai.made_at);
      expect(unlinkedDataNumbers(page)).toEqual([]);
    }
  });

  it("astronaut lens is a crew briefing: the PSI sentence, a conditions table, the gaps, the PSI link (task 53)", () => {
    const c = ctx();
    c.store.set({ lens: "astronaut" });
    const s = story("flex");
    const eng = { text: "Crew relevance in plain words.", quote: "A quoted PSI sentence." };
    const page = renderLibraryPage({ ...s, engineer: eng }, moments, c);
    expect(page.querySelector("h3.lib-title")!.textContent).toContain(s.title);
    expect(page.querySelector(".lib-voice")!.textContent).toContain(s.voice);
    expect(page.querySelector(".lib-crew")!.textContent).toBe("What it means for a crew");
    expect(page.textContent).toContain(eng.text);
    const quote = page.querySelector("blockquote.lib-quote")!;
    expect(quote.textContent).toContain(eng.quote);
    const rows = [...page.querySelectorAll("table.lib-conditions tbody tr")];
    expect(rows.length).toBe(s.moments.length);
    for (const [i, row] of rows.entries()) {
      const m = mom(s.moments[i]);
      const th = row.querySelector("th")!;
      expect(th.getAttribute("scope")).toBe("row");
      expect(th.textContent).toBe(m.label);
      expect(th.querySelector(`a[href="${m.url}"]`)).not.toBeNull(); // the condition links too
      const link = row.querySelector(`td a[href="${m.url}"]`)!;
      expect(link.textContent).toContain(fmtCheck(m.value));
    }
    const psiUrl = c.api.experiment(s.core.investigation)!.psi_url;
    expect(page.querySelector(`a[href="${psiUrl}"]`)).not.toBeNull();
    expect(page.querySelector(".lib-sig")).toBeNull(); // a briefing, not the chart
    expect(unlinkedDataNumbers(page)).toEqual([]);
  });

  it("astronaut lens without engineer text says the PSI record is silent (task 53)", () => {
    const c = ctx();
    c.store.set({ lens: "astronaut" });
    for (const s of stories) {
      expect(s.engineer).toBeNull(); // the backend has no engineer text yet
      const page = renderLibraryPage(s, moments, c);
      expect(page.textContent).toContain("The PSI record does not state a safety application.");
      expect(page.querySelector(".lib-conditions")).not.toBeNull(); // the table still shows
    }
  });

  it("analyst lens: the test rows, then the signature view (task 53)", () => {
    const c = ctx();
    c.store.set({ lens: "analyst" });
    const s = story("flex"); // condition-map signature: rows and chart are distinct nodes
    const page = renderLibraryPage(s, moments, c);
    expect(page.querySelector("h3.lib-title")!.textContent).toContain(s.title);
    expect(page.querySelector(".lib-voice")!.textContent).toContain(s.voice);
    const rows = c.api.data.tests.filter((t) => s.investigations.includes(t.investigation));
    expect(rows.length).toBeGreaterThan(100);
    expect(page.querySelectorAll(".lib-card").length).toBe(rows.length);
    const order = [...page.children].map((el) => el.className);
    const cardsAt = order.findIndex((k) => k === "lib-sig" && page.children[order.indexOf(k)]?.querySelector(".lib-cards"));
    const sigAt = order.findIndex((k, i) => k === "lib-sig" && i !== cardsAt);
    expect(cardsAt).toBeGreaterThanOrEqual(0);
    expect(sigAt).toBeGreaterThan(cardsAt);
    expect(page.querySelector("svg.lib-map")).not.toBeNull();
    expect(page.textContent).not.toContain(s.hook);
  });

  it("signature charts are labelled for screen readers", () => {
    const c = ctx();
    expect(renderLibraryPage(story("flex"), moments, c).querySelector("svg.lib-map")!.getAttribute("aria-label")).toBe(
      "One dot per real test",
    );
    expect(renderLibraryPage(story("spice"), moments, c).querySelector("svg.lib-strip")!.getAttribute("aria-label")).toBe(
      "One mark per real test",
    );
  });

  it("condition-map draws one dot per placed test of the story", () => {
    const c = ctx();
    const s = story("flex");
    const page = renderLibraryPage(s, moments, c);
    const dots = page.querySelectorAll("svg.lib-map circle");
    const placed = c.api.placed().filter((p) => s.investigations.includes(p.investigation));
    expect(placed.length).toBeGreaterThan(100);
    expect(dots.length).toBe(placed.length);
    const caption = page.querySelector(".lib-sig-caption a")!;
    expect(caption.getAttribute("href")).toBe("data/tests.json");
    expect(caption.textContent).toContain(String(placed.length));
  });

  it("sample-wall draws one card per test row of the story, each with a source link", () => {
    const c = ctx();
    const s = story("bass");
    const page = renderLibraryPage(s, moments, c);
    const rows = c.api.data.tests.filter((t) => s.investigations.includes(t.investigation));
    expect(rows.length).toBe(122);
    const cards = page.querySelectorAll(".lib-card");
    expect(cards.length).toBe(rows.length);
    for (const card of cards) expect(card.querySelector('a[href^="https://"]')).not.toBeNull();
  });

  it("sample-wall shows recorded oxygen linked and missing pressure as not recorded", () => {
    const c = ctx();
    const page = renderLibraryPage(story("bass-ii"), moments, c);
    expect(page.querySelector(".lib-card a.num")).not.toBeNull();
    expect(page.querySelector(".lib-card .missing")!.textContent).toContain("not recorded");
  });

  it("outcome-strip names its variable with its unit", () => {
    const c = ctx();
    expect(renderLibraryPage(story("spice"), moments, c).querySelector("svg.lib-strip .lib-axis")!.textContent).toBe(
      "Flow (cm/s)",
    );
    expect(renderLibraryPage(story("flex-2"), moments, c).querySelector("svg.lib-strip .lib-axis")!.textContent).toBe(
      "Oxygen (%)",
    );
  });

  it("outcome-strip marks one row per test with the recorded variable (flow for SPICE, oxygen for FLEX-2)", () => {
    const c = ctx();
    const spice = story("spice");
    const spiceMarks = renderLibraryPage(spice, moments, c).querySelectorAll("svg.lib-strip line.lib-mark");
    const spiceRows = c.api.data.tests.filter(
      (t) => spice.investigations.includes(t.investigation) && t.flow_cm_s != null,
    );
    expect(spiceRows.length).toBe(444);
    expect(spiceMarks.length).toBe(spiceRows.length);
    const flex2 = story("flex-2");
    const flex2Page = renderLibraryPage(flex2, moments, c);
    const flex2Marks = flex2Page.querySelectorAll("svg.lib-strip line.lib-mark");
    // FLEX-2 rows record oxygen only as a range: one bar per row, never a midpoint
    const flex2Rows = c.api.data.tests.filter(
      (t) => flex2.investigations.includes(t.investigation) && (t.o2_pct ?? t.o2_pct_min) != null,
    );
    expect(flex2Rows.length).toBe(8);
    expect(flex2Marks.length).toBe(flex2Rows.length);
    expect(flex2Page.querySelectorAll("svg.lib-strip line.lib-mark.lib-range").length).toBe(8);
  });

  it("paper-trail lists every publication with a DOI or PSI link", () => {
    const c = ctx();
    const s = story("bre");
    const pubs = c.api.experiment("PSI-20")!.publications;
    expect(pubs.length).toBeGreaterThan(0);
    const page = renderLibraryPage(s, moments, c);
    const items = page.querySelectorAll(".lib-papers li");
    expect(items.length).toBe(pubs.length);
    for (const [i, li] of [...items].entries()) {
      const p = pubs[i]!;
      expect(li.textContent).toContain(p.title);
      const href = li.querySelector("a")!.getAttribute("href")!;
      expect(href).toBe(p.doi ? `https://doi.org/${p.doi}` : c.api.experiment("PSI-20")!.psi_url);
    }
  });

  it("the overlay library mode lists, filters and opens stories", async () => {
    document.body.innerHTML = `<section id="story-moon-air" data-story="moon-air" data-act="3" data-title="x"></section><div id="overlay" hidden></div>`;
    const c = ctx();
    const root = document.getElementById("overlay")!;
    const { open, openLibrary } = mountOverlay(root, c, async () => ({ stories, moments }));
    const opener = document.createElement("button");
    document.body.append(opener);
    await openLibrary(opener);
    expect(root.hidden).toBe(false);
    expect(root.querySelectorAll(".library-card").length).toBe(19);
    expect(root.querySelector(".overlay-count")!.textContent).toBe("19 of 19 experiments");
    const box = root.querySelector<HTMLInputElement>("#overlay-search")!;
    box.value = "grows differently";
    box.dispatchEvent(new Event("input", { bubbles: true }));
    const visible = () => [...root.querySelectorAll<HTMLElement>(".library-card")].filter((el) => !el.hidden);
    expect(visible().length).toBe(1);
    expect(root.querySelector(".overlay-count")!.textContent).toBe("1 of 19 experiments");
    visible()[0]!.click();
    expect(root.querySelector(".lib-page .lib-title")!.textContent).toContain("SAME / SAME-R");
    root.querySelector<HTMLButtonElement>(".library-back")!.click();
    await Promise.resolve();
    expect(root.querySelectorAll(".library-card").length).toBe(19);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(root.hidden).toBe(true);
    expect(document.activeElement).toBe(opener);
    void open;
  });

  it("an unknown moment id shows a plain line instead of a blank dialog (task 38)", async () => {
    document.body.innerHTML = `<section id="story-moon-air" data-story="moon-air" data-act="3" data-title="x"></section><div id="overlay" hidden></div>`;
    const c = ctx();
    const root = document.getElementById("overlay")!;
    const bad = { ...story("bre"), id: "bad-moments", moments: ["nope.unknown-moment"] };
    const { openLibrary } = mountOverlay(root, c, async () => ({ stories: [bad], moments }));
    await openLibrary(document.createElement("button"));
    root.querySelector<HTMLButtonElement>(".library-card")!.click();
    expect(root.querySelector(".lib-page")).toBeNull(); // no half-rendered page
    expect(root.querySelector(".overlay-body")!.textContent).toContain(c.t("ui.library.unavailable"));
    expect(root.querySelector<HTMLButtonElement>(".library-back")).not.toBeNull(); // the way back stays
  });

  it("stories with no moments show no large number; the first moment leads otherwise (tasks 38, 53)", () => {
    const c = ctx();
    const bare = renderLibraryPage(story("bre"), moments, c);
    expect(story("bre").moments).toEqual([]);
    expect(bare.querySelector(".lib-moments-title")).toBeNull();
    expect(bare.querySelector(".lib-bignum")).toBeNull();
    const full = renderLibraryPage(story("flex"), moments, c);
    const m = mom(story("flex").moments[0]);
    expect(full.querySelector(".lib-bignum")!.textContent).toContain(m.label);
  });

  it("condition-map lights one outcome's dots and reads its counts (task 59)", () => {
    const c = ctx();
    const page = renderLibraryPage(story("flex"), moments, c);
    const btns = [...page.querySelectorAll<HTMLButtonElement>(".lib-outcomes button")];
    expect(btns.map((b) => b.textContent)).toEqual(["All outcomes", "Kept burning", "Went out by itself", "A real test"]);
    const dots = () => [...page.querySelectorAll("svg.lib-map circle")];
    expect(dots().every((d) => !d.classList.contains("dim"))).toBe(true);
    const placed = c.api.placed().filter((p) => story("flex").investigations.includes(p.investigation));
    const wentOut = placed.filter((p) => ["extinction", "self-extinguished"].includes(p.outcome));
    expect(wentOut.length).toBeGreaterThan(0);
    btns.find((b) => b.textContent === "Went out by itself")!.click();
    const lit = dots().filter((d) => !d.classList.contains("dim"));
    expect(lit.length).toBe(wentOut.length);
    expect(page.querySelector(".lib-outcome-count")!.textContent).toBe(
      `${wentOut.length} of ${placed.length} dots Went out by itself.`,
    );
    btns.find((b) => b.textContent === "All outcomes")!.click();
    expect(dots().every((d) => !d.classList.contains("dim"))).toBe(true);
    expect(page.querySelector(".lib-outcome-count")!.textContent).toBe("");
  });

  it("sample-wall sorts by burn time or oxygen with the first value said aloud (task 59)", () => {
    const c = ctx();
    const val = (id: string, f: "burn" | "oxygen"): number | null => {
      const r = c.api.data.tests.find((t) => t.id === id)!;
      return f === "burn" ? (r.burn_time_s ?? null) : (r.o2_pct ?? null);
    };
    const first = (page: Element, f: "burn" | "oxygen"): number => {
      const li = page.querySelector("li.lib-card")!;
      return val(li.querySelector("a")!.textContent!, f)!;
    };
    // saffire burns longest: the top card carries the longest burn after sorting
    const saff = renderLibraryPage(story("saffire"), moments, c);
    const sel = saff.querySelector<HTMLSelectElement>("select.sort-samples")!;
    expect([...sel.options].map((o) => o.value)).toEqual(["", "burn", "oxygen"]);
    sel.value = "burn";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    const burns = c.api.data.tests.filter((t) => story("saffire").investigations.includes(t.investigation)).map((t) => t.burn_time_s ?? -1);
    expect(first(saff, "burn")).toBe(Math.max(...burns));
    expect(saff.querySelector(".lib-sort-result")!.textContent).toContain("Sorted by Burn time");
    // bass-ii has oxygen but no burn: oxygen only, and bass has neither so no control at all
    const bass2 = renderLibraryPage(story("bass-ii"), moments, c);
    const sel2 = bass2.querySelector<HTMLSelectElement>("select.sort-samples")!;
    expect([...sel2.options].map((o) => o.value)).toEqual(["", "oxygen"]);
    sel2.value = "oxygen";
    sel2.dispatchEvent(new Event("change", { bubbles: true }));
    const o2s = c.api.data.tests.filter((t) => story("bass-ii").investigations.includes(t.investigation)).map((t) => t.o2_pct ?? -1);
    expect(first(bass2, "oxygen")).toBe(Math.max(...o2s));
    expect(renderLibraryPage(story("bass"), moments, c).querySelector("select.sort-samples")).toBeNull();
  });

  it("outcome-strip drag reads the tests at that value (task 59)", () => {
    const c = ctx();
    const page = renderLibraryPage(story("spice"), moments, c);
    const drag = page.querySelector<HTMLInputElement>("input.lib-strip-range")!;
    const target = c.api.data.tests.find((t) => story("spice").investigations.includes(t.investigation) && t.flow_cm_s != null)!;
    drag.value = String(target.flow_cm_s);
    drag.dispatchEvent(new Event("input", { bubbles: true }));
    const result = page.querySelector(".lib-strip-result")!;
    expect(result.textContent).toContain(target.id);
    const near = page.querySelector(`line.lib-near[data-id="${target.id}"]`);
    expect(near).not.toBeNull();
    expect(result.querySelector(`a[href="${target.source.url}"]`)).not.toBeNull();
  });

  it("paper-trail filters by year when years exist, and stays a plain list when they do not (task 59)", () => {
    const c = ctx();
    const pubs = [
      { title: "Alpha", authors: "A", doi: null, year: 2020 },
      { title: "Beta", authors: "B", doi: null, year: 2021 },
      { title: "Gamma", authors: "C", doi: null, year: 2020 },
      { title: "Undated", authors: "D", doi: null, year: null },
    ];
    const dated = {
      ...c,
      api: {
        ...c.api,
        experiment: (() => ({ publications: pubs, psi_url: "https://example.test" })) as unknown as Ctx["api"]["experiment"],
      },
    };
    const page = renderLibraryPage({ ...story("bre"), investigations: ["PSI-20"] }, moments, dated);
    const btns = [...page.querySelectorAll<HTMLButtonElement>(".lib-years button")];
    expect(btns.map((b) => b.textContent)).toEqual(["All years", "2021", "2020"]);
    const visible = () => [...page.querySelectorAll(".lib-papers li")].filter((li) => !(li as HTMLElement).hidden);
    expect(visible().length).toBe(4);
    btns.find((b) => b.textContent === "2020")!.click();
    expect(visible().length).toBe(2);
    expect(page.querySelector(".lib-year-result")!.textContent).toBe("2 publications in 2020.");
    btns.find((b) => b.textContent === "All years")!.click();
    expect(visible().length).toBe(4);
    expect(page.querySelector(".lib-year-result")!.textContent).toBe("4 publications.");
    // the real archive records no year on any paper: no filter, just the list
    const real = renderLibraryPage(story("bre"), moments, c);
    expect(real.querySelector(".lib-years")).toBeNull();
    expect(real.querySelectorAll(".lib-papers li").length).toBeGreaterThan(0);
  });

  it("engineer text is optional, shape-checked and survives a round trip (task 53)", () => {
    const raw = read("../../../data/build/library.json");
    expect(parseLibrary(raw)[0].engineer).toBeNull();
    const eng = { text: "Crew relevance.", quote: "A quoted PSI sentence." };
    expect(parseLibrary([{ ...raw[0], engineer: eng }])[0].engineer).toEqual(eng);
    const back = parseLibrary(parseLibrary([{ ...raw[0], engineer: eng }]));
    expect(back[0].engineer).toEqual(eng);
    expect(() => parseLibrary([{ ...raw[0], engineer: { text: "no quote" } }])).toThrow();
    expect(() => parseLibrary([{ ...raw[0], engineer: "engineer" }])).toThrow();
  });

  it("a failed library load does not poison the next open (task 38)", async () => {
    document.body.innerHTML = `<section id="story-moon-air" data-story="moon-air" data-act="3" data-title="x"></section><div id="overlay" hidden></div>`;
    const c = ctx();
    const root = document.getElementById("overlay")!;
    let calls = 0;
    const flaky = async (): Promise<{ stories: LibraryStory[]; moments: LibraryMoment[] }> => {
      calls++;
      if (calls === 1) throw new Error("network down");
      return { stories, moments };
    };
    const { openLibrary } = mountOverlay(root, c, flaky);
    await openLibrary(document.createElement("button"));
    expect(root.querySelector(".overlay-body")!.textContent).toContain(c.t("ui.load-error"));
    await openLibrary(document.createElement("button"));
    expect(calls).toBe(2);
    expect(root.querySelectorAll(".library-card").length).toBe(19);
  });

  it("Tab stays inside the open dialog", async () => {
    document.body.innerHTML = `<div id="overlay" hidden></div>`;
    const c = ctx();
    const root = document.getElementById("overlay")!;
    const { openLibrary } = mountOverlay(root, c, async () => ({ stories, moments }));
    await openLibrary(document.createElement("button"));
    const focusable = () =>
      [...root.querySelectorAll<HTMLElement>(".overlay-inner button, .overlay-inner a[href], .overlay-inner input")].filter(
        (el) => !el.hidden && !el.closest("[hidden]"),
      );
    expect(focusable().length).toBeGreaterThan(2);
    focusable().at(-1)!.focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement).toBe(focusable()[0]);
    focusable()[0]!.focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(focusable().at(-1));
  });

  it("the open-library event opens the library and the open-overlay event still opens stories", async () => {
    document.body.innerHTML = `<section id="story-moon-air" data-story="moon-air" data-act="3" data-title="Build your Moon-base air"></section><div id="overlay" hidden></div>`;
    const c = ctx();
    const root = document.getElementById("overlay")!;
    mountOverlay(root, c, async () => ({ stories, moments }));
    const opener = document.createElement("button");
    window.dispatchEvent(new CustomEvent("firebreak:open-library", { detail: opener }));
    await Promise.resolve();
    await Promise.resolve();
    expect(root.hidden).toBe(false);
    expect(root.querySelector(".library-title")!.textContent).toBe("Every experiment");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    window.dispatchEvent(new CustomEvent("firebreak:open-overlay", { detail: opener }));
    expect(root.querySelectorAll(".story-card").length).toBe(1);
    expect(root.querySelector(".library-card")).toBeNull();
  });

  it("planned work reads as planned on the page (B14 redraft: bre, cld, s-flame)", () => {
    // PSI-20, PSI-21 and PSI-23 describe proposed work; the review (B14) rewrote them in
    // the future or planned tense. The page must show that wording, never past-tense telling.
    const c = ctx();
    for (const id of ["bre", "cld", "s-flame"]) {
      const page = renderLibraryPage(story(id), moments, c);
      const words = page.querySelector(".lib-hook")!.textContent!;
      expect(words).toMatch(/will|plan|proposed|going to/);
    }
  });

  it("the list shows all 19 stories and opens the clicked one", () => {
    const c = ctx();
    let opened: string | null = null;
    const list = renderLibraryList(stories, c, (id) => (opened = id));
    const cards = list.querySelectorAll<HTMLButtonElement>(".library-card");
    expect(cards.length).toBe(19);
    [...cards].find((b) => b.textContent!.includes("putting fire out"))!.click();
    expect(opened).toBe("flex");
  });
});

// @vitest-environment jsdom
// Generated with Claude, SI-assisted
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppState, Ctx, DataApi } from "../contract";
import { dicts, makeT } from "../i18n/index";
import { createStore } from "../store";
import { mount, type Scroller } from "./index";
import { flattenBeats, stories } from "./stories";

type Enter = (r: { element: HTMLElement; index: number; direction: "up" | "down" }) => void;

function setup() {
  document.body.innerHTML = '<div id="story"></div>';
  const el = document.getElementById("story")!;
  const store = createStore();
  const ctx: Ctx = { api: {} as DataApi, store, dicts, t: makeT(() => store.get().locale) };
  let enter: Enter = () => {};
  const scroller: Scroller = {
    setup: () => scroller,
    onStepEnter: (cb) => ((enter = cb), scroller),
    resize: () => scroller,
    destroy: () => {},
  };
  const seen: AppState[] = [];
  mount(el, ctx, () => scroller);
  store.subscribe((s) => seen.push(s)); // after the first activation: only scroll-driven changes
  const steps = [...el.querySelectorAll<HTMLElement>(".step")];
  const fire = (index: number, direction: "up" | "down") => enter({ element: steps[index], index, direction });
  return { el, store, steps, fire, seen };
}

describe("engine mount", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });
  const flat = flattenBeats(stories);
  const hook = flat.findIndex((f) => f.beat.kind === "hook");
  // the moon-air compare beat: the only compare beat with an astronaut key
  const compare = flat.findIndex(
    (f) => f.story.id === "moon-air" && f.beat.kind === "compare" && f.beat.text.astronaut,
  );
  // the moon-air beat with live sliders (kind "interactive")
  const slidersBeat = flat.findIndex((f) => f.story.id === "moon-air" && f.beat.stage.sliders);
  // a beat with no sources and no astronaut key, for the fallback assertions
  const bare = flat.findIndex((f) => f.beat.sources.length === 0 && f.beat.text.astronaut === undefined);

  it("renders sections and steps with the DOM conventions", () => {
    const { el, steps } = setup();
    expect(steps).toHaveLength(flat.length);
    const section = el.querySelector("#story-moon-air")!;
    expect(section.getAttribute("data-story")).toBe("moon-air");
    expect(section.getAttribute("data-act")).toBe("3");
    expect(section.getAttribute("data-title")).toBe(dicts.en!["story.moon-air.title"]);
    expect(section.querySelector("h2")!.textContent).toBe(dicts.en!["story.moon-air.title"]);
    const f = flat[slidersBeat];
    const step = document.getElementById(`beat-${f.story.id}-${f.scene.id}-${f.beat.id}`)!;
    expect(step.classList.contains("step")).toBe(true);
    expect(step.dataset.kind).toBe("interactive");
    expect(step.dataset.sliders).toBe("true");
    expect(steps[hook].dataset.sliders).toBeUndefined();
    const links = step.querySelectorAll<HTMLAnchorElement>("a");
    expect(links.length).toBe(f.beat.sources.length);
    expect(links[0].href).toBe(f.beat.sources[0].url);
    expect(links[0].target).toBe("_blank");
    expect(links[0].rel).toBe("noopener");
    expect(step.textContent).toContain(dicts.en!["ui.engine.sources"]);
    expect(steps[bare].querySelector("ul, a")).toBeNull(); // no sources: no list
  });

  it("activates the first beat on mount", () => {
    const { store, steps } = setup();
    expect(store.get().beat).toMatchObject({ story: flat[0].story.id, beat: flat[0].beat.id });
    expect(steps[0].classList.contains("is-active")).toBe(true);
  });

  it("follows step-enter down and up, restoring each beat state", () => {
    const { store, fire, seen, steps } = setup();
    fire(hook, "down");
    fire(slidersBeat, "down");
    fire(hook, "up");
    expect(seen.map((s) => s.beat?.beat)).toEqual([flat[hook].beat.id, flat[slidersBeat].beat.id, flat[hook].beat.id]);
    expect(seen.map((s) => s.stage)).toEqual([flat[hook].beat.stage, flat[slidersBeat].beat.stage, flat[hook].beat.stage]);
    expect(seen[0].sliders).toBeNull();
    expect(seen[1].sliders).toEqual(flat[slidersBeat].beat.stage.sliders);
    expect(seen[2].sliders).toBeNull();
    expect(store.get().beat?.kind).toBe("hook");
    expect(steps.map((s) => s.classList.contains("is-active"))).toEqual(flat.map((_, i) => i === hook));
  });

  it("does not overwrite slider moves while the beat stays active", () => {
    const { store, fire } = setup();
    fire(slidersBeat, "down");
    store.set({ sliders: { pressure_kpa: 30, o2_pct: 50 } });
    store.set({ lens: "analyst" });
    expect(store.get().sliders).toEqual({ pressure_kpa: 30, o2_pct: 50 });
    fire(hook, "up");
    fire(slidersBeat, "down");
    expect(store.get().sliders).toEqual(flat[slidersBeat].beat.stage.sliders); // re-entering restarts
  });

  it("changes step text in place when the lens changes", () => {
    const { store, steps, el } = setup();
    const before = [...el.querySelectorAll(".step")];
    const text = (i: number) => steps[i].querySelector(".step-text")!.textContent;
    const keys = flat[compare].beat.text;
    expect(text(compare)).toBe(dicts.en![keys.public]);
    store.set({ lens: "astronaut" });
    expect(text(compare)).toBe(dicts.en![keys.astronaut!]);
    expect(text(bare)).toBe(dicts.en![flat[bare].beat.text.public]); // no astronaut key: public
    const after = [...el.querySelectorAll(".step")];
    after.forEach((s, i) => expect(s).toBe(before[i]));
    expect(after).toHaveLength(before.length);
  });

  it("renders one cover that is not a step", () => {
    const { el } = setup();
    const covers = el.querySelectorAll(".cover");
    expect(covers).toHaveLength(1);
    expect(covers[0].classList.contains("step")).toBe(false);
    expect(el.firstElementChild).toBe(covers[0]);
    expect(covers[0].querySelector("h1")!.textContent).toBe(dicts.en!["ui.cover.title"]);
    expect(covers[0].querySelector(".cover-lead")!.textContent).toBe(dicts.en!["ui.cover.lead"]);
    expect(covers[0].querySelector(".cover-cue")!.textContent).toBe(dicts.en!["ui.cover.cue"]);
  });

  it("starts each story with a chapter page that is not a step", () => {
    const { el } = setup();
    for (const story of stories) {
      const section = el.querySelector(`#story-${story.id}`)!;
      const chapter = section.firstElementChild!;
      expect(chapter.tagName).toBe("HEADER");
      expect(chapter.classList.contains("chapter")).toBe(true);
      expect(chapter.classList.contains("step")).toBe(false);
      expect(chapter.querySelector(".chapter-label")!.textContent).toBe(`Chapter ${story.act}`);
      expect(chapter.querySelector("h2.story-title")!.textContent).toBe(dicts.en![story.title_key]);
    }
  });

  it("renders the question only when its key exists", () => {
    const story = stories[0];
    const qKey = story.title_key.replace(/\.title$/, ".question");
    // every story may carry a question key; clear all of them, then test both states either way
    const qKeys = stories.map((s) => s.title_key.replace(/\.title$/, ".question"));
    const originals = new Map<string, string>();
    for (const k of qKeys)
      if (dicts.en![k] !== undefined) {
        originals.set(k, dicts.en![k]);
        delete dicts.en![k];
      }
    try {
      expect(setup().el.querySelector(".chapter-question")).toBeNull();
      dicts.en![qKey] = "Test question text that is not shipped";
      const { el } = setup();
      const qs = el.querySelectorAll(".chapter-question");
      expect(qs).toHaveLength(1);
      expect(qs[0].textContent).toBe(dicts.en![qKey]);
      expect(el.querySelector(`#story-${story.id}`)!.contains(qs[0])).toBe(true);
      expect(el.querySelector(`#story-${story.id} h2.story-title`)!.nextElementSibling).toBe(qs[0]);
    } finally {
      for (const [k, v] of originals) dicts.en![k] = v;
      if (!originals.has(qKey)) delete dicts.en![qKey];
    }
  });

  it("numbers every beat page over the whole book", () => {
    const { steps } = setup();
    steps.forEach((s, i) =>
      expect(s.querySelector(".step-page")!.textContent).toBe(`Page ${i + 1} of ${flat.length}`),
    );
  });

  it("sets data-lens on the root from the store", () => {
    const { el, store } = setup();
    expect(el.dataset.lens).toBe("public");
    store.set({ lens: "analyst" });
    expect(el.dataset.lens).toBe("analyst");
    store.set({ lens: "astronaut" });
    expect(el.dataset.lens).toBe("astronaut");
  });

  it("keeps step ids and order", () => {
    const { steps } = setup();
    expect(steps.map((s) => s.id)).toEqual(flat.map((f) => `beat-${f.story.id}-${f.scene.id}-${f.beat.id}`));
  });

  it("renders one ending card after the last story that is not a step", () => {
    const { el, steps } = setup();
    const endings = el.querySelectorAll(".ending");
    expect(endings).toHaveLength(1);
    expect(endings[0]!.classList.contains("step")).toBe(false);
    expect(el.lastElementChild).toBe(endings[0]);
    expect(steps).toHaveLength(flat.length); // the ending adds no steps
    expect(endings[0]!.querySelector(".end-title")!.textContent).toBe(dicts.en!["ui.ending.title"]);
    expect(endings[0]!.querySelector(".end-summary")!.textContent).toBe(dicts.en!["ui.ending.summary"]);
    const btns = [...endings[0]!.querySelectorAll("button")];
    expect(btns.map((b) => b.textContent)).toEqual([
      dicts.en!["ui.ending.retry"],
      dicts.en!["ui.ending.library"],
      dicts.en!["ui.ending.data"],
    ]);
    expect(btns[0]!.classList.contains("primary")).toBe(true);
  });

  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "engine.css"), "utf8");

  it("page dots track the active step and jump on click", () => {
    const { el, fire, steps } = setup();
    const scroll = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
    const dots = [...el.querySelectorAll<HTMLButtonElement>(".page-dots .page-dot")];
    expect(dots).toHaveLength(steps.length);
    expect(el.querySelector(".page-dots")!.getAttribute("aria-label")).toBe(dicts.en!["ui.engine.pages"]);
    expect(dots[0]!.getAttribute("aria-current")).toBe("true");
    expect(dots.slice(1).every((d) => !d.hasAttribute("aria-current"))).toBe(true);
    expect(dots[2]!.getAttribute("aria-label")).toBe(
      dicts.en!["ui.engine.page"]!.replace("{n}", "3").replace("{total}", String(steps.length)),
    );
    fire(2, "down");
    expect(dots[2]!.getAttribute("aria-current")).toBe("true");
    expect(dots[0]!.hasAttribute("aria-current")).toBe(false);
    dots[1]!.click();
    expect(scroll.mock.contexts.at(-1)).toBe(steps[1]);
  });

  it("arrow keys and space move one page, and never hijack form controls", () => {
    const { el } = setup();
    const pages = [...el.querySelectorAll<HTMLElement>(".cover, .step, .ending")];
    expect(pages.length).toBeGreaterThan(3);
    let y = 0;
    Object.defineProperty(window, "scrollY", { configurable: true, get: () => y });
    const docTop = (i: number): DOMRect =>
      ({ top: i * 1000 - y, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    pages.forEach((p, i) => {
      p.getBoundingClientRect = () => docTop(i);
    });
    const scroll = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
    const key = (key: string, target: Element = document.body) =>
      target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    try {
      key("ArrowDown");
      expect(scroll.mock.contexts.at(-1)).toBe(pages[1]); // cover -> first step
      y = 1000; // the scroll happened
      key(" ");
      expect(scroll.mock.contexts.at(-1)).toBe(pages[2]);
      y = 2000;
      expect(key("ArrowUp")).toBe(false); // preventDefault: the key turns the page instead of scrolling
      expect(scroll.mock.contexts.at(-1)).toBe(pages[1]);
      const before = scroll.mock.calls.length;
      const input = document.createElement("input");
      document.body.append(input);
      key("ArrowDown", input);
      expect(scroll.mock.calls.length).toBe(before);
      input.remove();
    } finally {
      Object.defineProperty(window, "scrollY", { configurable: true, value: 0, writable: true });
    }
  });

  it("pages snap gently and dots sit outside the cards", () => {
    expect(css).toMatch(/scroll-snap-type:\s*y proximity/);
    expect(css).toMatch(/\.cover, \.chapter, #story \.step, \.ending\s*\{[^}]*scroll-snap-align:\s*start/);
    expect(css).toMatch(/\.page-dots\s*\{[^}]*position:\s*fixed/);
  });

  it("long source URLs never widen the page", () => {
    expect(css).toMatch(/\.step-sources\s*\{[^}]*overflow-wrap:\s*anywhere/);
  });

  it("the ending buttons retry the sliders, open the stories and switch to the data", () => {
    const { store, el } = setup();
    const scroll = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
    const [retry, library, data] = [...el.querySelectorAll<HTMLButtonElement>(".ending button")];
    const opened: Event[] = [];
    window.addEventListener("firebreak:open-overlay", (e) => opened.push(e));
    library!.click();
    expect(opened).toHaveLength(1);
    expect((opened[0] as CustomEvent).detail).toBe(library);
    data!.click();
    expect(store.get().lens).toBe("analyst");
    retry!.click();
    expect(scroll.mock.contexts.at(-1)).toBe(document.getElementById("beat-moon-air-moon-air-main-interactive"));
  });
});

// @vitest-environment jsdom
// Generated with Claude, SI-assisted
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppState, Ctx, DataApi } from "../contract";
import { parsePictures, type ChapterPicture } from "../data/pictures";
import { dicts, makeT } from "../i18n/index";
import { createStore } from "../store";
import { mount, type Scroller } from "./index";
import { flattenBeats, stories } from "./stories";

const curatedPictures = parsePictures(JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../data/curated/pictures.json"), "utf8")));

type Enter = (r: { element: HTMLElement; index: number; direction: "up" | "down" }) => void;

function setup(pictures: ChapterPicture[] = []) {
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
  mount(el, ctx, () => scroller, pictures);
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
  // a beat with no astronaut key, for the fallback assertions (every beat has sources now)
  const bare = flat.findIndex((f) => f.beat.text.astronaut === undefined);

  it("renders sections and steps with the DOM conventions", () => {
    const { el, steps } = setup();
    expect(steps).toHaveLength(flat.length);
    const section = el.querySelector("#story-moon-air")!;
    expect(section.getAttribute("data-story")).toBe("moon-air");
    expect(section.getAttribute("data-act")).toBe("3");
    expect(section.getAttribute("data-title")).toBe(`Chapter 3. ${dicts.en!["story.moon-air.title"]}`);
    expect(section.querySelector("h2")!.textContent).toBe(`Chapter 3. ${dicts.en!["story.moon-air.title"]}`);
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
    expect(steps.every((s) => s.querySelector("p.step-sources"))).toBe(true); // every beat lists a source
  });

  it("puts the page dots first in DOM order, ahead of the cover", () => {
    const { el } = setup();
    const order = [...el.children].map((c) => c.className);
    expect(order[0]).toContain("page-dots");
    expect(order[1]).toContain("cover");
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
    expect(el.children[0].classList.contains("page-dots")).toBe(true); // dots nav first for keyboard users
    expect(el.children[1]).toBe(covers[0]);
    expect(covers[0].querySelector("h1")!.textContent).toBe(dicts.en!["ui.cover.title"]);
    expect(covers[0].querySelector(".cover-lead")!.textContent).toBe(dicts.en!["ui.cover.lead"]);
    expect(covers[0].querySelector(".cover-cue")!.textContent).toBe(dicts.en!["ui.cover.cue"]);
  });

  it("sources ride on one small line after the card text (task 44)", () => {
    const { steps } = setup();
    const card = steps[hook].querySelector(".step-card")!;
    expect(card.querySelector("ul.step-sources")).toBeNull();
    const line = card.querySelector("p.step-sources")!;
    expect(line.textContent).toMatch(/^Sources: /);
    expect(line.querySelectorAll("a").length).toBeGreaterThan(0);
    expect(line.textContent).toContain(", ");
  });

  it("story text is a paragraph in a 30rem card, never a heading (task 43)", () => {
    const { steps } = setup();
    for (const s of steps) {
      expect(s.querySelector(".step-text")!.tagName).toBe("P");
      expect(s.querySelector(".step-card .step-sources")).not.toBeNull();
    }
    expect(css).toMatch(/\.step-card\s*\{[^}]*width:\s*min\(30rem/);
  });

  it("starts each story with a chapter page that is not a step", () => {
    const { el } = setup();
    for (const story of stories) {
      const section = el.querySelector(`#story-${story.id}`)!;
      const chapter = section.firstElementChild!;
      expect(chapter.tagName).toBe("HEADER");
      expect(chapter.classList.contains("chapter")).toBe(true);
      expect(chapter.classList.contains("step")).toBe(false);
      // one line of large type, sentence case: the act and the title together, no label
      expect(chapter.querySelector(".chapter-label")).toBeNull();
      expect(chapter.querySelector("h2.story-title")!.textContent).toBe(
        `Chapter ${story.act}. ${dicts.en![story.title_key]}`,
      );
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
      dicts.en!["ui.engine.explore"],
      dicts.en!["ui.ending.retry"],
      dicts.en!["ui.ending.library"],
    ]);
    expect(btns[0]!.classList.contains("primary")).toBe(true);
  });

  it("the cover names its audience and offers the dashboard; the ending leads with it (task 52)", () => {
    const { el, store } = setup();
    const cover = el.querySelector(".cover")!;
    expect([...cover.children].map((c) => c.className)).toEqual([
      "cover-title",
      "cover-lead",
      "cover-audience",
      "btn primary cover-explore",
      "cover-cue",
    ]);
    expect(cover.querySelector(".cover-audience")!.textContent).toBe(dicts.en!["ui.cover.audience"]);
    expect(cover.querySelector(".cover-audience")!.textContent).toContain("students");
    const explore = cover.querySelector<HTMLButtonElement>(".cover-explore")!;
    expect(explore.textContent).toBe(dicts.en!["ui.engine.explore"]);
    expect(explore.textContent).toBe("Explore the dashboard");
    explore.click();
    expect(store.get().lens).toBe("analyst");
  });

  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "engine.css"), "utf8");

  describe("chapter pictures (R13)", () => {
    const headerFor = (el: HTMLElement, act: number): HTMLElement =>
      el.querySelector(`section[data-act="${act}"] header.chapter`) as HTMLElement;

    it("chapters 1 to 3 render one figure each with the data's alt, caption and link", () => {
      const { el } = setup(curatedPictures);
      for (const act of [1, 2, 3]) {
        const pic = curatedPictures.find((p) => p.chapter === act)!;
        const fig = headerFor(el, act).querySelector("figure.chapter-picture");
        expect(fig, `chapter ${act} figure`).not.toBeNull();
        expect(fig!.querySelectorAll("figure").length).toBe(0);
        const img = fig!.querySelector("img")!;
        expect(img.getAttribute("src")).toBe(`data/${pic.file}`);
        expect(img.getAttribute("alt")).toBe(pic.alt);
        expect(img.getAttribute("loading")).toBe("lazy");
        const cap = fig!.querySelector("figcaption")!;
        expect(cap.textContent).toContain(pic.caption);
        const a = cap.querySelector("a")!;
        expect(a.getAttribute("href")).toBe(pic.url);
        expect(a.textContent).toBe(pic.credit);
        expect(cap.textContent).toContain(`${dicts.en!["ui.engine.pictureImage"]}: ${pic.credit}`);
      }
    });

    it("chapter 4 renders no figure, and the figure sits after the title group", () => {
      const { el } = setup(curatedPictures);
      expect(headerFor(el, 4).querySelector("figure.chapter-picture")).toBeNull();
      const header = headerFor(el, 1);
      const kids = [...header.children].map((c) => c.className);
      expect(kids[0]).toBe("chapter-text");
      expect(kids[kids.length - 1]).toBe("chapter-picture");
      // R14: the title and its question are one group: the wrapper holds both
      const copy = header.querySelector(".chapter-text")!;
      expect(copy.querySelector("h2.story-title")).not.toBeNull();
      expect(copy.querySelector(".chapter-question")).not.toBeNull();
      expect(copy.querySelector("h2.story-title")!.nextElementSibling!.classList.contains("chapter-question")).toBe(true);
    });

    it("the edit note renders word for word when the record carries one", () => {
      const { el } = setup(curatedPictures);
      const pic = curatedPictures.find((p) => p.edit)!;
      const cap = headerFor(el, pic.chapter).querySelector("figcaption")!;
      expect(pic.edit!.length).toBeGreaterThan(0);
      expect(cap.textContent).toContain(pic.edit!);
    });

    it("missing pictures render no figures and throw nothing", () => {
      const { el } = setup([]);
      expect(el.querySelectorAll("figure.chapter-picture").length).toBe(0);
      for (const act of [1, 2, 3, 4]) expect(headerFor(el, act).querySelector("h2")!.textContent).toContain(`Chapter ${act}.`);
    });

    it("chapter figures sit on the right half from 1100 px, full width below it (R13d)", () => {
      // desktop: title and question left, the figure on the right half, vertically centred
      expect(css).toMatch(/@media\s*\(min-width:\s*1100px\)[\s\S]*?\.chapter\s*\{[^}]*grid-template-columns:[^}]*1fr 1fr/s);
      expect(css).toMatch(/\.chapter-picture\s*\{[^}]*max-width:\s*44vw/);
      expect(css).toMatch(/\.chapter-picture img\s*\{[^}]*max-height:\s*60vh/);
      expect(css).toMatch(/\.chapter-picture img\s*\{[^}]*object-fit:\s*contain/);
      expect(css).toMatch(/\.chapter-picture figcaption\s*\{[^}]*font-size:\s*var\(--text-meta\)/);
      // narrow: the figure goes below the question at full width inside the 16 px margins
      expect(css).toMatch(/\.chapter-picture\s*\{[^}]*margin:\s*0/);
      expect(css).toMatch(/\.chapter-picture img\s*\{[^}]*max-height:\s*40vh/);
      expect(css).toMatch(/@media\s*\(min-width:\s*1100px\)[\s\S]*?\.chapter-picture img\s*\{[^}]*max-height:\s*60vh/s);
    });

    it("the figcaption holds caption, credit and edit on their own block lines (R14)", () => {
      const { el } = setup(curatedPictures);
      const pic = curatedPictures.find((p) => p.edit)!;
      const header = headerFor(el, pic.chapter);
      const cap = header.querySelector("figcaption")!;
      // three separate elements, so no two parts share one text run
      const parts = [...cap.children];
      expect(parts.map((p) => p.className)).toEqual(["chapter-caption", "chapter-credit", "chapter-edit"]);
      expect(parts[0].textContent).toBe(pic.caption);
      expect(parts[1].textContent).toBe(`${dicts.en!["ui.engine.pictureImage"]}: ${pic.credit}`);
      expect(parts[1].querySelector("a")!.getAttribute("href")).toBe(pic.url);
      expect(parts[1].querySelector("a")!.textContent).toBe(pic.credit);
      expect(parts[2].textContent).toBe(pic.edit!);
      // the separator is structural (own lines) plus CSS space: block lines 4 px apart
      expect(css).toMatch(/\.chapter-picture figcaption\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*gap:\s*4px/s);
      expect(css).toMatch(/\.chapter-caption[^{]*\{[^}]*display:\s*block/);
      // a picture without an edit note renders two lines, never an empty third
      const plain = curatedPictures.find((p) => !p.edit)!;
      const plainParts = [...headerFor(el, plain.chapter).querySelector("figcaption")!.children];
      expect(plainParts.map((p) => p.className)).toEqual(["chapter-caption", "chapter-credit"]);
    });

    it("the title and question stay one group beside the figure (R14)", () => {
      const { el } = setup(curatedPictures);
      const header = headerFor(el, 1);
      const kids = [...header.children].map((c) => c.className);
      expect(kids).toEqual(["chapter-text", "chapter-picture"]);
      const copy = header.querySelector(".chapter-text")!;
      expect(copy.querySelector("h2.story-title")).not.toBeNull();
      expect(copy.querySelector(".chapter-question")).not.toBeNull();
      // the question sits 16 px under the title, not pushed pages apart
      expect(css).toMatch(/\.chapter-question\s*\{[^}]*margin:\s*16px 0 0/);
      expect(css).not.toMatch(/\.chapter-question\s*\{[^}]*margin:\s*32px 0 0/);
      // desktop: the group is one grid item beside the figure, centred as a whole
      expect(css).toMatch(/@media\s*\(min-width:\s*1100px\)[\s\S]*?\.chapter-text\s*\{\s*grid-column:\s*1/s);
      expect(css).toMatch(/@media\s*\(min-width:\s*1100px\)[\s\S]*?\.chapter-picture\s*\{[^}]*grid-column:\s*2/s);
      expect(css).not.toMatch(/\.chapter-picture\s*\{[^}]*grid-row:\s*1 \/ span 2/);
    });
  });

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

  it("page turning stays out of the analyst workspace, and html lang follows the locale (task 36)", () => {
    const { el, store } = setup();
    const pages = [...el.querySelectorAll<HTMLElement>(".cover, .step, .ending")];
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
      expect(scroll.mock.contexts.at(-1)).toBe(pages[1]);
      y = 1000;
      const before = scroll.mock.calls.length;
      // the analyst lens is a workspace, not a story: arrows must not turn story pages there
      store.set({ lens: "analyst" });
      key("ArrowDown");
      expect(scroll.mock.calls.length).toBe(before);
      store.set({ lens: "public" });
      // keyboard inside the workspace panels and the open overlay stays there too
      for (const id of ["sheet", "panel", "overlay"]) {
        const box = document.createElement("div");
        box.id = id;
        document.body.append(box);
        const beforeEach = scroll.mock.calls.length;
        key("ArrowDown", box);
        expect(scroll.mock.calls.length, id).toBe(beforeEach);
        box.remove();
      }
      // an open overlay swallows page keys even when the focus is outside it
      const overlay = document.createElement("div");
      overlay.id = "overlay";
      document.body.append(overlay);
      const beforeOverlay = scroll.mock.calls.length;
      key("ArrowDown");
      expect(scroll.mock.calls.length).toBe(beforeOverlay);
      overlay.remove();
      // and the page still turns otherwise
      key("ArrowDown");
      expect(scroll.mock.contexts.at(-1)).toBe(pages[2]);
      // the document language follows the locale switch
      expect(document.documentElement.lang).toBe("en");
      store.set({ locale: "es" });
      expect(document.documentElement.lang).toBe("es");
      store.set({ locale: "en" });
      expect(document.documentElement.lang).toBe("en");
    } finally {
      Object.defineProperty(window, "scrollY", { configurable: true, value: 0, writable: true });
      document.documentElement.lang = "en";
    }
  });

  it("cards stay light: bar but no box fill, 24px padding (task 44)", () => {
    expect(css).toMatch(/\.step-card\s*\{[^}]*border-left:\s*4px/);
    const first = css.slice(css.indexOf(".step-card {"), css.indexOf("}", css.indexOf(".step-card {")));
    expect(first).not.toContain("background");
    expect(first).toContain("padding: 24px");
    // narrow exception: cards scroll behind the pinned stage and must disappear behind it
    expect(css).toMatch(/@media\s*\(max-width:\s*1099px\)[\s\S]*?#story \.step-card\s*\{[^}]*background:\s*var\(--space-black\)/);
  });

  it("columns never share space and the stage hides behind covers and chapters (task 41)", () => {
    expect(css).toMatch(/\.chapter\s*\{[^}]*min-height:\s*100vh/);
    // inactive cards dim by text colour; nothing is translucent enough to show through
    expect(css).toMatch(/\.step-card\s*\{[^}]*color:\s*var\(--muted-dark\)/);
    expect(css).not.toMatch(/\.step-card\s*\{[^}]*opacity/);
    expect(css).toMatch(/\.step\.is-active \.step-card\s*\{\s*color:\s*var\(--ink-dark\)/);
  });

  it("the cover is text on the left over the live stage, chapters hide it (task 45)", () => {
    expect(css).not.toMatch(/\.cover\s*\{[^}]*background/);
  });

  it("hides the stage while a chapter page is on screen, never on the cover (task 41c, 45)", () => {
    const { el } = setup();
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    const cover = el.querySelector(".cover")!;
    const chapter = el.querySelector(".chapter")!;
    const rect = (top: number, h: number): DOMRect =>
      ({ top, bottom: top + h, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    try {
      cover.getBoundingClientRect = () => rect(0, 800);
      chapter.getBoundingClientRect = () => rect(2000, 400);
      window.dispatchEvent(new Event("scroll"));
      expect(document.body.dataset.stageHidden).toBe("false"); // cover shows the live dial
      cover.getBoundingClientRect = () => rect(-900, 800);
      chapter.getBoundingClientRect = () => rect(2000, 400);
      window.dispatchEvent(new Event("scroll"));
      expect(document.body.dataset.stageHidden).toBe("false");
      chapter.getBoundingClientRect = () => rect(100, 800);
      window.dispatchEvent(new Event("scroll"));
      expect(document.body.dataset.stageHidden).toBe("true");
    } finally {
      delete document.body.dataset.stageHidden;
    }
  });

  it("marks the cover while it is on screen so the stage shows only the dial and flame (R2b)", () => {
    const { el } = setup();
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    const cover = el.querySelector(".cover")!;
    const rect = (top: number, h: number): DOMRect =>
      ({ top, bottom: top + h, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    try {
      cover.getBoundingClientRect = () => rect(0, 800);
      window.dispatchEvent(new Event("scroll"));
      expect(document.body.dataset.cover).toBe("true");
      cover.getBoundingClientRect = () => rect(-900, 800);
      window.dispatchEvent(new Event("scroll"));
      expect(document.body.dataset.cover).toBe("false");
    } finally {
      delete document.body.dataset.cover;
    }
  });

  it("page dots are 10 px circles, never stretched by the global button height (R2d)", () => {
    // ui.css gives every button a 40 px minimum height: the dots opt back out
    expect(css).toMatch(/\.page-dot\s*\{[^}]*width:\s*10px/);
    expect(css).toMatch(/\.page-dot\s*\{[^}]*height:\s*10px/);
    expect(css).toMatch(/\.page-dot\s*\{[^}]*border-radius:\s*50%/);
    expect(css).toMatch(/\.page-dot\s*\{[^}]*min-height:\s*0/);
  });

  it("small screens keep a 16 px page margin and compact chapter titles (R7)", () => {
    expect(css).toMatch(/\.cover\s*\{[^}]*padding:\s*max\(4vw,\s*16px\)/);
    expect(css).toMatch(/\.chapter\s*\{[^}]*padding:\s*max\(4vw,\s*16px\)/);
    expect(css).toMatch(/\.end-card\s*\{[^}]*margin-left:\s*max\(4vw,\s*16px\)/);
    expect(css).toMatch(/@media\s*\(max-width:\s*767px\)[\s\S]*?\.story-title\s*\{[^}]*font-size:\s*32px/);
  });

  it("chapter pages span the full viewport width, not just the story column (R2c)", () => {
    expect(css).toMatch(/\.chapter\s*\{[^}]*width:\s*100vw/);
    // the full-bleed width counts the scrollbar: clip the sliver so no sideways scroll appears
    expect(css).toMatch(/html\s*\{[^}]*overflow-x:\s*clip/);
  });

  it("chapter titles are large sentence case with no uppercase tracking (task 42)", () => {
    expect(css).toMatch(/\.story-title\s*\{[^}]*font-size:\s*var\(--text-chapter\)/);
    expect(css).toMatch(/\.chapter-question\s*\{[^}]*font-size:\s*var\(--text-card\)/);
    expect(css).not.toMatch(/text-transform:\s*uppercase/);
    expect(css).not.toMatch(/letter-spacing/);
  });

  it("the phone title rule stands after the base rule so it wins (R9b)", () => {
    // the 32 px rule once stood before the base 44 px rule and lost: headlines stayed 44 px
    const baseAt = css.indexOf(".story-title {");
    expect(baseAt).toBeGreaterThan(-1);
    const after = css.slice(baseAt);
    expect(after).toMatch(/@media\s*\(max-width:\s*767px\)\s*\{\s*\.story-title\s*\{\s*font-size:\s*32px/);
  });

  it("the chapter page keeps its padding inside the viewport width (R9b)", () => {
    expect(css).toMatch(/\.chapter\s*\{[^}]*width:\s*100vw/);
    expect(css).toMatch(/\.chapter\s*\{[^}]*box-sizing:\s*border-box/);
  });

  it("chapter questions keep the 16 px page margin (R9b)", () => {
    // the question rides inside the chapter padding, which never drops below 16 px (R7);
    // it carries no left offset of its own
    expect(css).toMatch(/\.chapter\s*\{[^}]*padding:\s*max\(4vw,\s*16px\)/);
    expect(css).not.toMatch(/\.chapter-question\s*\{[^}]*margin-left/);
  });

  it("pages snap gently and dots sit outside the cards", () => {
    expect(css).toMatch(/scroll-snap-type:\s*y proximity/);
    expect(css).toMatch(/\.cover, \.chapter, #story \.step, \.ending\s*\{[^}]*scroll-snap-align:\s*start/);
    expect(css).toMatch(/\.page-dots\s*\{[^}]*position:\s*fixed/);
  });

  it("long source URLs never widen the page", () => {
    expect(css).toMatch(/\.step-sources\s*\{[^}]*overflow-wrap:\s*anywhere/);
  });

  it("the ending buttons explore the dashboard, retry the sliders and open the library", () => {
    const { store, el } = setup();
    const scroll = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
    const [explore, retry, library] = [...el.querySelectorAll<HTMLButtonElement>(".ending button")];
    const opened: Event[] = [];
    window.addEventListener("firebreak:open-library", (e) => opened.push(e));
    library!.click();
    expect(opened).toHaveLength(1);
    expect((opened[0] as CustomEvent).detail).toBe(library);
    explore!.click();
    expect(store.get().lens).toBe("analyst");
    retry!.click();
    expect(scroll.mock.contexts.at(-1)).toBe(document.getElementById("beat-moon-air-moon-air-main-interactive"));
  });
});

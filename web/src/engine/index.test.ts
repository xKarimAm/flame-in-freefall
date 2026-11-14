// @vitest-environment jsdom
// Generated with Claude, SI-assisted
import { describe, expect, it } from "vitest";
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
  const flat = flattenBeats(stories);
  const hook = flat.findIndex((f) => f.beat.kind === "hook");
  const compare = flat.findIndex((f) => f.beat.kind === "compare");

  it("renders sections and steps with the DOM conventions", () => {
    const { el, steps } = setup();
    expect(steps).toHaveLength(flat.length);
    const section = el.querySelector("#story-moon-air")!;
    expect(section.getAttribute("data-story")).toBe("moon-air");
    expect(section.getAttribute("data-act")).toBe("3");
    expect(section.getAttribute("data-title")).toBe(dicts.en!["story.moon-air.title"]);
    expect(section.querySelector("h2")!.textContent).toBe(dicts.en!["story.moon-air.title"]);
    const f = flat[compare];
    const step = document.getElementById(`beat-${f.story.id}-${f.scene.id}-${f.beat.id}`)!;
    expect(step.classList.contains("step")).toBe(true);
    expect(step.dataset.kind).toBe("compare");
    expect(step.dataset.sliders).toBe("true");
    expect(steps[hook].dataset.sliders).toBeUndefined();
    const links = step.querySelectorAll<HTMLAnchorElement>("a");
    expect(links.length).toBe(f.beat.sources.length);
    expect(links[0].href).toBe(f.beat.sources[0].url);
    expect(links[0].target).toBe("_blank");
    expect(links[0].rel).toBe("noopener");
    expect(step.textContent).toContain(dicts.en!["ui.engine.sources"]);
    expect(steps[hook].querySelector("ul, a")).toBeNull(); // no sources: no list
  });

  it("activates the first beat on mount", () => {
    const { store, steps } = setup();
    expect(store.get().beat).toMatchObject({ story: flat[0].story.id, beat: flat[0].beat.id });
    expect(steps[0].classList.contains("is-active")).toBe(true);
  });

  it("follows step-enter down and up, restoring each beat state", () => {
    const { store, fire, seen, steps } = setup();
    fire(hook, "down");
    fire(compare, "down");
    fire(hook, "up");
    expect(seen.map((s) => s.beat?.beat)).toEqual([flat[hook].beat.id, flat[compare].beat.id, flat[hook].beat.id]);
    expect(seen.map((s) => s.stage)).toEqual([flat[hook].beat.stage, flat[compare].beat.stage, flat[hook].beat.stage]);
    expect(seen[0].sliders).toBeNull();
    expect(seen[1].sliders).toEqual(flat[compare].beat.stage.sliders);
    expect(seen[2].sliders).toBeNull();
    expect(store.get().beat?.kind).toBe("hook");
    expect(steps.map((s) => s.classList.contains("is-active"))).toEqual(flat.map((_, i) => i === hook));
  });

  it("does not overwrite slider moves while the beat stays active", () => {
    const { store, fire } = setup();
    fire(compare, "down");
    store.set({ sliders: { pressure_kpa: 30, o2_pct: 50 } });
    store.set({ lens: "analyst" });
    expect(store.get().sliders).toEqual({ pressure_kpa: 30, o2_pct: 50 });
    fire(hook, "up");
    fire(compare, "down");
    expect(store.get().sliders).toEqual(flat[compare].beat.stage.sliders); // re-entering restarts
  });

  it("changes step text in place when the lens changes", () => {
    const { store, steps, el } = setup();
    const before = [...el.querySelectorAll(".step")];
    const text = (i: number) => steps[i].querySelector(".step-text")!.textContent;
    const keys = flat[compare].beat.text;
    expect(text(compare)).toBe(dicts.en![keys.public]);
    store.set({ lens: "astronaut" });
    expect(text(compare)).toBe(dicts.en![keys.astronaut!]);
    expect(text(hook)).toBe(dicts.en![flat[hook].beat.text.public]); // no astronaut key: public
    const after = [...el.querySelectorAll(".step")];
    after.forEach((s, i) => expect(s).toBe(before[i]));
    expect(after).toHaveLength(before.length);
  });
});

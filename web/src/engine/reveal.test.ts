// @vitest-environment jsdom
// Generated with Claude, SI-assisted
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Ctx, DataApi } from "../contract";
import { dicts, makeT } from "../i18n/index";
import { createStore } from "../store";
import { MOTION_EASE } from "../ui/motion";
import { mount, splitSentences, type Scroller } from "./index";
import { flattenBeats, stories } from "./stories";

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "reveal.css"), "utf8");
const flat = flattenBeats(stories);

function setup() {
  document.body.innerHTML = '<div id="story"></div>';
  const el = document.getElementById("story")!;
  const store = createStore();
  const ctx: Ctx = { api: {} as DataApi, store, dicts, t: makeT(() => store.get().locale) };
  let enter: (r: { element: HTMLElement; index: number; direction: "up" | "down" }) => void = () => {};
  const scroller: Scroller = {
    setup: () => scroller,
    onStepEnter: (cb) => ((enter = cb), scroller),
    resize: () => scroller,
    destroy: () => {},
  };
  mount(el, ctx, () => scroller);
  const steps = [...el.querySelectorAll<HTMLElement>(".step")];
  const fire = (index: number) => enter({ element: steps[index], index, direction: "down" });
  return { store, steps, fire };
}
const idx = (s: HTMLElement) => [...s.querySelectorAll<HTMLElement>(".rv")].map((p) => Number(p.style.getPropertyValue("--i")));

describe("page reveal", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("splits sentences without breaking decimals", () => {
    expect(splitSentences("One. Two! Is it 0.5 bar? Yes.")).toEqual(["One.", "Two!", "Is it 0.5 bar?", "Yes."]);
  });

  it("activating a page adds the reveal class and increasing --i on label, sentences, sources, cue", () => {
    const { steps, fire } = setup();
    expect(steps[0].classList.contains("reveal")).toBe(false); // silent first activation at mount: page 1 is off screen
    fire(0);
    expect(steps[0].classList.contains("reveal")).toBe(true);
    expect(steps[1].classList.contains("reveal")).toBe(false);
    const n = idx(steps[1]);
    fire(1);
    expect(steps[1].classList.contains("reveal")).toBe(true);
    expect(steps[0].classList.contains("reveal")).toBe(false); // left page: visible, dimmed, no animation class
    const order = [...steps[1].querySelectorAll(".rv")].map((p) => p.className.split(" ")[0]);
    expect(order[0]).toBe("step-page");
    expect(order.at(-1)).toBe("step-cue");
    expect(order).toContain("step-sources");
    expect(idx(steps[1])).toEqual([...idx(steps[1])].sort((a, b) => a - b));
    expect(idx(steps[1])[0]).toBe(0);
    expect(Math.max(...idx(steps[1]))).toBeLessThanOrEqual(7); // 7 x 110 + 320 ms < 1.2 s
    expect(n.length).toBeGreaterThan(2);
  });

  it("activating the same page twice does not replay it", () => {
    const { steps, fire } = setup();
    fire(2);
    const before = steps[2].className;
    expect(before).toContain("reveal");
    fire(2);
    expect(steps[2].className).toBe(before); // same classes: the animation keeps running, never restarts
  });

  it("a lens change keeps the sentence spans in step with the new text and does not replay", () => {
    const { steps, fire, store } = setup();
    fire(1);
    const text = steps[1].querySelector(".step-text")!;
    store.set({ lens: "analyst" });
    const spans = [...text.querySelectorAll(".sent")];
    expect(spans.map((s) => s.textContent)).toEqual(splitSentences(text.textContent!));
    expect(spans.length).toBeGreaterThan(0);
    expect(steps[1].classList.contains("reveal")).toBe(true);
    expect(steps[1].classList.contains("reveal-done")).toBe(true); // css: no animation once done
    fire(1);
    expect(steps[1].classList.contains("reveal-done")).toBe(true);
    fire(2); // moving away and back is a new entrance
    fire(1);
    expect(steps[1].classList.contains("reveal-done")).toBe(false);
  });

  it("the cue button on page n turns to page n+1; the last page says so and has no chevron", () => {
    const { steps, fire } = setup();
    const scroll = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
    fire(1);
    const cue = steps[1].querySelector<HTMLButtonElement>("button.step-cue")!;
    expect(cue.textContent).toBe(dicts.en!["ui.engine.next-cue"]);
    expect(cue.querySelector(".cue-chevron")).not.toBeNull();
    cue.click();
    expect(scroll.mock.contexts.at(-1)).toBe(steps[2]);
    fire(2);
    expect(steps[2].classList.contains("is-active")).toBe(true);
    const last = steps[flat.length - 1].querySelector(".step-cue")!;
    expect(last.tagName).toBe("P");
    expect(last.textContent).toBe(dicts.en!["ui.engine.last-cue"]);
    expect(last.querySelector(".cue-chevron")).toBeNull();
  });

  it("reveal.css: reduced motion turns every animation off, and the ease is MOTION_EASE", () => {
    const block = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(block).toMatch(/\.rv\s*\{[^}]*animation:\s*none/);
    expect(block).toMatch(/\.cue-chevron\s*\{\s*animation:\s*none/);
    expect(css.match(/cubic-bezier\([^)]*\)/g)!.every((c) => c === MOTION_EASE)).toBe(true);
    expect(css).toMatch(/animation-delay:\s*calc\(var\(--i/);
    expect(css).not.toMatch(/gradient|box-shadow|text-shadow/);
  });

  it("reveal.css: chapter rule colours never use yellow", () => {
    expect(css).toMatch(/data-act="1"\][^{]*\{[^}]*var\(--flame\)/);
    expect(css).toMatch(/data-act="4"\][^{]*\{[^}]*var\(--muted-dark\)/);
    expect(css).not.toContain("--moon");
  });
});

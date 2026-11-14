// Scroll engine: stories -> steps -> active beat -> store. Coder C owns this folder (T5).
// Generated with Claude, SI-assisted.
import scrollama from "scrollama";
import type { Ctx } from "../contract";
import "./engine.css";
import { flattenBeats, stories } from "./stories";
import { resolveText } from "./text";

/** The slice of scrollama the engine uses, so tests can pass a fake. */
export interface Scroller {
  setup(options: { step: HTMLElement[]; offset?: 0.6 }): Scroller;
  onStepEnter(cb: (r: { element: HTMLElement; index: number; direction: "up" | "down" }) => void): Scroller;
  resize(): Scroller;
  destroy(): void;
}

function node<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function mount(el: HTMLElement, ctx: Ctx, makeScroller: () => Scroller = scrollama): void {
  const flat = flattenBeats(stories);
  const steps: HTMLElement[] = [];
  const texts: HTMLElement[] = [];
  const labels: HTMLElement[] = []; // the "Sources" label of each step (a detached stub when the beat has no sources)
  const headings: { section: HTMLElement; h2: HTMLElement; key: string }[] = [];
  const sections = new Map<string, HTMLElement>();

  el.replaceChildren();
  for (const { story, scene, beat } of flat) {
    let section = sections.get(story.id);
    if (!section) {
      section = node("section", "story");
      section.id = `story-${story.id}`;
      section.dataset.story = story.id;
      section.dataset.act = String(story.act);
      const h2 = node("h2", "story-title");
      section.append(h2);
      headings.push({ section, h2, key: story.title_key });
      sections.set(story.id, section);
      el.append(section);
    }
    const step = node("div", "step");
    step.id = `beat-${story.id}-${scene.id}-${beat.id}`;
    step.dataset.kind = beat.kind;
    if (beat.stage.sliders) step.dataset.sliders = "true";
    const card = node("div", "step-card");
    const text = node("p", "step-text");
    card.append(text);
    const label = node("h3", "step-sources-label");
    if (beat.sources.length) {
      const list = node("ul", "step-sources");
      for (const s of beat.sources) {
        const a = node("a", undefined, s.label);
        a.href = s.url;
        a.target = "_blank";
        a.rel = "noopener";
        const li = node("li");
        li.append(a);
        list.append(li);
      }
      card.append(label, list);
    }
    step.append(card);
    section.append(step);
    steps.push(step);
    texts.push(text);
    labels.push(label);
  }

  function render(): void {
    const { lens, locale } = ctx.store.get();
    flat.forEach(({ beat }, i) => {
      texts[i].textContent = resolveText(ctx.dicts, beat.text, lens, locale);
      labels[i].textContent = ctx.t("ui.engine.sources");
    });
    for (const { section, h2, key } of headings) {
      h2.textContent = ctx.t(key);
      section.dataset.title = h2.textContent;
    }
  }

  function activate(i: number): void {
    const { story, scene, beat } = flat[i];
    steps.forEach((s, j) => s.classList.toggle("is-active", j === i));
    // sliders are (re)started only here, on entering a beat, so a user's moves survive while it stays active
    ctx.store.set({
      beat: { story: story.id, scene: scene.id, beat: beat.id, kind: beat.kind },
      stage: beat.stage,
      sliders: beat.stage.sliders ? { ...beat.stage.sliders } : null,
    });
  }

  render();
  ctx.store.subscribe((s, prev) => {
    if (s.lens !== prev.lens || s.locale !== prev.locale) render();
  });

  if (steps.length === 0) return;
  makeScroller()
    .setup({ step: steps, offset: 0.6 })
    .onStepEnter(({ index }) => activate(index)); // both directions: scrolling up restores that beat
  activate(0);
}

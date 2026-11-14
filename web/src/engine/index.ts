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
  const pages: HTMLElement[] = []; // the "Page n of total" line of each step
  const headings: { section: HTMLElement; label: HTMLElement; h2: HTMLElement; question: HTMLElement; key: string; act: number }[] = [];
  const sections = new Map<string, HTMLElement>();

  el.replaceChildren();
  const cover = node("section", "cover");
  const coverTitle = node("h1", "cover-title");
  const coverLead = node("p", "cover-lead");
  const coverCue = node("p", "cover-cue");
  cover.append(coverTitle, coverLead, coverCue);
  el.append(cover);
  for (const { story, scene, beat } of flat) {
    let section = sections.get(story.id);
    if (!section) {
      section = node("section", "story");
      section.id = `story-${story.id}`;
      section.dataset.story = story.id;
      section.dataset.act = String(story.act);
      const header = node("header", "chapter");
      const label = node("p", "chapter-label");
      const h2 = node("h2", "story-title");
      const question = node("p", "chapter-question"); // attached in render() only when the dictionary has the key
      header.append(label, h2);
      section.append(header);
      headings.push({ section, label, h2, question, key: story.title_key, act: story.act });
      sections.set(story.id, section);
      el.append(section);
    }
    const step = node("div", "step");
    step.id = `beat-${story.id}-${scene.id}-${beat.id}`;
    step.dataset.kind = beat.kind;
    if (beat.stage.sliders) step.dataset.sliders = "true";
    const card = node("div", "step-card");
    const page = node("p", "step-page");
    const text = node("p", "step-text");
    card.append(page, text);
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
    pages.push(page);
    labels.push(label);
  }

  function render(): void {
    const { lens, locale } = ctx.store.get();
    el.dataset.lens = lens;
    coverTitle.textContent = ctx.t("ui.cover.title");
    coverLead.textContent = ctx.t("ui.cover.lead");
    coverCue.textContent = ctx.t("ui.cover.cue");
    flat.forEach(({ beat }, i) => {
      pages[i].textContent = ctx.t("ui.engine.page", { n: i + 1, total: flat.length });
      texts[i].textContent = resolveText(ctx.dicts, beat.text, lens, locale);
      labels[i].textContent = ctx.t("ui.engine.sources");
    });
    for (const { section, label, h2, question, key, act } of headings) {
      label.textContent = ctx.t("ui.engine.chapter", { n: act });
      h2.textContent = ctx.t(key);
      section.dataset.title = h2.textContent;
      const qKey = key.replace(/\.title$/, ".question");
      const q = ctx.t(qKey);
      if (q === qKey) question.remove(); // missing key: no question element
      else {
        question.textContent = q;
        h2.after(question);
      }
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

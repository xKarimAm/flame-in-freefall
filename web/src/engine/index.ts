// Scroll engine: stories -> steps -> active beat -> store. Coder C owns this folder (T5).
// Generated with Claude, SI-assisted.
import scrollama from "scrollama";
import { MOON_STORY_ID } from "../contract";
import type { Ctx } from "../contract";
import { safeHref } from "../ui/dom";
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

/** The ending card talks to the rest of the app without importing it: scrolling is DOM,
 *  the data lens is the store, and the Stories overlay listens for this event (see ui/overlay.ts). */
export const OPEN_OVERLAY_EVENT = "firebreak:open-overlay";
/** The ending card's "See every experiment" opens the library, not the story list. */
export const OPEN_LIBRARY_EVENT = "firebreak:open-library";

function scrollCenter(el: Element | null): void {
  if (!el) return;
  const behavior =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  (el as HTMLElement).scrollIntoView({ block: "center", behavior });
}

export function mount(el: HTMLElement, ctx: Ctx, makeScroller: () => Scroller = scrollama): void {
  const flat = flattenBeats(stories);
  const steps: HTMLElement[] = [];
  const texts: HTMLElement[] = [];
  const labels: HTMLElement[] = []; // the "Sources" label of each step (a detached stub when the beat has no sources)
  const pages: HTMLElement[] = []; // the "Page n of total" line of each step
  const headings: { section: HTMLElement; h2: HTMLElement; question: HTMLElement; key: string; act: number }[] = [];
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
      const h2 = node("h2", "story-title");
      const question = node("p", "chapter-question"); // attached in render() only when the dictionary has the key
      header.append(h2);
      section.append(header);
      headings.push({ section, h2, question, key: story.title_key, act: story.act });
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
        a.href = safeHref(s.url);
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

  // page dots: one per step, tracking the active one. First in DOM (keyboard users
  // reach it first), visually fixed in place by CSS, so the look does not change.
  const dotsNav = node("nav", "page-dots");
  const dots: HTMLButtonElement[] = [];
  for (const step of steps) {
    const d = node("button", "page-dot");
    d.type = "button";
    d.addEventListener("click", () => scrollCenter(step));
    dotsNav.append(d);
    dots.push(d);
  }
  el.insertBefore(dotsNav, cover);

  // ending card: what the visitor just saw, and three ways to go on
  const ending = node("section", "ending");
  const endTitle = node("h2", "end-title");
  const endSummary = node("p", "end-summary");
  const endActions = node("div", "end-actions");
  const retryBtn = node("button", "end-btn primary");
  retryBtn.type = "button";
  const libraryBtn = node("button", "end-btn");
  libraryBtn.type = "button";
  const dataBtn = node("button", "end-btn");
  dataBtn.type = "button";
  retryBtn.addEventListener("click", () =>
    scrollCenter(
      document.querySelector(`#story-${MOON_STORY_ID} .step[data-sliders="true"]`) ??
        document.querySelector(`#story-${MOON_STORY_ID}`),
    ),
  );
  libraryBtn.addEventListener("click", () => window.dispatchEvent(new CustomEvent(OPEN_LIBRARY_EVENT, { detail: libraryBtn })));
  dataBtn.addEventListener("click", () => {
    ctx.store.set({ lens: "analyst" });
    scrollCenter(document.getElementById("sheet"));
  });
  endActions.append(retryBtn, libraryBtn, dataBtn);
  const endCard = node("div", "end-card");
  endCard.append(endTitle, endSummary, endActions);
  ending.append(endCard);
  el.append(ending);

  function markDots(active: number): void {
    dots.forEach((d, j) => {
      if (j === active) d.setAttribute("aria-current", "true");
      else d.removeAttribute("aria-current");
    });
  }

  /** The stage hides while the cover or a chapter page fills the screen. */
  function updateStageHidden(): void {
    const vh = window.innerHeight;
    const inView = (n: Element): boolean => {
      const r = n.getBoundingClientRect();
      return r.top < vh && r.bottom > 0;
    };
    const cover = el.querySelector(".cover");
    const chapter = [...el.querySelectorAll(".chapter")].some(inView);
    document.body.dataset.stageHidden = cover && inView(cover) || chapter ? "true" : "false";
  }

  function render(): void {
    const { lens, locale } = ctx.store.get();
    el.dataset.lens = lens;
    document.documentElement.lang = locale;
    dotsNav.setAttribute("aria-label", ctx.t("ui.engine.pages"));
    dots.forEach((d, i) => d.setAttribute("aria-label", ctx.t("ui.engine.page", { n: i + 1, total: dots.length })));
    coverTitle.textContent = ctx.t("ui.cover.title");
    coverLead.textContent = ctx.t("ui.cover.lead");
    coverCue.textContent = ctx.t("ui.cover.cue");
    endTitle.textContent = ctx.t("ui.ending.title");
    endSummary.textContent = ctx.t("ui.ending.summary");
    retryBtn.textContent = ctx.t("ui.ending.retry");
    libraryBtn.textContent = ctx.t("ui.ending.library");
    dataBtn.textContent = ctx.t("ui.ending.data");
    flat.forEach(({ beat }, i) => {
      pages[i].textContent = ctx.t("ui.engine.page", { n: i + 1, total: flat.length });
      texts[i].textContent = resolveText(ctx.dicts, beat.text, lens, locale);
      labels[i].textContent = ctx.t("ui.engine.sources");
    });
    for (const { section, h2, question, key, act } of headings) {
      h2.textContent = ctx.t("ui.engine.chapterTitle", { n: act, title: ctx.t(key) });
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

  function pageEls(): HTMLElement[] {
    return [...el.querySelectorAll<HTMLElement>(".cover, .step, .ending")];
  }

  /** Keyboard page turning: arrows and space move one page, never hijacking form controls,
   *  and never inside the analyst workspace or the open overlay. */
  function onKey(e: KeyboardEvent): void {
    if (!el.isConnected) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (ctx.store.get().lens === "analyst") return;
    const overlay = document.getElementById("overlay");
    if (overlay && !overlay.hidden) return;
    const target = e.target as HTMLElement | null;
    if (target && target.closest("input, select, textarea, button, a, [contenteditable], #sheet, #panel, #overlay")) return;
    const dir = e.key === "ArrowDown" || e.key === "PageDown" || e.key === " " ? 1 : e.key === "ArrowUp" || e.key === "PageUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const list = pageEls();
    if (!list.length) return;
    const line = window.scrollY + window.innerHeight * 0.4;
    let at = list.findIndex((p) => p.getBoundingClientRect().top + window.scrollY > line + 1);
    if (at === -1) at = list.length;
    scrollCenter(list[Math.min(list.length - 1, Math.max(0, at - 1 + dir))]);
  }
  window.addEventListener("keydown", onKey);

  function activate(i: number): void {
    const { story, scene, beat } = flat[i];
    steps.forEach((s, j) => s.classList.toggle("is-active", j === i));
    markDots(i);
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
  const onScroll = (): void => {
    if (el.isConnected) updateStageHidden();
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  updateStageHidden();

  if (steps.length === 0) return;
  makeScroller()
    .setup({ step: steps, offset: 0.6 })
    .onStepEnter(({ index }) => activate(index)); // both directions: scrolling up restores that beat
  activate(0);
}

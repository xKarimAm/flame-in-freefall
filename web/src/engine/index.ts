// Scroll engine: stories -> steps -> active beat -> store. Coder C owns this folder (T5).
// Generated with Claude, SI-assisted.
import scrollama from "scrollama";
import { MOON_STORY_ID } from "../contract";
import type { Ctx } from "../contract";
import { DATA_URL_BASE } from "../data/index";
import type { ChapterPicture } from "../data/pictures";
import { safeHref } from "../ui/dom";
import "./engine.css";
import "./reveal.css";
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

/** Sentences for the picture-book entrance: split after . ! ? when whitespace follows
 *  (so "0.5" and "ISS-1" stay whole). One sentence per span, each arriving in turn. */
export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter((t) => t.length > 0);
}

/** Staggered parts: --i counts 0,1,2... and stops at 7, so 7 gaps of 110 ms plus the
 *  320 ms fade-up stay under 1.2 s however many sentences a page has (see reveal.css). */
const MAX_REVEAL_INDEX = 7;
function setReveal(el: HTMLElement, i: number): void {
  el.classList.add("rv");
  el.style.setProperty("--i", String(Math.min(i, MAX_REVEAL_INDEX)));
}

function scrollCenter(el: Element | null): void {
  if (!el) return;
  const behavior =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  (el as HTMLElement).scrollIntoView({ block: "center", behavior });
}

/** A chapter page's NASA photograph (R13): the figure for the chapter number, with the
 *  record's own caption, credit link and edit note. No picture fact is typed here.
 *  R14: each part of the figcaption is its own block line (caption, "Image: credit",
 *  edit note) so the caption never runs into the credit. */
export function chapterFigure(pic: ChapterPicture, imageWord: string): HTMLElement {
  const figure = node("figure", "chapter-picture");
  const img = node("img");
  img.src = `${DATA_URL_BASE}/${pic.file}`;
  img.alt = pic.alt;
  img.setAttribute("loading", "lazy");
  const cap = node("figcaption");
  cap.append(node("span", "chapter-caption", pic.caption));
  const credit = node("span", "chapter-credit");
  credit.append(document.createTextNode(`${imageWord}: `));
  const a = node("a", undefined, pic.credit);
  a.href = safeHref(pic.url);
  a.target = "_blank";
  a.rel = "noopener";
  credit.append(a);
  cap.append(credit);
  if (pic.edit) {
    cap.append(node("span", "chapter-edit", pic.edit));
  }
  figure.append(img, cap);
  return figure;
}

export function mount(el: HTMLElement, ctx: Ctx, makeScroller: () => Scroller = scrollama, pictures: ChapterPicture[] = []): void {
  const flat = flattenBeats(stories);
  const steps: HTMLElement[] = [];
  const texts: HTMLElement[] = [];
  const pages: HTMLElement[] = []; // the "Page n of total" line of each step
  const sourceLines: (HTMLElement | undefined)[] = [];
  const cues: HTMLElement[] = []; // "Scroll to turn the page" (a button) or, on the last page, a plain line
  const headings: { section: HTMLElement; h2: HTMLElement; question: HTMLElement; key: string; act: number }[] = [];
  const sections = new Map<string, HTMLElement>();

  el.replaceChildren();
  const cover = node("section", "cover");
  const coverTitle = node("h1", "cover-title");
  const coverLead = node("p", "cover-lead");
  const coverAudience = node("p", "cover-audience");
  const coverExplore = node("button", "btn primary cover-explore");
  coverExplore.type = "button";
  const coverCue = node("p", "cover-cue");
  cover.append(coverTitle, coverLead, coverAudience, coverExplore, coverCue);
  el.append(cover);
  for (const { story, scene, beat } of flat) {
    let section = sections.get(story.id);
    if (!section) {
      section = node("section", "story");
      section.id = `story-${story.id}`;
      section.dataset.story = story.id;
      section.dataset.act = String(story.act);
      const header = node("header", "chapter");
      // R14: the title and its question stay together in one group beside the figure,
      // the question 16 px under the title, the group vertically centred on the page.
      const copy = node("div", "chapter-text");
      const h2 = node("h2", "story-title");
      const question = node("p", "chapter-question"); // attached in render() only when the dictionary has the key
      copy.append(h2);
      header.append(copy);
      const pic = pictures.find((p) => p.chapter === story.act);
      if (pic) header.append(chapterFigure(pic, ctx.t("ui.engine.pictureImage")));
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
    // the sources ride on one small line after the card text
    if (beat.sources.length) {
      const line = node("p", "step-sources");
      line.append(document.createTextNode(`${ctx.t("ui.engine.sources")}: `));
      beat.sources.forEach((s, i) => {
        if (i > 0) line.append(document.createTextNode(", "));
        const a = node("a", undefined, s.label);
        a.href = safeHref(s.url);
        a.target = "_blank";
        a.rel = "noopener";
        line.append(a);
      });
      card.append(line);
      sourceLines.push(line);
    } else sourceLines.push(undefined);
    // the cue: a real button to the next page; the last page gets a plain line instead
    const last = steps.length === flat.length - 1;
    const cue = last ? node("p", "step-cue is-last") : node("button", "step-cue");
    if (cue instanceof HTMLButtonElement) {
      cue.type = "button";
      const at = steps.length; // this step's own index
      cue.addEventListener("click", () => scrollCenter(steps[at + 1]));
      cue.append(node("span", "cue-text"), node("span", "cue-chevron"));
      cue.lastElementChild!.setAttribute("aria-hidden", "true");
    } else cue.append(node("span", "cue-text"));
    card.append(cue);
    cues.push(cue);
    step.append(card);
    section.append(step);
    steps.push(step);
    texts.push(text);
    pages.push(page);
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
  const exploreBtn = node("button", "end-btn primary");
  exploreBtn.type = "button";
  const retryBtn = node("button", "end-btn");
  retryBtn.type = "button";
  const libraryBtn = node("button", "end-btn");
  libraryBtn.type = "button";
  const explore = (): void => {
    ctx.store.set({ lens: "analyst" });
    scrollCenter(document.getElementById("sheet"));
  };
  coverExplore.addEventListener("click", explore);
  exploreBtn.addEventListener("click", explore);
  retryBtn.addEventListener("click", () =>
    scrollCenter(
      document.querySelector(`#story-${MOON_STORY_ID} .step[data-sliders="true"]`) ??
        document.querySelector(`#story-${MOON_STORY_ID}`),
    ),
  );
  libraryBtn.addEventListener("click", () => window.dispatchEvent(new CustomEvent(OPEN_LIBRARY_EVENT, { detail: libraryBtn })));
  endActions.append(exploreBtn, retryBtn, libraryBtn);
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

  /** The cover shows only the dial and the flame: incident cards hide while it fills the screen. */
  function updateCoverFlag(): void {
    const cover = el.querySelector(".cover");
    if (!cover) return;
    const vh = window.innerHeight;
    const r = cover.getBoundingClientRect();
    document.body.dataset.cover = r.top < vh / 2 && r.bottom > vh / 2 ? "true" : "false";
  }

  /** The stage hides while a chapter page fills the screen; the cover keeps its live
   *  stage behind the text, so only chapters hide it. */
  function updateStageHidden(): void {
    const vh = window.innerHeight;
    const inView = (n: Element): boolean => {
      const r = n.getBoundingClientRect();
      return r.top < vh / 2 && r.bottom > vh / 2;
    };
    document.body.dataset.stageHidden = [...el.querySelectorAll(".chapter")].some(inView) ? "true" : "false";
  }

  function render(): void {
    const { lens, locale } = ctx.store.get();
    el.dataset.lens = lens;
    document.documentElement.lang = locale;
    dotsNav.setAttribute("aria-label", ctx.t("ui.engine.pages"));
    dots.forEach((d, i) => d.setAttribute("aria-label", ctx.t("ui.engine.page", { n: i + 1, total: dots.length })));
    coverTitle.textContent = ctx.t("ui.cover.title");
    coverLead.textContent = ctx.t("ui.cover.lead");
    coverAudience.textContent = ctx.t("ui.cover.audience");
    coverExplore.textContent = ctx.t("ui.engine.explore");
    coverCue.textContent = ctx.t("ui.cover.cue");
    endTitle.textContent = ctx.t("ui.ending.title");
    endSummary.textContent = ctx.t("ui.ending.summary");
    exploreBtn.textContent = ctx.t("ui.engine.explore");
    retryBtn.textContent = ctx.t("ui.ending.retry");
    libraryBtn.textContent = ctx.t("ui.ending.library");
    flat.forEach(({ beat }, i) => {
      pages[i].textContent = ctx.t("ui.engine.page", { n: i + 1, total: flat.length });
      setReveal(pages[i], 0);
      const sentences = splitSentences(resolveText(ctx.dicts, beat.text, lens, locale));
      const spans = sentences.map((t, k) => {
        const span = node("span", "sent", t);
        setReveal(span, k + 1);
        return span;
      });
      texts[i].replaceChildren(...spans.flatMap((sp, k) => (k ? [document.createTextNode(" "), sp] : [sp])));
      let part = spans.length + 1;
      const src = sourceLines[i];
      if (src) setReveal(src, part++);
      setReveal(cues[i], part);
      cues[i].querySelector(".cue-text")!.textContent = ctx.t(i === flat.length - 1 ? "ui.engine.last-cue" : "ui.engine.next-cue");
      // a lens or language change updates the words in place: the page already shown must not replay
      if (steps[i].classList.contains("reveal")) steps[i].classList.add("reveal-done");
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

  /** `show` is false only for the silent first activation at mount: page 1 is below the cover,
   *  so its entrance waits until the reader scrolls to it. */
  function activate(i: number, show = true): void {
    const { story, scene, beat } = flat[i];
    steps.forEach((s, j) => {
      s.classList.toggle("is-active", j === i);
      if (j !== i) s.classList.remove("reveal", "reveal-done"); // leaving a page: it will enter again next time
      else if (show) s.classList.add("reveal"); // already active: no change, so no replay
    });
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
    if (!el.isConnected) return;
    updateStageHidden();
    updateCoverFlag();
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  updateStageHidden();
  updateCoverFlag();

  if (steps.length === 0) return;
  makeScroller()
    .setup({ step: steps, offset: 0.6 })
    .onStepEnter(({ index }) => activate(index)); // both directions: scrolling up restores that beat
  activate(0, false);
}

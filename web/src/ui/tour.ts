// Intro walkthrough: a short guided tour that shows where everything on the page is
// and how the parts fit (story, picture, page dots, chapters, lenses, stories, sliders).
// It opens from a button on the cover and once by itself on a first visit.
// Generated with Claude, SI-assisted.
import type { Ctx } from "../contract";
import { h } from "./dom";
import "./tour.css";

export interface TourStop {
  id: "story" | "picture" | "pages" | "chapters" | "lenses" | "stories" | "skip";
  /** the lit area is the union of every match that is on screen */
  targets: string[];
}

/** The stops, in reading order. A stop whose targets are not on the page is left out. */
export const TOUR_STOPS: readonly TourStop[] = [
  { id: "story", targets: [".cover-title", ".cover-lead", ".cover-audience", ".cover-explore", ".cover-cue"] },
  { id: "picture", targets: ["#stage"] },
  { id: "pages", targets: [".page-dots"] },
  { id: "chapters", targets: ["#chrome .rail"] },
  { id: "lenses", targets: ["#chrome .lens-switch"] },
  { id: "stories", targets: ["#chrome .stories-open"] },
  { id: "skip", targets: ["#chrome .skip-moon"] },
];

const SEEN_KEY = "firebreak.tour.seen";
const PAD = 8; // air around the lit area
const GAP = 14; // between the lit area and the card
const EDGE = 12; // the card never touches the window edge

interface Box { left: number; top: number; right: number; bottom: number }

export interface TourOptions {
  /** injectable for tests: jsdom reports every box as zero */
  rectOf?: (el: Element) => Box;
  /** start by itself on a first visit (default true) */
  auto?: boolean;
}

export interface Tour {
  start(from?: HTMLElement): void;
  close(): void;
  /** the "How this page works" button, placed on the cover when the cover exists */
  openButton: HTMLButtonElement;
}

/** Where the card goes for a lit box: under it, above it, beside it, or inside a very large one. Pure. */
export function placeCard(r: Box, card: { w: number; h: number }, view: { w: number; h: number }): { x: number; y: number } {
  let x = r.left;
  let y: number;
  if (r.bottom + GAP + card.h <= view.h) y = r.bottom + GAP;
  else if (r.top - GAP - card.h >= 0) y = r.top - GAP - card.h;
  else if (r.right + GAP + card.w <= view.w) { x = r.right + GAP; y = r.top; }
  else if (r.left - GAP - card.w >= 0) { x = r.left - GAP - card.w; y = r.top; }
  else { x = r.left + (r.right - r.left - card.w) / 2; y = r.top + (r.bottom - r.top - card.h) / 2; }
  const clamp = (v: number, max: number): number => Math.min(Math.max(v, EDGE), Math.max(EDGE, max));
  return { x: clamp(x, view.w - card.w - EDGE), y: clamp(y, view.h - card.h - EDGE) };
}

export function mountTour(ctx: Ctx, opts: TourOptions = {}): Tour {
  const { store, t } = ctx;
  const rectOf = opts.rectOf ?? ((el: Element): Box => el.getBoundingClientRect());

  const spot = h("div", { class: "tour-spot", "aria-hidden": "true" });
  const title = h("h2", { class: "tour-title", id: "tour-title" });
  const text = h("p", { class: "tour-text" });
  const count = h("p", { class: "tour-count", "data-own": true });
  const skipBtn = h("button", { type: "button", class: "tour-btn tour-skip" });
  const backBtn = h("button", { type: "button", class: "tour-btn tour-back" });
  const nextBtn = h("button", { type: "button", class: "tour-btn tour-next" });
  const card = h("div", { class: "tour-card", role: "dialog", "aria-modal": "true", "aria-labelledby": "tour-title" },
    count, title, text, h("div", { class: "tour-actions" }, skipBtn, backBtn, nextBtn));
  const root = h("div", { class: "tour", hidden: true }, spot, card);
  document.body.append(root);
  const openButton = h("button", { type: "button", class: "btn tour-open" });

  let stops: TourStop[] = [];
  let at = 0;
  let opener: HTMLElement | null = null;

  /** The union of the stop's targets that are on screen, or null when none is. */
  function boxOf(stop: TourStop): Box | null {
    let box: Box | null = null;
    for (const sel of stop.targets) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const r = rectOf(el);
      if (r.right - r.left <= 0 || r.bottom - r.top <= 0) continue;
      box = box
        ? { left: Math.min(box.left, r.left), top: Math.min(box.top, r.top), right: Math.max(box.right, r.right), bottom: Math.max(box.bottom, r.bottom) }
        : { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    }
    return box;
  }

  function labels(): void {
    openButton.textContent = t("ui.tour.open");
    card.setAttribute("aria-label", t("ui.tour.label"));
    skipBtn.textContent = t("ui.tour.skip");
    backBtn.textContent = t("ui.tour.back");
  }

  function show(): void {
    const stop = stops[at];
    const box = stop ? boxOf(stop) : null;
    if (!stop || !box) return close();
    const lit = { left: box.left - PAD, top: box.top - PAD, right: box.right + PAD, bottom: box.bottom + PAD };
    spot.style.left = `${lit.left}px`;
    spot.style.top = `${lit.top}px`;
    spot.style.width = `${lit.right - lit.left}px`;
    spot.style.height = `${lit.bottom - lit.top}px`;
    title.textContent = t(`ui.tour.${stop.id}.title`);
    text.textContent = t(`ui.tour.${stop.id}.text`, {
      public: t("ui.chrome.lens.public"),
      astronaut: t("ui.chrome.lens.astronaut"),
      analyst: t("ui.chrome.lens.analyst"),
    });
    count.textContent = t("ui.tour.count", { n: at + 1, total: stops.length });
    backBtn.hidden = at === 0;
    nextBtn.textContent = t(at === stops.length - 1 ? "ui.tour.done" : "ui.tour.next");
    const pos = placeCard(lit, { w: card.offsetWidth || 360, h: card.offsetHeight || 220 }, { w: window.innerWidth, h: window.innerHeight });
    card.style.left = `${pos.x}px`;
    card.style.top = `${pos.y}px`;
    // replay the short fade for the new stop (opacity only; tour.css turns it off under reduced motion)
    root.classList.remove("tour-step");
    void root.offsetWidth;
    root.classList.add("tour-step");
    nextBtn.focus({ preventScroll: true });
  }

  function onKey(e: KeyboardEvent): void {
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); back(); }
    else if (e.key === "Tab") {
      // keep the keyboard inside the card while the tour is open
      const order = [skipBtn, backBtn, nextBtn].filter((b) => !b.hidden);
      const i = order.indexOf(document.activeElement as HTMLButtonElement);
      e.preventDefault();
      order[(i + (e.shiftKey ? order.length - 1 : 1)) % order.length]!.focus();
    }
  }

  function next(): void {
    if (at >= stops.length - 1) return close();
    at++;
    show();
  }

  function back(): void {
    if (at === 0) return;
    at--;
    show();
  }

  function start(from?: HTMLElement): void {
    // the tour describes the first screen, so it always runs from the top of the page
    if (typeof window.scrollTo === "function") window.scrollTo({ top: 0, behavior: "auto" });
    stops = TOUR_STOPS.filter((s) => boxOf(s) != null);
    if (!stops.length) return;
    opener = from ?? null;
    at = 0;
    labels();
    root.hidden = false;
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", show);
    show();
  }

  function close(): void {
    if (root.hidden) return;
    root.hidden = true;
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", show);
    try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* private mode: the tour just opens again next time */ }
    opener?.focus({ preventScroll: true });
  }

  skipBtn.addEventListener("click", close);
  backBtn.addEventListener("click", back);
  nextBtn.addEventListener("click", next);
  openButton.addEventListener("click", () => start(openButton));
  labels();
  store.subscribe((s, prev) => {
    if (s.locale === prev.locale) return;
    labels();
    if (!root.hidden) show();
  });

  // The cover is drawn by the story engine, which mounts right after the UI:
  // once it exists, the button sits under the cover's own button.
  let tries = 0;
  const place = (): void => {
    const anchor = document.querySelector(".cover-explore");
    if (anchor) anchor.insertAdjacentElement("afterend", openButton);
    else if (++tries < 40) setTimeout(place, 100); // the cover may be drawn a little later
  };
  setTimeout(() => {
    place();
    if (opts.auto === false) return;
    let seen = false;
    try { seen = localStorage.getItem(SEEN_KEY) === "1"; } catch { /* no storage: show it */ }
    // a first visit that is still on the cover gets the tour once, after the cover has drawn
    if (!seen) setTimeout(() => { if (window.scrollY < 40 && root.hidden) start(openButton); }, 900);
  }, 0);

  return { start, close, openButton };
}

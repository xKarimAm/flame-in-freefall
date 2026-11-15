// @vitest-environment jsdom
// Generated with Claude, SI-assisted.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import type { Ctx } from "../contract";
import { createStore } from "../store";
import { mountTour, placeCard, TOUR_STOPS } from "./tour";

const here = dirname(fileURLToPath(import.meta.url));
const en = JSON.parse(readFileSync(join(here, "../i18n/en.json"), "utf8")) as Record<string, string>;

function ctx(): Ctx {
  const store = createStore();
  const t = (key: string, vars: Record<string, string | number> = {}): string =>
    (en[key] ?? key).replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
  return { api: {} as Ctx["api"], store, dicts: { en }, t };
}

/** A page with the header parts and the stage, but no cover and no page dots. */
function page(): void {
  document.body.innerHTML =
    '<header id="chrome"><nav class="rail"></nav><div class="lens-switch"></div>' +
    '<button class="stories-open"></button><button class="skip-moon"></button></header><div id="stage"></div>';
}

// jsdom has no layout: every element that exists gets the same real-looking box
const rectOf = (): { left: number; top: number; right: number; bottom: number } => ({ left: 100, top: 100, right: 300, bottom: 160 });
const q = (sel: string): HTMLElement => document.querySelector<HTMLElement>(sel)!;

describe("intro walkthrough", () => {
  beforeEach(() => {
    page();
    localStorage.clear();
    window.scrollTo = () => {};
  });

  it("has a title and a text in en.json for every stop", () => {
    for (const stop of TOUR_STOPS) {
      expect(en[`ui.tour.${stop.id}.title`], stop.id).toBeTruthy();
      expect(en[`ui.tour.${stop.id}.text`], stop.id).toBeTruthy();
    }
  });

  it("walks only the stops that are on the page, in order, and closes after the last one", () => {
    const tour = mountTour(ctx(), { rectOf, auto: false });
    tour.start();
    expect(q(".tour").hidden).toBe(false);
    // story (cover) and pages (dots) are not on this page: five stops remain, the first is the picture
    expect(q(".tour-title").textContent).toBe(en["ui.tour.picture.title"]);
    expect(q(".tour-count").textContent).toBe("1 of 5");
    expect(q(".tour-back").hidden).toBe(true);
    const seen = [q(".tour-title").textContent];
    for (let i = 0; i < 4; i++) {
      q(".tour-next").click();
      seen.push(q(".tour-title").textContent);
    }
    expect(seen).toEqual(["picture", "chapters", "lenses", "stories", "skip"].map((id) => en[`ui.tour.${id}.title`]));
    expect(q(".tour-next").textContent).toBe(en["ui.tour.done"]);
    q(".tour-next").click();
    expect(q(".tour").hidden).toBe(true);
    expect(localStorage.getItem("firebreak.tour.seen")).toBe("1");
  });

  it("goes back, and the lens stop names the three lenses as the header does", () => {
    const tour = mountTour(ctx(), { rectOf, auto: false });
    tour.start();
    q(".tour-next").click();
    q(".tour-next").click();
    const lensText = q(".tour-text").textContent ?? "";
    for (const lens of ["public", "astronaut", "analyst"]) expect(lensText).toContain(en[`ui.chrome.lens.${lens}`]);
    expect(lensText).not.toMatch(/\{\w+\}/);
    q(".tour-back").click();
    expect(q(".tour-title").textContent).toBe(en["ui.tour.chapters.title"]);
  });

  it("Escape closes it and gives focus back to the button that opened it", () => {
    const tour = mountTour(ctx(), { rectOf, auto: false });
    document.body.append(tour.openButton);
    tour.openButton.click();
    expect(q(".tour").hidden).toBe(false);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(q(".tour").hidden).toBe(true);
    expect(document.activeElement).toBe(tour.openButton);
  });

  it("does not open when nothing it describes is on the page", () => {
    document.body.innerHTML = "";
    const tour = mountTour(ctx(), { rectOf, auto: false });
    tour.start();
    expect(q(".tour").hidden).toBe(true);
  });

  it("places the card under a small target, beside a tall one, and always inside the window", () => {
    const view = { w: 1280, h: 720 };
    const card = { w: 380, h: 220 };
    // a header button: 14 px under it, same left edge
    expect(placeCard({ left: 900, top: 10, right: 1000, bottom: 50 }, card, view)).toEqual({ x: 888, y: 64 });
    // the stage (right 60 %, full height): no room under or above or right, so the card goes to its left
    expect(placeCard({ left: 512, top: 60, right: 1280, bottom: 720 }, card, view)).toEqual({ x: 118, y: 60 });
    // a target as large as the window: the card sits inside it, clear of the edges
    const inside = placeCard({ left: 0, top: 0, right: 1280, bottom: 720 }, card, view);
    expect(inside.x).toBeGreaterThanOrEqual(12);
    expect(inside.x + card.w).toBeLessThanOrEqual(view.w - 12);
    expect(inside.y + card.h).toBeLessThanOrEqual(view.h - 12);
  });

  it("stops every animation under reduced motion", () => {
    const css = readFileSync(join(here, "tour.css"), "utf8");
    expect(css).toMatch(/prefers-reduced-motion: reduce[^}]*\{[^}]*animation: none/s);
  });
});

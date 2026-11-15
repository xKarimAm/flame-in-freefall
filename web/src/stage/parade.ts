// Generated with Muse Spark, SI-assisted.
// Public-lens picture for act 2: the family parade. One flat pictogram and plain-word name per
// family in show_families order, each with its plotted count from the data API (families with no
// pressure recorded show their listed count instead: their tests line up along the dial in the
// no-pressure strip, never as dots). The counter counts up to the shown plotted count, which is
// the real plotted total once every family has arrived. Flat colour from tokens only, never yellow.
import type { Ctx, Family } from "../contract";
import { FAMILIES } from "../contract";
import { dataLink } from "../ui/dom";

const SVG_NS = "http://www.w3.org/2000/svg";

const INK = "var(--ink-dark)";

/** One flat pictogram per family: droplet, gas flame, duct, sheet, smoke, ground. Decorative. */
function pictogram(family: Family): SVGElement {
  const n = document.createElementNS(SVG_NS, "svg");
  n.setAttribute("viewBox", "0 0 28 28");
  n.setAttribute("aria-hidden", "true");
  const el = (tag: string, attrs: Record<string, string | number>): SVGElement => {
    const e = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    n.append(e);
    return e as SVGElement;
  };
  switch (family) {
    case "droplets":
      el("path", { d: "M14 3 C14 3 6 14 6 19 a8 8 0 0 0 16 0 C22 14 14 3 14 3 Z", fill: INK });
      break;
    case "gas jets":
      el("path", { d: "M14 2 C17 8 22 11 22 18 a8 9 0 1 1 -16 0 C6 11 11 8 14 2 Z", fill: INK });
      break;
    case "solids in flow duct":
      el("rect", { x: 3, y: 9, width: 22, height: 10, fill: "none", stroke: INK, "stroke-width": 2 });
      el("line", { x1: 6, y1: 14, x2: 22, y2: 14, stroke: INK, "stroke-width": 2 });
      break;
    case "large-scale solids":
      el("rect", { x: 6, y: 6, width: 16, height: 16, fill: INK });
      break;
    case "smoke detection":
      el("circle", { cx: 9, cy: 20, r: 3, fill: INK });
      el("circle", { cx: 14, cy: 14, r: 4, fill: INK });
      el("circle", { cx: 19, cy: 7, r: 3, fill: INK });
      break;
    case "ground/modeling":
      el("path", { d: "M4 22 L14 6 L24 22 Z", fill: INK });
      break;
  }
  return n as SVGElement;
}

/** The parade belongs on Public-lens evidence pages that grow the family set: act 2, not the Moon box. */
export function paradeActive(ctx: Ctx): boolean {
  const s = ctx.store.get();
  return (
    s.lens === "public" &&
    s.stage.view === "micro-g" &&
    s.stage.coverage === true &&
    !s.stage.reference &&
    !s.stage.sliders
  );
}

/** Counts the number up over 600 ms; still and complete under reduced motion. */
export function countUp(num: HTMLElement, target: number): void {
  const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  num.dataset["count"] = String(target);
  if (reduced || target <= 0) {
    num.textContent = String(target);
    return;
  }
  const start = performance.now();
  const dur = 600;
  const step = (): void => {
    // performance.now, not the frame timestamp: the two clocks can disagree, which counted backwards
    const k = Math.min(1, Math.max(0, (performance.now() - start) / dur));
    num.textContent = String(Math.round(target * (1 - Math.pow(1 - k, 3))));
    if (k < 1) requestAnimationFrame(step);
  };
  num.textContent = "0";
  requestAnimationFrame(step);
}

/** Renders the parade into el; hides el when the parade does not belong on this page. */
export function renderParade(el: HTMLElement, ctx: Ctx): void {
  const { api, store, t } = ctx;
  if (!paradeActive(ctx)) {
    el.hidden = true;
    el.replaceChildren();
    return;
  }
  el.hidden = false;
  const shown = store.get().stage.show_families ?? [];
  const placed = api.placed();
  const frag = document.createDocumentFragment();
  const head = document.createElement("p");
  head.className = "parade-count";
  head.setAttribute("aria-live", "off");
  const num = dataLink("0");
  num.className = "parade-num";
  head.append(num, ` ${t("ui.stage.parade.dots-label")}`);
  const target = placed.filter((p) => (shown as Family[]).includes(p.family)).length;
  frag.append(head);
  const list = document.createElement("ul");
  list.className = "parade-families";
  for (const family of FAMILIES.filter((f) => (shown as Family[]).includes(f))) {
    const li = document.createElement("li");
    li.append(pictogram(family));
    const name = document.createElement("span");
    name.className = "parade-name";
    name.textContent = t(`ui.family.${family}`);
    li.append(name);
    const n = placed.filter((p) => p.family === family).length;
    const count = n > 0
      ? dataLink(t("ui.stage.parade.plotted", { n }))
      : dataLink(t("ui.stage.parade.listed", { n: api.notPlaced(family).length }));
    count.className = "parade-n";
    li.append(count);
    list.append(li);
  }
  frag.append(list);
  el.replaceChildren(frag);
  countUp(num, target);
}

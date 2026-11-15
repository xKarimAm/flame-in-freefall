// Motion helpers for R8 (motion and softness pass): one ease-out curve, a once-only
// count-up for the dashboard numbers, and keyed reordering that slides ranking rows
// to their new places without rebuilding them. transform and opacity only; every
// transition and animation in motion.css stops under prefers-reduced-motion.
// Generated with Muse Spark, SI-assisted.

/** The single ease-out curve for the whole page (R8). */
export const MOTION_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/** True when the visitor asked for reduced motion (or the query matches in tests). */
export function prefersReduced(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Count from zero to `value` once, writing plain text. Under reduced motion (or
 * without animation frames, as in tests) the value lands immediately. A second
 * call on the same element is a no-op, so scrolling back never replays the count.
 */
export function countUp(el: HTMLElement, value: number): void {
  if (el.dataset["counted"] === "true") return;
  el.dataset["counted"] = "true";
  const underTest = typeof process !== "undefined" && process.env["VITEST"] === "true";
  if (prefersReduced() || typeof requestAnimationFrame !== "function" || underTest) {
    el.textContent = String(value);
    return;
  }
  const dur = 500;
  const t0 = performance.now();
  const step = (now: number): void => {
    const k = Math.min(1, (now - t0) / dur);
    el.textContent = String(Math.round(value * (1 - (1 - k) ** 3)));
    if (k < 1 && el.dataset["counted"] === "true") requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/**
 * Start every `[data-count-to]` number inside `root` the first time it scrolls
 * into view. Elements already visible start at once; without an observer they
 * also start at once, so nothing stays at zero when the script partly fails.
 */
export function observeCounts(root: ParentNode = document): void {
  const els = [...root.querySelectorAll<HTMLElement>("[data-count-to]")];
  if (!els.length) return;
  const start = (el: HTMLElement): void => {
    const v = Number(el.dataset["countTo"]);
    if (Number.isFinite(v)) countUp(el, v);
  };
  if (typeof IntersectionObserver !== "function" || prefersReduced()) {
    els.forEach(start);
    return;
  }
  const seen = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      start(e.target as HTMLElement);
      seen.unobserve(e.target);
    }
  });
  els.forEach((el) => seen.observe(el));
}

/**
 * Move the children of `container` into `order` (their `data-key` values) by
 * re-appending the existing nodes: appending a node moves it, so the same DOM
 * nodes survive the reorder and CSS can slide each row to its new place. Keys
 * in `order` with no node are skipped; nodes whose key is missing from `order`
 * keep their relative place at the end.
 */
export function reorderKeyed(container: HTMLElement, order: string[], keyAttr = "data-key"): void {
  const byKey = new Map<string, Element>();
  for (const child of container.children) {
    const k = child.getAttribute(keyAttr);
    if (k !== null) byKey.set(k, child);
  }
  for (const key of order) {
    const node = byKey.get(key);
    if (node) container.append(node);
  }
}

/**
 * Rebuild a keyed list in a new order without destroying its rows: existing
 * rows keep their DOM nodes (so the ranking keeps selection and state) and
 * slide to their new places, new rows are built, and `update` refreshes the
 * numbers inside a reused row. Missing rows are dropped.
 */
export function patchKeyedList<T>(
  container: HTMLElement,
  items: T[],
  keyOf: (item: T) => string,
  build: (item: T) => HTMLElement,
  update?: (node: HTMLElement, item: T) => void,
): void {
  const byKey = new Map<string, HTMLElement>();
  for (const child of container.children) {
    if (child instanceof HTMLElement) {
      const k = child.getAttribute("data-key");
      if (k !== null) byKey.set(k, child);
    }
  }
  container.replaceChildren();
  for (const item of items) {
    const key = keyOf(item);
    const kept = byKey.get(key);
    if (kept) {
      update?.(kept, item);
      container.append(kept);
    } else {
      const fresh = build(item);
      fresh.setAttribute("data-key", key);
      container.append(fresh);
    }
  }
}

/**
 * Slide reordered children to their new places (FLIP): measure first, reorder
 * with `reorderKeyed`, then play the difference as a transform that settles
 * through the row's own transition. Without layout (tests) or under reduced
 * motion this is just the reorder.
 */
/**
 * Run `mutate` (a reorder that keeps DOM nodes) and slide every moved child
 * from its old place to its new one through its own transform transition.
 * Without layout (tests) or under reduced motion this is just the mutation.
 */
export function flipAround(container: HTMLElement, mutate: () => void): void {
  if (prefersReduced() || typeof container.getBoundingClientRect !== "function") {
    mutate();
    return;
  }
  const first = new Map<Element, number>();
  for (const child of container.children) first.set(child, (child as HTMLElement).getBoundingClientRect().top);
  mutate();
  for (const child of container.children) {
    const y0 = first.get(child);
    if (y0 === undefined || !(child instanceof HTMLElement)) continue;
    const dy = y0 - child.getBoundingClientRect().top;
    if (!dy) continue;
    child.style.transform = `translateY(${dy}px)`;
    requestAnimationFrame(() => {
      child.style.transform = "";
    });
  }
}

export function slideReorder(container: HTMLElement, order: string[], keyAttr = "data-key"): void {
  flipAround(container, () => reorderKeyed(container, order, keyAttr));
}

/**
 * Chapters announce themselves once scrolled into view (`.chapter.is-seen`),
 * so their titles slide in from the left. One observer for the whole story.
 */
export function observeEnter(root: ParentNode = document): void {
  const chapters = [...root.querySelectorAll<HTMLElement>(".chapter:not(.is-seen)")];
  if (!chapters.length || typeof IntersectionObserver !== "function") return;
  const seen = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      (e.target as HTMLElement).classList.add("is-seen");
      seen.unobserve(e.target);
    }
  });
  chapters.forEach((c) => seen.observe(c));
}

/**
 * The flame reacts when the visitor touches air: a dial drag or a slider move
 * adds a short pop to the flame guide. Pointer moves paint synchronously (no
 * lag); the pop settles through the guide's own transition.
 */
export function observeFlame(root: ParentNode = document): void {
  const doc = root.ownerDocument ?? (root as Document);
  const pop = (): void => {
    if (prefersReduced()) return;
    for (const g of root.querySelectorAll(".flame-guide")) {
      g.classList.remove("flame-pulse");
      void (g as HTMLElement).offsetWidth;
      g.classList.add("flame-pulse");
      window.setTimeout(() => g.classList.remove("flame-pulse"), 500);
    }
  };
  let armed = false;
  doc.addEventListener("pointermove", (e) => {
    const t = e.target as Element | null;
    if (t?.closest?.(".o2-dial")) {
      if (!armed) {
        armed = true;
        pop();
        window.setTimeout(() => (armed = false), 600);
      }
    }
  });
  doc.addEventListener("input", (e) => {
    const t = e.target as Element | null;
    if (t?.closest?.(".slider input")) pop();
  });
}

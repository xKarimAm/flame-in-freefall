// Stories overlay: one card per story section the engine rendered, plus the experiment library.
// Generated with Muse Spark, SI-assisted.
import type { Ctx } from "../contract";
import { OPEN_LIBRARY_EVENT } from "../engine/index";
import { stories } from "../engine/stories";
import { h, prefersReducedMotion } from "./dom";
import { loadLibrary, renderLibraryList, renderLibraryPage, shelfOrder, type LibraryMoment, type LibraryStory } from "./library";

export function mountOverlay(
  root: HTMLElement,
  ctx: Ctx,
  load: () => Promise<{ stories: LibraryStory[]; moments: LibraryMoment[] }> = loadLibrary,
): { open(opener: HTMLElement): void; openLibrary(opener: HTMLElement): void } {
  const { t } = ctx;
  let opener: HTMLElement | null = null;
  let lib: Promise<{ stories: LibraryStory[]; moments: LibraryMoment[] }> | null = null;
  let opened = 0; // guards the async library load against close/reopen
  // the engine's ending card opens the library without importing it (see web/src/engine/index.ts)
  window.addEventListener("firebreak:open-overlay", (e) => open((e as CustomEvent<HTMLElement>).detail ?? root));
  window.addEventListener(OPEN_LIBRARY_EVENT, (e) => void openLibrary((e as CustomEvent<HTMLElement>).detail ?? root));

  function close(): void {
    opened++;
    root.hidden = true;
    document.removeEventListener("keydown", onKey);
    opener?.focus({ preventScroll: true });
  }
  function onKey(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      close();
      return;
    }
    // focus trap: Tab never leaves the modal while it is open
    if (e.key !== "Tab" || root.hidden) return;
    const items = [
      ...root.querySelectorAll<HTMLElement>(".overlay-inner button:not(:disabled), .overlay-inner a[href], .overlay-inner input"),
    ].filter((el) => !el.hidden && !el.closest("[hidden]"));
    if (!items.length) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && (active === first || !root.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /** What a story card matches: titles, families, and the investigations it cites (titles, acronyms, fuels). */
  function haystack(sec: HTMLElement): string {
    const id = sec.dataset.story ?? "";
    const bits = [id, sec.dataset.title ?? ""];
    const story = stories.find((s) => s.id === id);
    if (story) {
      const qKey = story.title_key.replace(/\.title$/, ".question");
      const q = t(qKey);
      if (q !== qKey) bits.push(q);
    }
    for (const scene of story?.scenes ?? []) {
      for (const beat of scene.beats) {
        for (const f of beat.stage.show_families ?? []) bits.push(f, t(`ui.family.${f}`));
        for (const s of beat.sources) {
          bits.push(s.label);
          const m = s.url.match(/investigations\/(PSI-\d+)/);
          const e = m ? ctx.api.experiment(m[1]) : null;
          if (e) {
            bits.push(e.id, e.acronym, e.title, e.family);
            for (const row of ctx.api.data.tests) if (row.investigation === e.id && row.fuel) bits.push(row.fuel);
          }
        }
      }
    }
    return bits.join(" ").toLowerCase();
  }

  /** The overlay shell; show() filters whichever cards are in the body and counts them for the mode. */
  function shell(): { body: HTMLElement; show: (q: string) => void; mark: number } {
    const mark = ++opened;
    const closeBtn = h("button", { type: "button", class: "btn overlay-close" }, t("ui.overlay.close"));
    closeBtn.addEventListener("click", close);
    const search = h("input", { type: "search", id: "overlay-search", "aria-label": t("ui.search.label") }) as HTMLInputElement;
    const count = h("p", { class: "overlay-count", "data-own": true }, "");
    const body = h("div", { class: "overlay-body" });
    const show = (q: string): void => {
      const needles = q.trim().toLowerCase();
      let n = 0;
      let total = 0;
      // with experiment stories on the page the count line counts those; chapter cards are still filtered
      const libOnly = body.querySelector(".library-card") != null;
      for (const card of [...body.querySelectorAll<HTMLElement>("[data-hay]")]) {
        const hit = !needles || (card.dataset.hay ?? "").includes(needles);
        card.hidden = !hit;
        if (libOnly && !card.classList.contains("library-card")) continue;
        total++;
        if (hit) n++;
      }
      // a family heading goes with its cards: no visible card, no heading
      for (const g of body.querySelectorAll<HTMLElement>(".lib-group")) g.hidden = !g.querySelector(".library-card:not([hidden])");
      count.textContent =
        body.querySelector(".library-card") != null
          ? t("ui.library.count", { shown: n, total })
          : t("ui.overlay.count", { shown: n, total });
    };
    search.addEventListener("input", () => show(search.value));
    root.replaceChildren(
      h("div", { class: "overlay-inner", role: "dialog", "aria-modal": "true", "aria-labelledby": "overlay-title" },
        h("div", { class: "overlay-head" }, h("h2", { id: "overlay-title" }, t("ui.overlay.title")), closeBtn),
        search,
        count,
        body,
      ),
    );
    root.hidden = false;
    document.addEventListener("keydown", onKey);
    closeBtn.focus();
    return { body, show, mark };
  }

  function renderStories(): void {
    const sections = [...document.querySelectorAll<HTMLElement>("section[data-story]")];
    const { body, show, mark } = shell();
    const cards = sections.map((sec) => {
      const card = h(
        "button",
        { type: "button", class: "story-card" },
        h("span", { class: "story-num", "aria-hidden": "true" }, sec.dataset.act ?? ""),
        h("span", { class: "story-act" }, t("ui.engine.act", { n: sec.dataset.act ?? "" })),
        h("span", { class: "overlay-story-title" }, sec.dataset.title ?? sec.dataset.story ?? ""),
      );
      card.addEventListener("click", () => {
        close();
        sec.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
      });
      card.dataset.hay = haystack(sec);
      return card;
    });
    const libBtn = h("button", { type: "button", class: "btn library-open" }, t("ui.ending.library"));
    libBtn.addEventListener("click", () => void renderLibrary());
    body.append(h("div", { class: "story-cards" }, ...cards));
    body.append(cards.length ? libBtn : h("p", {}, t("ui.overlay.empty")));
    show("");
    // The experiment stories load right under the chapters, so nobody has to find a second button.
    // If they cannot load, the button stays as the way in.
    if (!cards.length) return;
    if (!lib) lib = load();
    void lib.then(
      (data) => {
        if (mark !== opened) return;
        libBtn.replaceWith(h("h3", { class: "library-title" }, t("ui.library.title")), renderLibraryList(data.stories, ctx, pageOpener(data)));
        show(root.querySelector<HTMLInputElement>("#overlay-search")?.value ?? "");
      },
      () => { lib = null; },
    );
  }

  async function renderLibrary(): Promise<void> {
    const { body, show, mark } = shell();
    body.replaceChildren(h("p", {}, t("ui.loading")));
    if (!lib) lib = load();
    let data: { stories: LibraryStory[]; moments: LibraryMoment[] };
    try {
      data = await lib;
    } catch {
      // a rejected fetch must not stick: the next open tries again
      lib = null;
      if (mark !== opened) return;
      body.replaceChildren(h("p", {}, t("ui.load-error")));
      return;
    }
    if (mark !== opened) return;
    const back = h("button", { type: "button", class: "btn library-back" }, t("ui.library.stories"));
    back.addEventListener("click", renderStories);
    body.replaceChildren(
      h("h3", { class: "library-title" }, t("ui.library.title")),
      renderLibraryList(data.stories, ctx, pageOpener(data)),
      back,
    );
    show("");
  }

  function pageOpener(data: { stories: LibraryStory[]; moments: LibraryMoment[] }): (id: string) => void {
    const order = shelfOrder(data.stories, ctx);
    return (id) => {
      const at = order.findIndex((s) => s.id === id);
      if (at >= 0) renderPage(order, at, data.moments);
    };
  }

  function renderPage(order: LibraryStory[], at: number, moments: LibraryMoment[]): void {
    const story = order[at]!;
    const { body } = shell();
    const back = h("button", { type: "button", class: "btn library-back" }, t("ui.library.back"));
    back.addEventListener("click", () => void renderLibrary());
    // the search box and count line stay in the shell but hidden: a page is one story, nothing to filter
    root.querySelector<HTMLInputElement>("#overlay-search")!.hidden = true;
    root.querySelector(".overlay-count")!.textContent = "";
    // a bad moment id must not blank the dialog: say so in plain words, keeping the way back
    let page: HTMLElement;
    try {
      page = renderLibraryPage(story, moments, ctx);
    } catch {
      page = h("p", {}, t("ui.library.unavailable"));
    }
    // previous and next walk the shelf order and stop at its ends
    const step = (to: number, key: string): HTMLButtonElement => {
      const other = order[to];
      const b = h("button", { type: "button", class: "btn" }, t(key));
      if (!other) {
        b.disabled = true;
        return b;
      }
      b.append(h("span", { class: "lib-pager-title", "data-own": true }, other.title));
      b.addEventListener("click", () => renderPage(order, to, moments));
      return b;
    };
    const prev = step(at - 1, "ui.library.prev");
    prev.classList.add("lib-prev");
    const next = step(at + 1, "ui.library.next");
    next.classList.add("lib-next");
    const pager = h("nav", { class: "lib-pager", "aria-label": t("ui.library.pager-label") }, prev, next);
    body.append(back, page, pager);
    // opening a page moves focus to its heading, so a screen reader starts at the story
    root.scrollTop = 0;
    const heading = page.querySelector<HTMLElement>(".lib-title");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    } else back.focus();
  }

  function open(from: HTMLElement): void {
    opener = from;
    renderStories();
  }

  async function openLibrary(from: HTMLElement): Promise<void> {
    opener = from;
    await renderLibrary();
  }

  return { open, openLibrary };
}

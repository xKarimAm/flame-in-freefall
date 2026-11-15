// Stories overlay: one card per story section the engine rendered. Generated with Claude, SI-assisted.
import type { Ctx } from "../contract";
import { stories } from "../engine/stories";
import { h, prefersReducedMotion } from "./dom";

export function mountOverlay(root: HTMLElement, ctx: Ctx): { open(opener: HTMLElement): void } {
  const { t } = ctx;
  let opener: HTMLElement | null = null;
  // the engine's ending card opens the overlay without importing it (see web/src/engine/index.ts)
  window.addEventListener("firebreak:open-overlay", (e) => open((e as CustomEvent<HTMLElement>).detail ?? root));

  function close(): void {
    root.hidden = true;
    document.removeEventListener("keydown", onKey);
    opener?.focus({ preventScroll: true });
  }
  function onKey(e: KeyboardEvent): void {
    if (e.key === "Escape") close();
  }

  /** What a story card matches: titles, families, and the investigations it cites (titles, acronyms, fuels). */
  function haystack(sec: HTMLElement): string {
    const id = sec.dataset.story ?? "";
    const bits = [id, sec.dataset.title ?? ""];
    const story = stories.find((s) => s.id === id);
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

  function open(from: HTMLElement): void {
    opener = from;
    const sections = [...document.querySelectorAll<HTMLElement>("section[data-story]")];
    const closeBtn = h("button", { type: "button", class: "btn overlay-close" }, t("ui.overlay.close"));
    closeBtn.addEventListener("click", close);
    const search = h("input", { type: "search", id: "overlay-search", "aria-label": t("ui.search.label") });
    const count = h("p", { class: "overlay-count", "data-own": true }, "");
    const list = h("div", { class: "story-cards" });
    const show = (q: string): void => {
      const needles = q.trim().toLowerCase();
      let n = 0;
      for (const card of [...list.querySelectorAll<HTMLElement>(".story-card")]) {
        const hit = !needles || (card.dataset.hay ?? "").includes(needles);
        card.hidden = !hit;
        if (hit) n++;
      }
      count.textContent = t("ui.overlay.count", { shown: n, total: sections.length });
    };
    search.addEventListener("input", () => show(search.value));
    const cards = sections.map((sec) => {
      const card = h(
        "button",
        { type: "button", class: "story-card" },
        h("span", { class: "story-num", "aria-hidden": "true" }, sec.dataset.act ?? ""),
        h("span", { class: "story-act" }, t("ui.engine.act", { n: sec.dataset.act ?? "" })),
        h("span", { class: "story-title" }, sec.dataset.title ?? sec.dataset.story ?? ""),
      );
      card.addEventListener("click", () => {
        close();
        sec.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
      });
      card.dataset.hay = haystack(sec);
      return card;
    });
    list.append(...cards);
    show("");
    root.replaceChildren(
      h("div", { class: "overlay-inner", role: "dialog", "aria-modal": "true", "aria-labelledby": "overlay-title" },
        h("div", { class: "overlay-head" }, h("h2", { id: "overlay-title" }, t("ui.overlay.title")), closeBtn),
        search,
        count,
        cards.length ? list : h("p", {}, t("ui.overlay.empty")),
      ),
    );
    root.hidden = false;
    document.addEventListener("keydown", onKey);
    closeBtn.focus();
  }
  return { open };
}

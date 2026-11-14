// Stories overlay: one card per story section the engine rendered. Generated with Claude, SI-assisted.
import type { Ctx } from "../contract";
import { h, prefersReducedMotion } from "./dom";

export function mountOverlay(root: HTMLElement, ctx: Ctx): { open(opener: HTMLElement): void } {
  const { t } = ctx;
  let opener: HTMLElement | null = null;

  function close(): void {
    root.hidden = true;
    document.removeEventListener("keydown", onKey);
    opener?.focus({ preventScroll: true });
  }
  function onKey(e: KeyboardEvent): void {
    if (e.key === "Escape") close();
  }

  function open(from: HTMLElement): void {
    opener = from;
    const sections = [...document.querySelectorAll<HTMLElement>("section[data-story]")];
    const closeBtn = h("button", { type: "button", class: "btn overlay-close" }, t("ui.overlay.close"));
    closeBtn.addEventListener("click", close);
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
      return card;
    });
    root.replaceChildren(
      h("div", { class: "overlay-inner", role: "dialog", "aria-modal": "true", "aria-labelledby": "overlay-title" },
        h("div", { class: "overlay-head" }, h("h2", { id: "overlay-title" }, t("ui.overlay.title")), closeBtn),
        cards.length ? h("div", { class: "story-cards" }, ...cards) : h("p", {}, t("ui.overlay.empty")),
      ),
    );
    root.hidden = false;
    document.addEventListener("keydown", onKey);
    closeBtn.focus();
  }
  return { open };
}

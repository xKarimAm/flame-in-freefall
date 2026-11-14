// Header bar: product name, lens switch, Stories, Skip to Moon air. Generated with Claude, SI-assisted.
import { LENSES, MOON_STORY_ID, type Ctx } from "../contract";
import { h, prefersReducedMotion } from "./dom";

export function mountChrome(root: HTMLElement, ctx: Ctx, openStories: (opener: HTMLElement) => void): void {
  const { store, t } = ctx;
  let lensButtons: [string, HTMLButtonElement][] = [];

  function skip(): void {
    const base = `#story-${MOON_STORY_ID}`;
    const target =
      document.querySelector(`${base} .step[data-sliders="true"]`) ?? document.querySelector(base);
    target?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  function build(): void {
    const stories = h("button", { type: "button", class: "btn" }, t("ui.chrome.stories"));
    stories.addEventListener("click", () => openStories(stories));
    const skipBtn = h("button", { type: "button", class: "btn primary" }, t("ui.chrome.skip"));
    skipBtn.addEventListener("click", skip);
    lensButtons = LENSES.map((lens) => {
      const b = h("button", { type: "button", class: "btn lens", "data-lens": lens }, t(`ui.chrome.lens.${lens}`));
      b.addEventListener("click", () => store.set({ lens }));
      return [lens, b];
    });
    const group = h("div", { class: "lens-switch", role: "group", "aria-label": t("ui.chrome.lens-label") }, ...lensButtons.map(([, b]) => b));
    root.replaceChildren(
      h("div", { class: "chrome-bar" }, h("span", { class: "brand" }, t("ui.chrome.brand")), group, stories, skipBtn),
    );
    sync();
  }

  function sync(): void {
    const lens = store.get().lens;
    for (const [l, b] of lensButtons) b.setAttribute("aria-pressed", String(l === lens));
  }

  build();
  store.subscribe((s, prev) => (s.locale !== prev.locale ? build() : sync()));
}

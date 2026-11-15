// Header bar: Firebreak mark and name, chapter rail, lens switch, language picker, Stories, Skip to Moon air.
// Generated with Claude, SI-assisted.
import { LENSES, MOON_STORY_ID, type Ctx, type Locale } from "../contract";
import { stories } from "../engine/stories";
import { h, prefersReducedMotion } from "./dom";
import markSvg from "./logo-mark.svg?raw";

export function mountChrome(root: HTMLElement, ctx: Ctx, openStories: (opener: HTMLElement) => void): void {
  const { store, t } = ctx;
  let lensButtons: [string, HTMLButtonElement][] = [];
  let localeSelect: HTMLSelectElement | null = null;
  let chips: [string, HTMLButtonElement][] = [];
  // autonyms: a language name in its own language is never translated, like the μg mark
  const localeNames: Record<string, string> = { en: "English", es: "Español", hi: "हिन्दी", ar: "العربية" };

  const behavior = (): ScrollBehavior => (prefersReducedMotion() ? "auto" : "smooth");

  function skip(): void {
    const base = `#story-${MOON_STORY_ID}`;
    const target =
      document.querySelector(`${base} .step[data-sliders="true"]`) ?? document.querySelector(base);
    target?.scrollIntoView({ block: "center", behavior: behavior() });
  }

  function brand(): HTMLElement {
    const mark = h("span", { class: "brand-mark", "aria-hidden": "true" });
    mark.innerHTML = markSvg; // our own file, bundled at build time
    const b = h("button", { type: "button", class: "brand" }, mark, h("span", { class: "brand-name" }, t("ui.chrome.brand")),
      h("sup", { class: "brand-ug" }, "μg")); // the unit symbol is never translated
    b.addEventListener("click", () => window.scrollTo({ top: 0, behavior: behavior() }));
    return b;
  }

  function rail(): HTMLElement | null {
    chips = [];
    if (!stories.length) return null;
    chips = stories.map((story) => {
      const chip = h("button", { type: "button", class: "chip", title: t("ui.rail.chapter", { n: story.act }) },
        h("span", { class: "chip-num" }, String(story.act)),
        h("span", { class: "chip-title" }, t(story.title_key)));
      chip.addEventListener("click", () =>
        document.getElementById(`story-${story.id}`)?.scrollIntoView({ block: "start", behavior: behavior() }));
      return [story.id, chip];
    });
    return h("nav", { class: "rail", "aria-label": t("ui.rail.label") }, ...chips.map(([, c]) => c));
  }

  function build(): void {
    const storiesBtn = h("button", { type: "button", class: "btn" }, t("ui.chrome.stories"));
    storiesBtn.addEventListener("click", () => openStories(storiesBtn));
    const skipBtn = h("button", { type: "button", class: "btn primary" }, t("ui.chrome.skip"));
    skipBtn.addEventListener("click", skip);
    lensButtons = LENSES.map((lens) => {
      const b = h("button", { type: "button", class: "btn lens", "data-lens": lens }, t(`ui.chrome.lens.${lens}`));
      b.addEventListener("click", () => store.set({ lens }));
      return [lens, b];
    });
    const group = h("div", { class: "lens-switch", role: "group", "aria-label": t("ui.chrome.lens-label") }, ...lensButtons.map(([, b]) => b));
    const locales = (Object.keys(ctx.dicts).length ? Object.keys(ctx.dicts) : ["en"]).filter((l) => l in localeNames);
    localeSelect = h("select", { class: "locale-select", "aria-label": t("ui.chrome.locale-label") },
      ...locales.map((locale) => h("option", { value: locale, selected: locale === store.get().locale ? true : undefined }, localeNames[locale]!)));
    localeSelect.addEventListener("change", () => store.set({ locale: localeSelect!.value as Locale }));
    root.replaceChildren(h("div", { class: "chrome-bar" }, brand(), rail(), group, storiesBtn, skipBtn, localeSelect));
    sync();
  }

  function sync(): void {
    const { lens, locale, beat } = store.get();
    for (const [l, b] of lensButtons) b.setAttribute("aria-pressed", String(l === lens));
    if (localeSelect && localeSelect.value !== locale) localeSelect.value = locale;
    for (const [id, c] of chips) {
      if (id === beat?.story) c.setAttribute("aria-current", "true");
      else c.removeAttribute("aria-current");
    }
  }

  build();
  store.subscribe((s, prev) => (s.locale !== prev.locale ? build() : sync()));

  // the header wraps on narrow screens: keep --chrome-h equal to its real height so the stage sits below it
  if (typeof ResizeObserver === "function") {
    new ResizeObserver(() =>
      document.documentElement.style.setProperty("--chrome-h", `${Math.ceil(root.getBoundingClientRect().height)}px`),
    ).observe(root);
  }
}

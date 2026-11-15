// Slider panel and the nearest-tests list. Generated with Claude, SI-assisted.
// The inputs are built once; while a slider is dragged only the readouts and the list re-render.
import {
  FAMILIES,
  SLIDER_RANGE,
  type AtmosphereId,
  type Ctx,
  type Family,
  type NearestRow,
} from "../contract";
import { queryFromState } from "../store";
import { airName, cite, h, num, numOrMissing } from "./dom";

const PRESETS: AtmosphereId[] = ["heo-dm-1006", "exp-10-2", "iss-air"];
const clamp = (v: number, r: { min: number; max: number }): number => Math.min(r.max, Math.max(r.min, v));

export function mountPanel(root: HTMLElement, ctx: Ctx): void {
  const { api, store, t } = ctx;
  let pIn: HTMLInputElement, oIn: HTMLInputElement, pOut: HTMLElement, oOut: HTMLElement;
  let famSel: HTMLSelectElement, list: HTMLElement, answerBox: HTMLElement;
  let presetBtns: { btn: HTMLButtonElement; id: AtmosphereId }[] = [];
  let lastKey = "";
  let expBox: HTMLElement;

  const family = (f: Family | null): string => (f ? t(`ui.family.${f}`) : t("ui.nearest.family-unknown"));

  /** One row names who burned: fuel, family and one linked investigation id. */
  function whoLine(r: NearestRow): (Node | string)[] {
    const acr = api.experiment(r.investigation)?.acronym ?? r.investigation;
    return [
      r.fuel ? cite(r.fuel, r.url, "num fuel") : h("span", { class: "missing" }, t("ui.nearest.fuel-unknown")),
      ` ${family(r.family)}, `,
      cite(acr, api.experiment(r.investigation)?.psi_url ?? r.url, "num id"),
    ];
  }

  /** The row's numbers live behind its own toggle, each a link to the row's source. */
  function detailLine(r: NearestRow): (Node | string)[] {
    return [
      num(r.o2_pct, 1, "%", r.url), ", ",
      num(r.pressure_kpa, 1, "kPa", r.url), ", ",
      num(r.ppo2_kpa, 1, "kPa", r.url), ", ",
      numOrMissing(t, r.flow_cm_s, 1, "cm/s", r.url), ", ",
      cite(t(`ui.outcome.${r.outcome}`), r.url, "num outcome"), ", ",
      h("span", {}, t("ui.nearest.gravity")), ", ",
      num(r.d, 3, "", r.url),
    ];
  }

  function nearestRow(r: NearestRow): HTMLElement {
    const li = h("li", {});
    const btn = h("button", { type: "button", class: "row-toggle", "aria-expanded": "false" }, t("ui.panel.show-details"));
    const det = h("div", { class: "row-details", hidden: "" }, ...detailLine(r));
    btn.addEventListener("click", () => {
      const open = det.hasAttribute("hidden");
      if (open) det.removeAttribute("hidden");
      else det.setAttribute("hidden", "");
      btn.textContent = t(open ? "ui.panel.hide-details" : "ui.panel.show-details");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.focus();
    });
    li.append(h("span", { class: "who" }, ...whoLine(r)), btn, det);
    return li;
  }

  function extreme(labelKey: string, row: NearestRow | null, cls: string): HTMLElement {
    return h("p", { class: `extreme ${cls}` }, h("strong", {}, `${t(labelKey)}: `),
      ...(row ? whoLine(row) : [h("span", {}, t("ui.nearest.none"))]));
  }

  /** One sentence from the nearest row; placeholders keep word order localizable.
   *  The verb is "tested", never "burned": the row may record no ignition or no outcome at all. */
  function answer(r: NearestRow): HTMLElement {
    const parts: Record<string, Node> = {
      fuel: r.fuel ? cite(r.fuel, r.url, "num fuel") : h("span", { class: "missing" }, t("ui.panel.answer.nofuel")),
      oxygen: num(r.o2_pct, 1, "%", r.url),
      pressure: num(r.pressure_kpa, 1, "kPa", r.url),
      outcome:
        r.outcome === "unknown"
          ? h("span", { class: "missing" }, t("ui.panel.answer.unrecorded"))
          : h("span", {}, t("ui.panel.answer.recorded", { outcome: t(`ui.outcome.${r.outcome}`) })),
    };
    const kids: (Node | string)[] = [];
    for (const bit of t("ui.panel.answer").split(/(\{\w+\})/g)) {
      const m = bit.match(/^\{(\w+)\}$/);
      kids.push(m && parts[m[1]] ? parts[m[1]] : bit);
    }
    return h("p", { class: "answer" }, ...kids);
  }

  function renderList(): void {
    const s = store.get();
    const q = queryFromState(s);
    const full: Node[] = [];
    let first: NearestRow | null = null;
    if (q) {
      const res = api.nearest(q, 10, s.family ?? undefined);
      first = res.rows[0] ?? null;
      const mix = res.familyMix.map((m) => t("ui.nearest.mix-item", { count: m.count, family: family(m.family) })).join(", ");
      full.push(
        h("h2", { class: "nearest-heading" }, t("ui.nearest.heading")),
        h("p", { class: "weighting", "data-own": true }, t("ui.nearest.weighting")),
        h("p", { class: "mix", "data-own": true }, mix),
        res.rows.length
          ? h("ol", { class: "nearest" }, ...res.rows.map(nearestRow))
          : h("p", {}, t("ui.nearest.empty")),
        extreme("ui.nearest.burned", res.nearestBurned, "burned"),
        extreme("ui.nearest.went-out", res.nearestWentOut, "went-out"),
      );
    }
    // SAFFIRE: large fabric, the most cabin-like tests; no pressure recorded, so never on the chart
    const saffire = api.notPlaced("large-scale solids");
    const others = api.notPlaced().length - saffire.length;
    const dl = h("dl", { class: "not-placed" });
    for (const r of saffire) {
      const group = h("div", { class: "np-row" });
      group.append(
        h("dt", {}, r.fuel ? cite(r.fuel, r.url, "num fuel") : h("span", { class: "missing" }, t("ui.nearest.fuel-unknown"))),
        h("dd", {}, numOrMissing(t, r.o2_pct, 1, "%", r.url)),
        h("dd", {}, cite(t(`ui.outcome.${r.outcome}`), r.url, "num outcome")),
        h("dd", { class: "reason" }, r.reason),
      );
      dl.append(group);
    }
    full.push(
      h("h3", {}, t("ui.nearest.not-placed.title")),
      h("p", {}, t("ui.nearest.not-placed.intro")),
      dl,
      h("p", { "data-own": true }, t("ui.nearest.not-placed.others", { n: Math.max(0, others) })),
    );
    // Public lens: one sentence first, then the list with per-row toggles. Other lenses keep the list.
    if (s.lens !== "public") {
      answerBox.replaceChildren();
      answerBox.hidden = true;
      list.replaceChildren(...full);
      return;
    }
    answerBox.hidden = false;
    answerBox.replaceChildren(first ? answer(first) : h("p", { class: "answer" }, t("ui.nearest.empty")));
    list.replaceChildren(...full);
  }

  function slider(id: string, labelKey: string, r: { min: number; max: number; step: number }) {
    const input = h("input", { type: "range", id, min: String(r.min), max: String(r.max), step: String(r.step) });
    const out = h("output", { for: id, "data-own": true });
    input.addEventListener("input", () =>
      store.set({ sliders: { pressure_kpa: Number(pIn.value), o2_pct: Number(oIn.value) } }));
    return { input, out, row: h("div", { class: "slider" }, h("label", { for: id }, t(labelKey)), input, out) };
  }

  function build(): void {
    const p = slider("slider-pressure", "ui.panel.pressure", SLIDER_RANGE.pressure_kpa);
    const o = slider("slider-o2", "ui.panel.o2", SLIDER_RANGE.o2_pct);
    pIn = p.input; oIn = o.input; pOut = p.out; oOut = o.out;

    const presets = h("div", { class: "presets", role: "group", "aria-label": t("ui.panel.presets") });
    presetBtns = [];
    for (const id of PRESETS) {
      let a;
      try { a = api.atmosphere(id); } catch { continue; }
      // plain buttons: no box styles. data-own: the label is a curated atmosphere name;
      // the values it sets show in the readouts
      const b = h("button", { type: "button", "data-own": true }, airName(store.get().lens, a, t));
      b.addEventListener("click", () =>
        store.set({ sliders: { pressure_kpa: clamp(a.pressure_kpa, SLIDER_RANGE.pressure_kpa), o2_pct: clamp(a.o2_pct_min, SLIDER_RANGE.o2_pct) } }));
      presetBtns.push({ btn: b, id });
      presets.append(b);
    }

    const placedFamilies = new Set(api.placed().map((x) => x.family));
    famSel = h("select", { id: "family-filter" },
      h("option", { value: "" }, t("ui.panel.family-all")),
      ...FAMILIES.filter((f) => placedFamilies.has(f)).map((f) => h("option", { value: f }, family(f))));
    // one label wraps the select; the filtering happens in the store
    const famLabel = h("label", { class: "family", for: "family-filter" }, t("ui.panel.family"), famSel);
    famSel.addEventListener("change", () => store.set({ family: (famSel.value || null) as Family | null }));

    expBox = h("div", { class: "panel-exp" },
      h("h4", {}, t("ui.panel.exp.slider.title")),
      h("p", {}, t("ui.panel.exp.slider.what")),
      h("p", { class: "exp-why" }, t("ui.panel.exp.slider.why")));
    expBox.hidden = true;
    list = h("div", { class: "nearest-wrap" });
    answerBox = h("div", { class: "answer-wrap" });
    root.replaceChildren(
      answerBox,
      h("div", { class: "sliders" }, p.row, o.row),
      h("p", { class: "presets-label" }, t("ui.panel.presets")),
      presets,
      famLabel,
      expBox,
      list,
    );
    lastKey = "";
    sync();
  }

  function sync(): void {
    const s = store.get();
    root.hidden = s.sliders === null;
    expBox.hidden = !(s.lens === "public" && s.sliders !== null && s.beat?.story === "moon-air" && s.beat?.beat === "interactive");
    if (!s.sliders) return;
    const set = (el: HTMLInputElement, v: number) => { if (Number(el.value) !== v) el.value = String(v); };
    set(pIn, s.sliders.pressure_kpa);
    set(oIn, s.sliders.o2_pct);
    pOut.textContent = `${s.sliders.pressure_kpa} ${t("ui.panel.unit.kpa")}`;
    oOut.textContent = `${s.sliders.o2_pct} ${t("ui.panel.unit.pct")}`;
    famSel.value = s.family ?? "";
    // the preset labels follow the lens: plain words in Public, moon.json names elsewhere
    for (const p of presetBtns) {
      try { p.btn.textContent = airName(s.lens, api.atmosphere(p.id), t); } catch { /* skipped above */ }
    }
    const key = JSON.stringify([s.sliders, s.family, s.locale, s.lens]);
    if (key !== lastKey) { lastKey = key; renderList(); }
  }

  build();
  store.subscribe((s, prev) => (s.locale !== prev.locale ? build() : sync()));
  keepClearOfText(root);
}

/** K5: from 1100px up the panel shares the story column with the active page's text.
 *  Its top follows the bottom of that text (measured, not guessed), so the panel never
 *  covers the sentences or the Sources line at any screen height or scroll position. */
function keepClearOfText(root: HTMLElement): void {
  let queued = false;
  const place = (): void => {
    queued = false;
    const wide = window.innerWidth >= 1100;
    const card = document.querySelector<HTMLElement>("#story .step.is-active .step-card");
    if (!wide || root.hidden || !card) {
      root.style.removeProperty("top");
      root.style.removeProperty("max-height");
      return;
    }
    const chrome = document.getElementById("chrome")?.getBoundingClientRect().bottom ?? 0;
    const top = Math.max(chrome + 16, card.getBoundingClientRect().bottom + 24);
    root.style.top = `${Math.round(top)}px`;
    root.style.maxHeight = "none";
  };
  const queue = (): void => { if (!queued) { queued = true; requestAnimationFrame(place); } };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  new MutationObserver(queue).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class", "hidden"] });
  queue();
}

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
import { cite, h, num, numOrMissing } from "./dom";

const PRESETS: AtmosphereId[] = ["heo-dm-1006", "exp-10-2", "iss-air"];
const clamp = (v: number, r: { min: number; max: number }): number => Math.min(r.max, Math.max(r.min, v));

export function mountPanel(root: HTMLElement, ctx: Ctx): void {
  const { api, store, t } = ctx;
  let pIn: HTMLInputElement, oIn: HTMLInputElement, pOut: HTMLElement, oOut: HTMLElement;
  let famSel: HTMLSelectElement, list: HTMLElement;
  let lastKey = "";
  let detailsOpen = false;
  let expBox: HTMLElement;

  const family = (f: Family | null): string => (f ? t(`ui.family.${f}`) : t("ui.nearest.family-unknown"));
  const kv = (labelKey: string, value: Node): HTMLElement =>
    h("span", { class: "kv" }, h("span", { class: "k" }, `${t(labelKey)} `), value);

  function rowBody(r: NearestRow): Node[] {
    const acr = api.experiment(r.investigation)?.acronym ?? r.investigation;
    return [
      h("span", { class: "who" },
        r.fuel ? cite(r.fuel, r.url, "num fuel") : h("span", { class: "missing" }, t("ui.nearest.fuel-unknown")),
        ` ${family(r.family)}, `,
        cite(acr, api.experiment(r.investigation)?.psi_url ?? r.url, "num id"),
      ),
      h("span", { class: "vals" },
        kv("ui.nearest.oxygen", num(r.o2_pct, 1, "%", r.url)),
        kv("ui.nearest.pressure", num(r.pressure_kpa, 1, "kPa", r.url)),
        kv("ui.nearest.ppo2", num(r.ppo2_kpa, 1, "kPa", r.url)),
        kv("ui.nearest.flow", numOrMissing(t, r.flow_cm_s, 1, "cm/s", r.url)),
        kv("ui.nearest.outcome", h("span", {}, t(`ui.outcome.${r.outcome}`))),
        h("span", { class: "kv" }, t("ui.nearest.gravity")),
        kv("ui.nearest.distance", num(r.d, 3, "", r.url)),
      ),
    ];
  }

  function extreme(labelKey: string, row: NearestRow | null, cls: string): HTMLElement {
    return h("p", { class: `extreme ${cls}` }, h("strong", {}, `${t(labelKey)}: `),
      ...(row ? rowBody(row) : [h("span", {}, t("ui.nearest.none"))]));
  }

  /** One sentence from the nearest row; placeholders keep word order localizable. */
  function answer(r: NearestRow): HTMLElement {
    const parts: Record<string, Node> = {
      fuel: r.fuel ? cite(r.fuel, r.url, "num fuel") : h("span", { class: "missing" }, t("ui.nearest.fuel-unknown")),
      oxygen: num(r.o2_pct, 1, "%", r.url),
      pressure: num(r.pressure_kpa, 1, "kPa", r.url),
      outcome: h("span", {}, t(`ui.outcome.${r.outcome}`)),
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
          ? h("ol", { class: "nearest" }, ...res.rows.map((r) => h("li", {}, ...rowBody(r))))
          : h("p", {}, t("ui.nearest.empty")),
        extreme("ui.nearest.burned", res.nearestBurned, "burned"),
        extreme("ui.nearest.went-out", res.nearestWentOut, "went-out"),
      );
    }
    // SAFFIRE: large fabric, the most cabin-like tests; no pressure recorded, so never on the chart
    const saffire = api.notPlaced("large-scale solids");
    const others = api.notPlaced().length - saffire.length;
    full.push(
      h("h3", {}, t("ui.nearest.not-placed.title")),
      h("p", {}, t("ui.nearest.not-placed.intro")),
      h("ul", { class: "not-placed" }, ...saffire.map((r) =>
        h("li", {},
          r.fuel ? cite(r.fuel, r.url, "num fuel") : h("span", { class: "missing" }, t("ui.nearest.fuel-unknown")),
          " ",
          kv("ui.nearest.oxygen", numOrMissing(t, r.o2_pct, 1, "%", r.url)),
          kv("ui.nearest.outcome", h("span", {}, t(`ui.outcome.${r.outcome}`))),
          h("span", { class: "kv" }, `${r.reason}`),
        ))),
      h("p", { "data-own": true }, t("ui.nearest.not-placed.others", { n: Math.max(0, others) })),
    );
    // Public lens: one sentence first, the full list behind a button. Other lenses keep the list.
    if (s.lens !== "public") {
      list.replaceChildren(...full);
      return;
    }
    const kids: Node[] = [first ? answer(first) : h("p", { class: "answer" }, t("ui.nearest.empty"))];
    const btn = h("button", { type: "button", class: "btn", "aria-expanded": detailsOpen ? "true" : "false" },
      t(detailsOpen ? "ui.panel.hide-details" : "ui.panel.show-details"));
    btn.addEventListener("click", () => { detailsOpen = !detailsOpen; renderList(); });
    const details = h("div", { class: "nearest-details" });
    if (!detailsOpen) details.setAttribute("hidden", "");
    details.append(...full);
    kids.push(btn, details);
    list.replaceChildren(...kids);
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
    for (const id of PRESETS) {
      let a;
      try { a = api.atmosphere(id); } catch { continue; }
      // data-own: the label is a curated atmosphere name; the values it sets show in the readouts
      const b = h("button", { type: "button", class: "btn", "data-own": true }, a.name);
      b.addEventListener("click", () =>
        store.set({ sliders: { pressure_kpa: clamp(a.pressure_kpa, SLIDER_RANGE.pressure_kpa), o2_pct: clamp(a.o2_pct_min, SLIDER_RANGE.o2_pct) } }));
      presets.append(b);
    }

    const placedFamilies = new Set(api.placed().map((x) => x.family));
    famSel = h("select", { id: "family-filter" },
      h("option", { value: "" }, t("ui.panel.family-all")),
      ...FAMILIES.filter((f) => placedFamilies.has(f)).map((f) => h("option", { value: f }, family(f))));
    famSel.addEventListener("change", () => store.set({ family: (famSel.value || null) as Family | null }));

    expBox = h("div", { class: "panel-exp" },
      h("h4", {}, t("ui.panel.exp.slider.title")),
      h("p", {}, t("ui.panel.exp.slider.what")),
      h("p", { class: "exp-why" }, t("ui.panel.exp.slider.why")));
    expBox.hidden = true;
    list = h("div", { class: "nearest-wrap" });
    root.replaceChildren(
      expBox,
      h("div", { class: "sliders" }, p.row, o.row),
      h("p", { class: "presets-label" }, t("ui.panel.presets")),
      presets,
      h("div", { class: "family" }, h("label", { for: "family-filter" }, t("ui.panel.family")), famSel),
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
    const key = JSON.stringify([s.sliders, s.family, s.locale, s.lens]);
    if (key !== lastKey) { lastKey = key; renderList(); }
  }

  build();
  store.subscribe((s, prev) => (s.locale !== prev.locale ? build() : sync()));
}

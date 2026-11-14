// Analyst sheet: all investigations, and the Moon-gravity margins from moon.json.
// Generated with Claude, SI-assisted.
import type { Ctx, Experiment, Publication, StageState } from "../contract";
import { cite, h, num } from "./dom";

type Tab = "investigations" | "margins";
const tabFor = (s: StageState["analyst_sheet"]): Tab => (s === "lunar-margins" || s === "failing-materials" ? "margins" : "investigations");

export function mountSheet(root: HTMLElement, ctx: Ctx): void {
  const { api, store, t } = ctx;
  let tab: Tab = tabFor(store.get().stage.analyst_sheet);
  let tabBtns: [Tab, HTMLButtonElement][] = [];
  let body: HTMLElement;
  let shown: Tab | null = null;

  const table = (cls: string, caption: Node, head: string[], rows: Node[][]): HTMLElement =>
    h("table", { class: cls },
      h("caption", {}, caption),
      h("thead", {}, h("tr", {}, ...head.map((c) => h("th", { scope: "col" }, t(c))))),
      h("tbody", {}, ...rows.map((r) => h("tr", {}, ...r.map((c) => h("td", {}, c))))));

  function range(r: [number, number] | null | undefined, unit: string, href: string): Node {
    if (!r) return h("span", { class: "missing" }, t("ui.sheet.not-recorded"));
    const f = (v: number) => String(Number(v.toFixed(1)));
    return cite(t("ui.sheet.range", { lo: f(r[0]), hi: f(r[1]), unit }), href);
  }

  const doiUrl = (doi: string): string => `https://doi.org/${doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}`;
  const missing = (): HTMLElement => h("span", { class: "missing" }, t("ui.sheet.not-recorded"));

  function paper(p: Publication, psiUrl: string): HTMLElement {
    const text = [p.authors, p.title, p.year].filter(Boolean).join(". ");
    return h("li", {}, cite(text, psiUrl, "plain"), ` ${t("ui.sheet.detail.doi")}: `,
      p.doi ? cite(p.doi, doiUrl(p.doi), "num") : missing());
  }

  /** Objective word for word, the AI summary under its tag, papers with DOIs, link to PSI. Numbers sit in links to PSI. */
  function detail(e: Experiment): HTMLElement {
    const s = e.summary;
    return h("div", { class: "detail-block", id: `detail-${e.id}` },
      h("h4", {}, t("ui.sheet.detail.objective")),
      e.objective ? h("blockquote", {}, cite(e.objective, e.psi_url, "plain")) : h("p", {}, missing()),
      h("h4", {}, h("span", { class: "ai-tag" }, t("ui.sheet.detail.summary"))),
      s
        ? h("div", { class: "ai-summary" },
            h("p", {}, cite(s.text, e.psi_url, "plain")),
            h("p", { class: "by", "data-own": true }, t("ui.sheet.detail.summary-by", { model: s.model, made_at: s.made_at })),
            h("p", { class: "by" }, t("ui.sheet.detail.quotes")),
            s.quotes.length
              ? h("ul", { class: "quotes" }, ...s.quotes.map((q) => h("li", {}, h("q", {}, cite(q, e.psi_url, "plain")))))
              : missing())
        : h("p", {}, missing()),
      h("h4", {}, t("ui.sheet.detail.papers")),
      e.publications.length ? h("ul", { class: "papers" }, ...e.publications.map((p) => paper(p, e.psi_url))) : h("p", {}, missing()),
      h("p", {}, cite(t("ui.sheet.detail.psi-link"), e.psi_url, "plain")));
  }

  /** The acronym opens or closes the detail row under its row. */
  function toggle(btn: HTMLButtonElement, e: Experiment): void {
    const row = btn.closest("tr")!;
    const next = row.nextElementSibling;
    if (next?.classList.contains("detail")) {
      next.remove();
      btn.setAttribute("aria-expanded", "false");
      return;
    }
    const cell = h("td", { colspan: String(row.children.length) }, detail(e));
    row.after(h("tr", { class: "detail" }, cell));
    btn.setAttribute("aria-expanded", "true");
  }

  // data-own: the acronym is a name, not a number; the title link beside it goes to the PSI page
  function openButton(e: Experiment): HTMLButtonElement {
    const btn = h("button", { type: "button", class: "row-open", "aria-expanded": "false", "data-own": true }, e.acronym);
    btn.addEventListener("click", () => toggle(btn, e));
    return btn;
  }

  function investigations(): HTMLElement {
    const rows = [...api.data.experiments].sort(
      (a: Experiment, b: Experiment) => a.family.localeCompare(b.family) || a.acronym.localeCompare(b.acronym));
    return table("investigations",
      h("span", { "data-own": true }, t("ui.sheet.caption", { investigations: rows.length, tests: api.data.tests.length })),
      ["ui.sheet.col.acronym", "ui.sheet.col.title", "ui.sheet.col.family", "ui.sheet.col.tests", "ui.sheet.col.o2", "ui.sheet.col.pressure", "ui.sheet.col.outcomes", "ui.sheet.col.papers"],
      rows.map((e) => [
        openButton(e),
        cite(e.title, e.psi_url, "plain"),
        h("span", {}, t(`ui.family.${e.family}`)),
        num(e.test_count, 0, "", e.psi_url),
        range(e.o2_pct_range, t("ui.panel.unit.pct"), e.psi_url),
        range(e.pressure_kpa_range, t("ui.panel.unit.kpa"), e.psi_url),
        h("span", {}, t(e.has_outcomes ? "ui.sheet.yes" : "ui.sheet.no")),
        num(e.publications.length, 0, "", e.psi_url),
      ]));
  }

  function margins(): HTMLElement {
    const m = api.data.moon.lunar_margins;
    const atm = api.atmosphere("heo-dm-1006");
    const f = (v: number) => String(Number(v.toFixed(1)));
    const band = atm.o2_pct_max == null
      ? t("ui.sheet.band-open", { lo: f(atm.o2_pct_min) })
      : t("ui.sheet.range", { lo: f(atm.o2_pct_min), hi: f(atm.o2_pct_max), unit: t("ui.panel.unit.pct") });
    return h("div", { class: "margins" },
      table("margin-table", h("span", {}, t("ui.sheet.tab.margins")),
        ["ui.sheet.col.material", "ui.sheet.col.delta"],
        m.materials.map((x) => [cite(x.material, m.url, "plain"), num(x.delta_o2_pts, 2, "", m.url)])),
      h("p", { class: "meaning" }, cite(m.meaning, m.url, "plain")),
      h("p", {}, `${t("ui.sheet.source")} `, cite(m.source, m.url)),
      h("h3", {}, t("ui.sheet.air-title")),
      h("p", { class: "air" },
        cite(atm.name, atm.url, "plain"), ": ",
        num(atm.pressure_kpa, 1, t("ui.panel.unit.kpa"), atm.url), ", ",
        cite(band, atm.url),
        atm.note ? h("span", {}, " ", cite(atm.note, atm.url, "plain")) : null),
      h("p", {}, `${t("ui.sheet.source")} `, cite(atm.source, atm.url)),
    );
  }

  function render(): void {
    for (const [k, b] of tabBtns) b.setAttribute("aria-selected", String(k === tab));
    if (shown !== tab) {
      shown = tab;
      body.replaceChildren(tab === "investigations" ? investigations() : margins());
    }
  }

  function build(): void {
    tabBtns = (["investigations", "margins"] as Tab[]).map((k) => {
      const b = h("button", { type: "button", role: "tab", class: "btn tab" }, t(`ui.sheet.tab.${k}`));
      b.addEventListener("click", () => { tab = k; render(); });
      return [k, b];
    });
    body = h("div", { class: "sheet-body", role: "tabpanel" });
    root.replaceChildren(h("div", { class: "tabs", role: "tablist", "aria-label": t("ui.sheet.tabs-label") }, ...tabBtns.map(([, b]) => b)), body);
    shown = null;
    render();
  }

  const key = (s: ReturnType<typeof store.get>) => (s.beat ? `${s.beat.story}/${s.beat.scene}/${s.beat.beat}` : "");
  build();
  root.hidden = store.get().lens !== "analyst";
  store.subscribe((s, prev) => {
    root.hidden = s.lens !== "analyst";
    if (s.locale !== prev.locale) build();
    if (key(s) !== key(prev) || s.stage.analyst_sheet !== prev.stage.analyst_sheet) tab = tabFor(s.stage.analyst_sheet);
    render();
  });
}

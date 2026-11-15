// Analyst sheet: all investigations, and the Moon-gravity margins from moon.json.
// Generated with Claude, SI-assisted.
import { FAMILIES, type Ctx, type Experiment, type Family, type Outcome, type PlottedFilter, type Publication, type StageState, type TestRun } from "../contract";
import { SELECT_INVESTIGATION } from "../stage/index";
import { cite, h, num, numOrMissing, safeHref } from "./dom";

type Tab = "investigations" | "margins" | "tests";
const tabFor = (s: StageState["analyst_sheet"]): Tab => (s === "lunar-margins" || s === "failing-materials" ? "margins" : "investigations");

type SortKey = "acronym" | "title" | "family" | "tests" | "o2" | "pressure" | "outcomes" | "papers";
type TestSortKey = "investigation" | "fuel" | "o2" | "pressure" | "flow" | "outcome" | "source" | "placed";

export function mountSheet(root: HTMLElement, ctx: Ctx): void {
  const { api, store, t } = ctx;
  let tab: Tab = tabFor(store.get().stage.analyst_sheet);
  let tabBtns: [Tab, HTMLButtonElement][] = [];
  let body: HTMLElement;
  let sig: string | null = null;
  let sortKey: SortKey = "family";
  let sortDir: 1 | -1 = 1;
  let testSortKey: TestSortKey = "investigation";
  let testSortDir: 1 | -1 = 1;
  let selectedInv: string | null = null;
  let searchEl: HTMLInputElement | null = null;
  let famSelEl: HTMLSelectElement | null = null;
  let fuelSelEl: HTMLSelectElement | null = null;
  let outcomeSelEl: HTMLSelectElement | null = null;
  let plottedSelEl: HTMLSelectElement | null = null;
  let countEl: HTMLElement | null = null;

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

  const doiUrl = (doi: string): string => safeHref(`https://doi.org/${doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}`);
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
      testRows(e),
      h("p", {}, cite(t("ui.sheet.detail.psi-link"), e.psi_url, "plain")));
  }

  /** Opens the investigation's row (closing any other), without scrolling. */
  function openRow(id: string): boolean {
    const btn = [...body.querySelectorAll<HTMLButtonElement>("button.row-open")].find((b) => b.dataset.investigation === id);
    const e = api.experiment(id);
    if (!btn || !e) return false;
    btn.setAttribute("aria-expanded", "true");
    const row = btn.closest("tr")!;
    row.after(h("tr", { class: "detail" }, h("td", { colspan: String(row.children.length) }, detail(e))));
    return true;
  }

  /** Closes every open detail row, then opens the selected investigation's row, scrolling to it. */
  function selectRow(id: string | null, scroll: boolean): void {
    for (const d of body.querySelectorAll("tr.detail")) {
      d.previousElementSibling?.querySelector("button.row-open")?.setAttribute("aria-expanded", "false");
      d.remove();
    }
    if (id && openRow(id) && scroll) body.querySelector("tr.detail")!.scrollIntoView({ block: "nearest" });
  }

  /** The acronym opens or closes the detail row under its row, selecting the investigation for the stage. */
  function toggle(btn: HTMLButtonElement, e: Experiment): void {
    const open = btn.getAttribute("aria-expanded") !== "true";
    window.dispatchEvent(new CustomEvent(SELECT_INVESTIGATION, { detail: { investigation: open ? e.id : null } }));
  }

  // data-own: the acronym is a name, not a number; the title link beside it goes to the PSI page
  function openButton(e: Experiment): HTMLButtonElement {
    const btn = h("button", { type: "button", class: "row-open", "aria-expanded": "false", "data-own": true, "data-investigation": e.id }, e.acronym);
    btn.addEventListener("click", () => toggle(btn, e));
    return btn;
  }

  const sortVal = (e: Experiment, k: SortKey): string | number =>
    k === "acronym" ? e.acronym : k === "title" ? e.title : k === "family" ? e.family :
    k === "tests" ? e.test_count : k === "o2" ? (e.o2_pct_range?.[0] ?? Infinity) :
    k === "pressure" ? (e.pressure_kpa_range?.[0] ?? Infinity) : k === "outcomes" ? (e.has_outcomes ? 0 : 1) :
    e.publications.length;

  const cols: { key: SortKey; label: string }[] = [
    { key: "acronym", label: "ui.sheet.col.acronym" },
    { key: "title", label: "ui.sheet.col.title" },
    { key: "family", label: "ui.sheet.col.family" },
    { key: "tests", label: "ui.sheet.col.tests" },
    { key: "o2", label: "ui.sheet.col.o2" },
    { key: "pressure", label: "ui.sheet.col.pressure" },
    { key: "outcomes", label: "ui.sheet.col.outcomes" },
    { key: "papers", label: "ui.sheet.col.papers" },
  ];

  /** A re-sort rebuilds the table head: put focus back on the new sort button. */
  function refocusSort(label: string): void {
    const next = [...body.querySelectorAll<HTMLButtonElement>("th button.sort")].find((x) => x.textContent === label);
    next?.focus();
  }

  function invHead(): HTMLElement {
    return h("thead", {}, h("tr", {}, ...cols.map((c) => {
      const th = h("th", { scope: "col", "aria-sort": c.key === sortKey ? (sortDir === 1 ? "ascending" : "descending") : "none" });
      const b = h("button", { type: "button", class: "sort" }, t(c.label));
      b.addEventListener("click", () => {
        if (sortKey === c.key) sortDir = sortDir === 1 ? -1 : 1;
        else { sortKey = c.key; sortDir = 1; }
        render();
        refocusSort(t(c.label));
      });
      th.append(b);
      return th;
    })));
  }

  function sortedFiltered(): Experiment[] {
    const rows = sortedExperiments().filter((e) => invPasses(e, placedIds()));
    return rows;
  }

  function placedIds(): Set<string> {
    return new Set(api.placed().map((p) => p.id));
  }

  function fuelsOf(e: Experiment): string[] {
    const out = new Set<string>();
    for (const r of api.data.tests) if (r.investigation === e.id && r.fuel) out.add(r.fuel);
    return [...out];
  }

  function invMatches(e: Experiment, q: string): boolean {
    if (!q) return true;
    const hay = `${e.acronym} ${e.title} ${e.family} ${t(`ui.family.${e.family}`)} ${fuelsOf(e).join(" ")}`.toLowerCase();
    return hay.includes(q);
  }

  function rowMatches(r: TestRun, q: string): boolean {
    if (!q) return true;
    const e = api.experiment(r.investigation);
    const hay = `${r.investigation} ${e?.acronym ?? ""} ${e?.title ?? ""} ${e?.family ?? ""} ${r.fuel ?? ""}`.toLowerCase();
    return hay.includes(q);
  }

  function invPasses(e: Experiment, placed: Set<string>): boolean {
    const s = store.get();
    if (s.family && e.family !== s.family) return false;
    const rows = api.data.tests.filter((x) => x.investigation === e.id);
    if (s.filters.fuel && !rows.some((r) => r.fuel === s.filters.fuel)) return false;
    if (s.filters.outcome && !rows.some((r) => r.outcome === s.filters.outcome)) return false;
    if (s.filters.plotted === "plotted" && !rows.some((r) => placed.has(r.id))) return false;
    if (s.filters.plotted === "unplaced" && !rows.some((r) => !placed.has(r.id))) return false;
    return invMatches(e, s.filters.search);
  }

  function rowPasses(r: TestRun, placed: Set<string>): boolean {
    const s = store.get();
    if (s.family && api.experiment(r.investigation)?.family !== s.family) return false;
    if (s.filters.fuel && r.fuel !== s.filters.fuel) return false;
    if (s.filters.outcome && r.outcome !== s.filters.outcome) return false;
    if (s.filters.plotted === "plotted" && !placed.has(r.id)) return false;
    if (s.filters.plotted === "unplaced" && placed.has(r.id)) return false;
    return rowMatches(r, s.filters.search);
  }

  function sortedExperiments(): Experiment[] {
    return [...api.data.experiments].sort((a, b) => {
      const va = sortVal(a, sortKey);
      const vb = sortVal(b, sortKey);
      const r = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return (r || a.family.localeCompare(b.family) || a.acronym.localeCompare(b.acronym)) * sortDir;
    });
  }

  /** Every test row of the investigation, values as recorded, each linked to its PSI row. */
  function testRows(e: Experiment): Node {
    const rows = api.data.tests.filter((x) => x.investigation === e.id);
    if (!rows.length) return h("p", {}, missing());
    return table("test-rows",
      h("span", { "data-own": true }, t("ui.sheet.tests-caption", { n: rows.length })),
      ["ui.sheet.col.fuel", "ui.nearest.oxygen", "ui.nearest.pressure", "ui.nearest.flow", "ui.nearest.outcome", "ui.sheet.col.source"],
      rows.map((r) => [
        r.fuel ? cite(r.fuel, r.source.url, "num fuel") : missing(),
        numOrMissing(t, r.o2_pct, 1, "%", r.source.url),
        numOrMissing(t, r.pressure_kpa, 1, "kPa", r.source.url),
        numOrMissing(t, r.flow_cm_s ?? null, 1, "cm/s", r.source.url),
        h("span", {}, t(`ui.outcome.${r.outcome}`)),
        cite(r.id, r.source.url, "num"),
      ]));
  }

  function select(id: string, options: { value: string; text: string }[], current: string | null, onChange: (v: string | null) => void): HTMLSelectElement {
    const sel = h("select", { id }, ...options.map((o) => h("option", { value: o.value }, o.text)));
    sel.value = current ?? "";
    sel.addEventListener("change", () => onChange(sel.value || null));
    return sel;
  }

  function filter(id: string, labelKey: string, control: HTMLElement, grow = false): HTMLElement {
    return h("div", { class: grow ? "sheet-filter grow" : "sheet-filter" }, h("label", { for: id }, t(labelKey)), control);
  }

  /** The filters live in the store, so the chart draws the same rows the tables show. */
  function setFilter(patch: Partial<{ search: string; fuel: string | null; outcome: Outcome | null; plotted: PlottedFilter }>): void {
    store.set({ filters: { ...store.get().filters, ...patch } });
  }

  /** One toolbar row: the search grows, the four selects sit inline, the result count ends the row. */
  function controls(): HTMLElement {
    const bar = h("div", { class: "sheet-toolbar" });
    searchEl = h("input", { type: "search", id: "sheet-search", value: store.get().filters.search });
    searchEl.addEventListener("input", () => setFilter({ search: searchEl!.value.trim().toLowerCase() }));
    bar.append(filter("sheet-search", "ui.search.label", searchEl, true));
    const fuels = [...new Set(api.data.tests.map((r) => r.fuel).filter((f): f is string => !!f))].sort();
    const outcomes = [...new Set(api.data.tests.map((r) => r.outcome))].sort();
    famSelEl = select("sheet-family",
      [{ value: "", text: t("ui.panel.family-all") },
        ...FAMILIES.filter((f) => api.data.experiments.some((e) => e.family === f))
          .map((f) => ({ value: f, text: t(`ui.family.${f}`) }))],
      store.get().family, (v) => store.set({ family: (v || null) as Family | null }));
    bar.append(filter("sheet-family", "ui.sheet.family", famSelEl));
    fuelSelEl = select("sheet-fuel",
      [{ value: "", text: t("ui.sheet.filter.all") }, ...fuels.map((f) => ({ value: f, text: f }))],
      store.get().filters.fuel, (v) => setFilter({ fuel: v }));
    bar.append(filter("sheet-fuel", "ui.sheet.col.fuel", fuelSelEl));
    outcomeSelEl = select("sheet-outcome",
      [{ value: "", text: t("ui.sheet.filter.all") }, ...outcomes.map((o) => ({ value: o, text: t(`ui.outcome.${o}`) }))],
      store.get().filters.outcome, (v) => setFilter({ outcome: (v || null) as Outcome | null }));
    bar.append(filter("sheet-outcome", "ui.nearest.outcome", outcomeSelEl));
    plottedSelEl = select("sheet-plotted",
      [{ value: "all", text: t("ui.sheet.filter.all") },
        { value: "plotted", text: t("ui.sheet.filter.plotted") },
        { value: "unplaced", text: t("ui.sheet.filter.unplaced") }],
      store.get().filters.plotted, (v) => setFilter({ plotted: (v || "all") as PlottedFilter }));
    bar.append(filter("sheet-plotted", "ui.sheet.filter.placement", plottedSelEl));
    countEl = h("span", { class: "sheet-count", "data-own": true });
    bar.append(countEl);
    return bar;
  }

  /** Coverage as one compact row of numbers: plotted of total, then each reason's count. */
  function coverage(): HTMLElement {
    const { plotted, total } = api.coverage();
    const byReason = new Map<string, number>();
    for (const r of api.notPlaced()) byReason.set(r.reason, (byReason.get(r.reason) ?? 0) + 1);
    const kids: (Node | string)[] = [t("ui.stage.coverage", { plotted, total })];
    for (const [reason, n] of byReason) kids.push(" · ", `${reason}: `, h("span", { "data-own": true }, String(n)));
    return h("p", { class: "coverage-row", "data-own": true }, ...kids);
  }

  function downloads(): HTMLElement {
    return h("div", { class: "downloads" },
      h("h3", {}, t("ui.sheet.downloads.title")),
      h("ul", {}, ...["tests.json", "experiments.json", "moments.json", "library.json", "search.json", "coverage.json"].map((f) =>
        h("li", {}, h("a", { href: `data/${f}`, download: true }, f)))));
  }

  const testCols: { key: TestSortKey; label: string }[] = [
    { key: "investigation", label: "ui.sheet.col.acronym" },
    { key: "fuel", label: "ui.sheet.col.fuel" },
    { key: "o2", label: "ui.nearest.oxygen" },
    { key: "pressure", label: "ui.nearest.pressure" },
    { key: "flow", label: "ui.nearest.flow" },
    { key: "outcome", label: "ui.nearest.outcome" },
    { key: "source", label: "ui.sheet.col.source" },
    { key: "placed", label: "ui.sheet.col.placed" },
  ];

  function testHead(): HTMLElement {
    return h("thead", {}, h("tr", {}, ...testCols.map((c) => {
      const th = h("th", { scope: "col", "aria-sort": c.key === testSortKey ? (testSortDir === 1 ? "ascending" : "descending") : "none" });
      const b = h("button", { type: "button", class: "sort" }, t(c.label));
      b.addEventListener("click", () => {
        if (testSortKey === c.key) testSortDir = testSortDir === 1 ? -1 : 1;
        else { testSortKey = c.key; testSortDir = 1; }
        render();
        refocusSort(t(c.label));
      });
      th.append(b);
      return th;
    })));
  }

  function sortedTestRows(placed: Set<string>): TestRun[] {
    // missing values sort last in both directions, never first when descending
    const missing = testSortDir === 1 ? Infinity : -Infinity;
    const val = (r: TestRun): string | number => {
      switch (testSortKey) {
        case "investigation": return api.experiment(r.investigation)?.acronym ?? r.investigation;
        case "fuel": return r.fuel ?? "";
        case "o2": return r.o2_pct ?? missing;
        case "pressure": return r.pressure_kpa ?? missing;
        case "flow": return r.flow_cm_s ?? missing;
        case "outcome": return r.outcome;
        case "source": return r.id;
        case "placed": return placed.has(r.id) ? 0 : 1;
      }
    };
    return api.data.tests.filter((r) => rowPasses(r, placed)).sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      const r = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return (r || a.id.localeCompare(b.id)) * testSortDir;
    });
  }

  function testsTab(): HTMLElement {
    const placed = placedIds();
    const rows = sortedTestRows(placed);
    return h("div", { class: "tests-tab" },
      h("table", { class: "tests-table" },
        h("caption", {}, h("span", { "data-own": true }, t("ui.sheet.tests-matching", { n: rows.length }))),
        testHead(),
        h("tbody", {}, ...rows.map((r) => {
          const e = api.experiment(r.investigation);
          const sel = h("button", { type: "button", class: "row-select", "data-own": true }, e?.acronym ?? r.investigation);
          sel.addEventListener("click", () => {
            const next = selectedInv === r.investigation ? null : r.investigation;
            if (next) {
              tab = "investigations";
              window.dispatchEvent(new CustomEvent(SELECT_INVESTIGATION, { detail: { investigation: next } }));
              render();
              body.querySelector("tr.detail")?.scrollIntoView({ block: "nearest" });
            } else window.dispatchEvent(new CustomEvent(SELECT_INVESTIGATION, { detail: { investigation: null } }));
          });
          return h("tr", {},
            h("td", {}, sel),
            h("td", {}, r.fuel ? cite(r.fuel, r.source.url, "num fuel") : missing()),
            h("td", {}, numOrMissing(t, r.o2_pct, 1, "%", r.source.url)),
            h("td", {}, numOrMissing(t, r.pressure_kpa, 1, "kPa", r.source.url)),
            h("td", {}, numOrMissing(t, r.flow_cm_s ?? null, 1, "cm/s", r.source.url)),
            h("td", {}, h("span", {}, t(`ui.outcome.${r.outcome}`))),
            h("td", {}, cite(r.id, r.source.url, "num")),
            h("td", {}, h("span", {}, t(placed.has(r.id) ? "ui.sheet.yes" : "ui.sheet.no"))));
        }))));
  }

  function investigations(): HTMLElement {
    const rows = sortedFiltered();
    return h("div", { class: "investigations-tab" },
      coverage(),
      h("table", { class: "investigations" },
        h("caption", {}, h("span", { "data-own": true }, t("ui.sheet.caption", { investigations: rows.length, tests: api.data.tests.length }))),
        invHead(),
        h("tbody", {}, ...rows.map((e) => h("tr", {},
          h("td", {}, openButton(e)),
          h("td", {}, cite(e.title, e.psi_url, "plain")),
          h("td", {}, h("span", {}, t(`ui.family.${e.family}`))),
          h("td", {}, num(e.test_count, 0, "", e.psi_url)),
          h("td", {}, range(e.o2_pct_range, t("ui.panel.unit.pct"), e.psi_url)),
          h("td", {}, range(e.pressure_kpa_range, t("ui.panel.unit.kpa"), e.psi_url)),
          h("td", {}, h("span", {}, t(e.has_outcomes ? "ui.sheet.yes" : "ui.sheet.no"))),
          h("td", {}, num(e.publications.length, 0, "", e.psi_url)),
        )))),
      downloads());
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

  function syncControls(): void {
    const f = store.get().filters;
    if (searchEl && document.activeElement !== searchEl) searchEl.value = f.search;
    if (famSelEl) famSelEl.value = store.get().family ?? "";
    if (fuelSelEl) fuelSelEl.value = f.fuel ?? "";
    if (outcomeSelEl) outcomeSelEl.value = f.outcome ?? "";
    if (plottedSelEl) plottedSelEl.value = f.plotted;
  }

  /** The toolbar count mirrors the visible tab: filtered investigations, test rows or materials. */
  function updateCount(): void {
    if (!countEl) return;
    if (tab === "tests") countEl.textContent = t("ui.sheet.count.tests", { n: sortedTestRows(placedIds()).length });
    else if (tab === "margins") countEl.textContent = t("ui.sheet.count.materials", { n: api.data.moon.lunar_margins.materials.length });
    else countEl.textContent = t("ui.sheet.count.investigations", { n: sortedFiltered().length });
  }

  function render(): void {
    for (const [k, b] of tabBtns) b.setAttribute("aria-selected", String(k === tab));
    syncControls();
    const f = store.get().filters;
    const next = [tab, sortKey, sortDir, testSortKey, testSortDir, store.get().family, f.fuel, f.outcome, f.plotted, f.search].join("|");
    if (sig !== next) {
      sig = next;
      body.replaceChildren(tab === "investigations" ? investigations() : tab === "tests" ? testsTab() : margins());
      if (tab === "investigations" && selectedInv) selectRow(selectedInv, false);
    }
    updateCount();
  }

  function build(): void {
    const order: Tab[] = ["investigations", "margins", "tests"];
    tabBtns = order.map((k) => {
      const b = h("button", { type: "button", role: "tab", class: "btn tab" }, t(`ui.sheet.tab.${k}`));
      b.addEventListener("click", () => { tab = k; render(); });
      // ARIA tabs pattern: Left/Right move between tabs and activate the new one
      b.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const next = order[(order.indexOf(k) + (e.key === "ArrowRight" ? 1 : order.length - 1)) % order.length]!;
        tab = next;
        render();
        tabBtns.find(([t]) => t === next)![1].focus();
      });
      return [k, b];
    });
    body = h("div", { class: "sheet-body", role: "tabpanel" });
    root.replaceChildren(
      h("div", { class: "tabs", role: "tablist", "aria-label": t("ui.sheet.tabs-label") }, ...tabBtns.map(([, b]) => b)),
      controls(),
      body);
    document.body.dataset.lens = store.get().lens;
    sig = null;
    render();
  }

  const key = (s: ReturnType<typeof store.get>) => (s.beat ? `${s.beat.story}/${s.beat.scene}/${s.beat.beat}` : "");
  build();
  root.hidden = store.get().lens !== "analyst";
  // dot clicks on the chart select an investigation here; row clicks select it there (see stage/index.ts)
  window.addEventListener(SELECT_INVESTIGATION, (e) => {
    selectedInv = (e as CustomEvent<{ investigation: string | null }>).detail.investigation;
    selectRow(selectedInv, true);
  });
  store.subscribe((s, prev) => {
    root.hidden = s.lens !== "analyst";
    document.body.dataset.lens = s.lens;
    if (s.locale !== prev.locale) build();
    if (key(s) !== key(prev) || s.stage.analyst_sheet !== prev.stage.analyst_sheet) tab = tabFor(s.stage.analyst_sheet);
    render();
  });
}

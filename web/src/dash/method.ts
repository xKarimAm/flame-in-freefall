// How the data was made (web-lane task 58, backend lane D5): one table per source
// file from data/provenance.json, the plotted rule from data/coverage.json, the
// automated checks with counts recomputed from the files, how AI was used, and
// download links to every data file and contract. Values are fetched at runtime
// and rendered from those files or the app data; nothing is typed.
// Generated with Muse Spark, SI-assisted.
import "./dash.css";
import type { Ctx } from "../contract";
import { cite, h } from "../ui/dom";
import { linkedFile, TESTS_FILE } from "./overview";

const PROV_FILE = "data/provenance.json";
const COV_FILE = "data/coverage.json";
const DICT_FILE = "data/dictionary.json";
const LIB_FILE = "data/library.json";

interface ProvField { parsed: number; empty: number; unparsable: number }
interface ProvUnit { column: string; unit?: string; factor?: number; conversion?: string }
interface ProvEntry {
  file: string; investigation: string; mapped: boolean; rows_read: number; rows_mapped: number;
  reason?: string;
  fields: Record<string, ProvField>;
  units: Record<string, ProvUnit>;
  unparsable_cells: { field: string; row: number; raw: string }[];
}
interface CovDoc { total: number; plotted: number; by_reason: Record<string, number> }
interface DictEntry { file: string; field: string; meaning: string; records: number; non_null: number }
interface LibStory { id: string; ai: { model: string } }
interface TransMeta { model: string; made_at: string; keys: number }

export interface MethodData {
  provenance: ProvEntry[] | null;
  coverage: CovDoc | null;
  dictionary: DictEntry[] | null;
  library: LibStory[] | null;
  esMeta: TransMeta | null;
  hiMeta: TransMeta | null;
  errors: string[];
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as T;
}

/** Every file on its own: one failure never hides the rest. */
export async function loadMethodData(): Promise<MethodData> {
  const out: MethodData = {
    provenance: null, coverage: null, dictionary: null, library: null,
    esMeta: null, hiMeta: null, errors: [],
  };
  const jobs: [keyof Omit<MethodData, "errors">, string][] = [
    ["provenance", PROV_FILE], ["coverage", COV_FILE], ["dictionary", DICT_FILE],
    ["library", LIB_FILE], ["esMeta", "data/es.meta.json"], ["hiMeta", "data/hi.meta.json"],
  ];
  for (const [key, url] of jobs) {
    try {
      out[key] = (await get(url)) as never;
    } catch {
      out.errors.push(url);
    }
  }
  return out;
}

const fileLink = (text: string, file: string): HTMLAnchorElement => h("a", { href: file }, text);

/** A whole constructed sentence from one file: one link keeps every digit covered. */
const fileSentence = (line: string, file: string): HTMLAnchorElement => fileLink(line, file);

function provTable(ctx: Ctx, e: ProvEntry): HTMLElement {
  const { t } = ctx;
  const head: [string, boolean][] = [["ui.dash.method.col.field", false], ["ui.dash.method.col.parsed", true], ["ui.dash.method.col.empty", true], ["ui.dash.method.col.unparsable", true]];
  const body: HTMLElement[] = [];
  for (const [field, f] of Object.entries(e.fields)) {
    const column = e.units[field]?.column;
    body.push(h("tr", {},
      h("td", {}, fileLink(column ? `${field} (${column})` : field, PROV_FILE)),
      h("td", { class: "num" }, fileLink(String(f.parsed), PROV_FILE)),
      h("td", { class: "num" }, fileLink(String(f.empty), PROV_FILE)),
      h("td", { class: "num" }, fileLink(String(f.unparsable), PROV_FILE))));
  }
  const lines: Node[] = [];
  for (const [field, u] of Object.entries(e.units)) {
    const conv = u.conversion ?? [u.unit, u.factor == null ? null : `× ${u.factor}`].filter((x) => x != null).join(" ");
    const line = `${field}: ${u.column} → ${conv}`;
    lines.push(h("p", { class: "dash-units" }, fileSentence(line, PROV_FILE)));
  }
  for (const c of e.unparsable_cells.slice(0, 3)) {
    lines.push(h("p", { class: "dash-raw" }, fileSentence(`"${c.raw}" (${c.field}, row ${c.row})`, PROV_FILE)));
  }
  const caption = h("caption", {},
    fileLink(e.file, PROV_FILE), " · ",
    cite(e.investigation, ctx.api.experiment(e.investigation)?.psi_url ?? "#"), " · ",
    ...linkedFile(t("ui.dash.method.rows-line", { read: e.rows_read, mapped: e.rows_mapped }), [
      { text: String(e.rows_read), file: PROV_FILE },
      { text: String(e.rows_mapped), file: PROV_FILE },
    ]));
  const th = (key: string, num: boolean): HTMLElement =>
    h("th", num ? { scope: "col", class: "num" } : { scope: "col" }, t(key));
  return h("div", {},
    h("table", { class: "dash-prov" }, caption,
      h("thead", {}, h("tr", {}, ...head.map(([k, num]) => th(k, num)))),
      h("tbody", {}, ...body)),
    ...lines);
}

function skippedTable(ctx: Ctx, entries: ProvEntry[]): HTMLElement {
  const { t } = ctx;
  return h("table", { class: "dash-prov" },
    h("caption", {}, t("ui.dash.method.skipped")),
    h("thead", {}, h("tr", {},
      h("th", { scope: "col" }, t("ui.dash.method.col.file")),
      h("th", { scope: "col" }, t("ui.dash.method.col.investigation")),
      h("th", { scope: "col", class: "num" }, t("ui.dash.method.col.rows")),
      h("th", { scope: "col" }, t("ui.dash.method.col.reason")))),
    h("tbody", {}, ...entries.map((e) => h("tr", {},
      h("td", {}, fileLink(e.file, PROV_FILE)),
      h("td", {}, cite(e.investigation, ctx.api.experiment(e.investigation)?.psi_url ?? "#")),
      h("td", { class: "num" }, fileLink(String(e.rows_read), PROV_FILE)),
      h("td", {}, fileSentence(e.reason ?? "", PROV_FILE))))));
}

function coverageSection(ctx: Ctx, c: CovDoc): HTMLElement {
  const { t } = ctx;
  const caption = h("caption", {},
    ...linkedFile(t("ui.stage.coverage", { plotted: c.plotted, total: c.total }), [
      { text: String(c.plotted), file: COV_FILE },
      { text: String(c.total), file: COV_FILE },
    ]));
  return h("section", { class: "dash-coverage", "aria-labelledby": "dash-coverage-title" },
    h("h3", { id: "dash-coverage-title" }, t("ui.dash.method.coverage")),
    h("p", {}, t("ui.dash.method.plotted-rule")),
    h("table", { class: "dash-table" }, caption,
      h("thead", {}, h("tr", {},
        h("th", { scope: "col" }, t("ui.dash.method.col.reason")),
        h("th", { scope: "col", class: "num" }, t("ui.dash.method.col.tests")))),
      h("tbody", {}, ...Object.entries(c.by_reason).map(([reason, n]) => h("tr", {},
        h("td", {}, fileSentence(reason, COV_FILE)),
        h("td", { class: "num" }, fileLink(String(n), COV_FILE)))))));
}

function checksSection(ctx: Ctx, d: MethodData): HTMLElement {
  const { t, api } = ctx;
  const rows: [string, string, (Node | string)[]][] = [];
  // R5: no digit-run figure ("1,129" would count twice); the audit row stays without one
  rows.push([t("ui.dash.method.check.numbers"), t("ui.dash.method.check.numbers-what"), []]);
  const withSummary = api.data.experiments.filter((e) => e.summary);
  const quotes = withSummary.reduce((n, e) => n + (e.summary?.quotes.length ?? 0), 0);
  const libCount = d.library?.length ?? 0;
  rows.push([t("ui.dash.method.check.ai"), t("ui.dash.method.check.ai-what"),
    [...linkedFile(t("ui.dash.method.check.ai-count",
      { summaries: withSummary.length, quotes, stories: libCount }), [
      { text: String(withSummary.length), file: TESTS_FILE },
      { text: String(quotes), file: TESTS_FILE },
      { text: String(libCount), file: LIB_FILE },
    ])]]);
  const dictCount = d.dictionary?.length ?? 0;
  rows.push([t("ui.dash.method.check.schema"), t("ui.dash.method.check.schema-what"),
    [...linkedFile(t("ui.dash.method.check.schema-count", { n: dictCount }), [
      { text: String(dictCount), file: DICT_FILE },
    ])]]);
  return h("section", { class: "dash-checks", "aria-labelledby": "dash-checks-title" },
    h("h3", { id: "dash-checks-title" }, t("ui.dash.method.checks")),
    h("ul", { class: "dash-check-list" }, ...rows.map(([name, what, count]) =>
      h("li", {}, h("p", { class: "dash-check-name" }, name), h("p", {}, what), ...(count.length ? [h("p", {}, ...count)] : [])))));
}

function aiSection(ctx: Ctx, d: MethodData): HTMLElement | null {
  const { t, api } = ctx;
  const byModel = new Map<string, { summaries: number; quotes: number }>();
  for (const e of api.data.experiments) {
    if (!e.summary) continue;
    const hit = byModel.get(e.summary.model) ?? { summaries: 0, quotes: 0 };
    hit.summaries += 1;
    hit.quotes += e.summary.quotes.length;
    byModel.set(e.summary.model, hit);
  }
  const rows: HTMLElement[] = [];
  for (const [model, s] of byModel) {
    rows.push(h("tr", {},
      h("td", {}, fileLink(model, TESTS_FILE)),
      h("td", {}, ...linkedFile(t("ui.dash.method.ai-exp", { summaries: s.summaries, quotes: s.quotes }), [
        { text: String(s.summaries), file: TESTS_FILE },
        { text: String(s.quotes), file: TESTS_FILE },
      ]))));
  }
  const libModels = new Map<string, number>();
  for (const s of d.library ?? []) libModels.set(s.ai.model, (libModels.get(s.ai.model) ?? 0) + 1);
  for (const [model, n] of libModels) {
    rows.push(h("tr", {},
      h("td", {}, fileLink(model, LIB_FILE)),
      h("td", {}, ...linkedFile(t("ui.dash.method.ai-lib", { stories: n }), [
        { text: String(n), file: LIB_FILE },
      ]))));
  }
  const metas: [string, TransMeta | null][] = [["data/es.meta.json", d.esMeta], ["data/hi.meta.json", d.hiMeta]];
  for (const [file, m] of metas) {
    if (!m) continue;
    rows.push(h("tr", {},
      h("td", {}, fileLink(m.model, file)),
      h("td", {}, ...linkedFile(t("ui.dash.method.ai-tr", { file, keys: m.keys, made_at: m.made_at }), [
        { text: file, file },
        { text: String(m.keys), file },
        { text: m.made_at, file },
      ]))));
  }
  if (rows.length === 0) return null;
  return h("section", { class: "dash-ai", "aria-labelledby": "dash-ai-title" },
    h("h3", { id: "dash-ai-title" }, t("ui.dash.method.ai")),
    h("table", { class: "dash-table" },
      h("thead", {}, h("tr", {},
        h("th", { scope: "col" }, t("ui.dash.method.col.model")),
        h("th", { scope: "col" }, t("ui.dash.method.col.texts")))),
      h("tbody", {}, ...rows)),
    h("p", { class: "dash-rule", "data-own": true }, t("ui.dash.method.ai-note")));
}

function dictionarySection(ctx: Ctx, entries: DictEntry[]): HTMLElement {
  const { t } = ctx;
  const byFile = new Map<string, DictEntry[]>();
  for (const e of entries) {
    const list = byFile.get(e.file) ?? [];
    list.push(e);
    byFile.set(e.file, list);
  }
  const rows = [...byFile].map(([file, es]) => {
    const full = es.filter((e) => e.non_null === e.records).length;
    return h("tr", {},
      h("td", {}, fileLink(file, `data/${file}`)),
      h("td", { class: "num" }, ...linkedFile(t("ui.dash.method.dict-fields", { n: es.length }), [
        { text: String(es.length), file: DICT_FILE },
      ])),
      h("td", { class: "num" }, ...linkedFile(t("ui.dash.method.dict-full", { n: full }), [
        { text: String(full), file: DICT_FILE },
      ])));
  });
  return h("section", { class: "dash-dictionary", "aria-labelledby": "dash-dictionary-title" },
    h("h3", { id: "dash-dictionary-title" }, t("ui.dash.method.dictionary")),
    h("table", { class: "dash-table" },
      h("thead", {}, h("tr", {},
        h("th", { scope: "col" }, t("ui.dash.method.col.file")),
        h("th", { scope: "col", class: "num" }, t("ui.dash.method.col.fields")),
        h("th", { scope: "col", class: "num" }, t("ui.dash.method.col.full")))),
      h("tbody", {}, ...rows)));
}

const DATA_FILES = ["tests.json", "experiments.json", "moments.json", "library.json", "search.json",
  "coverage.json", "provenance.json", "dictionary.json", "psi-text.json", "moon.json", "incidents.json",
  "es.meta.json", "hi.meta.json"];
const SCHEMA_FILES = ["curated.schema.json", "experiments.schema.json", "library.schema.json",
  "moments.schema.json", "psi-text.schema.json", "story.schema.json", "tests.schema.json"];

function downloadsSection(ctx: Ctx): HTMLElement {
  const { t } = ctx;
  const dl = (f: string): HTMLElement =>
    h("li", {}, h("a", { href: `data/${f}`, download: true }, f));
  return h("section", { class: "dash-downloads", "aria-labelledby": "dash-downloads-title" },
    h("h3", { id: "dash-downloads-title" }, t("ui.dash.method.downloads")),
    h("p", {}, t("ui.dash.method.downloads-data")),
    h("ul", { class: "dash-downloads" }, ...DATA_FILES.map(dl)),
    h("p", {}, t("ui.dash.method.downloads-contracts")),
    h("ul", { class: "dash-downloads" }, ...SCHEMA_FILES.map(dl)));
}

export function renderMethod(ctx: Ctx): { element: HTMLElement; loaded: Promise<void> } {
  const { t } = ctx;
  const root = h("section", { class: "dash-method", "aria-label": t("ui.dash.method.title") },
    h("h3", { class: "dash-method-title" }, t("ui.dash.method.title")));
  const loaded = loadMethodData().then((d) => {
    if (!root.isConnected) return;
    for (const file of d.errors) {
      root.append(h("p", { class: "dash-load-error" }, t("ui.dash.method.load-error", { file })));
    }
    const kids: HTMLElement[] = [];
    if (d.provenance) {
      const mapped = d.provenance.filter((e) => e.mapped);
      const skipped = d.provenance.filter((e) => !e.mapped);
      kids.push(h("section", { class: "dash-provenance", "aria-labelledby": "dash-provenance-title" },
        h("h3", { id: "dash-provenance-title" }, t("ui.dash.method.provenance")),
        ...mapped.map((e) => provTable(ctx, e)),
        ...(skipped.length > 0 ? [skippedTable(ctx, skipped)] : [])));
    }
    if (d.coverage) kids.push(coverageSection(ctx, d.coverage));
    kids.push(checksSection(ctx, d));
    const ai = aiSection(ctx, d);
    if (ai) kids.push(ai);
    if (d.dictionary) kids.push(dictionarySection(ctx, d.dictionary));
    kids.push(downloadsSection(ctx));
    root.append(...kids);
  });
  return { element: root, loaded };
}

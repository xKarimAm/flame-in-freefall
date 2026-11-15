// The experiment library: one page per story from one template (task 9).
// Generated with Muse Spark, SI-assisted.
import { OUTCOME_GROUP, type Ctx, type OutcomeGroup } from "../contract";
import { DATA_URL_BASE } from "../data/index";
import { cite, dataLink, h, numOrMissing, safeHref } from "./dom";

export type Signature = "condition-map" | "sample-wall" | "outcome-strip" | "paper-trail";

export interface LibraryAi {
  model: string;
  made_at: string;
}

export interface LibraryEngineer {
  text: string;
  quote: string;
}

export interface LibraryStory {
  id: string;
  investigations: string[];
  title: string;
  voice: string;
  /** Safety-application text drafted from the PSI record; null until the backend writes it. */
  engineer: LibraryEngineer | null;
  core: { quote: string; investigation: string };
  signature: Signature;
  hook: string;
  reveal: string;
  bridge: string;
  moments: string[];
  ai: LibraryAi;
}

export interface LibraryMoment {
  id: string;
  investigation: string;
  kind: string;
  label: string;
  value: number;
  value_max?: number | null;
  unit: string;
  url: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown, what: string): string {
  if (typeof v !== "string" || !v) throw new Error(`invalid library.json: ${what} is not a string`);
  return v;
}

const SIGNATURES: readonly string[] = ["condition-map", "sample-wall", "outcome-strip", "paper-trail"];

/** Shape-checked stories: every number the page shows comes from moments or the data API, never from here. */
export function parseLibrary(json: unknown): LibraryStory[] {
  if (!Array.isArray(json)) throw new Error("invalid library.json: not an array");
  return json.map((s, i) => {
    if (!isRecord(s)) throw new Error(`invalid library.json: story ${i} is not an object`);
    if (!Array.isArray(s["investigations"]) || !s["investigations"].every((x) => typeof x === "string" && x))
      throw new Error(`invalid library.json: story ${i} has no investigations`);
    if (!isRecord(s["core"]) || typeof s["core"]["quote"] !== "string" || typeof s["core"]["investigation"] !== "string")
      throw new Error(`invalid library.json: story ${i} has no core quote`);
    if (!isRecord(s["ai"]) || typeof s["ai"]["model"] !== "string" || typeof s["ai"]["made_at"] !== "string")
      throw new Error(`invalid library.json: story ${i} has no ai tag`);
    if (!Array.isArray(s["moments"]) || !s["moments"].every((x) => typeof x === "string"))
      throw new Error(`invalid library.json: story ${i} has no moments`);
    if (!SIGNATURES.includes(s["signature"] as string))
      throw new Error(`invalid library.json: story ${i} has an unknown signature`);
    let engineer: LibraryEngineer | null = null;
    if (s["engineer"] != null) {
      if (!isRecord(s["engineer"])) throw new Error(`invalid library.json: story ${i} has a bad engineer`);
      engineer = {
        text: str(s["engineer"]["text"], `story ${i} engineer text`),
        quote: str(s["engineer"]["quote"], `story ${i} engineer quote`),
      };
    }
    return {
      id: str(s["id"], `story ${i} id`),
      investigations: s["investigations"] as string[],
      title: str(s["title"], `story ${i} title`),
      voice: str(s["voice"], `story ${i} voice`),
      engineer,
      core: { quote: s["core"]["quote"] as string, investigation: s["core"]["investigation"] as string },
      signature: s["signature"] as Signature,
      hook: str(s["hook"], `story ${i} hook`),
      reveal: str(s["reveal"], `story ${i} reveal`),
      bridge: str(s["bridge"], `story ${i} bridge`),
      moments: s["moments"] as string[],
      ai: { model: s["ai"]["model"] as string, made_at: s["ai"]["made_at"] as string },
    };
  });
}

export function parseMoments(json: unknown): LibraryMoment[] {
  if (!Array.isArray(json)) throw new Error("invalid moments.json: not an array");
  return json.map((m, i) => {
    if (!isRecord(m)) throw new Error(`invalid moments.json: moment ${i} is not an object`);
    if (typeof m["value"] !== "number" || typeof m["label"] !== "string" || typeof m["url"] !== "string")
      throw new Error(`invalid moments.json: moment ${i} has no value, label or url`);
    if (m["value_max"] != null && typeof m["value_max"] !== "number")
      throw new Error(`invalid moments.json: moment ${i} has a bad value_max`);
    return {
      id: str(m["id"], `moment ${i} id`),
      investigation: typeof m["investigation"] === "string" ? m["investigation"] : "",
      kind: typeof m["kind"] === "string" ? m["kind"] : "",
      label: m["label"] as string,
      value: m["value"] as number,
      value_max: (m["value_max"] ?? null) as number | null,
      unit: typeof m["unit"] === "string" ? m["unit"] : "",
      url: m["url"] as string,
    };
  });
}

export async function loadLibrary(fetchFn: typeof fetch = fetch): Promise<{ stories: LibraryStory[]; moments: LibraryMoment[] }> {
  const [ls, ms] = await Promise.all([
    fetchFn(`${DATA_URL_BASE}/library.json`).then((r) => {
      if (!r.ok) throw new Error(`could not load library.json: ${r.status}`);
      return r.json();
    }),
    fetchFn(`${DATA_URL_BASE}/moments.json`).then((r) => {
      if (!r.ok) throw new Error(`could not load moments.json: ${r.status}`);
      return r.json();
    }),
  ]);
  return { stories: parseLibrary(ls), moments: parseMoments(ms) };
}

/** Integers plain, others trimmed to two decimals: the value stays the moment's own. */
function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(2)));
}

const SVGNS = "http://www.w3.org/2000/svg";

function svgEl(tag: string, attrs: Record<string, string> = {}, text?: string): SVGElement {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text !== undefined) el.textContent = text;
  return el;
}

/** A count caption linked to the built tests file (a download, never a data URL). */
function countCaption(text: string): HTMLAnchorElement {
  const a = dataLink(text);
  a.className = "num";
  return a;
}

function momentById(moments: LibraryMoment[], id: string): LibraryMoment {
  const m = moments.find((x) => x.id === id);
  if (!m) throw new Error(`library story cites unknown moment ${id}`);
  return m;
}

/** Oxygen by pressure: one dot per placed test of the story's investigations. Word axes, no tick digits. */
function conditionMap(story: LibraryStory, ctx: Ctx): HTMLElement {
  const { t } = ctx;
  const pts = ctx.api.placed().filter((p) => story.investigations.includes(p.investigation));
  const wrap = h("div", { class: "lib-sig" });
  if (!pts.length) return wrap;
  // the story's own control: pick an outcome to light its dots, with the counts beside it
  const present = ["burned", "went-out", "other"].filter((g): g is OutcomeGroup =>
    pts.some((p) => OUTCOME_GROUP[p.outcome] === g),
  );
  let lit: OutcomeGroup | null = null;
  const dots: SVGElement[] = [];
  const result = h("p", { class: "lib-outcome-count" });
  result.setAttribute("aria-live", "polite");
  const paint = (): void => {
    const n = lit === null ? pts.length : pts.filter((p) => OUTCOME_GROUP[p.outcome] === lit).length;
    for (const d of dots) {
      const on = lit === null || OUTCOME_GROUP[pts[Number(d.getAttribute("data-i"))]!.outcome] === lit;
      d.classList.toggle("dim", !on);
    }
    result.replaceChildren();
    if (lit === null) return;
    const dl = (v: number): HTMLAnchorElement => {
      const a = dataLink(String(v));
      a.className = "num";
      return a;
    };
    result.append(dl(n), ` of `, dl(pts.length), ` dots ${t(`ui.stage.legend.${lit}`)}.`);
  };
  const bar = h("div", { class: "lib-outcomes", role: "group", "aria-label": t("ui.library.outcome.all") });
  const all = h("button", { type: "button", class: "btn" }, t("ui.library.outcome.all"));
  all.setAttribute("aria-pressed", "true");
  all.addEventListener("click", () => {
    lit = null;
    for (const b of bar.querySelectorAll("button")) b.setAttribute("aria-pressed", String(b === all));
    paint();
  });
  bar.append(all);
  for (const g of present) {
    const b = h("button", { type: "button", class: "btn" }, t(`ui.stage.legend.${g}`));
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => {
      lit = g;
      for (const x of bar.querySelectorAll("button")) x.setAttribute("aria-pressed", String(x === b));
      paint();
    });
    bar.append(b);
  }
  wrap.append(bar);
  const W = 320;
  const H = 240;
  const pad = { l: 44, r: 8, t: 8, b: 30 };
  const xs = pts.map((p) => p.pressure_kpa);
  const ys = pts.map((p) => p.o2_pct);
  let x0 = Math.min(...xs);
  let x1 = Math.max(...xs);
  let y0 = Math.min(...ys);
  let y1 = Math.max(...ys);
  if (x0 === x1) {
    x0 -= 1;
    x1 += 1;
  }
  if (y0 === y1) {
    y0 -= 1;
    y1 += 1;
  }
  const X = (v: number): number => pad.l + ((v - x0) / (x1 - x0)) * (W - pad.l - pad.r);
  const Y = (v: number): number => pad.t + (1 - (v - y0) / (y1 - y0)) * (H - pad.t - pad.b);
  const svg = svgEl("svg", { class: "lib-map", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": t("ui.library.map-label") });
  svg.append(
    svgEl("text", { class: "lib-axis", x: String((pad.l + W - pad.r) / 2), y: String(H - 8), "text-anchor": "middle" }, t("ui.stage.x-axis")),
    svgEl(
      "text",
      { class: "lib-axis", transform: `translate(12 ${(pad.t + H - pad.b) / 2}) rotate(-90)`, "text-anchor": "middle" },
      t("ui.stage.y-axis"),
    ),
  );
  pts.forEach((p, i) => {
    const c = svgEl("circle", { class: "lib-dot", cx: X(p.pressure_kpa).toFixed(1), cy: Y(p.o2_pct).toFixed(1), r: "3.5", "data-id": p.id, "data-i": String(i) });
    c.append(
      svgEl(
        "title",
        {},
        t("ui.stage.dot-title", {
          fuel: p.fuel ?? t("ui.stage.no-fuel"),
          o2: p.o2_pct,
          pressure: p.pressure_kpa,
          outcome: p.outcome,
        }),
      ),
    );
    svg.append(c);
    dots.push(c);
  });
  wrap.append(svg);
  wrap.append(h("p", { class: "lib-sig-caption" }, countCaption(t("ui.stage.parade.plotted", { n: pts.length }))));
  wrap.append(result);
  return wrap;
}

/** One card per test row: fuel, oxygen, pressure, flow, outcome as recorded, each row with its PSI link. */
function sampleWall(story: LibraryStory, ctx: Ctx): HTMLElement {
  const { t } = ctx;
  const rows = ctx.api.data.tests
    .filter((row) => story.investigations.includes(row.investigation))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const wrap = h("div", { class: "lib-sig" });
  wrap.append(h("p", { class: "lib-sig-caption" }, countCaption(t("ui.sheet.tests-caption", { n: rows.length }))));
  // the story's own control: sort the samples by burn time or oxygen, first value said aloud
  const sortable = (["burn", "oxygen"] as const).filter((f) => {
    const vals = rows.map((r) => (f === "burn" ? r.burn_time_s : r.o2_pct));
    return vals.filter((v) => v != null).length >= 2;
  });
  let sorter: HTMLSelectElement | null = null;
  let sortResult: HTMLElement | null = null;
  if (rows.length > 1 && sortable.length) {
    sorter = h("select", { class: "sort-samples", "aria-label": t("ui.library.sort-by") });
    sortResult = h("p", { class: "lib-sort-result" });
    sortResult.setAttribute("aria-live", "polite");
    sorter.append(h("option", { value: "" }, t("ui.library.sort-by")));
    if (sortable.includes("burn")) sorter.append(h("option", { value: "burn" }, t("ui.library.burn")));
    if (sortable.includes("oxygen")) sorter.append(h("option", { value: "oxygen" }, t("ui.nearest.oxygen")));
    sorter.addEventListener("change", () => {
      const f = sorter!.value as "burn" | "oxygen";
      if (!f) return;
      const val = (r: (typeof rows)[number]): number | null => (f === "burn" ? r.burn_time_s ?? null : r.o2_pct ?? null);
      const cards = [...list.querySelectorAll("li.lib-card")];
      cards
        .sort((a, b) => {
          const va = val(rows[Number(a.getAttribute("data-i"))]!);
          const vb = val(rows[Number(b.getAttribute("data-i"))]!);
          if (va === null) return 1;
          if (vb === null) return -1;
          return vb - va;
        })
        .forEach((li) => list.append(li));
      const firstLi = [...list.querySelectorAll("li.lib-card")].map((li) => rows[Number(li.getAttribute("data-i"))]!).find((r) => val(r) != null)!;
      const unit = f === "burn" ? "s" : "%";
      sortResult!.replaceChildren();
      sortResult!.append(
        `${t("ui.library.sorted-by")} `,
        f === "burn" ? t("ui.library.burn") : t("ui.nearest.oxygen"),
        ": ",
        cite(`${fmt(val(firstLi)!)} ${unit}`, firstLi.source.url, "num"),
        t("ui.library.sorted-first"),
      );
    });
    const row = h("p", { class: "lib-sort" });
    row.append(h("label", {}, t("ui.library.sort-by"), " "), sorter);
    wrap.append(row);
  }
  const list = h("ul", { class: "lib-cards" });
  rows.forEach((r, i) => {
    list.append(
      h(
        "li",
        { class: "lib-card", "data-i": String(i) },
        cite(r.id, r.source.url, "plain"),
        h(
          "span",
          { class: "lib-row" },
          r.fuel ? cite(r.fuel, r.source.url, "num fuel") : t("ui.nearest.fuel-unknown"),
          `; ${t("ui.nearest.oxygen")} `,
          numOrMissing(t, r.o2_pct, 1, t("ui.panel.unit.pct"), r.source.url),
          `; ${t("ui.nearest.pressure")} `,
          numOrMissing(t, r.pressure_kpa, 1, t("ui.panel.unit.kpa"), r.source.url),
          `; ${t("ui.nearest.flow")} `,
          numOrMissing(t, r.flow_cm_s ?? null, 1, "cm/s", r.source.url),
          `; ${t("ui.nearest.outcome")} `,
          t(`ui.outcome.${r.outcome}`),
        ),
      ),
    );
  });
  wrap.append(list);
  if (sortResult) wrap.append(sortResult);
  return wrap;
}

type StripVar = { field: "o2_pct" | "pressure_kpa" | "flow_cm_s"; labelKey: string; unitKey: string | null };

/** One mark per row along the one recorded variable: the first *-range moment names it.
 *  A row with a single value is a vertical tick; a row with only a range (FLEX-2 oxygen)
 *  is a horizontal bar from its recorded min to its recorded max. Nothing is averaged or guessed. */
function outcomeStrip(story: LibraryStory, moments: LibraryMoment[], ctx: Ctx): HTMLElement {
  const { t } = ctx;
  const wrap = h("div", { class: "lib-sig" });
  let picked: StripVar | null = null;
  let pickedMoment: LibraryMoment | null = null;
  for (const id of story.moments) {
    const m = momentById(moments, id);
    if (m.kind === "o2-range") picked = { field: "o2_pct", labelKey: "ui.panel.o2", unitKey: "ui.panel.unit.pct" };
    else if (m.kind === "pressure-range")
      picked = { field: "pressure_kpa", labelKey: "ui.panel.pressure", unitKey: "ui.panel.unit.kpa" };
    else if (m.kind === "flow-range") picked = { field: "flow_cm_s", labelKey: "ui.nearest.flow", unitKey: null };
    if (picked) {
      pickedMoment = m;
      break;
    }
  }
  if (!picked || !pickedMoment) return wrap;
  const v = picked;
  const momentUrl = pickedMoment.url;
  type Mark = { row: (typeof ctx.api.data.tests)[number]; lo: number; hi: number; point: boolean };
  const marks: Mark[] = [];
  for (const row of ctx.api.data.tests) {
    if (!story.investigations.includes(row.investigation)) continue;
    const single = row[v.field];
    if (single != null) marks.push({ row, lo: single, hi: single, point: true });
    else if (v.field === "o2_pct" && row.o2_pct_min != null && row.o2_pct_max != null)
      marks.push({ row, lo: row.o2_pct_min, hi: row.o2_pct_max, point: false });
  }
  if (!marks.length) return wrap;
  let lo = Math.min(...marks.map((m) => m.lo));
  let hi = Math.max(...marks.map((m) => m.hi));
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const W = 320;
  const H = 64;
  const X = (n: number): number => 12 + ((n - lo) / (hi - lo)) * (W - 24);
  const svg = svgEl("svg", { class: "lib-strip", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": t("ui.library.strip-label") });
  svg.append(svgEl("line", { class: "lib-rail", x1: "12", x2: String(W - 12), y1: "20", y2: "20" }));
  for (const m of marks) {
    const mark = m.point
      ? svgEl("line", { class: "lib-mark", x1: X(m.lo).toFixed(1), x2: X(m.lo).toFixed(1), y1: "12", y2: "28", "data-id": m.row.id })
      : svgEl("line", { class: "lib-mark lib-range", x1: X(m.lo).toFixed(1), x2: X(m.hi).toFixed(1), y1: "20", y2: "20", "data-id": m.row.id });
    mark.append(svgEl("title", {}, m.point ? `${m.row.id}: ${fmt(m.lo)}` : `${m.row.id}: ${fmt(m.lo)} to ${fmt(m.hi)}`));
    svg.append(mark);
  }
  const axisLabel = v.unitKey ? `${t(v.labelKey)} (${t(v.unitKey)})` : `${t(v.labelKey)} (cm/s)`;
  svg.append(svgEl("text", { class: "lib-axis", x: String(W / 2), y: "48", "text-anchor": "middle" }, axisLabel));
  wrap.append(svg);
  wrap.append(h("p", { class: "lib-sig-caption" }, countCaption(t("ui.library.strip-count", { n: marks.length }))));
  // the story's own control: drag along the recorded variable; the nearest tests read out beside it
  const unit = v.unitKey ? t(v.unitKey) : "cm/s";
  const drag = h("input", { class: "lib-strip-range", type: "range", "aria-label": axisLabel }) as HTMLInputElement;
  drag.min = String(lo);
  drag.max = String(hi);
  drag.step = String(Math.max((hi - lo) / 100, 0.01));
  drag.value = String((lo + hi) / 2);
  const result = h("p", { class: "lib-strip-result" });
  result.setAttribute("aria-live", "polite");
  const read = (): void => {
    const at = Number(drag.value);
    const dist = (m: Mark): number => (at < m.lo ? m.lo - at : at > m.hi ? at - m.hi : 0);
    const best = Math.min(...marks.map(dist));
    const near = marks.filter((m) => dist(m) === best);
    for (const line of svg.querySelectorAll("line.lib-mark")) {
      line.classList.toggle("lib-near", near.some((m) => m.row.id === line.getAttribute("data-id")));
      line.classList.toggle("dim", !near.some((m) => m.row.id === line.getAttribute("data-id")));
    }
    result.replaceChildren();
    result.append(cite(`${fmt(at)} ${unit}`, momentUrl, "num"), ": ");
    near.forEach((m, i) => {
      if (i) result.append(", ");
      result.append(cite(m.row.id, m.row.source.url, "num"));
    });
    result.append(".");
  };
  drag.addEventListener("input", read);
  wrap.append(drag);
  wrap.append(result);
  read();
  return wrap;
}

/** The publication list: every paper of the story's investigations, each linked to its DOI or PSI page. */
function paperTrail(story: LibraryStory, ctx: Ctx): HTMLElement {
  const { t } = ctx;
  const wrap = h("div", { class: "lib-sig" });
  const list = h("ul", { class: "lib-papers" });
  const pubs: { year: number | null; li: HTMLElement }[] = [];
  for (const id of story.investigations) {
    const e = ctx.api.experiment(id);
    for (const p of e?.publications ?? []) {
      const href = p.doi ? safeHref(`https://doi.org/${p.doi}`) : (e?.psi_url ?? "");
      const line = `${p.title}${p.authors ? ` — ${p.authors}` : ""}${p.year ? `, ${p.year}` : ""}`;
      const li = h("li", {}, href ? cite(line, href, "plain") : line);
      list.append(li);
      pubs.push({ year: typeof p.year === "number" ? p.year : null, li });
    }
  }
  // the story's own control: filter the publications by year. Years come from the
  // records, so with no year on any paper there is no filter, only the plain list.
  const years = [...new Set(pubs.map((p) => p.year).filter((y): y is number => y !== null))].sort((a, b) => b - a);
  if (pubs.length && years.length) {
    const result = h("p", { class: "lib-year-result" });
    result.setAttribute("aria-live", "polite");
    const paint = (year: number | null): void => {
      const shown = pubs.filter((p) => year === null || p.year === year);
      for (const p of pubs) p.li.hidden = year !== null && p.year !== year;
      result.textContent = year === null
        ? t("ui.library.pubs", { n: shown.length })
        : t("ui.library.year-count", { n: shown.length, year });
    };
    const bar = h("div", { class: "lib-years", role: "group", "aria-label": t("ui.library.years") });
    const all = h("button", { type: "button", class: "btn" }, t("ui.library.years"));
    all.setAttribute("aria-pressed", "true");
    all.addEventListener("click", () => {
      for (const b of bar.querySelectorAll("button")) b.setAttribute("aria-pressed", String(b === all));
      paint(null);
    });
    bar.append(all);
    for (const y of years) {
      const b = h("button", { type: "button", class: "btn" }, String(y));
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => {
        for (const x of bar.querySelectorAll("button")) x.setAttribute("aria-pressed", String(x === b));
        paint(y);
      });
      bar.append(b);
    }
    wrap.append(bar);
    wrap.append(result);
    paint(null);
  }
  wrap.append(list);
  return wrap;
}

function signatureView(story: LibraryStory, moments: LibraryMoment[], ctx: Ctx): HTMLElement {
  switch (story.signature) {
    case "condition-map":
      return conditionMap(story, ctx);
    case "sample-wall":
      return sampleWall(story, ctx);
    case "outcome-strip":
      return outcomeStrip(story, moments, ctx);
    case "paper-trail":
      return paperTrail(story, ctx);
  }
}

function aiTag(story: LibraryStory, t: Ctx["t"]): HTMLElement {
  return h(
    "p",
    { class: "lib-ai", "data-own": true },
    h("span", { class: "ai-tag" }, t("ui.sheet.detail.summary")),
    " ",
    t("ui.sheet.detail.summary-by", { model: story.ai.model, made_at: story.ai.made_at }),
  );
}

/** The story's first moment as one large linked number with its label; null with no moments. */
function bigMoment(story: LibraryStory, moments: LibraryMoment[]): HTMLElement | null {
  if (!story.moments.length) return null;
  const m = momentById(moments, story.moments[0]);
  const value = m.value_max == null ? `${fmt(m.value)} ${m.unit}`.trim() : `${fmt(m.value)} to ${fmt(m.value_max)} ${m.unit}`.trim();
  // value and label share one link to the PSI row, as the moments list did: names like
  // FLEX-2 carry digits, and every digit on the page stays inside a link or provenance
  const a = h("a", { class: "num", href: safeHref(m.url), target: "_blank", rel: "noopener" });
  a.append(h("span", { class: "lib-bignum-value" }, value), h("span", { class: "lib-bignum-label" }, m.label));
  return h("p", { class: "lib-bignum" }, a);
}

/** One compact table row per moment of the story: the condition and the measured value. */
function conditionsTable(story: LibraryStory, moments: LibraryMoment[]): HTMLElement {
  const body = h("tbody", {});
  for (const id of story.moments) {
    const m = momentById(moments, id);
    const value = m.value_max == null ? `${fmt(m.value)} ${m.unit}`.trim() : `${fmt(m.value)} to ${fmt(m.value_max)} ${m.unit}`.trim();
    body.append(
      h("tr", {}, h("th", { scope: "row" }, cite(m.label, m.url, "plain")), h("td", {}, cite(value, m.url, "num"))),
    );
  }
  const table = h("table", { class: "lib-conditions" });
  table.append(h("caption", { class: "lib-moments-title" }, ""), body);
  return table;
}

/** Oxygen, pressure and flow as words: which of them no test row of the story recorded. */
function unrecordedFields(story: LibraryStory, ctx: Ctx): string[] {
  const rows = ctx.api.data.tests.filter((row) => story.investigations.includes(row.investigation));
  const out: string[] = [];
  if (!rows.some((row) => row.o2_pct != null)) out.push(ctx.t("ui.nearest.oxygen"));
  if (!rows.some((row) => row.pressure_kpa != null)) out.push(ctx.t("ui.nearest.pressure"));
  if (!rows.some((row) => row.flow_cm_s != null)) out.push(ctx.t("ui.nearest.flow"));
  return out;
}

function psiLink(story: LibraryStory, ctx: Ctx): HTMLElement | null {
  const exp = ctx.api.experiment(story.core.investigation);
  return exp ? cite(ctx.t("ui.sheet.detail.psi-link"), exp.psi_url, "plain") : null;
}

/** Public: the signature view first, the hook, one moment as a large number, the bridge. */
function renderPublic(story: LibraryStory, moments: LibraryMoment[], ctx: Ctx): HTMLElement {
  const { t } = ctx;
  const page = h("article", { class: "lib-page", "data-story": story.id });
  page.append(h("h3", { class: "lib-title" }, story.title));
  page.append(signatureView(story, moments, ctx));
  page.append(h("p", { class: "lib-voice" }, t("ui.library.voice", { voice: story.voice })));
  page.append(h("p", { class: "lib-hook" }, story.hook));
  const big = bigMoment(story, moments);
  if (big) page.append(big);
  page.append(h("p", { class: "lib-bridge" }, story.bridge));
  page.append(aiTag(story, t));
  return page;
}

/** Astronaut: a crew briefing from the engineer text, the tested conditions, the gaps, the PSI link. */
function renderBriefing(story: LibraryStory, moments: LibraryMoment[], ctx: Ctx): HTMLElement {
  const { t } = ctx;
  const page = h("article", { class: "lib-page", "data-story": story.id });
  page.append(h("h3", { class: "lib-title" }, story.title));
  page.append(h("p", { class: "lib-voice" }, t("ui.library.voice", { voice: story.voice })));
  page.append(h("h4", { class: "lib-crew lib-moments-title" }, t("ui.library.crew")));
  if (story.engineer) {
    page.append(h("p", { class: "lib-crew-text" }, story.engineer.text));
    page.append(h("blockquote", { class: "lib-quote" }, story.engineer.quote));
  } else {
    page.append(h("p", { class: "lib-crew-text" }, t("ui.library.no-safety")));
  }
  const table = conditionsTable(story, moments);
  table.querySelector("caption")!.textContent = t("ui.library.conditions");
  page.append(table);
  const missing = unrecordedFields(story, ctx);
  if (missing.length) page.append(h("p", { class: "lib-unrecorded" }, t("ui.library.unrecorded", { fields: missing.join(", ") })));
  const link = psiLink(story, ctx);
  if (link) page.append(h("p", { class: "lib-psi" }, link));
  page.append(aiTag(story, t));
  return page;
}

/** Analyst: the test rows, then the signature view. */
function renderAnalyst(story: LibraryStory, moments: LibraryMoment[], ctx: Ctx): HTMLElement {
  const { t } = ctx;
  const page = h("article", { class: "lib-page", "data-story": story.id });
  page.append(h("h3", { class: "lib-title" }, story.title));
  page.append(h("p", { class: "lib-voice" }, t("ui.library.voice", { voice: story.voice })));
  page.append(sampleWall(story, ctx));
  page.append(signatureView(story, moments, ctx));
  page.append(aiTag(story, t));
  return page;
}

/** One page per story, read differently per lens; every number stays linked to its PSI row. */
export function renderLibraryPage(story: LibraryStory, moments: LibraryMoment[], ctx: Ctx): HTMLElement {
  const lens = ctx.store.get().lens;
  if (lens === "astronaut") return renderBriefing(story, moments, ctx);
  if (lens === "analyst") return renderAnalyst(story, moments, ctx);
  return renderPublic(story, moments, ctx);
}

/** The library shelf: one button per story. */
export function renderLibraryList(stories: LibraryStory[], ctx: Ctx, onOpen: (id: string) => void): HTMLElement {
  const list = h("div", { class: "lib-list" });
  for (const s of stories) {
    const card = h(
      "button",
      { type: "button", class: "library-card" },
      h("span", { class: "story-title" }, s.title),
      h("span", { class: "story-voice" }, ctx.t("ui.library.voice", { voice: s.voice })),
    );
    card.dataset.hay = `${s.id} ${s.title} ${s.voice} ${s.investigations.join(" ")}`.toLowerCase();
    card.addEventListener("click", () => onOpen(s.id));
    list.append(card);
  }
  return list;
}

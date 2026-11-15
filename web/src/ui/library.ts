// The experiment library: one page per story from one template (task 9).
// Generated with Muse Spark, SI-assisted.
import type { Ctx } from "../contract";
import { DATA_URL_BASE } from "../data/index";
import { cite, dataLink, h, numOrMissing, safeHref } from "./dom";

export type Signature = "condition-map" | "sample-wall" | "outcome-strip" | "paper-trail";

export interface LibraryAi {
  model: string;
  made_at: string;
}

export interface LibraryStory {
  id: string;
  investigations: string[];
  title: string;
  voice: string;
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
    return {
      id: str(s["id"], `story ${i} id`),
      investigations: s["investigations"] as string[],
      title: str(s["title"], `story ${i} title`),
      voice: str(s["voice"], `story ${i} voice`),
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
  for (const p of pts) {
    const c = svgEl("circle", { class: "lib-dot", cx: X(p.pressure_kpa).toFixed(1), cy: Y(p.o2_pct).toFixed(1), r: "3.5", "data-id": p.id });
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
  }
  wrap.append(svg);
  wrap.append(h("p", { class: "lib-sig-caption" }, countCaption(t("ui.stage.parade.plotted", { n: pts.length }))));
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
  const list = h("ul", { class: "lib-cards" });
  for (const r of rows) {
    list.append(
      h(
        "li",
        { class: "lib-card" },
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
  }
  wrap.append(list);
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
  for (const id of story.moments) {
    const m = momentById(moments, id);
    if (m.kind === "o2-range") picked = { field: "o2_pct", labelKey: "ui.panel.o2", unitKey: "ui.panel.unit.pct" };
    else if (m.kind === "pressure-range")
      picked = { field: "pressure_kpa", labelKey: "ui.panel.pressure", unitKey: "ui.panel.unit.kpa" };
    else if (m.kind === "flow-range") picked = { field: "flow_cm_s", labelKey: "ui.nearest.flow", unitKey: null };
    if (picked) break;
  }
  if (!picked) return wrap;
  const v = picked;
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
  return wrap;
}

/** The publication list: every paper of the story's investigations, each linked to its DOI or PSI page. */
function paperTrail(story: LibraryStory, ctx: Ctx): HTMLElement {
  const wrap = h("div", { class: "lib-sig" });
  const list = h("ul", { class: "lib-papers" });
  for (const id of story.investigations) {
    const e = ctx.api.experiment(id);
    for (const p of e?.publications ?? []) {
      const href = p.doi ? safeHref(`https://doi.org/${p.doi}`) : (e?.psi_url ?? "");
      const line = `${p.title}${p.authors ? ` — ${p.authors}` : ""}${p.year ? `, ${p.year}` : ""}`;
      list.append(h("li", {}, href ? cite(line, href, "plain") : line));
    }
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

/** One template for every story: title, voice, quote with PSI link, hook, reveal, signature, moments, bridge, AI tag. */
export function renderLibraryPage(story: LibraryStory, moments: LibraryMoment[], ctx: Ctx): HTMLElement {
  const { t } = ctx;
  const exp = ctx.api.experiment(story.core.investigation);
  const page = h("article", { class: "lib-page", "data-story": story.id });
  page.append(h("h3", { class: "lib-title" }, story.title));
  page.append(h("p", { class: "lib-voice" }, t("ui.library.voice", { voice: story.voice })));
  const quote = h("blockquote", { class: "lib-quote" }, story.core.quote, " ");
  if (exp) quote.append(cite(t("ui.sheet.detail.psi-link"), exp.psi_url, "plain"));
  page.append(quote);
  page.append(h("p", { class: "lib-hook" }, story.hook));
  page.append(h("p", { class: "lib-reveal" }, story.reveal));
  page.append(signatureView(story, moments, ctx));
  // stories with no moments get no numbers heading and no list
  if (story.moments.length) {
    page.append(h("h4", { class: "lib-moments-title" }, t("ui.library.moments")));
    const list = h("ul", { class: "lib-moments" });
    for (const id of story.moments) {
      const m = momentById(moments, id);
      const value = m.value_max == null ? `${fmt(m.value)} ${m.unit}` : `${fmt(m.value)} to ${fmt(m.value_max)} ${m.unit}`;
      list.append(h("li", { class: "lib-moment" }, cite(`${m.label}: ${value}`, m.url)));
    }
    page.append(list);
  }
  page.append(h("p", { class: "lib-bridge" }, story.bridge));
  const ai = h(
    "p",
    { class: "lib-ai", "data-own": true },
    h("span", { class: "ai-tag" }, t("ui.sheet.detail.summary")),
    " ",
    t("ui.sheet.detail.summary-by", { model: story.ai.model, made_at: story.ai.made_at }),
  );
  page.append(ai);
  return page;
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

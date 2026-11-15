// The evidence fan (K13): one hub (the Moon-base air question) with curved lines out to the experiment
// families, and from each family to its investigations. Every name and count comes from the loaded data.
// Generated with Claude, SI-assisted.
import "./storygraph.css";
import { FAMILIES, type Ctx, type Experiment, type Family } from "../contract";
import type { LibraryStory } from "./library";
import { h } from "./dom";

const SVGNS = "http://www.w3.org/2000/svg";

export interface GraphNode {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface GraphLayout {
  width: number;
  height: number;
  hub: GraphNode;
  families: { node: GraphNode; family: Family; items: { node: GraphNode; exp: Experiment }[] }[];
}

/** Pure geometry: one band per family, investigations wrapped in `cols` columns. No data is invented here. */
export function layoutGraph(byFamily: Map<Family, Experiment[]>, narrow: boolean): GraphLayout {
  const cols = narrow ? 1 : 3;
  const itemW = narrow ? 150 : 232;
  const famW = narrow ? 112 : 196;
  const hubW = narrow ? 76 : 140;
  const rowH = 34;
  const bandGap = narrow ? 12 : 16;
  const gap = 8;
  const famX = hubW + (narrow ? 16 : 60);
  const itemX = famX + famW + (narrow ? 16 : 40);
  const width = itemX + cols * itemW + (cols - 1) * gap;
  let y = 0;
  const families: GraphLayout["families"] = [];
  for (const family of FAMILIES) {
    const list = byFamily.get(family) ?? [];
    if (!list.length) continue;
    const rows = Math.ceil(list.length / cols);
    const fh = narrow ? 40 : 28;
    const bandH = rows * rowH - (rowH - 28);
    const items = list.map((exp, i) => ({
      exp,
      node: { key: exp.id, x: itemX + (i % cols) * (itemW + gap), y: y + Math.floor(i / cols) * rowH, w: itemW, h: 28 },
    }));
    families.push({ family, items, node: { key: family, x: famX, y: y + bandH / 2 - fh / 2, w: famW, h: fh } });
    y += bandH + bandGap;
  }
  const height = Math.max(0, y - bandGap);
  return { width, height, hub: { key: "hub", x: 0, y: height / 2 - 34, w: hubW, h: 68 }, families };
}

/** Horizontal-tangent cubic from the right edge of a to the left edge of b. */
export function curve(a: GraphNode, b: GraphNode): string {
  const x1 = a.x + a.w;
  const y1 = a.y + a.h / 2;
  const x2 = b.x;
  const y2 = b.y + b.h / 2;
  const mx = (x1 + x2) / 2;
  return `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`;
}

/** Cut to `max` characters with an ellipsis; the full text stays in the node's tooltip. */
export function clip(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max - 1) + "…";
}

/** Split into lines of at most `max` characters, on spaces. */
export function wrap(text: string, max: number): string[] {
  const out: string[] = [];
  for (const word of text.split(/\s+/)) {
    if (out.length && (out[out.length - 1] + " " + word).length <= max) out[out.length - 1] += " " + word;
    else out.push(word);
  }
  return out;
}

function s(tag: string, attrs: Record<string, string> = {}, ...kids: (SVGElement | string)[]): SVGElement {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const k of kids) el.append(k);
  return el;
}

const famClass = (f: Family): string => `fam-${f.replace(/[^a-z0-9]+/g, "-")}`;

/** The story an investigation opens: the one it is the core of, else any that holds it. */
export function storyFor(stories: LibraryStory[], id: string): LibraryStory | null {
  return stories.find((x) => x.core.investigation === id) ?? stories.find((x) => x.investigations.includes(id)) ?? null;
}

export function renderStoryGraph(stories: LibraryStory[], ctx: Ctx, onOpen: (id: string) => void): HTMLElement | null {
  const { t } = ctx;
  const byFamily = new Map<Family, Experiment[]>();
  for (const exp of ctx.api.data.experiments) byFamily.set(exp.family, [...(byFamily.get(exp.family) ?? []), exp]);
  if (!byFamily.size) return null;

  const wrapEl = h("section", { class: "sg", "data-own": true, "aria-label": t("ui.graph.label") });
  const draw = (narrow: boolean): void => {
    const L = layoutGraph(byFamily, narrow);
    const svg = s("svg", { class: "sg-svg", viewBox: `0 0 ${L.width} ${L.height}`, role: "group", "aria-label": t("ui.graph.label") });
    const lines = s("g", { class: "sg-lines", "aria-hidden": "true" });
    const nodes = s("g", { class: "sg-nodes" });
    const paths = new Map<string, SVGElement[]>(); // node key -> lines on the way from the hub
    let i = 0;
    const line = (a: GraphNode, b: GraphNode, upstream: SVGElement[]): SVGElement => {
      const p = s("path", { d: curve(a, b), pathLength: "1", class: "sg-line", style: `--i:${i++}` });
      lines.append(p);
      paths.set(b.key, [...upstream, p]);
      return p;
    };
    const hover = (key: string, on: boolean): void => paths.get(key)?.forEach((p) => p.classList.toggle("on", on));

    const hub = s("g", { class: "sg-node sg-hub" });
    hub.append(s("rect", { x: String(L.hub.x), y: String(L.hub.y), width: String(L.hub.w), height: String(L.hub.h) }));
    const hubLines = wrap(t("ui.graph.hub"), narrow ? 9 : 14);
    hubLines.forEach((ln, k) => {
      const ty = L.hub.y + L.hub.h / 2 + (k - (hubLines.length - 1) / 2) * 18 + 5;
      hub.append(s("text", { x: String(L.hub.x + L.hub.w / 2), y: String(ty), "text-anchor": "middle" }, ln));
    });
    nodes.append(hub);

    for (const fam of L.families) {
      line(L.hub, fam.node, []);
      const famTests = fam.items.reduce((n, it) => n + it.exp.test_count, 0);
      const famName = t(`ui.family.${fam.family}`);
      const fg = s("g", { class: `sg-node sg-fam ${famClass(fam.family)}`, tabindex: "-1" });
      fg.append(
        s("title", {}, `${famName}, ${t("ui.library.card.tests", { n: famTests })}`),
        s("rect", { x: String(fam.node.x), y: String(fam.node.y), width: String(fam.node.w), height: String(fam.node.h) }),
      );
      const famLines = narrow ? wrap(famName, 12).slice(0, 2) : [famName];
      famLines.forEach((ln, k) => {
        const ty = fam.node.y + fam.node.h / 2 + (k - (famLines.length - 1) / 2) * 15 + 5;
        fg.append(s("text", { x: String(fam.node.x + 8), y: String(ty) }, clip(ln, narrow ? 13 : 30)));
      });
      nodes.append(fg);
      for (const it of fam.items) {
        line(fam.node, it.node, paths.get(fam.node.key)!);
        const label = it.exp.acronym || it.exp.id;
        const tests = t(it.exp.test_count === 1 ? "ui.library.card.test-one" : "ui.library.card.tests", { n: it.exp.test_count });
        const story = storyFor(stories, it.exp.id);
        const chipW = narrow ? 36 : 64;
        const g = s("g", { class: `sg-node sg-inv ${famClass(fam.family)}` });
        const x = it.node.x;
        const y = it.node.y;
        g.append(
          s("title", {}, it.exp.title),
          s("rect", { class: "sg-box", x: String(x), y: String(y), width: String(it.node.w), height: String(it.node.h) }),
          s("text", { x: String(x + 10), y: String(y + 19) }, clip(label, narrow ? 13 : 19)),
          s("rect", { class: "sg-chip", x: String(x + it.node.w - chipW - 6), y: String(y + 4), width: String(chipW), height: "20" }),
          s("text", { class: "sg-chip-text", x: String(x + it.node.w - chipW / 2 - 6), y: String(y + 19), "text-anchor": "middle" }, narrow ? String(it.exp.test_count) : tests),
        );
        if (story) {
          g.setAttribute("role", "button");
          g.setAttribute("tabindex", "0");
          g.setAttribute("aria-label", t("ui.graph.open", { name: label, tests }));
          g.addEventListener("click", () => onOpen(story.id));
          g.addEventListener("keydown", (e) => {
            const k = (e as KeyboardEvent).key;
            if (k === "Enter" || k === " ") {
              e.preventDefault();
              onOpen(story.id);
            }
          });
          g.addEventListener("pointerenter", () => hover(it.exp.id, true));
          g.addEventListener("pointerleave", () => hover(it.exp.id, false));
          g.addEventListener("focus", () => hover(it.exp.id, true));
          g.addEventListener("blur", () => hover(it.exp.id, false));
        }
        g.style.setProperty("--n", String(i));
        nodes.append(g);
      }
    }
    svg.append(lines, nodes);
    wrapEl.replaceChildren(svg as unknown as Node as HTMLElement);
    // draw the lines once, when the graph first scrolls into view; later redraws (resize) show it at once
    if (drawn || typeof IntersectionObserver === "undefined") {
      svg.classList.add("go");
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      svg.classList.add("go");
      drawn = true;
      io.disconnect();
    });
    io.observe(svg);
  };
  let drawn = false;
  const mq = typeof matchMedia === "function" ? matchMedia("(max-width: 767px)") : null;
  draw(!!mq?.matches);
  mq?.addEventListener?.("change", (e) => draw(e.matches));
  return wrapEl;
}

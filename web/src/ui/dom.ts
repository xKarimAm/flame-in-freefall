// Small DOM helpers shared by the UI files. Generated with Claude, SI-assisted.
import type { Atmosphere, Lens } from "../contract";
type Attrs = Record<string, string | true | undefined>;

/** An atmosphere's name in words: plain Public names from ui.air.<id>, the moon.json name elsewhere. */
export function airName(lens: Lens, atm: Atmosphere, t: (key: string) => string): string {
  return lens === "public" ? t(`ui.air.${atm.id}`) : atm.name;
}
type Kid = Node | string | null | undefined;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: Kid[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined) el.setAttribute(k, v === true ? "" : v);
  for (const kid of kids) if (kid != null) el.append(kid);
  return el;
}

/** A URL built from data: only https: survives, anything else (javascript:, bare DOIs) becomes "#". */
export function safeHref(url: string): string {
  return url.startsWith("https://") ? url : "#";
}

/** A piece of text from the data, linked to the page it came from (THE RULE). */
export function cite(text: string, href: string, cls = "num"): HTMLAnchorElement {
  return h("a", { class: cls, href: safeHref(href), target: "_blank", rel: "noopener" }, text);
}

/** A number from the data, as a link to its source. `digits` is the most decimals shown. */
export function num(value: number, digits: number, unit: string, href: string): HTMLAnchorElement {
  const text = String(Number(value.toFixed(digits)));
  return cite(unit ? `${text} ${unit}` : text, href);
}

/** A translated sentence with each data value rendered as a link to its source.
 *  Longer values match first, so "56.5 kPa" wins over "56.5". */
export function linkedText(text: string, links: { text: string; href: string }[]): (Node | string)[] {
  let parts: (Node | string)[] = [text];
  for (const { text: needle, href } of [...links].sort((a, b) => b.text.length - a.text.length)) {
    const next: (Node | string)[] = [];
    for (const part of parts) {
      if (typeof part !== "string" || !part.includes(needle)) { next.push(part); continue; }
      const i = part.indexOf(needle);
      next.push(part.slice(0, i), cite(needle, href), part.slice(i + needle.length));
    }
    parts = next;
  }
  return parts;
}

/** A count from the data files, linked to the built tests file it was counted from. */
export function dataLink(text: string): HTMLAnchorElement {
  const a = document.createElement("a");
  a.href = "data/tests.json";
  a.setAttribute("download", "");
  a.textContent = text;
  return a;
}

/** Same, but null shows a dash and the words "not recorded" (never 0). */
export function numOrMissing(
  t: (key: string) => string,
  value: number | null | undefined,
  digits: number,
  unit: string,
  href: string,
): HTMLElement {
  if (value == null) return h("span", { class: "missing" }, `\u2013 ${t("ui.nearest.not-recorded")}`);
  return num(value, digits, unit, href);
}

export const prefersReducedMotion = (): boolean =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

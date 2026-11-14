// Small DOM helpers shared by the UI files. Generated with Claude, SI-assisted.
type Attrs = Record<string, string | true | undefined>;
type Kid = Node | string | null | undefined;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: Kid[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined) el.setAttribute(k, v === true ? "" : v);
  for (const kid of kids) if (kid != null) el.append(kid);
  return el;
}

/** A piece of text from the data, linked to the page it came from (THE RULE). */
export function cite(text: string, href: string, cls = "num"): HTMLAnchorElement {
  return h("a", { class: cls, href, target: "_blank", rel: "noopener" }, text);
}

/** A number from the data, as a link to its source. `digits` is the most decimals shown. */
export function num(value: number, digits: number, unit: string, href: string): HTMLAnchorElement {
  const text = String(Number(value.toFixed(digits)));
  return cite(unit ? `${text} ${unit}` : text, href);
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

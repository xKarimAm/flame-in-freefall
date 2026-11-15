// Generated with Muse Spark, SI-assisted.
// Public-lens explainer boxes: on the page that first shows a thing, one small labelled box says
// what it is in one plain sentence and why it matters here in one more. Numbers come from
// moon.json by id through placeholders (or from the data API the same way), never typed.
import type { Ctx } from "../contract";
import { linkedText } from "../ui/dom";

function box(
  t: Ctx["t"],
  anchor: string,
  titleKey: string,
  whatKey: string,
  whatVars: Record<string, string | number>,
  whyKey: string,
  links: { text: string; href: string }[] = [],
): HTMLElement {
  const el = document.createElement("article");
  el.className = "exp";
  el.setAttribute("data-for", anchor);
  const h = document.createElement("h4");
  h.textContent = t(titleKey);
  const what = document.createElement("p");
  what.className = "exp-what";
  what.append(...linkedText(t(whatKey, whatVars), links));
  const why = document.createElement("p");
  why.className = "exp-why";
  why.textContent = t(whyKey);
  el.append(h, what, why);
  return el;
}

/** Renders the boxes for the introducing beat, or hides the layer everywhere else. */
export function renderExplainers(el: HTMLElement, ctx: Ctx): void {
  const { api, store, t } = ctx;
  const s = store.get();
  const out: HTMLElement[] = [];
  if (s.lens === "public" && s.beat) {
    const { story, beat } = s.beat;
    if (story === "what-nasa-tested" && beat === "why-test") {
      const { plotted, total } = api.coverage();
      out.push(
        box(t, "axis", "ui.stage.exp.axis.title", "ui.stage.exp.axis.what", {}, "ui.stage.exp.axis.why"),
        box(t, "dot", "ui.stage.exp.dot.title", "ui.stage.exp.dot.what", {}, "ui.stage.exp.dot.why"),
        box(t, "coverage", "ui.stage.exp.coverage.title", "ui.stage.exp.coverage.what", { plotted, total }, "ui.stage.exp.coverage.why"),
      );
    } else if (story === "moon-air" && beat === "reveal") {
      const moon = api.atmosphere("heo-dm-1006");
      const iss = api.atmosphere("iss-air");
      // units are fixed by contracts/README.md (pressure in kPa); the values stay moon.json's
      const moonPressure = `${moon.pressure_kpa} kPa`;
      const issPressure = `${iss.pressure_kpa} kPa`;
      out.push(
        box(t, "moon-box", "ui.stage.exp.moon.title", "ui.stage.exp.moon.what",
          { pressure: moonPressure, o2min: moon.o2_pct_min, o2max: moon.o2_pct_max ?? moon.o2_pct_min },
          "ui.stage.exp.moon.why",
          [
            { text: moonPressure, href: moon.url },
            { text: String(moon.o2_pct_min), href: moon.url },
            { text: String(moon.o2_pct_max ?? moon.o2_pct_min), href: moon.url },
          ]),
        box(t, "iss-air", "ui.stage.exp.iss.title", "ui.stage.exp.iss.what",
          { pressure: issPressure, o2: iss.o2_pct_min }, "ui.stage.exp.iss.why",
          [
            { text: issPressure, href: iss.url },
            { text: String(iss.o2_pct_min), href: iss.url },
          ]),
      );
    }
  }
  el.replaceChildren(...out);
  el.hidden = out.length === 0;
}

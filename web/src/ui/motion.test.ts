// Motion helpers and CSS audit for R8 (motion and softness pass).
// Generated with Muse Spark, SI-assisted.
// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { MOTION_EASE, countUp, patchKeyedList, prefersReduced, reorderKeyed, slideReorder } from "./motion";

const css = (): string => readFileSync(join(dirname(fileURLToPath(import.meta.url)), "motion.css"), "utf8");

describe("motion helpers (R8)", () => {
  it("uses the shared ease-out curve", () => {
    expect(MOTION_EASE).toBe("cubic-bezier(0.22, 1, 0.36, 1)");
    expect(css()).toContain("cubic-bezier(0.22, 1, 0.36, 1)");
  });

  it("reduced motion disables every transition and animation", () => {
    const text = css();
    expect(text).toMatch(/prefers-reduced-motion\s*:\s*reduce/);
    const block = text.slice(text.indexOf("prefers-reduced-motion"));
    expect(block).toMatch(/transition\s*:\s*none/);
    expect(block).toMatch(/animation\s*:\s*none/);
  });

  it("moves with transform and opacity only, 300 to 600 ms", () => {
    const text = css();
    // at least sixteen selectors carry a transition (the inspector counts moving elements)
    const transitions = [...text.matchAll(/transition\s*:[^;]+;/g)].map((m) => m[0]);
    expect(transitions.length).toBeGreaterThanOrEqual(16);
    for (const t of transitions) {
      // no layout-property motion: nothing ever transitions width, height, top, left, margin or padding
      expect(t).not.toMatch(/width|height|top|left|margin|padding/i);
      // movement settles in 300 to 600 ms; control feedback may answer faster, never slower
      for (const m of t.matchAll(/(\d+(?:\.\d+)?)\s*(ms|s)\b/g)) {
        const ms = m[2] === "s" ? Number(m[1]) * 1000 : Number(m[1]);
        expect(ms).toBeLessThanOrEqual(600);
      }
    }
    // the flame idles on its own loop while the page moves around it
    expect(text).toContain("@keyframes flame-breathe");
  });

  it("chapter pictures enter with the chapter title (R13)", () => {
    const text = css();
    expect(text).toMatch(/\.chapter \.chapter-picture\s*\{[^}]*transition:\s*transform[^;]*opacity/);
    expect(text).toMatch(/body\[data-motion="on"\] \.chapter:not\(\.is-seen\) \.chapter-picture\s*\{[^}]*transform:\s*translateX\(-24px\)/);
  });

  it("countUp writes the value once and respects reduced motion", () => {
    const el = document.createElement("span");
    el.textContent = "0";
    Object.defineProperty(window, "matchMedia", {
      value: vi.fn(() => ({ matches: true })),
      configurable: true,
    });
    expect(prefersReduced()).toBe(true);
    countUp(el, 1883);
    expect(el.textContent).toBe("1883");
    expect(el.dataset["counted"]).toBe("true");
    el.textContent = "tampered";
    countUp(el, 5);
    expect(el.textContent).toBe("tampered");
  });

  it("reorderKeyed slides ranking rows to their new places without rebuilding them", () => {
    const ol = document.createElement("ol");
    const lis = ["PSI-1", "PSI-2", "PSI-3"].map((id) => {
      const li = document.createElement("li");
      li.setAttribute("data-key", id);
      li.textContent = id;
      ol.append(li);
      return li;
    });
    reorderKeyed(ol, ["PSI-3", "PSI-1", "PSI-2"]);
    expect([...ol.children].map((c) => c.getAttribute("data-key"))).toEqual(["PSI-3", "PSI-1", "PSI-2"]);
    // the same DOM nodes survived the reorder (stable keys, R8a/R8d)
    expect(ol.children[0]).toBe(lis[2]);
    expect(ol.children[1]).toBe(lis[0]);
    expect(ol.children[2]).toBe(lis[1]);
  });

  it("patchKeyedList refreshes numbers in place and slides rows to the new order", () => {
    const ol = document.createElement("ol");
    const build = (id: string): HTMLElement => {
      const li = document.createElement("li");
      li.setAttribute("data-key", id);
      const dot = document.createElement("span");
      dot.className = "n";
      dot.textContent = id;
      li.append(dot);
      return li;
    };
    const update = (node: HTMLElement, id: string): void => {
      node.querySelector(".n")!.textContent = id;
    };
    patchKeyedList(ol, ["PSI-1", "PSI-2"], (id) => id, build, update);
    const first = [...ol.children] as HTMLElement[];
    expect(first.map((c) => c.querySelector(".n")!.textContent)).toEqual(["PSI-1", "PSI-2"]);
    patchKeyedList(ol, ["PSI-2", "PSI-1"], (id) => id, build, update);
    // same nodes, new order, refreshed contents
    expect(ol.children[0]).toBe(first[1]);
    expect(ol.children[1]).toBe(first[0]);
    expect(first[1].querySelector(".n")!.textContent).toBe("PSI-2");
  });

  it("slideReorder keeps every row node when the air changes", () => {
    const ol = document.createElement("ol");
    const lis = ["A", "B", "C"].map((id) => {
      const li = document.createElement("li");
      li.setAttribute("data-key", id);
      ol.append(li);
      return li;
    });
    slideReorder(ol, ["C", "A", "B"]);
    expect([...ol.children]).toEqual([lis[2], lis[0], lis[1]]);
  });
});

// Chrome, slider panel, nearest list, analyst sheet, Stories overlay. Coder E (T7).
// Generated with Claude, SI-assisted.
import type { Ctx } from "../contract";
import { mountChrome } from "./chrome";
import { mountOverlay } from "./overlay";
import { mountPanel } from "./panel";
import { mountSheet } from "./sheet";
import "./ui.css";

export interface UiRoots {
  chrome: HTMLElement;
  panel: HTMLElement;
  sheet: HTMLElement;
  overlay: HTMLElement;
}

export function mount(els: UiRoots, ctx: Ctx): void {
  const overlay = mountOverlay(els.overlay, ctx);
  mountChrome(els.chrome, ctx, overlay.open);
  mountPanel(els.panel, ctx);
  mountSheet(els.sheet, ctx);
}

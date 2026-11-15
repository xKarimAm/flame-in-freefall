// App entry. Orchestrator-owned: loads data, builds the shared context, mounts each module.
// Generated with Claude, SI-assisted.
import "./styles/tokens.css";
import "./styles/base.css";
import "./ui/motion.css";
import { observeCounts, observeEnter, observeFlame } from "./ui/motion";
import type { Ctx } from "./contract";
import { createDataApi, loadData } from "./data/index";
import { mount as mountEngine } from "./engine/index";
import { dicts, makeT } from "./i18n/index";
import { mount as mountStage } from "./stage/index";
import { createStore } from "./store";
import { mount as mountUi } from "./ui/index";

function el(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`index.html is missing #${id}`);
  return node;
}

async function main(): Promise<void> {
  const store = createStore();
  const t = makeT(() => store.get().locale);
  const status = el("status");
  status.textContent = t("ui.loading");
  try {
    const api = createDataApi(await loadData());
    const ctx: Ctx = { api, store, dicts, t };
    mountStage(el("stage"), ctx);
    mountUi({ chrome: el("chrome"), panel: el("panel"), sheet: el("sheet"), overlay: el("overlay") }, ctx);
    mountEngine(el("story"), ctx); // last: it sets the first beat, the others are already listening
    // R8: the script ran, so scroll-driven entrances may start hidden; without
    // this mark every word stays visible (nothing hides if the script fails).
    document.body.dataset["motion"] = "on";
    observeEnter(document);
    observeFlame(document);
    observeCounts(document);
    status.remove();
  } catch (err) {
    status.textContent = `${t("ui.load-error")} ${(err as Error).message}`;
  }
}

void main();

// Tiny app store and the one rule for "which air are we asking about". Orchestrator-owned.
// Generated with Claude, SI-assisted.
import type { AppState, NearestQuery, Store } from "./contract";

export const initialState: AppState = {
  lens: "public",
  locale: "en",
  beat: null,
  stage: { view: "empty" },
  sliders: null,
  family: null,
  filters: { search: "", fuel: null, outcome: null, plotted: "all" },
};

export function createStore(start: AppState = initialState): Store {
  let state = start;
  const listeners = new Set<(state: AppState, prev: AppState) => void>();
  return {
    get: () => state,
    set(patch) {
      const keys = Object.keys(patch) as (keyof AppState)[];
      if (keys.every((k) => Object.is(state[k], patch[k]))) return;
      const prev = state;
      state = { ...state, ...patch };
      for (const listener of [...listeners]) listener(state, prev);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** The nearest-tests query for a state: live sliders win; otherwise a beat that highlights
 *  "nearest to the Moon box"; otherwise none. Stage and UI both use this, so they agree. */
export function queryFromState(state: AppState): NearestQuery | null {
  if (state.sliders) return { kind: "point", ...state.sliders };
  if (state.stage.highlight?.nearest_to === "heo-dm-1006") return { kind: "atmosphere", id: "heo-dm-1006" };
  return null;
}

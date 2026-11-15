// Shared types and module interfaces for the web app. Orchestrator-owned: coders import
// from here and never edit it (propose changes in the PR). Generated with Claude, SI-assisted.
// Units are fixed by contracts/README.md: O2 in percent (0-100), pressure in kPa, flow in cm/s.

// ---------- data (contracts/*.schema.json) ----------
export type Family =
  | "large-scale solids"
  | "solids in flow duct"
  | "gas jets"
  | "droplets"
  | "smoke detection"
  | "ground/modeling";

export const FAMILIES: readonly Family[] = [
  "large-scale solids",
  "solids in flow duct",
  "gas jets",
  "droplets",
  "smoke detection",
  "ground/modeling",
];

export type Outcome =
  | "extinction"
  | "disruption"
  | "completion"
  | "self-extinguished"
  | "flow-terminated"
  | "burned"
  | "no-ignition"
  | "unknown";

/** How the stage colours a recorded outcome. Words, not a prediction:
 *  "burned"   = the test record says it kept burning
 *               (burned, completion, flow-terminated = still burning when the flow was shut off);
 *  "went-out" = the record says the flame went out by itself (extinction, self-extinguished);
 *  "other"    = disruption, no-ignition, unknown. */
export type OutcomeGroup = "burned" | "went-out" | "other";
export const OUTCOME_GROUP: Record<Outcome, OutcomeGroup> = {
  burned: "burned",
  completion: "burned",
  "flow-terminated": "burned",
  extinction: "went-out",
  "self-extinguished": "went-out",
  disruption: "other",
  "no-ignition": "other",
  unknown: "other",
};

export type FuelClass = "droplet" | "gas-jet" | "solid" | "smoke";
export type Gravity = "micro-g" | "1-g";

export interface SourceRef {
  file: string;
  row: number;
  url: string;
  fields?: Record<string, string>;
}

export interface TestRun {
  id: string;
  investigation: string;
  fuel: string | null;
  fuel_class: FuelClass;
  gravity: Gravity;
  o2_pct: number | null;
  o2_pct_min?: number | null;
  o2_pct_max?: number | null;
  o2_note?: string | null;
  pressure_kpa: number | null;
  pressure_note?: string | null;
  flow_cm_s?: number | null;
  flow_note?: string | null;
  outcome: Outcome;
  outcome_raw?: string | null;
  burn_time_s?: number | null;
  source: SourceRef;
}

export interface Publication {
  title: string;
  authors?: string | null;
  doi?: string | null;
  year?: string | null;
}

export interface ExperimentSummary {
  text: string;
  quotes: string[];
  model: string;
  made_at: string;
}

export interface Experiment {
  id: string;
  acronym: string;
  title: string;
  family: Family;
  hardware?: string | null;
  platform?: string | null;
  doi: string | null;
  psi_url: string;
  license: string;
  objective: string;
  summary?: ExperimentSummary | null;
  tags?: string[];
  test_count: number;
  o2_pct_range?: [number, number] | null;
  pressure_kpa_range?: [number, number] | null;
  has_outcomes: boolean;
  publications: Publication[];
}

export type AtmosphereId = "iss-air" | "moon-base-brief" | "heo-dm-1006" | "exp-10-2" | "suit";

export interface Atmosphere {
  id: AtmosphereId;
  name: string;
  pressure_kpa: number;
  o2_pct_min: number;
  /** null = open band, drawn dashed from o2_pct_min up; never a nearest-tests query */
  o2_pct_max: number | null;
  note?: string;
  source: string;
  url: string;
}

export interface MoonData {
  atmospheres: Atmosphere[];
  lunar_margins: {
    meaning: string;
    source: string;
    url: string;
    materials: { material: string; delta_o2_pts: number }[];
  };
  paper_tests: {
    note: string;
    source: string;
    url: string;
    points: { name: string; pressure_kpa: number; o2_pct: number }[];
  };
  gap: { text: string; source: string; url: string };
}

export interface Incident {
  id: string;
  name: string;
  date: string;
  setting: string;
  what_happened: string;
  oxygen: string;
  cause: string;
  changed: string;
  source: string;
  url: string;
}

export interface IncidentsData {
  incidents: Incident[];
  pattern: { text: string; source: string; url: string };
}

export interface AppData {
  experiments: Experiment[];
  tests: TestRun[];
  moon: MoonData;
  incidents: IncidentsData;
}

// ---------- data API (implemented in web/src/data/, coder B) ----------
/** A test that can be drawn on the stage: micro-g, O2 and pressure both recorded. */
export interface PlacedTest {
  id: string;
  investigation: string;
  family: Family;
  fuel: string | null;
  o2_pct: number;
  pressure_kpa: number;
  flow_cm_s: number | null;
  outcome: Outcome;
  /** PSI page of the investigation (source.url) */
  url: string;
}

/** One row of the nearest-tests list (contracts/DISTANCE.md "Each result row"). */
export interface NearestRow extends PlacedTest {
  /** pressure_kpa * o2_pct / 100, 1 dp */
  ppo2_kpa: number;
  gravity: "micro-g";
  /** distance, 3 dp, rounded after sorting */
  d: number;
}

/** A test row that is not on the stage, with the reason in words. */
export interface NotPlacedRow {
  id: string;
  investigation: string;
  family: Family | null;
  fuel: string | null;
  o2_pct: number | null;
  pressure_kpa: number | null;
  outcome: Outcome;
  url: string;
  /** e.g. "no pressure recorded", "no oxygen recorded", "no oxygen or pressure recorded", "not microgravity" */
  reason: string;
}

export type NearestQuery =
  | { kind: "point"; pressure_kpa: number; o2_pct: number }
  /** The Moon box: p = its pressure, O2 term = distance to its band (DISTANCE.md). Only heo-dm-1006. */
  | { kind: "atmosphere"; id: "heo-dm-1006" };

export interface NearestResult {
  query: NearestQuery;
  rows: NearestRow[];
  /** family mix of rows, largest first, e.g. [{family:"gas jets",count:7},{family:"droplets",count:3}] */
  familyMix: { family: Family; count: number }[];
  /** nearest placed test whose OUTCOME_GROUP is "burned" / "went-out" (may be outside rows); null if none */
  nearestBurned: NearestRow | null;
  nearestWentOut: NearestRow | null;
}

export interface DataApi {
  data: AppData;
  experiment(id: string): Experiment | null;
  familyOf(investigation: string): Family | null;
  /** every plottable test, sorted by id */
  placed(): PlacedTest[];
  /** every other test row; pass a family to filter */
  notPlaced(family?: Family): NotPlacedRow[];
  /** "plotted N of M": plotted = placed().length, total = data.tests.length */
  coverage(): { plotted: number; total: number };
  nearest(query: NearestQuery, n?: number, family?: Family): NearestResult;
  /** throws if the id is not in moon.json: numbers are never typed in code */
  atmosphere(id: AtmosphereId): Atmosphere;
}

// ---------- story (contracts/story.schema.json) ----------
export type Lens = "public" | "astronaut" | "analyst";
export const LENSES: readonly Lens[] = ["public", "astronaut", "analyst"];

/** Which test rows the chart (and the sheet tables) show. The whole set lives in the
 *  store so every view draws the same rows; `family` stays a top-level field. */
export type PlottedFilter = "all" | "plotted" | "unplaced";
export interface ChartFilters {
  /** lowercased trimmed search text; empty = off */
  search: string;
  fuel: string | null;
  outcome: Outcome | null;
  plotted: PlottedFilter;
}
export type Locale = "en" | "es" | "hi" | "ar";
export type BeatKind = "hook" | "reveal" | "focus" | "compare" | "takeaway" | "interactive";
export type StageView = "empty" | "incident" | "micro-g" | "tilt-lunar";
export type ReferenceId = AtmosphereId | "saffire-vi";

export interface StageState {
  view: StageView;
  incident_ids?: string[];
  /** families plotted so far; omitted = none */
  show_families?: Family[];
  highlight?: {
    family?: Family;
    investigation?: string;
    test_ids?: string[];
    nearest_to?: "heo-dm-1006" | "slider";
  };
  reference?: ReferenceId[];
  annotation?: { id: string; text_key: string; at?: "lunar-plane" | "moon-box" | "iss-air" }[];
  coverage?: boolean;
  analyst_sheet?: "table" | "lunar-margins" | "failing-materials";
  /** present = sliders live, starting at these values */
  sliders?: { pressure_kpa: number; o2_pct: number };
}

export interface StorySource {
  label: string;
  url: string;
  psi_row?: string;
}

export interface Beat {
  id: string;
  kind: BeatKind;
  stage: StageState;
  text: { public: string; astronaut?: string; analyst?: string };
  sources: StorySource[];
}

export interface Scene {
  id: string;
  beats: Beat[];
}

export interface Story {
  id: string;
  act: number;
  title_key: string;
  scenes: Scene[];
}

// ---------- app state and module wiring ----------
export interface ActiveBeat {
  story: string;
  scene: string;
  beat: string;
  kind: BeatKind;
}

export interface AppState {
  lens: Lens;
  locale: Locale;
  /** the beat in view; null before the first step is reached */
  beat: ActiveBeat | null;
  /** stage state of the beat in view (set by the engine) */
  stage: StageState;
  /** null = sliders locked. The engine sets the start values when a beat has stage.sliders
   *  and sets null when it has none; the UI changes the values while live. */
  sliders: { pressure_kpa: number; o2_pct: number } | null;
  /** family filter of the nearest list; null = all families */
  family: Family | null;
  /** search, fuel, outcome and plotted filters; every view draws the same rows */
  filters: ChartFilters;
}

export interface Store {
  get(): AppState;
  /** shallow merge; listeners run only when something changed */
  set(patch: Partial<AppState>): void;
  subscribe(listener: (state: AppState, prev: AppState) => void): () => void;
}

export interface Ctx {
  api: DataApi;
  store: Store;
  /** flat dictionaries per locale (contracts/I18N.md); en is complete */
  dicts: Partial<Record<Locale, Record<string, string>>>;
  /** chrome text: current locale, then en, then the key itself. {name} placeholders are replaced from vars. */
  t(key: string, vars?: Record<string, string | number>): string;
}

/** Slider ranges come from contracts/story.schema.json (stage.sliders). */
export const SLIDER_RANGE = {
  pressure_kpa: { min: 20, max: 110, step: 0.5 },
  o2_pct: { min: 15, max: 100, step: 0.5 },
} as const;

/** DOM conventions between modules:
 *  - the engine gives each story <section id="story-<story.id>" data-story="<story.id>">
 *    and each beat an element with class "step" and id "beat-<story>-<scene>-<beat>";
 *  - the UI's "Skip to Moon air" scrolls to #story-moon-air. */
export const MOON_STORY_ID = "moon-air";

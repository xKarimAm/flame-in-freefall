// Data types matching contracts/*.schema.json and the single data path.
// Units are fixed by the contracts: O2 in percent (0-100), pressure in kPa.

/** Base URL (relative) under which experiments.json, tests.json, moon.json
 *  and incidents.json are served. The copy script puts them there. */
export const DATA_URL_BASE = "data";

export interface SourceRef {
  file: string;
  row: number;
  url: string;
  fields?: Record<string, string>;
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
  family: string;
  hardware: string | null;
  platform: string | null;
  doi: string | null;
  psi_url: string;
  license: string;
  objective: string;
  summary: ExperimentSummary | null;
  tags: string[];
  test_count: number;
  o2_pct_range: [number, number] | null;
  pressure_kpa_range: [number, number] | null;
  has_outcomes: boolean;
  publications: Publication[];
}

export type FuelClass = "droplet" | "gas-jet" | "solid" | "smoke";
export type Gravity = "micro-g" | "1-g";

export interface TestRun {
  id: string;
  investigation: string;
  fuel: string | null;
  fuel_class: FuelClass;
  gravity: Gravity;
  o2_pct: number | null;
  o2_pct_min: number | null;
  o2_pct_max: number | null;
  o2_note: string | null;
  pressure_kpa: number | null;
  flow_cm_s: number | null;
  outcome: string;
  outcome_raw: string | null;
  burn_time_s: number | null;
  source: SourceRef;
}

export interface Atmosphere {
  name: string;
  pressure_kpa: number;
  o2_pct_min: number;
  o2_pct_max: number | null;
  note?: string;
  source: string;
  url: string;
}

export interface LunarMargin {
  material: string;
  delta_o2_pts: number;
}

export interface MoonData {
  atmospheres: Atmosphere[];
  lunar_margins: {
    meaning: string;
    source: string;
    url: string;
    materials: LunarMargin[];
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

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function fail(what: string): never {
  throw new Error(`invalid ${what}: not the contracted shape, refusing to guess`);
}

export function parseExperiments(json: unknown): Experiment[] {
  if (!Array.isArray(json)) fail("experiments.json");
  return json.map((e) => {
    if (!isRecord(e) || typeof e["id"] !== "string") fail("experiments.json");
    return e as unknown as Experiment;
  });
}

export function parseTests(json: unknown): TestRun[] {
  if (!Array.isArray(json)) fail("tests.json");
  return json.map((t) => {
    if (!isRecord(t) || typeof t["id"] !== "string" || !isRecord(t["source"])) {
      fail("tests.json");
    }
    return t as unknown as TestRun;
  });
}

export function parseMoon(json: unknown): MoonData {
  if (!isRecord(json) || !Array.isArray(json["atmospheres"])) fail("moon.json");
  return json as unknown as MoonData;
}

export function parseIncidents(json: unknown): IncidentsData {
  if (!isRecord(json) || !Array.isArray(json["incidents"])) fail("incidents.json");
  return json as unknown as IncidentsData;
}

async function get(name: string): Promise<unknown> {
  const res = await fetch(`${DATA_URL_BASE}/${name}`);
  if (!res.ok) throw new Error(`could not load ${DATA_URL_BASE}/${name}: ${res.status}`);
  return res.json() as Promise<unknown>;
}

export interface AllData {
  experiments: Experiment[];
  tests: TestRun[];
  moon: MoonData;
  incidents: IncidentsData;
}

/** Loads every JSON file the site reads. Served from DATA_URL_BASE. */
export async function loadAll(): Promise<AllData> {
  const [experiments, tests, moon, incidents] = await Promise.all([
    get("experiments.json").then(parseExperiments),
    get("tests.json").then(parseTests),
    get("moon.json").then(parseMoon),
    get("incidents.json").then(parseIncidents),
  ]);
  return { experiments, tests, moon, incidents };
}

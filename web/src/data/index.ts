// Data loader. Skeleton: the loader is real, the API is a stub that coder B replaces (T4).
// Generated with Claude, SI-assisted.
import type { AppData, DataApi, Experiment, IncidentsData, MoonData, TestRun } from "../contract";

/** Relative base under which the JSON files are served (web/scripts/copy-data.js puts them there). */
export const DATA_URL_BASE = "data";

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
    if (!isRecord(t) || typeof t["id"] !== "string" || !isRecord(t["source"])) fail("tests.json");
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

export async function loadData(): Promise<AppData> {
  const [experiments, tests, moon, incidents] = await Promise.all([
    get("experiments.json").then(parseExperiments),
    get("tests.json").then(parseTests),
    get("moon.json").then(parseMoon),
    get("incidents.json").then(parseIncidents),
  ]);
  return { experiments, tests, moon, incidents };
}

/** Stub until T4: answers are empty, never made up. */
export function createDataApi(data: AppData): DataApi {
  return {
    data,
    experiment: (id) => data.experiments.find((e) => e.id === id) ?? null,
    familyOf: (investigation) => data.experiments.find((e) => e.id === investigation)?.family ?? null,
    placed: () => [],
    notPlaced: () => [],
    coverage: () => ({ plotted: 0, total: data.tests.length }),
    nearest: (query) => ({ query, rows: [], familyMix: [], nearestBurned: null, nearestWentOut: null }),
    atmosphere(id) {
      const found = data.moon.atmospheres.find((a) => a.id === id);
      if (!found) throw new Error(`atmosphere ${id} is not in moon.json`);
      return found;
    },
  };
}

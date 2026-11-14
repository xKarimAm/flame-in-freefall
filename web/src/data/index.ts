// Data loader and DataApi (T4).
// Generated with Claude, SI-assisted.
import type {
  AppData,
  Atmosphere,
  AtmosphereId,
  DataApi,
  Experiment,
  Family,
  IncidentsData,
  MoonData,
  PlacedTest,
  TestRun,
} from "../contract";
import { nearestTests } from "./nearest";

export { nearestTests } from "./nearest";

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

export function createDataApi(data: AppData): DataApi {
  const familyOf = (investigation: string): Family | null =>
    data.experiments.find((e) => e.id === investigation)?.family ?? null;
  const atmosphere = (id: AtmosphereId): Atmosphere => {
    const found = data.moon.atmospheres.find((a) => a.id === id);
    if (!found) throw new Error(`atmosphere ${id} is not in moon.json`);
    return found;
  };

  // Computed once: the stage and the list call placed() on every slider move.
  let cache: PlacedTest[] | null = null;
  const placed = (): PlacedTest[] => {
    if (!cache) {
      cache = [];
      for (const t of data.tests) {
        const family = familyOf(t.investigation);
        if (t.gravity !== "micro-g" || t.o2_pct === null || t.pressure_kpa === null || !family) continue;
        cache.push({
          id: t.id,
          investigation: t.investigation,
          family,
          fuel: t.fuel,
          o2_pct: t.o2_pct,
          pressure_kpa: t.pressure_kpa,
          flow_cm_s: t.flow_cm_s ?? null,
          outcome: t.outcome,
          url: t.source.url,
        });
      }
      cache.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    }
    return cache;
  };

  function reason(t: TestRun): string {
    if (t.gravity !== "micro-g") return "not microgravity";
    if (t.o2_pct === null && t.pressure_kpa === null) return "no oxygen or pressure recorded";
    if (t.pressure_kpa === null) return "no pressure recorded";
    if (t.o2_pct === null) return "no oxygen recorded";
    return "investigation not in experiments.json";
  }

  return {
    data,
    experiment: (id) => data.experiments.find((e) => e.id === id) ?? null,
    familyOf,
    placed,
    notPlaced(family) {
      const inStage = new Set(placed().map((p) => p.id));
      return data.tests
        .filter((t) => !inStage.has(t.id))
        .map((t) => ({
          id: t.id,
          investigation: t.investigation,
          family: familyOf(t.investigation),
          fuel: t.fuel,
          o2_pct: t.o2_pct,
          pressure_kpa: t.pressure_kpa,
          outcome: t.outcome,
          url: t.source.url,
          reason: reason(t),
        }))
        .filter((r) => !family || r.family === family);
    },
    coverage: () => ({ plotted: placed().length, total: data.tests.length }),
    nearest: (query, n = 10, family) =>
      nearestTests(placed(), query, query.kind === "atmosphere" ? atmosphere(query.id) : null, n, family),
    atmosphere,
  };
}

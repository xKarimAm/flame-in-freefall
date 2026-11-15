// Ranking investigations for a chosen air (contracts/DISTANCE.md, web-lane task 50).
// Pure computation over the DataApi; rendering lives in overview.ts (task 56).
// Generated with Muse Spark, SI-assisted.
import type { Atmosphere, DataApi, NearestQuery, PlacedTest } from "../contract";

/** Fixed scales from contracts/DISTANCE.md: 25 kPa of pressure counts the same as 5 O2 points. Never fitted. */
const PRESSURE_SCALE_KPA = 25;
const O2_SCALE_PCT = 5;
/** A placed test counts as near the queried air at distance 1.0 or less (unrounded). */
const NEAR_DISTANCE = 1.0;

export interface RankedInvestigation {
  investigation: string;
  acronym: string;
  /** Distance of its nearest placed test, 3 dp. */
  d_min: number;
  /** Placed tests with unrounded distance 1.0 or less. */
  near: number;
  /** Placed-test count. */
  placed: number;
  /** Total test rows. */
  tests: number;
}

export interface UnrankableInvestigation {
  investigation: string;
  acronym: string;
}

export interface AirRanking {
  query: NearestQuery;
  /** d_min ascending, then near descending, then placed descending, then acronym. */
  ranked: RankedInvestigation[];
  /** Investigations with no placed test, in acronym order. */
  unrankable: UnrankableInvestigation[];
}

const round3 = (x: number): number => Math.round(x * 1000) / 1000;

/** Query point and O2 band. A point query is a band of zero width. */
function resolve(query: NearestQuery, atmosphere: Atmosphere | null): { p: number; lo: number; hi: number } {
  if (query.kind === "point") return { p: query.pressure_kpa, lo: query.o2_pct, hi: query.o2_pct };
  if (!atmosphere || atmosphere.id !== query.id) throw new Error(`atmosphere ${query.id} was not supplied`);
  // An open band (o2_pct_max null) is never a query: refuse rather than invent an upper end.
  if (atmosphere.o2_pct_max === null) throw new Error(`atmosphere ${atmosphere.id} has an open O2 band and cannot be a query`);
  return { p: atmosphere.pressure_kpa, lo: atmosphere.o2_pct_min, hi: atmosphere.o2_pct_max };
}

/** Unrounded distance: 0 for the O2 term while the test's O2 is inside [lo, hi]. */
function distance(o2_pct: number, pressure_kpa: number, q: { p: number; lo: number; hi: number }): number {
  const o2Gap = o2_pct < q.lo ? q.lo - o2_pct : o2_pct > q.hi ? o2_pct - q.hi : 0;
  return Math.sqrt(((q.p - pressure_kpa) / PRESSURE_SCALE_KPA) ** 2 + (o2Gap / O2_SCALE_PCT) ** 2);
}

const byAcronym = (a: { acronym: string }, b: { acronym: string }): number =>
  a.acronym < b.acronym ? -1 : a.acronym > b.acronym ? 1 : 0;

export interface NearestPlacedRef {
  id: string;
  url: string;
  /** 3 dp, the same distance the ranking sorts by. */
  d: number;
}

/**
 * The placed test of one investigation nearest the queried air, for source links.
 * Null when the investigation has no placed test. `atmosphere` is only read for
 * kind "atmosphere" (the Moon box).
 */
export function nearestPlacedTest(
  api: DataApi,
  investigation: string,
  query: NearestQuery,
  atmosphere: Atmosphere | null,
): NearestPlacedRef | null {
  const q = resolve(query, atmosphere);
  let best: PlacedTest | null = null;
  let bestD = Infinity;
  for (const t of api.placed()) {
    if (t.investigation !== investigation) continue;
    const d = distance(t.o2_pct, t.pressure_kpa, q);
    if (d < bestD || (d === bestD && best !== null && t.id < best.id)) {
      best = t;
      bestD = d;
    }
  }
  return best ? { id: best.id, url: best.url, d: round3(bestD) } : null;
}

/**
 * Rank every investigation for the queried air, per contracts/DISTANCE.md.
 * `atmosphere` is only read for kind "atmosphere" (the Moon box).
 */
export function rankForAir(api: DataApi, query: NearestQuery, atmosphere: Atmosphere | null): AirRanking {
  const q = resolve(query, atmosphere);
  const placedByInv = new Map<string, number[]>();
  for (const t of api.placed()) {
    const list = placedByInv.get(t.investigation) ?? [];
    list.push(distance(t.o2_pct, t.pressure_kpa, q));
    placedByInv.set(t.investigation, list);
  }
  const totalByInv = new Map<string, number>();
  for (const t of api.data.tests) totalByInv.set(t.investigation, (totalByInv.get(t.investigation) ?? 0) + 1);

  const ranked: RankedInvestigation[] = [];
  const unrankable: UnrankableInvestigation[] = [];
  for (const e of api.data.experiments) {
    const ds = placedByInv.get(e.id);
    if (!ds || ds.length === 0) {
      unrankable.push({ investigation: e.id, acronym: e.acronym });
      continue;
    }
    const dMin = Math.min(...ds);
    ranked.push({
      investigation: e.id,
      acronym: e.acronym,
      d_min: round3(dMin),
      near: ds.filter((d) => d <= NEAR_DISTANCE).length,
      placed: ds.length,
      tests: totalByInv.get(e.id) ?? 0,
    });
  }
  ranked.sort((a, b) => a.d_min - b.d_min || b.near - a.near || b.placed - a.placed || byAcronym(a, b));
  unrankable.sort(byAcronym);
  return { query, ranked, unrankable };
}

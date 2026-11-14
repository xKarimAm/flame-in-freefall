// Nearest tested conditions: the distance from contracts/DISTANCE.md, as a pure function.
// Generated with Claude, SI-assisted.
import { OUTCOME_GROUP } from "../contract";
import type { Atmosphere, Family, NearestQuery, NearestResult, NearestRow, PlacedTest } from "../contract";

/** Fixed scales from DISTANCE.md: 25 kPa of pressure counts the same as 5 O2 points. Never fitted. */
const PRESSURE_SCALE_KPA = 25;
const O2_SCALE_PCT = 5;

const round = (x: number, dp: number): number => Math.round(x * 10 ** dp) / 10 ** dp;
const byId = (a: { id: string }, b: { id: string }): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Query point and O2 band. A point query is a band of zero width. */
function resolve(query: NearestQuery, atm: Atmosphere | null): { p: number; lo: number; hi: number } {
  if (query.kind === "point") return { p: query.pressure_kpa, lo: query.o2_pct, hi: query.o2_pct };
  if (!atm || atm.id !== query.id) throw new Error(`atmosphere ${query.id} was not supplied`);
  // An open band (o2_pct_max null) is never a query: refuse rather than invent an upper end.
  if (atm.o2_pct_max === null) throw new Error(`atmosphere ${atm.id} has an open O2 band and cannot be a query`);
  return { p: atm.pressure_kpa, lo: atm.o2_pct_min, hi: atm.o2_pct_max };
}

/** Unrounded distance: 0 for the O2 term while the test's O2 is inside [lo, hi]. */
function distance(t: PlacedTest, q: { p: number; lo: number; hi: number }): number {
  const o2Gap = t.o2_pct < q.lo ? q.lo - t.o2_pct : t.o2_pct > q.hi ? t.o2_pct - q.hi : 0;
  return Math.hypot((q.p - t.pressure_kpa) / PRESSURE_SCALE_KPA, o2Gap / O2_SCALE_PCT);
}

/**
 * Up to n placed tests nearest to the query, sorted by unrounded d then id; rounding comes last.
 * `atmosphere` is only read for kind "atmosphere". `family` filters first.
 */
export function nearestTests(
  placed: readonly PlacedTest[],
  query: NearestQuery,
  atmosphere: Atmosphere | null,
  n = 10,
  family?: Family,
): NearestResult {
  const q = resolve(query, atmosphere);
  const ranked = placed
    .filter((t) => !family || t.family === family)
    .map((t) => ({ t, d: distance(t, q) }))
    .sort((a, b) => a.d - b.d || byId(a.t, b.t));
  const toRow = ({ t, d }: { t: PlacedTest; d: number }): NearestRow => ({
    ...t,
    ppo2_kpa: round((t.pressure_kpa * t.o2_pct) / 100, 1),
    gravity: "micro-g",
    d: round(d, 3),
  });
  const rows = ranked.slice(0, Math.max(0, n)).map(toRow);
  const counts = new Map<Family, number>();
  for (const r of rows) counts.set(r.family, (counts.get(r.family) ?? 0) + 1);
  const familyMix = [...counts]
    .map(([f, count]) => ({ family: f, count }))
    .sort((a, b) => b.count - a.count || (a.family < b.family ? -1 : 1));
  const first = (group: "burned" | "went-out"): NearestRow | null => {
    const hit = ranked.find((r) => OUTCOME_GROUP[r.t.outcome] === group);
    return hit ? toRow(hit) : null;
  };
  return { query, rows, familyMix, nearestBurned: first("burned"), nearestWentOut: first("went-out") };
}

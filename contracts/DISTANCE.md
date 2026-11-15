# nearestTests: distance definition (contract, v2 after review)

`nearestTests(pressure_kpa, o2_pct, n = 10, family?)` returns up to `n` rows, sorted by distance `d` ascending, then by `id`. Rounding happens after sorting.

## Rows considered
- `tests.json` rows with `gravity == "micro-g"` and with both `o2_pct` and `pressure_kpa` non-null. Every other row counts toward "not plotted".
- `family` comes from joining `tests.investigation` to `experiments.json` (`id` → `family`); `tests.json` has no family field.
- If `family` is given, filter first.

## Distance
```
d = sqrt( ((p - p_t) / 25)^2 + ((o - o_t) / 5)^2 )
```
- Fixed scales: 25 kPa of pressure counts the same as 5 O2 points. They are never fitted.
- Gravity is not in `d`: every PSI test is micro-g.
- **Moon box query** (`heo-dm-1006`): p = 56.5. The O2 term is the distance from the test's O2 to the band 33.7-40: `0` if `33.7 <= o_t <= 40`, `33.7 - o_t` if below, `o_t - 40` if above.
- `moon-base-brief` (open band, `o2_pct_max` null) is drawn but never used as a query.

## Each result row
`id`, `investigation`, `family`, `fuel`, `o2_pct`, `pressure_kpa`, `ppo2_kpa` (= `pressure_kpa * o2_pct / 100`, 1 dp), `flow_cm_s` (nullable), `outcome`, `gravity` ("micro-g", shown on the row), `source.url`, `d` (3 dp).

## Shown with the list
- The label: "Nearest tested conditions, not a prediction. All tests ran in microgravity."
- The weighting in plain words: "Distance counts 5 oxygen points the same as 25 kPa of pressure."
- The family mix of the n results (e.g. "7 gas jets, 3 droplets").
- Excluded but relevant: SAFFIRE tests (large fabric, the most cabin-like) have no recorded pressure, so they are listed under "not placed" with their O2 and outcome, never silently dropped.

## Expected outputs (vitest)
3 cases computed by hand from `contracts/golden/tests.json`, with the arithmetic in a comment:
1. A query equal to PSI-69#2 gives `d = 0`.
2. The Moon box query ranks PSI-159#1 (39.39 %, 94.44 kPa; O2 inside the band, so `d = (94.44 - 56.5) / 25 = 1.518`).
3. PSI-98#1 (pressure null) is excluded and appears in "not placed".

## Ranking investigations for a chosen air (added 2026-11-15; the challenge asks the dashboard to "summarize, rank and interpret")
For a query air (the sliders, or the Moon box), each investigation gets:
- `d_min`: the distance, as defined above, of its nearest placed test;
- `near`: how many of its placed tests have distance 1.0 or less;
- `placed` and `tests`: its placed-test count and its total test count.

Order: `d_min` ascending, then `near` descending, then `placed` descending, then acronym. Investigations with no placed test are listed after the ranked ones under "Not rankable: no test with both oxygen and pressure recorded", in acronym order. The UI shows the three numbers and this rule in words next to the list, labelled "Closest tested conditions, not a prediction". Nothing is weighted by outcome: no investigation is called safer or more dangerous.

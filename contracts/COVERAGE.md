# Coverage: what each PSI file can plot (contract)

Not every investigation records O2 and pressure. Round-1 review found, among others:
- SPICE `csv_107_36.csv`: air rate only, no O2 and no pressure.
- SAME `csv_101_37.csv`: no O2.
- SAFFIRE `csv_98_39.csv`: pressure null.
- E-FIELD `csv_22_49.csv`: no O2 or pressure columns.
- Gas jets `csv_10_55.csv`: XO2 as a fraction, pressure in atm, "RAMPED" cells.
- `csv_25_37.csv`: has a BOM.
- `csv_69_34.csv`: mmHg or mole fraction.
- `csv_159_50.csv`: bar, and "SE" for self-extinguished.

## Rule
1. Pipeline step 1 **measures** coverage, writes the table below (generated, committed) and freezes it as a pytest. The test fails if the table is missing, empty, or differs from what the pipeline measures; it is regenerated only on purpose.
2. Read CSVs with `encoding="utf-8-sig"`. Strip headers and collapse internal whitespace. Non-numeric cells ("RAMPED", "~ 21.5", "21.5 - 21.7") are parsed by explicit rules:
   - A range gives `o2_pct` = midpoint, with `o2_pct_min` and `o2_pct_max` = the two ends (fields already in `tests.schema.json`).
   - Unparseable cells become null. For O2, the raw cell text goes in `o2_note` (already in `tests.schema.json`). For pressure or flow, `tests.schema.json` has no note field yet: coder A proposes `pressure_note` / `flow_note` in its PR, and the orchestrator adds them to the schema.
3. The UI shows "plotted N of M tests". No copy claims all tests are on the stage.

## Table (filled by the pipeline)
| file | investigation | rows | o2 non-null | pressure non-null | outcome non-null | plottable |
|---|---|---|---|---|---|---|
| csv_10_55.csv | PSI-10 | 207 | 207 | 187 | 0 | 187 |
| csv_10_56.csv | PSI-10 | 120 | 109 | 120 | 0 | 109 |
| bre.csv (not test rows) | PSI-20 | 18 | 0 | 0 | 0 | 0 |
| csv_20_38.csv (not test rows) | PSI-20 | 18 | 0 | 0 | 0 | 0 |
| csv_21_39.csv (not test rows) | PSI-21 | 32 | 0 | 0 | 0 | 0 |
| csv_22_49.csv (not test rows) | PSI-22 | 32 | 0 | 0 | 0 | 0 |
| csv_23_42.csv (not test rows) | PSI-23 | 18 | 0 | 0 | 0 | 0 |
| csv_25_37.csv | PSI-25 | 129 | 129 | 0 | 0 | 0 |
| csv_26_34.csv | PSI-26 | 122 | 0 | 0 | 0 | 0 |
| csv_39_33.csv | PSI-39 | 87 | 87 | 84 | 0 | 84 |
| csv_68_35.csv | PSI-68 | 8 | 0 | 0 | 0 | 0 |
| csv_69_34.csv | PSI-69 | 274 | 274 | 273 | 274 | 273 |
| csv_98_39.csv | PSI-98 | 4 | 2 | 0 | 2 | 0 |
| csv_99_39.csv | PSI-99 | 11 | 9 | 0 | 5 | 0 |
| csv_100_40.csv | PSI-100 | 2 | 0 | 0 | 0 | 0 |
| csv_101_37.csv | PSI-101 | 109 | 0 | 0 | 0 | 0 |
| csv_102_35.csv | PSI-102 | 8 | 0 | 0 | 0 | 0 |
| csv_106_36.csv (not test rows) | PSI-106 | 12 | 0 | 0 | 0 | 0 |
| csv_107_36.csv | PSI-107 | 469 | 0 | 0 | 0 | 0 |
| csv_142_49.csv (not test rows) | PSI-142 | 8 | 0 | 0 | 0 | 0 |
| csv_159_50.csv | PSI-159 | 179 | 179 | 179 | 134 | 179 |
| csv_159_51.csv | PSI-159 | 154 | 154 | 154 | 148 | 154 |
| TOTAL | | 2021 | 1150 | 997 | 563 | 986 |

Plotted 986 of 1883 tests.

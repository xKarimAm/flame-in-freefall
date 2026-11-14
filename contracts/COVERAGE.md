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

# Demo slice: what must work at the 10 AM gate (contract)

1. A preview URL is live (static build).
2. The SVG stage plots the real plottable PSI tests (x = kPa, y = O2 %), with "plotted N of M" shown.
3. Act 3 sliders: moving pressure and O2 updates the 10 nearest tests list. Each row shows family, fuel, outcome and a PSI source link, labelled "Nearest tested conditions, not a prediction".
4. The Moon box (56.5 kPa, 33.7-40 % O2, from `data/curated/moon.json`) and ISS air (101.4 kPa, 21 %) are drawn.
5. The analyst table lists all investigations with ranges and test counts; every number links to its source.
6. English only. `scripts/check.ps1` is green.

Not required at the gate: three.js tilt, acts 1/2/4, experiment pages, summaries, other languages.

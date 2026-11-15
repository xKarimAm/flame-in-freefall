# Firebreak: 30-second video, shot list

6 shots, 30 seconds, captions only (no voice needed; add a voice line from the "Voice" column if you record one). Same story as `DECK.md`: problem, data, demo, gap, trust. Screens are named by lens and tab or chapter. Record at 1440 by 900, English, and take care that the sliders are untouched before the dashboard shots (see `DEMO-SCRIPT.md`).

Each caption is under 10 words. Show captions bottom centre, white on the dark blue ground, flat colour, no animation beyond a 300 ms fade.

| # | Seconds | On screen | Caption | Voice (optional) |
|---|---|---|---|---|
| 1 | 0 to 5 (5 s) | Student lens, chapter 1 "Why oxygen matters": the Apollo 1 and Mir cards and the oxygen dial | "NASA: the most serious events had extra oxygen." (8 words) | "The most serious events were in extra oxygen." |
| 2 | 5 to 10 (5 s) | Student lens, chapter 2 "What NASA has tested", last page: dots arrive on the chart, the counter reads "Plotted 986 of 1,883 tests" | "986 of 1,883 tests plotted. The rest listed." (8 words) | "986 tests on the chart. The others are listed, with the reason." |
| 3 | 10 to 16 (6 s) | Analyst lens, Dashboard tab: the five numbers, then "Ranked for this air" (ACME CFI-G first). A quick cut to the Compare tab (PSI-159 beside PSI-10) | "Ranked for Moon-base air. Not a prediction." (7 words) | "Ranked for planned Moon-base air. Not a prediction." |
| 4 | 16 to 21 (5 s) | Student lens, chapter 3 "Build your Moon-base air": drag the Oxygen slider down from 34 %; the nearest tests change; the one-sentence answer changes | "Pick an air. See the nearest real tests." (8 words) | "Pick an air. See the nearest real tests." |
| 5 | 21 to 26 (5 s) | Student lens, chapter 4 "What nobody knows yet": the chart tilts to the empty Moon-gravity plane; the FM2 note shows | "None of these tests ran in Moon gravity." (8 words) | "None of NASA's PSI tests ran in Moon gravity. FM2 is planned for late 2026." |
| 6 | 26 to 30 (4 s) | End card on the dark blue ground: the Firebreak mark and name; a 1 s cut to the Analyst lens, Method tab, then the card | "Firebreak: where NASA's fire evidence stops." (6 words) | "Firebreak." |

Total: 5 + 5 + 6 + 5 + 5 + 4 = 30 s.

## Notes for the editor

- **Shot 2 and the close.** The caption says 986 of 1,883, not "every test". Keep the count on screen for the full 5 s.
- **Shot 3.** The "Not a prediction" words come from the list's own label ("Closest tested conditions, not a prediction"). Show them on the screen too if there is room.
- **Shot 5.** The caption is scoped to "these tests", meaning the ones in the PSI archive. If the plane carries the old label "No test ran in Moon gravity." (release item R1 rewrites it), crop it out or wait for the fixed build. The voice line says "PSI" in full.
- **Shot 6.** The link goes on the end card when a public URL exists. None is in the repo files (the repo is private until you choose a host). Leave the line out until it is real.
- **The one sentence.** If the platform needs a text description, use: "Firebreak puts NASA's space-fire tests in one picture, and shows where that evidence stops: none of these tests ran in Moon gravity."
- **Fallback.** If the site fails on the recording machine, use the stills from slides 1, 2, 3 and 4 of the deck. The dashboard still on slide 3 covers shot 3.

## Footnotes: where each number comes from

Paths relative to `E:\flame-in-freefall`; recomputed with Python on 2026-11-15.

- 986 and 1,883: `data/build/coverage.json` `plotted` and `total`.
- Slider start 34 %: `stories/moon-air.json` (branch `origin/release/web`), interactive beat `stage.sliders` (56.5 kPa, 34 %).
- Moon box, ranking order (ACME CFI-G first, PSI-10 second), FM2 note: `data/curated/moon.json` `atmospheres[id=heo-dm-1006]` and `gap.text`; ranking recomputed from `data/build/tests.json` by the band rule of `contracts/DISTANCE.md` (see the footnote [f] of `DEMO-SCRIPT.md`).
- "NASA: the most serious events had extra oxygen": `data/curated/incidents.json` `pattern.text` ("All of the most serious events were in the presence of enhanced oxygen", ICES-2020-173). The caption shortens it; the voice line keeps its words.
- The five numbers in shot 3: `DEMO-SCRIPT.md` footnotes [a] to [d].

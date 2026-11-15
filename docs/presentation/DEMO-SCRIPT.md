# Firebreak: the 2-minute live demo (laptop click path)

Slide 3 of `DECK.md`. 120 seconds, 8 steps. Say the short sentences as written. Read numbers as they appear on screen.

**How this was made.** The screen names, tab order and strings come from the source of the `release/web` branch (commit 099cbd0), not from watching the page. The release lane was still fixing screens when I read it (`docs/RELEASE-QUEUE.md` R1 to R7). Rehearse once on the final build and fix anything that differs. Numbers are recomputed from the data files (footnotes at the end).

## Before you start (not part of the 2 minutes)

- Open the site fresh and reload. A reload resets the sliders. This matters: "Ranked for this air" follows the sliders once they have been touched, and starts on the Moon box only while they have not.
- Language English, lens **Student** (the header's "View as" buttons: Student, Astronaut, Analyst), page at the very top (the cover).
- Window about 1440 wide. Zoom 100 %. Close other tabs. Turn off notifications.
- Have the still of the Dashboard tab open on slide 3 as the fallback.

---

## Step 1 (0:00 to 0:10): the cover

**Screen:** title "Fire, oxygen and the Moon", the one-sentence lead, "For students, researchers and engineers.", and the button "Explore the dashboard".

**Say:** "This is Firebreak. NASA has lit fires in space on purpose, to learn. We put those tests on one comparable footing, and show where the evidence stops. I'll start with the dashboard."

**If it misbehaves:** if the cover is missing or the page is scrolled, click "Firebreak" at the top left (it scrolls to the top). If the button does nothing, click **Analyst** under "View as". Same result.

## Step 2 (0:10 to 0:20): click "Explore the dashboard"

**Click:** "Explore the dashboard".

**Screen:** the Analyst lens. A tab row: Dashboard, Compare, Method, Evidence map, All investigations, Moon-gravity margins, Test rows. In the build I read, this button may open "All investigations" instead of Dashboard (release item R2f). Click **Dashboard** either way.

**Say:** "This is the Analyst view: a workspace, not a story. Seven tabs. Numbers link to the data file they were counted from."

**If it misbehaves:** if the tabs do not appear, click **Analyst** under "View as". If the story still shows, reload and press Analyst again. If it stays broken, switch to the slide 3 still and carry on from step 3 using it.

## Step 3 (0:20 to 0:35): the five numbers

**Screen:** a row of five large numbers: Investigations 22, Tests 1,883, Tests on the chart 986, Tests with oxygen recorded 1,150, and Publications 350 (R4 may rename that tile "Publication listings").

**Say:** "22 investigations in NASA's PSI archive. 1,883 test rows. Only 986 can be drawn on the chart, because a dot needs both oxygen and pressure recorded. The other 897 are listed, with the reason. 1,150 tests have oxygen recorded."

Do not say anything about the publications tile unless asked. If asked: 350 is a sum of listings per investigation; 298 are distinct.

**If it misbehaves:** if a number differs from the above, read the screen, not this page, then check footnote [a] to [d] later. If the row is empty, open **Method**, where the same counts appear under "What lands on the chart", and say step 3's sentence from there.

## Step 4 (0:35 to 0:55): "Ranked for this air", with the Moon box

**Screen:** the list "Ranked for this air". It is ranked for the Moon box, the planned Moon-base air (56.5 kPa, 33.7 to 40 % oxygen), because the sliders are untouched. Four rows, each with `d`, "near" and "on the chart":

| Rank | Investigation | d | near | on the chart |
|---|---|---|---|---|
| 1 | ACME CFI-G (PSI-159) | 0.233 | 29 | 333 of 333 |
| 2 | ACME/Flame Design (PSI-10) | 0.277 | 4 | 296 of 327 |
| 3 | FLEX (PSI-69) | 0.589 | 17 | 273 of 274 |
| 4 | CFI (PSI-39) | 2.551 | 0 | 84 of 87 |

Below it, 18 investigations under "Not rankable: no test with both oxygen and pressure recorded".

**Say:** "Here every investigation is ranked for Moon-base air. The rule is fixed and written on screen: 5 oxygen points count the same as 25 kilopascals. The number d is the distance from this air to the nearest test in that investigation. It says how close the tested conditions are. It is closest tested conditions, not a prediction. And it does not rank safer or more dangerous. Four investigations can be ranked. Eighteen cannot, because no test has both oxygen and pressure."

**If it misbehaves:** if the ranking shows different numbers, the sliders were touched before. Reload and click Explore again. If the Moon box is not drawn on this tab, say its values aloud (56.5 kPa, 33.7 to 40 % oxygen); I could not confirm from the code that this tab draws it. If the list is empty, go to step 5 and open Compare directly.

## Step 5 (0:55 to 1:10): Compare, top investigation against the second

**Click:** the **Compare** tab. Its default pair is the first two ranked for the current air: ACME CFI-G (PSI-159) and ACME/Flame Design (PSI-10).

**Screen:** two columns side by side, then one chart on shared axes. Each column: family, the PSI objective quote, fuels, oxygen range, pressure range, flow range, outcomes recorded, "N of M on the chart".

**Say:** "Same axes, same units. PSI-159 has 333 tests, all on the chart, with oxygen from 12 to 85 percent and pressure from 49.5 to 331 kilopascals. PSI-10 has 327 tests, 296 on the chart, and no outcome was recorded in any of its rows. We compare conditions and what the record says. We do not say which one is better."

**If it misbehaves:** if the columns show another pair, pick PSI-159 in the field "First investigation" and PSI-10 in "Second investigation". If the chart is blank, read the two columns only.

## Step 6 (1:10 to 1:30): the Method tab, provenance and checks

**Click:** the **Method** tab ("How the data was made").

**Screen:** Source files (22 files, 15 mapped, 1,883 rows read and mapped); files the pipeline skips, and why (7); "What lands on the chart" with the three reasons (722, 164, 11); Automated checks (Numbers audit, AI text audit, Schema and contract tests); How AI was used; Data dictionary (178 fields); downloads of every data file and contract.

**Say:** "This is how the data was made. 22 source files. 15 were mapped to test rows, 1,883 rows, all mapped. 7 were skipped, and each says why. 722 tests have no oxygen or pressure, 164 have no pressure, 11 have no oxygen. Below that, the automated checks and how AI was used. Every AI sentence carries its model and time. Every data file can be downloaded as it is."

**If it misbehaves:** if the page shows "Could not load" for a file, say "the rest still shows" and read what is on screen. If it is blank, say the sentence about 22 files and 1,883 rows from memory and move on. Do not linger: this step is the first to cut (use 10 s) if you are over time.

## Step 7 (1:30 to 1:50): back to the story, chapter 3, sliders

**Click:** **Student** under "View as". Then the primary button **Skip to Moon air**, which jumps to the slider page of chapter 3 "Build your Moon-base air". (The chapter chip "3" in the header also goes to chapter 3, but not to its last page.)

**Screen:** the slider panel with "Air pressure" and "Oxygen" sliders and a row "Start from a known air". The sliders start at 56.5 kPa and 34 %. The nearest real tests light up on the chart. The panel starts with a one-sentence answer. At the start it should read about: "The nearest real test tested 30% ethane at 34.08 % oxygen and 50.67 kPa air. The record says: Went out by itself." The exact words and number format are on screen: read them as shown. The test behind it is PSI-159#128.

**Do:** drag the Oxygen slider from 34 down to about 21, then the Air pressure slider up to about 101. Stop. Let the sentence change.

**Say:** "Now the story view. This is Moon-base air: 56.5 kilopascals, 34 percent oxygen. The sentence names the nearest real test, what burned, in what air, and what the record says. Drag oxygen down to Earth's 21 percent, and the pressure up to Earth's. The nearest tests change. Always labelled: nearest tested conditions, not a prediction."

**If it misbehaves:** if the page does not scroll to the sliders, click the chip **3**, click an empty part of the page (the arrow keys are ignored while a button or field has focus), then press the down arrow until the slider panel appears. If a slider does not move, click "Start from a known air" and pick the Earth air preset. If the sentence says the outcome was not recorded, read it as it is: that is a true answer.

## Step 8 (1:50 to 2:00): chapter 4, the empty Moon-gravity plane

**Click:** the chapter chip **4** ("What nobody knows yet") in the header.

**Screen:** the chart tilts to a second plane, Moon gravity, with no dots on it. A note says "None of the tests in NASA's PSI archive ran in Moon gravity." and an FM2 note: "FM2 will burn 4 solid samples in real lunar gravity, planned late 2026."

**Say:** "And here is the point. This plane is empty. None of the tests in NASA's PSI archive ran in Moon gravity. The first experiment in real Moon gravity, FM2, is planned for late 2026. That empty space is what Firebreak shows."

Careful: the plane may carry its own label "No test ran in Moon gravity." (R1 in `docs/RELEASE-QUEUE.md` rewrites it). Do not read that label aloud. Read the sentence above.

**If it misbehaves:** if the tilt does not render (no WebGL, or reduced-motion setting), the page shows a still picture with the same notes; say the same words. If the page does not move, click the chip **4** again, or click an empty part of the page and press the down arrow. Then go to the close on slide 5.

---

## 20-second version (for the video screen recording)

Record without sound; the captions are in `VIDEO-30S.md`. Same path, tighter. Times are on the recording clock.

| Time | Do | On screen |
|---|---|---|
| 0:00 to 0:04 | Analyst lens, Dashboard tab | The five numbers: 22, 1,883, 986, 1,150, 350 |
| 0:04 to 0:09 | Stay on the Dashboard, point at the list | "Ranked for this air": ACME CFI-G first, then ACME/Flame Design |
| 0:09 to 0:12 | Click Method | Source files, skipped files, automated checks |
| 0:12 to 0:17 | Click Student, then Skip to Moon air, drag Oxygen from 34 down | Sliders move, nearest tests change, the sentence changes |
| 0:17 to 0:20 | Click chapter chip 4 | The empty Moon-gravity plane and the FM2 note |

Fallback: if any step fails on the take, cut it and use the next. The ranked list and the empty plane are the two shots that must exist.

---

## Footnotes: where each number comes from

Paths are relative to `E:\flame-in-freefall`. Recomputed with Python on 2026-11-15.

- [a] 22 investigations: length of `data/build/experiments.json`. 1,883 tests and 986 plotted, 897 not plotted: `data/build/coverage.json` `total`, `plotted`, `not_plotted`.
- [b] 1,150 tests with oxygen recorded: count of rows in `data/build/tests.json` where `o2_pct` is not null (the Dashboard counts the same way, `web/src/dash/overview.ts` on `origin/release/web`).
- [c] 350 publications: sum of `len(publications)` over `data/build/experiments.json`. 298 distinct: the same list de-duplicated by `doi`, else `title`. `docs/RELEASE-QUEUE.md` R4 gives 298 too.
- [d] Reasons: `data/build/coverage.json` `by_reason`: 722, 164, 11.
- [e] Moon box: `data/curated/moon.json`, `atmospheres[id=heo-dm-1006]`: 56.5 kPa, 33.7 to 40 %. The query rule (the band, 25 kPa to 5 O2 points): `contracts/DISTANCE.md`.
- [f] Ranking table (d, near, on the chart): my recomputation from `data/build/tests.json` with the band rule of `contracts/DISTANCE.md` (rounded to 3 dp; `near` = distance 1.0 or less), and the same code path as `web/src/dash/ranking.ts`. Test counts per investigation (333, 327, 274, 87): `tests.json`. "Not rankable" 18: the 22 investigations minus the 4 with a placed test.
- [g] Compare: default pair is the first two ranked (`web/src/dash/compare.ts`, `defaultPair`). PSI-159 oxygen 12.0 to 85.0 %, pressure 49.54 to 330.99 kPa; PSI-10 all 327 outcomes `unknown`: computed from `tests.json`; PSI-10 oxygen 19.8 to 85.0 % also in `experiments.json` `o2_pct_range` and `moments.json` (`PSI-10.o2-range`).
- [h] Method: `data/build/provenance.json` (22 entries; 15 `mapped`; `rows_read` and `rows_mapped` both 1,883; 7 skipped with `reason`), `data/build/dictionary.json` (178 fields).
- [i] Sliders: start values 56.5 kPa and 34 % come from `stories/moon-air.json` (interactive beat, `stage.sliders`) on `origin/release/web`. Nearest test to (56.5, 34): PSI-159#128, `fuel` "30% ethane", `o2_pct` 34.08, `pressure_kpa` 50.67, `outcome` `self-extinguished`, plain wording "Went out by itself" from `ui.outcome.self-extinguished` in `en.json`. The sentence template is `ui.panel.answer`. This uses the point rule, not the band.
- [j] Gap text and FM2: `data/curated/moon.json` `gap.text`.

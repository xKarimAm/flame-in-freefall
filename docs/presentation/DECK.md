# Firebreak: 5-slide deck for the 5-minute judging

Presenter: Karim, 17:00 today. Boston judging, remote. Product: the `release/web` build (read from branch `origin/release/web`, commit 099cbd0). Screens are named by lens and tab or chapter, as the header shows them: lenses Student, Astronaut, Analyst; dashboard tabs Dashboard, Compare, Method, Evidence map, All investigations, Moon-gravity margins, Test rows; story chapters 1 to 4.

Every number below has a footnote number in square brackets. The footnotes are at the end, with the file and field.

## Time plan

| Slide | Title | Budget |
|---|---|---|
| 1 | The most serious events had extra oxygen | 40 s |
| 2 | NASA's fire tests on one footing | 45 s |
| 3 | Live demo: pick an air | 120 s (see DEMO-SCRIPT.md) |
| 4 | Where the evidence stops | 40 s |
| 5 | How it was built, why trust it | 30 s |
| Close | One sentence | 5 s |

Total 280 s. That leaves 20 s of slack. If the demo runs long, cut slide 5 to its first two lines.

---

## Slide 1: The most serious events had extra oxygen

On-slide text (3 lines):
1. Apollo 1, 1967: a cabin of pure oxygen. Three crew died. [1]
2. NASA's review: "All of the most serious events were in the presence of enhanced oxygen." [2]
3. Moon-base plan: 33.7 to 40 % oxygen, 56.5 kPa. Earth air: 21 %. [3]

Visual: Student lens, chapter 1 "Why oxygen matters", the page with both incident cards (Apollo 1 and Mir) and the oxygen dial.

Speaker notes (40 s):
In 1967, Apollo 1 burned in a ground test, in a cabin of pure oxygen. The crew of three died. In 1997, an oxygen generator fire filled the Mir station with smoke. NASA's own review says all of the most serious events had extra oxygen. Now NASA plans Moon-base air with 33.7 to 40 percent oxygen, at a bit over half of Earth's pressure. Earth air is 21 percent. So the question is simple. How much real fire evidence do we have for that air? That is what Firebreak shows.

---

## Slide 2: NASA's fire tests on one footing

On-slide text (3 lines):
1. 22 investigations, 1,883 test rows, each linked to its PSI record. [4][5]
2. 986 are plotted. The other 897 are listed, with the reason. [6]
3. Unreadable cells stay empty. Nothing is guessed. [7]

Visual: Student lens, chapter 2 "What NASA has tested", the last page (compare): the chart with the counter "Plotted 986 of 1,883 tests" and the families listed beside it.

Speaker notes (45 s):
We took NASA's Physical Sciences Informatics archive, which is public. Our snapshot has 22 investigations and 1,883 test rows. Each study wrote its table differently, so we converted every unit to percent oxygen and kilopascals, and kept the file and row of every test. A test goes on the chart only if both oxygen and pressure were recorded. That is 986 tests. The other 897 are listed, with the reason. When a cell cannot be read, it stays empty with its raw text. We never fill it with a guess.

---

## Slide 3: Live demo: pick an air

On-slide text (3 lines):
1. Dashboard, Compare, Method.
2. Then the story: set an air, read the answer.
3. Last stop: the empty Moon-gravity plane.

Visual: a still of Analyst lens, Dashboard tab (the five numbers and "Ranked for this air"). It is the fallback if the live site fails. The live click path is in `DEMO-SCRIPT.md`.

Speaker notes (120 s; the spoken words during the demo are in DEMO-SCRIPT.md, these are the opening and the fallback):
Now the product, live. Two minutes. I start on the dashboard: five numbers, then every investigation ranked for Moon-base air. I open the top two side by side. Then the Method page, which shows where each number comes from and which checks ran. Then I go back to the story, set an air with the sliders, and read the answer. The last stop is an empty plane. If the site fails, I show this still and say the same words.

---

## Slide 4: Where the evidence stops

On-slide text (3 lines):
1. None of the tests in NASA's PSI archive ran in Moon gravity. [8]
2. The first experiment in real Moon gravity, FM2, is planned for late 2026. [8]
3. The list is "nearest tested conditions, not a prediction."

Visual: Student lens, chapter 4 "What nobody knows yet": the chart tilted to the empty Moon-gravity plane, with the FM2 note.

Speaker notes (40 s):
Here is the honest part. None of the tests in NASA's PSI archive ran in Moon gravity. The Moon-gravity numbers we show come from NASA papers, not from PSI. One paper gives oxygen margins from 0.32 to 2.3 points for six materials. The first experiment in real Moon gravity, called FM2, is planned for late 2026. So Firebreak lists the nearest tested conditions and says plainly that this is not a prediction. We do not call any investigation safer or more dangerous. We show where the evidence stops.

---

## Slide 5: How it was built, why trust it

On-slide text (3 lines):
1. Every number links to a PSI row or to a NASA source with a URL. [9]
2. AI-written text is tagged with model and time. Its quotes are checked in code. [10]
3. Claude and Meta Muse Spark built it. The Method tab lists the checks.

Visual: Analyst lens, Method tab, scrolled to "Automated checks" and "How AI was used".

Speaker notes (30 s):
Every number links to a PSI row, or to a NASA paper with a URL. Data files follow written contracts, and tests check them. On AI: Claude, called Fable, planned and supervised. Claude Sonnet wrote the first wave of code and reviewed everything. Meta Muse Spark wrote much of the code overnight, and the library text. The 22 investigation summaries are tagged Claude Sonnet. Every AI string carries its model and time, and its quotes are checked against the PSI text in code. [10][11]

---

## Close (5 s, say it, then stop)

"Firebreak puts NASA's space-fire tests in one picture, and shows where that evidence stops: none of these tests ran in Moon gravity."

---

## Verify before presenting

Things I could not confirm from the files, or that conflict with them:

1. **Judging criteria wording.** No file holds the Space Apps judging criteria. `docs/UX-BRIEF.md` quotes the Best Use of Data award ("best makes space data accessible or leverages it for a unique application", read 2026-11-15) but I did not re-read the site. Check the live criteria before you phrase the opening.
2. **Time slot and format.** `PLAN.md` and `HANDOVER.md` say judging 9:00 PM (5 min deck plus 3 min Q&A) and a submission deadline of 8:00 PM (ACTIONS.md item 13: "before 20:00"). Your brief says 17:00. Confirm the slot, the time zone (the repo notes UTC+3), whether you share a screen remotely, and whether Q&A follows.
3. **Public URL.** No file gives a public link; `KICKOFF.md` says the repo stays private and nothing is deployed until you choose a host. The video end card and any "try it" line need the real URL.
4. **Model credit for the AI summaries.** Your brief says Muse Spark wrote all AI summaries and library text. The data says otherwise: all 22 investigation summaries in `experiments.json` are tagged `claude-sonnet-5-5`; the 19 library stories and the two translation files are tagged `muse-spark-1.3-contributor`. The notes above follow the data. If the summaries were redone by Muse Spark, regenerate and re-tag them before saying so. [10]
5. **"Most of the code by Muse Spark."** I could not measure it. File headers on `origin/release/web` (web/src, pipeline, scripts) are about half "Generated with Muse Spark" and half "Generated with Claude" (7,674 and 7,984 lines, tests included). The notes say "much of the code". [11]
6. **FM2 date.** "Planned for late 2026" is the wording of `moon.json` `gap.text`. Today is 15 Nov 2026, so the plan is weeks away. I did not check whether it has changed.
7. **The live build is moving.** The release lane was still fixing R1 to R7 (`docs/RELEASE-QUEUE.md`) when I read it. Re-read the screens after it lands. In particular: the Moon-gravity plane label ("No test ran in Moon gravity." today, R1 rewrites it), the Publications tile (350 listings, 298 distinct, R4 relabels it), and whether "Explore the dashboard" opens the Dashboard tab (R2f).
8. **I did not see the screens.** The screen names, the tab order and the strings come from the source of `origin/release/web`. The browser pane timed out on a screenshot, and the server on port 4173 is an older build. Rehearse once on the final build.
9. **"In one picture" in the close.** It is the brief's sentence. It holds because slide 2 says 986 of 1,883 are plotted. Do not drop slide 2's count.
10. **Test and check counts.** I did not quote test counts (95 pipeline, 332 web per `ACTIONS.md` 13:43); they change with each commit. Read them from the last `scripts\check.ps1` run if a judge asks.

---

## Footnotes: where each number comes from

Paths are relative to `E:\flame-in-freefall`. I recomputed every count with a short Python read on 2026-11-15.

- [1] Apollo 1: `data/curated/incidents.json`, `incidents[id=apollo-1]`: `date` 1967-01-27, `oxygen` "100% oxygen at pressure", `what_happened` "the crew of three died". Mir 1997: `incidents[id=mir-1997]`, `date` 1997-02-23.
- [2] Quote: `data/curated/incidents.json`, `pattern.text` (source ICES-2020-173, `pattern.url`).
- [3] Moon-base air: `data/curated/moon.json`, `atmospheres[id=heo-dm-1006]`: `pressure_kpa` 56.5, `o2_pct_min` 33.7, `o2_pct_max` 40. Earth air: `atmospheres[id=iss-air]`: 101.4 kPa, 21 %. "A bit over half": 56.5 / 101.4 = 56 %.
- [4] 22 investigations: length of `data/build/experiments.json`.
- [5] 1,883 test rows: `data/build/coverage.json` `total`; same as the length of `data/build/tests.json`. All 1,883 rows have `source.file`, `source.row` and `source.url` (checked). Rows are in 13 of the 22 investigations (distinct `investigation` in `tests.json`).
- [6] 986 plotted and 897 not plotted: `data/build/coverage.json` `plotted`, `not_plotted`. Reasons: `by_reason` (722 no oxygen or pressure recorded, 164 no pressure recorded, 11 no oxygen recorded). The 986 dots come from four investigations: PSI-159 (333), PSI-10 (296), PSI-69 (273), PSI-39 (84), recomputed from `tests.json` with `gravity == "micro-g"` and both `o2_pct` and `pressure_kpa` non-null.
- [7] Rule: `README.md` ("What the pipeline does") and `contracts/README.md` ("Notes on unparsed cells"). Source files: `data/build/provenance.json`, 22 entries, 15 with `mapped: true` (1,883 `rows_read`, all mapped), 7 skipped, each with a `reason`.
- [8] Gap: `data/curated/moon.json`, `gap.text`: "No PSI combustion tests in partial (lunar or Martian) gravity. FM2 will burn 4 solid samples in real lunar gravity, planned late 2026." (source NTRS 20260000646). Margins 0.32 to 2.3: `lunar_margins.materials[].delta_o2_pts`, 6 materials, source ICES-2025-392 Table 2.
- [9] Source links: `tests.json` `source.url`; curated entries each have `url` (`contracts/curated.schema.json`).
- [10] AI tags: `data/build/experiments.json` `summary.model` (22 of 22 are `claude-sonnet-5-5`), `summary.quotes` (60 quotes in total, verbatim in `data/build/psi-text.json`); `data/build/library.json` `ai.model` (19 of 19 `muse-spark-1.3-contributor`); `web/src/i18n/es.meta.json` and `hi.meta.json` `model` (Muse Spark, 112 keys each). Validation rules: `README.md` "Use of AI" and `docs/UX-BRIEF.md` "AI text safety".
- [11] Roles: your brief for the task; `ACTIONS.md` (night lanes run by Muse Spark, Sonnet integrator and reviewers); header counts from `git grep "Generated with ..."` on `origin/release/web`.

# Space Apps project form: text to paste (Firebreak, challenge #7 "Flame in Freefall")

Generated with Claude, SI-assisted. English only (the form requires it). Every number is backed in the last section, "Where each number comes from". The repo lists no field names for the project form (`RULES.md` of the planning repo has none), so the sections below follow the order of the brief.

**Before you paste.** No public URL exists: the repository is private and nothing is deployed. The form's link field needs a public demo link (the video or the slide deck, hosted somewhere anyone can open). The rules say 30 seconds or less for a video, up to 7 slides for a deck. Add the link yourself; do not paste one that is not live.

---

## Project name

Firebreak

## One-line summary (22 words)

NASA's space-fire tests on one comparable footing, every number linked to its source, and a clear view of where Moon-base evidence stops.

## High-level summary

NASA has flown many fire experiments in microgravity, but each one records its tests in its own way, so they are hard to compare. That matters because planned Moon-base air holds more oxygen than Earth air, and NASA's own review found that the most serious spacecraft fires all had extra oxygen. Firebreak converts NASA's public test tables to one set of units, keeps the file and row of every test, and shows them on one chart. A short story for students and a dashboard for analysts let you pick an air and see the nearest tested conditions, labelled "not a prediction". It also shows the gap: none of the tests in NASA's PSI archive ran in Moon gravity. A cell that cannot be read stays "not recorded".

## Project details

**How it works.** A Python pipeline reads a snapshot of NASA's Physical Sciences Informatics (PSI) archive and writes JSON files that follow written schemas. A static website (TypeScript, SVG, three.js, no UI framework) reads only those files. It never calls NASA while you use it.

**Three lenses**, chosen under "View as": Student, a short picture-book story; Astronaut, the same story as a denser briefing; Analyst, a workspace for the data.

**Story chapters.** 1 Why oxygen matters (Apollo 1, Mir, NASA's review). 2 What NASA has tested (every test as a dot, family by family). 3 Build your Moon-base air. 4 What nobody knows yet (an empty Moon-gravity plane and the planned FM2 experiment).

**Experiment stories.** The Stories button lists 19 experiment stories that cover all 22 investigations. Each shows a computed picture of its tests, the numbers behind it, and short AI-drafted text with a verbatim quote from the PSI record.

**The slider page.** Two sliders, air pressure and oxygen, place an air among the real tests and list the 10 nearest. "Nearest tested conditions" means the tests closest to your air in pressure and oxygen, with a fixed rule: 5 oxygen points count the same as 25 kPa. It says how close the evidence is. It does not say what would happen in Moon gravity, and it never calls an investigation safer or more dangerous.

**Analyst dashboard.** Seven tabs: Dashboard (five headline numbers and "Ranked for this air"), Compare, Method ("How the data was made"), Evidence map, All investigations, Moon-gravity margins and Test rows. The chart says "Plotted N of M tests"; the others are listed with the reason.

**Pipeline and traceability.** It converts units to percent oxygen and kPa and keeps the file and row of every test. Each test links to its PSI record, and each curated fact links to its NASA source.

**Deliberately not done.** No predictions for Moon gravity: the gap is shown, not filled. No fine-tuned model: the corpus is small and a prepared summary with checkable quotes can show where it came from. Raw experiment data (up to terabytes) is out of scope. Arabic is not translated, and some Spanish and Hindi strings fall back to English.

## NASA data and resources used

| Resource | What we used it for | URL |
|---|---|---|
| NASA Physical Sciences Informatics (PSI), 22 combustion investigations | The 1,883 test rows, the investigation records, objectives and publication lists. 21 records state CC0-1.0; the PSI-10 record states no licence | https://psi.nasa.gov |
| PSI investigation records (one per investigation, for example SAFFIRE-I) | The link behind every investigation and test row | https://psi.nasa.gov/physci/repo/data/investigations/PSI-98 |
| Challenge #7 brief | Earth air, the brief's Moon-base air and spacesuit values | https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/ |
| NTRS, ICES-2022-45 | Planned exploration atmospheres (8.2 and 10.2 psia) | https://ntrs.nasa.gov/citations/20220006612 |
| NTRS, ICES-2025-392 Table 2 | Oxygen margins for lunar gravity (0.32 to 2.3 points, six materials) | https://ntrs.nasa.gov/citations/20250002114 |
| NTRS, Niehaus et al., ICES-2025 | Three Saffire VI burns near Moon-base air (in a paper, not in PSI) | https://ntrs.nasa.gov/citations/20250002675 |
| NTRS, LPSC 2026 | The planned FM2 experiment in real lunar gravity | https://ntrs.nasa.gov/citations/20260000646 |
| NTRS, ICES-2020-173 | NASA's review of serious fire events and enhanced oxygen | https://ntrs.nasa.gov/citations/20205000063 |
| NASA Safety and Mission Assurance, Apollo 1 | The Apollo 1 incident card | https://sma.nasa.gov/sma-disciplines/accllp/apollo-1 |
| NASA History, fire aboard Mir | The Mir incident card | https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/ |
| NASA Image and Video Library, 3 photographs | Pictures in the story chapters, credit NASA | https://images.nasa.gov/details/GRC-1998-C-00485, https://images.nasa.gov/details/iss030e178648, https://images.nasa.gov/details/iss040e086481 |

## Use of AI

We acknowledge that AI tools generated parts of this project. The idea and the structure (a story site with three lenses, and showing where the evidence stops) are the team's own choices, recorded in `docs/STORY.md` and `docs/UX-BRIEF.md`.

- **Code and its metadata:** written with Claude Code (Anthropic) and Muse Spark (Meta). A Claude orchestrator planned and reviewed, Claude Sonnet subagents wrote the day-lane code and Muse Spark coded the night lanes. Source files carry the header "Generated with Claude, SI-assisted" or "Generated with Muse Spark, SI-assisted".
- **22 investigation summaries:** written by `claude-sonnet-5-5` from the PSI text only, with 60 quotes. Each is tagged with model and time and shown as "AI summary".
- **19 experiment stories:** hook, reveal and bridge text drafted by `muse-spark-1.3-contributor` from each story's PSI text. Tagged with model and time. The text holds no digits; numbers come only from computed values.
- **Spanish and Hindi:** interface strings drafted by `muse-spark-1.3-contributor`; each translation file records the model and time.
- **The rule:** AI text is tagged with model and time, labelled in the interface, and every quote is checked in code to appear word for word in the PSI text. Tests re-run those checks on every build.
- **Images:** the site's photographs are three NASA images. Other graphics are drawn in code. No AI-generated photo or video is on the site.

## Space agency partner and other data

Space agency partner: none (the repository shows none). Other data: the three NASA images above; nothing outside NASA sources.

## References

- ICES-2022-45, exploration atmospheres: https://ntrs.nasa.gov/citations/20220006612
- ICES-2025-392, lunar-gravity oxygen margins: https://ntrs.nasa.gov/citations/20250002114
- Niehaus et al., ICES-2025, Saffire VI: https://ntrs.nasa.gov/citations/20250002675
- LPSC 2026, FM2 plan: https://ntrs.nasa.gov/citations/20260000646
- ICES-2020-173, serious events and oxygen: https://ntrs.nasa.gov/citations/20205000063

## 30-second demo script (6 lines, captions only)

From `docs/presentation/VIDEO-30S.md`.

1. 0 to 5 s: "NASA: the most serious events had extra oxygen."
2. 5 to 10 s: "986 of 1,883 tests plotted. The rest listed."
3. 10 to 16 s: "Ranked for Moon-base air. Not a prediction."
4. 16 to 21 s: "Pick an air. See the nearest real tests."
5. 21 to 26 s: "None of these tests ran in Moon gravity."
6. 26 to 30 s: "Firebreak: where NASA's fire evidence stops."

---

## Where each number comes from

Run from the repository root. File names are relative to it.

- **22 investigations; 21 CC0-1.0, PSI-10 none:** `python -c "import json;E=json.load(open('data/build/experiments.json'));print(len(E),[e['id'] for e in E if not e['license']])"`
- **1,883 test rows; 986 plotted; 897 not plotted; reasons 722, 164, 11:** `data/build/coverage.json` (`total`, `plotted`, `not_plotted`, `by_reason`); also `contracts/COVERAGE.md`.
- **Dashboard headline numbers (22, 1,883, 986, 1,150 with oxygen, 350 publication listings) and 298 distinct listings:** count of `o2_pct` not null in `data/build/tests.json`; sum of `len(publications)` over `experiments.json`, de-duplicated by `doi`, else `title`.
- **15 of 22 source files mapped, 7 skipped; 178 data-dictionary fields:** `data/build/provenance.json` (`mapped`), length of `data/build/dictionary.json`.
- **19 experiment stories covering 22 investigations; 49 computed moments:** lengths of `data/build/library.json` and `data/build/moments.json`; the `investigations` lists in `library.json` add up to 22.
- **Model tags (22 summaries `claude-sonnet-5-5`; 60 quotes; 19 stories `muse-spark-1.3-contributor`):** `data/build/experiments.json` `summary.model`, `summary.quotes`; `data/build/library.json` `ai.model`.
- **Translations (207 of 349 strings; Muse Spark):** `web/src/i18n/en.json`, `es.json`, `hi.json` (key counts) and `es.meta.json`, `hi.meta.json` (`model`, `keys`).
- **Languages, lens names and the seven dashboard tabs:** `web/src/i18n/en.json` (`ui.chrome.lens.*`, `ui.dash.tab.*`, `ui.sheet.tab.*`), `web/src/ui/chrome.ts`, `web/src/ui/sheet.ts`.
- **Four chapters:** `stories/*.json` (`act`, `title_key`) with their titles in `en.json` (`story.*.title`).
- **Moon-base air 56.5 kPa and 33.7 to 40 % oxygen; Earth 21 %; margins 0.32 to 2.3 points for six materials; Saffire VI points; FM2 "planned late 2026":** `data/curated/moon.json` (`atmospheres`, `lunar_margins`, `paper_tests`, `gap`).
- **Apollo 1, Mir and the "enhanced oxygen" pattern:** `data/curated/incidents.json` (`incidents`, `pattern`).
- **Distance rule (5 oxygen points = 25 kPa; 10 nearest):** `contracts/DISTANCE.md`; label text `ui.nearest.*` in `en.json`.
- **Three NASA photographs:** `data/curated/pictures.json`.
- **Code headers:** `grep -rl "Generated with Muse Spark" web/src pipeline/ffpipe scripts` and the same with "Generated with Claude".
- **All URLs above:** `data/curated/moon.json`, `data/curated/incidents.json`, `data/curated/pictures.json`, `data/build/experiments.json` (`psi_url`) and `data/SOURCES.md` (https://psi.nasa.gov).
- **"Idea chosen by the team", "no fine-tuning", raw data out of scope:** `docs/STORY.md`, `docs/UX-BRIEF.md`.
- **Video captions and the 986 of 1,883 caption:** `docs/presentation/VIDEO-30S.md`.

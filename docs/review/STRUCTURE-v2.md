# Structure v2 (for review): changes from round 1

Status: DRAFT, not approved by Karim. This replaces v1 (`STRUCTURE-v1.md`) where they differ. Round-1 reviewers: a NASA judge, a backend architect and a story/UX lead.

## Decisions changed after round 1
1. **The home page.** OPEN, Karim's call. Karim's idea is a story picker before the scroll. The reviewers say a gate before any payoff hurts the 5-minute judging and the 30 s video. Proposed compromise: the home page opens on the Act 1 hook and the scroll runs straight through. A **Stories rail** (4 chapter chips, sticky) lets anyone jump, and a **Stories** tab in the header lists the 4 stories as cards. The picker exists; it just isn't a gate.
2. **The beat grammar varies by act.**
   - Act 1: Hook → Reveal → Takeaway.
   - Act 2: one scene. The 6 families fill the micro-g plane one at a time, one beat each (Reveal + Focus merged); one Compare and one Takeaway at the end.
   - Act 3: the full 5 beats, ending with the sliders unlocked.
   - Act 4: one beat (the empty lunar plane and the FM2 note).
   - This gives about 14 beats, not 30+.
3. **The stage is 2D first.** An SVG scatter (x = air pressure kPa, y = oxygen %, axis labels in words) is the main stage. three.js does ONE hero move: in Act 3 and Act 4 it tilts to reveal the empty lunar-gravity plane. If WebGL is missing or reduced motion is on, the SVG stays.
4. **"Nearest tests" is honest.** The fixed distance is in `contracts/DISTANCE.md`. Each result shows its family, fuel, flow and outcome as recorded. The label reads "nearest tested conditions, not a prediction". A family filter is available.
5. **Coverage is explicit.** Not every PSI file has O2 and pressure. `contracts/COVERAGE.md` lists what is plottable per file, and the UI shows "plotted N of M tests". The story never claims all ~1,780 tests are on the stage.
6. **Lenses:** Public is the default. The Analyst lens slides in the light data sheet (the table and source rows). Astronaut and Public are text variants. Astronaut copy is cut first if time runs short.
7. **Experiment pages** are generated from one template over `experiments.json`, not hand-built.
8. **Languages.** English is complete and the source of truth. After the 10 AM gate: Spanish and Hindi for UI chrome and headlines. Arabic (RTL) follows if time remains. Quotes, sources and PSI field names stay in English. Each locale falls back to English key by key. The submission form stays English (Space Apps rule).
9. **Modelling: no classifier and no fine-tuning.** Outcomes are recorded differently per investigation, rows within one study are not independent, and there is no lunar-gravity data, so any Moon "prediction" would contradict our own rule. Stretch goal only, after the freeze criteria are met: a descriptive FLEX-only trend (extinction vs O2), labelled with its range of validity.
10. **Moon-air data is curated, not piped.** It comes from `data/curated/moon.json`, so Act 3 does not wait on the pipeline.

## New contracts (must exist before coding)
- `contracts/story.schema.json`: story → scenes → beats; a beat holds its kind, stage state, i18n text keys per lens, and sources. `contracts/golden/story-demo.json` is a 2-beat example that validates.
- `contracts/DISTANCE.md`: the `nearestTests` definition, plus 3 expected outputs to be filled from golden rows.
- `contracts/COVERAGE.md`: the per-file plottable fields. Pipeline step 1 measures them, writes the table, and freezes it as a pytest.
- `contracts/I18N.md`: a flat `{key: string}` per locale in `web/src/i18n/<locale>.json`, with `en` complete and fallback to `en`.
- `docs/OWNERS.md`: one coder per folder; only the orchestrator edits `package.json`, the lockfile, `main.ts` and the global CSS.
- `contracts/DEMO-SLICE.md`: what must work at the 10 AM gate.

## Build order (~16 h from 01:00 local)
| Time | Step | Gate |
|---|---|---|
| 01:00-02:00 | Orchestrator: skeleton PR (merge PR #1 minus Plot, add three.js, empty `data/ engine/ stage/ ui/ i18n/`), `.gitattributes`, `scripts/check.ps1` (runs pytest + vitest + build) | check.ps1 green |
| 02:00-04:00 | In parallel: pipeline → `tests.json`, `experiments.json`, `psi-text.json`, COVERAGE measured (coder A, `pipeline/`); data layer + `nearestTests` + Moon box (coder B, `web/src/data/`) | pytest + vitest green |
| 04:00-06:30 | Story engine (scroll → beat → stage state) with `story-demo.json` (coder C, `web/src/engine/`); SVG stage + Act 3 sliders (coder D, `web/src/stage/`) | engine tests; stage renders golden data |
| 06:30-09:00 | three.js hero tilt; analyst table; deploy a preview | preview URL works |
| **10:00** | **Gate (DEMO-SLICE): Act 3 + stage + table on real data, preview live** | Karim checks by remote |
| 09:00-13:00 | Acts 1, 2, 4 content in `stories/*.json` (from `docs/STORY.md`, verified facts only); experiment-page template; summaries + verbatim test | every rendered number has an href (test) |
| 13:00-16:00 | es + hi chrome/headlines; taste check (lint/inspect at 1440/768/390); README | 0 FAIL |
| 16:00-18:00 | Freeze, fixes only; Karim: deck + 30 s video | |

## 30 s video (from the story/UX review)
1. 0-4 s: "The worst spacecraft fires all happened in extra oxygen." Apollo 1 and Mir.
2. 4-10 s: the micro-g plane fills with real tests: "22 NASA investigations".
3. 10-14 s: Moon-base air, 34-40 % O2 at 56.5 kPa.
4. 14-24 s: drag the sliders; the stage tilts to the empty lunar plane and the nearest tests light up.
5. 24-28 s: "NASA calls partial gravity a major gap."
6. 28-30 s: the title card and the link.

## Known gaps in v2 (for round 2)
- `stage.reference` uses ids (`iss-air`, `moon-box`, `heo-dm-1006`, `suit`) that `data/curated/moon.json` doesn't have yet: atmospheres need an `id` field. Some `url` fields there hold text ("... (challenge #7 brief)") instead of a clean URL.
- The `stories/` folder and the i18n `en.json` don't exist yet; Acts 1-4 copy comes from `docs/STORY.md`.

## Round 2 changes (applied 01:00)
- **The home page (still Karim's call):** it opens on Act 1, "Start here". A sticky Stories rail opens a full-screen **Stories overlay** with the 4 story cards, plus a **"Skip to Moon air"** chip, so the hero shot is one click away for judges and for the video.
- **The empty lunar plane is labelled** on the stage ("No fire test has run in Moon gravity"), so it doesn't read as a bug. The FM2 note is an annotation there.
- **Scope valves, in order:**
  1. Act 2 drops to 3 families (SAFFIRE, FLEX, SAME-R).
  2. The Act 2 Takeaway merges into Act 4, so the story ends on the empty plane.
  3. Astronaut copy is cut.
- **Gate moved to 09:00** (an hour of margin before 10:00). The three.js tilt is optional until after the gate; the SVG draws the lunar plane as a labelled band.
- **Contracts fixed:**
  - `psi-text.schema.json` is new (the quote source, with whitespace-only normalisation).
  - `moon.json` atmospheres have ids and clean URLs; `curated.schema.json` enforces them.
  - The story stage gained `incident_ids`, `annotation`, `coverage`, `analyst_sheet`, slider start values, a family enum, and the `saffire-vi` and `exp-10-2` references.
  - i18n keys are `story.<story>.<scene>.<beat>.<lens>`, with one fallback order.
  - DISTANCE: scales of 25 kPa ≈ 5 O2 points, so pressure matters; ppO2 shown on each row; family joined from `experiments.json`; micro-g filter; SAFFIRE listed as "not placed"; weighting stated in plain words.
  - COVERAGE: the test fails if the table is missing or stale.
  - OWNERS: `web/src/ui/` belongs to coder E from 04:00, since it's needed at the gate; `scripts/check.ps1` is defined.
- **Laya** (Convai, a 0.4B text decision encoder, Apache 2.0) is **not used**. It classifies text states, not numeric test tables. Its base checkpoints are "near chance" zero-shot, so it needs fine-tuning on labelled decisions (its benchmark used 2,000), and its probabilities "ship over-confident". We have no consistent outcome label across investigations and no lunar-gravity data, so a trained classifier would lower Validity.

## 5-minute deck outline (Boston judging; also works as the 7-slide global option)
1. **The problem:** the worst spacecraft fires happened in extra oxygen (Apollo 1, Mir), and Moon bases plan 34-40 % O2 at 56.5 kPa.
2. **The evidence:** 22 NASA PSI investigations, "plotted N of M" tests, one table with every number linked.
3. **Live demo (2 min):** Moon-air sliders → nearest tested conditions → materials NASA says would fail → tilt to the empty lunar plane.
4. **The gap:** no fire test in Moon gravity yet; FM2 is planned for late 2026; no predictions on purpose.
5. **How it's built and how to trust it:** NASA data, contracts and tests, AI summaries with verified quotes, languages.

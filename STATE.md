# STATE (build session 1: 2026-11-15 01:25 to 02:00, on Karim's go-ahead: "Go ahead and build Firebreak. This is my approval to start coding now.")

## Check-in (max 10 lines), build session 2, written 02:41
- **On `main`, green (45 pipeline, 94 web tests):** T1-T8, T12, `moments.json` (#11), cover + chapter pages + book pages (#9), Firebreak mark + rail + layout + investigation detail (#10), chart follow-up (#13).
- **Not merged:** PR #12 (T10, the four acts). QA found 4 engine tests to repoint and a missing bridge page; its fixer died on the Claude limit. It is task 0 of the web night lane.
- **Running unattended (Muse Spark, Karim 02:37):** lane web on `night/web` (`docs/NIGHT-QUEUE.md`, 18 tasks: acts, public picture book, slider sentence, ending card, analyst workspace, search/sort/filter, explainer boxes, three.js tilt, library pages, languages, README) and lane backend on `night/backend` (`docs/NIGHT-QUEUE-BACKEND.md`, 7 tasks: library.json with Spark text, number and AI-text audits, coverage.json, search.json, translations, docs).
- **Nothing from the night lanes is reviewed.** They never touch `main`. Review and merge after waking: backend first, then web.
- **Roles now (Karim, 02:37):** Muse Spark codes; Sonnet reviews when its limit is back (07:00); Fable supervises.
- **Design source:** `docs/UX-BRIEF.md`. Contracts added this session: `moments.schema.json`, `library.schema.json`.
- **Risk to know:** the night agents run with approvals off and network on. They get the Meta key in their environment (the CLI needs it) but no GitHub token, and `main` has no branch protection.
- **Needs your call:** the 5 older items at the bottom; turning on branch protection for `main`.

## DEMO-SLICE checklist (T8), checked by me in the browser at 1440x900 on `npm run build` + `vite preview`
- [x] 1. Local build + preview works; no public deploy (the repo stays private)
- [x] 2. SVG stage plots the real plottable tests; shows "Plotted 986 of 1883 tests"
- [x] 3. Sliders update the 10 nearest tests (56.5 kPa / 34 % gave 10 gas jets; 101 kPa / 21 % gave 8 droplets, 2 gas jets); label "Nearest tested conditions, not a prediction. All tests ran in microgravity."
- [x] 4. Moon box and ISS air drawn from `data/curated/moon.json`
- [x] 5. Analyst table: 22 investigations with ranges and counts; 0 numbers without a source link (walked every text node in the sheet)
- [x] 6. English only; `scripts/check.ps1` green
- Not checked: 768 and 390 px widths, real scrolling through the story by hand, keyboard use.

## Next session: start here
Read `KICKOFF.md` (same rules), then this file. Karim must type his go-ahead in that session first.

**How this session worked (keep it):**
1. The orchestrator writes the interface first (`web/src/contract.ts`), so coders build against types, not against each other.
2. One Sonnet coder per folder (`docs/OWNERS.md`), each in its own worktree `E:\fif-wt\A` to `E` (reuse them: `git -C E:\fif-wt\X checkout -B lane/<name>/<task> origin/main`), each with a complete brief: folder, files to read, steps in order, tests, check command.
3. After each coder, an independent Sonnet QA agent that edits nothing: runs the checks, greps for typed-in data values (56.5, 33.7, 40, 101.4, 21), checks the tests can fail. Blocker or major finding goes back to the coder once.
4. The orchestrator reads the diff, rebases on `main`, runs `scripts/check.ps1`, pushes, merges with `gh pr merge <n> --squash`. One PR at a time.
5. Only one coder edits `web/src/i18n/en.json` per wave. Others list the keys they need and the orchestrator adds them.
6. Check that `git push` succeeded before `gh pr merge` (PR #1 was merged at a stale head because a push was rejected).

**Next tasks, in order (all unblocked):**
- **T10 (coder C, `stories/` + story keys in `en.json`):** acts as story files, text only from `docs/STORY.md`, every beat with a number has a source. Beat plan:
  - `stories/why-oxygen.json` (act 1): hook (view `incident`, Apollo 1), reveal (both incidents), takeaway (the ICES-2020-173 pattern quote from `incidents.json`).
  - `stories/what-nasa-tested.json` (act 2), one scene: one beat per family, `show_families` growing, `highlight.family`, `coverage` true; then one compare and one takeaway. Only droplets and gas jets have dots. The beats for solids, SAFFIRE and smoke must say that those tests are listed, not plotted, because no pressure was recorded.
  - `stories/moon-air.json` (act 3): grow the 2 demo beats to 5: hook, reveal (ISS air + Moon box), focus (add `saffire-vi`, `exp-10-2`), compare (`nearest_to: heo-dm-1006`, sheet `lunar-margins`), interactive (sliders, `tilt-lunar`).
  - `stories/the-gap.json` (act 4): one beat, `tilt-lunar`, the FM2 note from `moon.json` `gap`.
- **Stage follow-up (coder D):** fix label overlap near the Moon box and the cut-off Moon-gravity band; draw tests that have oxygen but no pressure (BASS-II 129, SAFFIRE 11) as tick marks along the oxygen axis, labelled "pressure not recorded", so act 2 has something true to show for solids. Then T9 tilt, or skip it with a note.
- **UI follow-up (coder E):** investigation detail in the analyst sheet (objective word for word, the AI summary with an "AI summary" tag and its quotes, papers with DOI links, PSI link). Then T13 languages after T10.
- **T11 library (coders A + C):** needs a contract change first (orchestrator): a `signature` view and a `moment` reference in `contracts/story.schema.json`, and `data/build/moments.json` computed by the pipeline. Wave 1: FLEX, BASS-II, SAFFIRE, CFI-G, SAME-R, SPICE.
- **Small fixes for coder A's next task:** summary wording from QA (PSI-102 drop "in the Glovebox"; PSI-101 "followed up", not "repeated"); `made_at` to seconds.
- **T14 (orchestrator):** taste check with `C:\Users\Admin\.claude\skills\taste-skill\scripts\lint.mjs` and `inspect.mjs` at 1440/768/390; README final pass (a draft is in `README.md`).

## Decisions (orchestrator)
- **check.ps1 and safe.directory.** OWNERS.md says to add the global `safe.directory *` entry if missing. It is missing, and adding it writes `C:\Users\Admin\.gitconfig`, which AGENTS rule 9 forbids. The script sets it for its own process only.
- **Unique test ids.** Rule in `contracts/README.md`: the lowest-`k` file keeps `PSI-N#row`; other files use `PSI-N#<k>-<row>`.
- **Schema:** optional `pressure_note`, `flow_note` added to `tests.schema.json`.
- **"Plotted N of M":** M = rows in `tests.json`; unmapped CSVs are listed in `contracts/COVERAGE.md` and are not in M.
- **Order:** T3 started before T2 merged, T6/T7 ran in parallel with T4, and T12 ran before T8. The dependencies were enforced at merge (B first; D and E rebased and checked against the real data module).
- **Merge gate** is `scripts/check.ps1` green locally. I did not wait for GitHub CI.
- **Old pipeline draft** (made by the banned agent): reviewed, reused as a starting point; coder A fixed one wrong test and extended it. No `_probe*.py` files were left.
- **AI summaries** were written by the Sonnet coder from `psi-text.json` only, tagged `claude-sonnet-5-5`. No Meta API call was made; the Muse key was not used.
- **`failing-materials` sheet:** no checked materials list exists in `moon.json`, so the sheet shows the lunar margins and the source link. I did not copy names from STORY.md into curated data.
- **Outcome words:** `contract.ts` groups recorded outcomes for colour (burned = burned, completion, flow-terminated; went out = extinction, self-extinguished). A reading of NASA's labels, not new data.
- **Pipeline judgement calls (coder A, confirmed by QA):** FLEX-2's 8 rows are parameter ranges (no single O2 or pressure); CFI "5 atm" rows are above the schema's 400 kPa bound and are null with a note; BRE, CLD, E-FIELD, s-Flame, SLICE files are one row per test day, not test runs, so they are unmapped; no outcome is mapped for BASS, BASS-II, SAME, SAME-R, SPICE, CFI, Flame Design because no column records one.

## Open questions / stuck
None stuck. PR #1 was merged at its old head (my push was rejected); PR #2 put the skeleton on top one minute later.

## Needs Karim's call
1. Old worktrees and branches (`E:\fif-wt\pipe`, `pipeline`, `web`; `lane/pipeline/build`, `lane/pipeline/tests-json`, `lane/pipeline/work`, `lane/web/logic`, `lane/web/work`): keep or remove? Untouched.
2. `safe.directory *` in the global git config (on C:): add it, or keep the process-only setting?
3. Home page: built as STRUCTURE-v2 proposes (Stories overlay, "Skip to Moon air", no gate). Say if you want the picker as a gate.
4. Story library series: planned as proposed (one story for SAFFIRE I-III, one for SAME/SAME-R).
5. A checked "materials unlikely to pass" list for `moon.json` (from ICES-2022-45), so the sheet can show names.

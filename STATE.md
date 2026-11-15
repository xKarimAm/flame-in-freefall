# STATE: CURRENT STATUS at 19:40 on 2026-11-15 (build session 4). This block wins over anything below it.

**Deadline (organisers' email, 19:18):** BOTH the Space Apps Boston project submission and the Boston Google Form (https://forms.gle/zL8BF4qsgeDKde768) by 12:00 ET = 20:00 AST. Live Zoom presentation 13:00 ET = 21:00 AST. Field-by-field text: the session "Submission details for both Boston forms". Deck PDF: `docs/presentation/Firebreak-deck.pdf` (not committed).

**Merged this session (#26-#36), all seen in headless Chrome at 1280x720, 1536x864, 1920x1080; live site checked 19:36, no console errors:** K3 flame is the oxygen marker, K4 drag hint + labelled dots, K5 panel below the text, K6 labels by their marks, K7 one entrance, K8/K9 planes + 3D motion, K13 Stories fan graph, page-18 tidy, dashboard number links open a readable source note (not raw JSON), nudge once per visit.

**Open:** K12 `covered-text` is the inspector's tour dialog staying fixed while it scrolls (fix stashed in `E:if-wt\k5`: close the tour on scroll); `edge-text` 768/390 and `heavy-borders` 390; under 1100 px the panel still covers the slider page card; taste inspector not re-run on final main. Local `check.ps1` fails only on the git-ignored `.env` (secret scan); CI is green. Worktrees `E:if-wt\k*` have `web/node_modules` junctions into main's: remove the junction before deleting a worktree.

---
# STATE: STATUS at 18:55 (superseded) on 2026-11-15. This block wins over anything below it.

**Deadline:** Boston submission 20:00 local (possibly 19:00). Re-submitting is allowed until Mon 07:59. Karim fills and submits the form himself; `docs/SUBMISSION-CHECKLIST.md` lists every field.

**Ready for the form**
- Live site: https://xkarimam.github.io/flame-in-freefall/ (GitHub Pages; every push to `main` redeploys in about a minute)
- Code: https://github.com/xKarimAm/flame-in-freefall (public)
- Form text: `docs/SUBMISSION.md` (numbers re-counted from `data/build` at 18:23)
- Still missing: the public demo link (deck, 7 slides at most, `docs/presentation/Firebreak-deck.pptx`, or a 30 s video). Karim uploads it.

**`main` is green** (`scripts/check.ps1`: 95 pipeline tests, 399 web tests, build). Merged today from this session: PRs #16 to #25. Nothing is running: no Sonnet agents (this account's limit, resets 22:20), no Muse lane.

**What to do next, in order**
1. The list "Karim's UI list" below, K3 to K13. Smallest fix first: K5 (page 17 panel over the Sources line), K9 (chapter 4 Moon and Earth plane buttons show nothing), K4 (hint that the dial marker can be dragged), K6 (page 17 label leader lines), K3 (flame jumps between pages), then K7, K8, K12, K13.
2. For every UI change: use the taste skill (`design-taste-frontend`), look at it in the browser at 1280x720, 1536x864 and 1920x1080 before merging, then run `node C:\Users\Admin\.claude\skills\taste-skill\scripts\inspect.mjs <url>`.
3. Per change: branch from `origin/main` in a free worktree (`E:\fif-wt\E`, `C`, `D`, `B` are free; check `git status` first), `scripts\check.ps1` green, push, `gh pr create`, `gh pr merge --squash`, then tick the K item here and add a line to the log in `ACTIONS.md`.
4. Local preview of a worktree: `cd <worktree>\web; npx vite preview --port 4195 --strictPort` (ports 4173 to 4193 are taken by old previews).

**Traps met today**
- A test forbids any `font-size` that is not a `--text-*` token, and forbids `!important` on it.
- `README.md` still says "326 strings" in two places; the count is 349.
- Muse Spark cannot commit and cannot see the page: check, look and commit for it. Start it only with a short queue in `E:\fif-wt\release\docs\RELEASE-QUEUE.md` via `scripts\night.ps1 -Lane release`.
- Do not touch `E:\fif-wt\A`, `pipe`, `pipeline`, `web`, `night-web`, `night-backend` (Karim's call).

---
# STATE: LIVE HANDOVER, written 17:54 on 2026-11-15 (build session 3, Fable orchestrator). Read this block first.

**Karim's words that authorise this work (17:50 and 17:52):** "Finish exactly every task that we agreed upon: the intro, the rest of the stories, everything ... spin as many sonnet agents. Build with Muse ... Multi-develop everything that you can and merge it at the end ... I want everything done in an hour." and "lay everything down so that ... other Claude accounts connect flawlessly". A new account still needs Karim to type his go-ahead in its own conversation (global rule), then it continues from here.

**Deadline:** submit the project form before 20:00 local. UI/UX work stops at about 18:50; after that only merges, the deck stills and the 30 s video.

**What is safe right now:** `main` is green and is the demo (`scripts/check.ps1`: 95 pipeline tests, 372 web tests, build). Run it: `cd web; npm run build; npm run preview`. If anything below goes wrong, present `main` as it is.

## Work in flight (updated 18:10)
**The Sonnet subagents hit this account's 5-hour limit at about 17:59 (resets 22:20 local). Do not start Sonnet agents from this account before then.** The orchestrator itself still runs.

| # | What | State |
|---|---|---|
| 1 | Intro walkthrough (7 stops, button on the cover, opens once on a first visit) | **merged** PR #19, seen at 1536x864 |
| 2 | Story pages reveal in order, picture-book text, "Scroll to turn the page" cue | **merged** PR #18 (built by Sonnet coder C; its QA agent never ran; I checked one page in the browser) |
| 3 | Chart label slots (R17), full chapter names in the header (R18), cover on wide screens (R19), slider page text above the panel | **merged** PR #20, seen at 1280x720, 1366x768, 1920x1080 |
| 4 | Experiment stories visible directly in Stories | **merged** PR #17 |
| 5 | `docs/SUBMISSION.md` + README (R20), experiment shelf and pages (R21), Analyst dashboard (R22) | **Muse Spark lane running** since 18:10 on `release/web` (`E:\fif-wt\release`, queue `docs/RELEASE-QUEUE.md` "Last wave"). It cannot commit: after each run check, look, commit for it, PR to `main` |

Leftover branches with nothing useful on them: `lane/ui/library-pages` (`E:\fif-wt\B`), `lane/ui/dashboard` (`E:\fif-wt\D`), `lane/docs/submission` (`E:\fif-wt\skel`): their coders died at the limit; check `git status` there before reusing.
## Karim's UI list (his words, 18:47 and 18:52). Tick each only after seeing it fixed in the browser. Use the taste skill (`design-taste-frontend`) and its inspector for all of it.
- [x] K1. Cover title too large, three lines; oxygen scale cut off at the bottom. Fixed in PR #25: title two lines, scale fits. Inspector `headline-lines` FAIL gone.
- [x] K2. (seen in the browser 19:10) Slider panel stays on screen over the chapter 4 title page and covers its title. Fixed in PR #25 (CSS: hidden while a cover or chapter page is on screen). **Not yet seen in the browser.**
- [x] K3. (PR #27: the flame is the oxygen marker itself, constant size, draggable, no per-page jump) "The flame keeps jumping ... moves around everywhere", incoherent. The flame's position must be stable from page to page and follow only the oxygen marker.
- [x] K4. (PR #27/#34: grab cursor, "Drag to change the oxygen" hint, one nudge; left dots labelled on hover) "Tell the users that the flame can be movable and scrollable": a visible hint on the oxygen dial that the marker can be dragged.
- [x] K5. (PR #32: panel top follows the measured end of the page text; seen at 1280, 1536, 1920) "No overlapping": on page 17 the slider panel covers the Sources line of the page text (his screenshot, 2000x987); check every page at 1280x720, 1536x864, 1920x1080.
- [x] K6. (PR #28: labels beside their marks) Page 17 chart: the reference labels sit far away at the top right with long diagonal leader lines crossing the whole chart. Put each label next to its mark with a short leader.
- [x] K7. (PR #26: one entrance, 650 ms rise + fade, 75 ms stagger) "A little bit of sharpness to the text": softer entrance for text and pictures, one consistent motion; nothing pops.
- [x] K8. (PR #30: eased camera between planes, idle drift) "You didn't use 3.js ... not a lot of animations": the three.js tilt only plays on page 18; make it visible and smooth, and add motion where the story changes the picture.
- [x] K9. (PR #30/#33: Moon and Earth planes show the empty plane and one sentence) Chapter 4 plane buttons: "microgravity works. Moon and Earth gravity don't work and don't show anything." They must show the empty plane with its sentence (no test in the PSI archive ran there), animated.
- [ ] K10. Keep the NASA pictures and how they connect to the story ("a very good direction").
- [ ] K11. Test continuously in the browser while changing things, not after.
- [ ] K12. Taste inspector on `main` after PR #25: 4 FAIL, 2 WARN left: `covered-text` ("Chapter 1. Why oxygen matters" 25 % hidden at one scroll position), `edge-text` at 768 and 390, `placeholder-data` ("acme" on screen: find and remove), `heavy-borders` at 390; `font-not-dealt` can be ignored (the brand fixes Fira Sans).
- [x] K13. (PR #31: evidence fan graph at the top of Stories, counts from data) From the Dribbble reference: Stories as a node graph (see the reference section below).
## Karim's design reference (given 18:21)
https://dribbble.com/shots/27388009-AI-Dashboard-Design-for-Control-AI-Policy-Platform (George Railean). Its own description: a dark interface, an interactive node graph with one central node and everything else connected to it, dense data, motion-driven transitions, a detail panel on the right. Karim's words: take it "as inspiration for how it's done and the storytelling that it does"; the story keeps adding pieces as people scroll, "a mind-map-scrolling-type view"; then a dashboard like it, with a graph for "showing the multiple stories". **Design piece to build from it:** the Stories view as a node graph: the Moon-base air question in the centre, the six families around it, each investigation as a node on its family, click a node to open its story; counts from the data.
## Salvage from the stopped Sonnet coders (found 18:15; do this next, in this order)
1. **Submission text:** `lane/docs/submission` (`E:\fif-wt\skel`) has `docs/SUBMISSION.md` and the README, committed and pushed, **PR #21 open**. Its fact-check never ran. Before merging: recount every number in it from `data/build/*.json` and fix mismatches. The Muse lane is also writing R20 (the same file) on `release/web`: keep whichever is correct, do not merge both blindly.
2. **Analyst dashboard:** `E:\fif-wt\D` (`lane/ui/dashboard`) holds uncommitted work: `sheet.ts`, new `dashboard.css`, tests, `en.json`. It builds; 2 of its own new tests fail (`ui.test.ts:159` tile links "expected 3 to be less than 3"; `ui.test.ts:196` sort arrow text is empty, expected an up arrow). Fix those two, run check.ps1, look in the browser (Analyst lens, Dashboard tab), commit, PR.
3. **Experiment shelf and pages:** `E:\fif-wt\B` (`lane/ui/library-pages`) has 1 commit (shelf grouped by family, `library.css`) plus uncommitted `overlay.ts`. It builds; 1 existing test fails (`library.test.ts` "public lens: signature first, then hook, one moment as a large number, then bridge (task 53)"). Fix or restore that order, check, browser look, commit, PR.
4. The Muse lane queue has R21 and R22 for the same two features. If 2 and 3 above land first, tick R21 and R22 as done in `E:\fif-wt\release\docs\RELEASE-QUEUE.md` (or create `E:\fif-wt\release\STOP`) so Muse does not redo them.

**Karim's standing instructions for all UI work (18:06):** use the taste skill (`design-taste-frontend`) and its inspector on every UI change, the Matt Pocock skills where they fit, and the rules in `docs/UX-BRIEF.md`. These were not applied to PRs #17 to #20; run the inspector on `main` before calling the UI done.
## How to finish each item (the same steps for every branch)
1. `git -C <worktree> fetch origin` then `git -C <worktree> rebase origin/main` (or merge). `en.json` conflicts: keep both blocks of keys.
2. `powershell -ExecutionPolicy Bypass -File <worktree>\scripts\check.ps1` must print `check.ps1: green`.
3. Look at it in the browser at 1280x720 and 1536x864: `cd <worktree>\web; npx vite preview --port 4190 --strictPort` (ports 4173-4181 are taken by old previews).
4. `git push`, check the push succeeded, then `gh pr merge <n> --squash`. One at a time. Then `git -C E:\flame-in-freefall pull` and rebuild `main`.
5. Add a line to the log in `ACTIONS.md` and tick the row above.

**Muse lane (item 6):** when its run ends (`E:\spaceapps-data\logs\night-release.log`), its changes sit uncommitted in `E:\fif-wt\release`. Run check.ps1 there, look in the browser, commit for it, push `release/web`, open a PR to `main`. To stop it: create the file `E:\fif-wt\release\STOP`.

**Do not touch:** `E:\fif-wt\A` (uncommitted pipeline files from an earlier session), `E:\fif-wt\pipe`, `pipeline`, `web`, `night-web`, `night-backend` (Karim's call, see the bottom of this file).

## After the merges (in this order)
1. Rebuild `main`, walk the whole story once in the browser at the size of the presenting laptop.
2. Deck stills and the 30 s video from `main` (`docs/presentation/DECK.md`, `DEMO-SCRIPT.md`, `VIDEO-30S.md`; the deck build scripts are in `docs/presentation/`).
3. Karim pastes `docs/SUBMISSION.md` into the project form and submits before 20:00.

## Known gaps (true at 17:54)
- The look is still plainer than Karim asked for. His reference link for dashboard inspiration is not in this conversation or in the repo; ask him for it again before any further design pass.
- Not re-checked today: phone and tablet layouts, the Spanish and Hindi text on the new screens (new keys fall back to English), each of the 19 experiment pages.
- Jumping straight to a middle page once left the chart on the cover picture; not confirmed, not fixed.

---
# Earlier state (build session 1: 2026-11-15 01:25 to 02:00, on Karim's go-ahead: "Go ahead and build Firebreak. This is my approval to start coding now.")

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

# ACTIONS: read this first after switching Claude accounts

Karim switches between three Claude accounts. Every session, on every account, **updates this file after each action**:
1. Overwrite "Last action".
2. Update the action table.
3. Append one line to the log.

Times are local (UTC+3).

## Last action
2026-11-15 02:40, build session 2 (Fable orchestrator): **Night run started on Karim's words (02:37): Muse Spark codes, unattended, in two lanes.** `scripts/night.ps1 -Lane web` (branch `night/web`, worktree `E:\fif-wt\night-web`, queue `docs/NIGHT-QUEUE.md`) and `-Lane backend` (branch `night/backend`, worktree `E:\fif-wt\night-backend`, queue `docs/NIGHT-QUEUE-BACKEND.md`). Neither touches `main`; the runner pushes each lane branch after every run. Logs: `E:\spaceapps-data\logs\night-web.log`, `night-backend.log`. Stop a lane: create `STOP` in its worktree. On `main`: PRs #9, #10, #11, #13 (green: 45 pipeline, 94 web tests). **Not merged:** PR #12 (the four acts): its Sonnet fixer and the library coder died on the Claude 5-hour limit (resets 07:00); the web lane's task 0 merges and fixes #12 on `night/web`. **Next (any account, after waking): read each queue file for ticks and `[!] stuck` notes; run `scripts\check.ps1` in each night worktree; have a reviewer read `git diff origin/main...origin/night/backend` and `...origin/night/web`; merge backend first, then web, as PRs; close PR #12 if `night/web` contains it.**

## Action table (the plan)
| # | Action | Who | Status | Done when |
|---|---|---|---|---|
| 1 | Team page: name, challenge, photo (logo-paper.png), description, contact | Karim + planning | done (Karim presses Create Team) | team visible on Boston members tab |
| 2 | Structure v1 → 2 review rounds → v2 + contracts | planning | done | `docs/review/STRUCTURE-v2.md`, `contracts/*` validate |
| 3 | 2025 winners studied | planning | done | `E:\spaceapps-2026-plan\research\WINNERS-2025.md` |
| 3b | Award-winning + industrial dashboards studied (frontend/backend) | planning | done | `E:\spaceapps-2026-plan\research\DASHBOARDS.md` |
| 4 | Story library: one story per investigation, from its PSI core | planning | drafted | `docs/STORY-LIBRARY.md` approved by Karim |
| 5 | Karim approves the structure (his own words) | Karim | done 01:17 (quoted above) | approval line copied into this log |
| 5b | Hosting | Karim | decided 01:17: repo stays private; public host chosen later | `E:\spaceapps-2026-plan\docs\HOSTING.md` plan done |
| 6 | Commit the planning docs + contracts to `main` | planning | done 01:30 | pushed |
| 6b | Open the build account, type the go-ahead, paste `KICKOFF.md` | Karim | done 01:25 | build session running |
| 7 | Development: Fable orchestrator + Sonnet coders work through `docs/plan.xml` | development session | **running**: T1-T8 and T12 merged; T10 + storybook look in progress (session 2); T11, T13, T14 left; T9 skipped | T1-T14 done, `scripts/check.ps1` green |
| 8 | Wireframes, then the look and feel (Fable proposes; Karim picks) | design session with Karim | pending | Karim picks a direction |
| 9 | Milestone T8: DEMO-SLICE works in a local build | development | **done 01:56** | STATE.md checklist |
| 10 | Story library content (22 stories from specs) | backend coders | pending | each story validates; every number has a link |
| 11 | Languages: en → es + hi (chrome and headlines) → ar | backend | pending | i18n tests green |
| 12 | Deck (5 min) + 30 s video | Karim + planning | pending | files ready by 18:00 |
| 13 | Submit the project form (English), then send the deck to the organiser | Karim | pending | before 20:00 |

## Log
| Time | Account / session | Action | Result |
|---|---|---|---|
| 00:22 | planning | Filled the team description + contact; uploaded logo-paper.png | ready for Create Team |
| 00:25 | planning | Started fif-backend (Fable, high, auto) | it paused itself: no go-ahead from Karim |
| 00:35 | planning | Drew `docs/structure.drawio` (backend flow + story structure) | reviewed |
| 00:40 | planning | 3 reviewers, round 1 (NASA judge, architect, story/UX) | 18 issues |
| 01:00 | planning | Wrote v2 + contracts; round 2; fixes applied | contracts validate |
| 01:10 | planning | Studied the 2025 winners; wrote the story library spec; created ACTIONS.md | waiting for Karim |
| 01:15 | planning | Studied dashboards: NASA Eyes/Worldview, Pudding, Reuters, OWID, ISA-101 HMI, industrial XAI, Watch Duty | DASHBOARDS.md; waiting for Karim |
| 01:30 | planning | Re-verified hosting + domain (7 corrections); global rules added; diagram pages 3-4; KICKOFF.md; commit + push | ready for the build account |
| 01:35 | planning | Approval recorded; repo private; tasks in docs/plan.xml; diagram pages 3-4 renamed; KICKOFF updated; final commit + push | handover complete |
| 01:36 | build | T1: `scripts/check.ps1`; contracts: unique test ids, `pressure_note`/`flow_note`; `STATE.md` started | green and red path proven; pushed |
| 01:39 | build | T2: PR #1 merged (old head, my push was rejected), then PR #2 with the skeleton | main has the skeleton, check.ps1 green |
| 01:41 | build | Launched coder A (T3) and coders B-E (T4-T7), each with a Sonnet QA pass | running |
| 01:44 | build | T3 merged (PR #3): tests.json 1,883 rows, experiments.json 22, psi-text.json, COVERAGE table | 986 of 1,883 plottable |
| 01:50 | build | T12 merged (PR #6): 22 AI summaries, quotes checked word for word by QA | no API call, Muse key unused |
| 01:54 | build | T4, T5, T7, T6 merged in that order (PRs #4, #5, #8, #7), each rebased with check.ps1 green | 65 web tests |
| 01:56 | build | T8: built, previewed locally, checked the 6 DEMO-SLICE items in the browser | all 6 pass; rough edges listed in STATE.md |
| 01:58 | build | Handover written in STATE.md (near the 5-hour limit) | next account continues at T10 |
| 02:03 | build 2 | Read the handover, saw the current build in the browser (opens on act 3 over an empty chart; panel covers the chart) | plan for one wave |
| 02:08 | build 2 | Launched wave 2: coders C (T10 stories), B (storybook engine), E (logo, theme, rail, layout, detail), D (stage), each with Sonnet QA | running |
| 02:10 | build 2 | Checked the Meta API with the `.env` key (name and length only): HTTP 200 for `muse-spark-1.3-contributor` and `muse-spark-1.3` | usable for T13 and T11 text |
| 02:12 | build 2 | Contract: `contracts/moments.schema.json` (pushed); launched coder A on `moments.json` | running |
| 02:19 | build 2 | Merged PR #11 (`moments.json`: 49 computed facts, 13 investigations) after Sonnet QA and two fix rounds; `check.ps1` green (45 pipeline, 65 web tests) | T11 data ready |
| 02:17 | Karim | "Have the coding and review agents be Sonnet. Have the building agents be Meta Spark. This is the final decision." | applied: Sonnet codes, reviews and merges; Spark API builds text |
| 02:24 | build 2 | Wrote `docs/UX-BRIEF.md` (three audiences, story spine, public picture book, analyst workspace, AI text safety) from Karim's 02:22 direction; `contracts/library.schema.json`; coder A drafting `library.json` with Meta Spark; STATE.md check-in | wave 3 brief ready |
| 02:29 | build 2 | Sonnet integrator merged PRs #9, #10, #13 one at a time, `check.ps1` green each time | 94 web tests on main |
| 02:31 | build 2 | On Karim's 02:27 words ("I want the muse sparks to autonomosly code throughout the night"): started `scripts/night.ps1` (Muse Spark, branch `night/spark` only, queue in `docs/NIGHT-QUEUE.md`) | running, waits for PR #12 |
| 02:37 | Karim | "Use the Muse Spark models for encoding... Stop using sonnet... I need the backend to be fully done by the Muse Spark" | two Spark lanes, queues extended: search/sort/filter, explainer boxes, three.js tilt, meaning pass; backend: library, audits, coverage, search index, translations |
| 02:40 | build 2 | Started `scripts/night.ps1` for lanes web and backend (detached); old single runner stopped | running |
| 03:22 | probe | Night lanes alive. Backend 2 of 7 done (B1 library.json with Spark text, B2 numbers audit). Web 7 of 18 done (acts, wording, public picture parts 1-2, slider sentence, ending card, page turning). No protected path touched, no stuck task | no correction needed |

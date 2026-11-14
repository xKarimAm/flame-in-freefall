# ACTIONS: read this first after switching Claude accounts

Karim switches between three Claude accounts. Every session, on every account, **updates this file after each action**:
1. Overwrite "Last action".
2. Update the action table.
3. Append one line to the log.

Times are local (UTC+3).

## Last action
2026-11-15 01:41, build session (Fable orchestrator): **Karim gave the go-ahead at 01:25** (his words: "Go ahead and build Firebreak. This is my approval to start coding now."). T1 done (`scripts/check.ps1`), T2 done (PR #1 + PR #2 merged: skeleton, `web/src/contract.ts`). Running now: coder A (pipeline, T3) and coders B-E (data, engine, stage, UI: T4-T7), each in `E:\fif-wt\A..E` with a Sonnet QA pass. **Next: review and merge their PRs one at a time (A, B first), then milestone T8.** Decisions and open calls: `STATE.md`.

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
| 7 | Development: Fable orchestrator + Sonnet coders work through `docs/plan.xml` | development session | **running** (T1, T2 done; T3-T7 with coders) | T1-T14 done, `scripts/check.ps1` green |
| 8 | Wireframes, then the look and feel (Fable proposes; Karim picks) | design session with Karim | pending | Karim picks a direction |
| 9 | Milestone T8: DEMO-SLICE works in a local build | development | pending | STATE.md checklist |
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

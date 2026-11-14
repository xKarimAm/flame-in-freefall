# STATE (build session, started 2026-11-15 01:25 on Karim's go-ahead: "Go ahead and build Firebreak. This is my approval to start coding now.")

## Check-in (max 10 lines)
- Done: T1 `scripts/check.ps1` (green and red path proven); T2 skeleton merged (PR #1, PR #2).
- In progress: T3 pipeline (coder A), T4-T7 data, engine, stage, UI (coders B-E), each with a Sonnet QA pass.
- Not done: T8 milestone, T9-T14.
- Needs your call: see the list at the bottom.

## DEMO-SLICE checklist (T8)
- [ ] 1. Local build + preview works (`npm run build`, `npm run preview`); no public deploy
- [ ] 2. SVG stage plots real plottable tests, "plotted N of M"
- [ ] 3. Sliders update the 10 nearest tests; label "Nearest tested conditions, not a prediction"
- [ ] 4. Moon box and ISS air drawn from `data/curated/moon.json`
- [ ] 5. Analyst table: all investigations, ranges, counts, every number linked
- [ ] 6. English only; `scripts/check.ps1` green

## Decisions (orchestrator)
- 01:35 **check.ps1 and safe.directory.** OWNERS.md says to add the global `safe.directory *` entry if missing. It is missing, and adding it writes `C:\Users\Admin\.gitconfig`, which AGENTS rule 9 forbids. The script sets it for its own process only (`GIT_CONFIG_*` env). Git works without the global entry in this session.
- 01:35 **Unique test ids.** PSI-10 and PSI-159 have two CSV files each and the old draft repeated ids. Rule now in `contracts/README.md`: the lowest-`k` file keeps `PSI-N#row`; other files use `PSI-N#<k>-<row>`.
- 01:35 **Schema:** added optional `pressure_note`, `flow_note` to `tests.schema.json` (COVERAGE.md already expected them).
- 01:35 **"Plotted N of M":** M = rows in `tests.json`; unmapped CSVs are listed in COVERAGE.md and are not in M.
- 01:35 **Order:** T3 (pipeline) starts before T2 merges, and T6/T7 run in parallel with T4. `plan.xml` lists them as dependent. Reason: the pipeline touches no web file, and stage/UI code against an interface (`web/src/contract.ts`), not coder B's code. The dependency is enforced at merge: B merges first, then D and E are rebased and re-checked against the real data module.
- 01:35 **Merge gate** is `scripts/check.ps1` green locally (KICKOFF). GitHub CI also runs on each PR; I don't wait for it.
- 01:35 **Old pipeline draft** (`E:\fif-wt\pipeline\pipeline\`, made by the banned agent; `E:\fif-wt\pipe\pipeline\` holds byte-identical copies of the four `ffpipe` files). No `_probe*.py` files are left in either folder. Reviewed by me: plain parsing code, no network calls, no invented values (unparseable → null + note). Verdict: reuse as a starting point; coder A re-checks every file and its tests decide.
- 01:35 **`failing-materials` sheet:** `story-demo.json` names it, but `data/curated/moon.json` has no materials list. I did not add one tonight: curated entries must be checked against the paper, not copied from STORY.md. The sheet shows the lunar margins (in `moon.json`) and the source link until a checked list is added.

- 01:39 **PR #1 mishap.** My push of the skeleton commit to PR #1's branch was rejected, so GitHub merged PR #1 at its old head (the Plot scaffold). PR #2 put the skeleton on top within a minute; no coder had started on web. Plot is gone from `package.json`.
- 01:40 **Outcome words.** `contract.ts` groups recorded outcomes for colour: burned = burned, completion, flow-terminated; went out = extinction, self-extinguished; other = disruption, no-ignition, unknown. This is a reading of NASA's labels, not new data.
- 01:40 **Chrome strings:** stage and engine keys are seeded in `en.json` by me; only coder E edits `en.json` in this wave, so parallel branches don't collide.

## Open questions / stuck
(none yet)

## Needs Karim's call
1. Old worktrees and branches (`E:\fif-wt\pipe`, `E:\fif-wt\pipeline`, `E:\fif-wt\web`; `lane/pipeline/build`, `lane/pipeline/tests-json`, `lane/pipeline/work`, `lane/web/logic`, `lane/web/work`): keep or remove? I left them untouched.
2. `safe.directory *` in the global git config (on C:): add it, or keep the process-only setting?
3. Home page: built as STRUCTURE-v2 proposes (opens on Act 1, Stories rail + overlay, "Skip to Moon air"). Say if you want the picker as a gate.
4. Story library series: built as proposed (one story for SAFFIRE I-III, one for SAME/SAME-R; 18 stories for 22 investigations).
5. A checked "materials unlikely to pass" list for `moon.json` (from ICES-2022-45), so the failing-materials sheet can show names.

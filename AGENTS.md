# Agent rules: Flame in Freefall (NASA Space Apps 2026, challenge #7)

Read in order: `ACTIONS.md` (last action + plan; update it after every action, Karim switches between 3 Claude accounts), `HANDOVER.md`, this file, `PLAN.md`, your lane's `PLAN.md`, `contracts/README.md`.

## The product in one line
A dashboard that puts every NASA microgravity fire experiment (PSI) on one comparable footing, every number traceable to its PSI row, and shows where the evidence for a Moon base runs out.

## Hard rules
1. **Lanes.** You write only inside your lane folder (`pipeline/` = W1, `web/` = W2). Everything else is read-only: `contracts/`, `data/psi-snapshot/`, `data/curated/`, `.agents/`, `.github/`, `PLAN.md`. Need a change there? Open a GitHub issue (`gh issue create --label lane:<target> --label needs-triage`) and keep going against the golden samples.
2. **Contracts win.** JSON files must validate against `contracts/*.schema.json`. A contract change is the orchestrator's call (label `contract-change`).
3. **Never invent data.** Every number shown comes from a PSI row (`source` block) or from `data/curated/` (each entry has a source URL). No placeholder numbers in shipped files. If a value can't be parsed, it is `null` plus a note, never a guess.
4. **AI text is tagged.** Any text a model wrote carries `{"model": ..., "made_at": ...}` and quotes that appear verbatim in the PSI text. The UI labels it "AI summary".
5. **No secrets in git.** Keys live in `.env` (git-ignored). Never print a key; check one by name and length only.
6. **Tests are the oracle.** Done = the tests in your lane PLAN pass and CI is green. A test changes only when the PLAN changes.
7. **Git:** branch `lane/<name>/<task>`, Conventional Commits, one PR per task, never merge your own PR. Inside the Muse sandbox run git as `git -c safe.directory=* ...`.
8. **Stuck rule:** the same command failing the same way three times: stop, write it under Open questions in your lane `STATE.md`, report.
9. Keep everything on E:. Never write to C:.
10. **Agents:** the orchestrator (Fable) plans and reviews; Sonnet subagents code (parallel only on separate files); Muse Spark (`muse-spark-1.3-contributor`) for quick tasks and summary API calls. Never Muse Wonder, no other coding agents.
11. Story, lenses and design: `docs/STORY.md`, `docs/design/DESIGN.md`. Stack: HTML + CSS + three.js (Vite + TypeScript), static site.

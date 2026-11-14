# KICKOFF: paste this into the build account (Claude Code, folder `E:\flame-in-freefall`)

Model **Fable 5.2**, effort **high**, permission mode **auto** (`.claude/settings.json` sets these). Karim types his go-ahead in his own words first, then pastes the prompt below. Per Karim's global rules, the session builds only after his own words, in that conversation.

---

You are the build orchestrator for Firebreak (NASA Space Apps 2026 #7, "Flame in Freefall").

**Read in this order:**
1. `ACTIONS.md`
2. `docs/plan.xml`: the task list (T1-T14) you work through
3. `AGENTS.md`
4. `docs/review/STRUCTURE-v2.md` (decisions; its timed build order is replaced by `docs/plan.xml`)
5. `docs/STORY-LIBRARY.md`
6. `contracts/` (all files)
7. `docs/OWNERS.md`
8. `docs/STORY.md`
9. `docs/design/DESIGN.md`
10. `docs/structure.drawio`: page 1 data flow, 2 story, 3 build tasks, 4 development. It's XML; read the cell `value`s.

Where `HANDOVER.md` differs from these, these win.

**Your job:** work through the tasks in `docs/plan.xml` (dependency order, no clock times), building to the contracts, until Karim checks in.
- You plan, split the work, review diffs and merge.
- **Sonnet subagents** (`.claude/agents/coder.md`) write the code: coders A-E, one folder each per `docs/OWNERS.md`, in parallel only on separate folders, each on its own branch or worktree under `E:\fif-wt\`.
- No Muse Wonder and no other coding agents. The Muse Spark key in `.env` is a reserve only, for when Claude limits stop work.
- Never print keys.

**First hour (you, before any coder):**
1. Write `scripts/check.ps1` exactly as `docs/OWNERS.md` defines it.
2. Review open PR #1 (Vite + TS + vitest scaffold). Drop Observable Plot, add `three` and `scrollama`, keep vitest. Create empty `web/src/{data,engine,stage,ui,i18n}/` with a `mount()` per module and a `main.ts` that imports them. Add `.gitattributes` if missing. Merge when `check.ps1` is green.
3. Review the old pipeline draft in `E:\fif-wt\pipeline\pipeline\` (made by a banned agent). Reuse it only after review; delete the `_probe*.py` files.

**Rules:**
- **Contracts win.** A coder needing a contract change proposes it in its PR; you edit `contracts/`.
- **Never invent data.** A number without a PSI row or a curated source is not shown. Story text comes only from `docs/STORY.md`, `docs/STORY-LIBRARY.md` and the PSI text.
- **Merges:** one PR at a time, rebased on `main`, with `scripts/check.ps1` green.
- **Stuck rule:** 3 failures → write it in `STATE.md` and move to the next item.
- **Milestone (task T8):** `contracts/DEMO-SLICE.md` works on real data in a local build (`npm run build`, `npm run preview`). The repo stays **private**; don't deploy to a public host until Karim chooses one.
- **Don't edit** `docs/design/`, `docs/STORY.md` or `docs/wireframes/`. The design session owns them.
- **After every action**, update `ACTIONS.md`: last action, table, log. Karim switches between 3 accounts.
- **When Karim checks in:** at most 10 lines in `STATE.md`: done, not done, needs his call.

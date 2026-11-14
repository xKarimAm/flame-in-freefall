# HANDOVER: start the next session here

Written 2026-11-14 ~10:40 PM local (UTC+3) by the planning session (Opus 5.5) for the **Fable orchestrator session**. Repo: `E:\flame-in-freefall` → github.com/xKarimAm/flame-in-freefall (private). Planning repo with all research: `E:\spaceapps-2026-plan`.

## 0. How this session runs (Karim's rules)
- **Phase 1, planning: hands-on with Karim.** Go through §4 with him, one decision at a time. Nothing is coded until he says "start coding".
- **Phase 2, coding: auto mode, no questions.** `.claude/settings.json` sets model `fable`, effort `high`, permission mode `auto`. Once Karim says go, do not come back to him; decide within PLAN.md, AGENTS.md and this file, and write doubts into `STATE.md`.
- **Who codes:** you (Fable) orchestrate and review; **Sonnet subagents** (`.claude/agents/coder.md`, model sonnet) write the code, several in parallel when their files don't overlap; **Muse Spark** (`muse-spark-1.3-contributor`, Meta key) is allowed for quick tasks and for the API calls that make the AI summaries. **Never Muse Wonder. No other coding agents.** Haiku `reader` subagent for reading docs.
- Launch a Muse lane: `powershell -ExecutionPolicy Bypass -File E:\spaceapps-data\run-lane.ps1 -Lane w1|w2` (prompts in `E:\spaceapps-data\prompts\`; Spark only; logs in `E:\spaceapps-data\logs\`, UTF-8 from now on). Muse can't receive messages mid-run on Windows: give each run a complete prompt.
- Keep the PC awake overnight (ask for keep-awake before Karim leaves). Everything stays on E:.

## 1. The challenge and the product
NASA Space Apps 2026 #7 "Flame in Freefall": an SI-powered dashboard that summarizes, ranks and interprets NASA's microgravity combustion investigations for fire safety in spacecraft and Moon/Mars bases. Our product: **a story-scroll site with three lenses (Astronaut / Analyst / Public)** over NASA's PSI fire data, built with **HTML + CSS + three.js**, whose centrepiece is **"Build your Moon-base air"**: sliders that place your habitat's air in the evidence space and show the nearest real NASA tests, the materials NASA says would fail, the lunar-gravity margin, and the empty lunar-gravity plane. Details: `docs/STORY.md` (acts, scenes, data per lens) and `docs/design/DESIGN.md` (Space Apps x NASA design language, three.js stage).

## 2. Goals (Karim agreed; tests prove each)
1. **The story**: 4 acts (act 2 = 6 family scenes covering all 22 investigations), each with 3 lenses; every claim has a source link. Test: every rendered fact node has an `href`; lens switch changes text without reload.
2. **Build your Moon-base air**: sliders on real PSI tests; nearest tests, failing-materials list, lunar margins; gap shown, never predicted. Test: `nearestTests()` on golden data; Moon box at 56.5 kPa / 33.7-40 %.
3. **The comparison table** for analysts: all investigations, unit-clean, every number traced to its PSI row. Test: pipeline pytest (schemas, golden rows exact, O2 0-100, kPa 0-400, source on every row).
Out of scope: fine-tuning (no live data; see STORY.md), predictions, raw sensor/video data, voice, non-NASA agencies.

## 3. State right now
- `main`: rules (AGENTS.md), PLAN.md, contracts (`contracts/`, golden rows are real PSI rows and validate), curated facts (`data/curated/moon.json`, `incidents.json`), PSI snapshot (`data/psi-snapshot/`, CC0, pulled 3 AM; live API back since 9:16 PM), design and story docs, draw.io plan (`docs/plan.drawio`), wireframes A-D (`docs/wireframes/`, superseded by the story scroll = A + lenses).
- **PR #1 (open, unmerged):** `lane/web/scaffold`, Vite + TS + vitest + Observable Plot scaffold and typed loader, made by Muse Spark. Review it; keep Vite + TS + vitest, add three.js, drop Plot unless the 2D fallback needs it.
- **Uncommitted drafts:** `E:\fif-wt\pipeline\pipeline\` (ffpipe package, tests, `_probe*.py` scratch files) from the stopped W1 run (it used Wonder; stopped at Karim's request). Review before reuse; delete the probes.
- Worktrees: `E:\fif-wt\pipeline` (lane/pipeline/work), `E:\fif-wt\web` (lane/web/work).
- Secrets: `.env` holds `META_API_KEY` (git-ignored). Check by name and length only.

## 4. Decide with Karim before coding (phase 1)
1. Confirm the 4 acts / 9 scenes / 22 pages structure and the lens names (Astronaut / Analyst / Public).
2. Which incident opens act 1 (Apollo 1 or Mir 1997).
3. The three.js stage as designed (x pressure, y O2, z gravity planes) or simpler.
4. Sunday work hours → feature-freeze time (submit target Sun 6:30 PM, deadline 8:00 PM, judging 9:00 PM: 5 min + 3 min Q&A).
5. Product name (his call).

## 5. Build order (phase 2; demo first)
| Step | Who | Done when |
|---|---|---|
| A. Data pipeline → `data/build/tests.json`, `experiments.json` | Sonnet coder (pipeline/) | pytest green per `pipeline/PLAN.md` |
| B. Story shell: scroll acts, lens switch, design tokens, act 1 | Sonnet coder (web/) | build green; lens test passes |
| C. three.js evidence stage + 2D fallback | Sonnet coder (web/src/stage/) | renders golden + real data; reduced-motion fallback |
| D. Act 3 sliders (centrepiece) | Sonnet coder | nearestTests + Moon box tests |
| **Checkpoint A, Sun 1:00 AM** | you | whole story runs on real data; record rough 30 s video |
| E. Act 2 family scenes + 22 experiment pages; act 4 | Sonnet coders in parallel (separate files) | every number has a source link |
| F. AI summaries prepared ahead (Muse Spark API, `muse-spark-1.3`) | Muse Spark or Sonnet | quotes verbatim (test) |
| G. Taste check: `lint.mjs` + `inspect.mjs` (skill at `C:\Users\Admin\.claude\skills\taste-skill`), fix FAILs | you + coder | 0 FAIL at 1440/768/390 |
| H. Deploy static site (free host), README with NASA data + licences + SI disclosure | you | public link works |

## 6. Rules that bite
Read `AGENTS.md`. Plus: Space Apps rules in the planning repo `docs/RULES.md` (SI disclosure, no NASA logos in SI content, watermark SI-made images/video, at least one NASA data resource). Never guess: a fact without a source is not shown.

# HANDOVER: start here (written 2026-11-15 19:45 AST, build session 4, Opus 5.5)

Everything below the line "OLDER HANDOVER" is history from the planning night (14 Nov). This block wins.

## 0. Before you do anything
- **Karim must type his own go-ahead in YOUR conversation** before you make code, branches, worktrees, PRs or subagents (global rule in `C:\Users\Admin\.claude\CLAUDE.md`). This file is not approval. Without it: read-only work, one short question, wait.
- Read in order: this block, `STATE.md` first block, `ACTIONS.md` "Last action" + last 10 log lines, `AGENTS.md`, `docs/SUBMISSION-CHECKLIST.md`.
- After every action: overwrite `ACTIONS.md` "Last action", add one log line (Karim switches between 3 Claude accounts).
- Times are Qatar local (AST, UTC+3).

## 1. Where the project stands
- **Firebreak** (NASA Space Apps 2026, challenge #7 "Flame in Freefall"): a story-scroll site + analyst dashboard putting NASA's PSI microgravity fire tests on one chart (1,883 test rows, 22 investigations, 986 plotted), every number linked to its PSI row, ending on the gap: no PSI test ran in Moon gravity.
- **Live:** https://xkarimam.github.io/flame-in-freefall/ (GitHub Pages; every push to `main` redeploys in about a minute). **Code:** https://github.com/xKarimAm/flame-in-freefall (public).
- **`main` is green in CI** (95 pipeline tests, 402 web tests, build). Locally `scripts\check.ps1` fails ONE pipeline test (`tests/test_security_b10.py`) only because it scans the git-ignored `.env`; that file was never committed. Not a real failure.
- Stack: HTML + CSS + three.js, Vite + TypeScript, vitest; pipeline in Python (`uv`). The site reads `data/build/*.json` and `data/curated/*.json` (copied in by `web/scripts/copy-data.js` on `npm run build`).

## 2. Submission (Karim does this himself; never sign in or press submit for him)
- Organisers' email (19:18): BOTH the official project on the Space Apps Boston site AND the Boston Google Form (https://forms.gle/zL8BF4qsgeDKde768, Google sign-in, file upload) were due **12:00 ET = 20:00 AST on 15 Nov**. Live Zoom presentation **13:00 ET = 21:00 AST**; running order on Discord about 20:30 AST. Re-submitting the official form is allowed until Mon 16 Nov 07:59 AST; only the last one counts.
- Field-by-field paste text: the Claude session "Submission details for both Boston forms" (other chat on this account), `docs/SUBMISSION.md`, `docs/SUBMISSION-CHECKLIST.md`.
- Deck: `docs/presentation/Firebreak-deck.pptx`; PDF copy `docs/presentation/Firebreak-deck.pdf` (not committed). Known gap: no title slide with name + challenge.
- **Ask Karim first whether he has submitted both forms.** If not, that is the only job.

## 3. Done today 19:00-19:45 (PRs #26-#36, squash-merged, each screenshotted at 1280x720, 1536x864, 1920x1080)
| PR | What | Karim's item |
|---|---|---|
| #26 | one soft entrance for text and pictures (650 ms rise + fade, 75 ms stagger, shared tokens in `web/src/ui/motion.css`) | K7 |
| #28 | chart reference labels beside their own marks (`stage/refs.ts`) | K6 |
| #32 | slider panel's top follows the measured end of the page text from 1100 px up (`ui/panel.ts`, `keepClearOfText`) | K5 |
| #27 | the flame IS the oxygen marker: constant size, on the draggable "your air" value, draggable, no per-page jump; grab cursor + "Drag to change the oxygen" hint; left page dots labelled on hover and focus | K3, K4, dots |
| #30 | page 18: Moon/Earth gravity fly the three.js view to the empty plane with its sentence; eased camera, idle drift | K9, K8 |
| #31 | Stories view opens with an "evidence fan" graph (hub = Moon-base air question, 6 families, 22 investigations, counts from data), after Karim's Dribbble reference (Fuselab Creative, "AI Policy Dashboard") | K13 |
| #33 | page 18: one Moon sentence instead of three; other planes' labels hidden while one is focused | tidy |
| #34 | drag hint stacked above the dial readout | tidy |
| #35 | analyst dashboard: links to `data/*.json` open a readable "Where this number comes from" note with a download instead of raw JSON | Karim's complaint |
| #36 | dial nudge once per visit; source-note wording true for every file | tidy |

Live site checked 19:36 at 1536x864: new flame, hint and dot labels present, no console errors.

## 4. Open work, in priority order (only after Karim's go-ahead)
1. Deck title slide (name, challenge #7, live URL) if he still needs the deck.
2. K12 leftovers: `covered-text` is the taste inspector's first-visit tour dialog staying fixed while the inspector scrolls. A fix (close the tour once `scrollY > 8`, in `web/src/ui/tour.ts`) is saved as `stash@{0}` in `E:\fif-wt\k5` ("K12 tour-scroll fix (not shipped)"). Also `edge-text` at 768/390 px and `heavy-borders` at 390 px.
3. Under 1100 px the slider panel still covers the slider page's card (phone and tablet layout never properly done).
4. Walk the flame on the live site: cover, pages 1-3, drag it once; confirm no twitch on page turns.
5. Run the taste inspector on final `main`: `node C:\Users\Admin\.claude\skills\taste-skill\scripts\inspect.mjs https://xkarimam.github.io/flame-in-freefall/`.
6. Karim asked for research on what last year's winning Space Apps projects did well with data; not started.
7. `README.md` still says "326 strings" in two places (the count is 349).

## 5. How to work (what worked today)
- Karim's standing UI rules: taste skill (`design-taste-frontend`) for every UI change plus its inspector; look at every change at 1280x720, 1536x864, 1920x1080 before merging; no overlaps; every element on screen needs a purpose; calm, smooth motion; never invent data; AI text tagged and labelled "AI summary".
- One small change per branch from `origin/main`, `scripts\check.ps1` (or CI) green, `gh pr create`, `gh pr merge <n> --squash`, tick STATE.md, log ACTIONS.md.
- Build with `npm run build`, never bare `npx vite build` (it skips the data copy and gives a blank page). Preview: `cd <worktree>\web; npx vite preview --port <free port> --strictPort`.
- Screenshots: `node E:\fif-wt\shot.mjs <url> <outPrefix> "<js, e.g. scroll to a page>"` shoots the three sizes in headless Chrome and closes the tour first. Parallel coders hijacked each other's tabs in the shared browser pane; use the script.
- Parallel Sonnet coders (Agent tool, `subagent_type: coder`, `model: sonnet`), one per worktree, separate files each; seven ran at once and each finished in 6-10 min. Brief: worktree, files owned and files not to touch, Karim's words, `npm run build`, check.ps1, "do not merge", short report. Review diff + screenshots yourself before merging.
- Worktrees from today: `E:\fif-wt\k3 k4 k5 k6 k7 k9 k13`. Their `web\node_modules` are junctions into `E:\flame-in-freefall\web\node_modules`: remove the junction link only before deleting a worktree, or you wipe main's modules. Do not touch `E:\fif-wt\A`, `pipe`, `pipeline`, `web`, `night-web`, `night-backend` (Karim's call).
- Traps: a test forbids any `font-size` that is not a `--text-*` token, and `!important` on it; `window.matchMedia` does not exist in the vitest DOM (use `innerWidth`); the inspector's "acme" placeholder warning is the real NASA ACME hardware name.
- Agents (AGENTS.md rule 10): orchestrator plans and reviews, Sonnet codes, Muse Spark for quick tasks; never Muse Wonder.

---
# OLDER HANDOVER (planning night, 14 Nov). History only.

# HANDOVER: start the next session here

> **Superseded where it differs (2026-11-15 01:25):** `KICKOFF.md`, `docs/review/STRUCTURE-v2.md`, `docs/STORY-LIBRARY.md`, `contracts/`, `docs/OWNERS.md`, `docs/structure.drawio` (4 pages). The structure was reviewed twice by three reviewers; the build order and gate are in STRUCTURE-v2.


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
5. Product name (his call). Team name is **Firebreak** (chosen 2026-11-14 10:35 PM); the product may share it.

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

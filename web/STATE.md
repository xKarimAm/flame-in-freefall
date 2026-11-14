# Lane W2 (web) state

## Goal
Static site (Vite + TS, no framework) reading `data/build/*.json` + `data/curated/*.json`
(golden fallback until W1 lands): opener, compare table, Moon chart, experiment page.
Every number links to its PSI row; AI text tagged; partial gravity = labelled no-data band.

## Key decisions
- Data path is the single constant `DATA_URL_BASE` in `web/src/data.ts`.
- `scripts/copy-data.js` runs on `predev`/`prebuild`: prefers `data/build/`, falls back
  to `contracts/golden/`, always adds `data/curated/`. Byte-for-byte copy, no invented numbers.
- One CSS file (`src/style.css`), small render functions, hash router (Karim picks wireframe later).
- Pure logic (`nearestTests`, `rankExperiments`, formatting, Moon chart spec) unit-tested first.
- Toolchain workarounds on this machine (no C: writes, broken npm.ps1/gh config):
  `TEMP/TMP/TMPDIR=web/tmp`, `GH_CONFIG_DIR=web/tmp/ghcfg`,
  npm via `E:\nodejs\node.exe E:\nodejs\node_modules\npm\bin\npm-cli.js`,
  git network ops with token-URL + `-c credential.helper=`. Never print the token.

## Task list (web/PLAN.md order)
1. [done] Scaffold: Vite + TS + vitest + Plot, copy script, data.ts loader. `npm test && npm run build` green.
2. [todo] Pure logic with unit tests: nearestTests(), rankExperiments(), formatting, Moon chart spec.
3. [todo] Screens: Opener, Compare, Moon chart, Experiment page.

## File map
- `web/package.json` — scripts: predev/prebuild copy, dev, build (`tsc --noEmit && vite build`), test (`vitest run`)
- `web/src/data.ts` — `DATA_URL_BASE`, schema types, parse* validators, `loadAll()`
- `web/src/data.test.ts` — loader tests against golden + curated files
- `web/scripts/copy-data.js` — build/golden + curated -> `web/public/data/`
- `web/src/main.ts`, `web/index.html`, `web/src/style.css` — bootstrap placeholder (screens in task 3)

## Current step
Task 1 done on `lane/web/scaffold`; PR to open. Next: task 2 from that branch.

## Open questions
- Env: `npm`/`gh`/git-credential wrappers broken outside E: (see Key decisions). CI (ubuntu) unaffected.
- Doubt for orchestrator if it matters: none yet; golden fallback active since `data/build/` absent.

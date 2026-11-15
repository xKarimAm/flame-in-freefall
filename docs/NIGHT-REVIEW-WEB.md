# Night review: web lane (backend reviewer, B12)

Reviewer: backend lane (Muse Spark). Scope: every finding is against the
committed tip named below; the working tree had uncommitted task-17 edits
that were NOT reviewed. No file under `web/` or `stories/` was edited.

## Scope and method

- Pinned commit: `02368b8` ("task 16 — three.js tilt", local `night/web`
  in `E:\fif-wt\night-web`). There is NO `origin/night/web`: the web lane
  has never pushed, and `git fetch origin` fails in this sandbox (private
  repo, no usable credentials), so the branch could not be read from the
  remote. Read-only `git show <pin>:<path>` was used throughout.
- `git diff main...02368b8`: 20 commits (tasks 0-8, 10-16; task 9 waits for
  `library.json`; task 17 open), ~2,900 added lines across 31 files.
- `ffpipe.audit` logic run against the pin's `en.json` + all four
  `stories/*.json` (same curated/data sources): 0 URL misses; 9 flagged
  numbers, all `PSI-NN` identifier fragments (see m2).
- Every quantitative analyst/astronaut string re-checked by hand against
  `data/build/*.json`, `data/curated/*.json`, `docs/STORY.md`,
  `contracts/DISTANCE.md`: FLEX 274 / FLEX-2 8 / CFI 87 = 369; CFI-G
  333 = 179 + 154 file rows; Flame Design 327; SPICE 469 (no O2/pressure);
  BASS-II 129 with O2 / BASS 122 without; SAFFIRE 17 rows, 11 with O2,
  0 with pressure; PSI-98#1 SIBAL 21.6 % / 20 cm/s / 420 s / burned;
  SAME-R 109 / SAME 8; ground PSI-60/62/117/142 = 0 rows; heel
  atmospheres 101.4 / 56.5 / 33.7-40 / 70.3 / 26.5-30; Saffire VI paper
  points 54.1/31.0, 54.6/30.3, 55.2/28.8; margins 0.32-2.3; weighting
  sentence verbatim from DISTANCE.md. All trace. No invented data found.
- Web suite independently re-verified at the pin: the pinned `web/`
  tree was extracted to backend `pipeline/.tmp/pincheck/` (junctions for
  `node_modules`, `contracts/`, `data/`; own `vitest.isolated.mts` with
  the cache dir inside tmp — zero writes to the web lane's live
  worktree). `tsc --noEmit` clean; `vitest run`: 8 files, 141/141 tests
  pass (the only stderr is jsdom's expected no-WebGL noise, which the
  fallback tests assert). An earlier 11-failure run was a harness
  artifact (missing `stories/` copy), not pin breakage.

## Verdict

No blocker. The branch is reviewable: every number traces, sources are on
every beat that carries a number, the design rules hold (tokens only, no
gradients/glows/emoji, yellow only Moon box + primary + pre-existing
focus outline, `prefers-reduced-motion` honoured and tested), and the new
tests assert behaviour, not constants — with the exceptions listed.

## Major

- M1. `web/src/i18n/es.json`, `hi.json`: 138 keys vs 208 in `en.json`.
  ~27 chrome keys added after task 10 (explainer boxes
  `ui.stage.exp.*`, slider explainer `ui.panel.exp.slider.*`, tests tab,
  filters, `ui.search.label`, `ui.overlay.count`,
  `ui.stage.earth-line`, `ui.cover.lead`) fall back to English for es/hi
  users. Fix: backend re-translates after merge (this is B13, already
  queued); story-beat keys staying English is intentional (i18n test
  asserts it).
- M2. `web/src/engine/index.ts:128` — "See every experiment"
  (`ui.ending.library`) fires `firebreak:open-overlay`, which opens the
  Stories overlay, while task 9 (library view) is still waiting. The
  label promises experiments the overlay does not show. Fix: relabel to
  "See the stories" until the library lands, then point it at the
  library view.

## Minor

- m1. `web/src/contract.ts` — orchestrator-owned file edited (comment
  only: "burned to the end" -> "kept burning"). Harmless and already
  flagged by the lane for confirmation; needs the orchestrator's sign-off.
- m2. Audit-tool over-match: the 9 flagged numbers are `PSI-NN`
  fragments inside real investigation ids (69, 159, 107, 60, 62, 142,
  101, 102, 26 — every one exists in `experiments.json`). No invented
  data. Fix (orchestrator/backend): teach `ffpipe.audit` to exempt
  `PSI-\d+` tokens whose id exists in `experiments.json`.
- m3. Beats with `"sources": []` render a page with no source link:
  `stories/moon-air.json` hook beat, `stories/what-nasa-tested.json`
  `why-test` and `takeaway` beats. The brief wants a source on every
  page. Fix: add the beat's evidence source (hook -> NTRS 20220006612;
  why-test -> the three droplet PSI links; takeaway -> coverage note).
- m4. `web/src/i18n/en.json:55` — "None of them was burned in Moon
  gravity." Fix: "were" ("None of them were burned...").
- m5. `web/src/i18n/en.json:156` — `ui.outcome.completion`: "Ran to the
  end of the test" echoes the task-1-banned "burned to the end" phrasing.
  The record only says the run completed. Fix: "Completed the test run".
- m6. `web/src/ui/sheet.ts:328` — tests-tab caption
  `"{n} test rows in the data"` shows the FILTERED count. Fix: show the
  total too, or reword to "matching test rows".
- m7. `web/src/ui/sheet.ts:113-114,307-309` — sorting Oxygen/Pressure/
  Flow puts "not recorded" (Infinity) FIRST when descending. Fix: map
  missing to +Infinity ascending / -Infinity descending so missing rows
  stay last both ways.
- m8. `web/src/ui/overlay.ts:22-41` — overlay haystack has titles,
  families and cited investigations/fuels but not the chapter questions,
  so task 14's "matches questions" fails for the overlay. Fix: push the
  chapter question strings into the haystack.
- m9. `web/src/ui/overlay.ts:43-90` — dialog is `aria-modal` with
  Escape/close-focus-restore but no focus trap; Tab leaves the modal.
  Fix: trap Tab inside `.overlay-inner` while open.
- m10. `web/src/engine/index.ts:100-109` — `.page-dots` is fixed-position
  first visually but appended after all content, so keyboard users reach
  it last. Fix: move the nav before the cover in DOM order (keep visual
  placement in CSS).
- m11. `web/src/engine/engine.css:127` — `.page-dot` uses
  `border-radius: 50%` under a square-corners rule. Judgement call: round
  pager dots match the data dots; keep or square them — orchestrator's call.
- m12. `web/src/stage/stage.test.ts:668` — "eases the camera over 600 ms"
  pins `TILT_MS === 600` and the easing math but never proves
  `setTilted` uses `TILT_MS` (no fake-timer test of the animation loop).
  Fix: advance timers and assert the pose reaches tilted after 600 ms.
- m13. `web/src/ui/sheet.ts:417-422` — tabs carry `role=tab` /
  `aria-selected` but no arrow-key navigation (plain buttons otherwise).
  Fix: add Left/Right handling per the ARIA tabs pattern, or drop the
  tab roles and keep them as buttons.
- m14. `web/src/ui/chrome.ts` vs `web/src/engine/index.test.ts` — the
  chips[0]->any-chip assertion change is justified (acts reordered, moon
  air no longer first), not a weakening. No action.

## Verified, no action

- No data value typed into TS/CSS as content (grep over the pin; test
  fixtures mirror story values, tests assert data-read values like
  `33.7` from the real `moon.json`).
- Explainer boxes (`stage/explain.ts:24-48`) and slider explainer
  (`panel.ts:152-156`) fill every number from `moon.json` by id or the
  data API through placeholders; parade counter ends at the real plotted
  total; tilt points are the real placed tests; tilt is aria-hidden with
  the SVG as the accessible version.
- Search/sort/filter: empty input shows all, matching is lowercased both
  sides, families with no plotted tests stay selectable in the sheet and
  yield an honest "0 tests plotted" caption, result counts shown.
- Keyboard: arrows/space/PageUp/PageDown move pages and skip form
  controls, links, buttons and modified keys; dialog has labelled
  buttons, aria-current dots, aria-sort columns, global `:focus-visible`.
- Tests: the number-link rule has a can-fail meta-test; task-0 repoints
  keep every assertion; additions are behavioural (golden + curated
  files, fixtures only for the two missing experiments); no test was
  weakened except the justified m14.

## Minor (task-17 delta)

- m15. `web/src/stage/index.ts` (`dataLink`) and `web/src/stage/parade.ts`
  (`dataLink`) implement the same 8-line helper twice. Fix: keep one
  (e.g. in `ui/dom.ts` beside `cite`/`num`) and import it in both.

## B13 re-run (newest tip `423ea80`, 2026-11-15 ~04:47 UTC)

Re-ran B12 against `423ea80` (task 17 meaning pass, review-fix tasks
18-19 queued, `origin/main` merged in). Delta `02368b8..423ea80` is
10 files: `moon-air.json` interactive beat gains the LPSC source,
`en.json` gains `ui.stage.dial-source` ("Air data", no digits),
legend/parade counts link to `data/tests.json` with tests, dial gains a
deduped source line, plus probe rows and a `.npm-cache` ignore.
Independently verified in the isolated harness: `tsc --noEmit` clean,
`vitest run` 8 files / 143 tests pass.

- Findings fixed: m3 partly — dial marks now name their sources and the
  interactive beat has both its sources; hook / why-test / takeaway beats
  still have `"sources": []`, so m3 stays open, narrowed to those three.
- Still open, unchanged: M1 (now 28 chrome keys incl. `dial-source`;
  translation refresh stays queued for post-merge), M2 (task 18 queued to
  fix it), m1, m2, m4-m14.
- New: m15 above. No new invented data, no new typed content numbers,
  no new design-rule breaks.
- Out of scope (not reviewed, not committed): the web worktree is
  mid-merge with `UU README.md` and staged backend-lane files
  (`data/build/library.json` etc. — the task-9 library merge); any
  commits after `423ea80` need their own look.
- Translation re-run (`python scripts/translate.py es hi`) NOT run: this
  lane's `en.json` does not match the web branch's (209 keys incl. story
  beats vs 112 here), so B13's "only if it matches" condition fails;
  re-translation stays scheduled for after the lanes merge. This lane's
  own `en.json` is unchanged since `es/hi` were generated, so no refresh
  was due on this branch either.

- Re-run this review against the newest `night/web` tip: task 17 was
  already dirtying `moon-air.json`, `en.json`, `stage/*` when this
  pinned review finished, and `origin/night/web` still does not exist,
  so "newest" means the local branch, read with `git show`.
- Translation re-run (`python scripts/translate.py es hi`) is needed for
  the pin's `en.json` regardless: the branch's `en.json` (208 keys, incl.
  story beats) does not match this lane's `en.json`, so B13's "only if it
  matches" condition fails — re-translate after the lanes merge instead.

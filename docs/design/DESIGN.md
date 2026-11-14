# Design spec (orchestrator-owned; W2 applies it)

Dealt with the taste skill (app-screen run): **Achromatic ledger**, light, seed 240444418, kind analytics. Full sheet: `.taste-skill/direction.json` (reprint: `node C:\Users\Admin\.claude\skills\taste-skill\scripts\draw.mjs --show`).
Why this style: an evidence tool read by researchers and judges, where colour must mean data. The chrome stays ink; one hue marks the data that answers the question.

## The move (keep it intact)
- No colour in the chrome. The one primary action is near-black `#141414`; secondary is a grey pill `#e5e5e5`.
- **One chart hue `#1d5fbf`** goes only on the main data element of each screen (below). Everything else is ink `#141414` or grey `#8a8a8a`.
- The only other hue is a small signal: `--warning #92400e` for the "no partial-gravity data" band label and bad-cell notes.
- Under 1% coloured pixels. No shadows at rest, no gradients, no tinted cards, no icons in tinted squares, no sparklines, no emoji, no rainbow charts.

## Face (what makes it ours, not a kit)
- **Ground:** blue-grey `#f2f4f7` instead of `#f8f8f8` (a lab ledger). Cards stay white `#ffffff`, 1px `#e6e6e6` edge, 8px radius; controls 6px.
- **Signature element: the Moon box.** On the evidence chart, the selected atmosphere is a box drawn in the hue (outline + 6% fill) at its real pressure/O2 (e.g. 56.5 kPa, 33.7-40%). The nearest real tests are the only other hued marks. All other tests are grey dots; micro-g filled, 1-g hollow.
- Figures: Geist, `font-variant-numeric: tabular-nums`, units as smaller grey suffixes (`56.5 kPa`, `33.7-40 %`).

## Tokens (paste into `web/src/styles.css` `:root`)
```css
:root {
  --ground:#f2f4f7; --surface:#ffffff; --raised:#eeeeee; --border:#e6e6e6; --rule:#f0f0f0; --control:#d4d4d4;
  --text:#0a0a0a; --muted:#6b6b6b; --accent:#141414;
  --positive:#2e7d32; --negative:#c4242a; --warning:#92400e;
  --chart-1:#141414; --chart-2:#8a8a8a; --chart-3:#1d5fbf;
  --pill-positive-bg:#dcfae5; --pill-positive-ink:#04250e; --pill-negative-bg:#ffedea; --pill-negative-ink:#831c1e;
  --pill-warning-bg:#fffbeb; --pill-warning-ink:#92400e; --pill-neutral-bg:#eeeeee; --pill-neutral-ink:#3d3d3d;
  --radius-card:8px; --radius-control:6px; --row-height:44px; --gap:12px; --pad:24px; --control-height:36px;
  --fs-title:24px; --fs-section:16px; --fs-kpi:30px; --fs-body:14px; --fs-small:12px;
}
```
Type: Geist 400/500/700 (Google Fonts link in the sheet). 700 only on the headline figure. Sentence case everywhere, no tracked capitals, no monospace except PSI IDs.

## Shell
Icon rail 55px on the ground with a 1px edge (four destinations: Incident, Compare, Moon, Experiments; outline icons with tooltips and accessible names). Phone: bottom bar with the same four, short labels. Canvas: 24px gutters, one gap value (12px) everywhere.

## Each screen: one question, one finding (the finding is computed from the data, never typed)
| Screen | Question (title-row line) | Biggest thing | Finding line under the title |
|---|---|---|---|
| Moon (main) | "Has NASA tested fire at Moon-base air?" | The O2 vs kPa chart, ~360px tall, two-thirds width; rail on the right = 10 nearest tests list | Built from data: e.g. "`{n}` of `{N}` PSI tests fall inside the Moon box; the nearest is `{id}` at `{o2}` % and `{kPa}` kPa (`{outcome}`)." If n = 0, say so plainly |
| Compare | "Which experiments speak to this environment?" | The ranked table | "Ranked for `{atmosphere}` by O2 and pressure distance; `{k}` of `{N}` have recorded outcomes." |
| Opener | "Why oxygen matters" | The incident statement (date, oxygen, what changed) | The pattern quote with its source (ICES-2020-173) |
| Experiment | the investigation's name | Objective (verbatim) + AI summary tagged "AI summary" | Test count, O2 and kPa range, papers count, PSI link |

Charts: y-scale always shown; 3-5 faint gridlines; no legend for one series; label the Moon box and the no-data band on the chart itself. Use Observable Plot styled to these tokens, or `docs/design/charts.js` patterns. Tables: rules only, no zebra, numbers right-aligned, `—` for missing values, never `0` for missing.

States: every block has empty / loading / error; every row and control has hover, focus (visible), selected.

## Checks
`node C:\Users\Admin\.claude\skills\taste-skill\scripts\lint.mjs --app web/src` and `node ...\inspect.mjs --app <built index.html>`; fix every FAIL. The orchestrator runs these on each web PR.

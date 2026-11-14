# Story library: one story per investigation (spec, DRAFT for Karim)

Karim's direction (2026-11-15 00:50): the library outside the landing page holds stories where **each story is built on the core of its own experiment**. Each has its own meaning, personality, and way of showing its data. The data and how it is seen come first; the theme comes second.

Sources:
- Each "core" below comes from the investigation's PSI record (`objective` / `hypothesis` / `experimentHardware` in `data/psi-snapshot/psi*.json`).
- Row counts are CSV line counts. The pipeline re-measures them (`contracts/COVERAGE.md`).
- Nothing here is new science. The story text quotes the PSI objective and links to it.

Inspiration (2025 winners, `E:\spaceapps-2026-plan\research\WINNERS-2025.md`):
- A narrator voice and acts (*A Solar Tale*, Best Storytelling).
- One sharp scientific idea per view (SpaceGenes+, a solo winner).
- A "would it survive?" test against real NASA data (PureFlow).

## How every library story is built (the template)
- **Core question:** one line, quoting the objective.
- **Voice:** the story's personality, used in the Public lens. A tone, not invented facts.
- **Signature view:** ONE chart kind that fits this experiment's data. The engine supports 6 kinds:
  - `condition-map`: O2 × pressure (or fuel × diluent) dots, coloured by outcome.
  - `sample-wall`: one card per material sample, with its burn result.
  - `outcome-strip`: tests in run order, lit or not, with the variable that changed.
  - `size-histogram`: the distribution of a measured size.
  - `threshold-line`: a measured limit vs a control variable.
  - `paper-trail`: a ground study and the flight data it used, with its publications.
- **The moment:** one fact computed from the data by the pipeline, never typed by hand (e.g. "lowest O2 that still burned"). It is the story's climax and has a source row.
- **Bridge:** one line linking back to the Moon-air question, or "this one is about X, not habitat air" when it doesn't apply.
- **Beats:** Hook → Reveal (signature view) → Moment → Bridge. Four beats, short. Same contract as `contracts/story.schema.json`.

## The 22 stories
| PSI | Story | Core (from PSI objective) | Voice | Signature view | Data (rows) | The moment (computed) |
|---|---|---|---|---|---|---|
| 98, 99, 100 | **SAFFIRE I-III: the fire they let grow** | "determine how rapidly a large scale fire grows in low-gravity" and compare with NASA's normal-gravity screening test; burned in an enclosure in a Cygnus cargo ship | the brave test: it burned on purpose | `sample-wall` | 4 + 15 + 2 | longest burn / which materials burned at which flow |
| 26 | **BASS: does Earth's test tell the truth?** | "bridge the gap between the normal gravity NASA-STD-6001 Test #1 method ... and actual material flammability in microgravity" | the skeptic | `sample-wall` | 122 | samples that burned in space vs the screening expectation |
| 25 | **BASS-II: a gentle breeze is enough** | ignition, spread and extinction limits of solids in low-velocity flows; hypothesis: with "adequate ventilation, burn as well if not better" than in 1 g | the surprise | `threshold-line` (flow vs spread/extinction) | 129 | lowest flow that still sustained a flame |
| 69 | **FLEX: putting fire out in space** | "map the flammability limits of liquid fuels in microgravity" and "measure the effectiveness of ... CO2, He, and SF6" as suppressants | the firefighter | `condition-map` (O2 × diluent, outcome) | 274 | extinction vs completion boundary per suppressant |
| 68 | **FLEX-2: fuels like the real thing** | extend FLEX-1 "to fuels and environmental conditions that mimic real combustor conditions" with bi-component droplets | the engineer | `condition-map` | 8 | the mixture that behaved differently |
| 39 | **CFI: flames that burn cold** | dodecane droplets "at pressures ranging from 0.25 atm to 5 atm" and "helium dilution on cool flame behavior" | the mystery | `condition-map` (pressure × O2, cool or hot) | 87 | pressure range where cool flames appeared |
| 159 | **CFI-G: cool flames on demand** | "determine the conditions for which cool diffusion flames occur" for propane, n-butane, n-pentane, normal and inverse flames | the recipe book | `condition-map` (XO2 × fuel, cool yes/no) | 179 + 1015 | the cool-flame boundary |
| 10 | **Flame Design: a flame without soot** | "soot-inception limits" of normal and inverse spherical flames vs flow, dilution and pressure | the designer | `condition-map` (normal vs inverse) | 207 + 120 | where soot starts |
| 20 | **BRE: a burner that acts like a solid** | burning conditions in a quiescent microgravity ambient "in terms of material properties", porous burners 25 and 50 mm | the stand-in | `outcome-strip` | 18 | which burner/O2 mixes ignited |
| 21 | **CLD: the faintest flames** | weak coflow flames "at the extremes of the fuel dilution spectrum" to test computer models | the whisper | `outcome-strip` (dilution) | 32 | the most dilute flame that still lit |
| 22 | **E-FIELD: steering a flame with electricity** | the link "between electric field voltage and chemi-ion current" and flame response to field changes | the rebel | `outcome-strip` (polarity) | 32 | lit runs by mesh polarity |
| 23 | **s-Flame: the perfect sphere** | transient structure of spherical flames, sooty and soot-free, compared with detailed simulation | the benchmark | `outcome-strip` | 18 | atmospheres that ignited |
| 106 | **SLICE: where a flame holds on** | "structure and stability of laminar diffusion flames ... stabilizing mechanisms at the flames base" | the climber | `outcome-strip` | 12 | (data is mostly dates/fuels; moment from the PSI text only) |
| 107 | **SPICE: when a flame starts to smoke** | "laminar smoke-point properties of non-buoyant jet diffusion flames" | the chemist | `threshold-line` (fuel rate vs smoke point) | 469 | the smoke-point fuel rate per fuel |
| 102, 101 | **SAME / SAME-R: smoke that grows differently** | "quantify the sizes that the liquid smoke particulate achieves in low gravity" (smoke-detector design) | the detective | `size-histogram` | 8 + 109 | how particle size changed with aging time |
| 60 | **Ground: why space soot is different** | the "large discrepancy between soot formation in 1g and in 0g flames" | the explainer | `paper-trail` | none | (text and publications only) |
| 62 | **Ground: modelling flame spread** | modelling "concurrent flame spread in microgravity" | the model-maker | `paper-trail` | none | (text only) |
| 117 | **Ground: what tipped FLEX's cool flames** | uses FLEX flight data to quantify how perturbations "regulated the dynamics and ultimate fate" of droplet cool flames | the investigator | `paper-trail` → FLEX | none | (links to FLEX rows) |
| 142 | **Ground: a new map of flammability** | uses FLEX data to "develop a new diagram of the flammability limits" with cool flames | the cartographer | `paper-trail` → FLEX | 8 (figure index) | (links to FLEX rows) |

## Decisions for Karim
1. **Series:** SAFFIRE I-III share one objective word for word, and so do SAME and SAME-R. One story each with chapters, or separate stories? Proposed: one story each, so the library shows 18 stories covering all 22 investigations.
2. **Ground studies** (60, 62, 117, 142) have no test table. Proposed: short `paper-trail` stories, each linked from its parent flight story (117 and 142 from FLEX).
3. **Animation:** light by default (scroll-triggered SVG/CSS transitions, like the storytelling winner's react-scrollama). three.js only where a smooth flowing move earns it. The final look and feel is proposed by Fable after the wireframes, for Karim to pick.
4. **Build order:** the library is generated from one template plus a spec file per story (`stories/library/<psi>.json`), so coders fill specs, not pages. First wave (best data): FLEX, BASS-II, SAFFIRE, CFI-G, SAME-R, SPICE. Second wave: the rest.

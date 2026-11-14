# The story: acts, scenes, lenses, and the data behind each (orchestrator-owned)

Karim's picks: a story-scroll site, interactive, with three lenses on every act. **Astronaut** (what keeps me safe), **Analyst** (show me the data), **Public** (explain it simply). Every claim links to its source. Only facts marked Verified in the planning repo (`research/INDEX-REPORT-2.md`, `research/FIRE-HISTORY.md`, `research/CHALLENGE-07.md`) or rows in `data/psi-snapshot/` may appear.

## Why "4 acts" with 22 experiments
An act is a step in the argument, not a container for one experiment. Act 2 opens into **6 family scenes** that together cover **all 22 fire investigations**, and every investigation also gets its **own page** (reachable from the story and from the Analyst table). So: 4 acts → 9 scenes → 22 experiment pages → ~1,780 test rows.

| Act | Scenes | Question it answers |
|---|---|---|
| 1. Why oxygen matters | 1 (incident) | Why should anyone care about fire and oxygen? |
| 2. What NASA has tested | 6 families: large-scale fires (SAFFIRE I-III); solids in a flow duct (BASS, BASS-II); gas jets (ACME: CFI-G, Flame Design, BRE, CLD, E-FIELD, s-Flame; SPICE, SLICE); droplets (FLEX, FLEX-2, CFI); smoke detection (SAME, SAME-R); ground/modeling studies | What do we actually know, and how do the tests compare? |
| 3. Build your Moon-base air (interactive) | 1 (sliders) | Is a Moon base inside or outside the tested evidence? |
| 4. What nobody knows yet | 1 (the gap) | What must still be tested before people live there? |

## Data per lens (all from verified sources)

### Act 1: Why oxygen matters
- **Astronaut:** Apollo 1, 27 Jan 1967, ground test: cabin fire, crew of 3 died; 100 % oxygen at pressure; ignition likely from arcing wires; the hatch could not open under pressure. What changed: quick-opening hatch, materials restricted, fire-resistant suits (sma.nasa.gov Apollo 1). Mir, 23 Feb 1997: oxygen generator fire, smoke filled the station, flames blocked one Soyuz (nasa.gov history).
- **Analyst:** NASA's own pattern: of 10 loss-of-crew events, 2 involved fire, both in ground tests, both in high oxygen; at least 13 on-orbit fire or overheat events; "all of the most serious events were in the presence of enhanced oxygen" (ICES-2020-173).
- **Public:** the same pattern in one sentence: the worst spacecraft fires all happened where there was extra oxygen.

### Act 2: What NASA has tested (per family scene)
- **Astronaut:** what burned and how close to a real cabin it is (SAFFIRE: real-size fabric samples such as SIBAL fabric burned 420 s at ~21.6 % O2 and 20 cm/s airflow, PSI-98 row 1). Smoke detection (SAME/SAME-R): the only PSI data on detection. Artemis II FD9: NASA calls it a "Smoke Detector False Alarm" that turned off cabin fans; cabin ~80 °F (NTRS 20260007602); cause of the earlier burning smell unpublished.
- **Analyst:** the unified table: O2 %, kPa, flow, outcome, source row; counts (FLEX 274 runs with Extinction/Disruption/Completion; CFI-G 179 normal + 154 inverse flames; BASS-II 129; SAME-R 109); how each table recorded the same thing differently (`Percent O2`, `XO2 (init)`, "21; 26.5; 34", mmHg vs atm vs bar; bad cells like "3400%" shown as null with the raw value quoted).
- **Public:** what each family burned in plain words (fabric sheets, fuel droplets, gas flames, smoke), how many tests, one sentence each from the AI summary (tagged, with quotes).

### Act 3: Build your Moon-base air (sliders: pressure kPa, oxygen %)
- **Astronaut:** at NASA's planned 8.2 psia (56.5 kPa) with 33.7-40 % O2, many ISS materials are "unlikely" to pass: polymeric materials, Armaflex and Solimide foams, Bisco HT-200, Soundcoat HT, KB 10 tape, duct tape, silicone-fiberglass insulation, flammable paint, **Nomex** (ICES-2022-45). Air-cooled racks need ~80 % more airflow at 8.2 psia (same paper).
- **Analyst:** the 10 nearest real PSI tests to the chosen air (distance, outcome, source link); Saffire VI paper burns near Moon air (54.1 kPa / 31.0 %, 54.6 / 30.3, 55.2 / 28.8; NTRS 20250002675, not in PSI); lunar-gravity O2 margins 0.32-2.3 points by material (ICES-2025-392 Table 2), with the note that polycarbonate and Nomex Velcro measured *less* flammable in lunar g.
- **Public:** Moon-base air has 34-40 % oxygen (Earth: 21 %) at a bit over half Earth's pressure; things that are safe on the space station can burn there; drag the sliders and see how far real tests are.

### Act 4: What nobody knows yet
- **Astronaut:** no fire tests in Moon or Mars gravity in PSI; NASA calls partial gravity "a major gap" and warns that 1-g limits "may not be conservative" (ICES-2020-173); smoke mixes through the whole cabin so alarms can lag while hazardous gases build first (same paper).
- **Analyst:** what is missing from PSI: partial-gravity tests, Saffire IV-VI tables (papers only), Li-ion fire data; raw data sizes (0.7 GB-2.2 TB per investigation) left for future work.
- **Public:** the first fire experiment in real Moon gravity (FM2, four samples) is planned for late 2026 (LPSC 2026, NTRS 20260000646).

## Not in the product
- **No fine-tuning.** There is no live data stream, the corpus is small (22 investigations, 298 papers), and judges reward traceable evidence. Prepared AI summaries with verbatim source quotes do the job and can be checked; a fine-tuned model can't show where an answer came from.
- No predictions for Moon gravity: the gap is shown, never filled.
- Unverified Gemini leads (incident table, SoFIE numbers, Li-ion figures, the "981 s" alarm) stay out until checked.

# UX brief: three audiences, one story (orchestrator, build session 2, 2026-11-15)

Karim's direction (02:22, his words): for the public "it needs to be simple... almost like a story, like they're watching a Pixar movie type of animation"; "do a 180°: how a kid would look at this, how an adult who had known nothing about being an astronaut would look at this data, and when they leave... they would come out with an idea of what exactly Firebreak is". Astronaut lens: "I kind of like everything". Analyst and public: "a lot of work is needed". He likes the slider panel on the right and the stories.

Hard limits (unchanged): never invent data; public text uses only facts in `docs/STORY.md` and the curated files; tokens from `web/src/styles/tokens.css`; flat colour, no gradients, glows or emoji; yellow only on the Moon box and the primary button; reduced motion gives a still picture with the same content. Do not edit `docs/design/`, `docs/STORY.md`, `docs/wireframes/`.

## What a visitor must leave with (the one sentence)
"Firebreak puts NASA's space-fire tests in one picture, and shows the one test nobody has run yet: fire in Moon gravity." (Not "every test": 897 of the 1,883 have no oxygen or pressure recorded and are listed, not plotted.)
Every lens ends on this. If a screen does not serve it, cut it.

## The story spine (Pixar's: once, every day, one day, because of that, until finally)
1. **Once:** a spacecraft cabin was filled with pure oxygen. A fire started. Three astronauts died (Apollo 1, incidents.json).
2. **Because of that:** NASA changed the hatch, the materials and the suits (same entry, `changed`).
3. **It happened again** on Mir (incidents.json). The pattern: the worst fires all happened in extra oxygen (`pattern`).
4. **Because of that,** NASA lights fires in space on purpose to learn. Each dot is one real test (tests.json).
5. **Now** people plan to live on the Moon, in air with more oxygen than on Earth (moon.json).
6. **Your turn:** pick an air and see how close the real tests come (sliders).
7. **Until finally:** nobody has lit a fire in Moon gravity. The first test is planned (moon.json `gap`). That empty space is what Firebreak shows.

## Scenarios
**A child of 10 (Public lens, default).** Cannot read a scatter chart and will not read a paragraph. Needs a character to follow, one sentence per page, a picture that moves when they scroll, and one thing to touch. Success: they can say "fire likes oxygen, Moon homes will have more of it, and nobody has tried fire on the Moon yet".
**An adult who knows nothing about spaceflight (Public lens).** Arrives from a link, gives it 60 seconds. Needs a human reason to care in the first screen (Apollo 1), then proof that the dots are real (a source link on every page, small), then the reveal. Success: they can explain what Firebreak is to someone else, and they tried the sliders once.
**An astronaut or habitat designer (Astronaut lens).** Question: "what keeps me safe in this air?" Needs the planned air, what is unlikely to pass in it, the nearest real evidence, and what is unknown, in that order, as a briefing. Karim likes it as built: keep the layout, only polish.
**A fire-safety analyst (Analyst lens).** Question: "show me the rows." Scans, sorts, filters, opens a source. Will not scroll a story. Needs a workspace: chart and table together, sortable columns, a family filter, every test row with its PSI link, the coverage count with the reasons tests are not plotted, and the data files to download. Success: from a dot to its PSI row in two clicks.

## Public lens: the picture book (the 180°)
- **A guide character:** the Firebreak flame from the logo (`web/src/ui/logo-mark.svg` shapes), drawn flat, unnamed. It appears in every public picture and reacts: small and calm in Earth air, taller as oxygen rises, gone on the empty Moon page. It is a drawing, never a measurement: no scale, no number is read from it.
- **The oxygen dial:** a tall gauge from 0 to 100 % oxygen, the public's one recurring instrument. Its marks come from moon.json atmospheres by id (Earth and space-station air, planned Moon-base air as a band, spacesuit). It teaches the y axis before the chart appears: in act 2 the dial becomes the chart's oxygen axis (the same marks slide into place).
- **Pictures per act (public lens only; the other lenses keep the chart):**
  - Act 1: the dial, the flame, and the incident as a large plain card. The dial rises to the incident's oxygen text as the page turns.
  - Act 2: "each dot is one real test". Dots arrive family by family; a counter counts up to the real plotted count; each family has one flat pictogram (droplet, gas flame, fabric sheet, smoke) and its plain-word name. Families with no pressure recorded line up along the dial, not on the chart.
  - Act 3: "your turn". Two big sliders, the dial and a "your air" mark move together, the nearest real tests light up, and one sentence built from the nearest row answers: what burned, at what oxygen and pressure, and what the record says happened. "Show the details" opens the full list Karim likes.
  - Act 4: the chart tilts away to an empty page labelled from the story file. The flame is not there. One line: the first test is planned.
- **The ending card (all lenses):** "What you just saw" with the one sentence, then three buttons: Try your own air, See every experiment (the library), Open the data (Analyst).
- **Motion (Pixar staging, flat shapes):** one thing moves at a time; anticipation then ease-out `cubic-bezier(0.22, 1, 0.36, 1)`; 300 to 600 ms; triggered by the page entering, reversed on scroll back; the flame idles with a slow 2-frame sway. Under reduced motion everything is still and complete.
- **Page turning:** `scroll-snap-type: y proximity` on pages, arrow keys and space move one page, page dots show progress.
- **Words:** one or two sentences, a 10-year-old's words, at most about 28 words. No acronyms without saying what they are. Sources stay on every page, small, under the text.

## Analyst lens: a workspace, not a story
- Choosing Analyst replaces the story column with a full-height light sheet (NASA Horizon look): chart on top or left, table beside it.
- Table of investigations: click a column header to sort; a family filter; a row opens its detail (objective, AI summary with tag and quotes, papers, PSI link) and its test rows (fuel, oxygen, pressure, flow, outcome as recorded, source row link).
- Clicking a dot on the chart selects its row; selecting a row highlights its dots.
- Coverage panel: "Plotted N of M" and, per reason, how many tests are not plotted (from `notPlaced()`).
- Download links to the built data files (`data/tests.json`, `experiments.json`, `moments.json`) and the contracts.

## Astronaut lens: a briefing (keep, polish)
Same pages, denser text, the slider panel always available from act 3 on, the "unlikely to pass" sheet one click away. Wording fix everywhere: "kept burning" / "recorded a sustained burn", never "burned to the end of the test" (the records do not say that).

## AI text safety (Meta Spark output)
Every AI-written string is validated in code before it is committed (quotes are word-for-word substrings of the PSI text; library text has no digits), reviewed by a Sonnet QA agent against the PSI text for claims the text does not make, tagged with model and time, and labelled "AI summary" in the UI. Keys stay in `.env`, are never printed or committed.

## Art reference (Karim, 02:54)
The Space Apps Boston poster: deep blue space, a warm orange planet limb, bold white type, one bright object in the middle. Use it as mood only: the dark blue ground, orange for fire, white display type at large sizes, one focal thing per screen. Do not copy the picture, do not use its logos, and keep the flat-colour rules (no gradients, no glows).

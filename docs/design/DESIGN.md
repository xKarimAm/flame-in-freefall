# Design language: Space Apps x NASA (orchestrator-owned)

Karim's direction (2026-11-14, 10:22 PM): take the Space Apps 2026 hackathon's own look and NASA's app/web design language and combine them, so judges and NASA people feel at home. This replaces the earlier "achromatic ledger" draw. The taste-skill house rules still apply (flat colour, no gradients, no glows, no emoji, real data only).

## Where the values come from (measured 2026-11-14, ~10:25 PM local)
- **Space Apps 2026**: CSS custom properties on spaceappschallenge.org/2026 (`--brand-*`), body `#1b1b1b` with white text, Fira Sans everywhere (headings 700, 64px on the hero). The opening-slide colours (sampled from the PDF: deep blues #001038-#184098 on near-white) match these tokens.
- **NASA** (nasa.gov, Horizon design system on USWDS): body Public Sans 16px `#1b1b1b` on white; headings Inter 700; header and footer black `#000`; square corners (0px), buttons `#005ea2` (USWDS primary blue) with 0/4px radius; uppercase DM Mono micro-labels.
- Both palettes are USWDS-family colours (`#0050d8`, `#e52207`, `#3d4551`, `#8d9297`, `#dfe1e2`), which is why they combine cleanly.

## Tokens (`web/src/styles.css`, `:root`)
```css
:root {
  /* story (dark, Space Apps) */
  --space-deep:    #151622;  /* story ground (Space Apps --brand-deepblue) */
  --space-black:   #1b1b1b;  /* near-black panels, footer (both brands) */
  --electric-blue: #1b2b85;  /* full-width chapter fields (Space Apps) */
  --ink-dark:      #ffffff;  /* text on dark */
  --muted-dark:    #dfe1e2;  /* secondary text on dark (cloud gray) */
  /* data highlight */
  --data-on-dark:  #2491ff;  /* nearest tests, selected series on dark (blue yonder) */
  --data-on-light: #0050d8;  /* same role on light panels (neon blue) */
  --moon:          #e7f434;  /* THE accent: the Moon box + the one primary action (Space Apps neon yellow) */
  --flame:         #ff5804;  /* fire marks, burning outcomes (oxide orange) */
  --danger:        #e52207;  /* incidents, "fails at this air" (NASA red) */
  /* analyst panels (light, NASA Horizon) */
  --sheet:         #ffffff;
  --sheet-ground:  #dfe1e2;  /* cloud gray */
  --ink:           #1b1b1b;
  --muted:         #3d4551;  /* slate gray */
  --rule:          #8d9297;  /* clay gray, table rules only */
  --link:          #005ea2;  /* NASA/USWDS primary blue on light */
  /* shape and type */
  --radius: 0px;             /* square, like both sites */
  --font: "Fira Sans", "Public Sans", system-ui, sans-serif;
  --font-id: "Fira Code", ui-monospace, monospace; /* PSI IDs and code only */
}
```
Fonts: `https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;500;700&family=Fira+Code:wght@400&display=swap`.

## Rules of use
- **Story chapters run dark** (`--space-deep`, full-width `--electric-blue` fields between acts). **Analyst panels are light sheets** (`--sheet` on `--sheet-ground`, black text). Switching to the Analyst lens slides a light sheet in over the dark story, the way NASA pages sit white content under a black header.
- **One accent:** neon yellow `--moon` goes on the Moon box and the one primary button (square, yellow fill, near-black text, the Space Apps button style). Nothing else is yellow.
- **Colour means something:** blue = real NASA data selected/nearest; orange = burned/fire; red = danger/incident/"unlikely to pass"; grey = all other tests. Every legend says so in words too.
- Type: Fira Sans 400/500/700; display sizes large (hero 64px desktop, as on the Space Apps site), body 16-18px; sentence case. NASA's tracked uppercase mono labels are **not** used (taste rule); PSI IDs may use Fira Code.
- Flat fields only: the brand's blue gradients are replaced by flat `--electric-blue`.
- **No logos.** Do not place the NASA insignia, the Space Apps logo or mission patches anywhere in the app (Space Apps rule: no NASA branding in SI-made content). Name them in text if needed.
- Every number has a source link; AI text carries an "AI summary" tag.

## three.js stage (the signature)
One full-screen canvas behind the story (HTML text and CSS panels on top). It draws the **evidence space** from real data:
- x = pressure (kPa), y = oxygen (%), z = gravity, with three planes: micro-g (all PSI tests sit here), lunar 1/6 g, and 1 g (Earth / ISS cabin reference).
- Each scroll act moves the camera: act 1 shows the one incident line; act 2 fills the micro-g plane family by family; act 3 flies to the Moon box (56.5 kPa, 33.7-40 % O2) on the **empty lunar plane** and lights the nearest tests; act 4 holds on the empty plane and the FM2 note.
- Points are data, never decoration. A plain 2D fallback (the same chart in SVG) shows when WebGL is missing or `prefers-reduced-motion` is set.

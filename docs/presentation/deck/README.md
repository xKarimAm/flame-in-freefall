# How `../Firebreak-deck.pptx` is made

The slide text and speaker notes are copied from `../DECK.md`. The five stills are taken from the running build.

1. Serve the build: `npm --prefix web run preview -- --port 4176` in the `release/web` worktree (or `main` once PR #16 is merged).
2. Stills: `node deckshots.cjs http://localhost:4176/ <imgDir>` (needs `playwright-core` and Chrome; the script names the copy it used on this PC).
3. Deck: `node build.cjs <imgDir> <out.pptx>` with `pptxgenjs` installed beside it (`NODE_PATH`), and the `apply_theme.js` helper from the pptx skill it names.
4. Check: `render.ps1 -Deck <out.pptx> -OutDir <dir>` opens the file in PowerPoint and exports each slide as PNG. A file PowerPoint would have to repair fails here.

Built 2026-11-15 from `release/web` at `ed1459e`.

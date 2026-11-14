# Folder owners (one coder per folder at a time)

| Folder / file | Owner | When |
|---|---|---|
| `package.json`, `package-lock.json`, `.github/`, `scripts/`, `contracts/`, `data/curated/` | orchestrator only | always |
| `web/src/main.ts` | orchestrator writes the skeleton (imports each module's `mount()`); after that, nobody but the orchestrator | 01:00 |
| `pipeline/`, `data/build/` | coder A | 02:00 on |
| `web/src/data/` | coder B | 02:00 on |
| `web/src/engine/`, `stories/` | coder C | 04:00 on |
| `web/src/stage/` | coder D | 04:00 on |
| `web/src/ui/` (slider panel, nearest list, analyst table, Stories overlay), `web/src/styles/` | coder E | 04:00 on (needed at the gate) |
| `web/src/i18n/` | coder E | after the gate |
| `docs/design/`, `docs/STORY.md`, `docs/wireframes/` | the design session with Karim | always |

Coders propose contract changes in their PR description; the orchestrator edits `contracts/`.

**Merge rule:** PRs merge one at a time. Each rebases on `main` and runs `scripts/check.ps1` before merging.

**`scripts/check.ps1`** is the one test command, written by the orchestrator before any coder starts. It:
- sets `$env:TEMP` and `$env:TMP` to `E:\caches\tmp`;
- runs `git config --global --add safe.directory *` only if that entry is missing;
- runs `pytest` in `pipeline/`;
- runs `npm test` and `npm run build` in `web/`;
- exits non-zero on any failure.

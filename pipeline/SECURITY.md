# Generated with Muse Spark, SI-assisted

# Pipeline security pass (B10, night-backend run 2, 2026-11-15)

## What was checked

- **Secret scan:** all 195 tracked files (`git ls-files`) plus every
  `pipeline/` output searched for a 40+ character token-looking string next
  to the word key/token/secret/bearer, and for a `Bearer <value>` header.
  Zero hits. The committed `tests/test_security_b10.py` re-runs this scan
  (skipping `.git`, `node_modules`, `dist`, `.tmp` caches) and fails naming
  only the file and match length, never the match text.
- **`.env`:** git-ignored (`.gitignore:1:.env`, confirmed with
  `git check-ignore -v .env`). The key is checked by name and length only
  (48 chars in this environment); it is never printed, logged, written to a
  file or committed.
- **API code** (`pipeline/ffpipe/library.py`, read-only `scripts/translate.py`
  reviewed the same way):
  - The key comes from the `META_API_KEY` environment variable and is placed
    in an in-memory `Authorization: Bearer` header. Nothing logs headers, the
    key, the request body or the reply (the only prints are row/story counts
    and translation keys kept in English).
  - Replies are parsed strictly as JSON: `ffpipe.library._parse_reply` takes
    the first `{...}` block, `json.loads` it, and rejects anything longer
    than 200,000 characters (the model is asked for at most 8000 tokens, so
    a legitimate reply is an order of magnitude smaller). Overlong and
    non-JSON replies raise `ValueError` and fail that story's draft retries.
  - No API or PSI text ever reaches a shell, `eval` or `exec`: `grep` for
    `subprocess`, `os.system`, `popen`, `shell=True`, `eval(`, `exec(` across
    `pipeline/ffpipe` and `scripts/translate.py` finds nothing.
- **Prompt scope:** `draft_prompt` holds only that story's PSI text, title
  and voice; the reply is validated (verbatim quote, no digits, under 320
  characters) before it is committed to `pipeline/library_drafts.json`.

## Known limitation (not lane-editable)

`scripts/translate.py` bounds replies only via `max_tokens=16000`; it has no
explicit client-side length guard like `_parse_reply`. Proposal for the
orchestrator: apply the same `{...}`-extract-then-`json.loads` helper with a
length bound there.

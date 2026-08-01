# Phase 04 — the phone becomes a capture device

> Depends on **01** and **02**. Last. Highest value per line of code in the pack.

## Why

`SessionRecorder` (`android/app/src/main/kotlin/com/chesslab/tracker/record/`) already writes
**exactly** what `collect.py`'s session writer produces on the rig: raw frame + FEN + corners, a
`log.jsonl` line for line. `zipSession` (`record/SessionExporter.kt`) already lays the ZIP out so it
can be dropped straight into `data/sessions/`.

The only missing piece is transport. Today it is `ACTION_CREATE_DOCUMENT` → cable or cloud →
manual copy. This phase removes the second cable, and does it with almost no new code.

It also lands where the corpus is thinnest. The coverage measurement of 2026-08-01: every piece has
been on nearly every square, but **18–30 squares per piece are covered by a single session** — one
lighting, one camera pose — and queens are worst (wQ 26/64 with ≥2 sessions, 11 squares never seen).
The phone at 1440p sees ~98–105 px/square, which is the device's own domain.

## Design (decided — do not redesign)

### Route — added to `src/chesslab/web/routers/ingest.py` (phase 02 owns the file)

```python
POST /api/ingest/session      # multipart, the ZIP that zipSession already produces
```

`python-multipart` is already a dependency (`pyproject.toml`). Stream to a temp file in chunks —
uvicorn runs a single worker and a handler must not block the loop.

### Validation — every item is a real failure mode, not ceremony

| check | on failure |
|---|---|
| session id matches `^\d{8}-\d{6}$` and survives `sessions._safe_id` | 400 |
| `session.yaml` + `log.jsonl` + at least one frame present | 400 |
| **every ZIP entry path resolves inside the target** | 400, whole upload rejected |
| target `data/sessions/<id>/` does not already exist | **409**, nothing written |
| total size under the cap | 413 |

Zip-slip into `data/` is the one thing here that can destroy an unrecoverable corpus. The
never-overwrite rule mirrors `sessions.archive_session`'s `FileExistsError` discipline — `data/` is
gitignored and has no undo.

### Do NOT auto-slice

`docs/data-pipeline.md` is emphatic that nothing in the pipeline is incremental and a dataset is a
snapshot. Auto-slicing would silently mutate the global crop pool from a phone. Uploading makes the
frames **available**; `chesslab slice --session <id>` stays a deliberate human step. The uploaded
session then appears in the existing sessions tab like any other.

### Phone side

One button in the existing recording UI: *Upload to server*. Gated on an unmetered network and on
the endpoint being validated. Carries `RecordingGates.skipped` and the geometry-note history
alongside, so the PC knows what the phone **refused** to record and why — `RecordingGates` documents
a phone that recorded nothing for seven hours across nine games because the only diagnostic was a
string on a screen nobody was looking at.

## Steps

### 1. `src/chesslab/web/routers/ingest.py` — commit `feat(web): accept an uploaded session ZIP`

### 2. `android/app/.../record/` + the recording UI — commit `feat(android): upload a recorded session to the server`

### 3. `docs/data-pipeline.md` — commit `docs: uploaded sessions are ordinary sessions`
One paragraph: where they land, that they are not sliced automatically, and why.

## Tests (write, run once, targeted)

`tests/test_web_ingest.py` (extend — phase 02 created it):

- `a_session_zip_lands_in_data_sessions` — round-trip a ZIP built in the test; assert `log.jsonl`
  and the frames arrive byte-identical.
- **`a_zip_slip_entry_is_refused`** — an entry named `../../evil.txt`; assert 400 **and** that
  nothing was written anywhere. Prove it red first: confirm the test fails without the guard and
  record that in `STATUS.md`.
- `an_existing_session_is_never_overwritten` — 409, original untouched.
- `a_bad_session_id_is_refused`.
- `an_incomplete_zip_is_refused` — no `log.jsonl`.

```
.venv/Scripts/python.exe -m pytest -q tests/test_web_ingest.py
gradlew.bat :app:testDebugUnitTest
```

## Acceptance criteria

- `grep -rn "slice" src/chesslab/web/routers/ingest.py` — **no hit**. Nothing in the ingest path
  slices.
- An uploaded session is indistinguishable from a `collect`ed one: `chesslab sessions list` shows it
  with the same fields.
- The zip-slip test was **proven red** before the guard existed — stated in `STATUS.md`.

## Do NOT

- Do **not** slice, build a dataset, or touch `data/manifests/`.
- Do **not** overwrite an existing session under any flag.
- Do **not** upload frames automatically in the background. This is a deliberate, user-pressed
  action on a possibly large payload.
- Do **not** widen the envelope's six `kind` values for this — the ZIP is its own route.

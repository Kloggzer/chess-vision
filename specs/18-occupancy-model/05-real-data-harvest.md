# Phase 05 — harvest real training data from the app

> References: `specs/17-android-rewrite/08a-games-pgn.md` §5 (the on-device recorder and its
> storage layout), `android/app/src/main/kotlin/com/chesslab/tracker/record/` (`SessionRecorder`,
> `RecordingGates`, `SessionExporter`, `SessionStore`, `SessionCapture`), and the Python
> behaviour they port: `tracker.py::_start_recorder_locked` `:2708`,
> `_record_inventory_violations` `:2789`, `_skip_recording_for_inventory` `:2796`,
> `_skip_recording_for_geometry` `:2805`, `start_recording` `:2805+`. Desktop consumer:
> `chesslab slice` (`src/chesslab/labeling.py::run_slice`).
>
> **The retrain at the end needs a GPU.** Everything before it — recording, export, slicing,
> ingest, verification — is CPU and phone time.

## Why

`data/manifests/squares.jsonl` is 378 752 crops, and the model is still weakest on the
domain it will actually be deployed in: the user's board, the user's pieces, the user's
lighting, filmed by the user's phone from the user's mount. The repo has measured the gap
directly — synthetic renders carry **~51 px/square** against **~200 px/square** for real
captures (memory: *"Synth crop resolution gap"*), and that resolution gap is the leading
explanation for the piece-type failures. The Blender clips this whole pack is measured on are
worse still, at **~31 px/square**.

More synth does not close that. More *real* data from the deployment camera does.

And it is now nearly free. Session recording works on the phone (phase 08a of the rewrite
pack): it writes frames + FEN + corners per move in exactly the layout `chesslab slice`
consumes. **A correctly tracked game is 64 labelled crops per position, at zero labelling
cost, from the exact domain the model is weakest on.** That is the founding premise of this
entire repository (CLAUDE.md: *"one photo of a position yields 64 labeled examples"*), and
until now it only ever ran on the desktop rig.

This phase specifies the loop and its gates. It is last because it should ship *after* the
2-class model — the harvest is most valuable when the thing being fed is the thing being
deployed.

## Files you own

| File | Contains |
|---|---|
| `scripts/import_phone_session.py` | phone export ZIP → `data/sessions/<id>/` with validation |
| `tests/test_import_phone_session.py` | its tests |
| `docs/harvest-loop.md` | the operator runbook (the one doc this pack writes) |
| `specs/18-occupancy-model/STATUS.md` | your row + every measured number |

You own **nothing else**. `run_slice`, `dataset_build.py`, `train.py`, the Android recorder
and every gate implementation are **existing, working mechanisms** — this phase uses them and
records what they say. If one is broken, that is a blocker, not a rewrite.

## Design (decided — do not redesign)

### 1. The loop

```
  play a game on the phone, tracked, with recording ON
      ↓  (on-device gates: inventory + geometry, per move)
  filesDir/sessions/<sessionId>/{frames/*.jpg, log.jsonl, session.yaml}
      ↓  SessionExporter → ZIP → share/save to the desktop
  scripts/import_phone_session.py  →  data/sessions/<sessionId>/
      ↓  chesslab slice --session <sessionId>
  data/squares/<class>/*.png  +  data/manifests/squares.jsonl rows
      ↓  chesslab dataset build <name> --sessions …[,<sessionId>]
      ↓  chesslab train … --resume <current run>
      ↓  chesslab export --fmt onnx ; chesslab quantize
      ↓  the clip harness, both models in one pass
```

Every arrow is an existing command. The only new code is the importer, and its only job is to
refuse a session that would poison the dataset.

### 2. The gates that already exist — use them, do not reimplement them

**On-device, per move** (`RecordingGates`, porting `tracker.py:2789-2828`):

- **Inventory** — `physical_inventory_violations(fen)`. A position that needs 10 white pawns
  cannot be real; the tracker has desynced and every frame after it is mislabelled. The
  recorder skips the capture and counts it.
- **Geometry** — `_skip_recording_for_geometry`. Frames whose board corners are unresolved or
  stale produce crops sliced against the wrong homography. Wrong geometry silently transposes
  or offsets every label in the frame, which is the worst failure mode in this repo
  (CLAUDE.md: *"wrong a8-corner assignment silently transposes all labels"*).

These gates are the reason on-device recording can be trusted at all. **The importer must
surface their counters** — `session.yaml` carries the skip counts and the skip reason; a
session with a high skip ratio is a session whose *unskipped* frames also deserve suspicion.

**At import** (`scripts/import_phone_session.py`, new):

| Check | Refusal |
|---|---|
| `session.yaml`, `log.jsonl` and `frames/` all present | hard fail |
| every `log.jsonl` row has a frame file, a FEN and 4 corners | hard fail, naming the row |
| every FEN parses (`python-chess`) and passes `physical_inventory_violations` | hard fail, naming the ply |
| the move sequence is legal from the recorded `start_fen` | hard fail — this is the "was the game actually tracked correctly" check |
| session id matches `^\d{8}-\d{6}$` | hard fail — `mine_hard_empty.py:_CAMERA_SESSION_RE` and the whole real-vs-synth separation depend on this convention |
| target `data/sessions/<id>/` does not already exist | hard fail, no overwrite |
| the calibration profile named in `session.yaml` exists locally | **warn**, and print what `slice` will fall back to |
| skip counters from the on-device gates | **report**, always, in the summary |

Refusals are `[FAIL] <reason>` + non-zero exit, in the style of `cli.py`'s other commands.
Never a partial import: validate fully, then move.

**Before slicing, always:** `chesslab slice --session <id>` then eyeball. The `--preview`
flag and `ingest --debug-overlay N` exist precisely so orientation errors are caught by a
human before they are baked into a training set. `docs/harvest-loop.md` makes this a
mandatory step with a screenshot of what right looks like — not an optional tip.

### 3. The importer does not modify anything it imports

It copies frames, `log.jsonl` and `session.yaml` into `data/sessions/<id>/` verbatim, and
writes one extra file `import.json` recording: source ZIP name and hash, import timestamp,
the validation results, and the on-device skip counters. Provenance is the point — six months
from now, "which sessions came from the phone?" must be answerable without guessing.

### 4. What the harvested data is worth, and how it enters the dataset

Phone crops are **~112 px/square at 1080p** — between the desktop rig's ~200 and synth's ~51,
and from the deployment camera. They enter the dataset as ordinary sessions:

```
chesslab dataset build occ-v2 --sessions <existing…>,<phone sessions…> --classes occupancy
```

**Per-session split (entry.md constraint 4) does the right thing automatically** — a phone
session is one split unit and cannot leak between train and test. With few phone sessions,
consider `force_train` for all but one (`dataset_build.py`'s `force_train`), and keep **at
least one phone session in test**: a test set with no deployment-domain data cannot measure
the thing this phase exists to improve. Record which session was held out.

### 5. Acceptance is the harness, plus one honest caveat

Retrain (`--resume` from the current best), export, quantize, and run the harness with both
models in one pass at the adopted `occupancy_thr`:

```
cd android
.\gradlew.bat :app:testDebugUnitTest -Pchesslab.sim=true `
  -Pchesslab.sim.models=data/models/<previous>,data/models/<retrained> `
  --tests "com.chesslab.tracker.sim.*"
```

Report clips passing, misses, phantoms, confident-occupancy error %, perfect boards, alarms,
phantom-overrule commits.

> **The caveat, and it must be written next to the number.** The clips are Blender renders at
> ~31 px/square. Adding real phone data at ~112 px/square targets a domain the clips **do not
> contain**. A flat clip result therefore does **not** mean the harvest failed — it means the
> instrument cannot see the improvement. The harness remains the acceptance instrument because
> it is the only large-sample instrument that exists, and because it can still catch a
> *regression* (which would be real). The improvement itself is confirmed live, on the phone,
> on the user's board.

**Live confirmation (the real acceptance for this phase):** play N ≥ 3 full games on the phone
with the retrained model and record, per game: moves committed vs actually played, alarms
raised, silent desyncs (a move never committed), and the note stream. Compare against the same
count of games on the previous model. This is a small sample and must be labelled as such —
but it is the only measurement in this entire pack taken in the deployment domain, and that
makes it the one that decides whether the model ships.

**And it compounds:** the games played to confirm the model are themselves recorded, and
become the next harvest. That is the loop.

## Steps

### 1. Importer — commit `feat(scripts): import_phone_session — validate and land a phone session`

### 2. Importer tests — commit `test(scripts): phone session import refuses illegal FENs, gaps and id collisions`

### 3. Runbook — commit `docs: the harvest loop — record on phone, slice, retrain`
`docs/harvest-loop.md`: the exact command sequence, the mandatory visual check, the gate
counters and how to read them, how many games are worth recording before a retrain, and the
"clips cannot see this improvement" caveat. Link it from `README.md`'s command list if there
is a natural place; do not restructure the README.

### 4. Harvest, retrain, measure — no commit
Record the sessions, import, slice, build, retrain, export, quantize, run the harness, play
the live games. Every number into `STATUS.md`.

## Tests

**Python** (`tests/test_import_phone_session.py`):

| Test | Guards |
|---|---|
| `test_import_accepts_a_valid_session` | a synthetic fixture session lands complete, with `import.json`. |
| `test_import_rejects_illegal_fen` | a FEN with 10 white pawns → `[FAIL]`, non-zero exit, nothing written. |
| `test_import_rejects_illegal_move_sequence` | a move list that is not legal from `start_fen` → refused. The "was it tracked correctly" gate. |
| `test_import_rejects_missing_frame` | a `log.jsonl` row whose frame file is absent → refused, row named. |
| `test_import_rejects_bad_session_id` | an id that is not `YYYYMMDD-HHMMSS` → refused. Protects the real-vs-synth separation. |
| `test_import_refuses_overwrite` | existing target dir → refused, existing data untouched. |
| `test_import_reports_gate_counters` | on-device skip counts appear in the summary and in `import.json`. |
| `test_import_warns_on_missing_profile` | warns, does not fail, and names the fallback. |
| `test_import_is_atomic_on_failure` | a failure partway leaves **no** partial `data/sessions/<id>/`. |

`uv run pytest -q tests/test_import_phone_session.py`

**End-to-end smoke** (in the runbook, not automated): import a real session, `chesslab slice
--session <id> --preview`, confirm the crops match the labels visually before any build.

## Acceptance criteria

- `python scripts/import_phone_session.py --help` runs and lists the ZIP/dir input, `--out`,
  and a `--dry-run` that validates without writing.
- All 9 importer tests green; `uv run pytest -q` green apart from the 3 pre-existing
  `tests/test_camera.py` failures; `uv run ruff check src tests scripts` clean.
- `docs/harvest-loop.md` exists and contains the full command sequence **and** the mandatory
  visual-check step.
- At least one real phone session imported, sliced, and visually verified. `STATUS.md` records:
  session id, frame count, crops produced, the on-device gate counters, and the measured
  **px/square** of the resulting crops.
- A dataset built including the phone session(s), with the phone/other session split assignment
  recorded and **at least one phone session in test**.
- A retrained run exported (`model.onnx` with a **symbolic** batch dimension) and quantized.
- The harness ran with previous and retrained models in one pass at the adopted
  `occupancy_thr`; the full comparison table is in `STATUS.md`, with the "clips cannot see
  this improvement" caveat in the same paragraph.
- `.\gradlew.bat :core-engine:test` green, `ClipReplayParityTest` **18/18, zero diverging
  frames**.
- `STATUS.md` records the live confirmation: N games, moves committed vs played, alarms,
  silent desyncs, per model — explicitly labelled a small sample.

## Do NOT

- Do NOT import a session whose FENs fail the inventory check or whose move sequence is
  illegal. A desynced game is 64 **wrong** labels per position, and it is worse than no data
  because it is invisible downstream.
- Do NOT skip the visual check before building. Wrong corners silently transpose every label
  in the session — the single most expensive mistake available in this repo.
- Do NOT rename or re-timestamp a phone session to look like a desktop one. The
  `YYYYMMDD-HHMMSS` convention plus one session id per capture device is what keeps the
  per-session split honest and what `mine_hard_empty.py` keys on.
- Do NOT put all phone sessions in `force_train`. A test set without deployment-domain data
  cannot measure this phase.
- Do NOT split within a session, ever.
- Do NOT delete or archive existing sessions to "make room" for phone data. Memory note
  *"Daten behalten, nicht löschen"*: parked sets are taken out of use, not removed.
- Do NOT modify `run_slice`, `dataset_build.py`, `train.py` or the Android recorder. This phase
  operates existing machinery; a broken gate is a blocker.
- Do NOT claim a clip-harness improvement from real data. State the caveat, report the number,
  and let the live games decide.
- Do NOT record on-device with the gates disabled.

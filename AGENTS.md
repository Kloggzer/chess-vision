# AGENTS.md — chesslab

> Entry point for AI coding agents. The project is **built and in maintenance** —
> the staged specs in `specs/` (00–06) are the original blueprint and kept as
> historical reference; the current state is documented in `README.md` and
> `docs/architecture-review/`.

## Mission

`chesslab` builds a high-quality, **auto-labeled** image dataset for recognizing
chess pieces on a physical board filmed by a fixed camera, and trains a
per-square classifier on it. Labels are derived from the known game state (FEN,
via `python-chess`) — one photo of a position yields 64 labeled examples.
The **move tracker** that digitizes live games (frame diff + legality, CNN as a
safeguard) is Kotlin and lives in `android/`; nothing of it is left in Python.

## Current architecture (pointers, not prose)

- `README.md` — user-facing overview, all CLI commands per stage.
- `docs/architecture-review/architecture-overview.md` — component map (Mermaid).
- `docs/synth-pipeline.md` — synthetic data pipeline (Blender renders → ingest).
- `docs/android-emulator.md` — canonical headful x86_64 AVD workflow, recorded-video
  camera input and ADB controls for coding agents.
- `docs/setup/` — PyTorch backends (ROCm / CUDA / CPU).
- `platform/app/README.md` — the Next.js labeling front-end (`data/recordings/` is its whole world).
- One CLI entry point: `chesslab <command>` (`src/chesslab/cli.py`, Typer). **Python is dataset
  building and training only since 2026-08-07** — the move tracker and the FastAPI/React web UI
  were deleted (35,694 lines; the tracker is reachable at the `python-tracker-final` tag), the
  capture rig (`collect`, `collect_ui`) and `track_feedback` followed on 2026-08-20. `SessionWriter`
  is what survived the rig, in `src/chesslab/session_writer.py`. The tracker lives in `android/`
  and runs on the phone and, through `:desktop`, on the PC.
- `chesslab session scan|autofix|adopt|flag` repairs a session's geometry before slicing — it
  was web-UI-only until the deletion, which is why `docs/data-pipeline.md` §12 reads as a
  browser session.

## Non-goals

- No deep-learning board/corner detection as a hard dependency — ArUco markers
  (per-frame self-calibration) are the primary geometry source, refined by the
  grid fit. Markerless cold start is not supported.
- No reinforcement learning; piece recognition is supervised classification.

## Tech stack (binding)

Python 3.11+ (dev machine: 3.12), **uv** (`pyproject.toml` is the single
source), Typer CLI, OpenCV/NumPy/Pillow, python-chess, PyTorch + torchvision
(backend per `docs/setup/` — on the dev machine a Windows ROCm stack pinned to
local wheels in `wheels/`), Next.js labeling front-end in `platform/app/`, YAML
config, JSONL manifests. License: **GPL-3.0-or-later** (python-chess is GPL).

## Conventions (project-wide)

- **Language:** code, comments and docs are English.
- **Reproducibility:** recording and labeling (`slice`) are separate; slicing is a
  pure, repeatable step over session logs (board + FEN + corners).
- **Determinism:** global `--seed` (default 42) for split/sampling/training.
- **Config over code:** paths, class list, crop params, split ratios live in
  `config.py`/YAML. The canonical class list exists in exactly one place
  (`config.CLASSES`).
- **Data layout:** a recording is one folder (`data/recordings/<ts>/`) and everything that only
  says something about it lives inside — `log.jsonl`, `boards/`, `mattes/`, `review/`, its own
  `corrections.jsonl`. Derived trees sit outside and are rebuildable: `crops/<tag>/` (crops **and**
  that pool's `manifest.jsonl`), `datasets/`, `models/`, `reports/`, plus `footage/` and `plates/`.
  `data/_delete/` holds retired material the user deletes themselves. A recording's **id** keeps the
  `rg-` prefix its directory dropped; resolve it with `sessions.session_dir()`, never by joining a
  path. The full table is `README.md` → "Where it all lands" and `docs/data-pipeline.md` §1.1.
- **Classes:** `config.CLASSES` (14) stays the single canonical definition, but
  `config.IDENTITY_CLASSES` (13, derived) is what `dataset build` and `train` use by default.
  `occluded` never came from a FEN and is no longer painted either — it is measured per square
  as a `coverage` fraction from an alpha matte and trained as a regression target
  (`docs/class-scheme.md`).
- **Squares** are referenced as `a1`..`h8`; corner order is `[a8, h8, h1, a1]`.
- **Calibration profiles** are geometry config (board size, orientation, crop
  params), not stored positions — corners are detected per frame from ArUco.
  `calibration.ensure_profile` still holds the carry-over rule Kotlin mirrors, but
  since the capture rig went no command calls it; `calibrate auto` is the way in.
- **Crop counts per session** go through `chesslab/manifest_cache.py` (mtime-keyed
  aggregates) — never re-read whole manifests per request.

## Known pitfalls (still true)

- **3D pieces extend upward.** With a non-perpendicular camera the piece image
  overflows its base cell — square crops extend upward (`pad_up`).
- **Class imbalance:** `empty` dominates massively; handled at split/dataset
  time (capping/weights), do not ignore.
- **Never split randomly:** frames of the same session are near-identical →
  data leakage. Split is always **per session**.
- **Orientation:** wrong a8-corner assignment silently transposes all labels.
  `ingest --debug-overlay N` exists to eyeball-check before training.

## Verification

- `uv run pytest -q` (or `.venv/Scripts/python.exe -m pytest -q`) must be green.
- `uv run ruff check src tests synth scripts` — lint gate.
- `.github/workflows/ci.yml` runs ruff, the `platform/app` web gate and the Kotlin
  gate on every push and PR. It carries **no Python test job** — the torch pin
  points at local `wheels/`, so `uv sync` cannot run on a Linux runner; run
  `pytest` locally.
- Frontend changes: `cd platform/app && npx tsc --noEmit && npm test && npm run build`;
  `npm run lint` and `npm run knip` must not add new errors.
- Android UI/camera changes: run
  `.\scripts\android-emulator.ps1 -Avd Chesslab_Agent1 -Port 5554 -Clip blender-opening -RestartExisting`.
  The `emulator` APK is x86_64-only and separate from the arm64 phone builds; the smoke test
  must print `Camera feed confirmed`, not merely reach `Stop tracking`. Agents interact through
  `scripts/android-ui.ps1`; the emulator is headful unless `-Headless` is explicitly passed.
  Concurrent agents must use distinct AVDs, even ports/ADB serials and Git worktrees; artifacts
  are isolated under `tmp/android-emulator/<serial>/`.
- Do not commit `data/`, `scans/`, `synth_pieces/`, `wheels/` (gitignored).

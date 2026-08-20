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
On top of that, an experimental **move tracker** (`chesslab track`) digitizes
live games without a CNN (frame diff + legality, optional CNN safeguard).

## Current architecture (pointers, not prose)

- `README.md` — user-facing overview, all CLI commands per stage.
- `docs/architecture-review/architecture-overview.md` — component map (Mermaid).
- `docs/synth-pipeline.md` — synthetic data pipeline (Blender renders → ingest).
- `docs/android-emulator.md` — canonical headful x86_64 AVD workflow, recorded-video
  camera input and ADB controls for coding agents.
- `docs/setup/` — PyTorch backends (ROCm / CUDA / CPU).
- One CLI entry point: `chesslab <command>` (`src/chesslab/cli.py`, Typer). **Python is dataset
  building and training only since 2026-08-07** — the move tracker and the FastAPI/React web UI
  were deleted (35,694 lines; the tracker is reachable at the `python-tracker-final` tag). The
  tracker lives in `android/` and runs on the phone and, through `:desktop`, on the PC.
- `chesslab session scan|autofix|adopt|flag` repairs a session's geometry before slicing — it
  was web-UI-only until the deletion, which is why `docs/data-pipeline.md` §12 reads as a
  browser session.

## Non-goals

- No deep-learning board/corner detection as a hard dependency — ArUco markers
  (per-frame self-calibration) are the primary geometry source; a line-based
  markerless detector exists experimentally (`board_corners_from_lines`).
- No reinforcement learning; piece recognition is supervised classification.

## Tech stack (binding)

Python 3.11+ (dev machine: 3.12), **uv** (`pyproject.toml` is the single
source), Typer CLI, OpenCV/NumPy/Pillow, python-chess, PyTorch + torchvision
(backend per `docs/setup/` — on the dev machine a Windows ROCm stack pinned to
local wheels in `wheels/`), FastAPI/uvicorn + React (Vite) web UI, YAML config,
JSONL manifests. License: **GPL-3.0-or-later** (python-chess is GPL).

## Conventions (project-wide)

- **Language:** code, comments and docs are English.
- **Reproducibility:** capture (`collect`) and labeling (`slice`) are separate;
  slicing is a pure, repeatable step over session logs (frame + FEN + corners).
- **Determinism:** global `--seed` (default 42) for split/sampling/training.
- **Config over code:** paths, class list, crop params, split ratios live in
  `config.py`/YAML. The canonical class list exists in exactly one place
  (`config.CLASSES`).
- **Data layout:** a recording is one folder (`data/recordings/<ts>/`) and everything that only
  says something about it lives inside — `log.jsonl`, `boards/`, `mattes/`, `review/`, its own
  `corrections.jsonl`. Derived trees sit outside and are rebuildable: `crops/<tag>/` (crops **and**
  that pool's `manifest.jsonl`), `datasets/`, `models/`, `reports/`. A recording's **id** keeps the
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
  Missing profiles are auto-created from the camera source
  (`calibration.ensure_profile`); `calibrate auto` is for interactive tuning.
- **Web read paths** go through `chesslab/manifest_cache.py` (mtime-keyed
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
- `uv run ruff check src tests synth` — lint gate.
- Frontend changes: `cd src/chesslab/web/frontend && npm run build` (output is
  committed under `web/static/`); `npm run lint` must not add new errors.
- Android UI/camera changes: run
  `.\scripts\android-emulator.ps1 -Avd Chesslab_Agent1 -Port 5554 -Clip blender-opening -RestartExisting`.
  The `emulator` APK is x86_64-only and separate from the arm64 phone builds; the smoke test
  must print `Camera feed confirmed`, not merely reach `Stop tracking`. Agents interact through
  `scripts/android-ui.ps1`; the emulator is headful unless `-Headless` is explicitly passed.
  Concurrent agents must use distinct AVDs, even ports/ADB serials and Git worktrees; artifacts
  are isolated under `tmp/android-emulator/<serial>/`.
- Do not commit `data/`, `scans/`, `synth_pieces/`, `wheels/` (gitignored).

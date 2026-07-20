# CLAUDE.md — chesslab

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
- `docs/move-tracker-flow.md` — tracker detection flow (Mermaid).
- `docs/synth-pipeline.md` — synthetic data pipeline (Blender renders → ingest).
- `docs/setup/` — PyTorch backends (ROCm / CUDA / CPU).
- One CLI entry point: `chesslab <command>` (`src/chesslab/cli.py`, Typer).
- **LENS vs BOARD calibration:** `chesslab lens` (`lens.py`) models the camera OPTICS
  (barrel distortion → `data/lens/calib.npz`, applied only in `camera.open_capture`),
  `chesslab calibrate` (`calibration.py`) models the BOARD geometry (ArUco → homography).
  Roll-out order is lens first — a new lens calibration re-stamps all board profiles.
- **Fused synth builds:** `chesslab dataset build-synth` (`synth_build.py`) packs renders
  straight into the memmap — its `mm://` manifest rows have NO files, consumers must read
  the packed memmap. Rotation augmentation is train-time only (`torch_data._RandomRot90`),
  never materialized. Classic `ingest synthetic` remains for small sets / debug overlays.

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
- **Classes (14):** `empty`, `wP wN wB wR wQ wK`, `bP bN bB bR bQ bK`,
  `occluded` (never from FEN, only from manual labels; `empty`/`occluded` are
  "may be missing" classes).
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
- Do not commit `data/`, `scans/`, `synth_pieces/`, `wheels/` (gitignored).

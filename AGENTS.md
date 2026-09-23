# AGENTS.md — chesslab

> Entry point for AI coding agents. The project is **built and in maintenance** —
> the original specs are gone (`specs/` removed, commit `aacffaf7`); the current state is
> documented in `README.md` and `CLAUDE.md`. `CLAUDE.md` holds the binding rules and pitfalls;
> this file does not repeat them.

## Mission

`chesslab` builds an **auto-labeled** image dataset of chess pieces on a physical board filmed by a
fixed camera, and trains a per-square classifier on it. Labels come from the known game state (FEN,
via `python-chess`) — one photo of a position yields 64 labeled examples. The **move tracker** is
Kotlin and lives in `android/`; nothing of it is left in Python.

## Current architecture (pointers, not prose)

- `README.md` — user-facing overview, all CLI commands per stage.
- `docs/synth-pipeline.md` — synthetic data pipeline (Blender renders → ingest).
- `docs/android-emulator.md` — headful x86_64 AVD workflow, recorded-video camera input and ADB
  controls for coding agents.
- `docs/setup/` — PyTorch backends (ROCm / CUDA / CPU).
- `platform/app/README.md` — the Next.js labeling front-end (`data/recordings/` is its whole world).
- One CLI entry point: `chesslab <command>` (`src/chesslab/cli/`, Typer, one module per sub-app). **Python is dataset
  building and training only since 2026-08-07** — the tracker and the FastAPI/React web UI were
  deleted (reachable at the `python-tracker-final` tag), the capture rig and `track_feedback`
  followed on 2026-08-20. `SessionWriter` (`src/chesslab/session_writer.py`) survived the rig.
- `chesslab session scan|autofix|adopt|flag` repairs a session's geometry before slicing.

## Non-goals and tech stack

See `CLAUDE.md` ("Non-Goals & Tech Stack"). `pyproject.toml` is the single source for Python
dependencies; on Windows torch/torchvision/ROCm come from AMD's `whl-next` index (`[tool.uv.index]`),
not from local wheels. Next.js front-end in `platform/app/`, YAML config, JSONL manifests.
License: **GPL-3.0-or-later** (python-chess is GPL).

## Conventions (project-wide)

- **Language:** identifiers are English; comments and `docs/` are a German/English mix — keep the
  language of the file you edit.
- **Reproducibility:** recording and labeling (`slice`) are separate; slicing is a pure, repeatable
  step over session logs (board + FEN + corners).
- **Determinism:** global `--seed` (default `config.SEED` = 42) for split/sampling/training; splits
  are still read from `split.json`, never regenerated.
- **Config over code:** paths, class list, crop params, split ratios live in `config.py`/YAML;
  the class list only in `config.CLASSES` (classes and `coverage`: `CLAUDE.md`, `docs/class-scheme.md`).
- **Data layout:** a recording is one folder (`data/recordings/<ts>/`) and everything that only
  says something about it lives inside — `log.jsonl`, `boards/`, `mattes/`, `review/`, its own
  `corrections.jsonl`. Derived trees sit outside and are rebuildable: `crops/<tag>/` (crops **and**
  that pool's `manifest.jsonl`), `packs/`, `datasets/`, `models/`, `reports/`, plus `footage/` and
  `plates/`. `data/_delete/` holds retired material the user deletes themselves. A recording's
  **id** keeps the `rg-` prefix its directory dropped; resolve it with `sessions.session_dir()`,
  never by joining a path. Full table: `README.md` → "Where it all lands", `docs/data-pipeline.md` §1.1.
- **Calibration profiles** are geometry config (board size, orientation, crop params), not stored
  positions. `calibration.ensure_profile` holds the carry-over rule Kotlin mirrors; no command calls
  it since the capture rig went, `scripts/ingest_video_session.py` is the remaining door.
- **Crop counts per session** go through `chesslab/manifest_cache.py` (mtime-keyed) — never re-read
  whole manifests per request.

## Known pitfalls (still true)

- **3D pieces extend upward** past their base cell; the crop box is widened by `pad_side`
  (`config.CROP`) on a straightened board (`CLAUDE.md`, "Board store", "Crop sizes").
- **Class imbalance:** `empty` dominates massively; handled at dataset time (capping/weights).
- **Never split randomly:** frames of one session are near-identical → leakage. Split is always
  **per session**.
- **Orientation:** a wrong a8 corner silently transposes all labels; `ingest --debug-overlay N`
  exists to eyeball-check before training.

## Verification

- `uv run pytest -q` (or `.venv/Scripts/python.exe -m pytest -q`) must be green.
- `uv run ruff check src tests synth scripts` — lint gate.
- `.github/workflows/ci.yml` runs ruff, the `platform/app` web gate and the Kotlin gate on every
  push and PR. It has **no Python test job**, so run `pytest` locally. (Its comment blames local
  `wheels/`; since `cf4cba1b` the pin uses AMD's index, but torch is `win32`-only, so a Linux
  runner would still get no torch.)
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

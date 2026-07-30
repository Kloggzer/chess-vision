# chesslab

Build a high-quality, **auto-labeled** image dataset for recognizing chess pieces on a
physical board filmed by a fixed camera, then train a per-square classifier.
Labels are not annotated by hand — they are derived from the known game state (FEN, via
`python-chess`). One photo of a position yields 64 labeled training examples.

Project status: **alpha**. See [`specs/`](specs/) for the staged specifications and
[`docs/architecture-review/`](docs/architecture-review/) for the architecture documentation.
The experimental **move tracker** (live move detection via frame differencing + legality;
details in [`src/chesslab/move_tracker/README.md`](src/chesslab/move_tracker/README.md))
runs on a separate web UI at `http://127.0.0.1:8001`.

## Install

```bash
uv sync                 # creates .venv, installs runtime + dev deps from uv.lock
```

Run commands through the env with `uv run` (e.g. `uv run chesslab doctor`).

PyTorch is **not** installed as a regular dependency — see
[`docs/setup/`](docs/setup/README.md) for the GPU/PyTorch setup (AMD **ROCm**, NVIDIA
**CUDA**, or CPU-only). On this project's development machine (Windows + Python 3.12) the
ROCm stack is pinned to local wheels in `wheels/` (git-ignored); on other platforms
install the matching PyTorch build yourself, then validate with `uv run chesslab doctor --gpu`.

## Quick start — the 3 essential commands

```powershell
# 1) Collect data with the live dashboard (shows class gaps), then slice into labeled crops
uv run chesslab collect play --strategy random --max-plies 60 --ui
uv run chesslab slice --all

# 2) Split WITH class balancing: cap empty + pawns, each piece <= 3x the rarest (train only)
uv run chesslab split --max-empty-ratio 1.5 --max-class-ratio 3

# 3) Training (stable ROCm-on-Windows config: GroupNorm default, small batch, no AMP)
uv run chesslab train --backbone smallcnn --epochs 30 --batch-size 32 --no-amp
```

Then evaluate: `uv run chesslab eval --run data/models/run-<ts> --split test`
(`<ts>` = the run directory printed by `train`). During training watch **`macro_recall`**
(not `val_acc`, which is inflated by `empty`).

## Web UI (local)

A small browser front end for **collecting, scanning, dataset curation and training** —
much nicer than the OpenCV windows. It reuses the existing pipeline.

```powershell
uv run chesslab web                          # -> http://127.0.0.1:8000
```

Four tabs:

- **Collect** (`/collect`): camera capture with strategy selector
  (`random | stockfish | coverage | sweep`), live board overlay and session handling.
  Sessions are sliced automatically when finished.
- **Scan** (`/scan`): turntable capture and mesh workshop for the synthetic-piece
  pipeline (see [`synth/README.md`](synth/README.md)).
- **Datasets** (`/datasets`): two phases. **Sessions (raw material):** per session
  *slice/re-slice*, *archive* (remove from dataset, frames kept, reversible) / *delete*.
  **Curated datasets:** build named datasets from any set of sessions — with **dedup**
  (cap per `(session, square, piece)` **+** perceptual hash against never-moved pieces)
  and optional **90/180/270° rotation** (**off by default** — it violates the fixed-camera
  assumption; the toggle only records it in `dataset.yaml`, the rotation is applied
  **on the fly at train time** (`_RandomRot90`), nothing is materialized). Logic in
  `dataset_build.py`; each dataset gets `data/datasets/<name>/{manifest.jsonl,split.json,stats.json}`.
  CLI: `chesslab dataset build <name> --sessions s1,s2 [--cap 4] [--no-phash] [--rotate]`.
- **Training** (`/training`): pick a **dataset** + hyperparameters (backbone / epochs /
  batch / LR); progress bar (epoch i/N, board_acc), metric curves, eval + confusion
  matrix. **Continue training:** warm-start from an earlier run (`train --resume <run>`)
  — compatible weights are transferred; a head that became incompatible (e.g. new class
  `occluded`) is re-initialized. The result lands in a **new** run (`resumed_from` in its
  `config.json`).

**14th class `occluded`** (square covered by a hand/object): never comes from FEN, only
from manual labels; `empty`/`occluded` are "may be missing" classes (no warning). Model/
training/eval scale automatically via `len(classes)`; old 13-class runs stay valid.

The front end is a **React + Tailwind + lucide-react + TanStack Query + react-router**
app (source in `src/chesslab/web/frontend/`, built into `src/chesslab/web/static/`).
Every view has a **URL** → F5 and browser-back work (FastAPI serves `index.html` for
client routes). The built front end is checked in — to change it:

```bash
cd src/chesslab/web/frontend && npm install && npm run build
```

## Move tracker (experimental)

`chesslab track` digitizes a live game from the fixed camera **without a CNN**: per-frame
board warp (ArUco), motion gating, per-square diff against a reference image, and picking
the **legal** move that best explains the change (castling/en passant/captures included),
with an optional CNN safeguard. Web UI on `http://127.0.0.1:8001`. Details and parameters:
[`src/chesslab/move_tracker/README.md`](src/chesslab/move_tracker/README.md).

Debug endpoints: `GET /crops.jpg` shows the **exact 64 CNN input crops** (raw frame
through the live inference path, no display overlays) — the first stop for any
misread. The illegal-move alarm card shows per-conflict reasoning (expected vs
CNN@confidence) and offers *Undo / Accept CNN position (with per-square preview) /
Baseline*; while alarmed, tracking is hard-latched (no commits, no reference pull,
no noise learning) until corrected. GPU inference uses a captured CUDA/HIP graph
(fp16, batch 64) — a full 64-crop observation runs in ~4 ms (tiny) / ~15 ms (medium)
on the dev box.

**Camera resolution:** 720p is sufficient for tracking — ArUco markers detect reliably at
half-res anyway, and the detection warp runs at `detect_scale=0.5` by default. A 1080p
stream is only worth it for collection/slicing (quality crops for the CNN).

## Stages

| Stage | Command(s) | Status |
|-------|------------|--------|
| 0 — Pre-flight | `chesslab doctor [--gpu] [--camera N] [--json]` | ✅ implemented |
| 0b — Lens (optics) | `chesslab lens calibrate\|show` | ✅ implemented |
| 1 — Calibration | `chesslab calibrate auto\|check\|list\|markers` | ✅ implemented |
| 2 — Game state | (library) | ✅ implemented |
| 3 — Capture & label | `chesslab collect pgn\|play\|live`, `chesslab slice` | ✅ implemented |
| 4 — Dataset | `chesslab stats\|split`, `chesslab dataset verify` | ✅ implemented |
| 5 — Training | `chesslab train\|eval\|export` | ✅ implemented |
| 6 — Collection UI | `chesslab collect ... --ui`, `chesslab ui` | ✅ implemented |

## Stage 0 — `doctor` (pre-flight)

Validates the environment; installs nothing. Exit code is `0` only if **all requested**
mandatory checks pass.

```bash
chesslab doctor                 # Python, app deps, data dirs
chesslab doctor --gpu           # + PyTorch GPU validation incl. a real matmul test
chesslab doctor --camera 0      # + open camera index 0 and read a frame
chesslab doctor --gpu --json    # add a machine-readable JSON report
```

Each line is `[PASS] / [WARN] / [FAIL] <check> — <detail>`. A mismatched PyTorch build
produces a clear FAIL naming the build as the cause; the GPU path (`validate_gpu()`) is
reused by `train` so it aborts loudly instead of silently falling back to CPU.

## Stage 0b — `lens` (camera optics)

`chesslab lens` calibrates the **LENS** (barrel distortion of the physical optics, stored
once as `data/lens/calib.npz` and applied to every live frame), while `chesslab calibrate`
calibrates the **BOARD** (where the 8×8 grid sits in the image) — run `lens` **first**, as
a new lens calibration re-stamps the board profiles.

```bash
uv run chesslab lens calibrate --camera 0   # auto-captures views of a printed 8x8 board, then solves
uv run chesslab lens calibrate-board        # zero-interaction: solves from recorded sessions on disk
uv run chesslab lens show                   # K, distortion, RMS, the resolution it was shot at
```

Frames are captured automatically (novel pose + cooldown), a HUD shows which image regions
are still uncovered, and the solve starts by itself. With the **5–50 mm varifocal** lens the
result is only valid at the zoom/focus it was shot at — re-run after touching the lens.

`lens calibrate-board` needs no interaction at all: the physical board **is** the pattern.
It harvests real sessions from `data/sessions/` (per-frame board corners + frame images),
detects the board's 7×7 inner checker corners around the logged corners (piece-occluded
intersections are rejected), gates the views for pose diversity across differently mounted
recordings, and only saves when a held-out frame's grid lines demonstrably get straighter
after undistortion. If the recorded sessions are all from the same mount it refuses with a
clear reason instead of producing a confidently wrong model.
Only the local USB camera is undistorted; phone/IP-cam URLs and recorded files are not, so
sessions on disk are never undistorted twice.

## Stage 1 — `calibrate` (ArUco markers, required)

**Markers are mandatory.** Calibration, capture and slicing self-calibrate **per frame**
from the ArUco markers at the board edge — robust against board/camera movement, no
static profile that can drift. The markers must therefore **stay on the board for the
whole capture**.

**A separate calibration step is optional:** if the profile is missing, `chesslab track`
and `collect` auto-create it from the first frames of their own camera source
(`ensure_profile`, ArUco). Run `calibrate auto --preview` only when you want to tune the
`--margin` interactively.

```bash
uv run chesslab calibrate markers --out data/calibration/markers.png  # print the marker sheet
#   -> cut along the boxes, tape one marker to each OUTER corner
uv run chesslab calibrate auto --camera 0 --profile default --preview # live: marker box + playing-field box
#   w = grow the playing-field box, e = shrink, s = save, q = abort
uv run chesslab calibrate check --profile default                     # grid overlay for verification
```

**Resilient to occlusion & jitter:** the `MarkerTracker` tracks each marker position
**smoothed** (EMA) with a **dead zone**, so the box doesn't twitch on jitter. The last
known position is **held** when a marker is occluded (e.g. by your hand) — calibration
stays **stable and perspective-true**. A **single** outlier jump is rejected; only a move
**confirmed** over several frames re-seats the corner (**self-correction** instead of
staying wrong). A corner that has only been held for a long time is marked *stale*.

**Fewer than 4 visible markers is fine** — once a **profile** exists: capture/slicing
seed the tracker from the 4 calibrated corners (`make_tracker(profile)`), so the box is
available immediately and perspective-true even with only 2–3 markers in view. Threshold
via `calibrate auto --min-markers N` or `config.TRACKER.default_min_markers`. During
**calibration** there is no seed: all 4 markers must be live before you save.
`--margin` (live in the preview with `w`/`e`) insets the playing-field box relative to
the marker box — so you can tape the markers **next to** the field, not on it.

The pure geometry (`square_to_crop_box`, `resolve_board_corners`, `MarkerTracker` in
`calibration.py`) is tested headless. **Crops are square by default** (one square =
`board_size/8`, out_size `128×128`) and cut **distortion-free** (`crop_square` keeps the
aspect ratio and pads instead of squashing). For very **oblique** cameras, extend the box
upward with `pad_up` (for tall 3D pieces) — the out_size ratio is kept via letterboxing.

## Stage 3 — `collect` + `slice` (capture, then auto-label)

Capture and slicing are **separate** so slicing is reproducible. `collect` writes raw
frames + FEN **+ the live-verified board corners** to a session log; `slice` turns those
into labeled crops and can be re-run with different crop params without re-capturing.

> **Capture geometry is stored with the session.** `collect` writes the 4 board corners
> (`a8,h8,h1,a1`, frame pixels) that were visibly correct in the live preview to each
> frame (field `"corners"` in the log). `slice` warps **from exactly these corners**
> (`warp_from_corners`) — i.e. exactly what was shown during capture, instead of
> re-detecting markers (which drifts at oblique angles). Old sessions without
> `"corners"` fall back to per-frame marker detection; frames without detectable markers
> are skipped.

```bash
# Capture (on the rig — camera + display)
uv run chesslab collect pgn --pgn game.pgn --profile default   # Space=capture, n=next, s=skip, u=undo, q=quit
uv run chesslab collect play --strategy random --max-plies 60  # engine generates the game (no PGN needed)
uv run chesslab collect play --strategy stockfish --stockfish-path /usr/bin/stockfish
uv run chesslab collect play --strategy coverage --ui          # dense setups targeting the rarest classes
uv run chesslab collect play --strategy coverage --sets 2 --count 30  # with 2 piece sets -> queens/kings 2x per setup
uv run chesslab collect live --start-fen "<FEN>"               # type SAN/UCI | cap | undo | fen <FEN> | done

# Slice (pure, reproducible — no hardware needed)
uv run chesslab slice --session 20260625-201500
uv run chesslab slice --all
uv run chesslab slice --session <id> --pad-up 1.0 --out-size 128x128  # re-slice with new crop params
uv run chesslab slice --preview <id>                                  # debug: label vs visible crop
```

Outputs: `data/squares/<class>/<session>_<frame>_<square>.png` (ImageFolder-style) and
one manifest line per crop in `data/manifests/squares.jsonl` (path, label, session_id,
frame, ply, square, square_color, fen, out_size, ts).

## Stage 4 — `stats` / `split` / `dataset verify`

```bash
uv run chesslab stats                              # class distribution + light/dark coverage + warnings
uv run chesslab split --val-frac 0.15 --test-frac 0.15 --max-empty-ratio 1.5 --seed 42
uv run chesslab dataset verify                     # files exist/loadable, out_size, labels, split disjoint
```

`split` is **session-based** (whole sessions go to train/val/test — never split a
session's near-identical crops, which would leak). It caps `empty` at
`max_empty_ratio × largest piece class` (seeded) and writes inverse-frequency
`class_weights` into `data/manifests/split.json`.

**Hard-empty keep list** (2026-07-21): `scripts/mine_hard_empty.py` runs a model over
all real `empty` crops and collects the confident misreads (neighbour-piece bleed,
shadow blobs, uniform dark corners) into `data/manifests/hard_empty.jsonl`; every
`dataset build` automatically protects those crops from the empty cap — the random
cap used to throw away exactly the rare hard cases. Fixed-position captures for such
hard negatives: `scripts/capture_empty_session.py` (live preview, auto-snap while
varying the lighting over e.g. the empty board) or `scripts/ingest_video_session.py`
(import a filmed board as a session); pin those sessions to the TRAIN split when
building (web builder "pin→train" / API `force_train`) — all-empty sessions in
val/test would distort board metrics. The augmentation policy
(`data/manifests/augment.yaml`) is written here and applied in Stage 5 — brightness /
contrast / gamma / light blur / small jitter allowed; **flips forbidden**. Note the
distinction on rotation: the train-time TRANSFORM never rotates, but `dataset build`
materializes 90/180/270° copies of the TRAIN split by default since 2026-07-21
(val/test stay unrotated) — a no-rotate build starved the small-model finetune 4×
and rotation demonstrably rescued rare classes (bK recall 0 → 0.28). Train-time
augmentation also includes the neighbour-bleed paste for `empty` crops
(`paste_neighbour_strip`, `AugmentPolicy.neighbour_p`).

## Stage 5 — `train` / `eval` / `export`

Needs a working PyTorch GPU build (see [`docs/setup/`](docs/setup/README.md)). `train`
runs the Stage 0 GPU validation first and **aborts** (no silent CPU fallback) if the GPU
isn't usable.

```bash
uv run chesslab train --backbone smallcnn --epochs 30 --batch-size 256   # checkpoints by board-accuracy
uv run chesslab eval --run data/models/run-<ts> --split test            # board-acc, per-class recall, confusion
uv run chesslab export --run data/models/run-<ts> --format all          # TorchScript + ONNX + model_card.json
```

The **checkpoint metric is board-accuracy** (all 64 squares correct), not square-accuracy
(which `empty` inflates). Backbones: `smallcnn` (default) or `mobilenet_v3_small`
(ImageNet-pretrained). `model_card.json` carries the class list, `out_size`,
normalization, metrics and torch version — the clean handoff to an inference app.

**`export` bakes the input resolution into the graph**, at the run's own `infer_size`
(`config.json`) — *not* at `out_size`, which is the size the crops on disk were built at. That key
is how a model's serving resolution is changed: `--infer-size 96x96` writes it and exports at it,
and everything that serves the model reads it back from the config. It must be one of the run's
trained `scales`; an untrained size fails silently (80 px costs the occupancy champion 133 misses
against 96 px's 19). See `docs/data-pipeline.md` §11 and `specs/22-inference-resolution/`.

**Model heads (`--head`).** Three interchangeable heads, all emitting 14-class outputs so
eval/inference are identical: `combined` (one flat 14-class head, default), `factored`
(decoupled type×color), and `twostage` (hierarchical **occupancy→piece**: a binary
empty/occupied head + a 13-class piece head, reconstructed to 14-class log-probs — the
piece head trains only on occupied squares). `eval` and the bake-off report an
occupancy/piece breakdown (`occ_acc`, `occ_board_acc`, `piece_acc`, `type_err`,
`color_err`). Compare heads fairly with
`chesslab experiment run --heads combined,factored,twostage`.

**Transfer learning from external datasets (`chesslab ingest`).** Pretrain on large,
diverse public chess datasets, then `--resume`-finetune on your own fixed-camera sessions
— the biggest lever against piece-**type** confusion with little own data. `ingest`
converts a third-party dataset (full-board photos with known corners + FEN) into the
per-square crop format with **no core-pipeline changes**. Adapters: `chesscog` (rendered,
~5k imgs), `chessred` (ChessReD2K real photos, ~2k imgs, CC-BY-4.0) and `synthetic`
(this repo's Blender renderer, see [`docs/synth-pipeline.md`](docs/synth-pipeline.md)).

For **big synthetic runs** the entry point is the fused build, which packs renders straight
into the training memmap without crop PNGs (`ingest synthetic` remains the tool for small
sets and `--debug-overlay` label checks):

```bash
# verify orientation FIRST (wrong corner order silently transposes all labels):
chesslab ingest synthetic <renders> --tag synth-check --limit 32 --debug-overlay 8 --no-build
# then the fused build (warp at 1100 px by default, matching the framed renders):
chesslab dataset build-synth pretrain-synth --renders <renders> --cap 8 --val-frac 0.05 --test-frac 0.05
```

```bash
# external datasets still go through ingest (same orientation check applies):
chesslab ingest chessred <path> --tag pretrain-chessred --board-size 900 --debug-overlay 8
# 3-stage curriculum (synthetic -> real -> yours), same backbone + head throughout:
chesslab train --dataset pretrain-synth    --head twostage --backbone mobilenet_v3_small --epochs 20 --out data/models/pre-synth
chesslab train --dataset pretrain-chessred --resume pre-synth --head twostage --backbone mobilenet_v3_small --epochs 15 --out data/models/pre-chessred
chesslab train --dataset <your-sessions>   --resume pre-chessred --head twostage --backbone mobilenet_v3_small --epochs 15
```

## Stage 6 — collection dashboard (`--ui` / `chesslab ui`)

A second OpenCV window assisting data collection: live class coverage (green/yellow/red
bars), a light/dark matrix (✓/✗), session progress, and a recommended FEN for the weakest
class — placed on the **specific missing square color**.

```bash
uv run chesslab collect live --ui                 # dashboard updates after each capture (g = copy FEN)
uv run chesslab ui                                # standalone dashboard on the current state
```

Coverage is derived from **session logs** (FEN → 64 labels), so it reflects what you just
captured — *before* any `slice`. The dashboard is render-only; the capture loop owns the
keyboard (single OpenCV key stream). `pyperclip` is optional (used only for `g` / `rec`).

## Development

```bash
uv run pytest -q        # full test suite (no GPU/camera needed)
```

```
........................................................................ [ 24%]
........................................................................ [ 48%]
........................................................................ [ 72%]
........................................................................ [ 96%]
............                                                             [100%]

=============================== warnings summary ===============================
  tests/test_cnn_recovery.py::test_resync_cnn_endpoint
    Using `httpx` with `starlette.testclient` is deprecated; install `httpx2` instead.

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
300 passed, 3 deselected, 1 warning in 11.26s
```

```bash
# lint (2 known warnings): the lint gate tracks ongoing issues
uv run ruff check src tests synth
```

```
src\chesslab\web\routers\collect.py:167:41: F821 Undefined name `config`
src\chesslab\web\routers\sessions.py:19:5: F841 Local variable `by_session` is
assigned to but never used
Found 2 errors.
```

```bash
# Frontend (Vite + React)
cd src/chesslab/web/frontend
npm run lint            # ESLint (flat config, TS + React)
npm run knip            # dead-code / unused-export detection
npm run build           # verify no regressions

# Python
uv run ruff format --check src tests synth    # formatting diff
uv run vulture src --min-confidence 80        # dead-code analysis (heuristic)
```

Utility scripts are documented in [`scripts/README.md`](scripts/README.md).

## License

This project is licensed under the **GNU General Public License v3.0 or later**
(see [`LICENSE`](LICENSE)). The core dependency `python-chess` is GPL-3.0+, which is
the deciding factor for the project license.

## Attribution

No third-party source code was copied into this repository; the following works provided
concepts and algorithmic inspiration:

- **Cucchiara et al.** — HSV-based cast-shadow detection (shadow veto in the move tracker)
- **Zabih & Woodfill** — census transform (structure check in the shadow veto)
- **Wölflein & Arandjelović, *chesscog* (2021)** — per-square pipeline, line-based board
  detection
- **Wang & Green (IVCNZ 2013)**, **A. Poggi (*ACMR*)**, ***LiveChess2FEN* (Quintana et
  al.)** — algorithmic precursors for diff tracking / legality matching
- **Reinhard et al. (2001)** — color transfer (`scripts/match_texture_tone.py`)
- **Taubin (1995)** — volume-preserving mesh smoothing (via pymeshlab)

Dataset credit: **ChessReD** (CC-BY-4.0) and **chesscog** datasets are supported via
`chesslab ingest` but are not distributed with this repository.

For the Android tracker application, see [`android/`](android/).

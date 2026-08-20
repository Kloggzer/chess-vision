# Architecture Overview — chess-vision / chesslab

Status: 2026-07-02 · ~11,000 lines Python (src + move_tracker + synth + tests) · Review basis: 4 parallel subsystem analyses

**Note:** this is a 2026-07-02 snapshot and several of its subjects no longer exist. Gone since:
the FastAPI/React web layer and `move_tracker/` (2026-08-07, the tracker is Kotlin in `android/`),
and `collect.py`, `collect_ui.py`, `experiment.py`, `geometry3d.py`, `photometric.py` and the
`chesscog`/`chessred` ingest adapters (2026-08-20). It also predates the 2026-08-18 move to 13
identity classes plus a regressed coverage output — `docs/class-scheme.md` is authoritative for
the class scheme, `README.md` and `docs/data-pipeline.md` for the current shape.

## Mission & System Context

`chesslab` is a **data-tool ecosystem** for per-square chess piece recognition (13 identity
classes plus a measured coverage output) from a fixed-mounted camera. Labels are generated
automatically from the known game state (FEN). Around the core, three satellites have formed
that were not foreseen in the original spec layout (CLAUDE.md):

```
┌────────────────────────────────────────────────────────────────────┐
│  Presentation                                                      │
│  ├── CLI (typer, cli.py — a single entrypoint `chesslab`)          │
│  ├── Web-UI (FastAPI + React/Vite SPA, src/chesslab/web/)   GONE   │
│  ├── OpenCV Dashboard (collect_ui.py)                       GONE   │
│  └── move_tracker/ (own FastAPI + HTML, PROTOTYPE, outside src)GONE│
├────────────────────────────────────────────────────────────────────┤
│  Domain Logic (Core Pipeline, src/chesslab/)                       │
│  Level 0  doctor.py          Env-/ROCm-/Camera Validation          │
│  Level 1  calibration.py     Homography, ArUco, MarkerTracker      │
│  Level 2  state.py           Game State (python-chess)             │
│  Level 3  labeling.py        (collect/geometry3d/photometric GONE) │
│  Level 4  dataset.py, dataset_build.py, synth_build.py, sessions.py│
│  Level 5  training/ (model, train, engine, evaluate, torch_data)   │
│  Level 7  experiment.py      Bake-off Grids                 GONE   │
│  NEW      ingest.py + ingest_adapters/ (synthetic only)            │
├────────────────────────────────────────────────────────────────────┤
│  Data / Infrastructure                                             │
│  config.py (class list, crop/augment policy, paths)                │
│  data/ (sessions JSONL+YAML, squares, manifests JSONL, models)     │
│  synth/ (Blender render pipeline) + synth_assets/ + synth_pieces/  │
│  wheels/ (pinned ROCm Torch wheels for Windows)                    │
└────────────────────────────────────────────────────────────────────┘
```

## Data Flow (Main Contract Chain)

```
Camera ──► calibration (profile YAML: homography, corners, crop params)
       ──► session (log.jsonl {frame, ply, fen, corners?, labels?} + session.yaml)
       ──► labeling.slice (Warp → 64 Crops → Label from FEN) ──► manifest.jsonl
       ──► dataset (Stats, Balance, session-based split → split.json)
       ──► training (SquareDataset → SmallCNN/MobileNetV3 → best.pt + config.json)
       ──► Consumers: web/inference.predict_arrays · move_tracker (planned: CNN resync)

Parallel:  synth/ (RealityScan→Blender→JPEG+JSON) ──► ingest_adapters/synthetic.py
           → ingest.run_ingest → Pseudo-Sessions → same slice path

Fused:     synth renders ──► synth_build.py (`dataset build-synth`): metadata pass (labels
           from FEN, curation/split) + ONE pixel pass straight into packed_images.u8 —
           no crop PNGs, manifest rows are virtual mm:// paths, consumers read the memmap.
```

The contracts are **file-based** (JSONL/YAML/JSON) — good for reproducibility and re-slicing,
but the schemas are nowhere formally documented (only implicitly in writer/reader code).

## Subsystems in Detail

**Core Pipeline** — cleanly staged, largely functional modules. `config.py` is the single
source for the class list, crop geometry, augment policy, and paths (the "config before code" principle is
followed). The headless core (geometry, state, stats) is pure and testable; camera/GUI coupling
is limited to the collect/calibration edges.

**Training** — SmallCNN (~100k params) or MobileNetV3-small (pretrained), three head variants
(combined / factored / twostage with explicit occupancy branch), CrossEntropy with class weights,
AdamW + Cosine, early stopping on `(macro_recall, board_acc)`. Split strictly per session.
Metrics: square_acc, macro_recall, board_acc (all 64 squares correct) plus diagnostic axes
(occ_acc, piece_acc, type_err, color_err).

**Web Layer** — FastAPI with ~30 endpoints (calibrate, collect, scan, manual, datasets,
training subprocess, inference, MJPEG streams), React/Vite SPA with 8 tabs, built assets are
committed to `web/static/`. State lives in four module-global dicts (`_TRAIN`, `_COLLECT`,
`_INFER`, `_MANUAL`) without locks — works for single-user local operation, but is the
biggest structural weakness of the layer.

**move_tracker/** — prototype at repo-root level (deliberately outside the package). Clean
consumer of the chesslab library (calibration, web.camera), no logic duplication. Detection:
warp (live ArUco-tracked) → motion gate → rolling average → per-square diff with
median normalization → scoring over all legal moves → ambiguity check →
multi-frame voting. Threading: daemon capture loop + one lock around shared state.
No test, no packaging, no abstraction seam for a second (CNN) observer.

**synth/** — Blender pipeline (turntable photos → RealityScan → isolate_piece →
render_board_v2, optionally sharded via `synth render --shards`); output flows either
through `synth_build.py` (`dataset build-synth`, the fused big-run path) or through the
`synthetic` ingest adapter into the normal slice pipeline (small sets, debug overlays).

## Test Landscape

13 test files, ~89 tests. Well covered: core pipeline (calibration geometry, state, collect,
labeling, dataset, dataset_build, doctor, the ingest adapters), web routes partially
(TestClient). **Dark:** move_tracker (0 tests), synth/synthetic adapter (0 tests,
data integrity risk due to corner ordering), web.camera/streaming, CLI dispatch, GPU training loop
(deliberately torch-gated).

## Overall Assessment

The core pipeline is, for a single-person data tool, **above-average in cleanliness** of structure
(config-centric, session-based split, separate collect/slice, adapter pattern for ingest).
The risks are concentrated at the **edges**: (1) crop/photometry geometry is duplicated across
the labeling, training, and inference paths → train/serve skew, (2) web-layer global state
and error swallowing, (3) untested new subsystems (move_tracker, synth). Details in
[issues-and-concerns.md](issues-and-concerns.md), improvements in [recommendations.md](recommendations.md),
training/accuracy in [training-accuracy-improvements.md](training-accuracy-improvements.md).

## Recent additions (2026-07-05)

- `calibration.ensure_profile()` / `profile_from_frame()`: missing calibration
  profiles are auto-created from the first frames of the camera source (ArUco).
  *Its callers (`track`, `collect`, the web collect start) are all gone — the
  function and its carry-over rule survive, unwired.*
- `chesslab/manifest_cache.py`: mtime-keyed in-memory aggregates over the crop
  manifests (crops/frames per session, lightweight stats rows, per-label index).
  *Only `sessions.list_sessions` still reads it — the web panels it was built for
  went with the FastAPI layer.*

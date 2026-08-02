# chesslab

Recognize the pieces on a physical chessboard filmed by a fixed camera, and digitize the
game being played on it.

Two things live here and they feed each other:

- a **data pipeline** that builds an auto-labeled per-square image dataset and trains a
  small CNN on it. Nothing is annotated by hand — labels are derived from the known game
  state (FEN, via `python-chess`), so one photo of a position yields 64 labeled examples;
- **move trackers** that digitize a live game, one on the desktop (`chesslab track`) and one
  on Android (`android/`). Both decide moves from frame differencing plus legality; the CNN
  is a safeguard on that decision, not the primary reader. That is why the pipeline above
  trains such a small model, and why occupancy — is this square empty? — matters more than
  piece identity.

## Where to go

| You want to | Read |
|---|---|
| run the phone tracker | [The Android tracker](#the-android-tracker) below |
| build a dataset from your own camera | [`docs/data-pipeline.md`](docs/data-pipeline.md) — read before touching `data/` |
| train or export a model | [Train, evaluate, export](#train-evaluate-export) below, then [`docs/setup/`](docs/setup/README.md) |
| understand the desktop tracker's logic | [`docs/move-tracker-flow.md`](docs/move-tracker-flow.md), [`src/chesslab/move_tracker/README.md`](src/chesslab/move_tracker/README.md) |
| render synthetic training data | [`docs/synth-pipeline.md`](docs/synth-pipeline.md), [`synth/README.md`](synth/README.md) |
| read what the phone decided and why | [`docs/diagnostics.md`](docs/diagnostics.md) |
| see the component map | [`docs/architecture-review/`](docs/architecture-review/) |
| change code without repeating a known mistake | [`CLAUDE.md`](CLAUDE.md) — the pitfalls list, kept current |

`specs/` holds numbered spec packs. They are the record of intent, not of state: several of
the highest numbers are `todo` with no code in the tree. Each pack's `STATUS.md` says which.

## Install

```bash
uv sync      # creates .venv from uv.lock (runtime + dev deps)
```

Run through the env with `uv run` (e.g. `uv run chesslab doctor`).

PyTorch is a **platform-conditional** dependency. On Windows + Python 3.12 the ROCm wheels
are pinned to local files in `wheels/` (git-ignored) and `uv sync` installs them; on every
other platform the markers exclude them and you install a matching PyTorch build yourself —
see [`docs/setup/`](docs/setup/README.md) for ROCm, CUDA and CPU-only. Validate either way
with `uv run chesslab doctor --gpu`, which runs a real matmul rather than trusting
`is_available()`. `train` runs the same check first and aborts instead of falling back to
the CPU in silence.

## The Android tracker

`android/` is a self-contained Gradle build (`:app`, `:core-engine`, `:core-geometry`,
`:core-cnn`) that runs the whole tracker on the phone — camera, geometry, CNN and a native
Stockfish for analysis. `:core-engine` is deliberately a pure JVM library with no Android
and no OpenCV on its classpath, which is what makes the engine testable against the Python
tracker's recorded frames.

Top-level screens: **Board · Camera · Games · Spectator · Speech · Settings**.

**There is no calibration wizard.** Point the Camera screen at the board; once all four
ArUco codes are in view the geometry is adopted and written, with no confirmation step. A
live outline and one line of prose ("Only 2 of 4 codes in view — move the camera back.")
are the whole interface. The orientation switch, the corner sliders, the marker-outset
steppers and the four-tap fallback are gone: the saved corners are only a seed, because the
live path re-detects the markers every few frames anyway. Fewer than four codes still draws
the outline but writes nothing — a two-marker fit must not become the record.

**Optics are steered from the same screen and held by a padlock.** Focus, zoom, exposure and
white balance are tiles along the bottom, offered only where the device supports them; the
**Lock** tile freezes auto-exposure, auto-white-balance and focus for the session. There is
no startup optics profile — the freeze is a button, not a timer.

**Undo is bridge-sized.** When the CNN recovers a position it may commit several moves at
once, and it writes one decision row per move it bridges. One press of Undo takes the whole
commit back and says so ("Undo 4 moves" / "One press takes back: Bxb5 + Kb8 + Bd4 + Nf3").
The position you returned to is then **held**: the recovery cannot re-derive its way back
into it until you set a new baseline, accept the CNN's position, or resync the FEN. The hold
is keyed to the position rather than to the move list, because in practice the CNN offered a
*different* line into the same wrong position each time.

**Diagnostics are a file you can read.** Every decision is appended to a rotating NDJSON log
in app-private storage (four files, 512 kB each), preceded by a `run_start` line naming the
app version, the device, the model actually loaded, its inference size and execution
provider, and the full config in force. "Debug → Decisions → Export diagnostics" hands the
set to the Android file picker as a ZIP; nothing leaves the phone otherwise. It exists
because the two things that cost the most debugging time — which config value was really in
the DataStore, and which model was really loaded — were both invisible from the source.
Format and a parsing snippet: [`docs/diagnostics.md`](docs/diagnostics.md).

**Models.** Seven CNNs are bundled under `android/app/src/main/assets/cnn_model/`, switchable
in Settings (restart required). A fresh install runs `shipped`: 2-class occupancy,
GroupNorm, `mobilenetv4_conv_small_035`, 96 px. Also bundled are three BatchNorm occupancy
variants (`bn35-80`, `bn50-80`, `bn100-80`) and `id35-80`, a 13-class *identity* model —
BatchNorm, width 0.35, 80 px — which reads piece type as well as occupancy. `id35-80` is
what `CLAUDE.md` records at **16 ms median for 64 crops** on an SM8650 over 534 live
observations; that figure belongs to that model on that phone and to nothing else.

**Settings offer decisions, not fields.** 45 knobs are persisted, 37 are on the screen, and
8 are withheld by an explicit table that carries a written reason for each — a knob that is
a measurement of the hardware is not a choice the user should be asked to make.

Build and lint gates:

```powershell
cd android
.\gradlew.bat :app:ktlintCheck :app:detekt        # documented gate
```

`:core-engine:test`, `:app:testDebugUnitTest`, `:app:assembleDebug` and per-module ktlint /
detekt tasks all exist. Two traps are recorded in [`CLAUDE.md`](CLAUDE.md) and not repeated
here: Gradle reports green on stale tasks (`--rerun-tasks` for a real gate), and
`:core-engine:detekt` is red for pre-existing reasons and therefore not in the gate.
Stockfish is a pinned git submodule under `android/third_party/`, built from source for
arm64-v8a only — initialise submodules before an `assembleDebug`.

> Everything in this section was verified by reading the source in this tree. None of it was
> built or run on a device here.

## The desktop pipeline

One CLI entry point: `chesslab <command>`. `uv run chesslab --help` lists all of it.

### Geometry: lens, then board

Two different calibrations, and the order matters. `chesslab lens` models the camera
**optics** (barrel distortion → `data/lens/calib.npz`, applied to frames from the local USB
camera only). `chesslab calibrate` models the **board** — where the 8×8 grid sits. Run
`lens` first: a new lens calibration re-stamps every board profile.

```bash
uv run chesslab lens calibrate --camera 0    # wave a printed board; auto-captures and solves
uv run chesslab lens calibrate-board         # zero interaction: solves from sessions on disk
uv run chesslab lens show                    # K, distortion, RMS, the resolution it was shot at
```

`calibrate-board` needs no pattern and no interaction, because the physical board already is
one: it reads the 7×7 inner checker corners out of recorded sessions and saves only when a
held-out frame's grid lines demonstrably straighten after undistortion. If every session came
from the same mount it refuses, rather than producing a confidently wrong model.

ArUco markers are the board-geometry source and must stay on the board for the whole
capture, because calibration, capture and slicing all self-calibrate **per frame** from
them. A separate calibration step is optional — `collect` and `track` auto-create a missing
profile from their own camera source.

```bash
uv run chesslab calibrate markers --out data/calibration/markers.png   # print, cut, tape to the corners
uv run chesslab calibrate auto --camera 0 --preview                    # tune --margin live (w/e), s=save
uv run chesslab calibrate check --profile default                      # grid overlay to eyeball
uv run chesslab calibrate list
```

`--margin` insets the playing-field box relative to the marker box, so the markers can sit
*next to* the field rather than on it. A crop is square — one cell (`board_size/8`) plus a
10 % margin on every side, letterboxed into a 128×128 `out_size` — and stays square so no
aspect distortion enters the training data. `--pad-up` extends the box upward for a strongly
oblique camera, where a tall 3D piece clips the top of the cell it stands on.

### Collect, then slice

Capture and labeling are separate steps so that labeling is reproducible: `collect` writes
raw frames, the FEN, and the board corners that were visibly correct at capture time;
`slice` warps from exactly those corners and can be re-run with different crop parameters
without touching the camera again.

```bash
uv run chesslab collect play --strategy random --max-plies 60 --ui
uv run chesslab collect play --strategy coverage --sets 2 --count 30   # dense setups for rare classes
uv run chesslab collect pgn --pgn games/test.pgn                       # physically replay a game
uv run chesslab collect live --start-fen "<FEN>"                       # type SAN/UCI, then capture

uv run chesslab slice --all                                            # pure, no hardware needed
uv run chesslab slice --session <id> --pad-up 1.0 --out-size 128x128   # re-slice with new params
uv run chesslab slice --preview <id>                                   # label vs visible crop
```

Output is `data/squares/<class>/…png` plus one manifest line per crop in
`data/manifests/squares.jsonl`. `--ui` (and standalone `chesslab ui`) adds a coverage
dashboard driven from the session logs, so it reflects what you just captured, before any
slicing. `chesslab cameras` probes what your cameras really deliver, which is rarely what
they advertise.

### Datasets

```bash
uv run chesslab stats                                     # class distribution, light/dark coverage
uv run chesslab dataset build <name> --sessions s1,s2     # filter -> dedup -> split -> pack
uv run chesslab dataset build <name> --like <donor> --classes occupancy
uv run chesslab dataset list | verify | delete
uv run chesslab split --max-empty-ratio 1.5 --max-class-ratio 3        # the global, unnamed split
```

Splits are **per session** — frames from one session are near-identical, so a random split
leaks. `--classes` narrows the canonical 14-class list at build time (`occupancy` = 2,
`pieces13` = 14 minus `occluded`, which has no rows in the corpus); no crop is ever
re-labeled. Perceptual-hash dedup and rotation are both **off** by default; the per-cell cap
(`--cap`, default 4) is what actually bounds "the piece never moved".

`--like <donor>` copies a donor dataset's session split, dedup policy and class balancing
verbatim. Use it for any build meant to be compared against a model trained on that donor: a
split is **not** reproducible from its own recorded parameters, and a near-twin is worse than
no twin. `CLAUDE.md` has the measurement behind that.

Synthetic renders have their own fused path that packs straight into the training memmap,
skipping crop PNGs entirely:

```bash
uv run chesslab dataset build-synth <name> --renders <dir> --cap 8
uv run chesslab ingest synthetic <dir> --tag check --limit 32 --debug-overlay 8 --no-build
```

Check the overlay first, always: a wrong a8-corner silently transposes every label. The same
`ingest` handles the external `chesscog` and `chessred` adapters.

### Train, evaluate, export

```bash
uv run chesslab train --dataset <name> --backbone smallcnn --epochs 30 --batch-size 256
uv run chesslab eval --run data/models/run-<ts> --split test
uv run chesslab export --run data/models/run-<ts> --format all --infer-size 96x96
uv run chesslab quantize --run data/models/run-<ts>          # INT8/QDQ ONNX for the Hexagon NPU
uv run chesslab reliance --run …                             # does it read the piece or the board?
uv run chesslab experiment run --heads combined,factored,twostage
```

The checkpoint metric is **board accuracy** (all 64 squares right), not square accuracy,
which `empty` inflates. `--head` picks between one flat head, a decoupled type×color head,
and a hierarchical occupancy→piece head; all three emit the same output shape so eval and
inference do not care which was used. `--scales` trains one size-agnostic model for several
input resolutions.

`export` bakes the input resolution into the graph at the run's `infer_size` — set with
`--infer-size`, and distinct from `out_size`, which is the size the crops on disk were built
at. It must be one of the run's trained `scales`; an untrained size degrades silently rather
than failing. `model_card.json` carries the class list, sizes, normalization and metrics.

Several flags document a measured result in their own help text (`--input-repr`,
`--crop-norm`, `--phash`) — `--help` is the honest source for those. Read the pitfalls in
[`CLAUDE.md`](CLAUDE.md) before running a comparison; `val_acc` in particular has ranked runs
in reverse.

## The web UI

```powershell
uv run chesslab web            # -> http://127.0.0.1:8000
```

Four tabs over the same pipeline, and much nicer than the OpenCV windows: **Collect**
(camera capture with the strategy selector, live overlay, sessions sliced on finish),
**Scan** (turntable capture and mesh workshop for the synthetic-piece pipeline),
**Datasets** (sessions as raw material — slice, re-slice, archive — and curated datasets
built from any selection of them, plus stats), **Training** (dataset + hyperparameters,
progress, metric curves, eval and confusion matrix, and warm-starting a new run from an
older one).

Every view has a URL, so F5 and browser-back work. The front end is React + Tailwind +
TanStack Query (source in `src/chesslab/web/frontend/`), built into
`src/chesslab/web/static/`, and the build output is committed — rebuild it after any change:

```bash
cd src/chesslab/web/frontend && npm install && npm run build
```

## The desktop move tracker

```bash
uv run chesslab track --source 0        # or an IP-cam URL; -> http://127.0.0.1:8001
```

Warp the board per frame, gate on motion, difference each square against a reference image,
and pick the **legal** move that best explains what changed — castling, en passant and
captures included. The CNN verifies; it does not lead. `GET /crops.jpg` renders the exact 64
crops the CNN is being fed, straight from the live inference path with no display overlays,
and is the first stop for any misread. While the illegal-move alarm is up, tracking is hard
latched — no commits, no reference pull, no noise learning — until you undo, accept the
CNN's position, or re-baseline.

720p is enough here: ArUco detects reliably at half resolution and the detection warp runs at
`detect_scale=0.5` anyway. Higher resolution pays off for collection, where crop quality
feeds the CNN. Parameters and their live-tuned values:
[`src/chesslab/move_tracker/README.md`](src/chesslab/move_tracker/README.md).

`chesslab track-feedback ingest` turns the tracker's "undo = that was wrong" feedback into
hard-negative crops appended to the squares manifest.

## Development

```bash
uv run pytest -q                                   # no GPU or camera needed
uv run ruff check src tests synth scripts
uv run vulture
```

All three must be green. Frontend: `npm run lint`, `npm run knip` and `npm run build` in
`src/chesslab/web/frontend`. Android: see the gate above.

`CLAUDE.md` carries what these gates do *not* catch, including why `vulture`'s configured
threshold is silent on unused functions, and why running `pytest` from a git worktree tests
the main checkout unless you set `PYTHONPATH`.

Utility scripts sit outside the CLI and are documented in
[`scripts/README.md`](scripts/README.md). Where a decision rests on published work the source
is in [`docs/references.md`](docs/references.md), which also lists the decisions that rest on
nothing published at all. `data/`, `scans/`, `synth_pieces/` and `wheels/` are git-ignored
and must not be committed.

## License

**GNU General Public License v3.0 or later** — see [`LICENSE`](LICENSE). The core dependency
`python-chess` is GPL-3.0+, which is the deciding factor.

## Attribution

No third-party source was copied into this repository. These works provided concepts and
algorithmic inspiration:

- **Cucchiara et al.** — HSV cast-shadow detection (the tracker's shadow veto)
- **Zabih & Woodfill** — census transform (structure check inside that veto)
- **Wölflein & Arandjelović, *chesscog* (2021)** — per-square pipeline, line-based board detection
- **Wang & Green (IVCNZ 2013)**, **A. Poggi (*ACMR*)**, ***LiveChess2FEN* (Quintana et al.)** —
  precursors for diff tracking and legality matching
- **Reinhard et al. (2001)** — color transfer
- **Taubin (1995)** — volume-preserving mesh smoothing (via pymeshlab)

**ChessReD** (CC-BY-4.0) and **chesscog** datasets are supported via `chesslab ingest` but
are not distributed here.

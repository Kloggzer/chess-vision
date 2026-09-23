# chesslab

Recognize the pieces on a physical chessboard filmed by a fixed camera, and digitize the
game being played on it.

Two things live here and they feed each other:

- a **data pipeline** that builds an auto-labeled per-square image dataset and trains a
  small CNN on it. Nothing is annotated by hand — labels are derived from the known game
  state (FEN, via `python-chess`), so one photo of a position yields 64 labeled examples;
- **a move tracker** that digitizes a live game, on the phone and — through the same shared
  modules — on a PC (`:desktop`), and
  on Android (`android/`). Both decide moves from frame differencing plus legality; the CNN
  is a safeguard on that decision, not the primary reader. That is why the pipeline above
  trains such a small model, and why occupancy — is this square empty? — matters more than
  piece identity.

## Where to go

| You want to | Read |
|---|---|
| run the Android tracker | [The Android tracker](#the-android-tracker) below; [emulator workflow](docs/android-emulator.md) |
| build a dataset from your own camera | [`docs/data-pipeline.md`](docs/data-pipeline.md) — read before touching `data/` |
| train or export a model | [Train, evaluate, export](#train-evaluate-export) below, then [`docs/setup/`](docs/setup/README.md) |
| render synthetic training data | [`docs/synth-pipeline.md`](docs/synth-pipeline.md), [`synth/README.md`](synth/README.md) |
| read what the phone decided and why | [`docs/diagnostics.md`](docs/diagnostics.md) |
| change code without repeating a known mistake | [`CLAUDE.md`](CLAUDE.md) — the pitfalls list, kept current |

`specs/` is gone (commit `aacffaf7`); `docs/specs-index.md` maps the old `specs/NN` numbers that
code comments still cite. Open direction questions live in `docs/offene-entscheidungen.md`.

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

Measured Android costs and the repeatable on-device benchmark are documented in
[`docs/android-performance.md`](docs/android-performance.md). It distinguishes shared phone wins
from the desktop-only video decoder, cache and multi-worker paths.

**Training recordings preserve the whole run.** Enable **Settings → Recording → Record
training video** before starting the tracker. The app encodes the same QHD analyzer frames used by
the tracker as H.264 and rejects any delivered size below 2560×1440 instead of silently recording
1080p. This avoids requiring a separate CameraX video profile or a second camera stream. A session starts
before the first move and contains `video.mp4`, an ordered `timeline.jsonl` with frame/FEN,
geometry, tracker events and video-clock sync points, the existing per-move reference JPEGs,
and `session.yaml`. Exporting the session produces one ZIP containing the complete bundle.
Recording is off by default and the configured storage cap stops both video and reference
capture without deleting older sessions. Camera stream combinations are device-dependent, so
QHD acceptance must be checked once on the physical phone; a rejected mode is shown as the
recording reason while analysis-only tracking continues.

On Windows, turn an exported recording and its saved game into an accepted pack plus explicit
review queues with the same Kotlin tracker the phone runs:

```powershell
cd android
.\gradlew.bat :desktop:run --args="training-video-pack <video.mp4> <game.json> <outDir>"
```

Repeated tracker/debug or packing passes can reuse a compact visual-observation cache:

```powershell
.\gradlew.bat :desktop:run --args="replay <video.mp4> quiet visualcache=../../tmp/visual-cache/game.cvo"
```

The first invocation builds the cache; later invocations consume it. The cache is bound to the
video path, size, modification time and model, and a missing requested frame is an error rather
than a fallback to neighbouring pixels. All decoded frames still pass through the detection and
engine stages in order; only the already-computed full-resolution crop/grid/CNN observation is
reused. On the 196 s QHD recording this reduced a warm full-rate replay from 199.3 s to 94.5 s
(2.08x realtime) with the identical 42 commit/reject rows, 2,575 observations and zero drops.
Building the cache still costs one ordinary pass, so this currently accelerates repeated analysis,
not the first and only pass over a new video.

The video pixels and tracker states decide which frames are usable; `timeline.jsonl` is not an
input. Quiet `waiting` plateaus whose FEN belongs to the saved game enter `accepted/` only when the
grid detector, the CNN `occluded` head, the CNN/FEN occupancy check and the engine's occlusion veto
all agree that the board is clean. Any warning routes the whole board to `quarantine/`. Grid-hand
detections go to `occluded-proposals/`. Both review packs deliberately use the invalid training
label `unreviewed` and retain the intended value only as `proposed_label`, so accidentally feeding
one to the trainer fails closed instead of poisoning a run. Motion, alarms, unknown positions and
take-backs are excluded. `audit.jsonl` records every sampled frame and its outcome.

By default every decoded source frame reaches the tracker. `fps=N` is an explicit experiment mode
that deliberately strides the tracker input while preserving the video clock; it must not be used
when full phone-equivalent frame coverage is required. On the 196 s QHD recording, full coverage
means all 5,150 frames at the stream's measured 26.25 fps (the encoder advertises 30 fps, but the
recorded stream contains fewer actual frames).

**Models.** Exactly two CNNs are bundled under `android/app/src/main/assets/cnn_model/`,
switchable in Settings (restart required). A fresh install runs `real14-80`, the 14-class
identity model whose explicit `occluded` class lets the tracker veto a hand even when the
model-free grid-groove detector misses it. `id35-80` is the hard-negative-finetuned 13-class
comparison arm; it is the model for which `CLAUDE.md` records **16 ms median for 64 crops** on
an SM8650 over 534 live observations, and being 13-class it reads `pOccluded = 0.0`. The
2-class occupancy models went with the scheme on 2026-08-20. No bundled model has received the
occlusion head yet — neither declares `coverage_output`, so the phone still runs the 14-class
scheme the Python side left behind on 2026-08-18. `docs/class-scheme.md` records the divergence.

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
arm64-v8a in the phone builds and x86_64 in the separate emulator build — initialise
submodules before an assemble task.

Phone-free development uses an x86_64 AVD with a recorded MP4 as its CameraX input. The
normal debug and release APKs remain arm64-only; the `emulator` build has its own app id and
can coexist with them. Setup and the agent-friendly ADB controls are documented in
[`docs/android-emulator.md`](docs/android-emulator.md). Once the AVD exists, the short path is:

```powershell
.\scripts\android-emulator.ps1 -Avd Chesslab_Agent1 -Port 5554 -Clip blender-opening
```

> The emulator path was verified on 2026-08-03 with two simultaneous headful API 35 x86_64 AVDs,
> recorded CameraX input and independent FPS smoke tests. Phone-only optics, drivers and
> performance still require a physical-device release check.

## The desktop pipeline

One CLI entry point: `chesslab <command>`. `uv run chesslab --help` lists all of it.

Semantic work profiling is opt-in and observational: it records repeated domain keys, bytes,
overlapping frame ranges and their call paths without enabling a cache or changing results.

```powershell
# Deterministic profiler self-test / budget fixture.
uv run chesslab perf fuzz --seed 847291 --frames 500 --board-revisions 2 --json data/reports/perf/fuzz.json

# Attach the same audit to a real instrumented command.
uv run chesslab --work-audit data/reports/perf/slice.json slice --all
```

The currently instrumented boundaries are FEN and legal-move generation, frame-scan grayscale
conversion, grid sweeps, settle video ranges, full-manifest rewrites, packed-index loads and the
two validation inference passes. The JSON report is intended for regression budgets as well as
human inspection; the audit never hashes full image arrays merely to recognize their revision.

### Where it all lands

**A recording is one folder, and everything that only says something about it lives inside.**
Derived things live outside and can be rebuilt.

| directory | holds |
|---|---|
| `data/recordings/<ts>/` | one recording, whole: the import (`candidate.json`, `files/`, `video.mp4`, `review/`, `review-extra/`), what was cut from it (`session.yaml`, `log.jsonl`, `boards/`, `dirty/`, `mattes/`, `matte.jsonl`, `quad-fit.json`) and its own `corrections.jsonl` |
| `data/sessions/` | sessions that are not recordings: what `chesslab ingest` imports |
| `data/crops/<tag>/` | a crop pool — the crops **and** its own `manifest.jsonl`. Default `crops/default` |
| `data/datasets/<name>/` · `data/models/<run>/` | packed snapshots · training runs |
| `data/calibration/` · `data/lens/` | board profiles · optical intrinsics |
| `data/footage/` · `data/occluders/` | raw video nothing writes (`turntable/`, `occluders/`, `phone-backups/`) · RGBA occluder tiles cut from it |
| `data/reports/` | machine output: `split.json`, `augment.yaml`, `hard_empty*.jsonl`, `audit-flags*`, `correction-violations.jsonl`, `perf/` |
| `data/labels/` | `review-notes.jsonl` and `_history/` — the verdicts that belong to no single recording |
| `data/inbox/` | the web app's runtime state |
| `data/_delete/` | retired material — moved, never deleted; the user deletes it themselves (`data/_delete/README.md`, [`docs/evaluation.md`](docs/evaluation.md)) |

A recording's **id** keeps the `rg-` prefix its directory dropped — the id is the join key in
every manifest row, and `sessions.session_dir()` is the one place that maps one to the other.
The details and the traps: [`docs/data-pipeline.md`](docs/data-pipeline.md) §1.1.

### Geometry: the board's own grid

`chesslab calibrate` models the **board** — where the 8×8 grid sits. There is no lens step: the
optics are measured from the footage itself when they are wanted at all, by
`android :desktop undistort`, which writes the model beside the frames as `lens.json`.

Python's `chesslab lens` went on 2026-08-21 with the whole `data/lens/calib.npz` path (1 159 lines
plus 713 of tests). It solved intrinsics from many board POSES, which a camera on a fixed mount
cannot supply — it refused for that reason and had never once run on this machine. What replaced it
is `calibration.LensModel.from_receipt`, thirteen lines that read Kotlin's `lens.json`.

Whether the optics are worth applying at all was settled by measurement, not by argument: in the
composed warp they take the residual bow from 1.91 px to 1.64 px on a 116 px cell, and a blind A/B
over five frames could not be told apart. The seam is there (`warp_padded(..., lens=)`), nothing
passes it. See `scripts/straighten_ab.py`.

ArUco markers are the board-geometry source and must stay on the board for the whole
recording, because calibration, import and slicing all self-calibrate **per frame** from
them. The saved profile is a seed, not the record.

```bash
uv run chesslab calibrate markers --out data/calibration/markers.png   # print, cut, tape to the corners
uv run chesslab calibrate list
```

`--margin` insets the playing-field box relative to the marker box, so the markers can sit
*next to* the field rather than on it. A crop is square — one cell (`board_size/8`) plus a
10 % margin on every side, letterboxed into a 128×128 `out_size` — and stays square so no
aspect distortion enters the training data. `--pad-up` extends the box upward for a strongly
oblique camera, where a tall 3D piece clips the top of the cell it stands on.

### Slice

Recording and labeling are separate steps so that labeling is reproducible: a session log
carries the board, the FEN and the corners that were correct for that frame; `slice` warps
from exactly those corners and can be re-run with different crop parameters without going
near a camera again.

```bash
uv run chesslab slice --all                                            # pure, no hardware needed
uv run chesslab slice --session <id> --pad-up 1.0 --out-size 128x128   # re-slice with new params
uv run chesslab slice --preview <id>                                   # label vs visible crop
```

Output is `data/crops/default/<class>/…webp` plus one manifest line per crop in that same pool's
`data/crops/default/manifest.jsonl` — a pool describes itself, and `--variant-tag X` puts both
under `data/crops/X/`.

The capture rig (`chesslab collect` and its OpenCV dashboard) was **deleted on 2026-08-20**:
every session now arrives from the phone tracker or from `chesslab ingest`. `SessionWriter`,
the one piece worth keeping, lives on in `src/chesslab/session_writer.py`.

### Datasets

```bash
uv run chesslab stats                                     # class distribution, light/dark coverage
uv run chesslab dataset build <name> --sessions s1,s2     # filter -> dedup -> split -> pack
uv run chesslab dataset build <name> --sessions s1,s2 --like <donor>   # --sessions is still required
uv run chesslab dataset build <name> --sessions s1,s2 --from-packs --pack-size 80x80  # cite data/packs/
uv run chesslab dataset list | verify | delete
uv run chesslab split --max-empty-ratio 1.5 --max-class-ratio 3        # the global, unnamed split
```

Splits are **per session** — frames from one session are near-identical, so a random split
leaks. `--classes` picks the class set and **defaults to `pieces13`**: 13 identities, with
occlusion carried as a measured per-crop `coverage` fraction instead of a class. The only other
mode is `pieces`, the historical 14, which exists to read old datasets — the 2-class `occupancy`
mode was deleted on 2026-08-20. `pieces13` DROPS `occluded` rows rather than re-binning them, and
no crop is ever re-labeled (`docs/class-scheme.md`). Perceptual-hash dedup and rotation are both **off** by default; the per-cell cap
(`--cap`, default 4) is what actually bounds "the piece never moved".

`--like <donor>` copies a donor dataset's session split, dedup policy and class balancing
verbatim. Use it for any build meant to be compared against a model trained on that donor: a
split is **not** reproducible from its own recorded parameters, and a near-twin is worse than
no twin. `CLAUDE.md` has the measurement behind that.

`--from-packs` builds from the session packs in `data/packs/` instead of a crop pool: the rows keep
their `mm://` paths, nothing is decoded, and the dataset is manifest + split only — no second copy
of the pixels. `--pack-size` then selects WHICH pack per session is taken; it never resizes one.
`docs/data-pipeline.md` §4.1 has the layout and the measured pool-vs-pack difference.

Synthetic renders have their own fused path that packs straight into the training memmap,
skipping crop PNGs entirely:

```bash
uv run chesslab dataset build-synth <name> --renders <dir> --cap 8
uv run chesslab ingest synthetic <dir> --tag check --limit 32 --debug-overlay 8 --no-build
```

Check the overlay first, always: a wrong a8-corner silently transposes every label. `synthetic`
is the only adapter left in the tree (`src/chesslab/ingest_adapters/`).

### Train, evaluate, export

Training defaults to `--low-memory`: packed images are read on demand with ordinary file I/O,
both training and validation use zero worker subprocesses, and pinned host memory and transfer
prefetching are disabled. This trades throughput for lower RAM pressure without reducing batch
size or the sampled dataset. It overrides worker/prefetch options; `--no-low-memory` restores
the throughput-oriented path. The effective settings are saved in the run's `config.json`.

`--ram-reserve-gb 4` checks available physical RAM before training and around each batch. Below
that reserve the run raises an error, preserving its last completed epoch's `state.pt`; free
memory and use the same recipe and output directory with `--continue` to resume. An unfinished
epoch is repeated. This is a sampled stop condition, not a hard OS memory limit or protection
against driver failures. `--ram-reserve-gb 0` explicitly disables monitoring. Monitoring supports
Windows and Linux; other systems require disabling it.

```bash
uv run chesslab train --dataset <name> --backbone smallcnn --epochs 30 --batch-size 256
uv run chesslab eval --run data/models/run-<ts> --split test
uv run chesslab export --run data/models/run-<ts> --format all --infer-size 96x96
uv run chesslab quantize --run data/models/run-<ts>          # INT8/QDQ ONNX for the Hexagon NPU
uv run chesslab reliance --run …                             # does it read the piece or the board?
```

`train` defaults to **`--head occlusion`**: one sigmoid beside the 13 classes, regressing the
fraction of the crop a hand covers — not a 14th class competing in the same softmax. Crops over
0.15 coverage are masked out of the classification term; `export` records the extra output as
`coverage_output: true`, so a consumer cannot softmax the coverage into the class probabilities.
Why it is an output and not a class: `docs/occluder-plates.md`; the whole history:
`docs/class-scheme.md`.

The checkpoint metric is **board accuracy** (all 64 squares right), not square accuracy,
which `empty` inflates. `--head` takes `occlusion` or `combined` — the decoupled and
hierarchical heads went with the bake-off. `--scales` trains one size-agnostic model for
several input resolutions.

`export` bakes the input resolution into the graph at the run's `infer_size` — set with
`--infer-size`, and distinct from `out_size`, which is the size the crops on disk were built
at. It must be one of the run's trained `scales`; an untrained size degrades silently rather
than failing. `model_card.json` carries the class list, sizes, normalization and metrics.

Several flags document a measured result in their own help text (`--input-repr`,
`--crop-norm`, `--phash`) — `--help` is the honest source for those. Read the pitfalls in
[`CLAUDE.md`](CLAUDE.md) before running a comparison; `val_acc` in particular has ranked runs
in reverse.

## The web UI

Being rebuilt. The FastAPI + React UI was deleted on 2026-08-07 together with the Python
tracker: everything it could still do that the CLI could not is now a command
(`chesslab session scan | autofix | adopt | flag | review | archive | restore | trim`),
except placing board corners by hand, which needs an image to click on and comes back with the
new one.

## Recordings from the phone, over Wi-Fi

`platform/app` takes the phone's recordings by itself: the tracker pushes a finished session to the
chesslab server on the same network, the files land where the USB tar used to put them
(`data/recordings/<name>/files/`), and `:desktop training-video-pack` is queued behind it (one worker).
Pair once with the token on `/transfers`, and see [`docs/phone-transfer.md`](docs/phone-transfer.md)
for the protocol, the firewall rule and what a skipped pack means.

## Sessions: geometry repair before slicing

`slice` warps every crop through the `corners` of its log row, so a session whose geometry is
off produces crops that straddle their grooves — the error that cost this corpus 5.5x its
empty-crop margin (`docs/data-pipeline.md` §12).

```bash
uv run chesslab session list
uv run chesslab session scan 20260731-102458      # worst square offset per frame
uv run chesslab session autofix 20260731-102458   # re-fit the frames that are off
uv run chesslab session adopt <sid>               # copy a detected quad into rows without one
uv run chesslab session flag <sid> 42             # exclude one frame from slicing
uv run chesslab session pack --session <sid> --size 80   # cut it ONCE into data/packs/<sid>-80/
uv run chesslab pack import <dir>                 # adopt a Kotlin labeled-video-pack
```

`session pack` is the alternative to slicing into the crop pool: one memmap per session, cut at
model size, immutable, and read by `dataset build --from-packs`. The 128 px pool stays the
labeling artefact (`docs/data-pipeline.md` §3.1 and §4.1).

`scan` measures, `autofix` repairs. Both refuse to touch a frame that is already within
tolerance — inside the noise band the fit chases its own noise — and `autofix` discards any
correction that does not improve its own frame. Repaired rows are marked `auto-corrected`, so
measured and computed geometry stay distinguishable afterwards.

## Development

```bash
uv run pytest -q                                   # no GPU or camera needed
uv run ruff check src tests synth scripts
uv run vulture
```

All three must be green. Frontend: `npm run lint`, `npm run knip`, `npx tsc --noEmit`,
`npm test` and `npm run build` in `platform/app`. Android: see the gate above.

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs three jobs on every push and PR:
`python-lint` (ruff over `src tests scripts synth`, format check reporting only), `web`
(`platform/app`: tsc, vitest, build) and `kotlin` (test + ktlint + detekt on the five JVM
modules; `:app` needs the NDK and stays a local build). There is deliberately **no Python test
job** — `pyproject.toml` pins torch to local wheels under a gitignored `wheels/`, so `uv sync`
cannot run on a Linux runner at all. Run `pytest` locally; the file's header says what would
have to change.

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

The **ChessReD** (CC-BY-4.0) and **chesscog** ingest adapters were removed on 2026-08-20;
neither dataset was ever distributed here.

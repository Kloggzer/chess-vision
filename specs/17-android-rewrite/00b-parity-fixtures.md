# Phase 00b — parity fixtures: golden traces generated from the real Python tracker

## Why

Nothing in the legacy port ever proved that a single one of the ~40 live-tuned thresholds
behaves like Python. This phase produces the ground truth every later phase is tested
against: for recorded clips, the exact per-frame values of Python's primitives (Tier A) and
the exact per-frame `_try_detect` outcome (Tier B), emitted as committed fixture files that
`:core-engine` tests replay on the desktop JVM.

The generator must drive the **real** `MoveTracker` — not a reimplementation — so the
fixtures are the Python behaviour by construction.

## Design (decided — do not redesign)

### Driving the tracker

`scripts/replay_clip.py::replay` (`:49-166`) starts the tracker **thread** and polls
`status()` on wall-clock — nondeterministic and frame-lossy. **Do not use it.** Reuse only
its temp-profile construction (`replay_clip.py:66-90`: `CalibrationProfile` +
`compute_homography(corners, target, 0.0)` + `CropParams.default(target)`, `white_pov=True`,
`live_align=False`) and its manifest contract (`tests/data/testclips/manifest.yaml`:
`file`, `start_fen`, `corners`, `frame_size`, `board_size`, per-clip `tracker:` kwargs,
`moves_uci`, `erwartete_zugliste`).

The emitter steps synchronously:

1. Build the temp profile from the manifest entry; construct
   `MoveTracker(profile=…, source="0", live_align=False, cnn_run=None, auto_record=False,
   **entry["tracker"])`; `mt.reset_to_start(entry["start_fen"])`. **Never** call `mt.start()`.
2. Decode the clip with `cv2.VideoCapture`, frame by frame.
3. Per frame reproduce the pre-detection steps of `_loop` (`tracker.py:1490-1763`) in the
   same order — warp (`_warp` `:946`), gray (`_gray` `:1008`), `motion_score` (`:358`),
   `_last_motion_ts` update, the `_baseline_occlusion_and_shadow` (`:386`) state gate at
   `:1611-1637`, frame averaging — then call `mt._try_detect(gray, warped, seq)`.
   Read `_loop` and mirror it; anything it does that cannot be reproduced synchronously
   (camera reconnect, CNN worker thread, recorder) is **skipped** and listed in `STATUS.md`.
4. `promotion_pending` is answered immediately with the promotion piece derived from the
   manifest's `moves_uci` (5-char UCI suffix, default `q`) — same rule as `tests/test_clips.py:41`.

### Determinism (binding)

- **Virtual clock.** `tracker.py` calls `time.time()` for taint expiry, motion recency and
  hold windows. Rebind the module's clock: `trk.time = _VirtualClock(fps)` — a shim exposing
  `time()`, `monotonic()`, `perf_counter()` and a no-op `sleep()`, advancing exactly `1/fps`
  per emitted frame and starting at `1_700_000_000.0`. Restore the real module in a `finally`.
  Without this the fixtures are not byte-stable and `stageTimingsMs` leaks wall-clock.
- JSON: `json.dump(obj, f, sort_keys=True, separators=(",", ":"))` + one trailing `"\n"`.
  All floats through `round(x, 6)`; all sets emitted as **sorted lists**; dict keys are
  square names (`a1`..`h8`) sorted lexicographically. No timestamps, no paths, no PIDs
  anywhere in the output (the temp profile name contains a PID — never emit it).
- Re-running the script over an unchanged repo must leave `git status` clean. That is an
  acceptance criterion.

### Output layout

```
android/core-engine/src/test/resources/parity/<clip>/
  meta.json
  frames/0000.json … frames/NNNN.json
  planes/0000.gray.bin.gz     detSize * detSize bytes, row-major, stride == detSize
  planes/0000.bgr.bin.gz      detSize * detSize * 3 bytes, interleaved BGR, stride == detSize*3
  natives/…                   Tier C only (see below)
```

`<clip>` = the clip file stem (`blender-opening`, …). Frame index `%04d` is the **video
frame number**, not a counter — subsampling leaves gaps, and the gaps must be visible.
Planes carry **no header**: dimensions are constant per clip and live in `meta.json`.
Gzip level 6, `mtime=0` in the gzip header (`gzip.GzipFile(..., mtime=0)`) — otherwise the
bytes change every run.

`meta.json`:

```json
{
  "boardSize": 640,
  "censusZWeight": 1.0,
  "channelsBgr": 3,
  "clip": "blender-opening",
  "detSize": 320,
  "fps": 30.0,
  "frames": [0, 5, 10, 34, 35, 36],
  "movesUci": ["d2d4", "e7e5", "b1c3"],
  "requiresNatives": false,
  "startFen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "trackerKwargs": {"census_thr": 40.0, "confirm_frames": 2, "min_grid_line_coverage": 0.0, "overhang": 0.0},
  "whitePov": true
}
```

### Frame JSON schema

One file per emitted frame; `tierA` and `tierB` are always both present.

```json
{
  "frame": 35,
  "seq": 35,
  "tierA": {
    "perSquareDiff": {"a1": 0.412, "a2": 0.0},
    "normalizedDiffs": {"a1": 0.0, "e2": 31.884},
    "censusRaw": {"a1": 1.992, "e2": 78.75},
    "censusNormalized": {"a1": 0.0, "e2": 76.758},
    "censusCodeCrop": {"x0": 120, "y0": 200, "w": 16, "h": 16,
                       "codes": [0, 3, 255, 128]},
    "noiseMean": {"a1": 0.31},
    "noiseStd": {"a1": 3.0},
    "noiseZ": {"a1": -0.103, "e2": 10.628},
    "censusNoiseMean": {"a1": 0.12},
    "censusNoiseStd": {"a1": 3.0},
    "zFused": {"a1": -0.103, "e2": 10.628},
    "hsvShadowSquares": ["d3"],
    "gamut": {"mu": [128.1, 132.4, 41.9],
              "inv": [[0.031, -0.002, 0.0], [-0.002, 0.028, 0.001], [0.0, 0.001, 0.004]],
              "feats": [[127.0, 131.5, 40.2]]},
    "occlusionColorSquares": ["e2"],
    "motionScore": 0.417,
    "baselineOcclusion": {"occludedDilated": ["e2", "e3"], "shadowDilated": ["d3"],
                          "core": ["e2"]},
    "loglikScores": [["e2e4", 12.4], ["d2d4", -8.1]],
    "loglikPairScores": [[["e2e4", "e7e5"], 18.2]],
    "movePrior": {"e2e4": 0.2, "g1f3": 0.2},
    "moveTouchedSquares": {"e2e4": ["e2", "e4"], "e1g1": ["e1", "f1", "g1", "h1"]},
    "moveDestinationSquares": {"e2e4": ["e4"], "e1g1": ["f1", "g1"]},
    "squareRegion": {"a1": [7, 287, 33, 313], "h8": [287, 7, 313, 33]},
    "squareToCropBox": {"a1": [0, 1280, 200, 1480]}
  },
  "tierB": {
    "state": "waiting",
    "changed": ["e2", "e4"],
    "shadowVeto": ["d3"],
    "occlusionVetoed": ["e2"],
    "tainted": [],
    "bestLl": 12.4, "secondLl": -8.1,
    "bestUci": "e2e4", "candidateUci": "e2e4",
    "stuckReason": null,
    "confirmerKey": "e2e4", "confirmerCount": 1,
    "commit": {"uci": "e2e4", "san": "e4",
               "fenAfter": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
               "decider": "diff"},
    "note": null
  }
}
```

Rules for the schema:

- `commit` is `null` on frames that commit nothing; a multi-move commit uses
  `{"ucis": [...], "sans": [...], "fenAfter": …, "decider": …}` instead.
- `censusCodeCrop` dumps `census_transform` (`:192`) output for **one fixed 16×16 crop**
  per clip (top-left corner = `square_region("e2", detSize, whitePov)[0:2]`) — enough to
  prove bit order, replicate padding and `eps == 0` without dumping a full plane.
- `gamut` is emitted only on frames where the reference changed (`board_color_gamut` `:284`
  is recomputed there); otherwise `null` — it is ~64×3 floats.
- `squareRegion` / `squareToCropBox` are emitted **once**, on the first frame only, for all
  64 squares (`null` afterwards). `square_region` `:119` at `detSize` with
  `extend_up = overhang`; `square_to_crop_box` from `src/chesslab/calibration.py:347` at the
  full board size (crop warp), paired with `crop_border_px` (`calibration.py:384`) in `meta.json`.
- `loglikScores` / `loglikPairScores` are truncated to the **top 12** entries (sorted
  descending as Python returns them); ties keep Python's order.
- `movePrior` / `moveTouchedSquares` / `moveDestinationSquares` cover all legal moves of the
  current position.
- `noise*` are the `SquareNoise` (`:500`) mean/std **after** that frame's `update`, so a
  replay that mis-orders learning versus scoring diverges immediately. Also emit
  `noiseZ` = `noise.z(normalizedDiffs)` before the update.

### Tiers

- **Tier A** — the pure primitives listed above (`per_square_diff` `:139`,
  `census_transform` `:192`, `per_square_census_change` `:220`, `normalize_diffs` `:487`,
  `SquareNoise` `:500`, `hsv_shadow_squares` `:257`, `board_color_gamut` `:284`,
  `occlusion_color_squares` `:322`, `motion_score` `:358`,
  `_baseline_occlusion_and_shadow` `:386` — **all three returns, including the raw
  undilated core**, `loglik_scores` `:544`, `loglik_pair_scores` `:563`, `move_prior` `:597`,
  `move_touched_squares` `:456`, `move_destination_squares` `:474`, `square_region` `:119`,
  `square_to_crop_box`). Inputs are the committed planes → no natives needed to consume.
- **Tier B** — the `_try_detect` (`:2834-3058`) outcome, read off the tracker after the
  call: `mt.state`, `mt._changed`, `mt._shadow_vetoed`, `mt._occluded_vetoed`,
  `sorted(mt._tainted)`, `mt._best_score`, `mt._second_score`, `mt._candidate_uci`,
  `mt._stuck_reason`, `mt._confirmer._cand` (key + count; `Confirmer` `:639`), the
  `mt.history` delta (→ `commit`) and `mt.note`. Kotlin replays the **same planes** and must
  produce the identical sequence over the whole clip — Tier B is a whole-clip equality test,
  not a per-frame spot check.
- **Tier C** — everything that needs natives on the Kotlin side: source-frame → warp
  (`_warp` `:946`, homography + `cv2.warpPerspective`), CLAHE + blur (`_gray` `:1008`),
  grid-line coverage (`_grid_line_coverage` `:1293`), and the bordered crop warp. Emit to
  `parity/<clip>/natives/` with `meta.json → "requiresNatives": true`, one source JPEG
  (`sourceNNNN.jpg`, quality 92) + the corners + the expected gray/bgr planes. Tiers A and B
  **must be consumable without JavaCV** — they are `:core-engine`'s tests; Tier C is
  `:core-geometry`'s (phase 02b).

### Size budget

Planes dominate: at `detSize = 320` a frame is 102 400 B gray + 307 200 B bgr raw.
**Hard cap: 40 MB for `parity/` in total.** Sampling rule (constants at the top of the
script): every frame in `[move_frame − 10, move_frame + 10]` for each move, plus every 5th
frame elsewhere; move frames come from the tracker's own commits during the emitting run
(first pass records commit frames, second pass emits). If a clip still exceeds its share,
drop the `bgr` plane on non-move frames (`meta.json → "framesWithBgr"` lists which frames
have one) before dropping frames.

The script **prints** `total: <bytes> (<MB>) over <n> clips` at the end and exits `2` with
a loud message if the total exceeds 40 MB.

### CLI

```
uv run python scripts/emit_parity_fixtures.py --clip blender-opening \
    --out android/core-engine/src/test/resources/parity
uv run python scripts/emit_parity_fixtures.py --all --out android/core-engine/src/test/resources/parity
```

`--clip` may be repeated. `--all` = every entry in `tests/data/testclips/manifest.yaml`
whose `file` exists (20 clips today: `blender-{capture,castle,enpassant,hover,illegal,
italian,jitter,nudge,opening,opera,phantom,promocapture,promotion,queenside,resting,
scholars,shadowsweep,stalemate,takeback,underpromo}`). `--out` is required (no default that
could write outside the repo). Each clip's output directory is wiped before writing so a
shrinking sample set leaves no stale files.

Emit **`--all`** and commit the result. If the budget forces a subset, the committed subset
must contain at least: `opening`, `capture`, `castle`, `queenside`, `enpassant`, `promotion`,
`underpromo`, `takeback`, `phantom`, `illegal`, `hover`, `shadowsweep`, `resting` — the
clips that exercise the veto and alarm paths.

### Kotlin loader (owned by this phase)

`android/core-engine/src/test/kotlin/com/chesslab/engine/parity/ParityFixtures.kt`:

```kotlin
class ParityClip(val name: String) {
    val meta: ParityMeta
    val frames: List<ParityFrame>            // ascending by frame index
    fun gray(frame: Int): GrayImage          // gunzips planes/<NNNN>.gray.bin.gz
    fun bgr(frame: Int): BgrImage?           // null when the frame has no bgr plane
}
object ParityFixtures {
    fun clips(): List<String>                // directory names under /parity
    fun load(name: String): ParityClip
}
```

Loads from the **test classpath** (`javaClass.getResourceAsStream("/parity/…")`), parses
with `kotlinx.serialization.json` (test-scope dependency added by 00a), gunzips with
`java.util.zip.GZIPInputStream`. No file-system paths, no `File(".."`)`. Also provide the
tolerance helpers used by every later phase:

```kotlin
fun assertClose(expected: Double, actual: Double, what: String)                 // 1e-4 relative
fun assertCloseMap(expected: Map<String, Double>, actual: Map<String, Double>, what: String)
fun assertExact(expected: Set<String>, actual: Set<String>, what: String)
```

**Tolerance contract (binding for all later phases):** floats compare at
`abs(e - a) <= 1e-4 * max(1.0, abs(e))` — relative, with an absolute floor of 1e-4 so
near-zero values do not require exact bits. **Everything else is EXACT**: every set
(`changed`, `shadowVeto`, `tainted`, occlusion sets), every decision string (state, UCI,
SAN, FEN, stuck reason, decider), every count. A tolerance may never be loosened to make a
test pass — a mismatch is a port bug or a `STATUS.md` discrepancy.

Ship one smoke test, `ParityFixturesTest`, that loads every clip, asserts `frames` is
non-empty and ascending, and that `gray(f).data.size == meta.detSize * meta.detSize` for
the first frame. It must **not** assert engine behaviour — `TrackerEngine` is still `TODO()`.

## Steps

### 1. `scripts/emit_parity_fixtures.py` — commit `feat(parity): golden-fixture emitter driving the real python MoveTracker`
Synchronous driver, virtual clock, Tier A + Tier B, plane dumps, budget check, CLI.

### 2. Tier C — commit `feat(parity): tier-c native fixtures (warp, clahe, grid coverage)`
`natives/` output behind `--tier-c` (default on for `--all`), `requiresNatives` in `meta.json`.

### 3. Emit and commit the fixtures — commit `test(parity): committed golden fixtures for the blender testclips`
`uv run python scripts/emit_parity_fixtures.py --all --out android/core-engine/src/test/resources/parity`

### 4. Kotlin loader — commit `test(android-engine): parity fixture loader + tolerance contract`
`ParityFixtures.kt` + `ParityFixturesTest.kt`.

## Tests

```
uv run ruff check scripts/emit_parity_fixtures.py
uv run python scripts/emit_parity_fixtures.py --clip blender-opening --out <tmp>   # twice, diff must be empty
```
PowerShell, from `android/`: `.\gradlew.bat :core-engine:test --tests "com.chesslab.engine.parity.ParityFixturesTest"`

## Acceptance criteria

- `uv run ruff check scripts/emit_parity_fixtures.py` clean.
- Re-running `--all` leaves `git status --porcelain android/core-engine/src/test/resources/parity` **empty** (byte-stability).
- The script's final line matches `^total: \d+ bytes` and the total is `<= 41943040`; the
  checked-in tree satisfies
  `(Get-ChildItem -Recurse android/core-engine/src/test/resources/parity | Measure-Object Length -Sum).Sum -le 41943040`.
- Every emitted `frames/*.json` has non-null `tierA.perSquareDiff` (64 keys) and a `tierB.state`
  in `waiting|moving|occluded|move`.
- `Select-String -Pattern '"core"' android/core-engine/src/test/resources/parity/blender-opening/frames/*.json`
  hits (invariant 3: the raw undilated occlusion core is in the fixtures).
- At least one clip fixture contains a `tierB.commit` whose `san` sequence equals the
  manifest's `erwartete_zugliste` for that clip — assert this inside the emitter and fail
  loudly if a clip replays to a different move list than `tests/test_clips.py` expects.
- `ParityFixturesTest` green; `:core-engine:ktlintCheck` and `:core-engine:detekt` clean.
- `grep -c "1e-4" ParityFixtures.kt` ≥ 1 and the file defines `assertClose`, `assertCloseMap`, `assertExact`.

## Files you own

- `scripts/emit_parity_fixtures.py` (the **only** permitted file outside `android/` in this pack)
- `android/core-engine/src/test/resources/parity/**` (generated)
- `android/core-engine/src/test/kotlin/com/chesslab/engine/parity/ParityFixtures.kt`
- `android/core-engine/src/test/kotlin/com/chesslab/engine/parity/ParityFixturesTest.kt`

## Do NOT

- Do NOT modify anything under `src/chesslab/**`, `tests/**`, `scripts/replay_clip.py`, or
  `tests/data/testclips/**` — the Python side is frozen; import from it, never patch it
  (the virtual clock is rebound at runtime inside the script, not edited into `tracker.py`).
- Do NOT edit `android/core-engine/build.gradle.kts` (00a owns it, including the
  `kotlinx-serialization-json` test dependency). Missing dependency → blocker in `STATUS.md`.
- Do NOT use `replay_clip.replay()` or `mt.start()` — threads make the output nondeterministic.
- Do NOT reimplement any primitive in Python "to make it cleaner": call the real functions.
- Do NOT emit wall-clock times, absolute paths, PIDs, or unsorted sets.
- Do NOT add JavaCV, OpenCV or any image library to `:core-engine` tests — Tier A/B must run
  on planes alone.
- Do NOT implement or test `TrackerEngine` here.

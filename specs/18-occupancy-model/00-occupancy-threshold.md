# Phase 00 — the occupancy decision threshold (no training)

> Python: `src/chesslab/move_tracker/cnn_recovery.py::OccupancyObservation.occupied` `:43`
> and `observation_from_probs` `:63`. Kotlin mirror:
> `android/core-cnn/src/main/kotlin/com/chesslab/cnn/OccupancyObservation.kt`,
> `Observations.kt`. Read both, and read entry.md's *measured context* section, before
> writing a line of code.
>
> **This phase needs no GPU and trains nothing.** It costs one code change on each side and
> a handful of harness runs. It runs FIRST because its output — the miss/phantom curve — is
> what tells phase 02 what to optimise, and because it may recover a meaningful share of the
> 8 826 misses for free.

## Why

`occupied(sq)` is `p_occ > p_empty` — an implicit, hard-coded **0.5** decision threshold that
nobody ever chose. It is the single line that converts a probability vector into the boolean
the entire tracker runs on, and it is currently tuned for symmetric cost.

The cost is **not** symmetric, and the measurement says so twice over:

- **The errors are asymmetric.** 8 826 misses vs 226 phantoms — a piece read as empty is
  **39× more likely** than an empty square read as occupied. Lowering the threshold trades
  along exactly that axis: it buys back misses at the cost of phantoms, and phantoms are the
  rare direction.
- **The consequences are asymmetric.** A **miss** causes SILENT degradation: S17-SIM-1 —
  `resync_check` matches vacuously because the model still reads the vacated square as
  occupied or the destination as empty, `CnnTick.onMatchOk` pulls the reference forward, and
  a real move is baked into the base truth with no user-visible signal at all. A **phantom**
  causes VISIBLE desync: it trips the `cnn_desync` conflict, and since the *"Veto escalation"*
  change (2026-07-25) a persistent conflict now escalates to the **illegal-move alarm** —
  a red board and a user-releasable state. Trading a silent failure for a loud one is
  strictly the right direction.

So: make the threshold a knob, sweep it on the instrument, and pick a value on evidence.

## Files you own

| File | Contains |
|---|---|
| `src/chesslab/config.py` | `TRACK_DEFAULTS["occupancy_thr"]` (one entry + its comment) |
| `src/chesslab/move_tracker/cnn_recovery.py` | `OccupancyObservation.occupancy_thr`, the generalised `occupied`, the `observation_from_probs` parameter, `CnnRecovery` plumbing |
| `src/chesslab/move_tracker/tracker.py` | **only** the constructor kwarg + the one line that hands `occupancy_thr` to `CnnRecovery` |
| `tests/test_move_tracker.py` | the new threshold tests (append; do not restructure the file) |
| `scripts/sweep_occupancy_thr.py` | the Python-side sweep driver |
| `android/core-engine/src/main/kotlin/com/chesslab/engine/api/TrackerConfig.kt` | `occupancyThr` (one field) |
| `android/core-cnn/src/main/kotlin/com/chesslab/cnn/OccupancyObservation.kt` | `occupancyThr` field + generalised `occupied` |
| `android/core-cnn/src/main/kotlin/com/chesslab/cnn/Observations.kt` | `observationFromProbs` parameter |
| `android/core-cnn/src/main/kotlin/com/chesslab/cnn/CnnConfig.kt` | `occupancyThr` (one field) |
| `android/app/src/main/kotlin/com/chesslab/tracker/cnn/CnnObserver.kt` | pass the configured threshold at `:161` |
| `android/app/src/test/kotlin/com/chesslab/tracker/sim/SimClips.kt` | read `-Pchesslab.sim.occthr` |
| `android/app/src/test/kotlin/com/chesslab/tracker/sim/CnnClipSimulationTest.kt` | sweep loop + per-tau report |
| `android/core-cnn/src/test/kotlin/com/chesslab/cnn/OccupancyThresholdTest.kt` | new test class |
| `specs/17-android-rewrite/entry.md` | seam block: the one new `TrackerConfig` line (sanctioned edit, entry.md constraint 2) |
| `specs/17-android-rewrite/STATUS.md` | one discrepancy note recording the seam addition |
| `specs/18-occupancy-model/STATUS.md` | your row + the sweep table |

You own **nothing else**. In particular: no engine file, no verify/recovery/alarm file, no
dataset or training file, and nothing under `tests/data/testclips/` or
`core-engine/src/test/resources/parity/`.

## Design (decided — do not redesign)

### The generalised decision rule

```python
occupied(sq)  ⇔  p_occ[sq] / (p_occ[sq] + p_empty[sq])  >  occupancy_thr
```

with `occupied(sq) = False` when `p_occ + p_empty == 0` (the degenerate all-occluded case;
`confident()` already refuses to trust such a square).

Three properties make this the chosen form and not a matter of taste:

1. **`occupancy_thr = 0.5` reproduces today's behaviour exactly.** For non-negative masses
   with a positive sum, `p_occ / (p_occ + p_empty) > 0.5 ⇔ p_occ > p_empty`. The default is
   therefore a no-op and every existing test stays green without edits. **This is a hard
   requirement**: if any existing test changes behaviour at 0.5, the implementation is wrong.
2. **It renormalises over the 2-way mass.** `p_occluded` steals probability mass
   (`observation_from_probs` `:79`: `p_occ = max(0, 1 - p_empty - p_occluded)`). Comparing a
   raw `p_occ` against a fixed tau would make the threshold silently interact with how
   occluded-ish the square looks — a hand over the board would drift the decision. Dividing
   by `p_occ + p_empty` keeps tau a pure *empty-vs-occupied* trade-off, orthogonal to
   occlusion.
3. **Lowering tau means "occupied wins ties more easily".** tau < 0.5 recovers misses and
   admits phantoms; tau > 0.5 does the reverse. Direction is fixed and must be stated in the
   knob's comment so nobody later "fixes" the sign.

### Where the threshold lives

The threshold is a property of the **observation**, not of each call site. `obs.occupied(sq)`
is called from a dozen places in `cnn_recovery.py`, `tracker.py` and the Kotlin engine
(through the frozen `CnnObservation` seam, whose signature is
`fun occupied(square: String): Boolean`). **Do not change that signature** — that seam is
frozen by `specs/17-android-rewrite/entry.md` and changing it would touch phases 03/04's
files.

Instead:

```python
@dataclass(frozen=True)
class OccupancyObservation:
    p_occ: dict[str, float]
    p_empty: dict[str, float]
    p_occluded: dict[str, float]
    label: dict[str, str] | None = None
    conf: dict[str, float] | None = None
    occupancy_thr: float = 0.5          # NEW — the empty-vs-occupied decision point
```

`observation_from_probs(per_square_probs, classes, occupancy_thr=0.5)` sets it.
`CnnRecovery.__init__` takes `occupancy_thr` and passes it at the one construction site
(`cnn_recovery.py:156`). `MoveTracker` takes it from `TRACK_DEFAULTS` and hands it to
`CnnRecovery`. `occupancy_only()` / `copy()` must **preserve** it (a `dataclasses.replace`
keeps it automatically — verify, don't assume).

Kotlin mirrors this exactly: `OccupancyObservation(..., val occupancyThr: Double = 0.5)`,
`observationFromProbs(..., occupancyThr: Double = 0.5)`, `CnnConfig.occupancyThr`,
`TrackerConfig.occupancyThr`, and `CnnObserver.kt:161` passes the configured value.
`occupancyOnly()` uses `copy(label = null, conf = null)` and therefore already preserves it.

### The knob

`src/chesslab/config.py`, in `TRACK_DEFAULTS`:

```python
"occupancy_thr": 0.5,          # empty-vs-occupied decision point on the RENORMALIZED 2-way
                               # mass: occupied ⇔ p_occ/(p_occ+p_empty) > thr. 0.5 == the
                               # historic implicit rule (p_occ > p_empty). LOWER = more
                               # squares read occupied: buys back MISSES (piece read empty,
                               # 8826 in the 2026-07-25 clip audit) at the price of PHANTOMS
                               # (empty read occupied, 226). Misses degrade the tracker
                               # SILENTLY (a move baked into the reference, S17-SIM-1);
                               # phantoms now escalate to the visible illegal-move alarm.
```

Mirror into `TrackerConfig.kt` as `val occupancyThr: Double = 0.5,` with a one-line comment
pointing back at `config.py`, and add the same line to
`specs/17-android-rewrite/entry.md`'s seam block. Copy the default **verbatim**.

### `ClipReplayParityTest` cannot move — say so, then verify it

The 969 committed parity frames were emitted with `cnn_run=None`
(`scripts/emit_parity_fixtures.py:262`). No `CnnSnapshot` is ever produced in that replay, so
no `OccupancyObservation` is ever constructed, so `occupancyThr` is unreachable code on that
path — at **any** value of tau. The parity test is structurally immune to this phase.
Run it anyway once at the end, at the default, and record **18/18 clips, zero diverging
frames** in `STATUS.md`. If it moves, you changed something you do not own.

### The sweep

**Kotlin (primary — this is the instrument).** Extend the harness to loop over a tau list:

```
cd android
.\gradlew.bat :app:testDebugUnitTest -Pchesslab.sim=true `
  -Pchesslab.sim.occthr=0.50,0.45,0.40,0.35,0.30,0.25,0.20 `
  --tests "com.chesslab.tracker.sim.*"
```

Mirror `simModels()`'s existing property handling (`SimClips.kt:47`): parse the comma list,
default to the single value `[0.50]` when the property is absent, so an ordinary harness run
is unchanged. The diff-only baseline is model- **and** tau-independent and is still replayed
**once**.

For each tau the run reports, per model:

| column | source |
|---|---|
| clips passing (`n/18`) | the existing per-clip move-list comparison |
| misses | `ObsAudit` (ungated, all 64 squares × all clear observations) |
| phantoms | `ObsAudit` |
| confident-occupancy error % | `ObsAudit` |
| perfect boards | `ObsAudit` |
| top-8 offending squares | `ObsAudit` |
| alarms raised | the run's event stream |
| phantom-overrule commits | the run's committed-move provenance |

`ObsAudit.add` already counts misses and phantoms separately and already comments *why* the
direction matters — do not rewrite it, just make sure the per-tau results are keyed and
printed as a table rather than overwriting each other.

**Python (the source-of-truth cross-check).** `scripts/sweep_occupancy_thr.py` drives
`scripts/replay_clip.py::replay` with `cnn_run="tiny-p3"` over the **four CNN-regressed
clips** (`blender-promotion`, `blender-underpromo`, `blender-stalemate`, `blender-queenside`)
plus two known-good controls (`blender-opening`, `blender-capture`) at each tau, and prints
the committed move list per clip. Its job is not to reproduce the Kotlin numbers — the Python
replay is wall-clock paced and cannot (see STATUS *"Not reproduced identically"*) — but to
prove the knob has the **same direction and the same decisions** on both sides. **Warm the
model first**: the first inference of a fresh process costs ~2.1 s and starves the observer
for ~25 frames, which changes clip outcomes. Do a throwaway `replay` (or a dummy forward
pass) before the measured runs, and say in the script's docstring why.

### Picking a value — the decision rule

Choose on the reported evidence, in this priority order:

1. **Clip pass rate must not fall.** The current CNN-attached rate is 14/18. A tau that drops
   below it is rejected outright, whatever it does to the raw counts.
2. Among the taus that hold or beat 14/18, prefer the one with the **lowest miss count**.
3. Break ties by the **smaller phantom count**, then by the **larger perfect-board count**.
4. **Reject any tau that produces a phantom-overrule commit.** The *"Veto escalation"* change
   deliberately drove that number to 0 across all 18 clips; re-introducing a fabricated move
   is a regression even if the pass rate looks better. Failing by omission beats failing by
   fabrication.
5. If **no** tau beats 0.50 on any axis, **keep 0.50** and say so. A null result here is a
   real and valuable finding: it means the miss is not a thresholding problem but a
   representation problem, and it is the strongest possible argument for spending the GPU
   time in phase 02. Record it in that language.

Whatever you pick becomes the new `TRACK_DEFAULTS` default on **both** sides, with the
measured table in `STATUS.md` next to it.

## Steps

### 1. Python knob + generalised rule — commit `feat(tracker): tunable occupancy decision threshold (occupancy_thr)`
`config.py` entry; `OccupancyObservation.occupancy_thr` + generalised `occupied`;
`observation_from_probs` parameter; `CnnRecovery.__init__` plumbing; the single `tracker.py`
line that passes it. No call-site signature changes anywhere.

### 2. Python tests — commit `test(tracker): occupancy_thr default is a no-op; direction and degenerate mass`

### 3. Python sweep driver — commit `feat(scripts): sweep occupancy_thr over the CNN-regressed clips`

### 4. Kotlin port — commit `feat(android-cnn): mirror occupancy_thr in TrackerConfig/CnnConfig/OccupancyObservation`
Including the `TrackerConfig` seam line, the `specs/17-android-rewrite/entry.md` seam-block
update and the `specs/17-android-rewrite/STATUS.md` discrepancy note.

### 5. Harness sweep — commit `test(android): clip harness sweeps occupancy_thr and reports miss/phantom per tau`

### 6. Adopt the measured default — commit `feat(tracker): adopt occupancy_thr=<value> measured on the clip harness`
**Only if step 5's evidence supports it.** If the evidence says keep 0.5, this step is a
STATUS entry and no commit.

## Tests

**Python** (`tests/test_move_tracker.py`, appended):

| Test | Guards |
|---|---|
| `test_occupancy_thr_default_reproduces_strict_comparison` | For a grid of `(p_occ, p_empty)` pairs including exact ties and zeros, `occupied()` at `thr=0.5` equals `p_occ > p_empty` **exactly**. The no-op requirement. |
| `test_occupancy_thr_lower_recovers_missed_piece` | A square at `p_occ=0.40, p_empty=0.55` reads empty at 0.5 and **occupied** at 0.35. Direction. |
| `test_occupancy_thr_higher_suppresses_weak_occupied` | `p_occ=0.55, p_empty=0.45` reads occupied at 0.5, **empty** at 0.65. Direction, other way. |
| `test_occupancy_thr_ignores_occluded_mass` | Two observations with identical `p_occ:p_empty` ratio but very different `p_occluded` decide **identically**. The renormalisation requirement. |
| `test_occupancy_thr_degenerate_mass_is_not_occupied` | `p_occ = p_empty = 0.0` → `occupied()` is `False`, no `ZeroDivisionError`. |
| `test_occupancy_thr_survives_occupancy_only` | `obs.occupancy_only()` keeps the threshold. |

Run scoped: `uv run pytest -q tests/test_move_tracker.py -k occupancy_thr`.

**Kotlin** (`android/core-cnn/src/test/kotlin/com/chesslab/cnn/OccupancyThresholdTest.kt`):
mirror all six by name (`defaultReproducesStrictComparison`, `lowerRecoversMissedPiece`,
`higherSuppressesWeakOccupied`, `ignoresOccludedMass`, `degenerateMassIsNotOccupied`,
`survivesOccupancyOnly`) — the two implementations must be provably the same function.

`.\gradlew.bat :core-cnn:testDebugUnitTest --tests "com.chesslab.cnn.OccupancyThresholdTest"`

**Regression floors, run once each at the end, at the adopted default:**
`.\gradlew.bat :core-engine:test` (must include `ClipReplayParityTest` at 18/18, zero
diverging frames) and `uv run pytest -q`.

## Acceptance criteria

- `grep -n "occupancy_thr" src/chesslab/config.py` hits inside `TRACK_DEFAULTS`.
- `grep -rn "occupancy_thr" src/chesslab/move_tracker/cnn_recovery.py` hits ≥ 3
  (dataclass field, `occupied`, `observation_from_probs`).
- `grep -n "occupancyThr" android/core-engine/src/main/kotlin/com/chesslab/engine/api/TrackerConfig.kt` hits.
- `grep -n "occupancyThr" specs/17-android-rewrite/entry.md` hits (the seam block was kept
  accurate).
- `grep -rn "occupied(square: String): Boolean" android/core-engine/src/main/kotlin/com/chesslab/engine/api/CnnObservation.kt`
  still hits **unchanged** — the frozen seam signature was not touched.
- All 6 Python tests and all 6 Kotlin tests green.
- `uv run pytest -q` green apart from the 3 pre-existing `tests/test_camera.py` failures;
  `uv run ruff check src tests scripts` clean.
- `.\gradlew.bat :core-engine:test` green, **`ClipReplayParityTest` 18/18 clips, zero
  diverging frames**, recorded verbatim in `STATUS.md`.
- `:core-cnn:ktlintFormat` then `:core-cnn:detekt`, and the same for `:app`, clean.
- **`STATUS.md` carries the sweep table** — one row per tau with clips passing, misses,
  phantoms, confident-occupancy error %, perfect boards, alarms, phantom-overrule commits —
  and one sentence naming the adopted tau **and the rule from the Design section that
  selected it**. A table without a stated selection rule is not acceptance.
- Every number quoted in `STATUS.md` is accompanied by the pessimistic-lower-bound sentence
  (~31 px/square on the clips vs ~112 px/square from a phone at 1080p).

## Do NOT

- Do NOT change `CnnObservation.occupied`'s signature, or any other member of the frozen
  engine seam. The threshold rides on the observation, not on the call.
- Do NOT apply the threshold to `confident()`. `cnn_conf_thr` (0.85) is a *reliability* gate
  and is a separate, already-tuned knob; conflating the two would change the abstention
  behaviour that the whole verify ladder is built on.
- Do NOT compare a raw `p_occ` against tau without renormalising by `p_occ + p_empty`. That
  makes tau interact with occlusion mass — see Design point 2.
- Do NOT add temporal voting, averaging, hysteresis or per-square memory. `f4` was wrong 90
  times out of 186 and `g1` 42 out of 42; temporal remedies provably cannot help and are
  explicitly out of scope for this whole pack.
- Do NOT touch `cnn_margin_squares`. It is 1 because a capture differs from its non-capture
  sibling by exactly one square, and it is shared with recovery.
- Do NOT re-record, re-generate or "refresh" the parity fixtures, and do NOT edit
  `scripts/emit_parity_fixtures.py`.
- Do NOT retrain, fine-tune or re-export any model in this phase. Nothing here touches
  weights.
- Do NOT report a tau as "better" without the clip pass rate. Raw miss counts alone do not
  decide — rule 1 of the selection order.

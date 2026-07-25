# Phase 03 — Python and Android consume a 2-class model

> References: `src/chesslab/move_tracker/cnn_recovery.py::observation_from_probs` `:63-84`,
> `tracker.py::_cnn_tick` `:1868` (`has_identity` at `:1961`);
> `android/core-cnn/.../Observations.kt`, `.../Preprocess.kt::requireExpectedClasses` `:40`,
> `android/app/.../cnn/ModelSpec.kt:46`, `.../engine/CnnTick.kt:43`, `.../engine/Alarm.kt:77`.
> Read `specs/17-android-rewrite/STATUS.md` §§ *04c discrepancies* (**D04c-2**) and
> *Veto escalation + overrule threshold* before starting.
>
> **This phase needs no GPU.** It is plumbing, one relaxed assertion, one trap to close, and
> one prerequisite to confirm.

## Why

Most of this is already done — by design, and that is worth verifying rather than assuming.
`observation_from_probs` derives every class index from the run's declared `classes` list and
already handles a missing `occluded` entry (`i_occl = … if "occluded" in classes else None`,
`p_occluded = 0.0` when absent), deriving `p_occ = max(0, 1 - p_empty - p_occluded)`. Kotlin's
`Observations.kt` mirrors it and requires only that the list contains `empty`. So a 2-class
model drops into the existing occupancy contract on **both** sides with **no engine change**.

But three things stand between that and a working ship, and one of them is a silent
correctness hazard.

## Files you own

| File | Contains |
|---|---|
| `src/chesslab/move_tracker/cnn_recovery.py` | the identity-presence rule in `observation_from_probs` |
| `tests/test_move_tracker.py` | the 2-class contract tests (append) |
| `android/core-cnn/src/main/kotlin/com/chesslab/cnn/Observations.kt` | the same rule, ported |
| `android/core-cnn/src/main/kotlin/com/chesslab/cnn/Preprocess.kt` | `requireDeclaredClasses` replacing `requireExpectedClasses` |
| `android/app/src/main/kotlin/com/chesslab/tracker/cnn/ModelSpec.kt` | call the relaxed validator (`:46`, and the KDoc at `:30`) |
| `android/core-cnn/src/test/kotlin/com/chesslab/cnn/TwoClassObservationTest.kt` | new test class |
| `android/app/src/test/kotlin/com/chesslab/tracker/cnn/ModelSpecTest.kt` | the relaxed-assertion cases |
| `android/app/src/main/assets/cnn_model/` | the bundled model — **only** at the end, and only if the harness supports it |
| `specs/18-occupancy-model/STATUS.md` | your row, the verification record, the D04c-2 finding |

You own **nothing else**. `CnnTick.kt`, `Alarm.kt`, `VerifySingle.kt`, `Resync.kt`,
`Recovery.kt` and everything else in `:core-engine` are **foreign** — if the D04c-2
prerequisite turns out to be open, you record a blocker, you do not fix it here.

## Design (decided — do not redesign)

### 1. THE TRAP: a 2-class model still produces a `label`, and that is wrong

`observation_from_probs` sets `label[sq] = classes[argmax]` unconditionally. With
`classes = ["empty", "occupied"]` that yields the string `"occupied"` — and
`has_identity = obs.label is not None` (`tracker.py:1961`;
Kotlin `CnnTick.kt:43` / `Alarm.kt:77`: `Squares.ALL.any { snap.obs.label(it) != null }`)
would then be **TRUE**.

The consequence is not a missing feature, it is active corruption. Every identity consumer
compares `obs.label[sq]` against `expected_labels(board)`, which returns piece classes
(`wP`, `bK`, …). `"occupied" != "wP"` at every occupied square, on every observation, with
`label_confident` true because the top confidence is high. `board_matches_identity` conflicts
on the whole board, `derive_moves_identity` derives nothing, and the alarm gate's
`has_identity` branch runs on garbage. The tracker would desync instantly and confidently.

**Decided rule:** identity is present only when the declared class list actually contains
piece classes.

```python
_PIECE_CLASSES = frozenset(c for c in config.CLASSES if c not in ("empty", "occluded"))

# in observation_from_probs, after building the maps:
has_identity = any(c in _PIECE_CLASSES for c in classes)
return OccupancyObservation(
    p_occ=p_occ, p_empty=p_empty, p_occluded=p_occluded,
    label=label if has_identity else None,
    conf=conf if has_identity else None,
    occupancy_thr=occupancy_thr,
)
```

This is a **derivation from the declared class list**, not a flag, not a config option, not a
model-name check. A run declares what it can say; the observation reports only that. The
14-class path is bit-identically unchanged (`has_identity` is trivially true there).

Kotlin mirrors it exactly in `Observations.kt`, deriving from the same rule against
`EXPECTED_CLASSES` minus `empty`/`occluded`.

With this in place `has_identity` goes FALSE for a 2-class model — which is what the rest of
this phase is built on, and what makes the D04c-2 prerequisite below load-bearing.

### 2. `label_confident` and `confident` — verify, then document

- `label_confident` returns all-`false` when `label is None` (`cnn_recovery.py:57-58`;
  Kotlin `OccupancyObservation.labelConfident`). With rule 1 in place that is automatic and
  correct: a 2-class model makes no identity statement, so no identity statement is reliable.
- `confident()`'s second clause `p_occluded < (1.0 - thr)` becomes **vacuously true**: with no
  `occluded` class `p_occluded ≡ 0.0`, and `0.0 < 1 - 0.85 = 0.15` always holds. Leave the
  clause in place — it is correct for both class lists and removing it would fork the
  implementations for no gain. **Document it in a comment**, because the next reader will
  otherwise assume the occlusion abstention still exists there.

  Note honestly in `STATUS.md`: that clause was already effectively vacuous, because the
  14-class model was trained with **zero** `occluded` rows and therefore essentially never
  puts mass on that output. This phase makes an existing situation explicit; it does not
  remove a protection that was working.

  The abstention that actually protects the tracker is the **first** clause,
  `max(p_occ, p_empty) >= thr`, plus the diff path's motion and occlusion vetoes
  (`_baseline_occlusion_and_shadow`, `min_grid_line_coverage`, the dark-frame luma gate).
  None of those involves the CNN's `occluded` class. State this explicitly so nobody later
  "restores" occlusion safety by training a class with no data.

### 3. Relax the hard 14-class assertion (05c's)

`Preprocess.kt:40 requireExpectedClasses` asserts `classes == EXPECTED_CLASSES` — exact list,
exact order — and `ModelSpec.parse` (`:46`) calls it. That was right when the app shipped one
model; it makes a 2-class model unloadable.

Replace with a validator on the **declared** list:

```kotlin
/**
 * Validates the DECLARED class list from the model's `config.json`. Every index downstream is
 * derived from this list (`Observations.kt`), never from a position, so the contract is:
 *  - at least 2 entries;
 *  - contains "empty" (the occupancy split is defined against it);
 *  - no duplicates;
 *  - "occluded" is OPTIONAL — a 2-class occupancy run declares ["empty","occupied"], the
 *    14-class piece run declares EXPECTED_CLASSES. Both are valid.
 * Returns the asset list so callers keep using THAT, not EXPECTED_CLASSES.
 */
fun requireDeclaredClasses(classes: List<String>): List<String>
```

`EXPECTED_CLASSES` **stays** — it is the 14-class reference used by tests and fixtures. What
goes is the requirement that every model equal it. Update `ModelSpec.kt`'s KDoc at `:30`,
which currently promises the canonical 14-class order.

`ModelSpecTest` keeps a case per rule: 14-class list accepted; `["empty","occupied"]`
accepted; a list without `empty` **rejected**; a 1-entry list rejected; a duplicate rejected;
a re-ordered 14-class list **accepted** (indices are derived, so order is no longer a
correctness property — say so in the test name).

### 4. PREREQUISITE — D04c-2 must be closed before a 2-class model ships

`specs/17-android-rewrite/STATUS.md` D04c-2 records: in occupancy-only mode
(`obs.label == null`), `_cnn_tick`'s `else` arm reads `resync_check`'s own `move` and
`agreement` (`tracker.py:1927-1934`), but the Kotlin port derives the move from
`deriveMovesDeep(maxPlies = recoveryMaxPlies)` instead, taking `agreement` from the deep
search. It was accepted with the explicit justification:

> *"the path is **unreachable with the bundled 14-class model** (identity is always present)"*

**Rule 1 of this phase makes it the ONLY reachable path.** The moment a 2-class model ships,
every `_cnn_tick` goes through the occupancy-only arm — the one arm whose port was accepted
*because nothing used it*. A divergence that was theoretical becomes the whole CNN recovery
path, on both a different move source and a different agreement number.

**Do this, in order:**

1. **Check `specs/17-android-rewrite/STATUS.md` first.** A concurrent task may already have
   closed D04c-2. If it is marked resolved, record that in this pack's `STATUS.md` with the
   commit or discrepancy id and move on.
2. If it is still open, **record it in this pack's `STATUS.md` as a hard blocker on shipping**
   — not on the rest of this phase. Rules 1–3 are independently valuable and testable and
   should land. What must not happen is a 2-class model being bundled into
   `android/app/src/main/assets/cnn_model/` while the only reachable recovery path is a
   known divergence from Python.
3. Fixing D04c-2 is **out of scope here** — it lives in `:core-engine` files this phase does
   not own and requires an `api` seam decision. Escalate to the orchestrator.

Regardless of D04c-2's state, **the harness is the check**: run it with a 2-class model and
confirm the occupancy-only arm produces the same decisions as the Python replay on the same
clips. If it does not, that is the divergence, measured.

### 5. Bundling — last, and gated

Copy `model.onnx`, `model.qnn.onnx` and `config.json` into
`android/app/src/main/assets/cnn_model/` **only** when: rules 1–3 are green, the harness has
run with the 2-class model, phase 02's decision table selected "proceed", and D04c-2 is
closed. Verify byte-identity between the assets and the run directory afterwards (`md5`), as
the 2026-07-25 cross-check did — a bundled model that differs from the measured one makes
every number in this pack a lie.

If any gate is open: land rules 1–3, leave `tiny-p3` bundled, and say so in `STATUS.md`.

## Steps

### 1. Python identity rule — commit `fix(tracker): a class list without piece classes carries NO identity`

### 2. Python tests — commit `test(tracker): 2-class observation contract — no identity, occupancy intact`

### 3. Kotlin identity rule — commit `fix(android-cnn): mirror the identity-presence rule in observationFromProbs`

### 4. Relaxed class assertion — commit `feat(android-cnn): validate the DECLARED class list, occluded optional`

### 5. Verification pass — no commit
Harness run with a 2-class model; D04c-2 state; the `confident()` vacuity note. All of it into
`STATUS.md`.

### 6. Bundle — commit `chore(android): bundle the 2-class occupancy model assets`
**Only if every gate in Design §5 is green.**

## Tests

**Python** (`tests/test_move_tracker.py`, appended):

| Test | Guards |
|---|---|
| `test_two_class_observation_has_no_identity` | `observation_from_probs(probs, ["empty","occupied"])` → `label is None`, `conf is None`. The trap. |
| `test_two_class_observation_occupancy_is_correct` | `p_empty`/`p_occ` match the input; `p_occluded == 0.0`; `occupied()` agrees with the argmax. |
| `test_two_class_label_confident_all_false` | every square false. |
| `test_two_class_confident_uses_only_the_mass_clause` | with `p_occluded == 0`, `confident(0.85)` is exactly `max(p_occ,p_empty) >= 0.85`. |
| `test_fourteen_class_observation_unchanged` | the 14-class path produces byte-identical output to before this phase. Regression floor. |
| `test_thirteen_class_run_still_has_identity` | a list with pieces but **no** `occluded` still yields identity. The rule keys on piece classes, not on list length. |
| `test_cnn_tick_takes_occupancy_only_arm_without_identity` | with a 2-class observation, `_cnn_tick` enters the `else` arm. The D04c-2 reachability change, asserted. |

`uv run pytest -q tests/test_move_tracker.py -k "two_class or thirteen_class or occupancy_only"`

**Kotlin** (`TwoClassObservationTest`): mirror the first six by name. Plus `ModelSpecTest`
gains the six validator cases from Design §3.

```
.\gradlew.bat :core-cnn:testDebugUnitTest --tests "com.chesslab.cnn.TwoClassObservationTest"
.\gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.cnn.ModelSpecTest"
```

**Floors:** `.\gradlew.bat :core-engine:test` (`ClipReplayParityTest` 18/18, zero diverging
frames), `:core-cnn:testDebugUnitTest`, `:app:testDebugUnitTest`, `uv run pytest -q`.

## Acceptance criteria

- `grep -n "has_identity" src/chesslab/move_tracker/cnn_recovery.py` hits inside
  `observation_from_probs`.
- `grep -rn "requireExpectedClasses" android --include=*.kt` returns **no hits in `main`
  source sets** (only tests may still reference `EXPECTED_CLASSES` as the 14-class fixture).
- `grep -n "requireDeclaredClasses" android/core-cnn/src/main/kotlin/com/chesslab/cnn/Preprocess.kt`
  and `.../app/src/main/kotlin/com/chesslab/tracker/cnn/ModelSpec.kt` both hit.
- `grep -n "occluded" android/core-cnn/src/main/kotlin/com/chesslab/cnn/Preprocess.kt` shows
  it documented as **optional**.
- `grep -n "vacuous" src/chesslab/move_tracker/cnn_recovery.py` hits — the `confident()` note
  is in the code, not only in this spec.
- All 7 Python tests + 6 Kotlin observation tests + 6 `ModelSpecTest` cases green.
- `uv run pytest -q` green apart from the 3 pre-existing `tests/test_camera.py` failures;
  `uv run ruff check src tests` clean. `:core-cnn` and `:app` ktlint + detekt clean.
- `.\gradlew.bat :core-engine:test` green with `ClipReplayParityTest` **18/18, zero diverging
  frames** — this phase touches no engine file, so it cannot move; verify it did not.
- `STATUS.md` records, explicitly: (a) that `observation_from_probs`/`observationFromProbs`
  needed **no** structural change to consume 2 classes and the engine needed **none at all**;
  (b) the D04c-2 state — closed (with its id) or open (as a shipping blocker); (c) the
  `confident()` vacuity note including the honest observation that it was already effectively
  vacuous; (d) whether the assets were bundled and why.
- If the assets were bundled: `md5` of the three asset files matches the run directory,
  quoted in `STATUS.md`.

## Do NOT

- Do NOT let a 2-class model report `label = "occupied"`. That is the trap this phase exists
  to close, and it fails silently and totally.
- Do NOT gate identity on the class-list **length**, on the run name, or on a config flag.
  Derive it from the presence of piece classes — that is the only rule that is correct for
  13-class runs too.
- Do NOT remove `confident()`'s `p_occluded < (1 - thr)` clause. It is correct for both lists;
  removing it forks Python and Kotlin for zero benefit.
- Do NOT "restore occlusion safety" by training or synthesising an `occluded` class. Zero
  data; see phase 02.
- Do NOT delete `EXPECTED_CLASSES`. It is the 14-class reference for tests and fixtures.
- Do NOT edit `CnnTick.kt`, `Alarm.kt`, `Resync.kt`, `Recovery.kt`, `VerifySingle.kt` or any
  other `:core-engine` file. D04c-2 is escalated, not fixed here.
- Do NOT bundle the 2-class assets while D04c-2 is open or while phase 02's decision table did
  not say "proceed".
- Do NOT change the frozen `CnnObservation` seam signatures.

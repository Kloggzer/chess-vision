# Phase 02 — the 2-class occupancy model

> Training reference: `src/chesslab/training/train.py` (`classes = split["classes"]` `:149`,
> loss `:263-264`), `src/chesslab/training/model.py::build_model` `:230`,
> `torch_data.py::class_weights_tensor` `:323`, `dataset.py::compute_class_weights` `:146`,
> `dataset_build.py::build_dataset`. Read entry.md's *measured context* first.
>
> **This phase needs a GPU** (ROCm on the dev machine — `docs/setup/`). It is the expensive
> one, which is why phases 00 and 01 run before it: their measurements define what this
> model has to beat and what data it gets.

## Why

The CNN's only job is occupancy. It is currently trained on 14 classes, which spends most of
its capacity — a 0.64 M-parameter `mobilenetv4_conv_small_035` — on a distinction the tracker
does not use: `wN` vs `wB` vs `wR`. The repo's own history is a record of that distinction
being the hard part and the recurring source of regressions (memory notes: *"Synth crop
resolution gap"*, *"3-Phasen-Curriculum-Ergebnis"*, *"Borderless attention vs accuracy"*,
*"Tiny-035 mobile result"* — dark types collapsing to `bQ`).

Collapsing the task to `{empty, occupied}` gives the whole model to the one question the
tracker asks, and it costs **no data**: every existing label already answers it.

### The `occluded` trap — decided, and it is a refusal

**Do NOT train an `occluded` class.** `data/manifests/squares.jsonl` has **zero** `occluded`
rows out of 378 752. `occluded` never comes from a FEN (`config.py:15-22`) and no labelling
campaign ever produced any.

A class with no training examples does not produce "no prediction" — it produces an
untrained output head whose behaviour on unseen input is undefined, and the input it would
see is precisely a hand over the board: the highest-stakes, most safety-critical moment in
the entire pipeline, where the tracker's correctness depends on the model **abstaining**.
Abstention is already handled correctly and without a class, by `confident()`'s
`max(p_occ, p_empty) >= thr` gate and by the motion / occlusion vetoes in the diff path. Do
not replace a working mechanism with an untrained one.

If `occluded` is ever wanted, it needs a labelling campaign first. That is not this phase and
not this pack.

## Files you own

| File | Contains |
|---|---|
| `src/chesslab/config.py` | `OCCUPANCY_CLASSES` (new, **beside** `CLASSES`) |
| `src/chesslab/dataset.py` | thread an explicit `classes` list through the class-list-dependent functions |
| `src/chesslab/dataset_build.py` | `--classes` mode: label collapse + the 2-class `split.json` |
| `src/chesslab/cli.py` | `dataset build --classes`, `train --loss`, `train --focal-gamma`, `train --class-weight` |
| `src/chesslab/training/train.py` | loss selection + the class-weight override |
| `src/chesslab/training/losses.py` | focal loss (new file) |
| `tests/test_dataset.py`, `tests/test_training.py` | tests |
| `specs/18-occupancy-model/STATUS.md` | your row + every measured table |

You own **nothing else**. `config.CLASSES` itself, `cnn_recovery.py`, the engine, the Kotlin
consumption path (phase 03) and `mine_hard_*.py` are foreign.

## Design (decided — do not redesign)

### 1. The class list lives beside `CLASSES`, never inside it

CLAUDE.md: *"The canonical class list exists in exactly one place (`config.CLASSES`)."* That
stays literally true. Add, in `config.py`, immediately after `OPTIONAL_CLASSES`:

```python
# --- Occupancy-only class list (2). The tracker's CNN consumes OCCUPANCY, not identity:
# the diff + legality path decides which move was played. A 2-class run spends the whole
# (tiny) model on the one question that is asked. NOT a replacement for CLASSES — the
# 14-class piece pipeline (collect UI, review, per-class stats) still uses that. Derived
# by COLLAPSING existing labels at dataset-build time; no crop is ever re-labelled.
OCCUPANCY_CLASSES: list[str] = ["empty", "occupied"]

def to_occupancy_class(label: str) -> str:
    """`empty` -> `empty`; every piece class -> `occupied`. `occluded` is REJECTED: it has
    zero training rows (specs/18-occupancy-model/entry.md) and must not be collapsed into
    either bucket — a hand is neither empty nor occupied."""
```

`to_occupancy_class` raises on `"occluded"` and on any label not in `CLASSES`. Loud, not
silent: a stray `occluded` row appearing later must stop a build, not get quietly binned.

### 2. Labels are collapsed at build time — 100 % of existing data, zero re-labelling

`chesslab dataset build <name> --sessions … --classes occupancy`:

1. Rows are filtered, deduped and split **exactly as today** — same code, same seed, same
   per-session split. Collapsing before the split would change nothing about which crop lands
   where, and doing it after keeps the diff to this pack minimal.
2. Each surviving row's `label` is mapped through `to_occupancy_class` when the manifest and
   `split.json` are written. The crop **files are untouched**; `data/squares/wB/…png` keeps
   its path and its directory. The path is the identity, the label is metadata.
3. `split.json` gets `"classes": ["empty", "occupied"]`, and `train.py:149`
   (`classes = split["classes"]`) picks it up with no change. That line is the existing,
   correct seam — the dataset declares the class list and training obeys. **Use it.**
4. `--classes` defaults to `pieces` (the 14-class behaviour), so every existing invocation is
   bit-identical.

**All of it is reused, including synth.** `empty` 219 849 → `empty`; the 158 903 piece rows →
`occupied`; the fused synth memmap rows (`mm://`) collapse the same way and need no repack —
only the label string changes.

### 3. Class-list-dependent functions take the list as a parameter

`dataset.py` binds `CLASSES = config.CLASSES` at module level (`:17`) and hard-codes it in
`compute_stats` `:34-50`, `compute_class_weights` `:149`, `make_split` `:222-252`,
`validate_split` `:269-276`, and the label validation at `:311`. Give each an explicit
`classes: list[str] | None = None` parameter defaulting to `config.CLASSES`, and thread the
build's choice through. **Do not** mutate the module-level binding, do not add a global, do
not add a "mode" flag read from somewhere else.

`OPTIONAL_CLASSES` handling (`:50`) is `empty`/`occluded`. For a 2-class run neither
`occupied` nor `empty` may be absent — a dataset missing one of two classes is degenerate and
`validate_split` must say so.

### 4. Head: `combined`

`--head combined` — a plain 2-way linear head. `HierarchicalHead` (`twostage`) composes a
2-way occupancy head with a 13-way piece head over `[c for c in classes if c != "empty"]`;
with a 2-class list that piece head has **one** output, its log-softmax is identically 0, and
the whole construction degenerates into a 2-way head with dead parameters and a confusing
config. Use `combined`. State it in the run's config.json and in `STATUS.md`.

Everything else stays: `mobilenetv4_conv_small_035`, 128×128, `--norm groupnorm`,
`--seed 42`. Changing the backbone in the same experiment as the class collapse would make
the result uninterpretable — one variable at a time.

**Warm start:** `--resume tiny-p3` adopts every tensor whose shape matches and skips the head
(`train.py:255-261` already handles a changed class count and prints the skip count). The
backbone learned useful features on this exact domain; throwing them away is a separate
experiment. Run it as the primary, and a random-init control **only if** the warm start
underperforms.

### 5. Class weighting — swept, and NOT 39×

`compute_class_weights` is inverse frequency; on the collapsed counts it yields roughly
`empty` 0.86 / `occupied` 1.19 (58 % / 42 %). That is a mild correction and it does not
encode the **cost** asymmetry, only the frequency one.

Add `train --class-weight occupied=<w>` (repeatable `KEY=VALUE`), applied as an override on
top of `split["class_weights"]` before `class_weights_tensor` (`torch_data.py:323`) reads it.
`train.py:263-264` already builds `nn.CrossEntropyLoss(weight=weights)` — **the mechanism
exists; this is a config path, not new training code.** Record the effective weight vector in
the run's `config.json`.

Sweep **{1.0, 2.0, 3.0}**.

> **The 39× number is an observed ERROR RATIO, not a cost ratio.** 8 826 misses vs 226
> phantoms describes how the current model fails. Feeding it back as a loss weight tells the
> model "always guess occupied", which drives phantoms up until the desync veto and the
> illegal-move alarm fire on a healthy board — the `blender-shadowsweep` false-alarm shape
> that the *"Veto escalation"* measurement already rejected once. 2–3× is a nudge on a
> mild imbalance. Anyone proposing a larger weight must first show a harness measurement.

### 6. Focal loss — an option, swept, not a default

58 % of the data is `empty`, and after the collapse most of it is trivially easy (a flat
board square). Cross-entropy keeps spending gradient on examples that are already solved at
p > 0.99, which is exactly the regime focal loss was designed for.

`src/chesslab/training/losses.py`:

```python
class FocalLoss(nn.Module):
    """(1 - p_t)^gamma * CE, with the SAME per-class weight vector as CrossEntropyLoss.
    gamma = 0 is exactly weighted CE (assert it in a test)."""
    def __init__(self, weight: torch.Tensor | None = None, gamma: float = 2.0) -> None: ...
```

Selected by `train --loss focal --focal-gamma 2.0`; `--loss ce` stays the default so nothing
existing changes. **`HierarchicalHead` returns log-probs, not logits** (`model.py:173-176`) —
with `--head combined` you get logits and the standard formulation applies, but the
implementation must not silently assume one or the other. Take logits, document it, and
guard it with a test.

Sweep **{ce, focal γ=2.0}** crossed with the weight sweep only where it earns its cost:
6 runs is too many. **Run 4:** `(ce, 1.0)` as the baseline, `(ce, 2.0)`, `(ce, 3.0)`,
`(focal γ=2, best weight from the first three)`.

### 7. Export

```
chesslab export --run data/models/<run> --fmt onnx
chesslab quantize --run data/models/<run>
```

`run_export` traces with a **batch-2** example so the batch dimension stays dynamic. A static
batch-1 export is useless here: the app feeds **64 crops in one call**. Verify the exported
graph's input has a symbolic first dimension before handing anything to phase 03 — a
batch-locked model fails at the first live observation, not at export.

`quantize` produces `model.qnn.onnx` (INT8 QDQ, A16W8) for the Hexagon NPU QNN EP. Both
artefacts plus `config.json` go to the harness; **bundling into
`android/app/src/main/assets/cnn_model/` is phase 03's decision**, not this phase's.

### 8. Acceptance is measured on the harness, against `tiny-p3`, at the same tau

Phase 03 relaxes the app's hard 14-class assertion, but the **harness** must be able to score
a 2-class model *before* that lands — otherwise 02 cannot be accepted. `SimClips`/`ClipRun`
construct the classifier from a model directory and pass `classifier.classes` to
`observationFromProbs`, which already derives indices from the declared list
(`Observations.kt:15-17` requires only `empty`). The blocker is `ModelSpec.parse`'s
`requireExpectedClasses` (phase 03's file). **If the harness cannot load a 2-class model,
STOP and record a blocker** — coordinate with phase 03; do not edit `Preprocess.kt` or
`ModelSpec.kt` yourself.

Run:

```
cd android
.\gradlew.bat :app:testDebugUnitTest -Pchesslab.sim=true `
  -Pchesslab.sim.models=data/models/tiny-p3,data/models/<your-run> `
  --tests "com.chesslab.tracker.sim.*"
```

Both models are scored against the identical diff-only baseline in one pass, at **phase 00's
adopted `occupancy_thr`**. Comparing at different taus compares two changes at once and
proves nothing.

**Report, per model:** clips passing (n/18), misses, phantoms, confident-occupancy error %,
perfect boards, top-8 offending squares, alarms raised, phantom-overrule commits.

**The decision each outcome drives:**

| Harness outcome | Decision |
|---|---|
| Misses down **and** clips passing ≥ 14/18 | Proceed to phase 03. The collapse works. |
| Misses down, clips passing **< 14/18** | Do **not** ship. Something else regressed — read the per-clip note streams before touching the model. |
| Misses roughly flat | The bottleneck is not the class count. Phase 04's attention analysis becomes the next lever, and phase 05's real data the one after. Record the null result plainly. |
| Phantoms up sharply | The weight or γ is too aggressive. Step down the sweep; do not compensate elsewhere. |

Do **not** state a target number anywhere. State what is measured and which branch it takes.

**Every number is a pessimistic lower bound** (~31 px/square on the clips vs ~112 from a
phone at 1080p). Say it in the same sentence as the number, every time.

## Steps

### 1. Class list + collapse — commit `feat(config): OCCUPANCY_CLASSES beside CLASSES + to_occupancy_class`

### 2. Thread the class list — commit `refactor(dataset): class-list-dependent functions take an explicit classes list`
Pure refactor. `uv run pytest -q tests/test_dataset.py` must be green **before and after**,
with identical results.

### 3. Build mode — commit `feat(dataset): dataset build --classes occupancy collapses labels at build time`

### 4. Focal loss + weight override — commit `feat(training): focal loss and per-class weight overrides`

### 5. Train the sweep — no commit
4 runs. Record every run's config, effective weights and harness numbers in `STATUS.md`.

### 6. Export the winner — commit `chore(models): export + quantize the occupancy run`
Only the model card / config metadata is committed; weights live under `data/` and are
gitignored.

## Tests

**Python:**

| Test | Guards |
|---|---|
| `test_to_occupancy_class_collapses_pieces` | all 12 piece classes → `occupied`; `empty` → `empty`. |
| `test_to_occupancy_class_rejects_occluded` | raises. The zero-data refusal, encoded. |
| `test_occupancy_build_writes_two_class_split` | `split.json` `classes == ["empty","occupied"]`, counts sum to the row count, no third key. |
| `test_occupancy_build_reuses_all_rows` | the 2-class build keeps the **same row count** as the 14-class build from the same sessions and seed. "100 % of existing data" is asserted, not asserted-in-prose. |
| `test_occupancy_build_preserves_per_session_split` | the session→split assignment is identical to the 14-class build at the same seed. |
| `test_piece_class_build_is_unchanged` | `--classes pieces` (the default) produces a byte-identical `split.json` to before this phase. Regression floor. |
| `test_class_weight_override_applies` | `--class-weight occupied=2.0` reaches `class_weights_tensor`'s output vector. |
| `test_focal_gamma_zero_equals_weighted_ce` | `FocalLoss(w, gamma=0)` == `CrossEntropyLoss(weight=w)` to within float tolerance, on random logits. The correctness anchor for the whole loss. |
| `test_focal_downweights_easy_examples` | a confident-correct example's loss is strictly smaller under γ=2 than under γ=0; a hard one is not. |

`uv run pytest -q tests/test_dataset.py tests/test_training.py`

**Harness:** the comparison run above. It is a measurement, not an assertion — the harness's
own contract assertions (diff-only baseline 18/18) still gate the run.

## Acceptance criteria

- `grep -n "OCCUPANCY_CLASSES" src/chesslab/config.py` hits **exactly once** as a definition.
- `grep -n "^CLASSES: list\[str\] = \[" src/chesslab/config.py` still hits, and the list still
  has 14 entries — `CLASSES` was not mutated.
- `grep -rn "occluded" src/chesslab/config.py | grep -i occupancy` shows the refusal is
  documented at the definition site.
- `chesslab dataset build --help` lists `--classes`; `chesslab train --help` lists `--loss`,
  `--focal-gamma`, `--class-weight`.
- The built dataset's `split.json` has `"classes": ["empty", "occupied"]` and **no**
  `occluded` key anywhere.
- All 9 Python tests green; `uv run pytest -q` green apart from the 3 pre-existing
  `tests/test_camera.py` failures; `uv run ruff check src tests scripts` clean.
- `python -c "import onnx,sys; m=onnx.load('data/models/<run>/model.onnx'); \
  print(m.graph.input[0].type.tensor_type.shape.dim[0])"` shows a **symbolic** (`dim_param`)
  batch dimension, not `dim_value: 1`.
- The harness ran with both models in one pass and `STATUS.md` carries the full comparison
  table, the four run configs, and the branch taken from the decision table **named
  explicitly**.
- `.\gradlew.bat :core-engine:test` green, `ClipReplayParityTest` **18/18, zero diverging
  frames**. Nothing in this phase touches the diff path; if it moved, stop.
- Every quoted number carries the pessimistic-lower-bound sentence.

## Do NOT

- Do NOT train an `occluded` class, and do NOT collapse `occluded` into `empty` or into
  `occupied` "for completeness". Zero rows means undefined behaviour on the input that
  matters most.
- Do NOT mutate `config.CLASSES`, shadow it, or add a second canonical list.
- Do NOT re-label, move, copy or re-slice any crop. The collapse is a metadata mapping at
  build time.
- Do NOT use `--head twostage` for a 2-class run. It degenerates into a 2-way head with dead
  parameters.
- Do NOT set the occupied class weight from the 39× error ratio. It is an observed failure
  rate, not a cost.
- Do NOT change the backbone, crop size, `pad_up`, `pad_side` or the augmentation policy in
  the same experiment. One variable at a time; those levers are phase 04's.
- Do NOT split randomly or re-seed to get a nicer number.
- Do NOT quote `tiny-p3`'s stored `occ_board_acc = 0.800`. It is 4 of 5 boards.
- Do NOT bundle the new model into `android/app/src/main/assets/` — that is phase 03's call,
  after the consumption path is verified.
- Do NOT edit `Preprocess.kt`, `ModelSpec.kt` or anything else phase 03 owns. Blocked →
  record a blocker.

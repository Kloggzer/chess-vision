# Phase 04 — Fold the norm away, from the champion's own weights

## Why

Phase 00 measured where the 66 ms go: 36 ms of real convolution, and **30 ms of pure fragmentation
overhead** — 92 layout transposes, 92 reshapes, 46 `InstanceNormalization`, 46 `Mul`, 56 `Add`, all
on the generic CPU EP. The cause is one thing: GroupNorm's decomposition sits between every pair of
convolutions, so XNNPACK cannot claim two convs in a row and the graph shatters into **94 fragments
over 47 convolutions**.

specs/25 attacked this by training a foldable network and failed three times on quality. This phase
attacks it from the other end and never trains anything: **keep the champion's trained weights and
replace GroupNorm with a static per-channel affine measured over real crops.** A fixed affine folds
into the preceding convolution, the decomposition disappears, and 47 convolutions become one
XNNPACK partition.

The catch, stated up front because it is the whole risk: GroupNorm normalizes **per sample**, so a
dataset-level affine is an **approximation**, not an identity. Where a crop's own statistics differ
from the corpus average — a very dark square, a glare, an occluded piece — the two diverge. Those
are exactly the crops this model is worst at. So this is a measurement, not a refactor, and a
negative result is a complete deliverable.

## Design (decided — do not redesign)

### The conversion

For every `nn.GroupNorm` in the champion, measure the per-channel mean and variance of its **input**
over real crops, then replace it with the affine that GroupNorm would have applied had every sample
carried those statistics:

```
y = (x - mean) / sqrt(var + eps) * weight + bias        # per channel, all constants
```

which is exactly a `BatchNorm2d` in eval mode — so **emit `nn.BatchNorm2d` with those buffers** and
let the existing export path fold it (`training/model.py:99-115 stock_batchnorm`, and the exporter
already folds eval-mode BatchNorm). Do not invent a new module; the fold you want is one the repo
already performs.

Two details that decide whether this works at all:

- **The statistics must be per channel, not per group.** GroupNorm shares a statistic across the
  channels of a group; the folded affine has one per channel. Measuring per channel is strictly
  closer to what the network saw, and it is what folds.
- **Measure through the serving pipeline**, i.e. path-A crops re-sliced at 80 px, not the 128 px
  crops on disk. `scripts/adabn_recalibrate.py` already does exactly this measurement in float64
  through forward hooks (`ChannelStats`), on the right pixels, with the right `--calib-dataset`
  override. **Reuse it — do not write a second statistics collector.** It hooks `nn.BatchNorm2d`
  today; generalising the hook target to `nn.GroupNorm` is the change.

### The measurement that decides it

Three rows, one command, same day, same profile — see `entry.md` on why a quoted baseline is
worthless:

| graph | phantoms | misses | margin p99.9 / max | nodes | device median ms |
|---|---|---|---|---|---|
| `occ-v6-f5nd` as it ships (GroupNorm) | | | | 411 executing | 66 |
| the folded model | | | | | |

Accuracy on the desktop via `scripts/sweep_infer_size.py --paths a --dataset occ-real6`; node count
from the exported graph; latency on the device (`adb devices` → `f86dfdca`).

**Report the fragment count, not only the node count.** The point of the phase is that 47
convolutions become one partition; a graph with 100 nodes still split into 40 islands has not
achieved it. Phase 00's `EpProfile` instrumentation on `spec-26-00-where-does-it-run` prints exactly
this — rebase onto that branch rather than rebuilding it.

### If accuracy drops

One remedy, then stop: re-measure the statistics on a **larger and more varied** calibration set
(more sessions, both light and dark squares represented). If a phantom appears and does not go away,
the answer is "GroupNorm's per-sample normalisation is load-bearing on this data" — which is a real
finding and closes a question that has been open all day. Do **not** fine-tune, do not retrain, do
not adjust the loss.

## Steps

1. `scripts/adabn_recalibrate.py` — commit `feat(scripts): collect statistics for GroupNorm too, not only BatchNorm`
2. `src/chesslab/training/norm_fold.py` (new) — commit `feat(training): fold GroupNorm into a static per-channel affine` — the conversion, emitting `nn.BatchNorm2d`.
3. Measure accuracy on the desktop — no commit. **Decision point:** if a phantom appears against your own freshly measured baseline, record it and stop before touching the device.
4. Export, count nodes and fragments, measure on the device — no commit.
5. Report — commit `docs(specs): 26 phase 04 — what folding the norm costs and buys`

## Tests

`tests/test_norm_fold.py`:

1. `test_folded_matches_groupnorm_on_average_input` — on a batch whose per-channel statistics equal
   the calibration statistics, folded and original agree to ≤ 1e-5. This proves the arithmetic.
2. `test_folded_diverges_on_an_outlier_sample` — on a deliberately mis-scaled sample they differ.
   **This is not a bug, it is the phase's premise**; the test exists so nobody later "fixes" the
   approximation away without noticing what it was.
3. `test_no_groupnorm_remains` — no `nn.GroupNorm` in the converted tree.
4. `test_activations_preserved` — the 30 ReLUs survive. timm's `BatchNormAct2d` carries the block's
   activation and a careless whole-module swap deletes it; that bug shipped in this repo once.

```
.venv/Scripts/python.exe -m pytest -q tests/test_norm_fold.py tests/test_training.py
.venv/Scripts/python.exe -m ruff check src/chesslab/training/norm_fold.py scripts/adabn_recalibrate.py
```

## Acceptance criteria

- [ ] Baseline and candidate measured in the **same run**, both rows in STATUS.
- [ ] Node count **and fragment count** before/after.
- [ ] Device median and spread over ≥ 30 observations, or an explicit "stopped at step 3 because
      accuracy regressed", with the numbers.
- [ ] The 30 ReLUs survive; no `nn.GroupNorm` remains.
- [ ] Scoped `ruff` clean, `vulture` silent, no `# noqa`.

## Do NOT / Out of scope

- Do **not** train, fine-tune or resume anything. The champion's weights are the input, unchanged.
- Do **not** touch `scripts/sweep_infer_size.py` — frozen, it is the measurement of record.
- Do **not** swap the bundled Android asset. Produce a candidate; the swap is the orchestrator's call.
- Do **not** present the approximation as exact. If it holds accuracy, say "measured equal on this
  corpus", not "equivalent".

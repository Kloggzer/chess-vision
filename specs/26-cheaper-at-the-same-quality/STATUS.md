# STATUS — 26 cheaper at the same quality

Branch per phase, cut from the pack commit on `spec-24-frame-the-board`, **not from `main`**:
`spec-26-00-where-does-it-run`, `spec-26-01-four-crops`, `spec-26-02-int8-audit`,
`spec-26-03-variance`. Each agent works in its own `git worktree`.
Append to your own row only; never rewrite another phase's entry.

## The floor — every phase re-verifies this

`occ-v6-f5nd` @ 80 px, `occ-real6` test, path A: **0 phantoms**, 11 misses, anchor 9/0 · phone 2/0,
margin empty p99.9 / max **0.238 / 0.343**.

A phase that is faster and loses the floor is **rejected**, however large the speedup. Better
quality is welcome even if it costs time; worse quality is not purchasable at any price.

> ⚠ **Phase 02, 2026-07-30: that row no longer reproduces.** The frozen command
> (`sweep_infer_size.py --runs occ-v6-f5nd --splits test --sizes 80 --paths a --dataset occ-real6`)
> returns **1 phantom, 12 misses, margin 0.316 / 0.512** today — anchor `20260721-212830` still
> gives exactly 9/0, the phone session `20260730-145846` gives 3/1 where the floor says 2/0, and it
> is that session's worst empty crop that moves the margin max from 0.343 to 0.512. The code is not
> the cause: `git diff` between the specs/25 closing commit and the pack commit `513e995` is **empty**
> for `src/` and `scripts/`. `data/_perf/` holds a sweep log for every other row of specs/25's table
> (`bn80`, `adabn80`, `v7bn_warm`, `v7nf`, `v7dsbn`) and **none for the champion**, so the row was
> most likely carried over from specs/24 rather than re-measured, and something under `data/` moved
> between the two — `data/calibration/phone.yaml` was recalibrated at 15:17 and the phone session's
> `session.yaml` rewritten at 15:28, both after `occ-real6` was built at 15:11. Not proven; recorded.
> **Phases 00/01/03 should compare against 1 / 12 / 0.316 / 0.512, or re-derive the floor first** —
> holding "0 phantoms and ≤ 0.343" is not currently possible with the champion's own weights.

## Phases

| Phase | Concern | State | Owner | Notes |
|---|---|---|---|---|
| 00 | Which EP actually executes the graph? | **done** | — | QNN not in the build; 94 fragments over 47 convs; 45 % of kernel time on the CPU EP |
| 02 | Is the shipped INT8 model still honest? | **done** | `spec-26-02-int8-audit` | Honest (1 phantom, = its float parent). Per-channel A16W8 is better: **0 phantoms**. But **the floor as written does not reproduce**; see above. |
| 01 | Verify with 4 crops instead of 64 | todo | — | Premise strengthened by 00: it is XNNPACK/CPU, not a fixed-shape NPU graph, so scaling is near-linear |
| 04 | Fold GroupNorm into a static affine | todo | — | From the champion's own weights; no training. Attacks the 30 ms directly |
| 05 | Does NNAPI take whole what XNNPACK fragments? | todo | — | Config + measurement. If yes, 04's approximation is unnecessary |
| 03 | The latency variance | **mostly answered by 00** | — | 61 → 64.5 → 75 ms while battery went 34.0 → 37.1 °C. Throttling, not contention |

States: `todo` → `in progress` → `done` | `blocked`.

## The budget, measured

Session median **66 ms** over 72 samples (p10 53, p90 81, min 44, max 93) on the SM8650 at 80 px:

- **~36 ms (55 %)** — XNNPACK, the 47 convolutions. Real work.
- **~30 ms (45 %)** — CPU EP: 92 `Transpose`, 92 `Reshape`, 46 `InstanceNormalization`, 46 `Mul`,
  56 `Add`, 30 `Relu`. **Fragmentation overhead**, caused by GroupNorm's decomposition sitting
  between every pair of convolutions.

411 nodes execute, not the 503 in the file — ORT folds away 138 `Constant` + 46 `Shape`, XNNPACK
inserts the 92 `Transpose`.

## Results

| Phase | What changed | Latency | Accuracy (phantoms / margin max) | Verdict |
|---|---|---|---|---|
| 00 | logging only | median 66 ms, p90 81, spread 2.11x | untouched by construction | QNN absent; 94 fragments; **the norm is the speed problem, via fragmentation** |
| 02 | `scripts/score_onnx.py`; `quantize` defaults to per-channel weights | untouched (accuracy phase; the CPU-EP timings here are not device numbers) | shipped INT8 **1 / 0.549** vs float **1 / 0.508**; per-channel **0 / 0.431** | **The shipped artefact is honest.** Per-channel A16W8 is a free quality gain. |
| 01 | — | — | — | — |
| 03 | — | — | floor untouched by construction | — |
| 04 | — | — | — | — |
| 05 | — | — | — | — |

## Phase 02 — what quantization costs

All rows: `occ-v6-f5nd`, path A, 80 px, `occ-real6` test (110 boards / 7 040 crops / 2 353
occupied), measured in one pass over the same crops with `scripts/score_onnx.py`. The ONNX rows run
desktop ONNX Runtime on the **CPU EP** — this is what quantization did to the numbers, not what the
Hexagon does with them.

| graph | phantoms | misses | margin p99.9 / max | miss @ 0 phantoms | vs float: argmax / max ΔP |
|---|---:|---:|---|---:|---|
| torch FP32 (`best.pt`, CPU) | 1 | 12 | 0.312 / 0.508 | 12 | — |
| **ONNX FP32** (`model.onnx`) | 1 | 12 | 0.312 / 0.508 | 12 | 1.0000 / 0.0000 |
| **ONNX INT8 QDQ** (`model.qnn.onnx`, shipped) | 1 | 10 | 0.314 / **0.549** | 14 | 0.9997 / 0.109 |

**The shipped artefact is honest.** The float export is bit-exact against torch, so there is no
export error to confuse with quantization error, and quantization flips **2 of 7 040** crops. Same
phantom count as its float parent, two fewer misses (noise, at 2 353 occupied), margin max +0.041.
Nothing resembling the MobileNet-class collapse the phase was written against.

It does **not** hold the pack's stated floor (0 phantoms, ≤ 0.343) — but neither does the float
champion it was exported from, on today's data. See the warning under "The floor" above.

### Why it survived, and what is better — measured, one flag at a time

`quantize.py` was per-tensor everywhere (767 per-tensor scale tensors, 0 per-channel) because
`get_qnn_qdq_config` defaults `per_channel=False`. What saved it was the *other* default: **A16W8**,
16-bit activations with INT8 weights.

| activation / weight | weight scales | phantoms | misses | margin p99.9 / max | calib parity |
|---|---|---:|---:|---|---:|
| quint8 / quint8, per-tensor | per-tensor | **5** | 11 | 0.406 / 0.802 | **1.000** |
| quint8 / quint8, per-channel | per-channel | 2 | 15 | 0.382 / 0.622 | 0.992 |
| quint16 / quint8, per-tensor | per-tensor | 1 | 10 | 0.314 / 0.549 | 1.000 |
| **quint16 / quint8, per-channel** | per-channel | **0** | 14 | **0.284 / 0.431** | 1.000 |

- Pure INT8 is the failure mode the literature describes, at a fifth of the severity: 5 phantoms and
  a 0.802 margin. The `run_quantize` docstring's "~0.34 parity for quint8/quint8" is **wrong for this
  model** — it scores 1.000 and is still five times worse. Kept as a historical note, not a gate.
- **Per-channel A16W8 is the only phantom-free graph anywhere in this audit**, float included, and it
  has the best margin of anything measured today (0.431). Same 1 056 nodes, same op mix, only the
  scale granularity differs. It is now the `chesslab quantize` default (`--per-tensor` opts out); the
  re-export is byte-identical to the graph scored above.
- Not done, because there was no damage to repair: percentile calibration ranges, and a calibration
  set drawn from anything but train.

### For the orchestrator

- The candidate is `data/models/_audit26-pc-a16w8/model.qnn.onnx` (also reproducible as
  `chesslab quantize --run data/models/occ-v6-f5nd`). **Nothing under `data/models/occ-v6-f5nd/` and
  no Android asset was touched.**
- **Per-channel is unverified on the device.** Per-tensor scales were historically an HTP
  constraint; ORT's QNN builder accepts the flag but assignment ≠ support. Phase 00's
  `disable_cpu_ep_fallback` is the instrument. A graph that fell off the NPU trades ~1.2 ms/crop for
  a margin gain nobody can spend — confirm placement before swapping the bundled asset.
- `_parity` in `quantize.py` cannot see this class of failure and now says so: it scored the
  5-phantom export at 1.000. It calibrates on train crops the model already fits.

## Established — do not re-derive

- **specs/25 closed the normalization question.** GroupNorm ships and cannot fold; BatchNorm was
  excluded across five measured causes; normalizer-free reached 99 graph nodes and 267 phantoms.
  Read `specs/25-normalization-endgame/STATUS.md` before proposing anything about norms.
- Graph at 80 px: **503 nodes** (champion, measured), 124 folded BatchNorm, 99 normalizer-free. The
  often-quoted 573 is the 128 px v4 graph.
- `CNN observation 80 ms for 64 crops = 2 prep + 77 session` — 1.2 ms/crop, all inside the session.
- The trace is at a **fixed batch of 64** on purpose: a dynamic batch dimension previously broke NPU
  partitioning.
- The Hexagon NPU is reachable from a normal app; the blockers were `ADSP_LIBRARY_PATH` and the
  dynamic batch dim, not SELinux. EPContext cache: 5 m 26 s cold → 0.8 s warm.
- **`val_acc` does not predict the veto metric — in specs/25 it ranked runs in reverse.** Only
  `sweep_infer_size.py --paths a --dataset occ-real6` decides accuracy.

## Research that shaped this pack (2026-07-30)

- ORT exposes `session.disable_cpu_ep_fallback`, which **raises** instead of silently falling back
  when a model cannot run entirely on the QNN HTP backend — phase 00's cheapest instrument. Verbose
  logging shows placement decisions, and the QNN EP can dump the pre-partition graph as JSON.
  Operator *support* ≠ operator *assignment*.
- **Smaller batches do not reliably run faster on mobile NPUs.** Phase 01's premise is therefore a
  hypothesis to measure, not an assumption to build on — hence its explicit stop-at-step-2.
- **Small mobile CNNs are the known worst case for post-training quantization**: naive per-tensor
  PTQ has been reported taking MobileNetV2 from 70.9 % to 0.1 % top-1, with per-channel
  quantization restoring near-original accuracy. This is why phase 02 exists at all.
- DVFS thermal throttling produces a nonlinear cliff reported at 30 ms → 150 ms — the same shape as
  the observed 70 → 165 ms — while CPU contention produces a model-dependent variance increase.
  Phase 03 separates them by *when* the slow observations occur.

## Session log

| Date | Phase | What happened |
|---|---|---|
| 2026-07-30 | — | Pack written after specs/25 closed negative. Quality floor stated as the binding constraint. |
| 2026-07-30 | 02 | INT8 audit done. Quantization costs 2 of 7 040 crops; per-channel weights are strictly better and are the new export default. Found that the pack's floor row does not reproduce. |

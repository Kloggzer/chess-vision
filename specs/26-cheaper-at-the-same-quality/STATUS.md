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

## Phases

| Phase | Concern | State | Notes |
|---|---|---|---|
| 00 | Which EP actually executes the graph? | **done** | QNN not in the build; 94 fragments over 47 convs; 45 % of kernel time on the CPU EP |
| 02 | Is the shipped INT8 model still honest? | **done** | Honest (1 phantom, = its float parent). Per-channel A16W8 is better: **0 phantoms** |
| 01 | Verify with 4 crops instead of 64 | todo | Premise strengthened by 00: it is XNNPACK/CPU, not a fixed-shape NPU graph, so scaling is near-linear |
| 04 | Fold GroupNorm into a static affine | todo | From the champion's own weights; no training. Attacks the 30 ms directly |
| 05 | Does NNAPI take whole what XNNPACK fragments? | todo | Config + measurement. If yes, 04's approximation is unnecessary |
| 03 | The latency variance | **mostly answered by 00** | 61 → 64.5 → 75 ms while battery went 34.0 → 37.1 °C. Throttling, not contention |

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
| 02 | quantization defaults | n/a (desktop) | shipped 1 / 0.549 → per-channel **0 / 0.431** | shipped artefact honest; per-channel A16W8 is a free quality gain |
| 01 | — | — | — | — |
| 04 | — | — | — | — |
| 05 | — | — | — | — |

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

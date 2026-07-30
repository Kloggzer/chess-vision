# 26 — Cheaper at the same quality

> Entry file for the spec pack. Every implementing agent reads **this file completely**, then
> exactly the phase file assigned to it.
>
> **The protocol of `specs/22-inference-resolution/entry.md` applies verbatim.** Only the deltas are
> below. Branches are cut from the pack commit on `spec-24-frame-the-board`, **not from `main`** —
> `main` has neither this pack nor `scripts/adabn_recalibrate.py`, and its `sweep_infer_size.py` has
> no `--dataset` flag. That mistake cost two agents a rework cycle in specs/25.

## The rule that governs this pack

**Quality is the constraint. Speed is the objective underneath it.** Not the reverse.

specs/25 spent a day chasing speed and its one "success" was a 99-node graph attached to a model
with 267 phantoms. A decision made in 3 ms that could have been made with `random()` is worth
nothing. So:

**The floor is measured, never quoted.** Corrected 2026-07-30 after phase 02: the reference row this
pack originally carried (0 phantoms / 11 misses / margin 0.238 / 0.343) **does not reproduce**. The
same frozen command on the same checkpoint returns 1 phantom / 12 misses / 0.316 / 0.512 today,
`git diff` over `src/` and `scripts/` is empty, and `data/calibration/phone.yaml` was recalibrated at
15:17 against `occ-real6` being built at 15:11. Path A re-cuts every crop from the session frames
**through the current profile**, so a recalibration silently invalidates every earlier number.

Therefore: **every phase measures its own baseline in the same run as its candidate**, with the same
command, on the same day. Never carry a row over from another phase's table, this file, or an older
log. Report both rows side by side.

Today's reference, for orientation only — re-measure it, do not cite it:

| graph | phantoms | misses | margin p99.9 / max |
|---|---:|---:|---|
| `occ-v6-f5nd` torch FP32 | 1 | 12 | 0.316 / 0.512 |
| shipped INT8 (per-tensor A16W8) | 1 | 10 | 0.314 / 0.549 |
| **per-channel A16W8 candidate** | **0** | 14 | **0.284 / 0.431** |

The bar is **no worse than the baseline you measured yourself**, on phantoms first, then margin.
A phase that is faster and adds a phantom is **rejected**, however large the speedup. Better quality
is welcome even if it costs time; worse quality is not purchasable at any price.

Phantoms are the veto; among phantom-free candidates, rank by margin, then misses. At 2 353 occupied
crops, **miss differences below ~8 are noise**.

## What this is

The champion costs `CNN observation 80 ms for 64 crops = 2 prep + 77 session` on the device — 1.2 ms
per crop, all of it inside the ORT session. This pack attacks that number **without touching a
single weight**, so the floor is held by construction rather than by hope, and it verifies that
claim by measuring anyway.

| Spec | Phase | Depends on | Runs |
|---|---|---|---|
| `00-where-does-it-run.md` | Which EP actually executes the graph? | — | **DONE 2026-07-30** |
| `02-is-the-shipped-int8-model-still-honest.md` | Has the shipped INT8 graph ever been measured? | — | **DONE 2026-07-30** — honest; per-channel is better |
| `01-verify-with-four-crops.md` | A move hypothesis touches 4 squares, not 64. | — | ready; needs the device |
| `04-groupnorm-to-static-affine.md` | Fold the norm away, from the **champion's own weights**. | — | ready; the desktop decides it |
| `05-nnapi-or-not.md` | Does NNAPI take whole what XNNPACK fragments? | — | ready; needs the device |
| `03-the-2x-variance.md` | The latency spread. | 00 | **mostly answered by 00** |

**What phase 00 established, and why the rest changed shape.** The QNN provider is not in the binary
at all — dropped in `928a55c` (2026-07-26): that AAR carries neither XNNPACK nor NNAPI symbols, and
QNN measured 227 ms against the CPU's 97. What actually runs the graph on the SM8650:

| | nodes | kernel time | operators |
|---|---:|---:|---|
| XNNPACK | 47 | 128.3 ms (55 %) | `Conv`×46, `Gemm`×1 |
| CPU EP | 364 | 103.6 ms (45 %) | `Transpose`×92, `Reshape`×92, `Add`×56, `InstanceNormalization`×46, `Mul`×46, `Relu`×30 |

**94 fragments over 47 convolutions.** Every conv is its own XNNPACK island, entered through an
NCHW→NHWC transpose and left through the inverse, because GroupNorm's decomposition
(`InstanceNormalization` + 2×`Reshape` + `Mul` + `Add`) sits between every pair. **411 nodes execute**,
not the 503 in the file: ORT folds away 138 `Constant` + 46 `Shape`, and XNNPACK *inserts* the 92
`Transpose`. Session median **66 ms** over 72 samples (p10 53, p90 81, min 44, max 93).

So about **36 ms is real convolution work and 30 ms is fragmentation overhead.** Phases 04 and 05
attack the 30 ms from opposite ends; phase 01 attacks both by doing 16x less of it.

Phase 03 is largely answered: session median by third of run 61 → 64.5 → **75 ms** while battery
temperature rose 34.0 → 37.1 °C on a run doing nothing else. Throttling, not contention. Reopen it
only if another phase's numbers cannot be explained without it.

## Established — do not re-derive

- specs/25 closed the normalization question: **GroupNorm ships and cannot fold.** BatchNorm was
  excluded across five measured causes; the normalizer-free network reached 99 graph nodes and 267
  phantoms. Read `specs/25-normalization-endgame/STATUS.md` before proposing anything about norms.
- Exported graph at 80 px: **503 nodes** (the GroupNorm champion, measured), 124 folded BatchNorm,
  99 normalizer-free. The often-quoted 573 is the 128 px v4 graph — do not cite it.
- The graph is traced at a **fixed batch of 64** (`src/chesslab/training/evaluate.py:132`,
  `ONNX_BATCH`), deliberately: a dynamic batch dimension previously broke NPU partitioning. The
  Android classifier's contract is exactly 64 crops
  (`android/core-cnn/.../SquareClassifier.kt:12`).
- The Hexagon NPU is reachable from a normal app; the historical blockers were an unset
  `ADSP_LIBRARY_PATH` and a dynamic batch dimension, not SELinux. The EPContext cache took first-run
  compilation from 5 m 26 s to 0.8 s.
- `occ-v6-f5nd` ships `model.onnx`, `model.qnn.onnx` (INT8/QDQ) and `model.torchscript.pt`.
- **`val_acc` does not predict the veto metric — it has ranked runs in reverse.** Only
  `scripts/sweep_infer_size.py --paths a --dataset occ-real6` decides anything.

## Device access

A phone is attached (`adb devices` → `f86dfdca`). On-device measurement is expected, not optional,
for phases 00, 01 and 03 — a claim about what the NPU does, made on x64, is a hypothesis.

- Never `adb root`, never change system properties, never install anything but this app.
- Build with `gradlew.bat` via the PowerShell tool from `android/`. Stockfish is a submodule; if a
  native build fails on a missing submodule, run `git submodule update --init --recursive` rather
  than stubbing it out.
- If the device is busy or absent, STOP and record it — do not substitute an x64 number and present
  it as a device number.

## Heavy-compute contract

- **No training in this pack.** Nothing here changes weights. If a phase believes it needs to train,
  it has misunderstood its phase — STOP and record it.
- Re-measurement with `sweep_infer_size.py` is cheap (~16 s for 110 boards) and needs no lock.
- Quantization (`chesslab quantize`) is CPU work on a calibration set — one run, no sweeps.
- The GPU is the user's own machine and is also used for gaming.

## Git hygiene

One branch per phase — `spec-26-00-where-does-it-run`, `spec-26-01-four-crops`,
`spec-26-02-int8-audit`, `spec-26-03-variance` — each in its own `git worktree`, cut from the pack
commit. Atomic conventional commits as named in each phase's Steps. Never commit anything under
`data/`. Never `--no-verify`, never force-push, never touch another phase's branch.

**Worktree bootstrap — this cost specs/25 an agent's whole first turn.** A worktree has no `data/`
(gitignored) and no `.venv`, and the editable install makes `.venv/Scripts/chesslab.exe` execute the
**main checkout's** `src/`. Junction `data/` in, set `PYTHONPATH` to your own `src/`, and **verify
`chesslab.__file__` resolves inside your worktree** before any measurement. A number produced
against the wrong source is plausible, green and meaningless.

## Static-analysis contract

Python: `.venv/Scripts/python.exe -m ruff check <your files>` and targeted `pytest`, once, at the
end. Kotlin: `gradlew.bat :app:ktlintCheck :app:detekt` — use `ktlintFormat` for style rather than
hand-editing. Zero NEW findings; no `@Suppress`, no `# noqa`, no baseline additions to go green. Note
that detekt's unused-code rules only see **private** scope — an `internal` or `public` function
nobody calls is invisible to every tool in this repo, so do not leave one behind.

## Ownership registry — overrides any phase file that disagrees

| file | owner | may be extended by | notes |
|---|---|---|---|
| `src/chesslab/training/evaluate.py` | **01** | — | `ONNX_BATCH` and the export path. specs/25 forgot this file and two phases collided in it. |
| `src/chesslab/training/quantize.py` | **02** | — | |
| `android/.../cnn/OrtSessionRunner.kt` | **00** | 01 (a second session handle only) | 00 lands first and declares the EP-logging surface complete before 01 starts |
| `android/.../cnn/OnnxSquareClassifier.kt` | **01** | — | |
| `android/.../cnn/EpProfile.kt` | **00** | — | |
| `android/core-cnn/.../SquareClassifier.kt` | **01** | — | the 64-crop contract lives in its KDoc; change the contract and the doc together |
| `android/.../pipeline/` (perf logging) | **03** | — | |
| `scripts/sweep_infer_size.py` | **nobody** | — | frozen; it is the measurement of record |
| `specs/26-.../STATUS.md` | pack | every phase, own row only | |

## Artifact authority

For accuracy, `sweep_infer_size.py --paths a --dataset occ-real6` **is** the number. For latency, the
device log line `CNN observation N ms for M crops = P prep + S session` **is** the number — report a
median and a spread over at least 30 observations, never a single sample, because the known spread
is 2.3x.

## Definition of done (per phase)

1. Code committed, scoped lint green, targeted tests green.
2. The phase's own measurement, on the device where the phase file says so.
3. **The floor re-verified**: 0 phantoms, margin max ≤ 0.343, unless the phase provably cannot
   affect accuracy — and even then, say why in one sentence rather than skipping it.
4. `STATUS.md` row: what changed, latency before/after with spread, accuracy before/after, and what
   the phase excluded if negative.

**Negative results are a complete deliverable.** specs/25 landed three and they were worth the day.

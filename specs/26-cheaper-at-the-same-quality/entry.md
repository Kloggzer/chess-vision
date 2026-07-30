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

**The floor — `occ-v6-f5nd` at 80 px on `occ-real6` test, path A:**

| phantoms | misses | anchor · phone | margin empty p99.9 / max |
|---:|---:|---|---|
| **0** | 11 | 9/0 · 2/0 | **0.238 / 0.343** |

Every phase re-measures and must hold **0 phantoms** and **margin max ≤ 0.343**. A phase that is
faster and loses the floor is **rejected**, however large the speedup. Better quality is welcome
even if it costs time; worse quality is not purchasable at any price.

Phantoms are the veto; among phantom-free candidates, rank by margin, then misses. At 2 353 occupied
crops, **miss differences below ~8 are noise**.

## What this is

The champion costs `CNN observation 80 ms for 64 crops = 2 prep + 77 session` on the device — 1.2 ms
per crop, all of it inside the ORT session. This pack attacks that number **without touching a
single weight**, so the floor is held by construction rather than by hope, and it verifies that
claim by measuring anyway.

| Spec | Phase | Depends on | Runs |
|---|---|---|---|
| `00-where-does-it-run.md` | Which EP actually executes the graph? Log the QNN partition. | — | **alone, first** — may reframe 01 and 03 |
| `01-verify-with-four-crops.md` | A move hypothesis touches 4 squares, not 64. Export and serve a small batch. | 00 (informational) | parallel with 02, 03 |
| `02-is-the-shipped-int8-model-still-honest.md` | `model.qnn.onnx` ships quantized and has **never** been measured on the veto metric. | — | parallel — this is a quality audit, not a speed phase |
| `03-the-2x-variance.md` | 70–165 ms for identical work. Throttling, or contention with the camera path? | 00 | parallel with 01, 02 |

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

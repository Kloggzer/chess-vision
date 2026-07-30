# 28 — Wider, not thinner

> Entry file. Read completely, then your phase file. The protocol of
> `specs/22-inference-resolution/entry.md` applies verbatim; deltas below. Branches are cut from the
> pack commit on `spec-24-frame-the-board`, **not from `main`**.

## The hypothesis

The shipped backbone is `mobilenetv4_conv_small_035` — 626 946 parameters, 46 convolutions, and a
width multiplier of **0.35**. Measured at the serving input (80×80, batch 64):

| group | MMACs / crop | share |
|---|---:|---:|
| `blocks.0` | 1.95 | **29.2 %** |
| `conv_stem` | 1.38 | **20.7 %** |
| `blocks.3` | 1.21 | 18.1 % |
| `blocks.2` | 1.01 | 15.2 % |
| `blocks.1` | 0.54 | 8.1 % |
| `conv_head` | 0.43 | 6.5 % |
| `blocks.4` | 0.15 | 2.2 % |
| **total** | **6.7** | — |

A whole 64-crop observation is **0.43 GMACs** and takes **32 ms cool** on an SM8650 — about
13 GMAC/s, a small fraction of what that chip's CPU can sustain. **The model is overhead-bound, not
compute-bound.** At 0.35 width the layers carry 16, 24 and 32 channels; each is dominated by memory
traffic and per-operator overhead rather than arithmetic.

MobileNetV4's own roofline argument says low-ridge-point hardware (CPUs) should minimise MACs. This
model has minimised them so far that it fell off the other side, where **removing MACs buys
nothing.** If that is true, then a **wider, shallower** network at a similar or even larger MAC
budget costs little more wall-clock and has far more capacity — the opposite of what the 0.35
multiplier does.

Two supporting observations, both measured:

- `conv_head` expands 336 → **1280** channels at 1×1 spatial, and `classifier` then maps 1280 → **2**.
  6.5 % of the compute and the widest tensor in the network, for a yes/no decision.
- `conv_stem` + `blocks.0` are **half** of all MACs. MobileNetV4 places expensive layers early
  deliberately, and the paper notes that this is expensive *on CPUs specifically* — which is the
  hardware we actually run on.

## What this pack is, and the order that makes it cheap

| Spec | Phase | Depends on | Runs |
|---|---|---|---|
| `00-does-width-cost-anything.md` | Measure candidate backbones **untrained** on the device. | — | **first, alone.** Minutes, no training. |
| `01-train-the-winner.md` | Only if 00 shows width is close to free. | 00 | gated |

**Phase 00 trains nothing.** An untrained network has exactly the same shape, the same graph and the
same latency as a trained one — so the "is width free?" question is answerable in minutes, and a
negative answer saves the training hour entirely. Do not skip it and do not reorder.

## The bar, if phase 01 ever runs

`occ-v6-f5nd` @ 80 px on `occ-real6` test, path A — **measured in the same run as the candidate,
never quoted**: today's reference is 1 phantom / 12 misses / margin 0.316 / 0.512. Phantoms are the
veto; then margin; misses below ~8 are noise. **A faster model that adds a phantom is rejected.**

## Established — do not re-derive, do not reopen

- **Normalisation is closed from both sides.** BatchNorm cannot be trained to this quality
  (specs/25, five measured causes); GroupNorm cannot be folded (specs/26 phase 04 — 2 350 phantoms,
  because per-channel sigmas inside one group differ by 9.7x). Any candidate here uses **GroupNorm**,
  via the repo's existing `--norm groupnorm` path. Do not revisit.
- **The graph is not the cost.** A coalesced 1-fragment CPU graph is 1.7x *slower* than the
  94-fragment XNNPACK one; NNAPI is 4.9x slower; QNN is not in the binary. Do not chase node counts.
- **80 px is the resolution optimum**, measured across `[48, 64, 80, 96]`. Any candidate is trained
  and served at 80, with the champion's `--scales 48,64,80,96`.
- **`val_acc` does not predict the veto metric** — in specs/25 it ranked runs in reverse. Only
  `scripts/sweep_infer_size.py --paths a --dataset occ-real6` decides accuracy.
- **`--patience 25`** on every training run: `occ_board_acc` is floored at 0 below ~`val_acc` 0.98,
  which early-stops an unconverged run *and* picks its checkpoint blindly.
- The champion's recipe is `scripts/run_v6_lowres.sh` — copy it, change **one** thing.

## Heavy-compute contract

- **Phase 00 does not train.** If it thinks it needs to, it has misread its phase.
- Phase 01 trains **one** chain, `--num-workers 4`, `--patience 25`. Take `data/_perf/.gpu-lock`
  before it and release it after. The GPU is the user's own machine and is also used for gaming.
- Device work takes `data/_perf/.device-lock`. Phone: `adb devices` → `f86dfdca`, SM8650, Android 16.
  Never `adb root`, never change system properties.

## Repo rules

- `.venv/Scripts/python.exe -m ruff check <your files>`, targeted `pytest`, once, at the end.
  Prefer `-m ruff` / `-m pytest` over `uv run`, which rebuilds the package and fails while
  `chesslab.exe` is in use.
- **Worktree bootstrap**: no `data/` (gitignored) and no `.venv`; junction `data/` in, set
  `PYTHONPATH` to your own `src/`, and **verify `chesslab.__file__` resolves inside your worktree**
  before measuring anything. Remove the junction before finishing — a teardown that follows it can
  delete the real data directory.
- Never commit anything under `data/`. Branch per phase, atomic conventional commits.

## Definition of done

Numbers, on the device where the phase says so, with a median and a spread over ≥ 30 observations —
the known spread is 2.1x and a single sample is not a measurement. Plus a STATUS row saying what the
phase established and what it excludes. **Negative results are complete deliverables**; this project
has landed seven of them in two days and they are why nobody will re-run those experiments.

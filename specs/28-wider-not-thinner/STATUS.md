# STATUS — 28 wider, not thinner

Branch per phase, cut from the pack commit on `spec-24-frame-the-board`, **not from `main`**:
`spec-28-00-width-cost`, `spec-28-01-train-the-winner`. Each agent in its own `git worktree`.

## Phases

| Phase | Concern | State | Notes |
|---|---|---|---|
| 00 | Does width cost anything on this hardware? | todo | **Untrained measurement, minutes.** Gates 01, including closing the pack. |
| 01 | Train the winner | todo | **Blocked by 00.** Only on a PROCEED. |

A **STOP** after 00 is an expected, valid end state and closes the last open model-level idea.

## The hypothesis in one table

`mobilenetv4_conv_small_035`, 626 946 parameters, 46 convolutions, at the serving input 80×80:

| group | MMACs / crop | share |
|---|---:|---:|
| `blocks.0` | 1.95 | 29.2 % |
| `conv_stem` | 1.38 | 20.7 % |
| `blocks.3` | 1.21 | 18.1 % |
| `blocks.2` | 1.01 | 15.2 % |
| `blocks.1` | 0.54 | 8.1 % |
| `conv_head` | 0.43 | 6.5 % |
| `blocks.4` | 0.15 | 2.2 % |

A 64-crop observation is **0.43 GMACs** and costs **32 ms cool** on the SM8650 — roughly 13 GMAC/s,
far below what that CPU sustains. The model is **overhead-bound**: at 0.35 width the layers carry
16, 24 and 32 channels, so memory traffic and per-operator overhead dominate the arithmetic.

If that holds, width is nearly free and the 0.35 multiplier is the wrong trade on this hardware.
Phase 00 tests it without training anything.

Two measured side observations: `conv_head` expands 336 → **1280** at 1×1 spatial before a **2**-way
classifier, and `conv_stem` + `blocks.0` are **half** of all MACs — which MobileNetV4 does on
purpose, and which its own paper notes is expensive *specifically on CPUs*.

## Results

| Candidate | params | MMACs/crop | nodes / executing | latency median (p10/p90) | verdict |
|---|---|---|---|---|---|
| A `mobilenetv4_conv_small_035` (shipped) | 626 946 | 6.7 | — / — | — | baseline |
| B `mobilenetv4_conv_small` (width 1.0) | — | — | — | — | — |
| C B with a narrowed head | — | — | — | — | — |

## Established — do not re-derive, do not reopen

- **Normalisation is closed from both sides**: BatchNorm untrainable to this quality (specs/25),
  GroupNorm unfoldable (specs/26 phase 04 — 2 350 phantoms, per-channel sigmas differ 9.7x inside one
  group). Candidates use GroupNorm.
- **The graph is not the cost**: a coalesced 1-fragment CPU graph is 1.7x *slower* than the
  94-fragment XNNPACK one; NNAPI 4.9x slower; QNN not in the binary. Do not chase node counts.
- **80 px is the resolution optimum** across `[48, 64, 80, 96]`.
- **`val_acc` does not predict the veto metric** — it ranked runs in reverse in specs/25.
- Today's reference for `occ-v6-f5nd` @ 80 px: **1 phantom / 12 misses / margin 0.316 / 0.512** —
  and it must be re-measured alongside any candidate, never quoted (the calibration profile moves
  path-A numbers).

## Session log

| Date | Phase | What happened |
|---|---|---|
| 2026-07-30 | — | Pack written after reading the MobileNetV4 architecture and measuring the per-stage MAC split, which nobody had done. |

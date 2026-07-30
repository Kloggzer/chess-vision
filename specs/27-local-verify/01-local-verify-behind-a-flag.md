# Phase 01 — A local verify, behind a flag, measured against the corpus

> **Gated by phase 00.** Do not start until phase 00's STATUS row says **PROCEED**. If it says STOP,
> record that this phase was not entered and why, and leave the branch unopened.

## Why

If phase 00 shows the whole-board guard's verdict is reproducible from the hypothesis's own squares
plus evidence the engine already has, then a verify that reads **4 crops instead of 64** becomes
legitimate — and specs/26 proved that costs 8.5 % of the CNN time at *numerically identical* outputs
(max abs diff exactly 0.0). On a device where the CNN runs 32 ms cool and 125 ms hot, that buys time
**and** heat, which is the only self-reinforcing loop available.

## Design (decided — do not redesign)

### The substitute for the count

The guard rejects a near-blind glance by demanding `confidentCount >= minConfidentBoard`. A local
observation cannot produce that number, so it must produce *equivalent evidence that the glance was
not blind*. The engine already has that evidence and it does not come from the CNN:

- the frame-difference / census stage knows which squares changed at pixel level;
- the occlusion and motion gates already pause detection under a hand (`darkLumaThr`, the census and
  motion thresholds);
- `touchedMask` (`VerifyPair.kt:173`) already computes the hypothesis's own squares.

So the local rung's precondition is: **the two hypothesis squares are label-confident, AND the
pixel-level evidence says the board was not occluded at that moment.** The CNN stops being the
occlusion detector — which it was only ever doing implicitly, by failing to be confident.

Whether that substitution is sound is exactly what phase 00 measured. Implement what phase 00's
data supports, not what this paragraph guesses.

### The flag

A new knob in `core-cnn/.../CnnConfig.kt` whose **default preserves today's behaviour exactly**.
`ConfigKnobs.kt` and `KnobCatalog.kt` carry it to the UI. Default off means: the corpus must produce
byte-identical move lists with the flag off, and that is the first thing to verify.

### The batch-4 path

`chesslab export --batch 4` already exists on branch `spec-26-01-four-crops` — **rebase onto it**,
do not re-implement the exporter. On the Android side a second session handle in
`OnnxSquareClassifier.kt`, used only by the local rung. Both graphs live in the asset; report the
added APK size and the second session's memory.

## Steps

1. `core-cnn/.../CnnConfig.kt` — commit `feat(cnn): a knob for the local verify rung, off by default`
2. `core-engine/.../VerifySingle.kt` + `VerifyPair.kt` — commit `feat(engine): verify a hypothesis from its own squares when the glance is not blind`
3. `app/.../cnn/OnnxSquareClassifier.kt` — commit `feat(android): a four-crop session for the local rung`
4. Replay the corpus, both flag states — no commit
5. Device measurement — no commit
6. Report — commit `docs(specs): 27 phase 01 — the local verify, measured`

## Tests

1. `test_flag_off_is_bit_identical` — every clip's move list with the flag off equals the recorded
   ground truth. **If this fails nothing else matters.**
2. `test_local_rung_rejects_a_blind_glance` — construct an observation where the hypothesis squares
   are unconfident and the pixel evidence says occluded; the rung must not fire. Prove it red first
   against an implementation that only checks the two squares.
3. `test_local_and_whole_board_agree_on_the_corpus` — for every rung evaluation in the clips, the
   local verdict equals the whole-board verdict, or the case is listed as a known, justified
   divergence.

```
gradlew.bat :app:testDebugUnitTest :app:ktlintCheck :app:detekt
uv run pytest -q tests/test_cnn_recovery.py
```

## Acceptance criteria

- [ ] Flag off: every clip's move list identical to the recorded ground truth.
- [ ] Flag on: **zero fabricated moves, zero phantoms** across the corpus. A single fabricated move
      rejects the phase regardless of the speedup.
- [ ] Every divergence between flag states listed individually with clip and ply.
- [ ] Device: CNN observation median and spread, flag on vs off, ≥ 30 samples each, from a cooled
      device (the known drift is 32 → 125 ms with temperature).
- [ ] APK size delta and the second session's resident memory.
- [ ] Python parity suite green.

## Do NOT / Out of scope

- Do **not** lower `minConfidentBoard`. It is a burden-of-proof rule; the local rung is a different
  rung with its own precondition, not a relaxed version of this one.
- Do **not** make the flag default-on in this phase. Shipping is a separate decision on the evidence.
- Do **not** change what the tracker verifies, only how many crops a verify costs.
- Do **not** touch the CNN weights, the quantization, or the resolution — all three are settled
  (specs/25, specs/26).

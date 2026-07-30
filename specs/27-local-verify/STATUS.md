# STATUS — 27 local verify

Branch per phase, cut from the pack commit on `spec-24-frame-the-board`, **not from `main`**:
`spec-27-00-audit-the-guard`, `spec-27-01-local-verify`. Each agent in its own `git worktree`.
Append to your own row only.

## Phases

| Phase | Concern | State | Notes |
|---|---|---|---|
| 00 | What does the whole-board guard actually catch? | todo | Measure only, no behaviour change. **Gates 01, including closing it.** |
| 01 | A local verify behind a flag | todo | **Blocked by 00.** Only if 00 says PROCEED. |

**A STOP after 00 is an expected, valid end state.**

## The prize, and why it is not collectable yet

specs/26 proved batch 4 costs **8.5 %** of batch 64 at *numerically identical* outputs (max abs diff
exactly **0.0**, on 4 synthetic crops and on all 7 040 crops of `occ-real6`). `chesslab export
--batch 4` exists on `spec-26-01-four-crops`.

Nothing calls it. Every verify rung needs a whole-board observation:

| rung | anchor | what it demands |
|---|---|---|
| `VerifySingle.ladder` rung 1 | `core-engine/.../VerifySingle.kt:120-133` | `sig.match && sig.confidentCount >= cnn.minConfidentBoard` |
| `VerifyPair` shadow accept | `VerifyPair.kt:71` | `before.match && nConf >= minConfidentBoard` |
| `VerifyPair` commit | `VerifyPair.kt:72` | `(after.match && nConf >= minConfidentBoard) \|\| pairAgree >= cnn.minAgreement` |
| `boardMatchesIdentityFull` | `core-cnn/.../Recovery.kt:267-278` | below the threshold → `inconclusive`, **never** a mismatch |

`minConfidentBoard` defaults to **32**. A 4-square observation has at most 4 confident squares, so
it is always below it and the rung always returns inconclusive.

**Lowering the threshold is not the fix.** The engine says why, twice, in nearly the same words
(`VerifySingle.kt:130-132`, `VerifyPair.kt:90-93`): with a hand over the board `resyncCheck` matches
**vacuously** — it agrees because it saw nothing, which is indistinguishable from agreeing because
it saw the right thing. The count is the burden of proof.

## The rule

Phantoms are the veto. A phantom licenses a fabricated capture and the recovery machinery cascades
an imaginary game out of it. **Faster plus one phantom is rejected.**

Stricter here than in specs/26: those phases could hold their floor *by construction* — same
weights, same crops, provably identical outputs. Nothing in this pack holds by construction, because
the change is in the decision logic. Everything must be measured on the clip corpus.

## The measurement of record

`android/app/src/test/kotlin/com/chesslab/tracker/sim/` — the committed-frame clip replay
(`CnnClipSimulationTest`, `SimClips`, `ObsAudit`). It caught five real bugs during the Android
rewrite and ran 18 clips at zero divergence against the Python tracker. Report moves emitted,
missed, fabricated, and every divergence. Do not invent a second harness; do not report latency as
evidence of safety.

## Established — do not re-derive

- Graph-level optimisation is closed from three sides: BatchNorm not trainable to this quality
  (specs/25), GroupNorm not foldable (specs/26 phase 04, 2 350 phantoms), and the fragmentation is
  not the cost at all (phase 05 — a coalesced 1-fragment CPU graph is **1.7x slower** than the
  94-fragment one; NNAPI is 4.9x slower; QNN is not in the binary).
- The CNN costs **32 ms cool · 66 ms in the tracker · 125 ms live at 39–41 °C** (max 654). Load and
  heat are the factor of 4, not the graph. Fewer crops buys time *and* heat.
- 80 px is the resolution optimum, measured across `[48, 64, 80, 96]`: 64 px triples the misses
  (27 of 33 on the phone session), 48 px gives 14 phantoms, 96 px gives 4.
- Per-channel A16W8 quantization is phantom-free where the shipped per-tensor graph has 1
  (specs/26 phase 02) — an unrelated, unshipped quality gain waiting on a decision.

## Session log

| Date | Phase | What happened |
|---|---|---|
| 2026-07-30 | — | Pack written after specs/26 proved the 8.2x and found nothing calls it. |

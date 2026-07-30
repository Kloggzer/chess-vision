# Phase 00 — What does the whole-board check actually catch?

## Why

The 8.2x on the CNN call is unreachable because every verify rung consumes a whole-board
observation, and the reason is stated twice in the engine's own comments — at
`core-engine/.../VerifySingle.kt:130-132` and `VerifyPair.kt:90-93`, in nearly the same words:

> the `minConfidentBoard` guard is the blind-glance protection: with a hand over the board
> `resyncCheck` matches **VACUOUSLY**, and without the guard a near-blind glance would …

That is an argument, not a measurement. Nobody has counted how often the guard actually fires, on
what evidence, or whether the situations it protects against occur in the recorded corpus at all.
This phase counts. It changes no behaviour.

**A "the guard never fires on this corpus" result does NOT license removing it** — it would mean the
corpus lacks the case, which is a statement about the corpus. Say which of the two you measured.

## Design (decided — do not redesign)

Instrument, replay, count. No engine logic changes; nothing under `core-cnn/` or `core-engine/` is
modified except by adding a read-only probe if one cannot be added from the test side.

### The three rungs to instrument

1. `VerifySingle.ladder` (`VerifySingle.kt:120-133`) — rung 1 requires
   `sig.match && sig.confidentCount >= cnn.minConfidentBoard`.
2. `VerifyPair.tick` (`VerifyPair.kt:44-72`) — two `resyncCheck` calls over the whole board, then
   `before.match && nConf >= minConfidentBoard` for the shadow accept and
   `(after.match && nConf >= minConfidentBoard) || pairAgree >= cnn.minAgreement` for the commit.
   **Note the `||`: a whole-board occupancy agreement (`pairAgreement`, `VerifyPair.kt:194-203`)
   already provides an alternative to identity matching. Measure both legs separately.**
3. `boardMatchesIdentityFull` (`core-cnn/.../Recovery.kt:267-278`) — the `inconclusive` return
   below the threshold.

### What to record, per rung evaluation, per clip

- `confidentCount` (the actual number, not the boolean) and `minConfidentBoard`.
- Whether the rung fired, and if not, which conjunct failed: the match, the count, or both.
- **The counterfactual that is the whole point:** would a check restricted to the hypothesis's own
  two squares (`fromSq`, `toSq` — already computed at `VerifySingle.kt:272-273`) have reached the
  same verdict? Record agreement, disagreement, and the direction of disagreement.
- Whether the observation was a blind glance: `confidentCount` well below 64 with the hypothesis
  squares themselves unconfident.

### The corpus

`android/app/src/test/kotlin/com/chesslab/tracker/sim/` — `CnnClipSimulationTest`, `SimClips`,
`ObsAudit`. Use `ObsAudit` as the model for a read-only auditor; it exists for exactly this. Run
**every** clip, not a sample.

The clips include arm sweeps across the board per move, so occluded and partially-blind glances are
present by construction — check that they are, and report the count. If they are not, the
counterfactual is untested on the case that matters and the phase must say so loudly.

## Steps

### 1. `app/src/test/.../sim/VerifyLadderAudit.kt` (new) — commit `test(sim): audit what the whole-board guard decides`

A read-only auditor over the existing clip replay. If the rung internals are not observable from the
test side, add the **narrowest possible** accessor rather than restructuring the ladder — and say in
STATUS what you had to open up.

### 2. Run the corpus and tabulate — no commit

### 3. Report — commit `docs(specs): 27 phase 00 — what the whole-board guard catches`

The report must answer, in numbers:

- How often each rung was evaluated, fired, and was blocked by the count rather than the match.
- On how many evaluations a two-square check would have agreed with the whole-board verdict.
- **Every disagreement, individually**: clip, ply, what the whole board saw, what two squares would
  have seen, and which direction the error would have gone. A single case where local accepts what
  the whole board rejects is the answer to this pack.
- How many blind-glance situations the corpus actually contains.

Then a verdict: **PROCEED** (the property is reproducible locally, phase 01 is worth building) or
**STOP** (it is not, and the 8.2x stays on the shelf).

## Tests

The auditor is test-side. Prove it measures something: assert on at least one clip that the recorded
`confidentCount` matches what the engine actually used, so the audit cannot silently drift from the
decision it claims to describe.

```
gradlew.bat :app:testDebugUnitTest --tests "*VerifyLadderAudit*" --tests "*CnnClipSimulation*"
gradlew.bat :app:ktlintCheck :app:detekt
```

## Acceptance criteria

- [ ] Every clip replayed; move lists **unchanged** from the recorded ground truth (this phase
      changes no behaviour — if a move list moves, the instrumentation is not read-only).
- [ ] The three tables above, with absolute counts, not percentages alone.
- [ ] Each disagreement listed individually with clip and ply.
- [ ] An explicit count of blind-glance situations in the corpus, and an explicit sentence saying
      whether the counterfactual was tested on them.
- [ ] A PROCEED/STOP verdict with its reason.
- [ ] `ktlintCheck`/`detekt` clean; no `@Suppress`.

## Do NOT / Out of scope

- Do **not** change `minConfidentBoard`, any threshold, or any rung.
- Do **not** implement a local verify. That is phase 01, and only if this phase says PROCEED.
- Do **not** touch the CNN, the exporter, or anything under `src/chesslab/`.
- Do **not** conclude "the guard is unnecessary" from an absence of firings. Absence on this corpus
  is a fact about this corpus; say it that way.

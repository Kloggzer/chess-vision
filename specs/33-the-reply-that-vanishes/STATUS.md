# specs/33 — the reply that vanishes, and the alarm that cannot fire

> Opened 2026-08-01 after a live report: "something about the flow is broken — in the Python app an
> illegal move showed a red frame, that path seems unreachable now". Four agents, two primed with
> the orchestrator's hypotheses and two given only a description of the app, were asked to find it.
> The primed pair converged on the alarm; the unprimed pair found the cause of the desync that makes
> the alarm moot. Everything below is confirmed against source, and the two hypotheses the primed
> agents were given were both **refuted**.

## 1. The reply is dropped, and the reference swallows it

`VerifySingle.evaluate` decides single-verify against pair-verify like this:

```kotlin
val moves = pend.ucis.mapNotNull { legalMoveFor(it) }        // VerifySingle.kt:86
```

and `legalMoveFor` is, by its own KDoc, *"The legal move with this uci in the CURRENT position, or
null"* (`Dispatch.kt:140`). The Python it was ported from does not filter at all:

```python
pend_moves = [chess.Move.from_uci(u) for u in self._pending_ucis(pending)]   # tracker.py:2194
...
if len(pend_moves) > 1:                             # pair candidate (fast play)
    self._verify_pair_tick(pending, pend_moves, board_snap, snap, recovery)
```

A pair candidate is `[move, reply]`, and the reply was generated on the board **after** the move was
pushed. In the pre-move position the reply's from-square still holds an enemy piece, so the reply is
never among the side-to-move's legal moves, `mapNotNull` always drops it, and `moves.size` is always
1. **`VerifyPair.tick` is unreachable in production.**

The damage is not the dead branch. `applyVerdict` repeats the same filter (`Dispatch.kt:120`) and
commits `moves[0]` alone, then anchors the new reference on `CommitAnchor(pend.cur, pend.curBgr)`
(`Dispatch.kt:119`) — the averaged frame that **already shows both half-moves**. The reply is
baked into the reference and can never be detected again: a silent, permanent one-ply desync.

It is a CNN-only defect. `pairBeforeSingle` runs `if (cnnOn)` (`Hypothesis.kt:163`), and it exists
precisely so a reply landing inside the same settle window is not swallowed by a net-positive
single. With `cnnVerify = true` shipping, every fast-play pair takes the broken route.

This is the failure the clip `live-1244-fastplay` was pinned for. Its manifest says the desync at
ply 2 would be caught by *"the pair-before-single ordering that only runs with the CNN attached"*.
That ordering does run. The next stage throws the reply away.

**Why no test caught it:** `VerifyPairTest` calls `VerifyPair.tick` directly
(`VerifyPairFixtures.kt:134`), never through the seam, and no clip fixture drives a pair.

## 2. The alarm cannot fire on the shipped build

Both raise sites — `Alarm.kt:120` via the stable-mismatch streak and `Alarm.kt:71` via the
quiet-re-anchor veto — require piece identity. `classesHaveIdentity` (`core-cnn/Observations.kt:11`)
is false for `["empty","occupied"]`, and **all six bundled models are 2-class**: `shipped`, `v6-80`,
`v4-128`, `bn35-80`, `bn50-80`, `bn100-80`. `observationFromProbs` then returns an observation with
no label map at all (`:43`), so `hasIdentity` is permanently false.

This is asserted as intended behaviour (`AlarmLatchTest.occupancyOnlyObservationNeverAlarms`) — but
the consequence was not followed through. Everything that *acts* on a desync is gated on the alarm
being latched: the commit block (`Dispatch.kt:45`), the pending discard (`VerifySingle.kt:51`), the
noise-EMA freeze (`NoiseLearning.kt:26`), the re-anchor refusal (`TrackerEngine.kt:406`). So the
engine detects the mismatch — it sets `cnnStatus = "mismatch"`, fills the conflict set, marks
`stuck: cnn_desync` — and then does nothing with any of it.

Python picks the newest run in `data/models/`, where 14-class models exist, which is why the red
frame was there. The Android UI for it is complete and richer than Python's: alarm card with the
conflict squares and three actions, a danger scrim and hard border over the whole board
(`BoardCanvas.kt:84-131`), `POSITION LOST` in the header, a notification and a spoken announcement.
None of it is missing. It is never triggered.

## 3. Three holes that keep a desync alive once it exists

- **A blind glance reports "match".** `resyncCheckFull` (`core-cnn/Resync.kt:17`) computes conflicts
  only over confident squares, so zero confident squares gives an empty conflict set, `match = true`
  and agreement 1.0. `onMatchOk` then clears the alarm and re-anchors on that frame
  (`CnnTick.kt:149-169`). The verify ladder guards exactly this with `minConfidentBoard`
  (`VerifySingle.kt:133`); the periodic check does not. Python shares the hole.
- **The recovery vote is switched off by its own default.** `CONFIRM_FRAMES_CNN = 1`
  (`TrackerConfig.kt:92`) while the comment above the confirmer reads *"Voting, not single-shot: the
  legacy port pushed a whole sequence onto the board on ONE glance (specs/12 D6). The recovery
  confirmer is what makes it multi-observation evidence."* At 1 the confirmer passes on the first
  call, so a 4-ply sequence commits on a single observation — the exact regression specs/12 fixed.
- **The anomaly patcher heals the evidence away.** `maybePatchAnomaly` (`AnomalyPatcher.kt:46`)
  copies persistently-changed cells into the reference after 5 s (occupied) / 30 s (empty), with no
  alarm check and no CNN check. A square that differs *because the board moved on* is patched, and
  the diff channel then agrees with the wrong game state permanently.

And the acceptance margin is one square wide: `minAgreement 0.97` over ~50 confident squares plus
`marginSquares = 1` (`TrackerConfig.kt`). One wrongly-read square is the model's dominant error —
the file's own note records 8 826 misses against 226 phantoms over 1 366 observations. That is the
machinery that manufactures the extra move.

## 4. Why none of this was visible

The parity fixtures were emitted with the **CNN detached** — the meta files carry the no-CNN counts
(`avgFrames: 3`, `confirmFrames: 2`) — and the only CNN fixtures are 34 rows of synthetic
probabilities over 13- and 14-class lists. **The shipped 2-class path has zero fixture coverage**,
and `CnnClipSimulationTest` is opt-in and does not assert move lists.

The device could not tell anyone either: the app emitted exactly three log tags, none of which
records a state transition, a skip reason or a decision. That gap was closed on 2026-08-01 —
`skip=` and `luma=` now ride on the perf line — which is how the dark-gate defect below was found.

## 5. Separately: the dark-frame gate read the blue channel

`BoardWarps.lumaPreClahe` ran `Core.mean` on the CV_8UC3 BGR warp and took `.val[0]` — the mean of
**blue**. The KDoc said luma; the clip harness and the Python original both convert to gray first.
Under warm light a well-lit board reads a mean blue of single digits against `darkLumaThr = 18`, so
detection pauses while `publishBoard` keeps running and the preview looks fine. Fixed and tested.

## Refuted along the way

- *"`resolveNote` outranks the alarm"* — no, the alarm is rung 1 (`StatusPublisher.kt:50`). But one
  layer up `StatusUiModel.infoLine` ranks `stuckReason` above the note, and a latched alarm always
  sets `stuck: no_legal_move`, so the prose line beside a red board shows the wrong reason.
- *"The alarm needs a still-correct board, so a desync disables it"* — no, a desync is what it
  detects. The real limit is that the engine never tests the legality of a physical action at all;
  it only ever proposes moves from `board.legalMoves()`, so an illegal placement is caught only
  indirectly, when the CNN sees a board no legal sequence within `recoveryMaxPlies = 4` explains.

## Order of work, cheapest first

1. **Parse the pending ucis instead of filtering them** (`VerifySingle.kt:86`, `Dispatch.kt:120`) —
   restores `VerifyPair` and stops the reply being swallowed. One line each, plus a test that drives
   `TrackerEngine` through attach → pair dispatch → snapshot and asserts `DECIDER_CNN_PAIR`.
2. **Give the occupancy axis its own latch predicate** (`Alarm.kt:78`): latch when the stable
   conflict set holds a square confidently empty while believed occupied. Needs no labels, reuses
   the streak, the seq dedup and the latch unchanged, and everything downstream then works.
3. Guard `onMatchOk` with `minConfidentBoard`; skip the anomaly patcher while `stuckReason ==
   "cnn_desync"`. Without these, 2 is undone by drift.
4. Re-emit the parity fixtures with a model attached, and fix `emit_parity_fixtures.py`'s
   `margin = 0.0` first — on real ArUco material it oversizes the contour by 6-8 % and stalls the
   tracker.

## 6. What the screen can and cannot say (fourth agent, unprimed)

The engine emits 8 event kinds and 4 status channels; the app adds 5 more. Python shows them in six
independent elements. Android collapses all of them into **one two-line `Text`**
(`TrackingScreen.kt:215`) fed by a single ranked resolver. Confirmed consequences:

- **A dead tracker is indistinguishable from an idle one.** `publish()` is called only from
  `TrackerCoordinator.kt:62`, i.e. only on a delivered frame, and the status is a conflated
  `StateFlow` — so when frames stop, the last sample stands forever and the screen keeps reading
  `WAITING · 14.8 fps`. The `"no frames"` / `"no detection"` branches
  (`StatusUiModel.kt:196-212`) are evaluated inside `build()`, which only runs from `publish()`:
  the condition they exist to catch is the one that stops them running. Same symptom from
  `TrackerCamera.kt:304`, which wraps the analyzer chain in `runCatching` and logs only — Python
  surfaces `"tracker loop crashed — see log; restart the tracker."`
- **The alarm never leaves the tracking screen.** `TrackerService.onEvent:336-344` re-posts the
  notification only for committed moves, and while alarmed the engine blocks every commit — so the
  notification freezes and never updates. It carries `status.state`, never the note. Yet
  `StatusPublisher.kt:47-49` documents the note as *"the only alarm signal that reaches the user
  with the app in the background"* and `NotePrecedenceTest` asserts on that premise.
  `TrackerNotification.kt` has never rendered the note. The premise was false when written.
- **`CameraHealth.Down` is unreachable.** `TrackerCamera.kt:301` forces `Up` immediately before
  invoking the sink at `:304`, and `:233` is the only writer — so both camera rungs of the resolver
  can never fire. `NotePrecedenceTest` passes because it calls the resolver with a value production
  cannot produce.
- **Three refusals are computed and dropped**: promotion rejection (`TrackerEngine.kt:265-271`,
  returns a `Note` that has no consumer, and the dialog stays open), accept-CNN-position rejection
  (`:291-298`, the note is then overwritten by the still-latched alarm), and CNN recovery progress
  during an alarm (`CnnTick.kt:194,202`, masked by the same rung).
- **`stuckReason` outranks the pipeline note, which is backwards.** `EngineHost.kt:110` runs the
  engine only when a frame arrives, so on a skipped frame `stuckReason` is by construction stale
  while the pipeline note is about the current frame. A hand over the board followed by the lights
  going out shows `stuck: too_many_changed`, never `frame too dark`.
- **The board preview is published BEFORE the dark gate** (`FramePipeline.kt:173` against `:176`),
  so the strongest liveness cue on the screen is fed upstream of the thing that paused detection.

Checked on the device and **ruled out**: the sticky `CnnState.Failed` masking hypothesis. The log
reads `CNN EP verified: XNNPACK, warm-up 22 ms for 64 crops` and `classes=2` — the attach succeeded.

# From camera frame to committed move

The tracker runs on the phone and, through `:desktop`, on a PC — the same modules either way.
For what each stage costs, see `chesslabPerf`; for what it decided, the `chesslabDecision` row.
This page is the engine's topic doc: the path, its binding rules, recovery, the alarm, and the
stalls that were explained.

Two paths leave the pipeline and only one of them is per-frame. The **diff path** is synchronous:
every frame goes through it and a move can be committed inside that call. The **CNN path** is
asynchronous and sparse: it is asked for a reading a few times a second at most, off the frame
thread, and its answer arrives later as a snapshot the engine drains on some subsequent frame.

```mermaid
flowchart TD
    CAM["camera frame<br/>(ImageProxy on the phone, Mat from a file or webcam)"]
    CONVERT["convert — YUV → BGR<br/><i>host-specific; the only typed seam</i>"]
    LENS["Stage.LENS — undistort<br/><i>off unless a calibration matches</i>"]
    PUBLISH["publish frame<br/>→ preview, calibration tap, live align"]
    WARP["detection warp<br/><i>boardSize × detectScale</i>"]
    DARK["dark gate<br/><i>luma before CLAHE</i>"]
    GRAY["gray + CLAHE"]
    MOTION["ROI motion<br/><i>board quad + margin</i>"]
    GRID["grid coverage"]
    INPUT(["FrameInput"])

    CAM --> CONVERT --> LENS --> PUBLISH --> WARP --> DARK
    DARK -->|too dark| SKIP["skipped — no detection this frame"]
    DARK -->|usable| GRAY --> MOTION --> GRID --> INPUT

    INPUT --> ENGINE

    subgraph ENGINE["engine — synchronous, same frame"]
        DIFF["per-square evidence z<br/><i>gray + census, fused</i>"]
        VETO["vetoes<br/>shadow · occlusion · CNN conflict"]
        HYPO["score hypotheses<br/><i>which legal move explains the changed set</i>"]
        GATES["commit gates<br/>settle · confirm · evidence floor · motion recency"]
        COMMIT["board.push(move)"]
        REJECT["rejected — reason recorded"]
        DIFF --> VETO --> HYPO --> GATES
        GATES -->|passes| COMMIT
        GATES -->|fails| REJECT
    end

    COMMIT --> RESULT(["MoveCommitted<br/>new FEN, decider, SAN"])
    REJECT --> ROW(["chesslabDecision row"])
    COMMIT --> ROW

    WARP -.->|"only when asked"| CROPS["crop store<br/><i>bordered full-res warp</i>"]

    subgraph CNNPATH["CNN — asynchronous, a few times a second"]
        CROPS --> OBS["CnnObserver<br/><i>64 crops → ONNX</i>"]
        OBS --> SNAP["CnnSnapshot<br/><i>per-square occupancy + identity</i>"]
        SNAP --> QUEUE["snapshot queue"]
    end

    QUEUE -.->|drained on a later frame| ROUTE{"pending candidate?"}
    ROUTE -->|yes| VERIFY["VerifySingle / pair ladder"]
    ROUTE -->|no| TICK["cnnTick<br/><i>evaluator? due?</i>"]
    VERIFY --> GATES
    TICK --> VETO

    classDef broken fill:#5a1a1a,stroke:#ff6b6b,stroke-width:2px,color:#fff
    class CROPS,OBS,SNAP,QUEUE broken
```

## The measured break (not confirmed for live)

On `rec-20260807-135238.mp4` (8 820 frames, classifier attached and verified) a run printed
`cnnSnaps=0/0/0/0`: no snapshot ever reached the engine, which places the break in the red band —
between the detection warp and the crop store, or in the observer — not in the engine. `specs/53`
later measured `CnnSnapshot.gridOccluded` reaching the verify ladder in REPLAY. One of the two does
not describe the live path; re-measure before quoting either.

`cnnSnaps=<seen>/<to the ladder>/<no evaluator>/<gate closed>`: the second value is the number of
observations that ever reached the verify ladder. Without snapshots the occlusion filter falls back
to ">2 changed squares = a hand" and the pair ladder has nothing to verify against.

## Reading a run

```bash
./gradlew :desktop:run --args="replay <video> quiet lens"        # numbers only
./gradlew :desktop:run --args="replay <video> dump=10 lens"      # + annotated board PNGs
./gradlew :desktop:run --args="replay <video> nocnn"             # the diff path alone
```

Without `quiet` or `dump` a window shows the rectified board tinted by what the engine did with each
square, and it STOPS when the engine gets stuck.

---

# The engine's binding rules

Moved out of the retired spec tree (`docs/specs-index.md`); `git show fd9c1908:specs/<pack>/…`
still reaches the originals. Project-wide rules are in `CLAUDE.md`, dead ends that died on a
measurement in `docs/specs-index.md`.

## The 14 correctness invariants (`specs/17`)

The traps that broke the first Kotlin port. Violating one is silent and fatal. Each has a named
test; anchors re-checked 2026-08-20.

| # | Invariant | Anchor today |
|---|---|---|
| 1 | **Two warps per frame.** Detection runs at `detSize = boardSize × detectScale` = 1600 × 0.5 = **800**. CNN crops come from a *separate* full-resolution **bordered** warp (`cropBorderPx`). `refGray`, `refBgr` and every `CnnSnapshot.warped/gray` are at `detSize`. | `api/TrackerConfig.detSize` |
| 2 | **Shadow veto removes a square from `changed` but PRESERVES its z** — a vacated square often reads as uniform darkening. **Occlusion veto ZEROES z.** Swapping them breaks everything quietly. | `Vetoes.applyVetoes` (preserve) vs `Taint.kt` (zero) |
| 3 | The `>2 → occluded` state gate counts the **raw undilated** occluded core, never the dilated set. | `BaselineOcclusion.core` |
| 4 | **Tainted/latched squares count toward `maxChanged`** (`blockedN = tainted.countOneBits()`) even though their z is zeroed. | `Hypothesis.kt` |
| 5 | **Anchoring is path-specific.** *Recovery* anchors on `snap.gray` / `snap.warped`, the frame the CNN looked at. *Verify* anchors on `pending.cur` / `pending.curBgr`, the averaged frame the candidate was raised from. **Neither may anchor on `lastCur`.** | `CnnTick.kt` vs `VerifySingle.kt` / `VerifyPair.kt` |
| 6 | `setRef(fromCommit = true)` must **NOT** rebuild the colour gamut. Only the quiet re-anchor may. | `Commit.setRef`: `if (!fromCommit) markGamutStale(curBgr)` |
| 7 | Census `eps` stays **0**, padding is **BORDER_REPLICATE**, never a wrap/roll. `eps > 0` breaks monotone-brightness invariance; a roll compares row 0 against the last row. | `Census.kt` |
| 8 | `censusThr` (**40.0**) compares against the **RAW** census channel (`censRaw`), not the median-normalized one, which can pull a structurally changed destination under the threshold: the phantom-shadow-as-destination class. | `Vetoes.kt`, `censForVeto` |
| 9 | **The alarm freezes noise learning AND blocks every commit, re-anchor and pending candidate.** Release only via explicit user correction or a verified restore — otherwise the alarm "heals" by drift instead of by correction. | `NoiseLearning.kt`: `if (alarm != null) return` |
| 10 | **`cnn_overrule` must be expressible**: the verify verdict carries a *replacement move*. Legacy D3 could not — the real move landed a cycle late. | decider `cnn_overrule`, `core-cnn/Recovery.kt` |
| 11 | Corner order is `[a8, h8, h1, a1]` for all geometry. CNN crop order is `all_squares()` = `a1,b1,…,h1,a2,…,h8`. Do not confuse them. | `api/TrackerStatus.kt`, `Bitboard.kt` |
| 12 | One source of truth for defaults. The Python tracker and the docs this named went on 2026-08-07; engine defaults live in `api/TrackerConfig.kt` alone. | `api/TrackerConfig.kt` |
| 13 | Every terminal in the verify ladder passes the multi-glance vote (`verifyObsVotes = 2` consecutive identical outcomes) — never act on one glance. | `api/TrackerConfig.verifyObsVotes` |
| 14 | **`LatestFrame` semantics:** the frame source must **never** deliver the same frame twice. A repeated frame diffs to zero and reads as "stable" while a hand is waving. | `STRATEGY_KEEP_ONLY_LATEST`, `TrackerCamera.kt` |

## What the engine remembers (`specs/39`)

Apart from undo, almost nothing bases a decision on a previous decision, and mostly it should stay
that way — most ways of adding memory make the tracker confidently wrong for longer.

- **`decisionLog` is write-only as evidence**: read only by the undo trim, the `setFen` clear, the
  fold in `DecisionLog.kt` and the debug payload.
- **The diff channel never ranks the null hypothesis** (`loglikScores` scores only legal moves;
  "nothing moved" exists only as `commitLlFloor`). The **recovery** channel does —
  `deriveMovesDeepFull` seeds the empty sequence.
- **`stuckCount` saturates at 3** — read once, as `stuckCount >= settleFrames` in `evaluationDue`.
- **`cnnMarginSquares = 1` is the fabrication mechanism**: one chronically misread square buys a
  whole bridge. A margin question, not a memory question.
- **`anomalySince` / `anomalyStart[64]`** heals a persistently changed square into the reference on
  a timer and is **deliberately disabled while the CNN disagrees** (`AnomalyPatcher.kt`): healing a
  real desync makes the tracker agree with the wrong position permanently.
- `guessIllegalMove` answers only exactly-one-vacated-and-one-received; everything else escalates
  through `desyncStandoffObsN = 12`. The recovery confirmer needs `RECOVERY_MIN_VOTES = 2`.

## Refused on structure

Recorded so nobody re-proposes them without new evidence.

| Idea | Why it was refused |
|---|---|
| HMM / Viterbi smoothing over the position chain *as the live path* | The error is **systematic per square** (`f4` misread in 90 of 186 observations); correlated noise makes a smoother more confident in the wrong answer. See the chain below — it stays an instrument. |
| Lower a gate when a candidate keeps failing it | It manufactures phantoms, and phantoms are the veto. |
| Suppress a chronically conflicting square in recovery | The same square is also the only evidence of a real desync. Undecidable without "which squares are chronically wrong". |
| Beam over positions | Approved, never built (`specs/10`): K ≤ 4 branches, depth ≤ 4 plies, merge on equal FEN, re-anchor only on the consensus, frozen while the alarm is latched, **not a replacement for the alarm**. It does not fix illegal moves. |

**Logit prior (superseded refusal, 2026-08-23).** The snapshot carries the conditioned view, the
pixels-only view and the raw mass on forbidden labels as an explicit `invalid` outcome. Verify
alone sees the conditioned view; recovery, resync, hand gates and the illegal-move alarm see raw.
Lambda 4 won over four fully swept videos (111 plies): found 73 / missed 38 / invented 4 against
71/40/6 at lambda 0 (1 and 2: 68/43/5), never worse on a session. Today each model's `prior_lambda`
carries it as a migration value, exactly 4,0 × T, not a per-model measurement (`docs/engine-fuzz.md`).

## Recovery

Four rules, each from a measured starvation (2026-08-23):

- **Alarm conflicts resolve on occupancy only.** Exact identity on every conflict square made
  unrelated N/B/R misreads keep the alarm permanent.
- **Entering verification does not reset the recovery confirmer**; the streak freezes for the
  verification. The reset had kept a correct `c3e4` read at vote 1 of 2 for 1 800 frames.
- **An open recovery vote is due unconditionally.** A vote wants two looks at the SAME board;
  `cnnCooldownS` between them delivered the second 3.3 s later, two plies on.
- **A replay tracks from the first frame**, like the phone; the fixed two-second pre-roll lead cost
  a whole recording. `start=` remains the explicit instrument.

**A commit under a hand poisons the reference** (built, measured, reverted): `commitRecovery`
anchors `setRef` on the committing glance, and with a relaxed hand gate 00-39-57 fell from 65 found
to 27. Letting votes accrue under a hand but requiring a hand-free committing glance changed not a
single move. The clean-board demand keeps the diff reference honest.

**Why recovery cannot bridge a capture.** With the empty sequence as a free rival, a bridge of
length L resolving C occupancy conflicts is accepted only when

    C − L ≥ marginSquares

A capture's destination is occupied before and after, so it explains ONE square; a capture sequence
has C = L and never clears the bar at any depth. No ply price beats the default 1.00: price 0 found
all 67 plies of 00-39-57 but fabricated a three-ply bridge on 13-52-38, the exact failure the price
was introduced against, and the curve between is jagged. The limit is that `hits` is a BINARY count;
the step with payoff is a likelihood over the confident squares (`pOcc`, `pEmpty`, `conf`,
`runnerUpConf` are already carried). Not built.

**Labels that lost plies (2026-08-23):** a `cnn_pair` commit put a ply into the `fen_after` chain
but not the SAN list (fixed `9f08b117`, three labels repaired); `tests/test_candidate_move_chains.py`
guards it.

### The chain is an instrument (`scripts/chain_decode.py`)

User, 2026-08-24: *"ich möchte in Zukunft, dass der Offline-Tracker nie vom Live-Tracker divergiert
— der Offline-Tracker soll den Live-Tracker für Replays ermöglichen."* That offline tracker is
`desktop replay`, which runs the shipping `:core-engine`. `chain_decode.py` is a second algorithm
on purpose and may never become a production path; what it proves is ported into `:core-engine`
and re-measured through `replay`.

It is an HMM smoother over `model-reads.jsonl`: hidden state the position, transition one legal ply
or nothing, emission the recorded distribution weighted by `1 − coverage`, beam-pruned Viterbi.

- **The floor is calibration, not a guard.** A move costs ≈ 6.2 nats; a square floored at 1e-4 is
  worth up to 9.2, so inventing a move to fix one misread square pays. Floor **0.08** caps a square
  at 2.5 nats; 0.03–0.12 give the same answer.
- **Temperature T = 5** (any T from 5 to 100 is identical) shrinks the leverage of one square, so
  the move prior can win. At floor 0.08, T = 5, the six references come out **168 / 20 / 0**; every
  checkable ply is found without a phantom.
- **Per-square accuracy does not predict decode quality.** A newer model with fewer errors decoded
  far worse at T = 1: its errors were fewer but persistent and confident (`wP(1.00)` on every frame
  where the old model wobbled between 0.74 and 0.94). The metric for the tracker is calibration.
- As a committing FILTER (no lookahead) it loses 12 of 172 plies and falls below the live tracker on
  13-52-38 — it is not a replacement.

### The rank does the classifier's work

Non-pawn pieces read correctly: rank 4 **8 %**, rank 7 **10 %**, rank 8 57 %. On rank 7 a misread
piece becomes `bP` **85 %** of the time. A turntable recording with the army shifted two ranks
inward shows the other side: pawns off ranks 2/7 fall to 44–76 % (84–98 % there), and `bP → wP`
becomes the top confusion where colour error over the recordings is 0.7 %. That recording is the
only measure of the rank shortcut and of colour robustness; training on it spends the hold-out.

## The frame-seq contract (`specs/11`)

**A decision made at frame N may only be verified or arbitrated by an observation with
`seq >= N`.** Implicit call-order pairing is how the `lastCur` bug (invariant 5) happened.

| Consumer | Rule |
|---|---|
| Pending candidates | Carry the seq of the newest frame in the averaged buffer that produced them. |
| Verify, single and pair | Return immediately when `snap.seq < pending.seq`. A stale observation neither confirms nor rejects a newer candidate. |
| Occlusion filter | Freshness bound instead: fall back to the no-CNN heuristic when the observation is older than 3.0 s. |
| Alarm / desync counting | Counts **distinct observations**, not evaluations. |

`Alarm.kt` cites "Spec 11 seq contract" on `advanceDesyncStreak`; it resolves here. Kotlin
refinement: an unstable conflict set restarts the streak at **one**, never zero.

## Resync: the auto arm (`specs/37`, `specs/52`)

`autoResyncObsN` = consecutive clean CNN looks that adopt the observed board while the alarm is
latched. **0 = off, the phone default** (show-then-press). n = 12 and n = 3 never fired (3: 221 of
222 hand-free alarmed reads failed the kings guard deep in the drift). **n = 1** is the replay
setting: rec-20260808-115912 61 → 87 plies, 85 of 87 matching by LCS. Hand reads **pause** the
streak; the arm only fires near the divergence point.

**Reachability, not playability (`specs/53`).** An adopted position with the side NOT to move in
check generates moves fine and crashed the deep search plies later. The guard flips the side to move
and refuses if the opponent is in check (`TrackerEngine.reachable`,
`ResyncTest.aPositionWithTheOpponentInCheckIsNeverAdopted`). "Can it generate moves" passed the
crashing position.

## Dense evaluation is not a default (`specs/52`, `specs/53`)

`cnnCheckIntervalS 0.15` + `cnnCooldownS 0.07` with n = 1 reached 229/229 on the blitz video but
**14 / 11 / 6** on rec-20260807 (veto). Dense sampling hits the mid-hand moments; with an
`occluded` class served it got worse on both videos. Nothing yet buys 229/229 without phantoms.

**The 12-phantom autopsy (2026-08-09):** all 12 were `cnn_recovery`, none resync or ladder. The same
board difference explained by a longer sequence (`Kd1`…`Ke1` parity filler) because
`deriveMovesDeepFull` ranked hits first and length only as tiebreak. Fixed by pricing length
(`cnnPlyCostSquares` 1). `P_OCCLUDED_THR` was not involved — do not retune it for this.

## Evaluation cadence: read on settle (2026-08-24)

`evaluationDue` reads as soon as the board settles after a disturbance instead of by the clock, and
stays silent until the next one (`cnnEvalOnSettle`). **304 / 90 / 7 against 302 / 92 / 9** over ten
recordings; on the device the latency tail goes: median 0.29 → 0.19 s, max 2.15 → 0.37 s. The
counter hangs on `ready`, not on motion start — counted at the start there were 14× the events and
the first version lost 27 plies (275/119/3). Why fewer reads do not hurt: *Emissions are
correlated*, below.

## Holds and deadlines (`specs/19`)

- **Latency ≈ hold + 0.05–0.07 s** at 30 fps in every run. `motionHoldS` was 0.20 as the time a
  hand needs to leave the board; the optimiser set 0.1592 on 2026-09-20
  (`docs/regression-reference.md`). What commits earlier is `commitHoldS` (`docs/commit-latency.md` §4).
- **No threshold decision from one run.** The committed move list is not a smooth function of any
  parameter: `motion_hold_s` 0.40 → 9 plies, 0.35 → 18, 0.30 → 6, 0.25 → 14, 0.15 → 0.
- **`verifyTimeoutS = 1.5`** bounds a stalled observer, which no model speed fixes. Over 66 pending
  candidates, committing ones sat at local agreement 1.000, discarded ones at ≤ 0.75, and agreement
  never rose inside a window — `cnnMinAgreement = 0.97` sits in an empty gap and needs no tuning.
  Expiry discards rather than commits: no late commit exists in the data.

## Two engine cache keys, not one (`specs/46`)

| | FEN fields kept | Symbol |
|---|---|---|
| Engine cache | placement, side, castling, en passant, **halfmove clock** | `canonicalEnginePosition`, `analysis/ReviewStore.kt` |
| Opening name | placement, side, castling | `openingPositionKey`, `analysis/OpeningBook.kt` |

The fifty-move clock changes what the engine may claim, so it stays in the engine key; a name cannot
depend on it. `cacheIdentity` folds nodes, cap, threads, hash and MultiPV into the key.

---

# Alarm und Latch

Der Latch ist die folgenreichste Handlung des Motors — er hält Commits an, bis ein Mensch
zurücknimmt oder resynct (Invariante 9).

**Die Kette:** `onStableMismatch` → `advanceDesyncStreak` → `raiseAlarmIfDue` → `latchAlarm`. Die
Serie zählt DISTINKTE Beobachtungen mit stabilem Konfliktsatz (`desyncObsN` = 3). Zweiter Weg: der
Standoff (`desyncStandoffObsN` = 12) für Konflikte, die `guessIllegalMove` nie nennt — Rochade
(2-und-2) oder ein einzelnes Feld (1-und-0).

**Der Latch trägt den KERN** (`f7e2cf1a`): die Schnittmenge über die Serie (`desyncConflicts`),
nicht die letzte Beobachtung — sonst müsste die Erholung ein Feld erklären, das nur einmal auffiel.
Eine leere Schnittmenge setzt die Serie auf eins zurück.

**Was ihn zurückhält:**

```kotlin
private fun EngineState.alarmDeferred(): Boolean =
    handInFrame() || desyncObs < config.desyncObsN + config.alarmDeferObs
```

Alle drei Latch-Stellen fragen das; **die Serie läuft weiter**, nur das Einrasten wartet.
`handInFrame()` ist die Vereinigung aller Occlusion-Signale (Engine-Latch, Veto-Set des Frames,
Coverage-Kopf, Rillen-Arm); am Gerät ist der Rillen-Arm aus, sobald das Modell Coverage deklariert.
`alarmDeferObs` (Vorgabe 0) zählt in Beobachtungen, nicht Sekunden: die Test-Rigs rufen nach dem
Referenzframe nur `observe()`, die Uhr steht.

**Was er sagt** — `alarmGuessSan`, nach Handlungsbedarf: `castling not available` (König zwei Felder
ohne Rechte), `it is White/Black to move` (Figur der anderen Seite), `you are in check`, sonst
`illegal move suspected`. Wer am Zug ist, steht über dem Schach. `guessIllegalMove` filtert NICHT
nach Zugrecht, deshalb greift der Falsche-Seite-Zweig. Karte, Sprache und Timeline lesen dieselbe
Funktion.

**Wenn die Diff-Kette allein feststeckt:** ein Kandidat unter `commitLlFloor` = 2.0 lässt die
Referenz stehen, der nächste Frame schlägt denselben Zug vor — gemessen 70-mal `Kf1` in 9 s ohne
eine CNN-Auswertung. `refusedStreak` öffnet das Tor nach `refusedStreakForEval` = 3 identischen
Ablehnungen, gedeckelt durch `cnnCooldownS`. Im Korpus löst es nie aus, ist also für seinen Zweck
ungetestet.

**Offen:** der Diff-Referenzanker zieht nur bei einem Commit nach; ein Replay, das nie committet,
erholt sich nie (`specs/40`, `specs/41`: der Stillstand trat später ein, nicht seltener).

# Verifier-Stillstand: lila Felder, die bleiben

Gemeldet (2026-08-30): *„manchmal ist der verifier stuck, da werden lila felder nicht
aufgeloest"*. `diag-150.ndjson`: 314 s, 204 von 205 Entscheidungen abgelehnt, `verifyOutcome` leer,
`changed` dauerhaft 13–17 Felder auf Reihe 7/8, `motion` im Median 0,0, kurz davor ein Gitter-Refit
nach 0,26 Zellen Drift.

**1. Der Verifier kommt nicht vor.** `pending` entsteht nur in `Dispatch.dispatch`, nach einem
Kandidaten, der `commitGates` passiert — bei 13–17 Feldern fällt `tooMuchChangeGate`. Ohne
`pending` kein Urteil. Und leer hieß zweierlei: `applyVerdict` räumte `pending` vor
`recordDecision`, also trug die entschiedene Zeile `verify=` leer. `EngineState.verdictOutcome`
trägt den Spruch jetzt eine Zeile weit; leer heißt nur noch „nie geurteilt".

**2. Ein Refit muss die Pixel-Referenz kosten.** `LiveAlign.expireCorrection` warf bei
`DRIFT_REFIT_CELLS` = 0,25 die Korrektur weg, die Referenz blieb — danach verglich jeder Frame unter
NEUER Rektifizierung gegen eine Referenz unter der ALTEN. `Guards.cornersJumped` (`cornerJumpPx` =
6 px, 4,8 % einer Zelle) fängt das nicht: 0,26 Zellen sind ~32 px. Die hinterste Reihe trifft es
am stärksten, dort ist die Quell-Zelle am kleinsten. Jetzt: `onRectificationChanged` →
`EngineAction.RectificationChanged` → `TrackerEngine.rectificationChanged` verwirft die visuelle
Referenz. **Nicht** `captureBaseline`: der räumt den Alarm-Latch mit weg, und ein verrutschtes
Brett sagt nichts darüber, ob Stellung und Brett wieder passen (Invariante 9). Der Refit wird in
beide Richtungen geloggt. Die 0,25 ist gesetzt, nicht gemessen.

**3. Das Verfallsdatum ist im Fehlerfall zu.** `maybePatchAnomaly` zieht ein dauerhaft geändertes
Feld nach (`nudgeTimeoutS` 5 s besetzt, `driftWindowS` 30 s leer), aber nur bei
`n <= maxChanged + CHANGED_CEILING_SLACK` („resting-hand protection") und ohne Desync —
`cnnStatus == "mismatch"` hat keinen Ablauf, gelöscht nur von `onMatchOk` oder einem Commit. Die
Decke zu lockern heißt, unter einer Hand zu patchen; das Hand-Kriterium gehört an die Hand-Signale
(`locatedHand`, `gridHandSquares`, `motion`) und an einer Aufnahme gemessen (`TODO.md`).
`too_many_changed`, `no_legal_move` und `cnn_desync` sind dabei derselbe Zustand: `changed` wird nie
0, es gibt keinen Re-Anchor, und `onMatchOk` hängt an `cnnAgree`.

**4. Der abgelehnte Kandidat kam im nächsten Bild wieder (2026-09-06).** Nach „Schatten"/„Geist"
blieb die Referenz, dieselbe Ablehnung wiederholte sich, und die Recovery kam nie dran. Jetzt reicht
`TrackerEngine` nach `VERIFY_STATE_GHOST`/`VERIFY_STATE_SHADOW` dieselbe Beobachtung an
`cnnTick(afterRejectedVerify = true)`; Legalität, Hand-Sperren und die Zwei-Stimmen-Regel gelten,
ein Treffer verankert nicht neu (Invariante 5). Ablehnungen der Leiter werden nicht mehr gefaltet.
Commit-Latenz max 35,2 → 4,7 s, Phantome überall 0. Verworfen: Schatten-Urteile bei unlesbaren
Zugfeldern nicht verankern (5 Phantome auf 00-39-57). Die Rest-Ausreißer von 12–18 s sitzen im
Warten auf Ruhe, nicht in der Verifikation.

# Die Entscheidungszeile mischt zwei Frames (2026-09-22)

Während `pending` steht, bricht `tryDetect` in `detectGuards()` ab — vor `computeEvidence` und
`applyVetoes` —, aber `FrameLoop.updateBaselineOcclusion` schreibt weiter. Eine
Verify-Commit-Zeile trug deshalb `changed` vom **Hebungs-Frame** und
`shadowVetoed`/`occludedVetoed` vom **Commit-Frame**. Beweis am Log: `applyVetoes` baut
`shadowVetoed` nur aus `hot = {z >= 3,0}` (Invariante `shadowVetoed ⊆ hot`), die Zeile trug
`changed=[g1 h1 h3 f2]` mit `shadowVeto=e1,f1,f2,g1`.

**Gebaut:** die Vetos werden beim Heben eingefroren (`shadowVetoedAtLift`). Das ändert kein Ply,
hat aber an einem Tag drei Erklärungsketten gekippt. Zwei Lesefallen dazu: `occlVeto=` leer beweist
nicht, dass nichts verdeckt war (100-ms-Keepalive), und `refProvisional=true` heißt nur
`nowS < refHoldUntil`.

**Der `Rg1`-Fall** (2026-09-19-15-50-28, 7. O-O): bei seq 1388 wurde `e1g1` erzeugt und von
`sightSettled` verworfen (Hand auf e1/f1), bei 1389 blieb `{g1, h1}` — und „h1 leer, g1 besetzt"
sieht aus wie eine fertige Rochade. Ein Riegel auf der Feld-Achse (Kandidat verwerfen, wenn ein
anderer legaler Zug sich nur auf getainteten Feldern unterscheidet) wird **nicht** gebaut:
`cleanCommitsOnly` fängt denselben Frame (`REJECT h1g1 … hand in frame`, einen Frame später
`COMMIT e1g1`).

# Schattenveto: ein Schalter für beide Arme (2026-09-21)

`state.shadowVetoed` hat zwei Schreiber: `FrameLoop.updateBaselineOcclusion` und
`Vetoes.applyVetoes` (HSV plus Census). `baselineOcclusion=0` schaltete nur den ersten ab; der Lauf
„ohne Schattenveto" trug noch sechsmal `shadowVeto=`. Beide hängen jetzt am selben Schalter
(`VetoesTest.theShadowVetoFollowsTheBaselineOcclusionSwitch`, ohne Fix rot gesehen). Auf den
Vorgaben verhaltensgleich: 396/3/0 bei 8 Desync-Episoden. Ein Schalter, der nur die Hälfte
abschaltet, erzeugt eine Messung, die wie eine Antwort aussieht.

# Schlagzug auf besetztes Feld (2026-09-19)

Fünf Schlagzüge hintereinander auf c8 (`real-c8-exchange`): `Rxc8+` wartete am Gerät **19,7 s**,
im Replay 19,5 s. Nicht die Bildrate, nicht das CNN, kein Alarm, kein Modell (alle sechs gebündelten
kommen auf dieselbe Summe).

**Ursache:** `Taint.cnnOcclusionFilter` entschied nur über die Belegung — ein Schlagzug auf ein
besetztes Feld ändert sie nie, galt also als Verdecker, und `applyTaints` nullte sein `z`: 0,00 über
217 Frames, während Grau 77 und Census 99 zeigten.

**Fix:** `identityDisagrees` — liest das Modell dort SICHER eine andere Figur als das Brett führt,
ist es der Zug. Schwelle `taintIdentityThr`. Verglichen wird in derselben Form (`board.labelAt`);
die erste Fassung verglich `"bB"` mit `'b'`, war immer wahr und schaltete den Verdeckungsschutz für
jedes sicher gelesene besetzte Feld ab. `TaintIdentityTest` hält beide Richtungen: andere Figur →
kein Verdecker, dieselbe Figur (Hand darüber) → weiter Verdecker. Mit dem korrigierten Vergleich
committet `Rxc8+` bei Frame 202 statt 432, **15,4 s früher**; der Rest frameidentisch.

**Wo der Wert steht:** Vorgabe **0,5** in `TrackerConfig` (`ff92051b`; die Python-Paritäts-Fixtures
setzen ausdrücklich 0), `NOT_A_SETTING`, kein Regler im Spiel (Nutzer). Schema 7 setzt den bei
Schema 6 gespeicherten Wert 0 zurück, die übrigen Einstellungen bleiben.

**Der Regressionssatz misst diese Achse nicht:** 396/3/0/171 bei 5 Alarmen mit intaktem UND mit
abgeschaltetem Verdeckungsschutz. „Regressionssatz unverändert" sagt hier weniger, als es klingt.

**Verworfen:** die Silhouette („Turm sieht aus wie Turm") — `diff` stand die ganze Zeit auf 77; und
`SquareNoise` — der EMA lernt eine stehende Änderung zwar in fünf Frames unter `zThr`
(`PersistentChangeLearnedAwayTest`), liefert aber nie exakt 0,00.

**Der Clip:** `data/testclips-real/real-c8-exchange.mp4` + `.labels.json`, replaybar als
`data/recordings/rxr-c8-20260919/` (6/0/0). Nicht in `tests/data/testclips/`: 53 MB, und der
Katalog braucht je Clip eine `parity/<name>/meta.json`, deren Erzeuger mit dem Python-Tracker
(`62583092`) ging.

# Emissionen sind korreliert (2026-08-24)

Ein HMM summiert Log-Likelihoods, als wäre jeder Read eine neue Ziehung. Das stimmt nicht.
Datenbasis: `model-reads.jsonl`, 20 Aufnahmen, ~1,2 M Feld-Reads; verdeckte Zellen (`cov > 0.15`)
sind ausgenommen — dort ist das FEN-Label nicht, wonach das Modell gefragt wird.

| | P(F \| Vorframe F) | P(F \| Vorframe ok) | ρ | effektiv |
|---|---|---|---|---|
| innerhalb einer Stellung | 0,918 | 0,018 | 0,901 | **19 Reads = 1** |
| über den Zug hinweg | 0,773 | 0,016 | 0,757 | **7 Stellungen = 1** |

Der Fehler überlebt den Zug: er ist eine Eigenschaft des Feldes. `--floor` in `chain_decode.py` ist
eine Korrelationskorrektur ohne diesen Namen.

**Warten kauft keine Unabhängigkeit** (2026-09-22, 13 Aufnahmen auf ~30 fps): ρ 0,904 bei 0,10 s,
0,849 bei 0,40 s, 0,797 bei 1,00 s, 0,798 bei 1,50 s — danach flach. `cnnCooldownS` ist eine
Kostenbremse, kein Mittel zur Unabhängigkeit. `scripts/emission_lag.py` verweigert eine gemischte
Zeitbasis (zehn Aufnahmen laufen auf ~15 fps).

**Weniger lesen ist besser:** nur jeder 5. Read hebt die Kette auf 16-20-41-33 von 57/9/19 auf
64/2/4 und auf 15-23-01-43 von 43/8/16 auf 51/0/0 (`--every`, `--temp 5`); jenseits von ~10 bricht
es ein. Zusätzliche Reads wiederholen denselben Fehler und überstimmen den Übergangs-Prior.

**Belegung setzt zurück, Identität nie:** `empty` irrt zu 1,2 % mit ρ 0,077; jede Figur irrt oft
und setzt nicht zurück (bis ρ 0,975), fast jede Verwechslung kollabiert zum Bauern. Aggregation
über Zeit kann nur `empty` verbessern — deshalb trägt der Tracker auf Belegung, nicht auf Identität.
Figur-Identität zu heben ist Daten- und Modellarbeit. Skripte: `emission_persistence.py`,
`persist_by_class.py`, `emission_lag.py`.

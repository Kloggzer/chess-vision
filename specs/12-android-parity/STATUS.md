# STATUS — 12 android parity port (2026-07-09 Python fixes)

Branch: `android-tracker` (continues pack 08's branch). Execution: sequential
(01 depends on 00), one fable agent session; supervisor reviews, runs the full
gate and merges.

## Phases

| Phase | File | Status | Notes |
|---|---|---|---|
| 00 | `00-engine-detection.md` | done | commits `790ae5f` (census fusion + guard + noise lanes + raw-core gate), `e33e7c9` (shadow destinations), `dd0939c` (latch invariant + blocked count), `1d92f82` (scope-cut cleanup, see D5). 13 new engine tests; `:engine:test` + ktlint/detekt green. |
| 01 | `01-safeguard-alarm.md` | done | commits `66791a5` (verify ladder + obs votes), `12513d2` (referee alarm + occupancy fallback), `df582d3` (seq contract + resting-hand taint), + UI banner/tone commit (this commit). 20+ new tests; `:engine:test` + `:app:testDebugUnitTest` (109) + ktlint/detekt both modules + one `:app:assembleDebug` green. |

## Discrepancies (spec vs code)

| # | Phase | Spec says | Code/ground truth | Impact |
|---|---|---|---|---|
| D1 | 00 | Port `_baseline_occlusion_and_shadow`'s band-limited census fast path. | Kotlin `Census.perSquareChange` computes full-image (identical results); band path is a Python-side optimization, intentionally not ported (pack 08 precedent). | None. |
| D2 | 01 | `entry.md`: defaults go into engine `TrackerConfig` (`desyncObsN` etc.). | `verifyObsVotes`/`desyncObsN`/`observerIntervalMs` live in the app's `CnnConfig` (the TRACK_DEFAULTS mirror for cnn_* keys, pack 08 phase 05 precedent) — the alarm STATE lives in the engine (`AlarmState`, `TrackerEngine.raiseAlarm/clearAlarm`), the counting in `CnnSafeguard`. | None — same defaults, seam documented. |
| D3 | 01 | Python's `cnn_overrule` commits the CNN's move. | Unchanged pack-08 discrepancy #13: the `VerifyVerdict` seam cannot carry a replacement move — outcome key `overrule:<uci>` votes, then rejects the pending candidate; the real move lands via diff/recovery next cycle. | Low. |
| D4 | 01 | Streaming-observer: all consumers read the shared `CnnSnapshot`. | ADAPTED as decided in entry.md: `CnnSafeguard.observerLoop()` (interval `observerIntervalMs`, default 0, min gap 100 ms) publishes seq-tagged `CnnSnapshot`s (`lastSnapshot` + `onObservation` → resting-hand taint via `TrackerEngine.reportObservation`); verify and recoveryTick still take their own observations (busy-flag serialized) but enforce the seq contract (`obs.seq >= candidate.seq`, desync dedup per seq). Freshness bound 3 s enforced engine-side (`Detector.OBS_MAX_AGE_S`). | Low — semantics identical, observation cadence differs. |
| D5 | 00/01 | Port debug-card/tuning surfaces (`struct_vals`, `shadow_blocked`, infer-time display, hover tooltip). | USER SCOPE DECISION (2026-07-10): the mobile app ports detection/safeguard LOGIC only — no debug-display or live-tuning surfaces. `structVals`/`shadowBlocked` remain internal `EngineState` fields (asserted by tests), removed from public `TrackerStatus` (`1d92f82`); inference time is measured (`CnnSnapshot.inferMs`) but not displayed; no settings toggle for votes/alarm sound (also outside the 5-line rule of 01-safeguard-alarm.md). | None for tracking behavior. |
| D6 | 01 | Python `_verify_tick` clears the recovery voting confirmer in several branches. | Pack 08 never ported `_recovery_confirmer` voting for recovery commits (recoveryTick applies directly); unchanged here. | Low — pre-existing pack-08 behavior. |
| D7 | 01 | Alarm banner text via `_build_alarm_guess_san` (SAN-ish incl. castling-rights reason). | Ported as `alarmDetail`/`guessDetail` in `TrackerCoordinator` (piece letter + `from->to` + reason, castling-rights check via FEN field 3); banner string in `strings.xml`, red Card, TalkBack live region, `ToneGenerator` beep max 1/30 s. | None. |

## Blockers

_none_

## Session log

- 2026-07-09/10 — phase 00 — done — `790ae5f`, `e33e7c9`, `dd0939c` (+ scope cut `1d92f82`): census evidence fusion (z_eff = max(z_gray, w·z_census), own noise model init_std 8/floor 2.5/slow lane 0.125, median-normalized census, global-disturbance channel guard, structural occlusion/shadow classifier with resurrected gamut at quiet re-anchor, occlusion_color_thr 1.5→3.0, raw-core state gate), moveDestinationSquares + shadow-destination rule (viability/pair/endpoint), latch motion-or-baseline release + blocked_n = |tainted|.
- 2026-07-10 — phase 01 — done — `66791a5`, `12513d2`, `df582d3`, + UI commit: verify ladder parity (from-empty needs castling or whole-board derivation, to-arrived needs origin not confidently occupied, window fallback checks POST-move position, verifyObsVotes=2 on every ladder outcome), engine-side illegal-move alarm (desyncObsN=3, occupancy-conflict gated, guessIllegalMove/hasOccupancyConflict ports, blocks dispatch/pending/re-anchor/resync, recovery only when resolving ALL conflicts, cleared by take-back/resync with Discontinuity event), occupancy-axis fallback incl. occupancy deep-derive, seq contract + free-running observer (adapted) + resting-hand occluded-class taint, alarm banner + tone in TrackingScreen.

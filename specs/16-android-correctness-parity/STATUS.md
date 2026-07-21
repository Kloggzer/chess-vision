# STATUS — 16 Android correctness parity

Branch: `android-correctness-parity` (from `main`). Execution: ONE agent, sequential
00 → 01 → 02 → 03 → (04 optional). Supervisor (main session) reviews and commits.

## Phases

| Phase | File | Status | Notes |
|---|---|---|---|
| 00 | `00-pair-verify.md` | done | fast-accept (`pairAgree`, min 3 checked) + window-end parity fallback + occlusion timeout in `evaluatePair`; pair shadow/commit terminals now `votes=true` (CnnSafeguard needed no change — vote loop is generic). 5 new tests; OccupancyVerifierTest 22/22, CnnSafeguardTest 16/16 green. |
| 01 | `01-alarm-noise-freeze.md` | done | both `state.alarm == null` gates in `Detector.kt` (step-4 learning + census disturbance drop path); 2 new AlarmTest tests (freeze + resume control). :engine:test 96/96 green, ktlint clean, detekt 0 new (2 pre-existing ReturnCount findings in untouched functions). |
| 02 | `02-reanchor-cnn-veto.md` | done | conflict channel (`EngineState.cnnOccupancyConflicts`/`cnnConflictsTsS`, `reportObservation` 3rd param), `cnn_desync` veto in `quietHandled` (5 s freshness), producer in `CnnIntegration.onObservation`; cleared in `setRef` + `undo` + `reset`/`renewBaseline`. :engine:test 98/98, app cnn tests 65/65. |
| 03 | `03-camera-reconnect.md` | done | `ReconnectPolicy` (3/6/12/24/30 s cap, reset-on-frame, one-shot diagnosis after 3), CameraState observer + rebind in `TrackerCamera` (observer re-attached per rebind, bind failure retries, single provider — `ProcessCameraProvider` count 3 unchanged), camera-down note via `TrackerCoordinator.onCameraState` overriding the engine note. Camera tests 8/8 (5 pre-existing + 3 new). |
| 04 | `04-alarm-ux.md` | done | pure `acceptCnnPosition` core (`cnn/AcceptCnnPosition.kt`, kings-guard, castling pruned, side preserved) + preview dialog & "Accept CNN" action in the alarm card; red board tint (`boardAlarmTint` scrim+border in `ChessBoard`); in-app CNN debug dialog (64 crops via shared `forEachCrop` provider + conf-sorted reads) behind the debug-card toggle. Apply path = `TrackerService.acceptCnnApply` → `coordinator.reset(fen)` (clears history+latch, re-captures reference). Tests 79/79 scoped. |

## Discrepancies (spec vs code)

- Entry/phase 00 name the test task `:app:testDebugUnitTest` — the app module has
  product flavors (`lab`/`stable`), the task is ambiguous; used
  `:app:testLabDebugUnitTest`.
- Phase 00 "Timeout with an occlusion note": `VerifyVerdict.Timeout` carries no
  reason field (engine module is out of scope for 00) — the occlusion case is
  distinguished via `VerifyStep.Decided(outcome = "occlusion-timeout")` only.
- `:app:detekt` is RED on branch start with 6 pre-existing findings in untouched
  files (SettingsRepository.kt, TrackerService.kt x2, OnnxClassifier.kt,
  IntrinsicGray.kt x2) — zero NEW findings from phase 00; not fixed (out of scope).
- `:app:ktlintFormat` reformats two untouched files (TrackerCamera.kt,
  OnnxClassifier.kt — pre-existing style drift); reverted those drive-bys to keep
  the phase diff scoped.
- `:engine:detekt` is also RED on branch start: 2 pre-existing ReturnCount
  findings (Detector.kt::znccLighting, SquareDiff.kt::squareZncc) in functions no
  phase touches — zero NEW findings from phase 01.
- Phase 02 clearing sites: `cnnOccluded` is reset only in `TrackerEngine.reset()` /
  `renewBaseline()`; commits/undo do not touch it. The conflict pair is therefore
  cleared in `EngineState.setRef` (covers commit, quiet re-anchor, CNN resync),
  in `TrackerEngine.undo()` (position change, no setRef), and mirrored in
  `reset()`/`renewBaseline()`. Python instead binds the snapshot to a FEN
  (`snap.fen == board.fen()`) — the Kotlin channel has no FEN, clearing replaces it.

## Blockers

_none_

## Session log

_(implementing agent appends one line per finished phase)_

- 2026-07-21 phase 00 done: `evaluatePair` rework ported from 165726b (`OccupancyVerifier.kt`), 5 new pair tests; scoped tests 38/38 green, ktlint clean, detekt: 0 new findings (6 pre-existing, see Discrepancies).
- 2026-07-21 phase 01 done: alarm freezes noise/census learning (Detector.kt, ports de6f84c); AlarmTest +2; :engine:test 96/96.
- 2026-07-21 phase 02 done: quiet re-anchor cnn_desync veto (ports 21cf63c) across engine + CnnIntegration producer; AlarmTest +2; :engine:test 98/98, app cnn 65/65.
- 2026-07-21 phase 03 done: CameraState error observer + backoff rebind (ports dba6f29/43fa7bb adapted); ReconnectPolicyTest 3/3, camera tests 8/8.
- 2026-07-21 phase 04 done: accept-CNN preview (ports 779fb86) + red alarm tint + in-app crops/reads debug (ports 6e31e35); AcceptCnnPositionTest 3/3, ChessBoardTest 3/3; scoped app tests 79/79.
- 2026-07-21 final gate: `.\gradlew.bat assembleDebug` BUILD SUCCESSFUL (1m16s, both flavors incl. native CMake/Stockfish). Working tree scope: android/** + this STATUS.md only (scripts/capture_empty_session.py was already modified before this run, untouched). `android/**/build/**` + `engine/bin/**` gitignore-covered.

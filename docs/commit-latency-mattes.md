# Standard-engine commit latency and hand mattes

Investigation: 2026-09-12. This is a source and existing-data audit, not a benchmark of a modified engine. No shipping defaults or labels were changed.

## What currently delays a commit

The phone's standard engine is `TrackerEngine`, constructed in `android/tracker-runtime/src/main/kotlin/com/chesslab/tracker/service/EngineHost.kt`. The same core is available to desktop replay.

`FrameInput` has motion and grid coverage, but no SAM matte. The CNN snapshot supplies model coverage through its observation and a grid occlusion map. Offline SAM coverage is training/evaluation evidence; it is not a live phone sensor.

In `FrameLoop.kt`, the ordinary diff path:

- Uses the maximum of board motion and surrounding ROI motion. A departing hand outside the board can therefore continue blocking detection.
- Clears averaging buffers and resets confirmation on motion.
- Requires three stable frames with CNN enabled, two frames for averaging, and expiration of `motionHoldS = 0.20`. These requirements overlap; they should not be added as independent delays.
- On grid occlusion clearing, drops both buffers and extends the hold by `occluderHoldS = 0.20`. That protects against averaged hand pixels.
- Can still be blocked by the baseline occlusion core after those gates pass.

`VerifySingle.kt` then refuses a verdict while either hand map is nonempty. A diff-confirming verdict needs one vote; opposing verdicts use the configured vote count. `CnnTick.kt` has a separate recovery path: its clean-board guard rejects hand flags anywhere, and its recovery vote requires distinct observations. `cleanCommitsOnly = false` does not disable these protections.

The current code already evaluates on settle (`cnnEvalOnSettle = true`) and lets an open recovery vote bypass the cooldown. Simply removing the 0.7-second cooldown is therefore not a general latency fix.

## What the existing mattes can establish

A read-only join of `log.jsonl` and `matte.jsonl` by frame stem, across the 23 recordings with mattes and candidates, found:

| Quantity | Count |
| --- | ---: |
| Exported frames | 10,017 |
| Exported frames with explicit coverage for all 64 squares | 6,274 |
| Those frames with maximum square coverage <= 0.01 | 1,715 |
| Moves in the stored candidates | 971 |
| Candidate moves with an explicit 64-square matte within three source frames | 620 |

The 0.01 cutoff is a descriptive audit threshold, not a proposed production threshold. The candidates include historical configurations and are not measurements of today's engine. Exported frames are sampled; these counts do not locate the exact first clear video frame. A missing matte must remain unknown, not become zero coverage. A zero matte is also a sensor assertion, not proof that a legal move finished.

## Recommended implementation sequence

1. Establish a replay latency baseline against reviewed physical move boundaries and explicit hand-clear measurements. Log the physical completion boundary, first clear frame, model-clear observation, candidate creation, and commit separately. Report median/p90 delay, early commits, missed moves, invented moves, and inference cost. Existing candidate commit frames alone are not independent timing truth.
2. Add a narrowly guarded clear-view path in the standard engine. A fresh model-clear observation should trigger evaluation without waiting for an unrelated ROI-motion tail or a fixed hold to expire. Require a unique legal result and fresh evidence of its changed squares, valid geometry, matching snapshot FEN/sequence, and existing alarm protection. Use clean current pixels or a rebuilt clean buffer; do not average in the departing hand. Missing/uncertain coverage keeps the current fallback path. First validate the clear predicate against the offline mattes, including false-clear hands.
3. Only then test commits while a hand remains elsewhere. Replace whole-board hand vetoes only where the candidate's required evidence is actually visible and rules out alternatives. Origin and destination alone are not a universal sufficient test: castling, en passant, captures, promotions, and competing legal hypotheses need their own evidence. An empty origin while the piece is held must never establish a completed move.
4. Keep game-state advancement separate from a clean visual reference. A partial-hand snapshot must not become an unrestricted whole-board diff baseline. Preserve or mask the affected reference regions until a clean reference can be obtained.

The target should be a commit on the first usable clear observation, with inference and frame-delivery latency measured separately. “No matte” cannot by itself guarantee a commit when a move is ambiguous, illegal, or visually unconfirmed.

## Label implications

The current exporter already recognizes that commit time is later than physical arrival. `realgames.measure_settle` measures a boundary per changed square against before/after anchors; `unknown_for` and `unknown_squares` protect uncertain cells. `position_flags.py` also inspects moved squares near ply boundaries. Coverage masks occluded classification targets, but does not fix a visible square carrying the wrong FEN label.

Persist and distinguish:

- Engine commit frame: when the application accepted the move.
- Per-square visual transition or uncertainty interval: when the source became empty, the destination acquired its piece, or a capture victim disappeared.
- Hand-clear frame: when the board became unobscured.

For example, during e2-e4 the source may already be empty while e4 is still empty. Neither the complete before-FEN nor the complete after-FEN describes that physical intermediate state. Keep unaffected squares labelable; use visible per-square truth where reviewed, and mark ambiguous transition cells unknown. Apply the same treatment after an early commit until the relevant squares demonstrably match the final state. Do not globally relabel all squares at the earlier commit timestamp.

The existing settle measurement uses future anchors and is suitable for offline labels; it must not leak into a live-engine evaluation as causal evidence.

## Validation before changing defaults

Replay baseline and candidate under identical models, geometry, and phone-like frame sampling. Include resting hands, lifted-and-replaced pieces, captures, castling, en passant, promotion, fast successive moves, camera shifts, and known phantom regressions. Compare both move correctness and delay relative to reviewed physical boundaries. Kotlin tests should cover stale snapshots, missing coverage, contradictory evidence, and reference contamination. A source-only latency estimate is not sufficient evidence to ship lower holds.

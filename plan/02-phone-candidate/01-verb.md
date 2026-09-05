# Phase 01 — The verb: `desktop phone-candidate <recordingDir>`

## Why

`candidate.json` is only ever written by a replay, which runs the tracker over every frame. For a
bundle with a record the replay's plies are the record's anyway (`phone_log`); only the scan and the
frame index per ply are needed. Read `STATUS.md` → Notes first: it holds the rule order and
`PHONE_FRAME_OFFSET` Phase 00 measured.

## Design (decided — do not redesign)

New file `android/desktop/src/main/kotlin/com/chesslab/desktop/PhoneCandidate.kt`:

```kotlin
/** Measured by plan/02-phone-candidate Phase 00 (STATUS.md → Notes); frames, may be negative. */
internal const val PHONE_FRAME_OFFSET: Int = <value from STATUS.md>

internal data class TimelineRows(          // read once from timeline.jsonl
    val syncs: List<Pair<Long, Long>>,     // (elapsedNs, durationNs) — the shape videoNsAt takes
    val frames: List<FrameRow>,            // FrameRow(elapsedNs, wallTsMs, fen: String?)
    val decisions: List<DecisionRow>,      // accepted only: DecisionRow(ply, elapsedNs)
    val events: List<Pair<Long, Long>>,    // (elapsedNs, wallTsMs)
) { companion object { fun read(timeline: File): TimelineRows } }

/** Which rule placed a ply — goes into source.rule and the log line. */
internal enum class TimeRule { FRAME, DECISION, WALL }

/** The pack's time rule in the ORDER STATUS.md fixes; each rule yields elapsedNs or null. */
internal class PhoneClock(private val rows: TimelineRows, private val order: List<TimeRule>) {
    /** Only rows with elapsedNs > afterNs count (monotone plies, entry.md); null when every rule fails. */
    fun elapsedNs(ply: Int, fenAfter: String, tsEpochMs: Long, afterNs: Long): Pair<Long, TimeRule>?
    fun videoMs(elapsedNs: Long): Double = RecordedFrames.videoNsAt(elapsedNs, rows.syncs) / 1e6
}

/** Decoded frame index per video time, collected during the scan's own decode pass. */
internal class FrameClock(private val timestampsMs: List<Double>) {
    fun indexAt(videoMs: Double): Int?     // first index with timestampMs >= videoMs; null past the end
}

internal class PhoneRefusal(message: String) : RuntimeException(message)
internal fun phoneCandidate(args: List<String>)                  // FILE_TOOLS entry; prints "refused: $msg", exit 1
internal fun buildPhoneCandidate(recordingDir: File, force: Boolean, model: String): File
internal fun buildPhoneCandidate(recordingDir: File, force: Boolean, spec: ModelSpec, scan: ScannedGeometry, frames: FrameClock): File
```

`buildPhoneCandidate(recordingDir, force, spec, scan, frames)`, in order (`PhoneRefusal` text in brackets):

1. `files/sessions/` holds exactly one directory → `sid`, `sessionDir` [`no session directory` / `n session directories`].
2. Record: `gameRecordFor(sessionDir, emptyList())` (`PhoneLog.kt:87`, made `internal`)
   [`no game record names session <sid>`]; decode with `decodeStoredGame` (`GameRecord.kt:33`);
   `segments = game.segmentsOrOne()` (`:201`); `segments[0].moves` non-empty [`first segment has no moves`];
   `note` = "<n> plies after a seam omitted" when `segments.size > 1` (n = the rest), else null.
3. `TimelineRows.read(timeline)` with `timeline` = `sessionDir/timeline.jsonl`, else the top-level
   file [`no timeline.jsonl`]; `syncs` non-empty [`timeline carries no video_sync rows`].
4. Plies: walk `segments[0].moves` on a chesslib `Board` from `segments[0].startFen` exactly as
   `gameMarks` does (`PhoneLog.kt:106-133`: `Move(uci, sideToMove)`, legality via
   `MoveGenerator.generateLegalMoves`) [`ply n <san> is not legal from <fen>`]; `fenAfter = board.fen`.
   `(elapsedNs, rule) = clock.elapsedNs(ply, fenAfter, tsEpochMs, afterNs = previous ply's elapsedNs,
   Long.MIN_VALUE for the first)`; null refuses [`ply n is out of order`] when an earlier row would have
   matched and [`ply n has no time in the timeline`] otherwise (the clock says which). Plies sharing a
   `tsEpochMs` share the previous ply's `elapsedNs` when their own rules find nothing new — that is the
   pair case, not an ordering error. `videoMs = clock.videoMs(elapsedNs)`;
   `frame = frames.indexAt(videoMs)?.plus(PHONE_FRAME_OFFSET)`, `null` or `< 0` refuses
   [`ply n lands outside the video`]. `PlyMark(ply, san, uci, fen = fenAfter, videoMs).committed(frame, videoMs)`
   (`LabelVerb.kt:270-283`, made `internal`) — `decider` stays `phone_log`.
5. `candidate.json` exists and `!force` → [`candidate.json exists — pass force=1 to replace`].
6. `geometry = replayBoardGeometry(cornersToFlat(scan.corners), recordingDir, null).withCropOf(spec)`
   (positional, `ReplayGeometry.kt:20-24`; the recording dir and `withCropOf` exactly as `DesktopMain.kt:390`);
   `source = buildJsonObject { put("kind","phone"); put("game", game.id);
   put("session", sid); put("rule", <rules used, joined by "|" in first-seen order>);
   put("offset_frames", PHONE_FRAME_OFFSET); put("crop", cropJson(geometry)) }` where `cropJson` is the
   `"crop"` block of `sourceJson` (`LabelVerb.kt:339-352`) extracted into an `internal fun
   cropJson(geometry: BoardGeometry): JsonObject` that `sourceJson` now calls — no other change there.
7. `candidateJson(name = recordingDir.name, videoRelative = relativeVideo(video, File(DATA_DIR))` (`DATA_DIR`,
   `LabelVerb.kt:359`, made `internal`)`,
   scan, source, effectiveConfig = <parsed settings.json (session dir, else top level) or empty object>,
   startFen = segments[0].startFen, LabelOutcome(plies, note, observations = 0, frames = timestamps.size,
   framesWritten = 0, drops = ""))`; `writeCandidate(recordingDir, json)`. Print
   `wrote <path>: <n> plies (rules <…>), offset <PHONE_FRAME_OFFSET>`.

The three-argument overload resolves `video` (`sessionDir/video.mp4`, else top level [`no video.mp4`])
and `spec` (the `ModelSpec` for `model`, resolved as the replay resolves its `model=` option — find via
`grep -n "withCropOf\|ModelSpec" DesktopMain.kt`), then one decode pass:
`openRecording(video).use { src -> val scan = GeometryScan(src.fps) { println("  $it") };
val stamps = ArrayList<Double>(); while (true) { val mat = src.next() ?: break; scan.offer(mat, src.timestampMs);
stamps += src.timestampMs }; scan.result() ?: throw PhoneRefusal("no sampled frame aligned to the board's grid") }`
(`LabelVerb.kt:125-135` shape; the `Mat` is owned and reused by the source, `FrameSource.kt:25-29` — do
NOT release it), then calls the five-argument one. `RecordedFrames.videoNsAt` (`RecordedFrames.kt:49`)
becomes `internal`, unchanged otherwise; `DATA_DIR` (`LabelVerb.kt:359`) becomes `internal`.
`phoneCandidate(args)` parses `force=1` and `model=<name>` (default `"real14-80"`) with the
`List<String>.option(...)` helpers the other file tools use (`PhoneLog.kt stringOption`, `LabeledVideoPack.kt:541`).
Register `"phone-candidate" to ::phoneCandidate` in `FILE_TOOLS` (`DesktopMain.kt:847-862`) and a
usage line beside `DesktopMain.kt:283`.

## Steps

1. `feat(desktop): PhoneClock and FrameClock place a recorded ply on the video` — `TimelineRows`,
   `TimeRule`, `PhoneClock`, `FrameClock`, `videoNsAt` internal, tests.
2. `feat(desktop): phone-candidate writes candidate.json from the record and the timeline` — the verb,
   `gameRecordFor`/`committed`/`DATA_DIR` internal, `cropJson`, the `FILE_TOOLS` entry, tests.

## Tests — `PhoneCandidateTest.kt` (new, beside `RecordedFramesTest.kt`; reuse its timeline helper style)

- `the frame rule takes the first frame row showing the position` — three frame rows, the second
  carries the ply's placement+side; `elapsedNs` is the second row's, rule `FRAME`.
- `a repeated placement after the bound is found again, an earlier one is not` — the transposition
  case: rows A(pos1) B(pos2) C(pos1); ply 3 asking for pos1 with `afterNs = B` yields C, not A.
- `the decision rule is used when no frame row shows the position`, `the wall rule is the last resort`
  (nearest row by wall time, slope 1: rows at wall 1000/2000 ms → `tsEpochMs 1400` lands 400 ms after the first).
- `the frame clock takes the first decoded frame at or after the video time` — stamps 0, 33.3, 66.7:
  `indexAt(40.0)` = 2, `indexAt(100.0)` = null.
- `the verb refuses a bundle without a record naming its session` (message contains `no game record`).
- `a two-segment record yields the first segment and a note`.
- `the verb writes an unconfirmed candidate whose plies replay to the record's last position` —
  fixture bundle (`files/sessions/x/timeline.jsonl` with syncs and frame rows carrying the FENs after
  `e2e4`/`e7e5`, `files/games/g.json` with `sessionId: "x"`, two moves, distinct `tsEpochMs`), the
  five-argument overload with a hand-built `ScannedGeometry(...)` (15 arguments, `GeometryScan.kt:44-63`),
  the `ModelSpec` the other desktop tests build (find via `grep -rn "ModelSpec(" android/desktop/src/test`),
  and `FrameClock(listOf(0.0, 33.3, 66.7, 100.0, 133.3))`. Assert `moves.size == 2`, distinct frames,
  `moves[1].fen_after` = position after `1. e4 e5`, `confirmed == false`, `decider == "phone_log"`,
  `source.kind == "phone"`, `source.crop.pad_side` present.

Commands (from `android/`): `.\gradlew.bat :desktop:ktlintFormat -q`, then
`.\gradlew.bat :desktop:ktlintCheck :desktop:test --tests '*PhoneCandidateTest*' --tests '*RecordedFramesTest*' --rerun-tasks -q`,
once `.\gradlew.bat :app:testDebugUnitTest --tests '*CommentBudget*' -q`.

## Acceptance

- Gradle commands exit 0; `PhoneCandidateTest` 8 passed; `RecordedFramesTest` count unchanged.
- `grep -c '"phone-candidate" to ::phoneCandidate' android/desktop/src/main/kotlin/com/chesslab/desktop/DesktopMain.kt` → 1.
- `grep -c "internal fun videoNsAt" …/RecordedFrames.kt` → 1; `grep -c "internal fun gameRecordFor" …/PhoneLog.kt` → 1;
  `grep -c "internal fun PlyMark.committed\|internal fun cropJson\|internal const val DATA_DIR" …/LabelVerb.kt` → 3.
- `grep -c "\.release()" …/PhoneCandidate.kt` → 0.
- `grep -c '"phone_log"' …/PhoneCandidate.kt` → 0 (the decider comes from `committed`, not a second literal).

## Do NOT

- Do not change `candidateJson`/`writeCandidate`, `gameMarks`, `sessionTimeline`, the replay, or any TypeScript.
- Do not compute frames from `fps`; do not read the phone's `log.jsonl` corners as geometry.

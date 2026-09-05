# Phase 01 — The verb: `desktop phone-candidate <recordingDir>`

## Why

`candidate.json` is only ever written by a replay (`LabelVerb.kt`, `RealGameCandidate.kt:259`). The
phone's record and timeline carry the same plies with times; nothing turns them into a candidate.

## Design (decided — do not redesign)

New file `android/desktop/src/main/kotlin/com/chesslab/desktop/PhoneCandidate.kt`:

```kotlin
/** Measured by plan/02-phone-candidate Phase 00 (STATUS.md → Notes); frames, may be negative. */
internal const val PHONE_FRAME_OFFSET: Int = <value from STATUS.md>

/** A `frame`/`event` row's two clocks, and a `video_sync` row's elapsed→duration pair. */
internal data class WallPoint(val wallTsMs: Long, val elapsedNs: Long)
internal data class SyncPoint(val elapsedNs: Long, val durationNs: Long)

/** The pack's one time rule, hops 1 and 2 (entry.md → Time bridge). */
internal class PhoneClock(walls: List<WallPoint>, syncs: List<SyncPoint>) {
    fun elapsedNs(tsEpochMs: Long): Long          // nearest wall point, slope 1
    fun videoNs(tsEpochMs: Long): Long            // RecordedFrames.videoNsAt(elapsedNs(ts), syncs)
    companion object { fun fromTimeline(timeline: File): PhoneClock?   // null: no sync or no wall rows
    }
}

/** Hop 3: decoded frame index per video time, collected during the scan's own decode pass. */
internal class FrameClock(private val timestampsMs: List<Double>) {
    fun indexAt(videoNs: Long): Int?              // first index with timestampMs >= videoNs / 1e6; null past the end
}

/** Refusals are one line on stdout, `refused: …`, exit 1 (the platform parses the prefix). */
internal class PhoneRefusal(message: String) : RuntimeException(message)

internal fun phoneCandidate(args: List<String>)          // the FILE_TOOLS entry; catches PhoneRefusal
internal fun buildPhoneCandidate(recordingDir: File, force: Boolean): File   // returns candidate.json
```

`buildPhoneCandidate`, in this order, each failure a `PhoneRefusal` with the words in brackets:

1. `files/sessions/` has exactly one directory → `sid` [`no session directory` / `n session directories`].
2. `files/games/*.json` decoded with `GameRecord.kt`'s reader (find via
   `grep -n "decodeFromJsonElement(StoredGame" android/tracker-runtime/src/main/kotlin/com/chesslab/tracker/games/GameRecord.kt`);
   exactly one with `sessionId == sid` [`no game record names session <sid>` / `n game records name …`];
   `segments.size <= 1` [`game has n segments — a seam cannot become one candidate`]; `moves` non-empty.
3. `timeline.jsonl`: the top-level file, else `files/sessions/<sid>/timeline.jsonl`;
   `PhoneClock.fromTimeline` [`timeline carries no video_sync rows` / `… no frame or event rows`].
   `RecordedFrames.videoNsAt` (`RecordedFrames.kt:48`) becomes `internal` and is called, not copied.
4. `video.mp4`: top level, else `files/sessions/<sid>/video.mp4` (the `chain.ts:52-64 videoOf`
   rule) [`no video.mp4`]. One decode pass of the verb's own: `openRecording(video).use { src ->
   val scan = GeometryScan(src.fps) { println("  $it") }; while (src.next()) { scan.offer(frame,
   src.timestampMs); stamps += src.timestampMs } }` — the ten lines of `LabelVerb.kt:125-135`
   `scanGeometry` plus the timestamp list; `scan.result()` [`no sampled frame aligned to the board's
   grid`], `FrameClock(stamps)`. (`FrameSource.kt:23-43`: `next()`, `timestampMs`, `fps`.)
5. Plies: `segments[0].moves` when `segments` is non-empty, else `moves`; `startFen` =
   `segments[0].startFen` / `game.startFen`; a second segment sets `note` =
   "<n> plies after a seam omitted". Walk them on a chesslib `Board`; `MoveList(board.fen)` +
   `loadFromSan`/`doMove` as `RealGameScore.kt:147` does; an unplayable SAN refuses
   [`ply n <san> is not legal from <fen>`]. `fenAfter = board.fen`.
   `videoNs = clock.videoNs(tsEpochMs)`; `frame = frameClock.indexAt(videoNs)?.plus(PHONE_FRAME_OFFSET)`;
   `null` or `< 0` refuses [`ply n lands outside the video`]. Plies sharing a `tsEpochMs` share the
   frame (entry.md). `CommittedPly(ply, san, uci, frame, t = videoNs / 1e9, decider = "phone",
   alarm = null, fenAfter)`.
6. `candidate.json` exists and `!force` → [`candidate.json exists — pass force=1 to replace`].
7. `candidateJson(name = recordingDir.name, videoRelative = relativeVideo(video, dataRoot),
   scan, source, effectiveConfig, startFen, LabelOutcome(plies, note, observations = 0,
   frames = stamps.size, framesWritten = 0, drops = ""))` with `source` as entry.md states and
   `effectiveConfig` = the parsed `settings.json` (top level, else session dir) when present, else
   an empty object; `writeCandidate(recordingDir, json)`. Print
   `wrote <path>: <n> plies, offset <PHONE_FRAME_OFFSET>`.

`dataRoot` for `relativeVideo`: `File(RECORDINGS_DIR).parentFile` (`LabelVerb.kt:357`).
Register in `DesktopMain.kt` `FILE_TOOLS` (`:847-862`) as `"phone-candidate" to ::phoneCandidate` and add
one usage line beside the other file tools (`DesktopMain.kt:283`, the `labeled-session-pack` line).

## Steps

1. `feat(desktop): PhoneClock maps a phone wall time onto the video` — `WallPoint`, `SyncPoint`,
   `PhoneClock`, `FrameClock`, `videoNsAt` internal, tests.
2. `feat(desktop): phone-candidate writes candidate.json from record and timeline` — the verb,
   the `FILE_TOOLS` entry, tests.

## Tests — `PhoneCandidateTest.kt` (new, beside `RecordedFramesTest.kt`; copy its timeline helper)

- `a wall time between two frame rows takes the nearer one and slope one` — wall points
  (1000 ms, 0 ns) and (2000 ms, 1e9 ns), one sync (0 ns → 0 ns duration): `videoNs(1400)` =
  400 000 000, `videoNs(1600)` = 600 000 000.
- `a wall time before the first row is negative, not clamped`.
- `the frame clock takes the first frame at or after the video time` — stamps 0, 33.3, 66.7 ms:
  `indexAt(40_000_000)` = 2, `indexAt(100_000_000)` = null.
- `the verb refuses a bundle without a record naming its session` — fixture dir with
  `files/sessions/x/` and an empty `files/games/`; message contains `no game record`.
- `a game with two segments yields the first segment and a note` — `moves.size` equals segment 0's, `note` names the omitted count.
- `the verb writes an unconfirmed candidate whose plies replay to the record's last position` —
  fixture with a two-ply record (`e2e4`, `e7e5`, distinct `tsEpochMs` inside the frame rows), a
  timeline with three syncs and five frame rows, and no video: factor the decode-independent part
  as `buildPhoneCandidate(recordingDir, force, scan: ScannedGeometry, frames: FrameClock)` and test
  THAT with a hand-built `ScannedGeometry(...)` (`GeometryScan.kt:44`) and `FrameClock(listOf(0.0,
  33.3, …))`; the outer function supplies the real pass. Assert `moves.size == 2`, distinct frames,
  `moves[1].fen_after` is the position after `1. e4 e5`, `confirmed == false`, `decider == "phone"`,
  `source.kind == "phone"`.

Command (from `android/`): `.\gradlew.bat :desktop:ktlintFormat -q` then
`.\gradlew.bat :desktop:ktlintCheck :desktop:test --tests '*PhoneCandidateTest*' --rerun-tasks -q`;
once at the end `.\gradlew.bat :app:testDebugUnitTest --tests '*CommentBudget*' -q`.

## Acceptance

- Both gradle commands exit 0; `PhoneCandidateTest` 6 passed.
- `grep -n '"phone-candidate" to ::phoneCandidate' android/desktop/src/main/kotlin/com/chesslab/desktop/DesktopMain.kt` → 1.
- `grep -c "internal fun videoNsAt" android/desktop/src/main/kotlin/com/chesslab/desktop/RecordedFrames.kt` → 1;
  `git diff --stat feat/phone-candidate -- android/desktop/src/main/kotlin/com/chesslab/desktop/LabelVerb.kt` prints nothing.
- `grep -c "PHONE_FRAME_OFFSET" android/desktop/src/main/kotlin/com/chesslab/desktop/PhoneCandidate.kt` ≥ 2.

## Do NOT

- Do not change `candidateJson`/`writeCandidate`, `LabelVerb.kt`, the replay, or any TypeScript;
  in `RecordedFrames.kt` only the visibility of `videoNsAt` changes.
- Do not read the phone's `log.jsonl` corners as geometry; do not run `installDist` in the worktree.

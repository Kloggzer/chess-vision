# Phase 01 — The verb: `desktop phone-candidate <recordingDir>`

## Why

`candidate.json` is only ever written by a replay (`LabelVerb.kt`, `RealGameCandidate.kt:259`). The
phone's record and timeline carry the same plies with times; nothing turns them into a candidate.

## Design (decided — do not redesign)

New file `android/desktop/src/main/kotlin/com/chesslab/desktop/PhoneCandidate.kt`:

```kotlin
/** Measured by plan/02-phone-candidate Phase 00 (STATUS.md → Notes); frames, may be negative. */
internal const val PHONE_FRAME_OFFSET: Int = <value from STATUS.md>

/** One `video_sync` row: the phone clock (elapsed, wall) at a known video duration. */
internal data class SyncPoint(val elapsedNs: Long, val wallTsMs: Long, val durationNs: Long)

/** The pack's one time rule: nearest sync by wall clock, slope 1 (RecordedFrames.videoNsAt reasoning). */
internal class PhoneClock(syncs: List<SyncPoint>) {
    fun videoNs(tsEpochMs: Long): Long
    fun frame(tsEpochMs: Long, fps: Double): Int   // round(videoNs / 1e9 * fps) + PHONE_FRAME_OFFSET
    companion object { fun fromTimeline(timeline: File): PhoneClock?   // null when no sync rows
    }
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
   `PhoneClock.fromTimeline` [`timeline carries no video_sync rows`].
4. `video.mp4` at top level [`no video.mp4`]; scan it exactly as `prepareLabel` does WITHOUT lens:
   `openRecording(video).use { it.scanGeometry(null) }` (`LabelVerb.kt:125`, change `private` →
   `internal`, nothing else) [`no sampled frame aligned to the board's grid`]; `fps = scan.fps`.
5. Plies: walk `moves` in order on a chesslib `Board` seeded with `startFen`; `MoveList(board.fen)`
   + `loadFromSan`/`doMove` as `RealGameScore.kt:147` does; an unplayable SAN/UCI refuses
   [`ply n <san> is not legal from <fen>`]. `fenAfter = board.fen`. `frame = clock.frame(tsEpochMs, fps)`;
   a frame `< 0` or beyond the video's frame count (`FrameSource`, find via
   `grep -n "frameCount\|totalFrames" RecordingSource.kt`) refuses [`ply n lands outside the video`].
   `CommittedPly(ply, san, uci, frame, t = frame / fps, decider = "phone", alarm = null, fenAfter)`.
6. `candidate.json` exists and `!force` → [`candidate.json exists — pass force=1 to replace`].
7. `candidateJson(name = recordingDir.name, videoRelative = relativeVideo(video, dataRoot),
   scan, source, effectiveConfig, startFen, LabelOutcome(plies, note = null, observations = 0,
   frames = <frame rows in the timeline>, framesWritten = 0, drops = ""))` with `source` and
   `effectiveConfig` as entry.md states (`effective_config` = the parsed top-level `settings.json`
   when present, else an empty object); `writeCandidate(recordingDir, json)`. Print
   `wrote <path>: <n> plies, offset <PHONE_FRAME_OFFSET>`.

`dataRoot` for `relativeVideo`: `File(RECORDINGS_DIR).parentFile` (`LabelVerb.kt:357`).
Register in `DesktopMain.kt` `FILE_TOOLS` (`:847-860`) as `"phone-candidate" to ::phoneCandidate` and add
one usage line beside the other file tools (find via `grep -n "labeled-session-pack <sessionDir>" DesktopMain.kt`).

## Steps

1. `feat(desktop): PhoneClock maps a phone wall time onto the video` — `SyncPoint`, `PhoneClock`, tests.
2. `feat(desktop): phone-candidate writes candidate.json from record and timeline` — the verb,
   `scanGeometry` internal, the `FILE_TOOLS` entry, tests.

## Tests — `PhoneCandidateTest.kt` (new, beside `RecordedFramesTest.kt`; copy its timeline helper)

- `a wall time between two syncs takes the nearer anchor and slope one` — syncs at wall 1000/2000 ms
  with durations 0/1 000 000 000 ns; `videoNs(1400)` = 400 000 000, `videoNs(1600)` = 600 000 000.
- `a wall time before the first sync is negative, not clamped`.
- `frame rounds and applies the offset` — `frame(…, fps = 30.0)` with a known offset.
- `the verb refuses a bundle without a record naming its session` — fixture dir with
  `files/sessions/x/` and an empty `files/games/`; message contains `no game record`.
- `the verb refuses a game with two segments`.
- `the verb writes an unconfirmed candidate whose plies replay to the record's last position` —
  fixture with a two-ply record (`e2e4`, `e7e5`, `tsEpochMs` inside the syncs), a timeline with three
  syncs and five frame rows, and a scan stub: since `scanGeometry` needs a video, factor the
  scan-independent part as `buildPhoneCandidate(recordingDir, force, scan: ScannedGeometry)` and
  test THAT with a `ScannedGeometry(...)` built by hand (`GeometryScan.kt:44`); the outer function
  supplies the real scan. Assert `moves.size == 2`, `moves[1].fen_after` is the position after
  `1. e4 e5`, `confirmed == false`, `decider == "phone"`, `source.kind == "phone"`.

Command (from `android/`): `.\gradlew.bat :desktop:ktlintFormat -q` then
`.\gradlew.bat :desktop:ktlintCheck :desktop:test --tests '*PhoneCandidateTest*' --rerun-tasks -q`;
once at the end `.\gradlew.bat :app:testDebugUnitTest --tests '*CommentBudget*' -q`.

## Acceptance

- Both gradle commands exit 0; `PhoneCandidateTest` 6 passed.
- `grep -n '"phone-candidate" to ::phoneCandidate' android/desktop/src/main/kotlin/com/chesslab/desktop/DesktopMain.kt` → 1.
- `grep -c "internal fun FrameSource.scanGeometry" android/desktop/src/main/kotlin/com/chesslab/desktop/LabelVerb.kt` → 1.
- `grep -c "PHONE_FRAME_OFFSET" android/desktop/src/main/kotlin/com/chesslab/desktop/PhoneCandidate.kt` ≥ 2.

## Do NOT

- Do not change `candidateJson`/`writeCandidate`, `RecordedFrames`, the replay, or any TypeScript.
- Do not read the phone's `log.jsonl` corners as geometry; do not run `installDist` in the worktree.

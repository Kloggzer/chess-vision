# Phase 08a — game library, PGN export, and optional session recording

> Module `:app`, packages `com.chesslab.tracker.games` and `com.chesslab.tracker.record`.
> Behaviour reference for the recorder: `src/chesslab/move_tracker/tracker.py`
> `_start_recorder_locked` `:2708-2723`, `_record_inventory_violations` `:2725-2730`,
> `_skip_recording_for_inventory` `:2732-2739`, `_skip_recording_for_geometry` `:2741-2758`,
> `_queue_session_capture` `:2760-2777`, `_flush_session_capture` `:2779-2803`,
> `start_recording` `:2805-2828`, `stop_recording` `:2830-…`; decision provenance from
> `_record_decision` `:2642-2681` (07b's `DecisionRecord`).
> Runs in parallel with 08b and 08c — file ownership is strictly disjoint.
> You MAY read `android-legacy/**` for **Android API usage only** (`record/PgnBuilder.kt`
> string assembly, `record/SessionExporter.kt` ZIP + SAF/`ACTION_SEND`, `games/GameStore.kt`
> index-file pattern). You MUST NOT copy its architecture — in particular its
> `SessionRecorderImpl.kt` predates the gates below.

## Files you own

| File | Contains |
|---|---|
| `android/app/src/main/kotlin/com/chesslab/tracker/games/GameStore.kt` | list / open / save / delete / rename, `index.json` |
| `.../games/GameRecord.kt` | `GameSummary`, `StoredGame`, `MoveProvenance` |
| `.../games/PgnBuilder.kt` | PGN assembly incl. provenance comments |
| `.../record/SessionRecorder.kt` | the on-device session writer |
| `.../record/RecordingGates.kt` | inventory + geometry gates |
| `.../record/SessionExporter.kt` | ZIP + share |
| `.../ui/games/GamesScreen.kt`, `GameDetailScreen.kt`, `GamesViewModel.kt` | UI |
| `.../ui/Nav.kt` | routes: games, spectator (08b's screen), speech (08c's screen) |
| `.../ui/settings/SettingsScreen.kt` | three navigation rows: Games / LAN spectator / Move announcement |
| `android/app/src/main/AndroidManifest.xml` | `FileProvider` + the two permissions 08b needs |
| `android/app/src/main/res/xml/file_paths.xml` | FileProvider paths |
| `android/app/src/test/kotlin/com/chesslab/tracker/games/*Test.kt`, `.../record/*Test.kt` | tests |

You own **nothing else**. `spectate/**` belongs to 08b, `speech/**` and
`service/TrackerService.kt` to 08c, `android/app/build.gradle.kts` to 08b.

Because you own the manifest this phase, **you add on 08b's behalf**:
`android.permission.INTERNET` and `android.permission.ACCESS_NETWORK_STATE` (08b needs
them and may not edit the manifest). Add nothing else — no storage permission of any kind.

Your nav rows reference two composables owned by other agents. Code against these exact
names and record a blocker if they are missing at compile time:
`com.chesslab.tracker.spectate.ui.SpectatorScreen` (08b),
`com.chesslab.tracker.speech.ui.SpeechSettingsScreen` (08c).

`service/TrackerService.kt` is owned by 08c this phase. You do **not** edit it; you code
against its published API:

```kotlin
val uiState: StateFlow<UiState>                    // fen, SAN history, decision provenance, gameOver
val frames: SharedFlow<CapturedFrame>              // raw frame + corners + profile, latest-wins (05b)
var recordingSink: RecordingSink?                  // null = not recording
```

Missing → **STOP** and record a blocker.

## Why

Two separate wins share this phase because they share the same data:

1. **A finished game must survive the app.** Right now a game exists only in the running
   process; there is no library, no PGN, nothing to send to anyone.
2. **A correctly tracked game is free labeled training data.** That is the whole premise of
   this repository — `chesslab slice` turns *(frame, FEN, corners)* into 64 labeled crops.
   The desktop tracker already does this (`_queue_session_capture`); the phone films the
   board from exactly the mount the model most needs data from and currently throws every
   frame away.

The two must not be confused: the game library is small text and always on; session
recording is JPEG frames and is **off by default**.

## Design (decided — do not redesign)

### 1. Storage layout (app-private, no permission)

```
filesDir/games/index.json                  // GameSummary list, newest first
filesDir/games/<id>.pgn
filesDir/games/<id>.provenance.json        // List<MoveProvenance>
filesDir/sessions/<sessionId>/frames/*.jpg
filesDir/sessions/<sessionId>/log.jsonl
filesDir/sessions/<sessionId>/session.yaml
```

`index.json` exists so `list()` never parses every PGN — the same principle as the repo's
`manifest_cache.py` ("Web read paths go through the mtime-keyed aggregate, never re-read
whole manifests"). Writes are atomic (temp file + `Files.move`, `REPLACE_EXISTING`, with a
copy fallback on `AtomicMoveNotSupportedException`).

### 2. What a stored game keeps

```kotlin
data class StoredGame(
    val id: String,                    // "2026-07-24_1822"
    val startFen: String,              // NOT assumed to be startpos — the tracker can start from any FEN
    val startedAtEpochMs: Long,
    val finishedAtEpochMs: Long,
    val profileName: String,           // the calibration profile used
    val result: String,                // "1-0" | "0-1" | "1/2-1/2" | "*"
    val moves: List<StoredMove>,
)

data class StoredMove(
    val ply: Int, val san: String, val uci: String, val tsEpochMs: Long,
    val provenance: MoveProvenance?,   // from 07b's DecisionRecord, minus images
)

data class MoveProvenance(
    val decider: String, val reason: String, val priorUsed: Boolean,
    val best: Double, val second: Double, val margin: Double,
    val changed: List<String>, val shadowVetoed: List<String>, val occludedVetoed: List<String>,
    val cnnAgreement: Double, val verifyOutcomes: List<String>,
)
```

Both SAN **and** UCI are stored: SAN is what a human reads, UCI is what replays without a
board. The calibration profile name is stored because a game whose crops you may later want
to slice is worthless without the geometry that produced it.

### 3. PGN export

Standard seven-tag roster: `Event "chesslab"`, `Site "?"`, `Date` (`yyyy.MM.dd`),
`Round "?"`, `White`/`Black` (user-editable per game, default `"?"`), `Result`. Plus
`[FEN "…"]` **and** `[SetUp "1"]` whenever `startFen` is not the standard start position —
omitting this silently produces an unreplayable PGN, which is the one export bug that
matters. Move text wrapped at 80 columns.

Provenance as PGN comments, behind a per-export toggle (**default off**):

```
1. e4 {cl: diff_after_verify; LL 18.42/3.10 (m 15.32); changed e2,e4} e5 {cl: cnn_occupancy; …}
```

Comments are brace-form, no nesting, no unescaped braces (sanitize). A PGN with the toggle
off must be byte-identical to a normal PGN — verified by a test.

Export actions: **Share** (`ACTION_SEND`, `application/x-chess-pgn`, via `FileProvider` on
`filesDir/games`) and **Copy to clipboard**. No `WRITE_EXTERNAL_STORAGE`, no SAF
requirement for the common path.

### 4. Game library UI

`GamesScreen`: list newest-first (id/date, move count, result, opening if known, a "has
session recording" badge and its size). Actions: open, rename (edits White/Black/Event,
rewrites the PGN header, keeps the id), delete (confirm; deletes PGN + provenance + index
row, and asks separately whether to delete the linked session directory), export.
`GameDetailScreen`: move list with the provenance decider chip per move, start FEN, profile,
timestamps, export button, provenance toggle.

Saving is triggered by `GamesViewModel` observing `uiState`: on `gameOver`, or on an
explicit "End game & save". An empty game (zero moves) is never saved.

### 5. Session recording — the Python port

**Off by default.** A toggle in `GamesScreen`'s overflow ("Record training frames"), with a
one-paragraph explanation of what it costs and what it is for.

`SessionRecorder` mirrors `SessionWriter` usage at `tracker.py:2717-2722`:

```kotlin
class SessionRecorder(dir: File, sessionId: String, profile: String,
                      mode: String = "track", frameSize: Size, notes: String)
fun capture(frame: CapturedFrame, ply: Int, fen: String, moveSan: String?, corners: FloatArray)
fun finish(): SessionResult      // writes session.yaml, returns id + frame count
```

Output must be **byte-compatible with `chesslab slice`**: the same `session.yaml` keys the
desktop `SessionWriter` writes (`session_id`, `profile`, `mode`, `frame_size`, `notes`,
`camera_index`), and one `log.jsonl` line per capture carrying `ply`, `fen`, `move_san`,
`corners` (8 floats, order `[a8, h8, h1, a1]` — `entry.md` invariant 11) and the frame
file name. If the desktop schema and this spec disagree, **the desktop wins**: read
`src/chesslab/collect.py::SessionWriter` and record the discrepancy.

Frames are the **raw camera frame**, not the warp — `slice` cuts crops from
*(raw frame, corners)*.

#### The two gates (both mandatory — this is what makes the data trustworthy)

1. **Geometry sanity** (`_skip_recording_for_geometry` `:2741-2758`). While the calibration
   profile's board size does not match the live frame size, capture is **suspended, not
   stopped** — the recorder and everything already written stay intact and capture resumes
   by itself once the size is resolved. The reason this is not optional is quoted in the
   Python docstring and must appear in the Kotlin one: *the corners belong to another
   resolution, so every crop would be labeled correctly and cut from the wrong pixels —
   poisoned training data that is indistinguishable from good data afterwards.* This is the
   same class of bug as commit `a7dab73` (requested-vs-delivered resolution).
2. **Physical-inventory violation** (`_record_inventory_violations` `:2725-2730`,
   `_skip_recording_for_inventory` `:2732-2739`), controlled by the
   `recordInventoryFilter` toggle (**default on**): if the believed FEN needs more pieces
   than a real set has (e.g. three white bishops after a promotion the tracker mis-tracked),
   the position is physically impossible, so the labels are wrong — skip the capture and
   record the reason. Port `src/chesslab/state.py::physical_inventory_violations`.

Both gates increment a skipped counter and set a visible reason string.

#### Deferred capture

Port `_queue_session_capture` / `_flush_session_capture` exactly (`:2760-2803`):

- on a committed move, queue `{ply, fen, san}`;
- flush **immediately** if the board is clean — no occlusion-vetoed squares and no tainted
  squares;
- otherwise defer to the next quiet re-anchor (hands still visible ⇒ the photo would
  capture a hand);
- re-run **both** gates at flush time, not just at queue time (Python does, `:2784-2789`);
- auto-start the recorder on the first flushed move only when the recording toggle is on
  (Python's `auto_record`);
- an **undo removes the captured frame again** — a wrong move must not survive as labeled
  data (`:2782` "a WRONG move is removed again on undo").

#### Storage cost (the reason it is off by default)

- A **size cap** setting: 250 MB / 1 GB / 2 GB / unlimited, default **1 GB**. On reaching
  the cap, recording stops (does not wrap), sets a reason, and posts a notification.
- A **visible size indicator**: total bytes under `filesDir/sessions`, shown on the games
  screen and next to the toggle, refreshed on entry (cached, never recomputed per frame).
- JPEG quality 90, no frame downscaling (slice needs the resolution).
- Per-session export as ZIP (`SessionExporter`, `ACTION_CREATE_DOCUMENT` via SAF so the
  user picks the destination — still no storage permission) and delete.

## Steps

### 1. `GameRecord` + `GameStore` + atomic index — commit `feat(android-games): app-private game store with an atomic index (list/open/save/rename/delete)`

### 2. `PgnBuilder` — commit `feat(android-games): PGN export with SetUp/FEN headers and optional provenance comments`

### 3. Games UI + nav rows + FileProvider share — commit `feat(android-ui): game library screen with detail view, rename and PGN share`

### 4. `RecordingGates` + `SessionRecorder` — commit `feat(android-record): session recorder — slice-compatible frames+FEN+corners behind geometry and inventory gates`

### 5. Deferred capture, undo removal, size cap + indicator — commit `feat(android-record): deferred capture on a clean board, undo removal, size cap and size indicator`

### 6. Session ZIP export — commit `feat(android-record): export a recorded session as a ZIP via SAF`

Run once:
`.\gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.games.*" --tests "com.chesslab.tracker.record.*"`

## Tests

| Kotlin test | Python reference / guard |
|---|---|
| `storeRoundTripsGameWithProvenance` | save → list → open |
| `indexIsWrittenAtomically` | interrupted write leaves the old index readable |
| `emptyGameIsNotSaved` | zero moves → null, nothing written |
| `renameRewritesPgnHeadersKeepsId` | |
| `deleteRemovesPgnProvenanceAndIndexRow` | |
| `pgnWithoutProvenanceHasNoComments` | byte-identical to a plain PGN |
| `pgnFromCustomFenHasSetUpAndFenTags` | the unreplayable-PGN trap |
| `pgnCommentsAreSanitized` | a `}` in a reason cannot break the file |
| `recorderWritesSliceCompatibleLog` | one `log.jsonl` line per capture, corners in `[a8,h8,h1,a1]` order, 8 floats |
| `recorderSuspendsOnGeometryMismatch` | `_skip_recording_for_geometry:2741` — recorder and prior frames intact, resumes automatically |
| `recorderSkipsInventoryViolation` | `_skip_recording_for_inventory:2732`; three white bishops → skipped + reason |
| `inventoryFilterOffDisablesTheGate` | `record_inventory_filter` (`:2726-2727`) |
| `captureDefersWhileOccludedOrTainted` | `_queue_session_capture:2774-2776` |
| `deferredCaptureRerunsBothGatesOnFlush` | `_flush_session_capture:2784-2789` |
| `recorderDoesNotAutoStartWhenToggleOff` | Python `auto_record`; also the leak fixed in `scripts/replay_clip.py` — no session may appear from a test run |
| `undoRemovesTheCapturedFrame` | `:2782` |
| `sizeCapStopsRecording` | at cap: stopped, reason set, nothing overwritten |
| `noExternalStoragePermissionInManifest` | grep-style assert over the manifest |

## Acceptance criteria

- `grep -rn "WRITE_EXTERNAL_STORAGE\|READ_EXTERNAL_STORAGE\|MANAGE_EXTERNAL_STORAGE" android/app/src/main/AndroidManifest.xml` returns **nothing**.
- `grep -n "INTERNET\|ACCESS_NETWORK_STATE" android/app/src/main/AndroidManifest.xml` hits both (added for 08b).
- `grep -n "SetUp" android/app/src/main/kotlin/com/chesslab/tracker/games/PgnBuilder.kt` hits.
- `grep -n "poisoned training data" .../record/RecordingGates.kt` hits (the docstring is part of the contract).
- `grep -n "physicalInventoryViolations\|inventoryFilter" .../record/RecordingGates.kt` hits.
- `grep -rn "recordingEnabled" .../record/ .../ui/games/ | grep -i "false"` shows the default is off.
- All 18 tests green; `:app:ktlintFormat` then `:app:detekt` clean.
- `STATUS.md` row 08a `done` (+ any `SessionWriter` schema discrepancy noted).

## Do NOT

- Do NOT enable session recording by default, and do NOT record without both gates.
- Do NOT store warped images or CNN crops in a session — `slice` needs the raw frame plus
  corners, and anything else is dead weight.
- Do NOT request any storage permission; app-private files + `FileProvider`/SAF only.
- Do NOT invent a session schema — match `src/chesslab/collect.py::SessionWriter` or record
  a discrepancy.
- Do NOT keep a captured frame for an undone move.
- Do NOT recompute the sessions directory size on the frame path.
- Do NOT edit `spectate/**`, `speech/**`, `service/TrackerService.kt`, or
  `android/app/build.gradle.kts`.
- Do NOT read `android-legacy/record/SessionRecorderImpl.kt` for logic — it predates the
  geometry and inventory gates.

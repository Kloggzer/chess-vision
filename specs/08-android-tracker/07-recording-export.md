# Phase 07 — Session recording, PGN export, feedback records

## Why

The Python tracker turns correctly tracked games into free training data
(session recording → desktop `slice`) and Undo into hard-negative feedback
(`tracker.py:1818,1911`). The app keeps that loop: record on-device, export to
the desktop pipeline. Slicing/labeling stays desktop-side (decided).

## Design (decided — do not redesign)

Package `com.chesslab.tracker.record` in `:app`.

```kotlin
class SessionRecorder(dir: File) : /* recorder extension point, phase 04 */ {
    fun onMoveCommitted(frame: Mat, fenBefore: String, fenAfter: String,
                        corners: BoardCorners, decision: Decision)
    fun onUndo(lastRecord: MoveRecord)      // marks it "bad" (hard negative)
}
```

- Output layout compatible with the desktop pipeline's expectations (frame +
  FEN + corners JSONL, cf. session logs consumed by `chesslab slice`;
  verify the exact JSONL schema via `grep -rn "session" src/chesslab/*.py` at
  implementation time and record the schema in STATUS.md):
  - `sessions/<yyyyMMdd-HHmmss>/frames/NNNN.jpg` (full camera frame, JPEG 92)
  - `sessions/<yyyyMMdd-HHmmss>/log.jsonl` — one record per move:
    `{frame, fen, corners: [[x,y]×4 a8,h8,h1,a1], decision, feedback: "good"|"bad", ts}`
- Deferred capture: photograph on the next clean (no motion, no occlusion)
  frame after commit, mirroring `_queue_session_capture` (`tracker.py:1874-1888`).
- Auto-record starts on first committed move (default ON, mirrors `auto_record`);
  settings section (extension point): auto-record on/off, storage usage display,
  delete-sessions action.
- **PGN export:** build PGN from SAN history + headers (Event "chesslab",
  Date, Result from game state) using chesslib's PGN support (or manual
  string assembly — PGN is trivial); share via `ACTION_SEND` intent and save-to-
  file (SAF). Wire into the History screen's export entry point (phase 04).
- **Session export:** zip a session directory and share via SAF/`ACTION_SEND`
  for transfer to the desktop (`data/` ingestion stays a desktop step).

## Steps

1. `SessionRecorder` + deferred clean-frame capture + unit tests (fake clock/frames: capture deferred past occlusion; undo flips feedback to bad) — commit `feat(android-record): session recorder with deferred clean-frame capture`
2. PGN builder + unit test (scholar's mate → known PGN string) + History export wiring — commit `feat(android-record): pgn export`
3. Session zip export + settings section — commit `feat(android-record): session export and settings`

## Tests (write, run once, targeted)

`./gradlew :app:testDebugUnitTest --tests "com.chesslab.tracker.record.*"`

## Acceptance criteria

- [ ] JSONL record contains frame ref, fen, 4 corners in a8,h8,h1,a1 order, decision, feedback flag.
- [ ] Deferred-capture test: commit during occlusion → photo taken on first clean frame.
- [ ] PGN test green with correct result tag.
- [ ] Recording writes only under app-scoped storage (no broad storage permission added to the manifest).

## Do NOT

- No on-device slicing/cropping/labeling — desktop's job.
- No cloud upload of any kind.
- Do not edit `ui/` files beyond filling the export entry point defined in phase 04.

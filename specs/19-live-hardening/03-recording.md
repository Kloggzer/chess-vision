# Phase 03 — "Recording doesn't work well": find out what that means, then fix it

## Why

The user reported, from live use: *"recording doesnt work well"*. That is the only
description available, and it was never investigated — the session that received it went to
the overlay, the camera resolution and the move detection instead. It is the one reported
defect still completely untouched.

Recording matters beyond convenience: a correctly-tracked game is **free labelled training
data** (frame + FEN + corners → `chesslab slice`). A recorder that drops frames, writes
unreadable sessions or silently stops is losing the data the whole CNN pipeline is starved
of.

## Design (decided — do not redesign)

**This is an investigation phase that is allowed to fix.** Diagnose first, in this order,
and write each answer into `STATUS.md` before changing anything.

### Step A — establish what is on disk

A device is likely attached; if not, say so and work from the code. Two sessions exist from
the reporting session:

```
files/sessions/20260726-160029/  → session.yaml, log.jsonl, frames/0000.jpg
files/sessions/20260726-171119/  → frames/
```

Note `20260726-160029` has **exactly one frame** for a session that ran minutes, and
`20260726-171119` appears to have no `log.jsonl` at all. Pull both with
`adb shell run-as com.chesslab.tracker` and characterise them:

- How many frames vs how many moves does `log.jsonl` claim?
- Is `session.yaml` complete and parseable by the Python side (`chesslab slice` reads these)?
- Are the JPEGs valid and at the expected resolution?
- Does a session started and stopped cleanly differ from one where the service was killed?

### Step B — read the write path

`record/SessionRecorder.kt`, `record/SessionCapture.kt`, `record/SessionStore.kt`,
`record/RecordingGates.kt`, `record/LiveCaptureSource.kt`, and the wiring in
`service/GameSessionWiring.kt`. Establish and record:

- **What triggers a frame capture?** (`RecordingGates` — on every move? on a timer? gated on
  something that is rarely true?)
- **Which thread writes?** JPEG encode and disk I/O must not be on the analyzer thread. If
  they are, that is both a recording bug and a frame-rate bug.
- **What happens on service death?** `TrackerService.onDestroy` calls `games.endAndSave()`.
  Is a session that dies with the process recoverable, or truncated?
- **Is `auto_record` leaking sessions?** MEMORY `auto-record-session-leak`: the Python
  `MoveTracker(auto_record=True)` once leaked synthetic sessions in headless runs. Check the
  Android equivalent does not create a session per restart.

### Step C — fix what you found

The likely candidates, in the order the evidence above will probably rank them:

1. The capture gate never opens (one frame, then nothing).
2. The session is not finalised unless the user stops it a specific way.
3. Frames are written but the manifest/log is not, so the session is unusable downstream.

**Fix the mechanism you measured, not the one this list guesses at.** If the evidence points
somewhere else entirely, that is the finding and it outranks this section.

### Step D — make the failure visible

Whatever the cause, recording failed silently. Add a user-visible signal: the recording UI
must show frames-written and the last error, not just an on/off state. A recorder that
stops must say so. `ui/games/RecordingPanel.kt` is the surface.

## Steps

1. `specs/19-live-hardening/STATUS.md` — commit `docs(specs): 19 phase 03 — what the recorder actually does`
   (the diagnosis lands BEFORE the fix, as its own commit)
2. `record/…` — commit `fix(android-record): <the mechanism you fixed>`
3. `ui/games/RecordingPanel.kt` — commit `feat(android-record): surface frames written and the last recorder error`
4. `specs/19-live-hardening/STATUS.md` — commit `docs(specs): 19 phase 03 — result`

## Tests (write, run once, targeted)

- A test for the capture gate that is **red against the current behaviour** — prove it and
  report the mutation check.
- A test that a session finalised after N captures produces a `log.jsonl` with N entries and
  a parseable `session.yaml`.
- If threading was the problem: a test that the write path is not invoked on the caller's
  thread.

Run once: `.\gradlew.bat :app:testDebugUnitTest --tests "*record*" --tests "*Session*" --tests "*Game*"`.

## Acceptance criteria

- `STATUS.md` states, with file and line, **what was broken** — not "improved robustness".
- The regression test is named and was proven red before the fix.
- A session recorded end-to-end has as many `frames/*.jpg` as `log.jsonl` entries.
- The recording UI shows a count and surfaces an error state.
- `:app:ktlintCheck` and `:app:detekt` clean of new findings.

## Do NOT / Out of scope

- Do not touch `cnn/**` (phase 01), `pipeline/**` or `core-engine/**` (phase 02).
- Do not change the on-disk session FORMAT — the Python `slice` path consumes it. If the
  format is genuinely wrong, record that as a finding and STOP; it is a cross-language
  decision, not a phase-03 change.
- Do not delete or move existing session directories on the device. MEMORY
  `keep-data-dont-delete`: park data, never delete it — `data/` is gitignored and deletion
  is unrecoverable.
- Do not run `assembleDebug` or the full test task.

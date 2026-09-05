# Phase 00 — Measure: three time rules against each other and the replay; the chain's view of a bundle

## Why

The verb (01) puts each ply on a frame by one of three rules (entry.md → time rule). Which rule
agrees with the replay's pre-roll rule, how far the rules disagree with each other, and whether a
constant offset remains, is unknown — and a wrong frame shifts every exported board. **It fixes nothing.**

## Design (decided — do not redesign)

Script `scripts/phone_candidate_offset.py` (new; argparse `name`, `--list`, `--replay/--no-replay`
default replay). Use `chesslab.recording.Recording` (`src/chesslab/recording.py:31`, `frames()` yields
`(whole-recording index, frame)` over every `video*.mp4` segment, `recording_segments :22`) for the
decode walk; `cv2.CAP_PROP_POS_MSEC` per decoded frame plus the running offset per segment gives the
timestamp table `index → ms`.

`--list`: for every `data/recordings/*/` with `files/sessions/<sid>/`: record present (a
`files/games/*.json` whose `sessionId == sid`), `moves`, `segments` sizes, distinct `tsEpochMs`
count, where `video.mp4`/`timeline.jsonl`/`settings.json` live, `candidate.json` present, and the
`log.jsonl` audit below. Known on 2026-09-06: `2026-08-30-14-33-02` (record, 8 moves on 4 instants,
1 segment, mirrored at top level), `2026-08-30-16-20-19` (record, segments 24+100, session dir only),
`2026-08-24-22-43-46` (no record). Measure every bundle with a record, newest three at most.

Per bundle `name` (session dir first, then top level, for every file):

1. Record → plies of `segments[0]` with `fenAfter` by replaying UCI with python-chess from
   `segments[0].startFen`; print the `provenance.decider` histogram.
2. Timeline rows by kind; the sync list `(elapsedNs, durationNs)`; `frame` rows `(elapsedNs, wallTsMs,
   fen)`; accepted `decision` rows `(ply, elapsedNs)`; `event` rows `(elapsedNs, wallTsMs)`.
3. Per ply, `elapsedNs` by each rule that applies — `frame` (first frame row whose first two FEN
   fields equal the ply's), `decision` (accepted row with that `ply`), `wall` (nearest frame/event
   row by `wallTsMs`, slope 1) — then `videoNs` by the `RecordedFrames.videoNsAt` rule (nearest sync
   by `elapsedNs`, slope 1), then the frame index from the timestamp table (first index with
   `ms ≥ videoNs/1e6`). Also the replay's own rule for the same ply: `preRollMs + (tsEpochMs −
   firstTs)` with `preRollMs` from `session.yaml` as `PhoneLog.kt:183 preRollMs` reads it
   (find the key via `grep -n "pre_roll\|preRoll" android/desktop/src/main/kotlin/com/chesslab/desktop/PhoneLog.kt`).
4. Replay frame: if `candidate.json` is absent and `--replay`, run ONE
   `android\desktop\build\install\desktop\bin\desktop.bat replay <video> label name=<name> model=real14-80`
   from `android/desktop` with `<video>` = `files/sessions/<sid>/video.mp4`; no `lens`. Read
   `moves[].frame`, `san`, `decider` from the candidate (the plies are `phone_log` — the replay
   already takes them from the record; the candidate's frames therefore ARE the pre-roll rule
   applied by Kotlin, which cross-checks step 3's Python copy of it).
5. Table per bundle: `ply san f_frame f_decision f_wall f_preroll f_replay`, `-` where a rule does
   not apply; then per rule: how many plies it covered, median and max of `f_rule − f_replay`; the
   decode walk's wall time and the replay's wall time from its log.

Chain audit, read-only: `chain.ts:87` counts `log.jsonl` in `gameDir(name)` as an export
(`hasSession`, field `:33`), but `2026-08-30-14-33-02` carries a top-level `log.jsonl` whose rows
are the phone's commit photos (`frame`, no `board`). Record per bundle: top-level `log.jsonl`
present, first row has `board`, and what `nextStep` (`chain.ts:118-129`) returns after a confirm.

## Steps

1. `feat(scripts): phone_candidate_offset.py — three time rules against the replay, per ply`.
2. `docs(status): phase 00 measured` — tables verbatim in `STATUS.md` → Session log; under Notes
   the decisions Phase 01 implements: the rule ORDER (which rule first; a rule whose median differs
   from the others by more than one frame is dropped), `PHONE_FRAME_OFFSET = <integer>` (median of the
   chosen rule minus the replay, 0 when within ±1), the bundles measured, the audit lines. A replay
   that misses or invents a ply against the record is reported, not averaged.

## Tests

None beyond `uv run ruff check scripts/phone_candidate_offset.py`. The deliverable is the measurement.

## Acceptance

- `uv run python scripts/phone_candidate_offset.py --list` exits 0 and lists every bundle with the
  facts above; `… 2026-08-30-14-33-02 --no-replay` prints the table with `f_replay = -`.
- `STATUS.md` → Notes contains `PHONE_FRAME_OFFSET = <integer>` and a line `rule order: …`.
- At most three replays ran, one at a time, only on bundles with a record and no candidate.

## Do NOT

- Do not write `candidate.json` by hand; do not edit Kotlin, TypeScript or `chain.ts`.
- Do not pass `lens` to the replay (the phone camera's fit is refused by design, `jobs.ts lensFor`).

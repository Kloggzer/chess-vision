# Phase 00 — Measure: phone clock vs replay frames, and the chain's view of a phone bundle

## Why

The verb (01) puts a ply on a video frame by clock arithmetic. Whether that frame is the one the
replay commits on, or a constant number of frames away, is unknown — and a wrong constant shifts every
exported board. This phase measures it on three real bundles and records it. **It fixes nothing.**

## Design (decided — do not redesign)

Bundles: first list them. Script mode `--list` prints, for every `data/recordings/*/` that has
`files/sessions/<sid>/`: whether a `files/games/*.json` names `sid`, its `moves`/`segments`, where
`video.mp4` and `timeline.jsonl` live (top level or `files/sessions/<sid>/`), and whether
`candidate.json` exists. Known on 2026-09-06: `2026-08-30-14-33-02` (record, 8 moves, 1 segment, top
level), `2026-08-30-16-20-19` (record, 124 moves, 2 segments, files under the session dir),
`2026-08-24-22-43-46` (NO record — only the chain audit applies). Measure on every bundle with a
record, the three most recent at most.

Script `scripts/phone_candidate_offset.py` (new; argparse `name`, `--replay/--no-replay` default
replay, `--list`):

1. Read the record as above. Print `moves`, `segments`, the `decider` histogram of `provenance`, and
   how many DISTINCT `tsEpochMs` the moves carry (paired plies share one).
2. Read `timeline.jsonl` (top level, else session dir): `video_sync` rows carry `elapsedNs`,
   `durationNs` (`SessionTimeline.kt:77-86`, NO wall clock); `frame` rows (`:38`) and `event` rows
   (`:65-75`) carry `elapsedNs` AND `wallTsMs`; `event` rows also `event` ∈ `move|sequence|…`, `san`.
   Print counts per kind and per event.
3. Phone frame per ply, the pack's ONE rule (entry.md → Time bridge), hops 1 and 2 in Python:
   nearest `frame`/`event` row by `wallTsMs` → `elapsedNs` + wall delta·1e6 → nearest sync by
   `elapsedNs` → `videoNs = durationNs + (elapsedNs − sync.elapsedNs)`. Hop 3 in Python: walk the
   video once with `cv2.VideoCapture` (`CAP_PROP_POS_MSEC` per decoded frame; for a session dir with
   several segment files, concatenate their timestamps with each segment's duration added — the
   replay's `ConcatFrameSource` does the same, `RecordingSource.kt:45-48`) and take the first index
   whose timestamp ≥ `videoNs/1e6`. Also the naive `round(videoNs/1e9 · fps)` as a second column, to
   show what the nominal rate would have cost.
4. Replay frame per ply: if `candidate.json` is absent and `--replay`, run ONE
   `android\desktop\build\install\desktop\bin\desktop.bat replay <video> label name=<name> model=real14-80`
   with cwd `android/desktop`, `<video>` = the top-level `video.mp4` or else
   `files/sessions/<sid>/video.mp4` (what `jobs.ts videoInput` resolves — find via
   `grep -n "async function videoInput" platform/app/lib/jobs.ts`); no `lens`. Then read
   `candidate.json` `moves[].frame` / `san`.
5. Print one table per bundle: `ply san phone_frame naive_frame replay_frame delta delta_naive`,
   then median and max |delta| per column, the decode walk's wall time, and the replay's wall time
   from its log. Plies the replay missed or invented are listed, not averaged.

Also audit the chain's view of these bundles, read-only: `platform/app/lib/chain.ts:87` (field
`hasSession`, `:34`) counts a `log.jsonl` in `gameDir(name)` as "session exported", but a phone bundle arrives WITH a top-level
`log.jsonl` whose rows are the phone's commit frames (`{"frame":"frames/0000.jpg","ply":…,"corners":…}`,
no `board` key). Record for each bundle: does `log.jsonl` exist, does its first row carry `board`, and
what `nextStep` would therefore return after a confirm. Do not change `chain.ts` (Phase 02 owns it).

## Steps

1. `feat(scripts): phone_candidate_offset.py — phone clock against the replay, per ply` — the script,
   `uv run ruff check scripts/phone_candidate_offset.py` clean.
2. `docs(status): phase 00 measured` — the three tables verbatim in `STATUS.md` → Session log, and
   under Notes the decided `PHONE_FRAME_OFFSET` (the median `delta_phone` rounded to an integer, or 0
   when the median lies within ±1) plus the chain-state audit. State plainly if the replay disagrees
   with the record on any ply (missed/invented) — that is a finding, not a failure.

## Tests

None beyond `ruff`. The deliverable is the measurement.

## Acceptance

- `uv run python scripts/phone_candidate_offset.py --list` exits 0 and names every bundle with its
  record/segment/layout facts; `… 2026-08-30-14-33-02 --no-replay` prints the table (columns as
  named) even without a replay candidate (replay columns `-`).
- `STATUS.md` → Notes contains a line matching `PHONE_FRAME_OFFSET = <integer>`, the list of
  bundles measured, and one line per bundle for the `log.jsonl` audit.
- At most three replays were run, one at a time, only on bundles with a record and no candidate.

## Do NOT

- Do not write `candidate.json` by hand, do not edit Kotlin or TypeScript, do not "fix" the chain.
- Do not run replays with `lens` (the phone camera's fit is refused by design, `jobs.ts` `lensFor`).

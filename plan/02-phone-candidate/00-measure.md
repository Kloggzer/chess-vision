# Phase 00 — Measure: phone clock vs replay frames, and the chain's view of a phone bundle

## Why

The verb (01) puts a ply on a video frame by clock arithmetic. Whether that frame is the one the
replay commits on, or a constant number of frames away, is unknown — and a wrong constant shifts every
exported board. This phase measures it on three real bundles and records it. **It fixes nothing.**

## Design (decided — do not redesign)

Bundles: `data/recordings/2026-08-24-22-43-46`, `2026-08-30-14-33-02`, `2026-08-30-16-20-19` (each has
`video.mp4`, `timeline.jsonl`, `files/games/<id>.json`; none has `candidate.json` on 2026-09-06 — check).

Script `scripts/phone_candidate_offset.py` (new; argparse `name`, `--replay/--no-replay` default replay):

1. Read `files/games/*.json`; keep the record whose `sessionId` equals the one directory under
   `files/sessions/`. Print `moves`, `segments` count, and the `decider` histogram of `provenance`.
2. Read `timeline.jsonl`: rows with `"kind":"video_sync"` carry `elapsedNs`, `wallTsMs`, `durationNs`
   (`SessionTimeline.kt:79-85`); `"kind":"event"` rows carry `event` ∈ `move|sequence|…`, `san`,
   `elapsedNs` (`:66-74`). Print counts per kind and per event.
3. Phone frame per ply, the pack's ONE rule (entry.md → Time bridge): nearest sync by `wallTsMs`
   to `tsEpochMs`, `videoS = (durationNs + (tsEpochMs − wallTsMs)·1e6) / 1e9`, `frame = round(videoS·fps)`.
   `fps` via `cv2.VideoCapture(video).get(cv2.CAP_PROP_FPS)`. Also compute the frame from the
   timeline's own `sequence`/`move` event `elapsedNs` (nearest sync by `elapsedNs`, the
   `RecordedFrames.kt:49` rule) for the plies those events name — a second reading of the same clock.
4. Replay frame per ply: if `candidate.json` is absent and `--replay`, run ONE
   `android\desktop\build\install\desktop\bin\desktop.bat replay <video> label name=<name> model=real14-80`
   with cwd `android/desktop` (the platform's `labelArgs`, `jobs.ts:347`, without `lens` — the phone
   has none to remove); then read `candidate.json` `moves[].frame` / `san`.
5. Print one table per bundle: `ply san phone_frame event_frame replay_frame delta_phone delta_event`,
   then median and max |delta| per column, then the fps. Plies the replay missed or invented are
   listed, not averaged.

Also audit the chain's view of these bundles, read-only: `platform/app/lib/chain.ts:28` counts a
`log.jsonl` in `gameDir(name)` as "session exported", but a phone bundle arrives WITH a top-level
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

- `uv run python scripts/phone_candidate_offset.py 2026-08-30-14-33-02 --no-replay` exits 0 and
  prints the table (columns as named) even without a replay candidate (replay columns `-`).
- `STATUS.md` → Notes contains a line matching `PHONE_FRAME_OFFSET = <integer>` and one line per
  bundle for the `log.jsonl` audit.
- At most three replays were run, one at a time, none on a bundle that already had a candidate.

## Do NOT

- Do not write `candidate.json` by hand, do not edit Kotlin or TypeScript, do not "fix" the chain.
- Do not run replays with `lens` (the phone camera's fit is refused by design, `jobs.ts` `lensFor`).

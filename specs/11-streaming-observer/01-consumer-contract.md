# Phase 01 — Consumers adopt the seq contract

## Why

Phase 00 gives every observation a frame signature; this phase makes consumers
*enforce* it: a decision made at frame N may only be verified/arbitrated by an
observation with `seq >= N`. Today that pairing is implicit in call order —
a pending candidate created at frame N is verified by whatever observation
happens next, which is usually-but-not-provably from a later frame. "Usually"
is how the `_last_cur` anchoring bug happened.

## Design (decided — do not redesign)

### 1. Pending candidates carry their seq

`_dispatch` (`grep -n "def _dispatch" src/chesslab/move_tracker/tracker.py`)
stores `"seq": <decision seq>` in `self._pending` (the seq of the newest frame
in the averaged buffer that produced the candidate — thread it from
`_try_detect`'s caller in `_loop`; phase 00 already captures the per-iteration
seq local).

### 2. Verify enforces `obs.seq >= pending["seq"]`

`_verify_tick(snap)` returns immediately (no evaluation, no `frames += 1`)
when `snap.seq < pending["seq"]` — a stale observation must neither confirm
nor reject a newer candidate. With a ~30 ms observer this triggers at most
once per candidate. Same guard in `_verify_pair_tick` (find via grep).

### 3. Occlusion filter gets a freshness bound

`_cnn_occlusion_filter` (find via grep) currently reads the cached observation
with no age limit — with the free-running observer a fresh one is always
available, so enforce `time.time() - snap.ts <= 3.0` (module constant
`_OBS_MAX_AGE_S = 3.0` with a comment) and fall back to the no-CNN heuristic
path when stale, exactly as when no observation exists.

### 4. Alarm/desync counting is per-seq

Pack 09's `_desync_obs` counter must count **distinct observations**, not
evaluations: guard `_cnn_tick`'s mismatch branch so one snapshot is counted
once (track `self._desync_last_seq`; skip if `snap.seq == self._desync_last_seq`).
Free-running observation would otherwise reach `desync_obs_n` within ~100 ms —
formally correct but it removes the "persistent over seconds" intent; counting
distinct seqs at observer cadence keeps the wall-time character (~3 obs ≈
inference+loop spacing) while triggering much faster than the old 10 s ticks.

### 5. Retire the alias

Migrate remaining readers of `_last_cnn_obs` (occlusion filter, tests, status
`cnn_squares`) to `self._cnn_snap`; delete the phase-00 alias property if
`grep -rn "_last_cnn_obs" src tests` then only hits historical comments —
otherwise keep it and record why in STATUS.md.

## Steps

### 1. Seq contract in consumers — commit `feat(tracker): enforce frame-seq contract in verify, occlusion filter and desync counting`

### 2. Alias retirement + migration — commit `refactor(tracker): consumers read CnnSnapshot directly`

### 3. Tests — commit `test(tracker): stale observations neither confirm nor refute newer candidates`

## Tests (write, run once, targeted)

1. `test_verify_ignores_stale_observation` — pending with `seq=10`, feed
   `_verify_tick` a snapshot with `seq=9` and endpoint readings that WOULD
   confirm → nothing happens (`_pending` unchanged, `frames` not incremented);
   feed the same readings with `seq=10` → commits.
2. `test_occlusion_filter_ignores_old_snapshot` — snapshot with `ts` 10 s in
   the past → filter behaves as if no CNN (falls back to the `>2` heuristic —
   reuse the existing occlusion-filter test's fixture).
3. `test_desync_counts_distinct_observations` — same snapshot evaluated twice
   (same seq) increments `_desync_obs` once; three distinct-seq mismatching
   snapshots trigger the alarm.

Run once:
`.venv/Scripts/python.exe -m pytest tests/test_move_tracker.py tests/test_cnn_recovery.py -q`

## Acceptance criteria

- [ ] `grep -n "pending\[.seq.\]\|pending\.get(.seq.)" src/chesslab/move_tracker/tracker.py` hits the verify guard(s).
- [ ] `grep -n "_OBS_MAX_AGE_S" src/chesslab/move_tracker/tracker.py` hits.
- [ ] `grep -n "_desync_last_seq" src/chesslab/move_tracker/tracker.py` hits.
- [ ] All three new tests pass; zero regressions; scoped ruff clean.
- [ ] Pack 09 alarm tests still green UNCHANGED in semantics (only stub/signature churn).

## Do NOT / Out of scope

- Do NOT weaken any pack-09 rule (alarm re-anchor block, conflict-resolution
  requirement for recovery commits, non-castling to-empty hold).
- Do NOT introduce waiting/blocking in `_verify_tick` — "ignore and return"
  is the whole mechanism; the next observation arrives in ~1 inference.
- UI changes: none (status fields from phase 00 suffice).
- Android port: separate pack.

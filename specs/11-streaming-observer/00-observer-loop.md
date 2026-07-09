# Phase 00 — Frame seq plumbing, free-running observer, observation store

## Why

Observations only happen when demand gates open (`_cnn_tick`'s stuck/periodic
conditions), so consumers wait seconds for identity that a ~30 ms inference could
have already delivered. And nothing ties an observation to the frame it saw —
the pairing is implicit in call order, which has already caused
reference-anchoring bugs (comment at `tracker.py:1431-1434`).

## Design (decided — do not redesign)

### 1. Frame sequence number

The tracker owns a monotonically increasing `self._frame_seq: int` (init 0),
incremented **once per loop iteration** immediately after a frame is
successfully read in `_loop` (`tracker.py:1158`; find the read via
`grep -n "def _loop" -A 40`). This is deliberately tracker-owned, NOT
`LatestFrame._seq` (`web/camera.py:129`) — device sources have no LatestFrame,
and dropped camera frames don't matter: seq identifies *processed* frames.

A detection decision's signature is the seq of the newest frame that entered
the averaged gray buffer for that decision: capture `self._frame_seq` into a
local at the top of the iteration and pass it where needed.

### 2. Observation record

New module-level dataclass in `tracker.py` (near the other small helpers):

```python
@dataclass(frozen=True)
class CnnSnapshot:
    """One CNN observation paired with the exact frame it saw (seq contract)."""
    obs: object                  # OccupancyObservation
    seq: int                     # tracker frame seq of the observed frame
    ts: float                    # wall time the observation finished
    infer_ms: float
    warped: object | None        # BGR warp of the observed frame (det size) — reference anchor
    gray: object | None          # gray warp, det size
```

Stored as `self._cnn_snap: CnnSnapshot | None` (replaces the loose trio
`_last_cnn_obs` / `_last_cnn_obs_ts` / ad-hoc `obs_warped`/`obs_gray` locals).
Keep `self._last_cnn_obs` as a **property alias** returning
`self._cnn_snap.obs if self._cnn_snap else None` so the occlusion filter
(`_cnn_occlusion_filter`, find via grep) and tests keep working in phase 00;
phase 01 migrates the consumers and removes the alias if nothing external uses it.

The warp of the observed frame currently computed inside `_cnn_tick`
(`warp_from_corners(frame, ...)` + detect-scale resize, `tracker.py:1435-1445`)
moves into the observer so EVERY snapshot carries its anchor images — this is
what makes "commit anchored on the frame the CNN actually looked at" structural
instead of per-call-site discipline.

### 3. Free-running observer

`_loop`'s spawn condition (`tracker.py:1318-1321`) gains a cadence guard but
loses nothing else:

```python
if (self.cnn_run and not self._cnn_failed and not self._cnn_busy
        and (now - self._observer_started_ts) >= self.observer_interval_s):
    self._cnn_busy = True
    self._observer_started_ts = now
    threading.Thread(target=self._cnn_worker, args=(frame, seq), daemon=True).start()
```

`_cnn_worker(frame, seq)` (`tracker.py:1352`) is restructured:

1. **Observe unconditionally** (this is the change): snapshot corners under
   lock; if none, bail. Run `recovery.observe`, build the warp pair, assemble
   `CnnSnapshot(obs, seq, ts, infer_ms, warped, gray)`, store it under lock
   (also sets `self._infer_ms`).
2. **Then evaluate**: if `self._pending is not None` → `_verify_tick(snap)`,
   else `_cnn_tick(snap)`. Both now take the snapshot instead of a raw frame
   and do NOT observe themselves — `_cnn_tick`'s stuck/periodic conditions
   become *evaluation* gates (unchanged semantics: pull-forward only when
   stuck, recovery voting cooldown via `_last_cnn_ts` stays), and its
   observe/warp block is deleted. The alarm's desync counting
   (`_desync_obs`, added in pack 09) now naturally ticks per observation.

New config knob in `__init__` + `config.TRACK_DEFAULTS`
(`grep -n "desync_obs_n" src/chesslab/config.py` — add next to it):

```python
"observer_interval_s": 0.0,   # min seconds between CNN observation starts; 0 = free-running (desktop). Raise on battery/thermal-constrained devices (Android port).
```

`cnn_check_interval_s` and `cnn_cooldown_s` KEEP their meaning (evaluation
cadence for the quiet-board check / recovery voting) — do not remove them.

### 4. Status (additive)

`status()` (`grep -n "def status" src/chesslab/move_tracker/tracker.py`):
`"cnn_obs_age_s"` now derives from `self._cnn_snap.ts`; add
`"cnn_obs_seq": self._cnn_snap.seq if self._cnn_snap else None` and
`"frame_seq": self._frame_seq` under `debug`. `cnn_squares` unchanged
(reads through the alias).

## Steps

### 1. Seq + snapshot + observer — commit `feat(tracker): free-running CNN observer with frame-signature snapshots`

`_frame_seq`, `CnnSnapshot`, observer restructure of `_cnn_worker`,
`observer_interval_s` knob, `_cnn_tick`/`_verify_tick` signature change to
consume the snapshot, deletion of `_cnn_tick`'s inline observe/warp block,
alias property, status additions.

### 2. Tests — commit `test(tracker): observer runs unconditionally and snapshots carry seq`

## Tests (write, run once, targeted)

Extend `_FakeRecovery` (`tests/test_move_tracker.py`, grep `class _FakeRecovery`)
as needed. Cases:

1. `test_observer_snapshots_on_quiet_board` — tracker not stuck, not pending,
   periodic not due → after driving `_cnn_worker` once, `self._cnn_snap` is set
   with the passed seq and `status()["debug"]["cnn_obs_seq"]` reports it
   (previously `_cnn_tick` would have returned without observing).
2. `test_observer_interval_throttles` — `observer_interval_s=10`: the loop
   spawn condition (test the predicate directly or via a tiny helper) refuses a
   second observation immediately after the first.
3. `test_snapshot_carries_anchor_warp` — snapshot built from a synthetic frame
   has `gray`/`warped` at det size; a recovery pull-forward anchors `ref_gray`
   on the snapshot's gray (existing behavior, now via snapshot — reuse the
   existing recovery-commit test and assert `mt.ref_gray is snap.gray`).
4. Existing verify/recovery/alarm tests keep passing with the new signatures
   (mechanical churn allowed in tests, semantics identical).

Run once:
`.venv/Scripts/python.exe -m pytest tests/test_move_tracker.py tests/test_cnn_recovery.py -q`

## Acceptance criteria

- [ ] `grep -n "class CnnSnapshot" src/chesslab/move_tracker/tracker.py` hits.
- [ ] `grep -n "observer_interval_s" src/chesslab/config.py src/chesslab/move_tracker/tracker.py` hits both.
- [ ] `grep -n "recovery.observe" src/chesslab/move_tracker/tracker.py` hits ONLY
      the observer (`_cnn_worker`) and the manual resync path — not `_cnn_tick`
      or `_verify_tick`.
- [ ] New tests pass; zero regressions in the two targeted files; scoped ruff clean.

## Do NOT / Out of scope

- Do NOT change verify/recovery/alarm decision semantics — scheduling only.
- Do NOT touch `_try_detect` or the diff pipeline (phase 01 wires the seq
  contract into consumers).
- Do NOT run inference under `self.lock`.
- Do NOT remove `cnn_check_interval_s`/`cnn_cooldown_s`.
- The manual resync path (`resync_cnn`, observes on demand) stays as is.

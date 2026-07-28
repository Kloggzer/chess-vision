# Phase 01 — A recovery move must be READ, not inferred from absence

> **Depends on phase 00.** Do not start until its STATUS.md row is `done`. If 00 reports the
> inference-from-absence case as *absent* on the measured material, **stop and record that** — do
> not implement on the strength of one live incident.

## Why

`cnn_recovery`'s deep search accepts a sequence when it explains ≥ `min_agreement` of the confident
squares and beats the runner-up by ≥ `margin_squares` (`cnn_recovery.py:318-375`). Both are
*counting* rules: they ask how many squares a story explains, never whether the story's own moves
were seen.

The model's errors are overwhelmingly **misses** — 8826 against 226 phantoms over 1366 clip
observations (`tracker.py:2336`). A miss makes an occupied square read empty, and the cheapest legal
story for a missing piece is a **capture**. Each fabricated capture then removes a piece from the
believed board, widening the gap and licensing the next one. On the device this produced
`Nxb5 Nxb5 Nxe5 Rxa3 Qxg4 Qxg5 Qxf6` and four game fragments in three minutes.

The same file already states the correct principle for the *overrule* rung, and proves it with the
`blender-queenside` incident where a phantom `Bg5` won purely because `f4` was wrongly empty:

> the overruling move must be READ, not inferred from absence: its origin confidently EMPTY and its
> destination confidently OCCUPIED — the 39×-rarer error direction. (`tracker.py:2341`)

This phase applies that rule to the recovery search.

## Design (decided — do not redesign)

**One rule, applied to the accepted sequence, in `cnn_recovery.py`.** Do not touch `min_agreement`
and do not touch `margin_squares` — `entry.md` records why the margin cannot be raised, with the
measurement.

After the deep search picks `best_seq`, replay it on a copy of the board and require, for **every
capture** in the sequence, positive evidence on its destination:

```python
def _capture_is_read(board, move, obs, conf_thr) -> bool:
    """A capture claims a piece VANISHED. That is the miss direction, so absence is not evidence.

    The destination must be confidently OCCUPIED after the move — a piece is standing there and the
    model says so — rather than merely 'the piece that used to be elsewhere is no longer read'.
    """
```

- Non-capturing moves keep the current treatment. They are the phantom direction (39× rarer) and the
  existing agreement/margin rules already cover them.
- A sequence containing a capture that fails the test is **rejected as a whole**: return the empty
  sequence, exactly as an agreement failure does today. The tracker then holds base truth and the
  desync escalation (`_desync_evidence` → alarm) surfaces it — which is the behaviour the user
  reports missing (*"das hatte das spiel wesentlich beruhigt auf dem pc"*).
- The knob: `cnn_recovery_capture_evidence` in `config.py TRACK_DEFAULTS`, default **`True`**, mirrored
  in Kotlin `TrackerConfig`. It exists so the change can be measured off, not so it can be ignored.

**If phase 00's cost estimate shows this rejects correct recoveries**, narrow it exactly once, in
the direction 00's data supports (e.g. only sequences of length > 1, or only when the captured piece
was confidently occupied in the *previous* observation), and record the narrowing and its measured
cost in STATUS.md. Do not iterate blindly.

## Steps

### 1. `src/chesslab/move_tracker/cnn_recovery.py` — commit `feat(recovery): a capture must be read, not inferred from absence`
The predicate and its application to `best_seq`. Docstring carries the 8826/226 asymmetry and the
`blender-queenside` precedent by name.

### 2. `src/chesslab/config.py` — same commit
`cnn_recovery_capture_evidence: True` in `TRACK_DEFAULTS`, threaded through `MoveTracker.__init__`
into the recovery object. `config.py` is the ONLY source of this default.

### 3. Tests — commit `test(recovery): pin the capture-evidence rule, red first`
See below.

### 4. `uv run pytest -m clips` — must be **21/21**
~7½ min. If a clip breaks, stop: the rule is wrong for the regression set.

### 5. Regenerate fixtures + describe the diff — commit `chore(parity): regenerate fixtures after the capture-evidence rule`
`uv run python scripts/emit_parity_fixtures.py --all --out android/core-engine/src/test/resources/parity`.
The fixtures run `cnn_run=None`, so **an empty diff is the expected outcome** and must be stated as
such in STATUS.md. A non-empty diff means the diff path moved — stop and investigate.

### 6. Kotlin port — commit `feat(engine): port the capture-evidence rule`
`android/core-engine/.../CnnRecovery.kt` (find via `grep -rn "minAgreement" android/core-engine`),
plus `TrackerConfig`. Identical logic, identical default.

### 7. `ClipReplayParityTest` — **18/18, zero diverging frames**

### 8. Measure the real clip, both ways — record in STATUS.md
`scripts/replay_clip_cnn.py` with `'{"cnn_recovery_capture_evidence": false}'` and `true`. Report the
committed move list, the decider per ply, and how many recoveries each one accepts. The true line
begins `e4 e5 Nf3 Nc6`.

## Tests (write, run once, targeted)

`tests/test_cnn_recovery.py`:

1. **A capture whose destination is only "not read" is rejected.** Build an observation where the
   captured square reads empty and the destination is NOT confidently occupied; assert the deep
   search returns no sequence.
2. **The same capture WITH positive evidence is accepted.** Destination confidently occupied →
   sequence returned unchanged.
3. **A non-capturing sequence is unaffected**, on the same fixture, so the rule is proven narrow.
4. **The knob off restores the old behaviour** exactly — case 1 accepts again.

`uv run pytest -q tests/test_cnn_recovery.py`

Kotlin: mirror cases 1, 2 and 4 in `CnnRecoveryTest.kt` (find via
`grep -rln "recover" android/core-engine/src/test`).

**Prove red first**: mutate the predicate to `return True`, confirm cases 1 and 4 fail, restore.

## Acceptance criteria

- `grep -n "cnn_recovery_capture_evidence" src/chesslab/config.py` hits exactly once.
- No change to `min_agreement`, `margin_squares`, `recovery_max_plies`, `min_confident_recovery`:
  `git diff HEAD -- src/chesslab/config.py` shows only the one added key.
- `pytest -m clips` 21/21; `ClipReplayParityTest` 18/18 zero divergence.
- STATUS.md carries the before/after move list on the real clip and the fixture-diff statement.

## Do NOT / Out of scope

- Do not raise `cnn_margin_squares`. Measured and rejected — see `entry.md`.
- Do not touch the verify ladder (`_verify_tick`, `_verify_pair_tick`), the overrule rung, or
  `has_occupancy_conflict`. This phase is the deep recovery search only.
- Do not retrain, re-export or swap a model.
- Do not touch anything under `android/app/.../games/**` — that is phase 02.

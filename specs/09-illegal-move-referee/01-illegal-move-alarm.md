# Phase 01 — Illegal-move detector & referee alarm

## Why

Live incident: after Ng1-f3, the human played a physically **illegal** move
(king e1→g1, castling unavailable). No legal move explains the frames, so the
diff path went stuck and CNN recovery (`_cnn_tick`, `tracker.py:1349`) searched
legal sequences and committed a plausible-but-wrong line; base truth was then
re-anchored on fiction. Today the persistent-mismatch outcome is only a quiet
note (`"CNN check: board deviates …"`, `tracker.py:1450-1455`) — "the human
played an illegal move" is not a representable outcome, so the system launders
evidence into the nearest legal fiction.

This is also a *feature*, not just error handling: in casual games players
often don't notice an illegal move. The tracker knows the full game state and
can referee — ring an alarm, name the offending squares (and the reconstructed
illegal move when unique), and offer take-back or accept-and-continue.

## Design (decided — do not redesign)

### 1. Detection: persistent identity contradiction, CNN-gated

Alarm logic lives in `_cnn_tick` only (identity information required). In the
mismatch branch (`tracker.py:1450`, after `self.cnn_status, self.cnn_conflicts
= "mismatch", conflicts`):

- Count consecutive CNN observations where `match_ok` is False, recovery is
  inconclusive or fails acceptance (`cnn_moves` empty), AND the conflict set is
  stable (new conflicts ⊆ previous ∪ previous ⊆ new — same disagreement, not a
  hand moving through). Track in `self._desync_obs: int` and
  `self._desync_conflicts: set[str]`.
- Trigger the alarm when `self._desync_obs >= 3` (new constant
  `desync_obs_n = 3` in `__init__`, wired into `config.TRACK_DEFAULTS` — find
  via `grep -n "TRACK_DEFAULTS" src/chesslab/config.py`). With
  `cnn_check_interval_s`/cooldown this is ≥ several seconds of stable
  contradiction — occlusion and shadows resolve faster or are flagged
  inconclusive (`tracker.py:1446`).
- Diff-only mode (no CNN): **no alarm** — identity is unavailable and a
  brightness-only detector would false-positive; the existing stuck note stays
  the behavior.

### 2. Best-effort reconstruction of the illegal move

New pure function in `cnn_recovery.py` (near `derive_moves_identity`,
`cnn_recovery.py:229`):

```python
def guess_illegal_move(board: chess.Board, obs: OccupancyObservation,
                       conf_thr: float) -> str | None:
    """Among label-confident conflict squares: exactly one square X whose
    expected piece P is now observed empty, and exactly one square Y observed
    to hold P where the game state expects something else -> "X->Y" (uci-like
    string, no legality implied). Any other pattern -> None."""
```

Uses `expected_labels(board)` (`cnn_recovery.py:108`) and
`obs.label_confident(conf_thr)` (`cnn_recovery.py:54`). For the live incident
(e1 expected `wK` observed `empty`; g1 expected `empty` observed `wK`) it
returns `"e1g1"`. Ambiguity → `None`; the alarm then names conflicts only.

### 3. Alarm state + effects

New tracker field `self._alarm: dict | None`, shape:

```python
{"kind": "illegal_move", "since": <ts>, "conflicts": ["e1", "g1"],
 "guess": "e1g1" | None}
```

While `self._alarm` is not None:

- **No fabrication:** the recovery-commit branch in `_cnn_tick`
  (`tracker.py:1456` onward, `_recovery_confirmer.feed` → atomic commit) is
  hardened: a sequence may only commit if it resolves **all** squares in
  `self._alarm["conflicts"]` (each conflict square's expected label after the
  sequence matches the observation's confident label) — otherwise treat as
  no-sequence (stay alarmed). Outside the alarm, recovery behaves as today.
- **No re-anchor:** the quiet-board re-anchor in `_try_detect`
  (`tracker.py:2118-2126`, `self._set_ref(cur, cur_bgr)`) is skipped while
  alarmed (mirror the existing `self._tainted` early-return at
  `tracker.py:2114-2117`), so the illegal position cannot become base truth.
- `self.state` stays whatever it is; add the alarm to `status()` (see 4). Set
  `self.note = f"ILLEGAL MOVE? {guess_san_or_squares} — take it back, or resync to accept"`.

**Clearing** (both automatic paths already run in `_cnn_tick` / resync):

- Take-back: `match_ok` becomes True → clear `self._alarm`, reset
  `_desync_obs`, note `"board restored — alarm cleared"`. (The existing
  match_ok branch at `tracker.py:1428-1444` already pulls the reference
  forward.)
- Accept reality: the user hits the existing FEN-resync or CNN-resync
  (`resync_cnn`, find via `grep -n "def resync_cnn\|api/resync" src/chesslab/move_tracker`)
  — both must clear `self._alarm` and `_desync_obs`, and append a decision-log
  entry `{"decider": "user", "reason": "illegal_move_accepted", ...}` via the
  existing `_record_decision`/decision-log mechanism (find via
  `grep -n "_decision_log\|_record_decision" src/chesslab/move_tracker/tracker.py`)
  so the discontinuity is on record (PGN cannot represent it).

### 4. Status + UI (referee alarm for the players)

- `status()` (`tracker.py:2565`) gains the additive key
  `"alarm": None | {"kind","since","conflicts","guess","guess_san"}` where
  `guess_san` is a human string like `"K e1→g1 (castling not available)"` —
  build it best-effort: piece letter from `expected_labels`, reason text fixed
  to `"illegal move suspected"` when no specific reason is derivable.
- `static/index.html`: red full-width banner (existing badge/note area,
  see the `cnn_status === "mismatch"` badge handling at
  `static/index.html:419-420`) shown while `s.alarm` is set:
  `⚠ ILLEGAL MOVE: <guess_san | conflicts> — take it back, or Resync to accept`.
  Plus a short WebAudio beep (oscillator, ~0.3 s, no asset files) fired once
  per alarm activation (track last-seen `alarm.since` in JS). No new
  endpoints — the existing Baseline/Resync buttons are the resolution UI;
  the banner text points at them.

## Steps

### 1. `guess_illegal_move` in cnn_recovery.py — commit `feat(tracker): reconstruct suspected illegal move from identity conflicts`

Pure function + docstring exactly as specced.

### 2. Alarm state machine in tracker.py — commit `feat(tracker): illegal-move desync alarm — refuse fabrication, block re-anchor`

`_desync_obs`/`_desync_conflicts`/`_alarm` fields, trigger in `_cnn_tick`
mismatch branch, recovery-commit hardening, re-anchor block, clearing paths
(match_ok + both resyncs + decision-log entry), `desync_obs_n` in
`__init__`/`TRACK_DEFAULTS`, `status()["alarm"]`.

### 3. UI banner + beep — commit `feat(tracker-ui): referee alarm banner for suspected illegal moves`

`static/index.html` only.

### 4. Tests — commit `test(tracker): illegal-move alarm — trigger, no fabrication, take-back and resync clear`

## Tests (write, run once, targeted)

Pure-function tests in `tests/test_cnn_recovery.py` (fake observations via
`observation_from_probs`, `cnn_recovery.py:63` — existing tests show the
pattern); tracker-level tests in `tests/test_move_tracker.py` (drive `_cnn_tick`
with a stubbed recovery object, as existing CNN-path tests do — grep
`_cnn_tick\|recovery` there and mirror).

1. `test_guess_illegal_move_king_e1g1` — board after 1.Nf3 with castling rights
   stripped (`board.castling_rights = 0` or FEN with `-`); observation: e1
   confidently `empty`, g1 confidently `wK`, rest matching → returns `"e1g1"`.
2. `test_guess_illegal_move_ambiguous_returns_none` — two candidate origins →
   `None`.
3. `test_alarm_triggers_after_n_stable_mismatches` — stubbed recovery returns
   `match_ok=False`, no acceptable sequence, stable conflicts `{e1,g1}` for 3
   observations → `status()["alarm"]` set, note contains `ILLEGAL`, and the
   quiet-board re-anchor does NOT run (reference object unchanged).
4. **Regression (the live incident):** `test_alarm_blocks_fabricated_recovery` —
   while alarmed, stubbed recovery offers a confident legal sequence that does
   NOT resolve conflict square e1 → no commit, FEN unchanged, alarm persists.
   Then offer a sequence/observation where `match_ok=True` → alarm clears.
5. `test_resync_clears_alarm_and_logs_discontinuity` — set alarm, call the FEN
   resync API/method → alarm None, decision log has
   `reason == "illegal_move_accepted"`.
6. `test_no_alarm_without_cnn` — diff-only tracker (cnn off) stuck on
   `no_legal_move` for many frames → `status()["alarm"]` stays None.

Run once:
`.venv/Scripts/python.exe -m pytest tests/test_move_tracker.py tests/test_cnn_recovery.py -q`

## Acceptance criteria

- [ ] All six new tests pass; zero regressions in the two targeted test files.
- [ ] `grep -n "\"alarm\"" src/chesslab/move_tracker/tracker.py` hits `status()`;
      all existing status keys unchanged.
- [ ] `grep -n "guess_illegal_move" src/chesslab/move_tracker/cnn_recovery.py`
      hits definition; `grep -rn "guess_illegal_move" src/chesslab/move_tracker/tracker.py`
      hits the alarm trigger.
- [ ] `grep -n "alarm" src/chesslab/move_tracker/static/index.html` hits the
      banner rendering.
- [ ] While `self._alarm` is set: no `_set_ref` from the quiet-board path and no
      recovery commit that leaves a conflict square unresolved (asserted by
      tests 3 and 4).
- [ ] Scoped ruff clean (see entry.md).

## Do NOT / Out of scope

- Do NOT add an alarm to diff-only mode (false-positive-prone without identity).
- Do NOT auto-resolve the alarm by committing the illegal move into the game
  state — PGN cannot represent it; only the user's resync accepts reality.
- Do NOT change `min_agreement`/`margin_squares`/`min_confident_*` defaults in
  `cnn_recovery.py:126-128` — hardening applies only while alarmed.
- Do NOT touch the shadow/veto logic (phase 00) beyond rebasing on its result.
- No sound assets, no new HTTP endpoints, no spectator-server changes (the
  Android/spectator surfacing is a later pack).
- Kotlin port (`android/engine`) is explicitly out of scope — recorded as port
  debt in `specs/08-android-tracker/HANDOVER.md`.

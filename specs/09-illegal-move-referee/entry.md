# 09 — Illegal-move referee & shadow-destination fix (Python tracker)

> Entry file for the spec pack. The implementing agent reads THIS file completely,
> then exactly one phase file. Both phases target the **Python** reference tracker
> (`src/chesslab/move_tracker/`); the Android port picks the changes up later in a
> separate pack (out of scope here).

## What this is

Two live-observed failures of `chesslab track`, root-caused in session 2026-07-09:

1. **Phantom h1→g1 under shadow/occlusion.** The HSV shadow veto deliberately
   preserves z-values on vetoed squares (vacate evidence, `tracker.py:2241-2269`),
   but move viability only checks `z >= z_thr/2` on all touched squares
   (`tracker.py:2093-2098`). A shadow across an empty g1 + occupied h1 makes
   `Rg1`/`Kg1` the best viable move; the hand that cast the shadow satisfies the
   motion gate. Missing asymmetry: a **destination** gained a piece — a structural
   change — while a shadow-vetoed square is exactly "brightness changed, census
   structure did NOT" (`tracker.py:2265`). → Phase 00.

2. **Fabricated position after a physically illegal move.** Live: Ng1-f3 (tracked
   fine), then king e1→g1 with castling unavailable — not in `legal_moves`. The
   tracker has no representable "illegal move" outcome: detection goes stuck, then
   CNN recovery (`_cnn_tick`, `tracker.py:1349`) searches legal sequences and
   committed a plausible-but-wrong line; base truth re-anchored around fiction
   (game state kept a king on an empty e1). The persistent-mismatch path today is
   only a quiet note (`tracker.py:1450-1455`). → Phase 01: an explicit
   illegal-move/desync **alarm state** — a referee feature (players often don't
   notice illegal moves; the app can), with take-back auto-clear and
   accept-reality resync. Refusing + alarming is strictly better than fabricating.

Reference docs: `docs/move-tracker-flow.md` (pipeline steps mirror
`_try_detect`, `tracker.py:2032-2045`), `README.md` (track command).

## Phases and dependencies

| Phase | File | Concern | Depends on | Model |
|---|---|---|---|---|
| 00 | `00-shadow-destination.md` | Candidate destinations must not be shadow-vetoed (viability + pair + endpoint) | — | opencode/DeepSeek |
| 01 | `01-illegal-move-alarm.md` | Illegal-move detector, alarm state, UI banner, recovery hardening | 00 | opencode/DeepSeek |

**Sequential, same agent session is fine.** Both phases edit
`src/chesslab/move_tracker/tracker.py` — do NOT run them in parallel.

## Protocol for implementing agents

- Work on branch **`tracker-referee`**, branched from `android-tracker` (it
  carries the latest detection fixes, commit `8c30888`). Never commit to `main`.
- Trust the code over this spec when they disagree — the cited anchors are the
  truth (line numbers may have drifted a few lines; each is paired with a symbol
  name). Record every discrepancy in `STATUS.md` under "Discrepancies".
- If blocked, STOP, write the blocker to `STATUS.md`, do not improvise.
- Update your phase row in `STATUS.md` (`todo → in_progress → done`) and append
  a session-log line when done.
- **Delegated agents (opencode/codewhale) must NOT `git commit`** — the
  supervisor reviews and commits with the names given in each phase's Steps.
- Do not touch `android/**`, `specs/08-android-tracker/**`, `src/chesslab/web/**`.

## Git hygiene (binding)

- Atomic conventional commits exactly as named in the phase Steps — one concern
  per commit, no drive-by changes.
- Stage explicitly (`git add <paths>`), never `git add -A`. `git status` must
  show no unrelated files in a commit.
- Never `--no-verify`, force-push, amend/rebase of pushed commits, or
  `git reset --hard` on shared state.
- Before handing work to an external CLI agent, commit everything first
  (codewhale reverts out-of-scope changes on exit; assume the same for opencode).

## Memory-constraint contract (non-negotiable)

- Run tests **once, targeted**:
  `.venv/Scripts/python.exe -m pytest tests/test_move_tracker.py tests/test_cnn_recovery.py -q`
  (NOT `uv run` from a delegated agent — venv sync race). Do NOT run the full
  suite, the frontend build, or any training/camera code — orchestrator's job.
- Static analysis, once at the end, scoped:
  `.venv/Scripts/python.exe -m ruff check src/chesslab/move_tracker tests/test_move_tracker.py tests/test_cnn_recovery.py`.
  Zero NEW findings; use `ruff format`-compatible style, no `# noqa` additions
  to get green — fix or STOP with a blocker.

## Dependency management (binding)

No new dependencies. Everything needed (python-chess, numpy, cv2) is already in
`pyproject.toml`. A new dependency would require a STATUS.md note + license
check (GPL-compatible only) — this pack should not need one.

## Repo rules you will actually hit

- Language: code/comments/docs in English.
- The tracker runs under `self.lock` in the paths you edit — keep new state
  reads/writes inside existing locked sections; never call the CNN under lock.
- `status()` (`tracker.py:2565`) is polled by `static/index.html` — new fields
  are **additive**, never rename/remove existing keys.
- Squares are `a1`..`h8`; `move_touched_squares` already includes castling rook
  squares and the en-passant captured pawn.
- Tests use synthetic frames/observations — follow the existing patterns in
  `tests/test_move_tracker.py` and `tests/test_cnn_recovery.py`; no camera, no
  model weights (CNN pieces are faked via `observation_from_probs`,
  `cnn_recovery.py:63`).

## Definition of done (per phase)

Phase acceptance criteria all pass, targeted tests green, scoped ruff clean,
`STATUS.md` updated. The orchestrator (supervisor session) then runs the full
gate: `uv run pytest -q` (386+ tests green) and
`uv run ruff check src tests synth`, reviews the diff, and commits.

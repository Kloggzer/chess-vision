# 11 — Streaming CNN observer & frame-signature contract (Python tracker)

> Entry file for the spec pack. The implementing agent reads THIS file completely,
> then exactly one phase file. Python reference tracker only
> (`src/chesslab/move_tracker/`); the Android port picks this up in a later pack.

## What this is

User-proposed flow (2026-07-09, approved): *"newest frame comes, we split — CNN and
classic algos do their job in parallel; in case we need info from the CNN the result
is almost there or already there; signature should be the same frame so they never
diverge."*

Today the CNN worker thread is **demand-driven**: `_cnn_worker`
(`tracker.py:1352`) runs `_verify_tick` when a candidate is pending, else
`_cnn_tick` — and `_cnn_tick` immediately returns unless *stuck* (cooldown
`cnn_cooldown_s` 2 s) or the *periodic check* is due (`cnn_check_interval_s`
10 s, `config.py:476-477`). Consequences: pre-commit verify waits ~0.5–2 s for a
fresh observation; desync/illegal-move alarms wait for the periodic tick; the
UI's `cnn_squares` hover data goes stale on a quiet board; and evidence/identity
can come from different moments (we were bitten twice — recovery anchoring on
`_last_cur`, see the long comment at `tracker.py:1431-1434`).

This pack makes the observer **free-running** (observe the newest frame whenever
the worker is idle, desktop default) and introduces a **frame-signature (seq)
contract**: every observation is tagged with the sequence number of the frame it
saw; every consumer that needs identity for a decision made at frame N may only
use an observation with `obs_seq >= N`. Decision logic (verify semantics,
recovery voting, alarm, pull-forward rules) is **unchanged** — only *when
observations happen* and *how results are matched to frames* changes.

Measured basis: steady-state inference is ~30 ms on the dev GPU (user-measured;
the "50-500 ms" comment at `tracker.py:1314-1316` includes warmup/CPU worst
cases). At ~30 ms the observer keeps up with the 25-40 fps loop, so "the result
is already there" is the common case and `seq >= N` waits are rare.

## Phases and dependencies

| Phase | File | Concern | Depends on | Model |
|---|---|---|---|---|
| 00 | `00-observer-loop.md` | Frame seq plumbing, free-running observer, observation store, cadence config | — | flash |
| 01 | `01-consumer-contract.md` | Consumers adopt the seq contract (verify/recovery/occlusion-filter/status), retire demand gating | 00 | flash |

**Sequential** — both edit `tracker.py`; run in one agent session, phase 00 first.

## Protocol for implementing agents

- Work on branch **`streaming-observer`**, branched from current `main`
  (contains packs 09 + the verify/infer_ms fixes; `main` @ d318689 or later).
  Never commit to `main`.
- Trust the code over this spec; anchors carry symbol names because line numbers
  drift. Record discrepancies in `STATUS.md`.
- If blocked, STOP, write the blocker to `STATUS.md`, do not improvise.
- Delegated agents must NOT `git commit` — the supervisor reviews and commits
  with the names in each phase's Steps.
- Do not touch `android/**`, `src/chesslab/web/**` (except reading
  `web/camera.py`), or other specs.
- No scratch files in the repo root (use a temp dir).

## Git hygiene (binding)

Atomic conventional commits exactly as named in the Steps; stage explicitly
(`git add <paths>`), never `git add -A`; never `--no-verify`/force-push/
`git reset --hard`. Commit everything before any external-agent handoff.

## Memory-constraint contract (non-negotiable)

- Tests once, targeted:
  `.venv/Scripts/python.exe -m pytest tests/test_move_tracker.py tests/test_cnn_recovery.py -q`
  (NOT `uv run` from a delegated agent). No full suite, no frontend build,
  no camera/training code — orchestrator's job.
- Lint once, scoped:
  `.venv/Scripts/python.exe -m ruff check src/chesslab/move_tracker tests/test_move_tracker.py tests/test_cnn_recovery.py`.
  Zero NEW findings, no `# noqa` additions to get green.

## Dependency management

No new dependencies (threading/time/dataclasses only). Anything else = STOP +
STATUS.md note.

## Repo rules you will actually hit

- The loop thread holds `self.lock` only in short sections; the observer thread
  must NEVER run inference under the lock (pattern: snapshot under lock →
  observe without lock → re-validate FEN under lock; see `_cnn_tick` docstring).
- `status()` keys are additive only — the web UI polls them (`static/index.html`).
- Detection evidence is computed on an **averaged** gray buffer (`avg_frames`),
  not a single frame — the signature of a detection decision is the seq of the
  NEWEST frame in that buffer (see phase 00 design).
- Tests stub the recovery object (`_FakeRecovery` in `tests/test_move_tracker.py`,
  grep `class _FakeRecovery`) — extend the stubs, don't import torch.
- English code/comments; follow existing comment density.

## Definition of done (per phase)

Acceptance criteria pass, targeted tests green, scoped ruff clean, STATUS.md
updated. Orchestrator runs `uv run pytest -q` + `uv run ruff check src tests synth`
and commits.

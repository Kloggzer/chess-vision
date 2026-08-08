# 53 — Status

| Phase | State | Note |
|---|---|---|
| 00 — confirm | `done` | 2026-08-08, `620aa97` (Opus agent, supervised); confirm runs on the real candidates still owed — see log |
| 01 — export-session | `todo` | after 00; owns `data/sessions/rg-<name>/` |
| 02 — occluded proposals | `todo` | after 01; ∥ 03; owns the proposal schema (pinned in entry.md) |
| 03 — relabel MVP | `todo` | after 01; ∥ 02; `platform/app/`, codes against the pinned schema |
| 04 — 14-class experiment | `todo` | last; success bar = dense-evaluation table in entry.md |

Branch: `specs-53-<phase>` per phase, off `main`. DIRECTION.md remains the investigation of
2026-08-08 (with the user's dirty-frames amendment); where DIRECTION and this pack disagree,
the pack wins (known: `game.pgn` → `reference.pgn`).

## The bar this pack is judged against (from specs/52 STATUS, 2026-08-08 — MEASURED)

| video | today, baseline | today, n=1 + dense eval | phase 04 must reach |
|---|---|---|---|
| rec-20260807 (score) | 25/0/0 | 14/11/6 (veto) | **25/0/0 under dense eval** |
| rec-20260808-115912 | 61 plies | 229 plies, 0 invented | **≥ 200 under dense eval** |
| rec-20260808-003957 | 67 plies | 33 plies | no baseline regression |

## Session log

### 2026-08-08 — phase 00 implemented (`620aa97`, merged `62b325b`)

`src/chesslab/realgames.py` (159 lines, eight flat functions, no classes), `realgames_app` in
`cli.py`, three targeted tests. Full gate: 450 passed, ruff clean. LCS is a verbatim port of
`RealGameScore.scoreMoves` including the tie-break (truth advances → out-of-order commits read
as invented). One signature deviation, deliberate: `confirm(name, *, yes, ask=None)` — `ask` is
a plain callable so the prompt-free decision logic stays pure; the CLI passes a
`typer.confirm` closure.

**Spec discrepancy found by the implementing agent (the pack's 00 file was wrong):** the
acceptance note "85/87 and 229/229 LCS are on record" conflates specs/52 REPLAY results with
the candidates ON DISK, which hold 42 and 72 plies. Dry-run against the real files:
- `rec-20260808-003957`: 42 plies vs 67 truth — matched 38, invented 4 (all the tail from
  frame 005421 on: the recording ends before the game), missed 29. `--yes` is correct here.
- `rec-20260808-115912`: 72 plies vs 237 — matched 65, invented 7, and several of the seven
  (`Nxb8`, `Rxb8`, `Rb4`) also appear as missed truth plies — the resync-era duplicate case
  the interactive gate exists for. This one wants the human pass, not `--yes`.

Still owed for the phase's acceptance: the two real confirm runs (003957 via `--yes`,
115912 interactively with the user).

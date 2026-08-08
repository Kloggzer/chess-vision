# 53 — Status

| Phase | State | Note |
|---|---|---|
| 00 — confirm | `done` | 2026-08-08, `620aa97`; 003957 confirmed via `--yes` (38 reviewed); 115912 waits for the VIEW |
| 01 — export-session | `done` | 2026-08-08, `82b7d0b`+`8d87f49`; real export ran: 1 729 frames → 110 656 crops, slice untouched and green, yield 488 @cap4 vs 504 estimated |
| 02 — occluded proposals | `todo` | after 01; ∥ 03b; owns the proposal schema (pinned in entry.md) |
| 03a — scaffold + confirm view | `done` | 2026-08-08, `e21b656`+`aba57a3`; shadcn per user, 461 own lines, byte-preserving three-key write, server recomputes reviewed_plies |
| 03b — relabel streams | `todo` | after 01+03a; ∥ 02 |
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

### 2026-08-08 — phases 01 and 03a in parallel (merged `ae9401f`)

Two Opus agents, one supervisor, disjoint file scopes — but ONE shared checkout, so the 03a
commits stacked onto `specs-53-01` (content unharmed; future parallel agents get worktrees).
Orchestrator gate on the merged stack: 454 Python tests + ruff clean, eslint + tsc + 2 route
tests green.

**01 (exporter):** `chesslab realgames export-session` + `--report-only`. Real run: 5 419
frames decoded strictly forward in 2 m 07 s, 1 729 PNGs, slice `[OK] … 110 656 crops` with
`git diff labeling.py` EMPTY. Yield 488 @cap4 / 1 952 @cap16 (DIRECTION estimated 504/2 016 on
42 plies; 38 are reviewed — the caps key on (session, square, label) and are NOT additive
across quiet/dirty). Notable deviations, all sound: a `desktop` calibration profile is created
FROM the candidate (never invented — the ClipDriver lesson; `out_size` 128 = the pool's unit,
cell 116 px so ~1:1); intervals end at the next commit even if unreviewed; frames before ply 1
are not exported. Flag for the orchestrator: the static median quad reads 34/44 alignment pass
(77 %), worst max 5.61 px vs the 4.64 gate — the open Hebel-3 quad question, not this phase's.

**03a (confirm view):** Next.js MVP under `platform/app/` (shadcn per user amendment — three
components, no kitchen sink). `/confirm/<name>` renders the 7 unmatched 115912 plies with
review PNGs and duplicate badges; POST recomputes `reviewed_plies` server-side from the file
and writes the three confirmation keys byte-preservingly (`JSON.rawJSON` reviver keeps `0.0`
as `0.0`; tmp+rename). chess.js SANs verified 237/237 identical to python-chess on the real
PGN. Smoke against the real data: 200, 7 cards, 3 duplicate badges, candidate md5 unchanged.

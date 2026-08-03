# 42 — One board, two clocks

The spectator view and the after-game review are the **same view**. Board, move list, evaluation —
the only difference is whether the game is still running. The user, 2026-08-02: *"auch ne notiz,
die spectator view kann basically dieselbe view sein wie die nach dem spiel nur halt live."*

So: one component with a LIVE source and an ARCHIVE source. Not two surfaces that drift apart.

## What already exists, measured 2026-08-03

The classification math is **done and tested, and called by nothing in production**:

| File | Lines | State |
|---|---|---|
| `analysis/MoveQuality.kt` | 4 | `BOOK BEST GOOD INACCURACY MISTAKE BLUNDER` |
| `analysis/Accuracy.kt` | 40 | `classify(cpLoss, isBookPly)` at lichess-like bounds 10/50/100/250, and `cpLoss(before, after, whiteMoved)` doing the white-POV flip |
| `analysis/WinChance.kt` | 15 | lichess' fitted logistic, `WIN_CHANCE_K = 0.00368208` verbatim |
| `analysis/StockfishAnalyzer.kt` | 219 | runs live; `movetimeMs` default 400, `multiPv`, `THREAD_PRIORITY_LOWEST`, two threads |

`classify` and `cpLoss` have exactly two callers between them and both are `AccuracyTest`. Nothing
grades a finished game. Note what that means for the gates: detekt's unused rules see `private`
scope only, so a public function nobody calls is invisible to every check in this repo.

The two surfaces that must become one:

| Surface | Files | Lines |
|---|---|---|
| Archive / detail | `ui/games/` — `GamesScreen`, `GameDetailScreen`, `GamesViewModel`, `GameSessionHost`, `RecordingPanel` | 671 |
| Spectator | `spectate/` — `SpectatorController`, `SpectatorServer`, `SpectatorPage`, `GameSnapshot`, `QrCode`, `WifiAddress`, `ui/SpectatorScreen` | 685 |

Storage behind both: `games/GameRecord.kt` (186), `GameStore.kt` (95), `LiveGame.kt` (195),
`GameSessionController.kt` (176), `PgnBuilder.kt` (147).

## Scope

1. **One review component, two sources.** A live source (the running game) and an archive source (a
   `GameRecord`) behind one interface; one board, one move list, one evaluation strip. Delete the
   duplicate, do not wrap it — this project has already collapsed two viewfinders (specs/36) and
   three calibration paths (specs/35), and both times deleting was the change that worked.
2. **Grade a finished game.** The pass over a completed `GameRecord` that `classify`/`cpLoss` were
   written for and never got: analyse each position, compute the loss, label the ply, summarise per
   side. Wire the existing functions; do not write second ones.
3. **The move list becomes the finding list.** A ply badged `BLUNDER` is the thing the user opens
   this screen for. Tapping it puts the board there.

## The question to answer before building, not after

**400 ms per position is a live readout, not a verdict.** Over 80 half-moves that is 32 s of engine
time on a phone, at `THREAD_PRIORITY_LOWEST` with two threads, and a blunder detected at that depth
can be a phantom of the depth rather than of the move. Either give the review pass more time per
position than the live analyzer gets, or state plainly in the UI how coarse the grading is. Measure
it: run one real game at 400 ms and at whatever you propose, and report how many plies change
class between them. That number decides it, not taste.

## Not this pack

`web/routers/realgames.py` and `web/frontend/src/components/GameReview.tsx` are a DIFFERENT review:
a human correcting the tracker's proposed move list for a filmed game, so it can become a test
fixture (specs/40). Same word, different job. Do not merge them and do not model one on the other.

`specs/41` is running in parallel on board geometry (`alignment.py`, `calibration.py`,
`:core-geometry`). Stay out of those.

## Acceptance

- One component renders a live game and a finished one, and the live path is the archive path with
  a different source. A reviewer can see that by reading it, not by being told.
- A finished game shows per-ply quality and a per-side summary, from the existing `classify`.
- The depth question is answered with the measured class-change count.
- Android gate green with `--rerun-tasks`: `:app:ktlintCheck :app:detekt :core-engine:detekt
  :core-engine:ktlintCheck :core-engine:test :app:testDebugUnitTest`.
- Screenshots. No test in this project composes a UI, so the gates say nothing about whether the
  page renders.

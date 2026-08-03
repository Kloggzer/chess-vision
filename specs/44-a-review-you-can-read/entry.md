# 44 — A review you can read

specs/42 built the grading pass. The user played with it and the verdict, 2026-08-03:

> *"the review feature is there but it does not have a good usability, it requires too much
> knowledge. give it a rating like chess.com does it, also tell the user what would have been
> better, this whole feature needs a lot of improvement. also frontloading the whole calculation is
> not ideal, the calculation also is never stored so you have to do it again every time."*

Four separate problems. Three are mechanical and one is the actual point.

## 1. It speaks to someone who already knows

The card today reads `84 cp average loss over 42 plies · best 26 good 2 inaccuracy 3 mistake 6
blunder 5`. Centipawn loss is a unit you have to be taught. A ply badged `BLUNDER` says the move
was bad and not one word about what to do instead.

**A rating, the way chess.com gives one.** specs/42 explicitly refused an accuracy percentage —
*"lichess' is a second fitted curve, new maths, which the pack rules out"* — and the user has now
overruled that. It is in scope. `WinChance.kt` already carries lichess' fitted logistic
(`WIN_CHANCE_K = 0.00368208`) verbatim from `analysis.py`, so the win-expectancy half exists.

**And "what would have been better."** `StockfishAnalyzer` already runs `multiPv`, so the engine's
preferred line is computed and thrown away. Showing it on the board at a bad ply is the single
biggest legibility win available and it costs no new search.

## 2. The whole calculation is frontloaded

Measured on the device 2026-08-03 at the shipped budget (depth 30, cap 3000 ms): **25 of 84
positions in 55 s**, ~2.2 s per position. A full game is minutes of a progress counter before
anything at all is readable. At depth 16 it was 0.33 s per position — the earlier design — so this
got 6.6x worse the moment the budget was corrected, and the frontloading turned from tolerable into
the main complaint.

The ply the user is LOOKING at should be graded first, then its neighbours, then the rest. A review
that fills in while you read it is a different product from one that makes you wait.

## 3. Nothing is stored

`ReviewViewModel`'s own KDoc says it: *"state is the file store and this survives nothing."* Leave
the screen and every second of engine time is gone. `GameStore` already keeps `<id>.json` and
`<id>.pgn` per game; an analysis belongs beside them.

It must be keyed by the budget it was computed at. A depth-16 grade and a depth-30 grade of the
same ply disagree — measured: 14 of 83 plies changed class between 400 ms and depth 16 — so a
stored result that does not say what produced it is a trap, not a cache.

## 4. Research first, then design

The user asked for a UX agent that researches this. Do that before writing Compose.

Worth reading, not exhaustive: chess.com's Game Review (its move taxonomy — Brilliant, Great, Best,
Excellent, Good, Book, Inaccuracy, Mistake, Miss, Blunder — its accuracy score, and what it chooses
to show a weak player); lichess' computer analysis, its accuracy formula (harmonic mean over
per-move win-percentage drop) and "Learn from your mistakes" flow; the published critiques of
centipawn loss as a player-facing number; and how either handles positions where an engine
evaluation stops being meaningful — this game has **15 plies per side scored against a forced
mate**, where a centipawn average measures nothing at all.

Report what was read and what was rejected.

## The licence question, settled — do not re-open it

specs/42 refused the accuracy percentage for scope, NOT for licensing: *"Lichess' is a second
fitted curve (103.1668 · exp(-0.04354 · Δwin) - 3.1669) and writing it would be new maths, which
the pack rules out."* The user overruled the scope decision on 2026-08-03 and asked directly
whether licences were the obstacle. They are not:

- A mathematical formula is not itself copyrightable; a verbatim code port would be. Formula plus
  attribution is the normal and clean route.
- **The project already does exactly this.** `WinChance.kt` carries `WIN_CHANCE_K = 0.00368208`
  with the comment "verbatim from `analysis.py`'s `win_chance_white`" — lichess' fitted logistic,
  used and credited. Follow that pattern: cite the source in the KDoc, pin the constant in a test.
- Even a genuine code port would be combinable. lichess (lila) is AGPL-3.0, chesslab is
  GPL-3.0-or-later (python-chess is GPL), and GPLv3 §13 permits the combination; the AGPL portion
  simply keeps its own obligation.
- **chess.com is the one real limit.** Their accuracy formula is proprietary and unpublished — it
  can be approximated from what they have published, never copied. Their *presentation* (the move
  taxonomy, the shape of the review flow) is functionality and is free to learn from.

## Non-negotiable

- **No invented chess authority.** If a formula is taken from lichess or chess.com, cite it and pin
  the constant in a test, the way `WinChance.kt` already does. If a number is our own, say so on
  the screen.
- **The tracker's own mistakes are not the player's.** This record was rebuilt 3x by the CNN and
  more than half its committed moves came through `cnn_recovery`. A screen that grades a fabricated
  recovery move as a human blunder is lying, and it is the one lie this project cannot afford.
- Do not touch board geometry (`specs/41` is live there) or the service lifecycle (`specs/43`).

## Acceptance

- A player who does not know what a centipawn is can open a finished game and learn something.
- The best move is shown at every ply the review flags.
- The first useful thing on screen arrives in about a second, not in minutes.
- Closing and reopening a reviewed game does not recompute it; a game analysed at a different
  budget is visibly a different result, not silently merged.
- Android gate green with `--rerun-tasks`, and screenshots.

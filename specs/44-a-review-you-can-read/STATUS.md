# 44 — Status

| Phase | State | Note |
|---|---|---|
| research | `done` | `research.md` — sources read from SOURCE, two premises of the pack corrected |
| grading | `done` | unit changed from centipawns to win expectancy; 32 of 83 plies changed class |
| advice | `done` | the engine's move as an ARROW on the board, plus its line |
| streaming | `done` | nearest the reader first; first grade **2.4 s** against a 149 s full pass |
| storage | `done` | `<id>.analysis.json`, keyed by budget AND format version |
| budget | `done` | node budget, replacing the depth bound — see §4 |
| screen | `done` | reordered, machine vocabulary removed, one info affordance |

## What leads the screen, and why

The order is a deliverable. The question asked was *what does a player want in the first five
seconds after a game*, and everything on screen had to earn its place against it.

| # | What | Why it is there |
|---|---|---|
| 1 | **Accuracy, per side, with its denominator** | It answers "how did I do". It is the one thing the user asked for by name, and it is what both chess.com's Highlights and lichess' analysis panel open with. |
| 2 | **The board, with the win bar beside it** | The subject. The bar is requested, and it turns "who is winning" from a number you decode into a shape you glance at. |
| 3 | **What the move on screen did**, in one sentence | `Rd1 Mistake · Winning chances 73 % → 61 %`. Four lines at most: working memory is ~4 chunks and the notation already competes for them. |
| 4 | **The engine's move, as an ARROW** | *"i really like the arrows showing what the engine would have played"*. No notation to decode. The caption is secondary to the arrow, not the other way round. |
| 5 | **What decided the game** — top 3, each with a plain sentence and the better move | The actionable half. Never behind a tap; capped at 3 with "show all". |
| 6 | **The score sheet** | Reference, not headline. SAN and a grade badge, nothing else. |
| 7 | **Details** (one tap) | The tracker's decider for the selected ply, how the numbers are produced, Share PGN / Copy, Analyse again. |

**Removed from the primary view:** the `cnn_occupancy` / `cnn_recovery` label beside every SAN, the
Share PGN and Copy buttons, the paragraph explaining the engine budget, the `? vs ? · 1-0 · 83 plies`
header, and the whole "N moves were rebuilt by the app" apparatus (see §5). **Deleted outright:**
`MoveQuality.BOOK`, `cpLoss`, `CP_LOSS_CAP`, `averageCpLoss`, `mateScoredPlies`, a duplicate `sanOf`.

**Three info icons, and only three** — accuracy, the bar, how moves are judged. Same glyph, same
gesture, same kind of content. A first screenful sprouting eight of them would be the screen saying
it is still talking too much.

## 1. The unit was the defect

Measured with a host Stockfish over all 84 positions of `2026-08-02_2159`, comparing the SAME search
read two ways:

| | centipawn thresholds (what shipped) | win-expectancy thresholds |
|---|---|---|
| plies changing class | — | **32 of 83** |
| White's bands | best 26 · good 4 · inacc 1 · mist 6 · **blun 5** | best 28 · good 8 · inacc 5 · mist 1 · **blun 0** |
| Black's bands | best 21 · good 7 · inacc 2 · mist 4 · **blun 7** | best 29 · good 4 · inacc 5 · mist 2 · **blun 1** |
| the 30 mate-scored plies | 27 best, **3 blunder** | 29 best, 1 good |

The three mate-scored "blunders" are the finding. Ply 63 `Rxc6+` lost **1 866 cp** and moved the
winning chances **100.0 % → 100.0 %** — trading a forced mate for a position that is merely +81 pawns
is a large subtraction and no change at all to the game. specs/42 had already capped the AVERAGE for
this reason; the classification was still doing it. No clamp fixes that, because the unit was wrong.

## 2. Thresholds — the pack's premise was off by 2×

`Advice.scala`'s `.3/.2/.1` are on `winningChances ∈ [-1,+1]`, not on the 0..100 percentage, and
`winPercent = 50 + 50·winningChances`. So they are **15 / 10 / 5 points**, not 30 / 20 / 10.
chess.com's *published* Expected-Points cutoffs (inaccuracy 0.05, mistake 0.10) land on the same 5
and 10. Details and the corroboration in `research.md` §1.

## 3. Accuracy, and the number a long defeat inflates

Lichess' per-move curve verbatim (constants pinned in `AccuracyTest`), aggregated by the harmonic
mean only — *our* aggregation, and the screen says so.

| reading | White | Black |
|---|---|---|
| arithmetic mean of per-move accuracy | 87.4 | 85.1 |
| harmonic mean, all plies | 80.7 | 72.0 |
| harmonic mean, **excluding already-decided plies** | **71.4** | **66.5** |

The last row is our rule and it is not cosmetic. This game's last 15 plies per side are played against
a forced mate; each scores 100 % for free. Lichess counts them (their volatility weight floors at 0.5
rather than 0) — simulated over a synthetic collapse, a 15-ply mate tail moves the losing side's
accuracy **69.1 → 80.9**. The screen states the denominator because of it.

**On the device, complete, at the shipped budget: White 73 % over 31 of 42 moves, Black 64 % over 31
of 41.**

## 4. The budget: nodes, not depth — and not time

The user's objection was about purpose, not cost: *"'the game was already decided with depth 30' does
not help, i can't see all solutions with depth 30. would depth 16 not be enough?"*

Neither knob works. A TIME budget is a property of the phone and its temperature. A DEPTH bound is an
arbitrary edge that lands differently in every phase — specs/42 measured the consequence, that
`movetime 400` reaches depth 31 in a sparse endgame, so a "deep" depth-16 pass was the *shallower*
search on three plies. Lichess' analysis farm spends **1.5 M nodes per move**, and nodes are the same
amount of work everywhere and on every device.

Measured over all 84 positions, classes counted with the shipped bands, against a 6.8 M-node read:

| budget | median depth | depth range | class changes vs the deep read | PC seconds / 84 |
|---|---|---|---|---|
| `depth 16` | 16 | 0..16 | 17 of 83 | 7.8 |
| 200 k nodes | 16 | 0..245 | 17 of 83 | 5.1 |
| 500 k nodes | 18 | 0..245 | 14 of 83 | 13.1 |
| **1.5 M nodes (shipped)** | **21** | **0..245** | **10 of 83** | 37.0 |
| depth 30, cap 3000 ms (was shipped) | 26 | 0..30 | — | 177.5 |

The depth RANGE is the argument. At the same effort a node budget reaches depth 245 in a swapped-off
endgame and 16 in a middlegame; `depth 16` throws the first away and over-pays for the second. And a
median of 21 is inside the band chess.com describes as where engine quality starts showing
diminishing returns — grading a human by a refutation only a 6.8 M-node search finds teaches nobody
anything, which was the user's point.

On the device the node budget reproduces the PC's depth almost exactly — **median 20 against 21** —
which is the whole reason to prefer it. `capMs = 3000` remains as a safety valve, not the budget.

## 5. The seam rule, after a correction

The pack said a `cnn_recovery` ply is "the tracker's guess, not the player's move" and must never be
graded. **That was wrong and the code that implemented it has been removed.** A recovery move is
normally the move that was played — the decider says how the app found out, not whether it happened.
Grading only non-recovery plies dropped 52 of this game's 83 and produced an accuracy over 17 and 14
moves instead of 31 and 31.

What genuinely cannot be graded is a **seam**: `GameSegment.enteredBy`, where the app lost the board
and picked it up elsewhere, and the plies that got there appear in no move list. The first ply of such
a segment does not follow from the position before it, so it is skipped, and the move list says in
plain words that the record has a gap. `2026-08-02_2159` has `seams: 0`, so this is covered by a
constructed test rather than by the device game.

## 6. Streaming and storage, measured on the device

| | before | after |
|---|---|---|
| first grade on screen | after all 84 positions | **2 389 ms** |
| whole pass, 84 positions | ~185 s (25 in 55 s) | **148 667 ms** |
| reopening a reviewed game | full recompute | one file read, no engine |
| a run interrupted halfway | lost entirely | resumes from where it stopped |

`<id>.analysis.json` sits beside `<id>.json`, keyed by the budget **and** a format version. The
version is not belt-and-braces: measured on the device today, when `ReviewBudget` changed shape from
`depth`/`movetimeMs` to `nodes`/`capMs`, `ignoreUnknownKeys` dropped the two old keys, the two new
ones took their defaults, the decoded budget compared **equal**, and a depth-30 analysis was served as
if it were a node-budget one. A budget key cannot police a change to the budget's own shape.

## 7. Measured before the pack was written (kept for provenance)

| Fact | Value | Where |
|---|---|---|
| Engine cost at the old budget (depth 30, cap 3000 ms) | 25 of 84 positions in 55 s | device, 2026-08-03 |
| Plies changing class between `movetime 400` and depth 16 | 14 of 83 | specs/42 benchmark |
| Plies scored against a forced mate | 15 White / 15 Black of 83 | the card itself |
| ACPL after the mate clamp | White 84 cp, Black 127 cp | device — **now deleted, see §1** |

## Not done, and why

- **Stepping the engine's line on the board.** The line is computed, stored and printed
  (`Show the line`), but playing it out move by move on the board is not built.
- **A game graph / eval curve over the whole game.** `GameGrade.winWhite` is per position and ready
  for it; the bar came first because it is what was asked for.
- **The seam path exercised on real data.** No stored game has a seam.
- **`ReviewBudgetBenchmark` re-run through Gradle.** `connectedDebugAndroidTest` UNINSTALLS the app
  on teardown and took the game's data with it once today (restored from the pre-install pull). The
  device numbers in §6 were taken by polling the store instead.

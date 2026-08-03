# 44 — What was read, what was taken, what was refused

Research pass 2026-08-03, before any Compose was written, because the user asked for it by name.
Everything under "taken" is cited in a KDoc and pinned in `AccuracyTest`. Everything under "refused"
is listed with the reason, because a design justified by "chess.com does it" is not justified.

Primary sources were read **from source**, not from documentation — the two disagree, and the
documentation is the one that is wrong (see §6).

---

## 1. The correction that mattered most

The pack's own premise, and mine, was that lichess flags an inaccuracy at a **10-point** drop in win
percentage, a mistake at 20 and a blunder at 30. That is wrong by a factor of two.

`lila/modules/tree/src/main/Advice.scala`:

```scala
private val winningChanceJudgements = List(
  .3 -> Advice.Judgement.Blunder,
  .2 -> Advice.Judgement.Mistake,
  .1 -> Advice.Judgement.Inaccuracy
)
delta = (currentWinningChances - prevWinningChances).pipe(d => info.color.fold(-d, d))
```

The delta is on `winningChances`, which runs **-1..+1**, not on `WinPercent`, which runs 0..100. And
`winPercent = 50 + 50 * winningChances`. So `.3` is **15 percentage points**, not 30.

The forum answer everybody quotes — "a 30 % change (80 % to 50 %) is a blunder" — is the same
constant described on the ±1 scale, where 0.3 is called "30 %". Both statements are true and only one
of them is in the unit our code uses.

Independent check: chess.com **publishes** its Expected-Points cutoffs (§3) — inaccuracy 0.05–0.10,
mistake 0.10–0.20 of a 0..1 win probability, i.e. 5 and 10 points. Those coincide exactly with
lichess' inaccuracy and mistake floors on the 15/10/5 reading. On the 30/20/10 reading lichess would
be precisely double chess.com at every rung, which is not a coincidence anyone should believe.

**Taken: 15 / 10 / 5.** Had this not been checked against the source, every band on the screen would
have been twice as forgiving as the product it names.

---

## 2. Taken from lichess, with citations

| Thing | Source | Where it lives now |
|---|---|---|
| Win-expectancy logistic, `k = 0.00368208` | `scalachess/core/src/main/scala/eval.scala`; fitted in [lila PR #11148] | `WinChance.kt` (already there before this pack) |
| `Cp.CEILING = ±1000`, and `fromMate` mapping any mate onto it | same file | `WinChance.winChanceCeiled` |
| Judgement thresholds `.3/.2/.1` on `winningChances` | `lila/modules/tree/src/main/Advice.scala` | `Accuracy.classify` |
| Per-move accuracy curve `103.1668100711649 · exp(−0.04354415386753951 · Δ) − 3.166924740191411`, **plus their `+ 1` "uncertainty bonus"**, clamped 0..100 | `lila/modules/analyse/src/main/AccuracyPercent.scala` | `Accuracy.accuracyPercent` |
| Harmonic mean's `max(1, v)` guard | `scalalib/lila/src/main/scala/Maths.scala` | `Accuracy.gameAccuracy` |
| Accuracy colour bands ≥85 / ≥70 / ≥55 | `lila/ui/analyse/src/view/roundTraining.ts` | `GameReviewScreen.accuracyColor` |
| "Best was %s" as the entire vocabulary of advice | `lila/translation/source/site.xml` | the verdict line's wording |

Three details of the accuracy curve are **absent from lichess' public accuracy page** and were only
found in the file: the `+ 1` bonus, the early return of exactly `100d` when the position did not get
worse, and the ±1000 ceiling. A port written from the public page would be wrong in three places.

The ceiling is applied to **grading only**. The live eval bar keeps the uncapped curve, because that
one is parity with this repo's own `analysis.py`; a bar that pinned at 97.5 while claiming to be
Python's would be a third behaviour nobody asked for.

---

## 3. Taken from chess.com

Only two things, and neither is a formula.

- **The shape of the taxonomy.** Their published list is Brilliant, Great, Best, Excellent, Good,
  Book, Inaccuracy, Mistake, Miss, Blunder. We ship five: Best, Good, Inaccuracy, Mistake, Blunder.
  What was taken is the *idea that "Best" is a distinct, positive label a weak player can collect* —
  not a threshold. See §5 for what was dropped and why.
- **The published Expected-Points table** (Best 0.00, Excellent ≤0.02, Good ≤0.05, Inaccuracy ≤0.10,
  Mistake ≤0.20, Blunder >0.20), used purely as the cross-check in §1. It is not implemented.

Their Accuracy score is **CAPS2** and is proprietary and unpublished. What they have said about it is
a design statement rather than a formula, and it is the most useful sentence in the whole search:

> the new scores "replicate the feeling of being graded on a test in school. You will notice that the
> majority of scores now fall mostly between 50 and 95."

That is a decision about *range*, not about maths — CAPS v1 put a 40 %-best-moves game in the single
digits and, in their words, "made some people feel bad". Our harmonic mean over lichess' curve lands
this game at 71 and 67, which is inside that band by construction rather than by tuning.

**Not taken, and worth naming because it is tempting:** chess.com's expected-points function takes
**the player's rating as an input**, so the same swing classifies differently for an 800 and a 2200.
We have no rating for anybody, and inventing one would be exactly the invented authority the pack
forbids.

---

## 4. The mate question, which is this game's whole problem

The user's game has **15 plies per side played against a forced mate**. Asked directly what the two
products do:

- **Mate distance is invisible to lichess.** `WinPercent.fromMate` maps *any* mate to exactly ±1000
  cp. Mate-in-3 and mate-in-30 are one number. So mate-in-3 → mate-in-9 produces a `winDiff` of 0,
  hence accuracy exactly 100, hence no judgement at all. (`MateSequence` has a `MateDelayed` case
  meaning "not the best checkmate sequence" — it is **declared and never constructed**. Dead code.)
- **Above +1000 nothing moves.** From a +1000 position you have to fall to +684 before it is even an
  inaccuracy. +3000 → +1000 is not a mistake; it is not anything.

This is what solved problem 1 of the pack outright. specs/42 needed `MATE_CP = 10 000`, a
`CP_LOSS_CAP = 1 000` applied to the mean but deliberately not to the bands, a `mateScored` flag per
ply and a paragraph of screen text apologising for the average. Changing the unit deleted all of it:
a mate is past the ceiling, the ceiling is one number, and one number minus itself is zero.

Measured on this game at the shipped budget: the three plies badged BLUNDER purely by mate arithmetic
(ply 54 `Kb7` at 9 122 cp "lost", plies 63/64 `Rxc6+`/`Kxc6` at 1 866) all become what they are. Ply
63 moved the winning chances by **nothing at all**.

### The part the research found that the pack had not

A long mate tail **inflates the losing player's accuracy**. Every such move scores 100 % for free, and
lichess counts them: their volatility weight is the standard deviation of a window of win
percentages, which is 0 across a flat decided finish, and it is squeezed to a **floor of 0.5** rather
than to zero. The harmonic-mean half does not weight at all, so they enter it at full strength.

Simulated over a synthetic 20-ply collapse: adding 15 mate-tail plies per side moves the losing
side's accuracy **69.1 → 80.9** and cuts their ACPL by 60 %.

Measured on the real game: counting them reads White 76.5 / Black 75.6; dropping them reads
**71.4 / 66.5**. Nine points of Black's score was the length of their own defeat.

**Our rule, and it is ours:** a ply whose evaluation is past the ceiling at *both* ends and *on the
same side* is not evidence about anybody, and is left out of the accuracy. The same-side condition
matters — a flip from +1000 to −1000 is also saturated at both ends and is the largest blunder there
is. The screen states the denominator (`over 13 of 42 moves`) because a rating owes it.

---

## 5. Refused, with reasons

- **Brilliant / Great / Miss.** chess.com's own definition of Brilliant is prose ("a good piece
  sacrifice… you should not be completely winning even if you hadn't found the move") and the rule is
  unpublished and rating-dependent. Every open reimplementation guesses at it differently. Shipping a
  guess under chess.com's word is the invented authority the pack forbids, and a beginner cannot act
  on "Brilliant" anyway.
- **Book.** `MoveQuality.BOOK` existed and was **deleted**: no opening book ships, so nothing could
  ever set it, and only its own unit test ever produced one.
- **A "Best vs Good" threshold.** Not needed. BEST is now the *fact* that the player played the
  engine's first choice. Measured over the 83 plies, the 29 that were the engine's move lost at most
  **1.56** points of win expectancy, so a cutoff would only have restated it — and it removes a
  constant that would have been nobody's but ours.
- **Lichess' full accuracy aggregation.** Their game score is `(volatility-weighted mean + harmonic
  mean) / 2`, with `windowSize = clamp(plies / 10, 2, 8)` and a population standard deviation
  squeezed to 0.5..12. Reproducible in principle — and the weighted half is precisely the half that
  leaks a decided finish (§4). We ship the harmonic mean alone, the screen says the combination is
  ours, and `Accuracy.kt` says which half was dropped and why.
- **ACPL anywhere on the screen.** lichess still shows it in the advice-summary panel. The strongest
  argument against it as a player-facing number is Regan & Haworth's measurement that a marginal
  centipawn has roughly **5× the impact at +20 that it has at +100** — averaging raw centipawn
  deltas averages quantities that are not commensurable. A lichess community study of the CPL
  distribution makes the practical version of the same point: "an ACPL of 50 could mean either
  inaccuracies on almost every move or one big blunder with good play elsewhere."
- **A rating-dependent classifier.** See §3.
- **WintrChess / freechess reimplementations** as a source of thresholds. Both are curve-fits to
  observed chess.com output by third parties, one of them abandoned. Their *overrides* ("do not allow
  blunder if the move is still completely winning"; "…if you were already in a completely lost
  position") are good ideas, and we get both for free from the ceiling rather than as special cases.
- **Skeleton screens.** The popular recommendation is weaker than it looks: the widely cited study
  found skeletons perceived as shorter than a spinner "but not by much", and a peer-reviewed ECCE
  2018 replication found **no significant difference**. Not worth the code.
- **A percent-done bar as the only feedback.** NN/g's rule is that anything ≥10 s wants a percent-done
  indicator, and a full pass here is minutes, so there is one. But lichess' actual pattern is better
  and is what the design copies: they push partial analysis over a websocket and **the filling
  advantage chart is the progress indicator**; there is no percentage anywhere. The equivalent here is
  that the grade itself fills in — the bar is secondary to a screen that is already readable.

---

## 6. Traps found, so nobody re-walks them

- **`WinPercent.scala` does not exist in lila.** It moved to scalachess as
  `core/src/main/scala/eval.scala`. Searching lila for it returns nothing and looks like the formula
  is gone.
- **Lichess' public accuracy page is incomplete** in three specific ways (§2). Cite the file.
- **The "Learn from your mistakes" blog post prints the superseded `-0.004` multiplier.** It predates
  PR #11148. Good for the UX description, wrong for constants.
- **`ui/chart/src/acpl.ts` does not draw ACPL.** It draws the advantage graph.
- **The fitted win-chance constant is tuned for 2300+ players.** The PR author states it trends
  towards **-0.002** as rating decreases. Our users are not 2300. This is a known, unfixed
  approximation and it is the one place where the borrowed maths is least appropriate to this
  audience; fixing it would mean fitting our own curve, which is a different project.

---

## 7. What the screen took from the flow research

- **lichess' vocabulary is deliberately tiny** — `"(eval → eval) Blunder. Nf3 was best."` and
  `"Best was %s"`. That is the entire natural-language surface of the strongest free analysis tool in
  chess. Ours is one sentence longer ("Winning chances 87 % → 62 % for the player who moved") and
  says nothing the engine did not measure.
- **chess.com names the motif before revealing the move** — "Show Fork", "Show Lost Piece", then
  "Best", then a Retry loop. Naming a motif requires tactical classification we do not have and would
  have to invent, so it was refused; the *ordering* idea (advice is revealed, not asserted) survives
  as the arrow only appearing where the move was not already the engine's.
- **One idea per move is the ceiling.** Working memory is about 4 chunks, and Chase & Simon's result
  is that a beginner cannot hold "the pin on the e-file plus the loose bishop" as one unit — it
  competes with the notation itself. The verdict block is four short lines and stops.

---

## Sources

lichess/lila: [AccuracyPercent.scala](https://github.com/lichess-org/lila/blob/master/modules/analyse/src/main/AccuracyPercent.scala) ·
[AccuracyPercentTest.scala](https://github.com/lichess-org/lila/blob/master/modules/analyse/src/test/AccuracyPercentTest.scala) ·
[Advice.scala](https://github.com/lichess-org/lila/blob/master/modules/tree/src/main/Advice.scala) ·
[AccuracyCP.scala](https://github.com/lichess-org/lila/blob/master/modules/analyse/src/main/AccuracyCP.scala) ·
[roundTraining.ts](https://github.com/lichess-org/lila/blob/master/ui/analyse/src/view/roundTraining.ts) ·
[retroCtrl.ts](https://github.com/lichess-org/lila/blob/master/ui/analyse/src/retrospect/retroCtrl.ts) ·
[nodeFinder.ts](https://github.com/lichess-org/lila/blob/master/ui/analyse/src/nodeFinder.ts) ·
[PR #11148](https://github.com/lichess-org/lila/pull/11148) ·
[scalachess eval.scala](https://github.com/lichess-org/scalachess/blob/master/core/src/main/scala/eval.scala) ·
[scalalib Maths.scala](https://github.com/lichess-org/scalalib/blob/master/lila/src/main/scala/Maths.scala) ·
[accuracy page](https://lichess.org/page/accuracy) ·
[fishnet](https://github.com/lichess-org/fishnet)

chess.com: [how moves are classified](https://support.chess.com/en/articles/8572705-how-are-moves-classified-what-is-a-blunder-or-brilliant-etc) ·
[how Game Review works](https://support.chess.com/en/articles/8584089-how-does-game-review-work) ·
[how accuracy is determined](https://support.chess.com/en/articles/8708970-how-is-accuracy-in-analysis-determined) ·
[CAPS, 2017](https://www.chess.com/article/view/better-than-ratings-chess-com-s-new-caps-system) ·
[Game Review v2](https://www.chess.com/news/view/chesscom-launches-game-review-v2)

Critique and UX: [Regan & Haworth, *Intrinsic Chess Ratings*, AAAI 2011](https://cse.buffalo.edu/~regan/papers/pdf/ReHa11c.pdf) ·
[Centipawn loss distribution](https://lichess.org/@/jk_182/blog/centipawn-loss-distribution/If1ed2rj) ·
[Comparing accuracy calculations](https://lichess.org/@/jk_182/blog/comparing-different-ways-to-calculate-accuracy/6aeYnbh8) ·
[NN/g response-time limits](https://www.nngroup.com/articles/response-times-3-important-limits/) ·
[NN/g progress indicators](https://www.nngroup.com/articles/progress-indicators/) ·
[NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) ·
[skeleton screens, Chung](https://uxdesign.cc/what-you-should-know-about-skeleton-screens-a820c45a571a) ·
[skeleton screens, ECCE 2018](https://dl.acm.org/doi/10.1145/3232078.3232086) ·
[DecodeChess](https://decodechess.com/natural-language-chess-analysis/)

Reimplementations, read and not used: [WintrCat/wintrchess](https://github.com/WintrCat/wintrchess) ·
[WintrCat/freechess](https://github.com/WintrCat/freechess)

[lila PR #11148]: https://github.com/lichess-org/lila/pull/11148

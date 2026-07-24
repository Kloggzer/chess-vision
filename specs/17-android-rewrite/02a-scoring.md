# Phase 02a — move scoring: touched squares, log-likelihood, prior, confirmer

Module `:core-engine`, package `com.chesslab.engine`. Runs in parallel with 02b/02c
(different modules — no shared files).

## Why

Everything the detection state machine (phase 03) decides is a ranking of legal moves
against the fused z-map. That ranking is five small pure functions in
`src/chesslab/move_tracker/tracker.py`:
`move_touched_squares` (:456), `move_destination_squares` (:474), `loglik_scores` (:544),
`loglik_pair_scores` (:563), `move_prior` (:597), plus the streak voter `Confirmer` (:639).
They are the highest-leverage parity surface in the pack: a single wrong square in
`move_touched_squares` silently changes every score, every ambiguity margin and every
commit. They are also trivially testable against golden fixtures, so they get ported
first and pinned hard.

The legacy port had these in one 200-line `MoveScoring` object with the game wrapper
bleeding into it. This phase splits them into four single-purpose files plus the chesslib
wrapper.

## Files you own

```
android/core-engine/src/main/kotlin/com/chesslab/engine/Game.kt
android/core-engine/src/main/kotlin/com/chesslab/engine/MoveSquares.kt
android/core-engine/src/main/kotlin/com/chesslab/engine/Scoring.kt
android/core-engine/src/main/kotlin/com/chesslab/engine/MovePrior.kt
android/core-engine/src/main/kotlin/com/chesslab/engine/Confirmer.kt
android/core-engine/src/test/kotlin/com/chesslab/engine/MoveSquaresTest.kt
android/core-engine/src/test/kotlin/com/chesslab/engine/ScoringTest.kt
android/core-engine/src/test/kotlin/com/chesslab/engine/MovePriorTest.kt
android/core-engine/src/test/kotlin/com/chesslab/engine/ConfirmerTest.kt
```

Touch nothing else. `TrackerConfig` (`api/TrackerConfig.kt`, phase 00a) is read-only input.

## Design (decided — do not redesign)

### `Game.kt` — chesslib 1.3.4 wrapper

The only place in the pack that knows `com.github.bhlangonijr.chesslib`. Everything else
speaks `String` squares (`"a1".."h8"`, lowercase) and `Move`.

The exact chesslib API surface (**verified by reading `android-legacy/engine/src/main/kotlin/com/chesslab/engine/Game.kt`
and `.../MoveScoring.kt` for API USAGE ONLY — their logic is a negative reference and is
not carried over**):

| Need | chesslib call |
|---|---|
| position | `com.github.bhlangonijr.chesslib.Board()`, `board.loadFromFen(fen)`, `board.fen` |
| legal moves | `com.github.bhlangonijr.chesslib.move.MoveGenerator.generateLegalMoves(board): List<Move>` |
| play / take back | `board.doMove(move)` / `board.undoMove()` |
| side to move | `board.sideToMove == Side.WHITE` |
| piece on square | `board.getPiece(Square.valueOf(sq.uppercase()))`; `Piece.NONE` means empty; FEN char via `piece.fenSymbol.first()` |
| move endpoints | `move.from` / `move.to` (`Square`), `.value().lowercase()` = `"e4"`, `.file.ordinal` = 0..7, `.rank.ordinal` = 0..7 |
| promotion piece | `move.promotion` (`Piece.NONE` when none), `.fenSymbol`, `.pieceType` |
| SAN | `com.github.bhlangonijr.chesslib.move.MoveList(board.fen)`, `list.add(mv)` per ply, `list.toSanArray()` — SAN of a *not yet pushed* sequence without mutating `board` |
| check / mate / draw | `board.isKingAttacked`, `board.isMated`, `board.isDraw` |
| castling rights | `board.getCastleRight(Side)` — `CastleRight.NONE` means none |
| en-passant target | `board.enPassant` (`Square.NONE` when unset) |

Public surface:

```kotlin
const val STARTPOS = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

class Game(fen: String = STARTPOS) {
    fun fen(): String
    fun boardFen(): String                 // PLACEMENT ONLY — the first FEN field. 02c keys on it.
    val whiteToMove: Boolean
    fun legalMoves(): List<Move>
    fun push(move: Move)
    fun pop()
    fun pieceCharAt(square: String): Char? // 'P'..'k', null = empty
    fun labelAt(square: String): String    // config.label_from_piece: 'P'->"wP", 'n'->"bN", null->"empty"
    fun hasCastlingRights(white: Boolean): Boolean
    fun san(move: Move): String
    fun sanSequence(moves: List<Move>): List<String>
    fun result(): GameResult               // data class(inCheck, checkmate, over)
    fun copy(): Game                       // via fen(); stack is NOT copied (python `board.copy(stack=False)`)
}
fun uciOf(move: Move): String              // "e2e4", "e7e8q" (promotion char lowercase)
```

`boardFen()` and `labelAt()` exist here because 02c needs them and must not import
chesslib types itself beyond `Move`/`Board`.

### `MoveSquares.kt`

Move classification first — `Move` alone does not say castling/en-passant, so derive it
from the position. Legal moves only; the derivation is then exact:

```kotlin
fun isCastling(g: Game, mv: Move): Boolean   // pieceCharAt(from).uppercase == 'K' && |to.file - from.file| == 2
fun isKingsideCastling(g, mv) = isCastling(g, mv) && mv.to.file.ordinal > mv.from.file.ordinal
fun isQueensideCastling(g, mv) = isCastling(g, mv) && mv.to.file.ordinal < mv.from.file.ordinal
fun isEnPassant(g, mv): Boolean              // pieceCharAt(from).uppercase == 'P' && to.file != from.file && pieceCharAt(to) == null
fun isCapture(g, mv): Boolean                // pieceCharAt(to) != null || isEnPassant
fun givesCheck(g, mv): Boolean               // g.copy().push(mv).result().inCheck
```

`moveTouchedSquares` — port of `tracker.py:456 move_touched_squares`. Squares the move
*physically changes*:

- always `from` and `to`;
- castling: `rank = from.rank`; kingside (`to.file > from.file`) adds **file 7 and file 5**
  on that rank (`h1,f1` / `h8,f8`); queenside adds **file 0 and file 3** (`a1,d1` / `a8,d8`).
  Note it is the rook's *from* and *to*, both;
- en passant: adds `(to.file, from.rank)` — the captured pawn's square.

Return `Set<String>`.

`moveDestinationSquares` — port of `tracker.py:474 move_destination_squares`. Squares that
*gain* a piece: `to`, plus on kingside castling file 5 (`f1`/`f8`) and on queenside
castling file 3 (`d1`/`d8`). **The rook's from-square and the en-passant captured square
are NOT destinations** (they are vacated). This asymmetry against `moveTouchedSquares` is
load-bearing (phase 03b uses destinations for the vacate/gain evidence split) — do not
"unify" the two functions.

### `Scoring.kt`

```kotlin
private fun logits(z: Map<String, Double>, zThr: Double, k: Double): Map<String, Double> =
    z.mapValues { (_, v) -> (k * (v - zThr)).coerceIn(-12.0, 12.0) }
```

`logit(sigmoid(x)) == x`, so a square's contribution is directly `k*(z - zThr)`, clipped
to ±12 (`tracker.py:554-556`).

`loglikScores(g, z, zThr = 3.0, k = 1.0): List<Pair<Move, Double>>` — port of
`tracker.py:544`. For every legal move: `sum of logits[s] for s in moveTouchedSquares`.
Sorted **descending by score**. Empty list when there are no legal moves.

`loglikPairScores(g, z, zThr = 3.0, k = 1.0, soft: Double? = null): List<Pair<List<Move>, Double>>`
— port of `tracker.py:563`.

- `soft = soft ?: zThr * 0.5`.
- Endpoint gate `ok(mv)`: `z[from] >= soft && z[to] >= soft` — **only from/to**, not the
  full touched set.
- Outer loop over `g.legalMoves()` filtered by `ok`; push onto a copy; inner loop over the
  reply's legal moves filtered by `ok` **on the pushed position**.
- Score = `sum of logits over (touched(mv1) ∪ touched(mv2, after mv1))` — the UNION, so a
  square used by both plies counts once.
- Order is fixed by side to move; there is no second ordering. Sorted descending.

Sort stability: Python's `list.sort(key=lambda t: -t[1])` is stable and the input order is
chesslib/python-chess move-generation order, which differs. **Ties are therefore not
order-comparable across languages** — tests compare the best SCORE exactly and the best
move only where the fixture marks the top score as strictly separated (`00b` emits
`top_unique: true`). Do not add a tie-break that Python does not have.

### `MovePrior.kt`

`movePrior(g, mv): Double` — port of `tracker.py:597`:
`+0.5` capture, `+0.3` gives check, `+0.2` forward
(`fwd = to.rank - from.rank`; counts when `(fwd > 0) == whiteToMove && fwd != 0`),
then `min(p, 1.0)`. Never negative, cap 1.0.

### `Confirmer.kt`

Port of `tracker.py:639`. Same key `confirmFrames` times in a row → `feed` returns true.

```kotlin
class Confirmer(private val confirmFrames: Int) {
    private var cand: Pair<String, Int>? = null
    fun feed(key: String?): Boolean   // null clears the candidate and returns false
    fun reset()
    val count: Int get() = cand?.second ?: 0   // 0 when no candidate
}
```

`feed(key)`: `cnt = if (cand?.first == key) cand.second + 1 else 1`; store; return
`cnt >= confirmFrames`. A different key restarts the streak at 1 (not 0). `feed(null)`
resets to no-candidate (`count == 0`) and returns false. `confirmFrames <= 1` means the
first feed already confirms.

No `Atomic*`, no `synchronized` — hard rule 2 of `entry.md`.

## Steps

### 1. `Game.kt` — commit `feat(engine): chesslib game wrapper (FEN, legal moves, SAN, undo)`

### 2. `MoveSquares.kt` — commit `feat(engine): move classification + touched/destination squares`

### 3. `Scoring.kt` + `MovePrior.kt` — commit `feat(engine): log-likelihood move and pair scoring + move prior`

### 4. `Confirmer.kt` — commit `feat(engine): confirm-frames streak voter`

### 5. Tests — commit `test(engine): scoring parity against python golden fixtures`

Fixtures come from phase 00b (`scripts/emit_parity_fixtures.py`), JSONL under
`android/core-engine/src/test/resources/fixtures/`:

- `scoring_touched.jsonl` — `{fen, uci, touched: [..], destinations: [..]}`
- `scoring_loglik.jsonl` — `{fen, z: {sq: float}, z_thr, k, top: [[uci, score], ...], top_unique: bool}`
- `scoring_pair.jsonl` — `{fen, z, z_thr, k, soft, top: [[[uci, uci], score], ...], top_unique}`
- `scoring_prior.jsonl` — `{fen, uci, prior}`

If a fixture file named here is absent, **STOP** and record the blocker in `STATUS.md` —
do not invent fixture data.

Test classes:

- `MoveSquaresTest` — every `scoring_touched.jsonl` row, EXACT set equality. Plus
  hand-written cases:
  - white kingside `e1g1` → `{e1,g1,h1,f1}`; destinations `{g1,f1}`.
  - black queenside `e8c8` → `{e8,c8,a8,d8}`; destinations `{c8,d8}`.
  - en passant `e5d6` after `...d7d5` → touched `{e5,d6,d5}`; destinations `{d6}` only.
  - promotion `e7e8q` and `e7e8n` → both touched `{e7,e8}`, destinations `{e8}` — the
    promotion piece must not change the square sets.
  - capture-promotion `e7d8q` → touched `{e7,d8}`.
  - plain quiet move `e2e4` → `{e2,e4}`.
- `ScoringTest` — every `scoring_loglik.jsonl` / `scoring_pair.jsonl` row: best score
  within `1e-4` relative; best UCI EXACT where `top_unique`; the returned list is sorted
  non-increasing; second-best score within `1e-4`. Plus:
  - all-zero z → every score equals `count(touched) * (-zThr)` clipped, list still sorted.
  - a z of `+100` on one square clips its contribution to exactly `+12.0`.
  - pair gate: a pair whose second ply has `z[to] = soft - 0.001` is absent from the result;
    at `soft` exactly it is present (`>=`).
  - pair union: `e2e4`/`e7e5` share no square; a pair where ply 2 recaptures on ply 1's
    to-square counts that square ONCE.
  - no legal moves (stalemate/mate FEN) → both functions return an empty list.
- `MovePriorTest` — fixture rows within `1e-4`, plus: quiet forward pawn = 0.2; capture +
  check + forward = 1.0 (capped, not 1.1); backward king move = 0.0; a forward move for
  black means *decreasing* rank.
- `ConfirmerTest` — `Confirmer(2)`: `feed("a")` false, `feed("a")` true, `feed("b")` false
  with `count == 1`, `feed(null)` → `count == 0`, `feed("b")` false again (streak restarted).
  `Confirmer(1)`: first feed true. `reset()` mid-streak drops `count` to 0.

Run once:
`cd android; .\gradlew.bat :core-engine:test --tests "com.chesslab.engine.MoveSquaresTest" --tests "com.chesslab.engine.ScoringTest" --tests "com.chesslab.engine.MovePriorTest" --tests "com.chesslab.engine.ConfirmerTest"`

Then `.\gradlew.bat :core-engine:ktlintFormat` and `.\gradlew.bat :core-engine:detekt`.

## Acceptance criteria

- The four test classes are green; every fixture row consumed (assert row count > 0 per file
  so an empty fixture cannot pass silently).
- `grep -rn "com.github.bhlangonijr" android/core-engine/src/main/kotlin | grep -v "Game.kt\|MoveSquares.kt\|Scoring.kt\|MovePrior.kt"` — no hits outside the files that
  genuinely take a `Move` parameter.
- `grep -n "coerceIn(-12.0, 12.0)" android/core-engine/src/main/kotlin/com/chesslab/engine/Scoring.kt` hits.
- `grep -rn "synchronized\|Atomic\|@Volatile\|Mutex" android/core-engine/src/main/kotlin/com/chesslab/engine/{Game,MoveSquares,Scoring,MovePrior,Confirmer}.kt` — zero hits.
- ktlint/detekt clean for `:core-engine`, zero `@Suppress`.
- `STATUS.md` row 02a `done` + one-line summary; every Python/spec discrepancy recorded.

## Do NOT

- Do NOT merge `moveTouchedSquares` and `moveDestinationSquares`.
- Do NOT add a tie-break, a stable-sort shim, or a secondary sort key to the scored lists.
- Do NOT apply the prior inside `loglikScores` — phase 03c decides when the prior is added.
- Do NOT let `Confirmer` know about moves; its key is an opaque `String`.
- Do NOT add OpenCV, Android, or coroutine imports to `:core-engine`.
- Do NOT copy logic from `android-legacy/**`; API usage only, as declared above.

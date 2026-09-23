package com.chesslab.tracker.analysis

import com.chesslab.tracker.games.ReviewSegment
import com.chesslab.tracker.games.SeamOrigin
import com.chesslab.tracker.games.StoredGame
import com.chesslab.tracker.games.StoredMove
import com.chesslab.tracker.games.reviewView
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

private val BUDGET = ReviewBudget()

private const val START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

private const val SANS = "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6"

private fun score(
    cp: Int,
    best: String? = null,
    mate: Int? = null,
) = Score(cp, 18, listOfNotNull(best), mate)

private fun grade(scores: List<Score?>) = grade(reviewGameOf(SANS, scores.size - 1), scores, BUDGET)

class GameReviewTest {
    @Test
    fun anImportedBlackToMoveFenCarriesTheRealSideAndMoveNumberIntoTheGrade() {
        val blackToMove = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 42"
        val imported =
            StoredGame(
                id = "black-start",
                startFen = blackToMove,
                startedAtEpochMs = 0,
                finishedAtEpochMs = 1,
                profileName = "test",
                result = "*",
                moves = listOf(StoredMove(1, "e5", "e7e5", 0)),
            ).reviewView()

        val ply = grade(imported, listOf(score(20), score(20)), BUDGET).of(1)!!

        assertFalse(ply.whiteMoved)
        assertEquals(42, ply.moveNumber)
    }

    @Test
    fun aLossIsMeasuredFromTheMoversPointOfView() {
        val white = grade(listOf(score(20), score(-60))).of(1)!!
        assertTrue(white.winBefore > white.winAfter)
        assertEquals(MoveQuality.INACCURACY, white.quality)

        val black = grade(listOf(score(20), score(20), score(220))).of(2)!!
        assertTrue(black.winBefore > black.winAfter)
    }

    @Test
    fun pliesAreSplitBetweenTheSidesThatPlayedThem() {
        val graded = grade(listOf(score(0), score(-600), score(0), score(-600)))
        assertEquals(listOf(1, 2, 3), graded.byPly.keys.toList())
        assertEquals(2, graded.white.plies, "plies 1 and 3")
        assertEquals(1, graded.black.plies, "ply 2")
        assertEquals(2, graded.white.count(MoveQuality.BLUNDER))
        assertEquals(1, graded.black.count(MoveQuality.BLUNDER))
    }

    /** `Rxc6+` lost 1 866 cp and moved the winning chances not at all, yet was badged BLUNDER. */
    @Test
    fun tradingAMateForAWonEndgameIsNotABlunder() {
        val kept = grade(listOf(score(10_000), score(8_134))).of(1)!!
        assertEquals(kept.winBefore, kept.winAfter, 1e-9, "both are past the ceiling, so both are one number")
        assertEquals(MoveQuality.GOOD, kept.quality, "not the engine's move, but it gave away nothing")
        assertTrue(kept.decided, "and it cannot count towards anybody's accuracy")

        // Mate-in-5 to mate-in-9 is the same score at both ends and therefore no loss at all.
        assertEquals(MoveQuality.GOOD, grade(listOf(score(10_000), score(10_000))).of(1)!!.quality)

        // Throwing the whole game away from a won position still is one, and is NOT "decided":
        // saturated at both ends but on opposite sides is the largest blunder there is.
        val thrown = grade(listOf(score(10_000), score(-10_000))).of(1)!!
        assertEquals(MoveQuality.BLUNDER, thrown.quality)
        assertFalse(thrown.decided)
    }

    @Test
    fun aMoveThatBeatsTheEngineNeverPaysForABlunderElsewhere() {
        val graded = grade(listOf(score(0), score(-600), score(-900)))
        assertEquals(100.0, graded.of(2)!!.accuracy, 1e-9, "Black gained; the drop floors at zero")
        assertTrue(graded.white.accuracy!! < 50.0, "and White's blunder is not averaged away by it")
    }

    @Test
    fun theEnginesOwnMoveIsBothTheBadgeAndTheAdvice() {
        val played = grade(listOf(score(20, best = "e2e4"), score(20))).of(1)!!
        assertEquals(MoveQuality.BEST, played.quality)
        assertEquals("e4", played.bestSan)
        assertEquals("e4", played.san, "and the ply names itself, so a finding needs nothing else")

        val other = grade(listOf(score(20, best = "d2d4"), score(20))).of(1)!!
        assertEquals(MoveQuality.GOOD, other.quality)
        assertEquals("d4", other.bestSan, "named in SAN from the position BEFORE the ply")
    }

    @Test
    fun theEnginesWholeLineIsNamedInSanAndStopsAtTheFirstMoveItCannotPlay() {
        val line = grade(listOf(Score(20, 18, listOf("d2d4", "d7d5", "c2c4")), score(20))).of(1)!!
        assertEquals(listOf("d4", "d5", "c4"), line.bestLine)

        val broken = grade(listOf(Score(20, 18, listOf("d2d4", "e7e5", "h1h8")), score(20))).of(1)!!
        assertEquals(listOf("d4", "e5"), broken.bestLine, "h1h8 is not legal there, and everything after it is fiction")
    }

    @Test
    fun aForcedMateLostByTheMoverIsNamedAndItsLineRemainsReplayable() {
        val missed = grade(listOf(Score(10_000, 18, listOf("d2d4", "d7d5"), mate = 3), score(0))).of(1)!!
        assertTrue(missed.mateBefore)
        assertFalse(missed.mateAfter)
        assertTrue(missed.missedMate)
        assertEquals(listOf("d2d4", "d7d5"), missed.bestUciLine)

        val frames = lineFrames(START, missed.bestUciLine)
        assertEquals(3, frames.size)
        assertNull(frames.first().lastMoveUci)
        assertEquals("d7d5", frames.last().lastMoveUci)

        val best = grade(listOf(Score(10_000, 18, listOf("e2e4"), mate = 3), score(0))).of(1)!!
        assertTrue(best.playedBest)
        assertFalse(best.missedMate, "a shallow follow-up search must not call the engine's own move a missed mate")
    }

    @Test
    fun movesThatOnlyContinueTheSameForcedMateAreExcludedFromAccuracy() {
        val graded = grade(listOf(score(10_000, mate = 3), score(10_000, mate = 2), score(10_000, mate = 1)))

        assertTrue(graded.of(1)!!.forcedMateLine)
        assertTrue(graded.of(2)!!.forcedMateLine)
        assertEquals(0, graded.white.scored)
        assertEquals(0, graded.black.scored)
    }

    @Test
    fun whitesForcedMateIsNeverChargedToBlackAsAMissedMate() {
        val whiteKeepsMate = grade(listOf(score(0), score(10_000, mate = 3), score(10_000, mate = 2)))
        val blackPly = whiteKeepsMate.of(2)!!

        assertFalse(blackPly.mateBefore)
        assertFalse(blackPly.missedMate)
        assertEquals(0, whiteKeepsMate.missedMates(white = false))

        val blackLosesOwnMate = grade(listOf(score(0), score(-10_000, mate = -3), score(0)))
        assertTrue(blackLosesOwnMate.of(2)!!.missedMate)
        assertEquals(1, blackLosesOwnMate.missedMates(white = false))
    }

    /** Across a seam the "before" is not the previous move's result. The `cnn_recovery` DECIDER is
     *  deliberately not consulted: dropping recovered moves threw away half a game's evidence. */
    @Test
    fun theFirstPlyAfterASeamIsNotGraded() {
        val whole = reviewGameOf(SANS, 4)
        val seamed =
            whole.copy(
                segments =
                    listOf(
                        whole.segments.first().copy(plies = whole.plies.take(2)),
                        ReviewSegment(
                            startFen = whole.plies[1].fenAfter,
                            plies = whole.plies.drop(2),
                            enteredBy = SeamOrigin(fenBefore = START, sans = listOf("??"), ucis = listOf("a1a2"), decider = "cnn_recovery"),
                        ),
                    ),
            )
        val graded = grade(seamed, List(5) { score(it * -300) }, BUDGET)
        assertNull(graded.of(3), "ply 3 opens the new segment: its 'before' is on the far side of the gap")
        assertNotNull(graded.of(2))
        assertNotNull(graded.of(4))
        assertEquals(setOf(3), seamPlies(seamed))
    }

    @Test
    fun aRecoveredMoveIsGradedLikeAnyOther() {
        val graded = grade(listOf(score(0), score(-600), score(-600)))
        assertEquals(1, graded.white.scored)
        assertNotNull(graded.white.accuracy)
        assertEquals(listOf(1), graded.findings().map { it.ply })
    }

    /** A finish against a forced mate scores 100 % for free: device game 76.5 / 75.6 counted, 71.4 / 66.5 not. */
    @Test
    fun movesPlayedAfterTheGameWasDecidedDoNotCount() {
        val graded = grade(listOf(score(0), score(-600), score(-2_000), score(-3_000), score(-2_500)))
        assertFalse(graded.of(1)!!.decided, "0 -> -600 is still a game")
        assertTrue(graded.of(3)!!.decided, "-2000 -> -3000 is not")
        assertEquals(2, graded.white.plies)
        assertEquals(1, graded.white.scored, "only the ply that was still a game")
    }

    @Test
    fun aPlyIsWeightedByTheShallowerOfItsTwoSearches() {
        assertEquals(9, grade(listOf(Score(0, 20), Score(0, 9))).of(1)!!.depth)
        assertEquals(9, grade(listOf(Score(0, 9), Score(0, 20))).of(1)!!.depth)
    }

    @Test
    fun aPartialRunGradesOnlyThePliesWhoseBothPositionsAreIn() {
        val graded = grade(listOf(score(0), score(-600), null, score(0)))
        assertEquals(listOf(1), graded.byPly.keys.toList(), "plies 2 and 3 each need the missing position")
        assertEquals(3, graded.scored)
        assertEquals(4, graded.positions)
        assertEquals(listOf(0, -600, null, 0), graded.evalCp)
        assertEquals(listOf(null, null, null, null), graded.evalMate)
        assertFalse(graded.complete)
        assertNotNull(graded.of(1))
    }

    @Test
    fun findingsAreTheWorstFirstAndNothingBelowAnInaccuracy() {
        val graded = grade(listOf(score(0), score(-100), score(-100), score(-900), score(-900), score(-870)))
        assertEquals(listOf(3, 1), graded.findings().map { it.ply }, "ply 3 gave away more than ply 1")
        assertNull(graded.of(99), "asking for a ply that is not there is null, not a crash")
    }

    /** Sorted by SWING only: a `missedMate`-first sort let a mate missed at 98 % outrank every turning point. */
    @Test
    fun aMissedMateThatChangedNothingIsNotWhatDecidedTheGame() {
        val graded =
            grade(
                listOf(
                    score(0),
                    score(-900, best = "d7d5", mate = -6),
                    score(-900),
                ),
            )
        assertTrue(graded.of(2)!!.missedMate)
        assertEquals(listOf(2), graded.missedChances().map { it.ply })
        assertEquals(listOf(1), graded.findings().map { it.ply }, "the swing, not the missed mate")
    }

    @Test
    fun theNextPositionSearchedIsTheOneNearestTheReader() {
        val none = List<Score?>(6) { null }
        assertEquals(4, nextIndex(none, focus = 4))
        assertEquals(0, nextIndex(none, focus = 0))
        assertEquals(5, nextIndex(none, focus = 99), "a focus past the end walks back from the end")

        // Ply 2 spans positions 1 and 2; position 2 is in, so position 1 comes before anything further out.
        val partial = listOf(null, null, score(0), null, null, null)
        assertEquals(1, nextIndex(partial, focus = 2))
        assertEquals(3, nextIndex(listOf(score(0), score(0), score(0), null, null, null), focus = 2))
        assertNull(nextIndex(List(3) { score(0) }, focus = 1), "nothing left means the run is over")
    }
}

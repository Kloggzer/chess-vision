package com.chesslab.tracker.capture

import com.chesslab.engine.api.DebugCnnRead
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Die CNN-Kontrolle. Sie darf nichts sperren: der Mensch baut auf und entscheidet, das Modell
 * sagt nur, was es sieht — und es ist auf genau diesen Feldern am schwaechsten.
 */
class CaptureCheckTest {
    @Test
    fun theModelAgreeingIsTheOnlyGreenState() {
        val got = checkPlacement(listOf(target("c8", "wQ")), listOf(read("c8", "wQ", conf = 0.9)))

        assertEquals(Check.AGREES, got.getValue("c8"))
    }

    @Test
    fun anEmptySquareIsTheWarningWorthHaving() {
        """Der haeufigste Aufbaufehler bei 19 Figuren: eine vergessen oder danebengestellt."""
        val got = checkPlacement(listOf(target("c8", "wQ")), listOf(read("c8", null, occupied = false)))

        assertEquals(Check.EMPTY, got.getValue("c8"))
    }

    @Test
    fun aDifferentPieceIsAHintAndNotAnError() {
        val got = checkPlacement(listOf(target("c8", "wQ")), listOf(read("c8", "wK", conf = 0.9)))

        assertEquals(Check.OTHER_PIECE, got.getValue("c8"))
    }

    /**
     * 16 der 46 Luecken haben NULL Belege — auf ihnen ist das Modell nicht geprueft, und ein
     * unsicherer Read ist deshalb keine Aussage ueber den Aufbau.
     */
    @Test
    fun anUnconfidentReadClaimsNothing() {
        val got = checkPlacement(listOf(target("c8", "wQ")), listOf(read("c8", "wK", conf = 0.3, confident = false)))

        assertEquals(Check.UNSURE, got.getValue("c8"))
    }

    @Test
    fun withoutReadsNothingIsClaimed() {
        val got = checkPlacement(listOf(target("c8", "wQ")), emptyList())

        assertEquals(Check.OFF, got.getValue("c8"))
    }

    @Test
    fun aPieceOnASquareThatShouldBeEmptyIsFound() {
        """Sie macht jedes `empty`-Label des Frames falsch, also muss sie auffallen."""
        val reads = listOf(read("c8", "wQ", conf = 0.9), read("e5", "bP", conf = 0.9))

        assertEquals(listOf("e5"), strayPieces(listOf(target("c8", "wQ")), reads))
    }

    @Test
    fun anUnconfidentStrayIsNotReported() {
        val reads = listOf(read("e5", "bP", conf = 0.3, confident = false))

        assertTrue(strayPieces(emptyList(), reads).isEmpty())
    }

    @Test
    fun theSummaryCountsAndNeverBlocks() {
        val targets = listOf(target("c8", "wQ"), target("a8", "wK"), target("e8", "bQ"))
        val reads =
            listOf(
                read("c8", "wQ", conf = 0.9),
                read("a8", null, occupied = false),
                read("e8", "bK", conf = 0.9),
                read("h4", "bP", conf = 0.9),
            )

        val line = checkSummary(checkPlacement(targets, reads), strayPieces(targets, reads))

        assertTrue(line.contains("1 von 3"), line)
        assertTrue(line.contains("a8"), line)
        assertTrue(line.contains("h4"), line)
    }

    /**
     * Ein Auftrag ohne Zielfelder labelt jeden Frame `8/8/8/8/8/8/8/8` — genau dort ist eine
     * stehengelassene Figur der teuerste Fehler, und genau dort schwieg die Zeile.
     */
    @Test
    fun aStrayIsReportedEvenWhenTheShotPlacesNothing() {
        val line = checkSummary(emptyMap(), listOf("e5"))

        assertTrue(line.contains("e5"), line)
    }

    @Test
    fun withoutTargetsAndWithoutStraysThereIsNothingToSay() {
        assertEquals("", checkSummary(emptyMap(), emptyList()))
    }

    @Test
    fun withTheModelOffTheLineSaysSoRatherThanZero() {
        val targets = listOf(target("c8", "wQ"))

        assertTrue(checkSummary(checkPlacement(targets, emptyList()), emptyList()).contains("kein Modell"))
    }
}

private fun target(
    square: String,
    piece: String,
) = Target(square, piece, "mittel", 80, 130, 100, Fit.OK)

private fun read(
    square: String,
    label: String?,
    conf: Double = 0.0,
    occupied: Boolean = true,
    confident: Boolean = true,
) = DebugCnnRead(square, label, conf, 0.0, occupied, confident, null)

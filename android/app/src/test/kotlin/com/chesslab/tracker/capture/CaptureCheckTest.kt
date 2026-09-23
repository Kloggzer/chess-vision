package com.chesslab.tracker.capture

import com.chesslab.engine.api.DebugCnnRead
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Sie darf nichts sperren: das Modell ist auf genau diesen Feldern am schwaechsten. */
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

    /** 16 der 46 Luecken haben NULL Belege: ein unsicherer Read sagt dort nichts ueber den Aufbau. */
    @Test
    fun anUnconfidentReadClaimsNothing() {
        val got = checkPlacement(listOf(target("c8", "wQ")), listOf(read("c8", "wK", conf = 0.3, confident = false)))

        assertEquals(Check.UNSURE, got.getValue("c8"))
    }

    /** Die Reihenfolge der beiden Zweige entscheidet das, und nichts hielt sie fest. */
    @Test
    fun anUnconfidentReadThatHappensToMatchIsStillNoConfirmation() {
        val got = checkPlacement(listOf(target("c8", "wQ")), listOf(read("c8", "wQ", conf = 0.3, confident = false)))

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

    /** Ein Auftrag ohne Zielfelder labelt `8/8/8/8/8/8/8/8`: dort ist eine stehengelassene Figur am teuersten. */
    @Test
    fun aStrayIsReportedEvenWhenTheShotPlacesNothing() {
        val line = checkSummary(emptyMap(), listOf("e5"))

        assertTrue(line.contains("e5"), line)
    }

    @Test
    fun withoutTargetsAndWithoutStraysThereIsNothingToSay() {
        assertEquals("", checkSummary(emptyMap(), emptyList()))
    }

    /** Ohne Kamerabild ist die Zeile das EINZIGE, was sagt, was aufzubauen ist. */
    @Test
    fun theOrderNamesEverySquareBecauseThePictureMayBeMissing() {
        val targets = listOf(target("c8", "wQ"), target("a1", "bK"))

        val line = orderLine(targets)

        assertTrue(line.contains("wQ") && line.contains("c8"), line)
        assertTrue(line.contains("bK") && line.contains("a1"), line)
    }

    @Test
    fun anEmptyOrderSaysSoRatherThanBeingBlank() {
        assertTrue(orderLine(emptyList()).isNotEmpty())
    }

    @Test
    fun everyPieceHasItsOwnSymbol() {
        val all = listOf("wK", "wQ", "wR", "wB", "wN", "wP", "bK", "bQ", "bR", "bB", "bN", "bP")

        val symbols = all.map(::pieceSymbol)

        assertEquals(all.size, symbols.toSet().size, "zwei Figuren teilen sich ein Zeichen: $symbols")
        assertTrue(symbols.none { it.isBlank() }, symbols.toString())
    }

    @Test
    fun anUnknownPieceFallsBackToItsOwnName() {
        """Lieber `xx` als ein leeres Feld: ein Zielfeld ohne Zeichen waere gar keine Anweisung."""
        assertEquals("xx", pieceSymbol("xx"))
    }

    @Test
    fun theProgressCountsWhatTheModelCanSeeStanding() {
        val targets = listOf(target("c8", "wQ"), target("a8", "wK"), target("e8", "bQ"))
        val reads = listOf(read("c8", "wQ", conf = 0.9), read("a8", null, occupied = false))

        assertEquals("1 von 3 stehen", progressLine(checkPlacement(targets, reads)))
    }

    @Test
    fun withoutAModelTheProgressSaysHowManyToPlace() {
        val targets = listOf(target("c8", "wQ"), target("a8", "wK"))

        assertEquals("2 Figuren aufstellen", progressLine(checkPlacement(targets, emptyList())))
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

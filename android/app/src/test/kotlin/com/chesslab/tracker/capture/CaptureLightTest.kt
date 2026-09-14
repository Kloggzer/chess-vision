package com.chesslab.tracker.capture

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Die Livemessung entscheidet, nicht der Plan. Gemessen ohne Bitmap — [assign] und [lightAdvice]
 * bekommen die Helligkeiten als Karte, damit die Regel ohne Kamera pruefbar ist.
 */
class CaptureLightTest {
    @Test
    fun aSuggestionIsOverriddenByTheSquareThatIsActuallyInBand() {
        val place = listOf(Placement("a8", "wQ", "sehr dunkel", 0, 40))
        val measured = mapOf("a8" to 115, "c8" to 20, "b7" to 200)

        val got = assign(place, measured).single()

        assertEquals("c8", got.square)
        assertEquals(Fit.OK, got.fit)
    }

    @Test
    fun theSquareColourOfTheGapIsKept() {
        """`a8` ist hell; die Luecke fordert ein helles Feld, auch wenn ein dunkles besser passt."""
        val place = listOf(Placement("a8", "wQ", "sehr dunkel", 0, 40))
        val measured = mapOf("a8" to 115, "a7" to 10, "c8" to 60)

        val got = assign(place, measured).single()

        assertEquals("c8", got.square, "a7 ist dunkel und schliesst die Luecke nicht")
        assertEquals(Fit.TOO_BRIGHT, got.fit)
    }

    @Test
    fun withNoSquareInBandThePieceStaysOnTheNearestAndSaysWhichWay() {
        val place = listOf(Placement("a8", "wQ", "sehr hell", 180, 256))
        val measured = mapOf("a8" to 115, "c8" to 150)

        val got = assign(place, measured).single()

        assertEquals("c8", got.square)
        assertEquals(Fit.TOO_DARK, got.fit)
        assertTrue(lightAdvice(listOf(got)).contains("Licht hoch"), lightAdvice(listOf(got)))
    }

    @Test
    fun noTwoPiecesLandOnTheSameSquare() {
        val place =
            listOf(
                Placement("a8", "wQ", "mittel", 80, 130),
                Placement("c8", "wK", "mittel", 80, 130),
                Placement("e8", "bQ", "mittel", 80, 130),
            )
        val measured = mapOf("a8" to 100, "c8" to 101, "e8" to 102)

        val squares = assign(place, measured).map { it.square }

        assertEquals(squares.distinct(), squares)
    }

    @Test
    fun withoutAMeasurementNothingIsClaimed() {
        """Kein Brett im Bild ist kein „passt" — sonst baut der Nutzer auf eine leere Zusicherung."""
        val place = listOf(Placement("a8", "wQ", "sehr hell", 180, 256))

        val got = assign(place, emptyMap()).single()

        assertEquals(Fit.UNMEASURED, got.fit)
        assertEquals("a8", got.square)
        assertTrue(lightAdvice(listOf(got)).contains("kalibrieren"))
    }

    @Test
    fun theFenFollowsTheMeasurementNotTheSuggestion() {
        """Der Fehler, den das verhindert: jede Figur waere aufs vorgeschlagene Feld gelabelt."""
        val place = listOf(Placement("a8", "wQ", "sehr dunkel", 0, 40))
        val targets = assign(place, mapOf("a8" to 115, "c8" to 20))

        assertNotEquals(fenOfTargets(listOf(Target("a8", "wQ", "sehr dunkel", 0, 40, 115, Fit.TOO_BRIGHT))), fenOfTargets(targets))
        assertTrue(fenOfTargets(targets).startsWith("2Q5/"), fenOfTargets(targets))
    }

    /**
     * Gemessen am Manifest: eine Figur verschiebt den Crop-Mittelwert ihres Feldes um bis zu 61
     * Grauwerte (Median -22 fuer Schwarz), 16 von 80 Verschiebungen ueberspringen ein ganzes Band.
     * Ohne [refit] haette die erste hingestellte Figur die Belegung neu gewuerfelt.
     */
    @Test
    fun aPlacedPieceMustNotMakeTheAssignmentWander() {
        val place = listOf(Placement("a8", "wQ", "sehr dunkel", 0, 40))
        val onEmptyBoard = assign(place, mapOf("a8" to 115, "c8" to 20, "e8" to 30))
        assertEquals("c8", onEmptyBoard.single().square)

        // Die Dame steht jetzt auf c8 und hat das Feld um 40 Grauwerte gehoben.
        val withPiece = mapOf("a8" to 115, "c8" to 60, "e8" to 30)

        assertEquals("e8", assign(place, withPiece).single().square, "ohne refit wandert sie")
        assertEquals("c8", refit(onEmptyBoard, withPiece).single().square)
    }

    @Test
    fun refitKeepsTheSquareButNotTheVerdict() {
        """Das Licht muss weiter beurteilt werden — nur die Felder stehen fest."""
        val frozen = listOf(Target("c8", "wQ", "sehr dunkel", 0, 40, 20, Fit.OK))

        val got = refit(frozen, mapOf("c8" to 90)).single()

        assertEquals("c8", got.square)
        assertEquals(90, got.measured)
        assertEquals(Fit.TOO_BRIGHT, got.fit)
        assertTrue(lightAdvice(listOf(got)).contains("Licht runter"))
    }

    @Test
    fun refitWithoutAMeasurementClaimsNothing() {
        val frozen = listOf(Target("c8", "wQ", "sehr dunkel", 0, 40, 20, Fit.OK))

        assertEquals(Fit.UNMEASURED, refit(frozen, emptyMap()).single().fit)
    }

    /**
     * Ueber acht Drehungen kann das Licht wandern — eine Aufnahme, die dabei aus dem Band laeuft,
     * faellt sonst erst im fertigen Datensatz auf, wenn die Frames schon geschrieben sind.
     */
    @Test
    fun theDriftIsMeasuredAgainstTheMomentTheSquaresWereFrozen() {
        val frozen = listOf(at("c8", 200), at("e8", 190), at("g8", 180))
        val live = listOf(at("c8", 178), at("e8", 170), at("g8", 162))

        val line = driftLine(frozen, live)

        assertTrue(line.contains("-20"), line)
        assertTrue(line.contains("c8"), "das staerkste Feld gehoert benannt: $line")
    }

    @Test
    fun aStableLightSaysSoRatherThanShowingZero() {
        val frozen = listOf(at("c8", 200))

        assertTrue(driftLine(frozen, listOf(at("c8", 201))).contains("stabil"))
    }

    @Test
    fun withoutAReferenceNothingIsClaimed() {
        assertEquals("", driftLine(emptyList(), listOf(at("c8", 200))))
    }

    @Test
    fun anUnmeasuredLiveSquareIsSkippedNotCountedAsZero() {
        """Ein fehlender Read ist keine Verschiebung — er waere sonst ein Sturz um 200."""
        val frozen = listOf(at("c8", 200), at("e8", 190))
        val live = listOf(at("c8", 198), at("e8", null))

        assertTrue(driftLine(frozen, live).contains("stabil"), driftLine(frozen, live))
    }

    @Test
    fun theParityRuleMatchesTheBoard() {
        assertTrue(squareIsDark("a1") && squareIsDark("a3"))
        assertTrue(!squareIsDark("b1") && !squareIsDark("h3"))
    }

    @Test
    fun theAdviceCountsTheMajorityBecauseALampMovesEverySquareAtOnce() {
        val dark = Target("a1", "wQ", "sehr hell", 180, 256, 40, Fit.TOO_DARK)
        val ok = Target("b1", "wK", "sehr hell", 180, 256, 200, Fit.OK)

        assertTrue(lightAdvice(listOf(dark, dark, ok)).contains("Licht hoch"))
        assertTrue(lightAdvice(listOf(ok, ok)).contains("alle 2"))
    }
}

private fun at(
    square: String,
    value: Int?,
) = Target(square, "wQ", "sehr hell", 180, 256, value, Fit.OK)

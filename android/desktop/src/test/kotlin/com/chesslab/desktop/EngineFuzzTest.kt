package com.chesslab.desktop

import com.chesslab.engine.api.TrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Der synthetische Treiber taugt nur, wenn die Engine seine Bilder LIEST. Ein Fuzzer, dessen
 * Frames nie einen Zug ergeben, meldet jeden Zustand als unerreichbar und sieht dabei gruen aus.
 */
class EngineFuzzTest {
    init {
        // `RoiMotion` warpt mit OpenCV — der Treiber misst die Bewegung seit 2026-09-20 echt.
        NativeCv.require()
    }

    @Test
    fun `die Engine committet die synthetischen Zuege`() {
        val out = fuzzRun(TrackerConfig(), Scene(plies = 6))

        assertTrue(out.committed >= 4, "nur ${out.committed} von 6 Halbzuegen committet: ${out.reached}")
    }

    @Test
    fun `derselbe Seed liefert denselben Lauf`() {
        val a = fuzzRun(TrackerConfig(), Scene(plies = 4), seed = 7)
        val b = fuzzRun(TrackerConfig(), Scene(plies = 4), seed = 7)

        assertEquals(a.reached, b.reached, "ohne Determinismus ist kein Befund wiederholbar")
    }

    @Test
    fun `ohne Bewegung erreicht der Lauf nie den Bewegungszustand`() {
        // Ohne Zug und ohne Hand sind die Frames bytegleich, `RoiMotion` misst also 0.
        val out = fuzzRun(TrackerConfig(), Scene(plies = 0, handSquares = 0))

        assertEquals(0, out.hits("gate:moving"), "ein stehendes Brett darf kein `moving` erzeugen")
    }

    /** Zweimal still verloren: graues Brett, dann Textur am Helligkeitswert statt am Inhalt.
     *  Beide Male stand `verify:shadow` auf null und sah aus wie ein toter Sensor. */
    @Test
    fun `eine Hand mit Schatten schaerft das Schatten-Veto`() {
        val out = fuzzRun(TrackerConfig(), Scene(plies = 4, handFrames = 24, handSquares = 10, handCoverage = 0.6))

        assertTrue(out.hits("veto:shadow") > 0, "das Schatten-Veto muss feuern: ${out.reached}")
    }

    /** Ein verdeckter Abtausch muss die Engine auf einen anderen WEG zwingen. Nicht auf weniger
     *  Commits: sie leitet die Folge her und committet beide (gemessen 8 von 8). */
    @Test
    fun `ein verdeckter Abtausch oeffnet Zustaende, die der klare Lauf nie sieht`() {
        val ohne = fuzzRun(TrackerConfig(), Scene(plies = 8))
        val mit = fuzzRun(TrackerConfig(), Scene(plies = 8, hiddenEvery = 2))

        val neu = mit.reached.keys - ohne.reached.keys
        assertTrue(neu.isNotEmpty(), "kein neuer Zustand: ${mit.reached.keys} gegen ${ohne.reached.keys}")
    }

    @Test
    fun `eine Hand erreicht den Verdeckungszustand`() {
        val out = fuzzRun(TrackerConfig(), Scene(plies = 4, handFrames = 30, handSquares = 12, handCoverage = 0.4))

        assertTrue(
            out.hits("gate:occluded") + out.hits("state:occluded") > 0,
            "zwoelf verdeckte Felder muessen den Pfad erreichen: ${out.reached}",
        )
    }
}

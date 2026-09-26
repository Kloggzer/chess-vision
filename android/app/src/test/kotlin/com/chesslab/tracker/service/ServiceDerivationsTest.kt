package com.chesslab.tracker.service

import android.app.Application
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.cnn.BUNDLED_MODELS
import com.chesslab.tracker.cnn.ModelSpec
import com.chesslab.tracker.cnn.claheSpecFor
import com.chesslab.tracker.cnn.modelConfigJson
import com.chesslab.tracker.settings.FrameRateMode
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File

/** Vier Ableitungen entscheiden, welchen Tracker das Handy faehrt: `gridArm` (Phantom-Veto), `cropClahe`,
 *  `engineConfig` und `BUNDLED_MODELS` (der Picker). */
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, application = Application::class)
class ServiceDerivationsTest {
    @Test
    fun `a model declaring its own coverage switches the model-free hand arm off`() {
        assertFalse(gridArmFor(spec(coverageOutput = true)))
    }

    @Test
    fun `a model without coverage keeps the model-free hand arm on`() {
        assertTrue("das ist der Arm hinter 67/67 mit 0 erfundenen", gridArmFor(spec(coverageOutput = false)))
        assertTrue("ohne Modell erst recht", gridArmFor(null))
    }

    @Test
    fun `a CLAHE-trained model is served with CLAHE, a plain one without`() {
        // Die ENTSCHEIDUNG, nicht das Objekt: `CropClahe` braucht OpenCV-Natives, die `:app` nicht traegt.
        assertNotNull("sonst sieht das Standardmodell rohe Pixel", claheSpecFor(spec(claheClip = 2.0)))
        assertNull(claheSpecFor(spec(claheClip = 0.0)))
        assertNull(claheSpecFor(null))
    }

    @Test
    fun `engineConfig applies the measured board, the model gate and the frame rate together`() {
        val stored = TrackerConfig(boardSize = 800, motionThr = 0.25)

        val spec = spec(coverageOutput = true, coverageGate = 0.25)

        val out = engineConfig(stored, BoardGeometry(boardSize = 928), spec, FrameRateMode.FPS15)

        assertEquals("die gemessene Brettgroesse gewinnt", 928, out.boardSize)
        assertEquals("die Schwelle reist im Modell", 0.25, out.pOccludedThr, 1e-9)
        assertEquals("halbe Rate, doppelte Bewegung je Frame", 0.5, out.motionThr, 1e-9)
    }

    @Test
    fun `engineConfig changes ONE thing at the reference rate without a spec`() {
        // `taintIdentityThr` setzt die App selbst — sonst galt ein Schlagzug als Hand (19,5 s Stillstand).
        val stored = TrackerConfig(boardSize = 928, motionThr = 0.25)

        val out = engineConfig(stored, BoardGeometry(boardSize = 928), null, FrameRateMode.FPS30)

        assertEquals(stored, out.copy(taintIdentityThr = stored.taintIdentityThr))
        assertEquals(0.5, out.taintIdentityThr, 0.0)
    }

    @Test
    fun `every bundled model is really in the APK, and every model in the APK is offered`() {
        // Die dokumentierte Falle: `BUNDLED_MODELS` ist handgepflegt, ein nur abgelegtes Modell erscheint nie.
        val onDisk = File("src/main/assets/cnn_model").listFiles()?.filter { it.isDirectory }?.map { it.name }

        assertEquals(onDisk?.sorted(), BUNDLED_MODELS.sorted())
    }

    private fun spec(
        coverageOutput: Boolean = false,
        coverageGate: Double? = null,
        claheClip: Double = 0.0,
    ): ModelSpec =
        ModelSpec.parse(
            modelConfigJson(
                outSize = listOf(80, 80),
                mean = null,
                coverageOutput = coverageOutput,
                coverageGate = coverageGate,
                claheClip = claheClip.takeIf { it > 0.0 },
            ),
        )
}

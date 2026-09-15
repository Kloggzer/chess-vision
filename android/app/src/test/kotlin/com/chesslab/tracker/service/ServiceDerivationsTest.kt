package com.chesslab.tracker.service

import android.app.Application
import com.chesslab.cnn.PIECES13_CLASSES
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.cnn.BUNDLED_MODELS
import com.chesslab.tracker.cnn.ModelSpec
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

/**
 * Vier Ableitungen entscheiden, welchen Tracker das Handy wirklich faehrt, und keine war
 * abgedeckt: `gridArm` schaltet den Phantom-Veto, `cropClahe` das Rezept des Standardmodells,
 * `engineConfig` Brettgroesse/Gate/Bildrate, und `BUNDLED_MODELS` entscheidet, was im Picker steht.
 */
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
        // Geprueft wird die ENTSCHEIDUNG, nicht das Objekt: `CropClahe` ruft `Imgproc.createCLAHE`,
        // und die `:app`-Unit-Tests tragen keine OpenCV-Natives.
        assertNotNull("sonst sieht das Standardmodell rohe Pixel", claheSpecFor(spec(claheClip = 2.0)))
        assertNull(claheSpecFor(spec(claheClip = 0.0)))
        assertNull(claheSpecFor(null))
    }

    @Test
    fun `engineConfig applies the measured board, the model gate and the frame rate together`() {
        val stored = TrackerConfig(boardSize = 800, motionThr = 0.25)

        val out = engineConfig(stored, BoardGeometry(boardSize = 928), spec(coverageGate = 0.25), FrameRateMode.FPS15)

        assertEquals("die gemessene Brettgroesse gewinnt", 928, out.boardSize)
        assertEquals("die Schwelle reist im Modell", 0.25, out.pOccludedThr, 1e-9)
        assertEquals("halbe Rate, doppelte Bewegung je Frame", 0.5, out.motionThr, 1e-9)
    }

    @Test
    fun `engineConfig leaves the stored values alone at the reference rate without a spec`() {
        val stored = TrackerConfig(boardSize = 928, motionThr = 0.25)

        val out = engineConfig(stored, BoardGeometry(boardSize = 928), null, FrameRateMode.FPS30)

        assertEquals(stored, out)
    }

    @Test
    fun `every bundled model is really in the APK, and every model in the APK is offered`() {
        // Die dokumentierte Falle: ein Modell, das nur in `assets/cnn_model/` liegt, erscheint nie
        // im Picker — `BUNDLED_MODELS` ist handgepflegt und von nichts gehuetet.
        val onDisk = File("src/main/assets/cnn_model").listFiles()?.filter { it.isDirectory }?.map { it.name }

        assertEquals(onDisk?.sorted(), BUNDLED_MODELS.sorted())
    }

    private fun spec(
        coverageOutput: Boolean = false,
        coverageGate: Double? = null,
        claheClip: Double = 0.0,
    ): ModelSpec {
        val coverage = if (coverageOutput) ", \"coverage_output\": true" else ""
        val gate = coverageGate?.let { ", \"coverage_gate\": $it" }.orEmpty()
        val clahe = if (claheClip > 0.0) ", \"clahe_clip\": $claheClip" else ""
        return ModelSpec.parse(
            """{"backbone": "x", "classes": ${PIECES13_CLASSES.joinToString(",", "[", "]") { "\"$it\"" }},""" +
                """ "out_size": [80, 80]$coverage$gate$clahe}""",
        )
    }
}

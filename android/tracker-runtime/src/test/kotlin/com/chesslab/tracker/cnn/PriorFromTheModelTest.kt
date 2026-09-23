package com.chesslab.tracker.cnn

import com.chesslab.cnn.ALL_SQUARES
import com.chesslab.cnn.EXPECTED_CLASSES
import com.chesslab.cnn.SquareClassifier
import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.CnnSnapshot
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestCoroutineScheduler
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test

/** `possibleFor` fragte den Konstruktor-Wert (im Replay 0) und liess den Prior des Modells ausfallen. */
@OptIn(ExperimentalCoroutinesApi::class)
class PriorFromTheModelTest {
    private val scheduler = TestCoroutineScheduler()
    private val snapshots = mutableListOf<CnnSnapshot>()
    private var now = 0L

    private fun observerWith(spec: ModelSpec?): CnnObserver {
        val observer =
            CnnObserver(
                source = { cnnFrame(1L) },
                fen = { OPENING },
                onSnapshot = { snapshots += it },
                priorLambda = 0.0,
                nowMs = { now },
                dispatcher = StandardTestDispatcher(scheduler),
            )
        observer.attach { Attached(OneClass(), "CPU", MODEL_FP32_FILE, spec) }
        scheduler.runCurrent()
        return observer
    }

    /** Ohne Prior ist `invalidMass` per Bauart 0. */
    private fun pOn(spec: ModelSpec?): Double {
        snapshots.clear()
        val observer = observerWith(spec)
        now = 10_000L
        observer.onFrameAvailable()
        scheduler.runCurrent()
        assertNotNull(snapshots.lastOrNull(), "keine Beobachtung")
        return snapshots.last().obs.invalidMass(FORBIDDEN)
    }

    @Test
    fun `the model's declared strength reaches the observation`() {
        val withModel = pOn(spec(PRIOR))
        val without = pOn(null)

        assertEquals(0.0, without, 1e-12, "ohne Modell-Prior gibt es keine verbotene Menge")
        assert(withModel > 0.0) {
            "der Prior des Modells kam nicht an — `possibleFor` fragte den Konstruktor-Wert (0,0)"
        }
    }

    private fun spec(prior: Double): ModelSpec =
        ModelSpec(
            classes = EXPECTED_CLASSES,
            outWidth = 1,
            outHeight = 1,
            padSide = 0.0,
            mean = listOf(0f, 0f, 0f),
            std = listOf(1f, 1f, 1f),
            temperature = T_SHIPPED,
            priorLambda = prior,
        )

    /** Dann ist der Prior das Einzige, was etwas bewegt. */
    private class OneClass : SquareClassifier {
        override val classes: List<String> = EXPECTED_CLASSES

        override fun classify(crops: List<BgrImage>): Array<FloatArray> =
            Array(ALL_SQUARES.size) { FloatArray(EXPECTED_CLASSES.size) { 1.0f / EXPECTED_CLASSES.size } }
    }

    private companion object {
        const val OPENING = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

        const val FORBIDDEN = "e4"
        const val PRIOR = 5.98
        const val T_SHIPPED = 1.495
    }
}

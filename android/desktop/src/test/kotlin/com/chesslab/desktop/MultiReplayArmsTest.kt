package com.chesslab.desktop

import com.chesslab.cnn.PIECES13_CLASSES
import com.chesslab.cnn.SquareClassifier
import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProbe
import com.chesslab.engine.perf.WorkProfiler
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.camera.CameraHealth
import com.chesslab.tracker.camera.DeliveredSize
import com.chesslab.tracker.cnn.Attached
import com.chesslab.tracker.pipeline.OpenCvStages
import com.chesslab.tracker.pipeline.StageTimings
import com.chesslab.tracker.service.CameraFrameBus
import com.chesslab.tracker.service.StatusPublisher
import com.chesslab.tracker.service.TrackerSeed
import com.chesslab.tracker.service.TrackerStack
import com.chesslab.tracker.settings.ConfigStore
import com.chesslab.tracker.settings.SettingsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Point
import org.opencv.core.Scalar
import org.opencv.imgproc.Imgproc
import java.util.concurrent.atomic.AtomicLong

/** B1: ab dem zweiten Zusatzarm bekam keine Engine einen Crop. Der alte Nachweis lief mit EINEM Arm
 *  — hier laufen drei und sechs gleiche Arme gegen den Einzellauf, echter Weg ueber [ExtraEngines]. */
class MultiReplayArmsTest {
    @Test
    fun `drei gleiche Zusatzarme sehen und entscheiden jeder wie der Einzellauf`() = armsMatchSingleRun(3)

    /** Sechs: ab da reichten die geteilten Graustufen-Ringe nicht mehr fuer alle Engines. */
    @Test
    fun `sechs gleiche Zusatzarme sehen und entscheiden jeder wie der Einzellauf`() = armsMatchSingleRun(6)

    @Test
    fun `ein Knopf der geteilten Bildkette bricht ab statt nur fuer den ersten Arm zu gelten`() {
        Harness().use { h ->
            val err =
                assertThrows(IllegalArgumentException::class.java) {
                    ExtraEngines.open(
                        listOf("a" to CONFIG, "b" to CONFIG.copy(diffClaheClip = CONFIG.diffClaheClip + 1.0)),
                        GEOMETRY,
                        null,
                        h.bus,
                        h.publisher,
                        { attached() },
                        h.scope,
                        h.settings,
                        { h.clock },
                        { h.clock },
                        START,
                        null,
                    )
                }
            assertTrue("diffClaheClip" in err.message.orEmpty())
        }
    }

    private fun armsMatchSingleRun(arms: Int) {
        val reference = single()
        assertEquals(listOf("e4", "e5"), reference.plies, "der Einzellauf selbst muss die Partie lesen")
        assertTrue(reference.observations > 0)
        val (runs, cuts) = multi(arms)
        println("single: cuts=${reference.cuts} observations=${reference.observations} ${reference.counters}")
        println("$arms Arme: cuts=$cuts")
        runs.forEachIndexed { i, arm -> println("k${i + 1}: observations=${arm.observations} ${arm.counters} ${arm.plies}") }
        assertEquals(reference.cuts, cuts, "der Crop-Warp laeuft je Frame EINMAL, nicht je Arm")
        runs.forEachIndexed { i, arm ->
            assertEquals(reference.observations, arm.observations, "k${i + 1}: Beobachtungen (${arm.counters})")
            assertEquals(reference.noCrops, arm.noCrops, "k${i + 1}: noCrops")
            assertEquals(reference.plies, arm.plies, "k${i + 1}: Zuege")
            assertEquals(reference.decisions, arm.decisions, "k${i + 1}: Entscheidungen")
        }
    }

    private class Run(
        val plies: List<String>,
        val decisions: List<String>,
        val observations: Long,
        val counters: String,
        val cuts: Long = 0,
    ) {
        val noCrops: Long = Regex("""noCrops=(\d+)""").find(counters)!!.groupValues[1].toLong()
    }

    private class Harness : AutoCloseable {
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.Unconfined)
        var clock = 0L
        val publisher = StatusPublisher(scope)
        val settings = SettingsRepository(NoStore, scope)
        val bus = CameraFrameBus(MutableStateFlow(CameraHealth.Up), scope, ::matToImage, nowMs = { clock }, publishPreviews = false)

        override fun close() = scope.cancel()
    }

    private fun single(): Run =
        Harness().use { h ->
            val decisions = mutableListOf<String>()
            val stack =
                TrackerStack(
                    TrackerSeed<Mat>(
                        config = CONFIG,
                        geometry = { GEOMETRY },
                        corners = null,
                        startFen = START,
                        onDecision = { d -> d.san?.let { decisions += "$it@${h.clock}/${d.decider}" } },
                        stages = { geo, c, store, frameBus, boardBus -> OpenCvStages({ it }, {}, geo, c, store, frameBus, boardBus, null) },
                        nowMs = { h.clock },
                        observerDispatcher = Dispatchers.Unconfined,
                        parallelCrops = true,
                    ),
                    h.settings,
                    h.publisher,
                    h.bus,
                    StageTimings(logLine = {}),
                    h.scope,
                    { attached() },
                )
            stack.coordinator.applyCalibration(GEOMETRY, QUAD, "desktop", DELIVERED)
            val cuts = countingCuts { play(h) { stack.coordinator.onFrame(it, DELIVERED) } }
            val run =
                Run(
                    decisions.map { it.substringBefore('@') },
                    decisions.toList(),
                    stack.observations,
                    stack.observer.counters,
                    cuts,
                )
            stack.close()
            run
        }

    private fun multi(arms: Int): Pair<List<Run>, Long> =
        Harness().use { h ->
            val extras =
                requireNotNull(
                    ExtraEngines.open(
                        List(arms) { "k${it + 1}" to CONFIG },
                        GEOMETRY,
                        null,
                        h.bus,
                        h.publisher,
                        { attached() },
                        h.scope,
                        h.settings,
                        { h.clock },
                        { h.clock },
                        START,
                        null,
                    ),
                )
            extras.calibrate(GEOMETRY, QUAD, DELIVERED)
            val cuts = countingCuts { play(h) { extras.onFrame(it, DELIVERED) } }
            val runs =
                extras.stacks.mapIndexed { i, stack ->
                    Run(
                        extras.plies[i].map { it.san },
                        extras.plies[i].map { "${it.san}@${it.frame}/${it.decider}" },
                        stack.observations,
                        stack.observer.counters,
                    )
                }
            extras.close()
            runs to cuts
        }

    /** `CROP_FRAME_COPY` laeuft genau einmal je Warp in `OpenCvStages.updateCropFrame`. */
    private fun countingCuts(body: () -> Unit): Long {
        val cuts = AtomicLong()
        val probe =
            object : WorkProbe {
                override fun enter(
                    operation: WorkOperation,
                    input: Long,
                ): Long {
                    if (operation == WorkOperation.CROP_FRAME_COPY) cuts.incrementAndGet()
                    return 0L
                }

                override fun exit(token: Long) = Unit

                override fun bytes(
                    operation: WorkOperation,
                    count: Long,
                    input: Long,
                ) = Unit

                override fun cache(
                    operation: WorkOperation,
                    hit: Boolean,
                    input: Long,
                ) = Unit
            }
        WorkProfiler.install(probe).use { body() }
        return cuts.get()
    }

    /** Grundstellung, dann e2-e4 und e7-e5, jeweils mit einer Hand, die kommt und geht. */
    private fun play(
        h: Harness,
        onFrame: (Mat) -> Unit,
    ) {
        var fen = START_PLACEMENT
        val frame = Mat()

        fun show(hand: Point?) {
            render(fen, hand, frame)
            onFrame(frame)
            h.clock += FRAME_MS
        }
        repeat(QUIET_FRAMES) { show(null) }
        for ((from, to) in listOf("e2" to "e4", "e7" to "e5")) {
            val over = center(to)
            for (k in 0 until HAND_FRAMES) show(Point(IMAGE - (IMAGE - over.x) * k / HAND_FRAMES, over.y))
            fen = move(fen, from, to)
            for (k in HAND_FRAMES downTo 0) show(Point(IMAGE - (IMAGE - over.x) * k / HAND_FRAMES, over.y))
            repeat(QUIET_FRAMES) { show(null) }
        }
        frame.release()
    }

    private fun attached() = Attached(ColourClassifier, "CPU", "farben")

    /** Jede Klasse hat ihre Farbe; die Mitte des Crops entscheidet. Kein Modell, aber ein echter Weg. */
    private object ColourClassifier : SquareClassifier {
        override val classes: List<String> = PIECES13_CLASSES

        override fun classify(crops: List<BgrImage>): Array<FloatArray> =
            Array(crops.size) { i ->
                val crop = crops[i]
                val at = ((crop.height / 2) * crop.width + crop.width / 2) * 3
                val bgr = DoubleArray(3) { c -> (crop.data[at + c].toInt() and 0xFF).toDouble() }
                val best =
                    PIECES13_CLASSES.indices.minBy { c ->
                        val p = colourOf(PIECES13_CLASSES[c], bgr)
                        (0..2).sumOf { (p[it] - bgr[it]) * (p[it] - bgr[it]) }
                    }
                FloatArray(classes.size) { c -> if (c == best) SURE else (1f - SURE) / (classes.size - 1) }
            }
    }

    private object NoStore : ConfigStore {
        override suspend fun read(slot: String): String? = null

        override suspend fun write(
            slot: String,
            text: String,
        ) = Unit
    }

    companion object {
        private const val IMAGE = 720.0
        private const val OFFSET = 80.0
        private const val SIDE = 560.0
        private const val FRAME_MS = 33L
        private const val QUIET_FRAMES = 45
        private const val HAND_FRAMES = 15
        private const val SURE = 0.97f
        private const val START_PLACEMENT = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"
        private const val START = "$START_PLACEMENT w KQkq - 0 1"
        private val LIGHT = doubleArrayOf(170.0, 170.0, 170.0)
        private val DARK = doubleArrayOf(90.0, 90.0, 90.0)
        private val HAND = Scalar(90.0, 140.0, 210.0)
        private val PIECE_COLOURS =
            mapOf(
                "wP" to doubleArrayOf(0.0, 0.0, 255.0),
                "wN" to doubleArrayOf(0.0, 255.0, 0.0),
                "wB" to doubleArrayOf(255.0, 0.0, 0.0),
                "wR" to doubleArrayOf(0.0, 255.0, 255.0),
                "wQ" to doubleArrayOf(255.0, 0.0, 255.0),
                "wK" to doubleArrayOf(255.0, 255.0, 0.0),
                "bP" to doubleArrayOf(0.0, 0.0, 110.0),
                "bN" to doubleArrayOf(0.0, 110.0, 0.0),
                "bB" to doubleArrayOf(110.0, 0.0, 0.0),
                "bR" to doubleArrayOf(0.0, 110.0, 110.0),
                "bQ" to doubleArrayOf(110.0, 0.0, 110.0),
                "bK" to doubleArrayOf(110.0, 110.0, 0.0),
            )
        private val GEOMETRY = BoardGeometry(boardSize = 400)
        private val CONFIG = TrackerConfig(boardSize = 400, liveAlign = false)
        private val DELIVERED = DeliveredSize(IMAGE.toInt(), IMAGE.toInt(), 0)
        private val QUAD =
            floatArrayOf(80f, 80f, 640f, 80f, 640f, 640f, 80f, 640f)

        @JvmStatic
        @BeforeAll
        fun natives() = NativeCv.require()

        /** Leere Felder: die naehere der beiden Feldfarben. */
        private fun colourOf(
            cls: String,
            seen: DoubleArray,
        ): DoubleArray = PIECE_COLOURS[cls] ?: listOf(LIGHT, DARK).minBy { p -> (0..2).sumOf { (p[it] - seen[it]) * (p[it] - seen[it]) } }

        private fun center(square: String): Point {
            val col = square[0] - 'a'
            val row = 8 - square[1].digitToInt()
            return Point(OFFSET + (col + 0.5) * SIDE / 8, OFFSET + (row + 0.5) * SIDE / 8)
        }

        private fun placement(fen: String): Map<String, Char> {
            val out = HashMap<String, Char>()
            fen.split('/').forEachIndexed { r, rank ->
                var col = 0
                for (c in rank) {
                    if (c.isDigit()) {
                        col += c.digitToInt()
                    } else {
                        out["${'a' + col}${8 - r}"] = c
                        col += 1
                    }
                }
            }
            return out
        }

        private fun move(
            fen: String,
            from: String,
            to: String,
        ): String {
            val board = placement(fen).toMutableMap()
            board[to] = requireNotNull(board.remove(from))
            return (8 downTo 1).joinToString("/") { rank ->
                val line = StringBuilder()
                var run = 0
                for (file in 'a'..'h') {
                    val p = board["$file$rank"]
                    if (p == null) {
                        run += 1
                    } else {
                        if (run > 0) line.append(run)
                        run = 0
                        line.append(p)
                    }
                }
                if (run > 0) line.append(run)
                line.toString()
            }
        }

        private fun render(
            fen: String,
            hand: Point?,
            into: Mat,
        ) {
            into.create(IMAGE.toInt(), IMAGE.toInt(), CvType.CV_8UC3)
            into.setTo(Scalar(40.0, 60.0, 50.0))
            val cell = SIDE / 8
            for (row in 0 until 8) {
                for (col in 0 until 8) {
                    val c = if ((row + col) % 2 == 0) LIGHT else DARK
                    Imgproc.rectangle(
                        into,
                        Point(OFFSET + col * cell, OFFSET + row * cell),
                        Point(OFFSET + (col + 1) * cell - 1, OFFSET + (row + 1) * cell - 1),
                        Scalar(c[0], c[1], c[2]),
                        -1,
                    )
                }
            }
            for ((square, p) in placement(fen)) {
                val cls = (if (p.isUpperCase()) "w" else "b") + p.uppercaseChar()
                val c = PIECE_COLOURS.getValue(cls)
                Imgproc.circle(into, center(square), (cell * 0.32).toInt(), Scalar(c[0], c[1], c[2]), -1)
            }
            if (hand != null) {
                Imgproc.rectangle(into, Point(hand.x - cell, hand.y - cell * 0.6), Point(IMAGE, hand.y + cell * 0.6), HAND, -1)
            }
        }
    }
}

package com.chesslab.desktop

import com.chesslab.cnn.ALL_SQUARES
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
import com.chesslab.tracker.log.NoTrackerLogs
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

/** Ab dem zweiten Zusatzarm bekam keine Engine einen Crop; bei sechs reichten die geteilten Graustufen-Ringe
 *  nicht mehr. Echter Weg ueber [ExtraEngines]. */
class MultiReplayArmsTest {
    @Test
    fun `sechs gleiche Zusatzarme sehen und entscheiden jeder wie der Einzellauf`() = armsMatchSingleRun(6)

    @Test
    fun `ein Knopf der geteilten Bildkette bricht ab statt nur fuer den ersten Arm zu gelten`() {
        Harness().use { h ->
            val err =
                assertThrows(IllegalArgumentException::class.java) {
                    ExtraEngines.open(
                        listOf("a" to CONFIG, "b" to CONFIG.copy(diffClaheClip = CONFIG.diffClaheClip + 1.0)),
                        h.rig(),
                    )
                }
            assertTrue("diffClaheClip" in err.message.orEmpty())
        }
    }

    @Test
    fun `configs= lehnt einen Live-Lauf ab, weil die Arme dort nicht inline beobachten`() {
        Harness().use { h ->
            assertThrows(IllegalArgumentException::class.java) { ExtraEngines.open(listOf("k" to CONFIG), h.rig(live = true)) }
        }
    }

    @Test
    fun `ein Zusatzarm mit der Konfig des Hauptlaufs entscheidet wie er, auch mit prior= und prior-mode=old`() {
        val runs = listOf(0.0, PRIOR).associateWith { mainBesideArm(it, CONFIG) }
        runs.forEach { (prior, pair) -> assertEquals(pair.first, pair.second, "prior=$prior: Hauptlauf gegen Zusatzarm") }
        assertTrue(runs.getValue(0.0).first != runs.getValue(PRIOR).first, "der Prior muss hier etwas entscheiden")
    }

    /** Hauptlauf und ein Arm aus DEMSELBEN [ReplayRig], im selben Durchgang wie `drive`. */
    private fun mainBesideArm(
        prior: Double,
        arm: TrackerConfig,
    ): Pair<List<String>, List<String>> =
        Harness().use { h ->
            val rig = h.rig(prior, priorSafety = false, classifier = Zweifler)
            val extras = requireNotNull(ExtraEngines.open(listOf("k" to arm), rig))
            val collector = DecisionCollector(1000.0 / FRAME_MS, { null }, indexNow = { h.clock.toInt() })
            val main = rig.mainStack(CONFIG, collector)
            extras.calibrate(GEOMETRY, QUAD, DELIVERED)
            main.coordinator.applyCalibration(GEOMETRY, QUAD, "desktop", DELIVERED)
            play(h) {
                extras.onFrame(it, DELIVERED)
                main.coordinator.onFrame(it, DELIVERED)
            }
            val out =
                collector.plies.map { "${it.san}@${it.frame}/${it.decider}" } to
                    extras.plies[0].map { "${it.san}@${it.frame}/${it.decider}" }
            main.close()
            extras.close()
            out
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

        fun rig(
            prior: Double = 0.0,
            priorSafety: Boolean = true,
            classifier: SquareClassifier = ColourClassifier,
            live: Boolean = false,
        ) = ReplayRig(
            GEOMETRY,
            { clock },
            null,
            bus,
            publisher,
            { Attached(classifier, "CPU", "farben") },
            NoTrackerLogs,
            scope,
            settings,
            indexNow = { clock },
            live = live,
            priorLambda = prior,
            priorSafety = priorSafety,
            startFen = START,
        )

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
            val extras = requireNotNull(ExtraEngines.open(List(arms) { "k${it + 1}" to CONFIG }, h.rig(TRACKER_SEED_PRIOR)))
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

    /** Je Feld zu 90 % ein Koenig, der dort nicht stehen kann: den Zweifel loest nur der Legalitaets-Prior. */
    private object Zweifler : SquareClassifier {
        override val classes: List<String> = PIECES13_CLASSES

        override fun classify(crops: List<BgrImage>): Array<FloatArray> =
            ColourClassifier.classify(crops).also { rows ->
                rows.forEachIndexed { i, row ->
                    val decoy = PIECES13_CLASSES.indexOf(if (ALL_SQUARES[i][1] <= '4') "bK" else "wK")
                    val best = row.indices.maxBy { row[it] }
                    row[decoy] = row[best] * DOUBT
                    row[best] -= row[decoy]
                }
            }
    }

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
        private const val PRIOR = 8.0
        private const val DOUBT = 0.9f

        /** `TrackerSeed.priorLambda`, mit dem [single] baut. */
        private const val TRACKER_SEED_PRIOR = 4.0
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

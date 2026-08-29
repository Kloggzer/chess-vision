package com.chesslab.tracker.pipeline

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.perf.RecordingWorkProbe
import org.bytedeco.javacpp.Loader
import org.bytedeco.opencv.opencv_java
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Scalar
import org.opencv.imgproc.Imgproc
import kotlin.random.Random

/**
 * Was die Knotenschicht wirklich kostet, unter zufaellig wechselndem Bedarf.
 *
 * Fuzz statt fester Reihenfolge, weil genau das der Punkt der Umstellung ist: wer nichts
 * zieht, bezahlt nichts. Der Bericht zaehlt Aufrufe, Treffer und Fehlschlaege je Operation.
 */
class StageFuzzProfileTest {
    private val geom = BoardGeometry(boardSize = BOARD_SIZE)
    private val config = TrackerConfig(boardSize = BOARD_SIZE)

    private fun frame(): Mat {
        val m = Mat(FRAME_H, FRAME_W, CvType.CV_8UC3, Scalar(24.0, 24.0, 24.0))
        for (r in 0 until 8) {
            for (c in 0 until 8) {
                val light = (r + c) % 2 == 0
                val x = QUAD_X + c * (QUAD_SIDE / 8)
                val y = QUAD_Y + r * (QUAD_SIDE / 8)
                Imgproc.rectangle(
                    m,
                    org.opencv.core.Point(x.toDouble(), y.toDouble()),
                    org.opencv.core.Point((x + QUAD_SIDE / 8).toDouble(), (y + QUAD_SIDE / 8).toDouble()),
                    if (light) Scalar(190.0, 185.0, 180.0) else Scalar(38.0, 34.0, 30.0),
                    -1,
                )
            }
        }
        return m
    }

    /** `[a8, h8, h1, a1]`, flach — die Ecken-Reihenfolge des Projekts. */
    private val corners =
        floatArrayOf(
            QUAD_X.toFloat(),
            QUAD_Y.toFloat(),
            (QUAD_X + QUAD_SIDE).toFloat(),
            QUAD_Y.toFloat(),
            (QUAD_X + QUAD_SIDE).toFloat(),
            (QUAD_Y + QUAD_SIDE).toFloat(),
            QUAD_X.toFloat(),
            (QUAD_Y + QUAD_SIDE).toFloat(),
        )

    private fun stages() =
        OpenCvStages<Mat>(
            toBgr = { it },
            geometry = geom,
            config = config,
            cropStore = CropFrameStore(),
        )

    @Test
    fun `fuzzed demand shows the call counts and the cache hit rate`() {
        val probe = RecordingWorkProbe()
        val rng = Random(seed = 4711)
        val src = frame()
        var lumaAndGray = 0
        var boardPulls = 0
        WorkProfiler.install(probe).use {
            val s = stages()
            try {
                repeat(FRAMES) {
                    s.convert(src)
                    if (!s.warpDetection(corners)) return@repeat
                    s.lumaPreClahe()
                    // Die zwei Engines schliessen einander aus: die Diff-Engine liest grayDet,
                    // Stillness/Changeset stattdessen board(160).
                    if (rng.nextBoolean()) {
                        s.grayDet()
                        s.bgrDet()
                        lumaAndGray++
                    } else {
                        val pulls = 1 + rng.nextInt(3)
                        repeat(pulls) { s.boardAt(BOARD_AT_PX) }
                        boardPulls += pulls
                    }
                }
            } finally {
                s.close()
            }
        }

        val snap = probe.snapshot()
        println("\n=== Fuzz ueber $FRAMES Frames, boardSize $BOARD_SIZE ===")
        println("grayDet-Frames $lumaAndGray, boardAt-Aufrufe $boardPulls")
        println(snap.report())

        val gray = requireNotNull(snap.operation(WorkOperation.LUMA_GRAY)) { "kein LUMA_GRAY" }
        val board = requireNotNull(snap.operation(WorkOperation.BOARD_WARP)) { "kein BOARD_WARP" }
        // Genau der Doppelgaenger, den der Ist-Zustand hatte: `lumaPreClahe` und `grayDet` zogen
        // dieselbe Graustufe. Jeder solche Frame ist jetzt ein Treffer.
        assertEquals(lumaAndGray.toLong(), gray.cacheHits, "ein Treffer je Frame mit beiden Lesern")
        assertEquals(FRAMES.toLong(), gray.cacheMisses, "und genau eine Rechnung je Frame")
        // `boardAt` rechnete frueher je Aufruf neu; ab dem zweiten Zug im selben Frame ist es frei.
        assertEquals((boardPulls - board.cacheMisses).toLong(), board.cacheHits)
        assertTrue(board.cacheHits > 0, "der Fuzz muss Mehrfachzuege erzeugt haben")
    }

    /**
     * Was Stillness/Changeset heute fuer nichts bezahlen.
     *
     * `FramePipeline.emit` ruft `grayDet()` und `bgrDet()` UNBEDINGT, obwohl diese Engines nur
     * `board(160)` lesen und `FrameReads(gridCoverage = false, roiMotion = false)` erklaeren.
     * Der Test misst den Posten, statt ihn zu schaetzen.
     */
    @Test
    fun `what stillness pays for nothing`() {
        fun run(emitLikeToday: Boolean): Long {
            val probe = RecordingWorkProbe()
            WorkProfiler.install(probe).use {
                val s = stages()
                try {
                    val src = frame()
                    repeat(FRAMES) {
                        s.convert(src)
                        s.warpDetection(corners)
                        s.lumaPreClahe()
                        if (emitLikeToday) {
                            s.grayDet()
                            s.bgrDet()
                        }
                        s.boardAt(BOARD_AT_PX)
                    }
                } finally {
                    s.close()
                }
            }
            val snap = probe.snapshot()
            return listOf(WorkOperation.DETECTION_GRAY, WorkOperation.DETECTION_BLUR)
                .sumOf { snap.operation(it)?.selfNanos ?: 0L }
        }

        val today = run(emitLikeToday = true)
        val pulled = run(emitLikeToday = false)
        println("=== Stillness ueber $FRAMES Frames ===")
        println("heute (emit ruft immer): " + today / 1_000_000.0 + " ms fuer CLAHE+Blur")
        println("wenn nur gezogen wird:   " + pulled / 1_000_000.0 + " ms")
        println("je Frame verschwendet:   " + today / 1_000_000.0 / FRAMES + " ms")
        assertEquals(0L, pulled, "ohne Zug darf die Kette gar nicht laufen")
        assertTrue(today > 0L, "der heutige Pfad muss sie bezahlen")
    }

    @Test
    fun `pulling nothing costs nothing`() {
        val probe = RecordingWorkProbe()
        WorkProfiler.install(probe).use {
            val s = stages()
            try {
                val src = frame()
                repeat(FRAMES) {
                    s.convert(src)
                    s.warpDetection(corners)
                    s.lumaPreClahe()
                }
            } finally {
                s.close()
            }
        }
        val snap = probe.snapshot()
        // Der Dunkelframe-Gate-Pfad zieht nur die Graustufe — CLAHE und Blur laufen NICHT.
        assertEquals(null, snap.operation(WorkOperation.DETECTION_GRAY))
        assertEquals(null, snap.operation(WorkOperation.BOARD_WARP))
    }

    companion object {
        @JvmStatic
        @BeforeAll
        fun loadOpenCv() {
            Loader.load(opencv_java::class.java)
        }

        const val FRAMES = 120
        const val FRAME_W = 1280
        const val FRAME_H = 960
        const val QUAD_X = 200
        const val QUAD_Y = 120
        const val QUAD_SIDE = 720
        const val BOARD_SIZE = 1008
        const val BOARD_AT_PX = 160
    }
}

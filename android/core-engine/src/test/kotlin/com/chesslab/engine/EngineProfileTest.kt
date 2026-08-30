package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.board.BOARD_PX
import com.chesslab.engine.board.cellDeltas
import com.chesslab.engine.board.grayBoard
import com.chesslab.engine.board.peak
import com.chesslab.engine.parity.ParityFixtures
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIfSystemProperty

/**
 * Hot-path profiler for the scalar pixel stages. **Asserts nothing** — it prints a per-stage
 * breakdown so an optimisation is aimed at the stage that actually costs, not the one that looks
 * expensive. Off by default; run with `-Pchesslab.profile=true`.
 *
 * The wall-clock ban is a *production* rule (replay determinism); a benchmark harness may time
 * whatever it likes.
 *
 * The committed clips are 320x320 (`meta.detSize`), the phone runs at 800x800
 * (`boardSize 1600 * detectScale 0.5`), and every stage here is O(pixels) — so the planes are
 * nearest-upscaled to 800 before timing. Absolute numbers are desktop-JVM numbers; what transfers
 * to the phone is the RATIO between stages.
 */
@EnabledIfSystemProperty(named = "chesslab.profile", matches = "true")
class EngineProfileTest {
    @Test
    fun profileHotPath() {
        val bench = ProfileBench(DET_SIZE)
        println("\n=== :core-engine hot path, ${DET_SIZE}x$DET_SIZE, ${bench.candidates.countOneBits()} candidate squares ===")
        bench.run()
    }

    private companion object {
        /** `boardSize 1600 * detectScale 0.5` — the phone's real detection plane. */
        const val DET_SIZE = 800
    }
}

/** One clip's planes upscaled to [size], plus every buffer the stages need. */
private class ProfileBench(
    private val size: Int,
) {
    private val clip = ParityFixtures.load(ParityFixtures.clips().first())
    private val src = clip.meta.detSize
    private val frames = clip.meta.framesWithBgr

    private val refGray = GrayImage(size, size, upGray(clip.gray(frames[0]).data))
    private val curGray = GrayImage(size, size, upGray(clip.gray(frames[MOVED_FRAME]).data))
    private val refBgr = BgrImage(size, size, upBgr(clip.bgr(frames[0])!!.data))
    private val curBgr = BgrImage(size, size, upBgr(clip.bgr(frames[MOVED_FRAME])!!.data))

    private val detBoxes = squareBoxes(size, whitePov = true)
    private val evidenceBoxes = squareBoxes(size, whitePov = true, extendUp = OVERHANG)
    private val out = DoubleArray(Squares.COUNT)
    private val censusCodes = ByteArray(size * size)
    private val hsvBuf = ByteArray(size * size * 3)
    private val labBuf = ByteArray(size * size * 3)
    private val refHsv = ByteArray(size * size * 3)
    private val geom = PlaneGeometry(size, size, size, whitePov = true, extendUp = OVERHANG)
    private val baseGeom = PlaneGeometry(size, size, size, whitePov = true)

    /** A realistic hot set: the six squares a move plus its dilation typically raises. */
    val candidates: Long = (0 until Squares.COUNT).fold(0L) { acc, i -> if (i % 11 == 3) acc.with(i) else acc }

    private val gamut =
        boardColorGamut(
            ColorPlanes(bgrToLab(refBgr.data, size, size, labBuf.copyOf()), bgrToHsv(refBgr.data, size, size, refHsv.copyOf())),
            baseGeom,
        )

    fun run() {
        censusTransform(refGray, out = censusCodes)
        val results = LinkedHashMap<String, Double>()

        results["motionScore (full plane)"] = time { motionScore(refGray.data, curGray.data, MOTION_PX_THR_DEFAULT) }
        results["perSquareDiff (boxes)"] = time { perSquareDiff(refGray, curGray, evidenceBoxes, out) }
        results["censusTransform (full plane)"] = time { censusTransform(curGray, out = ByteArray(size * size)) }
        results["censusCodesInBoxes"] = time { censusCodesInBoxes(curGray, evidenceBoxes, censusCodes) }
        results["perSquareCensusChange"] = time { perSquareCensusChange(censusCodes, curGray, evidenceBoxes, out) }
        results["perSquareCensusChange (+codes)"] =
            time { perSquareCensusChange(censusCodes, curGray, evidenceBoxes, out, codesOut = ByteArray(size * size)) }
        results["normalizeDiffs"] = time { normalizeDiffs(out, DoubleArray(Squares.COUNT)) }
        results["bgrToHsv (full plane)"] = time { bgrToHsv(curBgr.data, size, size, hsvBuf) }
        results["bgrToLab (full plane)"] = time { bgrToLab(curBgr.data, size, size, labBuf) }
        results["bgrToHsv x2 (candidate boxes)"] = time { convertCandidateBoxes() }
        bgrToHsv(refBgr.data, size, size, refHsv)
        results["hsvShadowSquares"] = time { hsvShadowSquares(refHsv, hsvBuf, geom, candidates) }
        results["occlusionColorSquares"] =
            time { occlusionColorSquares(ColorPlanes(labBuf, hsvBuf), baseGeom, gamut, candidates, OCCL_THR) }
        results["boardColorGamut"] = time { boardColorGamut(ColorPlanes(labBuf, hsvBuf), baseGeom) }
        val baseline = BaselineScratch()
        results["baselineOcclusionAndShadow"] =
            time {
                baseline.baselineOcclusionAndShadow(
                    curGray,
                    refGray,
                    detBoxes,
                    size,
                    ABS_THR,
                    true,
                    BaselineEvidence(censusCodes, OCCL_CENSUS_THR, curBgr, gamut, OCCL_THR),
                )
            }
        val gray = RunningMeanGray(AVG_FRAMES).also { it.append(refGray) }
        val bgr = RunningMeanBgr(AVG_FRAMES).also { it.append(refBgr) }
        results["RunningMeanGray append"] = time { gray.append(curGray) }
        results["RunningMeanGray mean"] = time { gray.meanUint8() }
        results["RunningMeanBgr append"] = time { bgr.append(curBgr) }
        results["RunningMeanBgr mean"] = time { bgr.meanUint8() }

        // What the stillness and changeset engines do EVERY frame, and it is all they do per
        // frame: box-average the raw board warp to 160 and compare it per cell. Their own
        // decision work runs on a reading, which arrives once per ply.
        val refWarp = boardWarp(refBgr)
        val curWarp = boardWarp(curBgr)
        val refBoard = requireNotNull(grayBoard(refWarp))
        val curBoard = requireNotNull(grayBoard(curWarp))
        results["grayBoard (from ${BOARD_PX}px warp)"] = time { grayBoard(curWarp) }
        results["grayBoard (from $size fallback)"] = time { grayBoard(curBgr) }
        results["cellDeltas + peak (160)"] = time { peak(cellDeltas(refBoard, curBoard)) }

        val width = results.keys.maxOf { it.length }
        for ((name, ms) in results) println("  ${name.padEnd(width)}  ${"%8.3f".format(ms)} ms")
        println(
            "\n  MOTION branch = motionScore + baselineOcclusionAndShadow\n" +
                "  DETECT branch = motionScore + 2x RunningMean + perSquareDiff +\n" +
                "                  perSquareCensusChange(+codes) + candidate-box HSV + hsvShadowSquares\n" +
                "  STILL branch  = grayBoard(160 warp) + cellDeltas + peak  (engines 2 and 3)\n",
        )
    }

    /** What `FrameInput.board(BOARD_PX)` hands those two: the board warped straight to 160. */
    private fun boardWarp(source: BgrImage): BgrImage {
        val out = ByteArray(BOARD_PX * BOARD_PX * 3)
        for (y in 0 until BOARD_PX) {
            val sy = y * source.height / BOARD_PX
            for (x in 0 until BOARD_PX) {
                val d = (y * BOARD_PX + x) * 3
                val s = (sy * source.width + x * source.width / BOARD_PX) * 3
                out[d] = source.data[s]
                out[d + 1] = source.data[s + 1]
                out[d + 2] = source.data[s + 2]
            }
        }
        return BgrImage(BOARD_PX, BOARD_PX, out)
    }

    /** What the shadow veto now converts: the candidates' boxes of both planes, nothing else. */
    private fun convertCandidateBoxes() {
        candidates.forEachSquare { i ->
            geom.region(i, geom.extendUp)?.let { box ->
                bgrToHsvBox(refBgr.data, size, box, refHsv)
                bgrToHsvBox(curBgr.data, size, box, hsvBuf)
            }
        }
    }

    private fun upGray(plane: ByteArray): ByteArray {
        val out = ByteArray(size * size)
        for (y in 0 until size) {
            val sy = y * src / size
            for (x in 0 until size) out[y * size + x] = plane[sy * src + x * src / size]
        }
        return out
    }

    private fun upBgr(plane: ByteArray): ByteArray {
        val out = ByteArray(size * size * 3)
        for (y in 0 until size) {
            val sy = y * src / size
            for (x in 0 until size) {
                val d = (y * size + x) * 3
                val s = (sy * src + x * src / size) * 3
                out[d] = plane[s]
                out[d + 1] = plane[s + 1]
                out[d + 2] = plane[s + 2]
            }
        }
        return out
    }

    /** Median of [REPS] timed runs after [WARMUP] warmup runs — the JIT needs both. */
    private fun time(body: () -> Unit): Double {
        repeat(WARMUP) { body() }
        val samples = DoubleArray(REPS)
        for (i in 0 until REPS) {
            val t0 = System.nanoTime()
            body()
            samples[i] = (System.nanoTime() - t0) / 1e6
        }
        samples.sort()
        return samples[REPS / 2]
    }

    private companion object {
        const val MOVED_FRAME = 20
        const val OVERHANG = 0.25
        const val ABS_THR = 80.0
        const val OCCL_CENSUS_THR = 24.0
        const val OCCL_THR = 1.5
        const val AVG_FRAMES = 3
        const val WARMUP = 30
        const val REPS = 41
    }
}

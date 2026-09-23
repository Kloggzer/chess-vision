package com.chesslab.tracker.geometry

import com.chesslab.geometry.alignmentOf
import com.chesslab.geometry.computeHomography
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.detectBoardMarkers
import com.chesslab.geometry.margins4
import org.opencv.core.Core
import org.opencv.core.Mat
import org.opencv.core.MatOfPoint2f
import org.opencv.core.Point
import kotlin.math.abs
import kotlin.math.hypot
import kotlin.math.max

// The footage's geometry, measured by the code that ships. **Two questions, never conflated**: `alignmentOf`
// is ABSOLUTE (squares against the grooves), quad spread RELATIVE (was the board nudged). A consistently wrong
// quad has a beautiful spread; the refusal gates key on the absolute verdict.

/** Nulls when nothing was measurable. */
class Distribution(
    val median: Double?,
    val p90: Double?,
    val max: Double?,
)

fun distributionOf(values: List<Double>): Distribution {
    if (values.isEmpty()) return Distribution(null, null, null)
    val sorted = values.sorted()
    return Distribution(
        median = sorted[sorted.size / 2],
        p90 = sorted[(sorted.size * P90_NUMERATOR) / P90_DENOMINATOR],
        max = sorted.last(),
    )
}

data class ScannedGeometry(
    /** The per-corner MEDIAN over every sample that passed the alignment gate. */
    val corners: List<DoubleArray>,
    val boardSize: Int,
    val margin: Double,
    val frameWidth: Int,
    val frameHeight: Int,
    val fps: Double,
    val alignPassRate: Double,
    val aligned: Int,
    val sampled: Int,
    val frames: Int,
    val sampleEvery: Int,
    /** A histogram, not a mean. */
    val markersSeen: Map<Int, Int>,
    val worstOffsetPx: Distribution,
    val quadSpreadPx: Distribution,
    val clockErrorMs: Distribution,
)

/** Timestamps are read for ALL frames, geometry every [sampleEvery]-th. No [com.chesslab.geometry.MarkerTracker]
 *  smoothing: over a nudged board it lags differently per marker and shears the quad. */
class GeometryScan(
    private val fps: Double,
    private val sampleEvery: Int = SAMPLE_EVERY,
    private val onProgress: (String) -> Unit = {},
) {
    private val quads = mutableListOf<FloatArray?>()
    private val worst = mutableListOf<Double>()
    private val markersSeen = sortedMapOf<Int, Int>()
    private val stampsMs = mutableListOf<Double>()
    private var frames = 0
    private var width = 0
    private var height = 0

    fun offer(
        frame: Mat,
        timestampMs: Double,
    ) {
        stampsMs += timestampMs
        if (frames % sampleEvery == 0) sample(frame)
        frames += 1
    }

    /** A board moved AFTER a candidate's last ply must not pull it. */
    fun result(upToFrame: Int = Int.MAX_VALUE): ScannedGeometry? {
        val window = windowOf(quads, sampleEvery, upToFrame)
        val passing = window.filterNotNull()
        if (passing.isEmpty()) return null
        val median = medianQuadOf(passing)
        val geometry = boardGeometryFor(median)
        return ScannedGeometry(
            corners = cornersFromFlat(median),
            boardSize = geometry.boardSize,
            margin = DEFAULT_MARKER_MARGIN,
            frameWidth = width,
            frameHeight = height,
            fps = fps,
            alignPassRate = passing.size.toDouble() / window.size,
            aligned = passing.size,
            sampled = window.size,
            frames = frames,
            sampleEvery = sampleEvery,
            markersSeen = markersSeen.toMap(),
            worstOffsetPx = distributionOf(worst),
            quadSpreadPx = distributionOf(quadSpreadRectified(passing, median, geometry.boardSize)),
            clockErrorMs = distributionOf(clockError()),
        )
    }

    private fun sample(frame: Mat) {
        width = frame.cols()
        height = frame.rows()
        val found = detectBoardMarkers(frame)
        markersSeen.merge(found.size, 1, Int::plus)
        val raw = if (found.size >= MIN_MARKERS) rawQuadOf(frame) else null
        if (raw == null) {
            quads += null
            return
        }
        val refined = refinedQuad(frame, raw)
        val verdict = alignmentOf(frame, cornersFromFlat(refined), boardGeometryFor(refined))
        if (verdict.worst.isFinite()) worst += verdict.worst
        // Passing frames only: 18 of 19 rejected samples were a HAND over the board.
        quads += if (verdict.ok) refined else null
        if (quads.size % PROGRESS_EVERY == 0) {
            onProgress("...${frames + 1} frames, ${quads.count { it != null }} of ${quads.size} sampled passed the alignment gate")
        }
    }

    /** |realised − nominal| inter-frame interval in ms: fps is NOMINAL, this says how nominal. */
    private fun clockError(): List<Double> {
        if (stampsMs.size < 2 || fps <= 0) return emptyList()
        val nominal = MS_PER_SECOND / fps
        return stampsMs.zipWithNext { a, b -> abs((b - a) - nominal) }
    }
}

/** One mis-resolved marker must not move the answer at all. */
internal fun medianQuadOf(passing: List<FloatArray>): FloatArray {
    val out = FloatArray(CORNER_FLOATS)
    for (i in 0 until CORNER_FLOATS) {
        val axis = passing.map { it[i] }.sorted()
        out[i] = axis[axis.size / 2]
    }
    return out
}

internal fun windowOf(
    quads: List<FloatArray?>,
    sampleEvery: Int,
    upToFrame: Int,
): List<FloatArray?> = if (upToFrame == Int.MAX_VALUE) quads else quads.take(upToFrame / sampleEvery + 1)

/** Exact, no pixels consulted. A BOARD-MOVEMENT check, never a correctness gate: the 2026-08-02 game read p90 0.93
 *  while every quad was 27-33 px out. Correctness is [com.chesslab.geometry.alignmentOf]. */
internal fun quadSpreadRectified(
    passing: List<FloatArray>,
    median: FloatArray,
    boardSize: Int,
): List<Double> {
    val margin = margins4(DEFAULT_MARKER_MARGIN)
    val h = computeHomography(cornersFromFlat(median), boardSize, margin)
    val bs = boardSize.toDouble()
    val m = margin.map { it * bs }
    val dst =
        listOf(
            Point(-m[0], -m[0]),
            Point(bs + m[1], -m[1]),
            Point(bs + m[2], bs + m[2]),
            Point(-m[3], bs + m[3]),
        )
    val out =
        passing.map { quad ->
            val src = MatOfPoint2f()
            src.fromList(cornersFromFlat(quad).map { Point(it[0], it[1]) })
            val mapped = MatOfPoint2f()
            Core.perspectiveTransform(src, mapped, h)
            val points = mapped.toArray()
            src.release()
            mapped.release()
            points.withIndex().maxOf { (k, p) -> hypot(p.x - dst[k].x, p.y - dst[k].y) }
        }
    h.release()
    return out
}

/** Refuse rather than warn: the failure is silent downstream — crops straddle their grooves while every count
 *  looks healthy. */
fun geometryRefusals(g: ScannedGeometry): List<String> {
    val out = mutableListOf<String>()
    if (g.aligned == 0) {
        out += "no sampled frame's grid could be measured — is the board in shot?"
    } else if (g.aligned < MIN_ALIGNED_SAMPLES) {
        out += "only ${g.aligned} sampled frames align to the board's own grid " +
            "(need $MIN_ALIGNED_SAMPLES for a median quad to stand on). Is the board mostly out of " +
            "shot, or the footage very short?"
    }
    // The SPREAD measures MOVEMENT, not correctness: as a gate it refused a recording whose absolute gate passes
    // on 97.2 %. It means one stored quad will not do — a warning, not a refusal.

    // Variable frame rate is not here EITHER: the replay clock reads each frame's PTS, so VFR carries correct time.
    return out
}

/** A warning is not a smaller refusal: it names the next step. */
fun geometryWarnings(g: ScannedGeometry): List<String> {
    val out = mutableListOf<String>()
    val spreadP90 = g.quadSpreadPx.p90
    if (spreadP90 != null && spreadP90 > QUAD_SPREAD_P90_MAX) {
        out += "quad spread p90 ${"%.2f".format(spreadP90)} px > $QUAD_SPREAD_P90_MAX px: the board moves in this " +
            "footage, so the stored quad is a MEDIAN and does not stand for every frame. Re-fit per frame after " +
            "export: `chesslab session scan <sid>` then `autofix`."
    }
    val clockP90 = g.clockErrorMs.p90
    val clockLimit = CLOCK_P90_PERIOD_FRAC * MS_PER_SECOND / max(g.fps, 1.0)
    if (clockP90 != null && clockP90 > clockLimit) {
        out += "frame interval p90 off by ${"%.2f".format(clockP90)} ms from the nominal rate: variable-rate " +
            "footage. The replay runs on each frame's own timestamps, so timing stays true; fps is nominal."
    }
    return out
}

fun geometryReport(g: ScannedGeometry): String {
    val cell = g.boardSize / SQUARES_PER_SIDE
    return buildString {
        appendLine("geometry: ${g.frames} frames, sampled every ${g.sampleEvery} -> ${g.sampled}")
        appendLine("  markers decoded per sampled frame: ${g.markersSeen}")
        appendLine(
            "  worst square offset (rectified px, one square = ${"%.0f".format(cell)} px): ${g.worstOffsetPx.line()}",
        )
        appendLine(
            "  PASSED the absolute gate: ${g.aligned} of ${g.sampled} sampled (${"%.1f".format(HUNDRED * g.alignPassRate)} % — " +
                "the rate measures playing speed, not footage quality; the gate is >= $MIN_ALIGNED_SAMPLES aligned samples)",
        )
        appendLine("  quad spread about the median quad (BOARD-MOVEMENT check, not correctness): ${g.quadSpreadPx.line()}")
        append("  clock |realised - nominal| ms: ${g.clockErrorMs.line()}")
    }
}

private fun Distribution.line(): String =
    if (median == null) {
        "nothing measurable"
    } else {
        "median ${"%.3f".format(median)}  p90 ${"%.3f".format(p90)}  max ${"%.3f".format(max)}"
    }

/** Measurements behind each threshold: specs/40, specs/52. */
const val QUAD_SPREAD_P90_MAX = 4.0

/** Absolute EVIDENCE, not a pass RATE: `ALIGN_PASS_MIN = 0.85` measured playing speed (a fast game read 82.5 % with
 *  flawless geometry — the failures were hands). 100 aligned samples is ~33 s, far above where the median settles. */
const val MIN_ALIGNED_SAMPLES = 100
const val CLOCK_P90_PERIOD_FRAC = 0.10

private const val SAMPLE_EVERY = 10
private const val MIN_MARKERS = 3
private const val PROGRESS_EVERY = 100
private const val CORNER_FLOATS = 8
private const val P90_NUMERATOR = 9
private const val P90_DENOMINATOR = 10
private const val MS_PER_SECOND = 1000.0
private const val HUNDRED = 100.0
private const val SQUARES_PER_SIDE = 8.0

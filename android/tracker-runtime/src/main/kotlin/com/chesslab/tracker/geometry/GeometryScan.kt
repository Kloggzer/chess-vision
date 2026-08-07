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

// The footage's geometry, measured by the code that ships — the Kotlin port of the Python
// labeler's `scan_geometry`/`median_quad`/`quad_spread`/`clock_error`/`refuse_reasons`
// (`scripts/label_real_game.py`, alive at tag `python-tracker-final`). Host-agnostic on purpose:
// the desktop's label verb and the `:app` test harness both feed it frames and neither owns it.
//
// **Two different questions, never conflated** (it cost the Python pack its first day):
// `alignmentOf` is ABSOLUTE — how far each square sits from the board's own grooves. Quad spread
// is RELATIVE — do the frames agree with each other, i.e. was the board nudged. A consistently
// wrong quad has a beautiful spread; the refusal gates key on the absolute verdict.

/** median / p90 / max, or nulls when nothing was measurable (the Python `_dist` contract). */
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

/** What one scan of a video says: the quad that stands for it, and the evidence that it can. */
data class ScannedGeometry(
    /** The per-corner MEDIAN over every sampled frame that passed the alignment gate. */
    val corners: List<DoubleArray>,
    val boardSize: Int,
    /** The stored marker-outset constant the quad is interpreted through. */
    val margin: Double,
    val frameWidth: Int,
    val frameHeight: Int,
    val fps: Double,
    val alignPassRate: Double,
    val aligned: Int,
    val sampled: Int,
    val frames: Int,
    val sampleEvery: Int,
    /** Markers DECODED per sampled frame — a histogram, not a mean (specs/41's missing number). */
    val markersSeen: Map<Int, Int>,
    val worstOffsetPx: Distribution,
    val quadSpreadPx: Distribution,
    val clockErrorMs: Distribution,
)

/**
 * Feed every decoded frame; geometry is sampled every [sampleEvery]-th, timestamps are read for
 * ALL of them — the clock check is about the frames that exist, not the ones measured.
 *
 * No [com.chesslab.geometry.MarkerTracker] smoothing across samples: its dead zone and EMA assume
 * a static board, and a game filmed over minutes is one where the board gets nudged — the tracker
 * then lags by a different amount per marker and shears the quad ([rawQuadOf] builds a fresh one
 * per call for the same reason).
 */
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

    fun result(): ScannedGeometry? {
        val passing = quads.filterNotNull()
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
            alignPassRate = passing.size.toDouble() / quads.size,
            aligned = passing.size,
            sampled = quads.size,
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
        // Below three markers `rawQuadOf` cannot resolve a quad; skip its second detection.
        val raw = if (found.size >= MIN_MARKERS) rawQuadOf(frame) else null
        if (raw == null) {
            quads += null
            return
        }
        val refined = refinedQuad(frame, raw)
        val verdict = alignmentOf(frame, cornersFromFlat(refined), boardGeometryFor(refined))
        if (verdict.worst.isFinite()) worst += verdict.worst
        // Passing frames only feed the median: on the 2026-08-02 game 18 of 19 rejected sampled
        // frames were a HAND over the board — they say nothing about where the board is.
        quads += if (verdict.ok) refined else null
        if (quads.size % PROGRESS_EVERY == 0) {
            onProgress("...${frames + 1} frames, ${quads.count { it != null }} of ${quads.size} sampled passed the alignment gate")
        }
    }

    /** |realised − nominal| inter-frame interval in ms. fps is the replay's CLOCK, not metadata. */
    private fun clockError(): List<Double> {
        if (stampsMs.size < 2 || fps <= 0) return emptyList()
        val nominal = MS_PER_SECOND / fps
        return stampsMs.zipWithNext { a, b -> abs((b - a) - nominal) }
    }
}

/** Per-corner, per-axis median. One mis-resolved marker must not move the answer at all. */
internal fun medianQuadOf(passing: List<FloatArray>): FloatArray {
    val out = FloatArray(CORNER_FLOATS)
    for (i in 0 until CORNER_FLOATS) {
        val axis = passing.map { it[i] }.sorted()
        out[i] = axis[axis.size / 2]
    }
    return out
}

/**
 * Worst-corner error of each passing quad against [median], in RECTIFIED pixels — map the
 * frame's corners with the median's homography and measure how far they land from where the
 * median puts its own by construction. Exact, no pixels consulted.
 *
 * A BOARD-MOVEMENT check, never a correctness gate: a consistently wrong quad scores beautifully
 * here (the 2026-08-02 game read p90 0.93 while every quad was 27-33 px out). Correctness is
 * [com.chesslab.geometry.alignmentOf], absolute against the board's own grooves.
 */
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

/**
 * Why this footage must not become a candidate, or an empty list. Thresholds measured on the
 * 2026-08-02 game (`specs/40`, ported verbatim from the Python labeler): refuse rather than warn,
 * because the failure is silent downstream — crops that straddle their grooves while every count
 * in the pipeline looks healthy.
 */
fun geometryRefusals(g: ScannedGeometry): List<String> {
    val out = mutableListOf<String>()
    if (g.aligned == 0) {
        out += "no sampled frame's grid could be measured — is the board in shot?"
    } else if (g.alignPassRate < ALIGN_PASS_MIN) {
        out += "only ${"%.1f".format(HUNDRED * g.alignPassRate)} % of sampled frames align to the board's own grid " +
            "(need ${"%.0f".format(HUNDRED * ALIGN_PASS_MIN)} %). Hands over the board are the normal cause; " +
            "a rate this low means the grid itself is not being found."
    }
    val spreadP90 = g.quadSpreadPx.p90
    if (spreadP90 != null && spreadP90 > QUAD_SPREAD_P90_MAX) {
        out += "quad spread p90 ${"%.2f".format(spreadP90)} px > $QUAD_SPREAD_P90_MAX px: one static quad does not " +
            "stand for this footage. Did the board move? Cut the clip where it did, or re-film."
    }
    val clockP90 = g.clockErrorMs.p90
    val clockLimit = CLOCK_P90_PERIOD_FRAC * MS_PER_SECOND / max(g.fps, 1.0)
    if (clockP90 != null && clockP90 > clockLimit) {
        out += "frame interval p90 off by ${"%.2f".format(clockP90)} ms > ${"%.2f".format(clockLimit)} ms: the source " +
            "is not constant-rate, and fps is the replay's CLOCK. Re-encode first."
    }
    return out
}

/** The command that fixes a variable-rate source — printed, never run (no silent repairs). */
fun ffmpegCfrHint(
    videoPath: String,
    fps: Double,
): String {
    val out = videoPath.replace(Regex("\\.[^.\\\\/]+$"), "") + "-cfr.mp4"
    return "ffmpeg -i \"$videoPath\" -vsync cfr -r ${"%.6g".format(fps)} -c:v libx264 -crf 18 -preset slow -an \"$out\""
}

/** One human-readable block per scan, next to the numbers the refusals key on. */
fun geometryReport(g: ScannedGeometry): String {
    val cell = g.boardSize / SQUARES_PER_SIDE
    return buildString {
        appendLine("geometry: ${g.frames} frames, sampled every ${g.sampleEvery} -> ${g.sampled}")
        appendLine("  markers decoded per sampled frame: ${g.markersSeen}")
        appendLine(
            "  worst square offset (rectified px, one square = ${"%.0f".format(cell)} px): ${g.worstOffsetPx.line()}",
        )
        appendLine(
            "  PASSED the absolute gate: ${g.aligned} of ${g.sampled} (${"%.1f".format(HUNDRED * g.alignPassRate)} %, " +
                "gate >= ${"%.0f".format(HUNDRED * ALIGN_PASS_MIN)} %)",
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

/** See the Python originals for the measurements behind each threshold (specs/40, specs/52). */
const val QUAD_SPREAD_P90_MAX = 4.0
const val ALIGN_PASS_MIN = 0.85
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

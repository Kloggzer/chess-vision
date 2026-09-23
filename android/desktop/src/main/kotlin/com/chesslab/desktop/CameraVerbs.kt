package com.chesslab.desktop

import com.chesslab.geometry.LensFit
import com.chesslab.geometry.Undistorter
import com.chesslab.geometry.alignmentOf
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.toModel
import com.chesslab.tracker.geometry.boardGeometryFor
import com.chesslab.tracker.geometry.calibrateFromBoard
import com.chesslab.tracker.geometry.quadOf
import com.chesslab.tracker.geometry.rawQuadOf
import com.chesslab.tracker.geometry.refinedQuad
import com.chesslab.tracker.geometry.squareOffsetOf
import org.opencv.core.Mat
import java.io.File

internal fun alignCamera(index: Int) {
    val cost = Cost()
    WebcamSource(index).use { source ->
        measureAlignment(timedFrames(source, null, cost), cost)
    }
    cost.report("what each frame cost:")
}

private fun timedFrames(
    source: FrameSource,
    optics: Undistorter?,
    cost: Cost,
): () -> Mat? =
    {
        cost.of("camera grab") { source.next() }?.let { frame ->
            if (optics == null) frame else cost.of("lens remap") { optics.apply(frame) }
        }
    }

/** Before anything else is built: the quad decides the board size, which decides the warp. */
internal fun locateBoard(
    next: () -> Mat?,
    cost: Cost = Cost(),
    attempts: Int = LOCATE_ATTEMPTS,
): FloatArray? {
    repeat(attempts) {
        val frame = next() ?: return null
        // Timed separately: each half carries its own unverified ms claim.
        val markers = cost.of("aruco") { rawQuadOf(frame) } ?: return@repeat
        return cost.of("grid refit") { refinedQuad(frame, markers) }
    }
    return null
}

/** What the STORED marker margin (0.045, hand-glued) costs, measured absolutely by `alignmentOf`. */
private fun measureAlignment(
    next: () -> Mat?,
    cost: Cost = Cost(),
    frames: Int = ALIGN_FRAMES,
) {
    val quad =
        locateBoard(next, cost) ?: run {
            println("no board found: the markers never decoded")
            return
        }
    val geometry = boardGeometryFor(quad)
    val corners = cornersFromFlat(quad)
    println("board ${geometry.boardSize} px, margin ${geometry.margin.joinToString { "%.3f".format(it) }} (the stored constant)")
    val worst = mutableListOf<Double>()
    var unread = 0
    var read = 0
    repeat(frames) {
        val frame = next() ?: return@repeat
        val verdict = cost.of("alignmentOf") { alignmentOf(frame, corners, geometry) }
        if (verdict.worst.isFinite()) worst += verdict.worst
        unread += verdict.unread
        read += 1
        if (read == 1) println("first verdict: ${verdict.reason} (limit ${"%.2f".format(verdict.limit)} px)")
    }
    if (worst.isEmpty()) {
        println("no frame could be measured at all")
        return
    }
    val sorted = worst.sorted()
    println(
        "worst square offset over $read frames: " +
            "median ${"%.2f".format(sorted[sorted.size / 2])} px, " +
            "p90 ${"%.2f".format(sorted[(sorted.size * P90_NUM) / P90_DEN])} px, " +
            "max ${"%.2f".format(sorted.last())} px",
    )
    println("grid lines that could not be located: $unread over ${read * GRID_LINES_PER_FRAME}")
    next()?.let { frame ->
        rawQuadOf(frame)?.let { raw ->
            writeQuadProbe(frame, raw, File(QUAD_PROBE_PATH))?.let { println("probe: ${it.absolutePath}") }
        }
    }
}

/** Writes nothing: a calibration that misses the limit is a finding, not a file. */
internal fun calibrate(source: FrameSource) {
    // A LOAN: `next()` hands back a Mat the source still owns and will overwrite.
    val fit =
        calibrateFromBoard(
            { use -> source.next()?.also(use) != null },
            source.delivered.width,
            source.delivered.height,
        ) { println("  $it") }
    when {
        fit == null -> println("no board found: the markers never decoded")
        fit.rejected != null -> println("evidence: ${fit.evidence} — refused: ${fit.rejected}")
        else -> report(source, fit)
    }
}

private fun report(
    source: FrameSource,
    fit: LensFit,
) {
    println("evidence: ${fit.evidence}")
    println(
        "bow ${"%.5f".format(fit.bowBefore)} → ${"%.5f".format(fit.bowAfter)}  " +
            "k1=${"%.4f".format(fit.k1)} k2=${"%.4f".format(fit.k2)} " +
            "centre=(${"%.0f".format(fit.cx)}, ${"%.0f".format(fit.cy)})",
    )
    if (!fit.ok) {
        println("not accepted: the bow did not improve by the required margin")
        return
    }
    // A model that flattens its own objective and leaves the squares where they were has explained nothing.
    val size = source.delivered
    val raw = medianOffset(source::next)
    val corrected =
        Undistorter(fit.toModel(), size.width, size.height).use { undistorter ->
            medianOffset(next = { source.next()?.let(undistorter::apply) })
        }
    println(
        "worst square offset: ${raw?.let { "%.2f".format(it) } ?: "unmeasurable"} px raw → " +
            "${corrected?.let { "%.2f".format(it) } ?: "unmeasurable"} px corrected",
    )
    writeLensProbe(source, fit, File(PROBE_PATH))?.let { println("probe: ${it.absolutePath}") }
}

/** Per-run spread is <= 0.07 px over sixty frames — measured. */
private fun medianOffset(
    next: () -> Mat?,
    frames: Int = ALIGN_FRAMES,
): Double? {
    val seen = mutableListOf<Double>()
    repeat(frames) {
        val frame = next() ?: return@repeat
        quadOf(frame)?.let { quad -> squareOffsetOf(frame, quad).takeIf { it.isFinite() }?.let(seen::add) }
    }
    return seen.sorted().getOrNull(seen.size / 2)
}

private const val LOCATE_ATTEMPTS = 60

private const val ALIGN_FRAMES = 60

private const val GRID_LINES_PER_FRAME = 18

private const val P90_NUM = 9

private const val P90_DEN = 10

private const val PROBE_PATH = "../../tmp/lens-probe.png"

private const val QUAD_PROBE_PATH = "../../tmp/quad-probe.png"

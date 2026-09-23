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

/**
 * `align <n>` — the board against its own grid, as the frames arrive. The `raw` toggle that used to
 * sit here died with the stored calibration; `undistort` answers that now (`docs/desktop-replay.md`).
 */
internal fun alignCamera(index: Int) {
    val cost = Cost()
    WebcamSource(index).use { source ->
        measureAlignment(timedFrames(source, null, cost), cost)
    }
    cost.report("what each frame cost:")
}

/** The camera's frames, corrected if a lens is in play, with both halves on the clock. */
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

/**
 * The board's own markers, before anything else is built — the quad decides the board size, which
 * decides the warp, so it cannot be a stage in the loop (`docs/desktop-replay.md`).
 */
internal fun locateBoard(
    next: () -> Mat?,
    cost: Cost = Cost(),
    attempts: Int = LOCATE_ATTEMPTS,
): FloatArray? {
    repeat(attempts) {
        val frame = next() ?: return null
        // The two halves of `quadOf`, timed separately: each carries its own unverified ms claim,
        // and one combined number could check neither (`docs/desktop-replay.md`).
        val markers = cost.of("aruco") { rawQuadOf(frame) } ?: return@repeat
        return cost.of("grid refit") { refinedQuad(frame, markers) }
    }
    return null
}

/**
 * What the STORED marker margin (0.045, hand-glued) costs here, measured absolutely by `alignmentOf`.
 * Changes nothing: a per-corner margin waits until this says by how much (`docs/desktop-replay.md`).
 */
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

/**
 * Calibrate the lens from the board, and say plainly whether it worked. Writes nothing on its own:
 * a calibration that misses the limit is a finding, not a file (`docs/desktop-replay.md`).
 */
internal fun calibrate(source: FrameSource) {
    // A LOAN, not a getter: `next()` hands back a Mat the source still owns and will overwrite
    // (`docs/desktop-replay.md`).
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
    // The verdict the fit does not control. A model that flattens its own objective and leaves the
    // squares where they were has explained nothing — which is a finding, not a calibration.
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

/**
 * Median worst square offset over [frames], the only form these numbers may be compared in. Per-run
 * spread is <= 0.07 px over sixty frames — measured, not assumed (`docs/desktop-replay.md`).
 */
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

/** Frames to spend looking for the markers before giving up. At 30 fps this is two seconds. */
private const val LOCATE_ATTEMPTS = 60

/** Frames to judge the alignment over. Two seconds is enough to see a jitter that matters. */
private const val ALIGN_FRAMES = 60

/** Nine lines per axis, both axes — what `gridLines` reports on every frame. */
private const val GRID_LINES_PER_FRAME = 18

private const val P90_NUM = 9

private const val P90_DEN = 10

/** Where the visual proof lands. Under tmp/, which is not the corpus. */
private const val PROBE_PATH = "../../tmp/lens-probe.png"

/** Where the quad comparison lands. */
private const val QUAD_PROBE_PATH = "../../tmp/quad-probe.png"

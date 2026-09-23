package com.chesslab.tracker.sim

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.margins4
import com.chesslab.tracker.geometry.CropParams
import com.chesslab.tracker.geometry.GeometryScan
import com.chesslab.tracker.geometry.ScannedGeometry
import com.chesslab.tracker.geometry.geometryRefusals
import com.chesslab.tracker.geometry.geometryReport
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.move.Move
import org.opencv.core.Mat
import java.io.File

internal data class RealGameSource(
    override val video: File,
    override val config: TrackerConfig,
    override val startFen: String,
    override val corners: List<DoubleArray>,
    /** Markers sit in the label border, so [corners] lie OUTSIDE the playing field by this fraction. */
    val margin: Double,
    val boardSize: Int,
    override val fps: Double,
    /** WITHOUT a default: a 0.10 harness crop against the served 0.05 desynced the CNN three seconds in. */
    val cropParams: CropParams,
) : SimSource {
    /** The ONE place the crop reaches the warp; an attached model overrides only `outW`/`outH`. */
    override val geometry: BoardGeometry
        get() =
            BoardGeometry(
                boardSize = boardSize,
                margin = margins4(margin),
                padSide = cropParams.padSide,
                outW = cropParams.outW,
                outH = cropParams.outH,
            )
}

/** A recovery bridge reports several moves with ONE decider and ONE FEN, after the LAST of them. */
internal data class SimBatch(
    val frame: Int,
    val ucis: List<String>,
    val sans: List<String>,
    val decider: String,
    val alarm: Boolean,
    val fenAfter: String,
)

internal data class RealGamePly(
    val ply: Int,
    val san: String,
    val uci: String,
    val frame: Int,
    val t: Double,
    val decider: String,
    /** The HARNESS's observation: no decision row on either platform records it. */
    val alarm: Boolean,
    /** After THIS ply, never after its batch. */
    val fenAfter: String,
)

internal data class RealGameResult(
    val plies: List<RealGamePly>,
    val observations: Int,
    val frames: Int,
    val finalNote: String?,
)

/** Replayed on a board of its own, but the engine stays the authority: the batch's last ply takes
 *  [SimBatch.fenAfter] and the board re-seats on it, so an unplayable move stays a local hole. */
internal fun realGamePlies(
    batches: List<SimBatch>,
    startFen: String,
    fps: Double,
): List<RealGamePly> {
    val board = Board().apply { loadFromFen(startFen) }
    val plies = mutableListOf<RealGamePly>()
    for (batch in batches) {
        val t = (batch.frame + 1) / fps
        batch.ucis.forEachIndexed { index, uci ->
            runCatching { board.doMove(Move(uci, board.sideToMove)) }
            plies +=
                RealGamePly(
                    ply = plies.size + 1,
                    san = batch.sans.getOrElse(index) { uci },
                    uci = uci,
                    frame = batch.frame,
                    t = t,
                    decider = batch.decider,
                    alarm = batch.alarm,
                    fenAfter = if (index == batch.ucis.lastIndex) batch.fenAfter else board.engineFen(),
                )
        }
        board.loadFromFen(batch.fenAfter)
    }
    return plies
}

internal fun runRealGame(
    source: RealGameSource,
    cnn: SimCnn?,
    onFrame: (index: Int, mat: Mat) -> Unit = { _, _ -> },
): RealGameResult {
    val replay = replayVideo(source, cnn, onFrame)
    return RealGameResult(
        plies = realGamePlies(replay.log.batches, source.startFen, source.fps),
        observations = replay.timings.observations,
        frames = replay.timings.frames,
        finalNote = replay.finalNote,
    )
}

/** `Game.fen()`'s spelling, so a replayed FEN compares string-for-string with the engine's. */
private fun Board.engineFen(): String = getFen(true, true)

/** A refusal is an `error`: a label on crooked geometry is worse than none. */
internal fun measuredGeometryOf(video: File): ScannedGeometry {
    val scan = GeometryScan(videoFps(video)) { println("  $it") }
    forEachFrameTimed(video) { _, mat, timestampMs -> scan.offer(mat, timestampMs) }
    val measured =
        requireNotNull(scan.result()) {
            "no sampled frame of ${video.name} aligned to the board's grid — is the board in shot?"
        }
    println(geometryReport(measured))
    val refusals = geometryRefusals(measured)
    require(refusals.isEmpty()) {
        "this footage cannot become a candidate:\n  - " + refusals.joinToString("\n  - ")
    }
    return measured
}

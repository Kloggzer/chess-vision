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

/** A filmed game: everything the engine needs and no claim about the moves (`SimClip` has an answer key). */
internal data class RealGameSource(
    override val video: File,
    override val config: TrackerConfig,
    override val startFen: String,
    /** `[a8, h8, h1, a1]` in FRAME pixels — the corner order every geometry call in this repo takes. */
    override val corners: List<DoubleArray>,
    /** The fraction by which [corners] lie OUTSIDE the playing field, because the markers are glued in the label border. */
    val margin: Double,
    val boardSize: Int,
    override val fps: Double,
    /** Deliberately WITHOUT a default (specs/41): a 0.10 harness crop against the served 0.05 desynced
     *  the CNN three seconds into the 2026-08-02 game. */
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

/** One committed batch: a recovery bridge reports up to `recoveryMaxPlies` moves with ONE decider and
 *  ONE FEN, after the LAST of them; [realGamePlies] turns it back into plies. */
internal data class SimBatch(
    val frame: Int,
    val ucis: List<String>,
    val sans: List<String>,
    val decider: String,
    /** Polled from `status()` at the commit — see [RealGamePly.alarm]. */
    val alarm: Boolean,
    /** The engine's own position after the whole batch. */
    val fenAfter: String,
)

/** One committed ply, expanded from the engine's batch commits. */
internal data class RealGamePly(
    val ply: Int,
    val san: String,
    val uci: String,
    /** The 0-based index of the decoded frame the commit landed on. */
    val frame: Int,
    /** Video time in seconds, on the same clock the replay paces the engine with. */
    val t: Double,
    val decider: String,
    /** The alarm standing at the commit, polled from `status()` — the HARNESS's observation; no
     *  decision row on either platform records it. */
    val alarm: Boolean,
    /** The position after THIS ply, never after the batch it came in. */
    val fenAfter: String,
)

internal data class RealGameResult(
    val plies: List<RealGamePly>,
    val observations: Int,
    val frames: Int,
    val finalNote: String?,
)

/**
 * One row per ply with the FEN after ITSELF, replayed on a board of its own (Python's `_fens_after`).
 * The engine stays the authority: the batch's last ply takes [SimBatch.fenAfter] and the board is
 * re-seated on it, so an unplayable move stays a local hole.
 */
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

/** The real-game twin of `runClip` on the same runner; unscored, there is nothing to score it against. */
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

/** `Game.fen()`'s spelling, so a replayed FEN is comparable string-for-string with the engine's. */
private fun Board.engineFen(): String = getFen(true, true)

/**
 * specs/52 phase 01: measured with the shipping `GeometryScan`, every tenth frame. A refusal is an
 * `error`: a label on crooked geometry is worse than none (2026-07-31, the corpus 3-6 px out).
 */
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

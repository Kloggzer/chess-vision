package com.chesslab.tracker.sim

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.margins4
import com.chesslab.tracker.geometry.CropParams
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.move.Move
import org.opencv.core.Mat
import java.io.File

// The phone's engine over FILMED footage — the same seam `runClip` drives, minus the answer key.
//
// `SimClip` cannot express this. It is built from a `labels.json` that says what the moves were,
// and a real game has none: the machine proposes and a human disposes, which is the entire point
// of the review this feeds.

/**
 * A filmed game: everything the engine needs, and no claim about what the moves were.
 *
 * Every geometry field is an INPUT here. Measuring the quad from the footage belongs to the phase
 * that owns `:core-geometry`; this type only refuses to guess any of them.
 */
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
    /**
     * The crop box the model is served — deliberately WITHOUT a default value.
     *
     * specs/41: `ClipDriver` built its profile with the config-wide crop (`pad_side` 0.10) while
     * the profile the models are trained and served against says 0.05, and the resulting 120 px
     * box against 110 desynced the CNN three seconds into the 2026-08-02 game. A harness that can
     * leave the crop unsaid is a harness that can cut at the wrong size without saying so, so the
     * type does not let the caller leave it unsaid. specs/45 hands it over from the model's own
     * declaration; until that branch merges the caller passes the profile's.
     */
    val cropParams: CropParams,
) : SimSource {
    /**
     * The board geometry of this footage — the ONE place the crop reaches the warp.
     *
     * `outW`/`outH` are the crop's output size, and when a model is attached `ClipPipeline`
     * overrides them with the size that model's graph takes (`withCropSizeOf`). `padSide`/`padUp`
     * are the box itself and are never overridden by anything.
     */
    override val geometry: BoardGeometry
        get() =
            BoardGeometry(
                boardSize = boardSize,
                margin = margins4(margin),
                padUp = cropParams.padUp,
                padSide = cropParams.padSide,
                outW = cropParams.outW,
                outH = cropParams.outH,
            )
}

/**
 * One COMMITTED BATCH, as the engine emitted it.
 *
 * A recovery bridge pushes up to `recoveryMaxPlies` moves at once and reports all of them in a
 * single `TrackerEvent.SequenceCommitted`, with ONE decider and ONE FEN — the position after the
 * LAST of them. [realGamePlies] is what turns that back into plies.
 */
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
    /**
     * Whether the illegal-move alarm was standing when this ply committed.
     *
     * **An observation this harness makes, not a property the engine records.** No decision row on
     * either platform carries it — not `DebugDecision`, not the persisted
     * `DiagnosticsRecords.DecisionRow`, not Python's `_record_decision`. It is polled from
     * `TrackerEngine.status()` at the commit, so anything that reports it must say so rather than
     * let a reader believe the tracker wrote it down.
     */
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
 * The batches the engine committed, expanded to one row per ply, each carrying the FEN after ITSELF.
 *
 * `fenAfter` at a commit is the position after the LAST move of the batch. Stamping that on every
 * ply of a three-move recovery bridge shows a reviewer the wrong board for two of them, and telling
 * those three apart is the whole job of the review. Python does this in
 * `scripts/replay_clip_cnn.py::_fens_after` by popping and re-pushing a COPY of the tracker's own
 * board; `EngineState` is `internal` to `:core-engine` and no board is reachable from here, so this
 * replays the committed ucis on a board of its own — a copy by construction, with nothing the live
 * engine holds ever touched.
 *
 * The engine stays the authority on where the game IS: the last ply of a batch takes the engine's
 * own [SimBatch.fenAfter] (exactly where Python's `_fens_after` ends, at `board.fen()`), and the
 * replay board is re-seated on it, so a move this replay could not play stays a local hole instead
 * of poisoning every later ply.
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

/**
 * Drives the phone's engine over [source] and reports what it committed — the real-game twin of
 * `runClip`, and the same runner underneath.
 *
 * [onFrame] is handed each decoded frame together with the index that decoded it, once, in decode
 * order; see [replayVideo]. Everything this returns is the engine's own opinion: nothing here
 * scores it, because there is nothing to score it against.
 */
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

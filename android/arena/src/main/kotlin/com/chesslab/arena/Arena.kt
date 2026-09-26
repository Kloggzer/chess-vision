package com.chesslab.arena

import com.chesslab.engine.api.STARTPOS
import com.chesslab.tracker.geometry.quadOf
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.move.MoveList
import java.io.File

/** The arena keeps the board, so a tracker cannot invent a legal-looking history. The quad is re-measured
 *  only every [alignEvery] frames: the camera is mounted, and per-frame search doubles the cost. */
fun runTracker(
    video: File,
    tracker: ArenaTracker,
    models: Models,
    alignEvery: Int = ALIGN_EVERY,
    limit: Long = Long.MAX_VALUE,
    onProgress: (Long) -> Unit = {},
    startFen: String = STARTPOS,
): RunResult {
    val started = System.nanoTime()
    val board = Board().apply { loadFromFen(startFen) }
    val plies = mutableListOf<RunPly>()
    val illegal = mutableListOf<String>()
    var quad: FloatArray? = null
    var frames = 0L

    Recording(video).use { recording ->
        while (frames < limit) {
            val raw = recording.next() ?: break
            frames += 1
            if (quad == null || recording.index % alignEvery == 0L) {
                quad = quadOf(raw) ?: quad
            }
            val view = FrameView(recording.index, recording.timestampMs, recording.fps, raw, quad, models)
            for (uci in tracker.onFrame(view)) {
                commit(board, uci, recording.index, recording.timestampMs, plies, illegal)
            }
            onProgress(frames)
        }
        for (uci in tracker.finish()) {
            commit(board, uci, recording.index, recording.timestampMs, plies, illegal)
        }
    }
    return RunResult(plies, frames, models.total, illegal, (System.nanoTime() - started) / NANOS_PER_SECOND)
}

private fun commit(
    board: Board,
    uci: String,
    frame: Long,
    tsMs: Double,
    plies: MutableList<RunPly>,
    illegal: MutableList<String>,
) {
    val san =
        runCatching {
            val list = MoveList(board.fen)
            list.loadFromText(uci)
            val move = list.first()
            check(board.legalMoves().contains(move)) { "not legal in ${board.fen}" }
            val san = list.toSanArray().first()
            board.doMove(move)
            san
        }.getOrNull()
    if (san == null) {
        illegal += "$uci@$frame"
    } else {
        plies += RunPly(san, frame, tsMs)
    }
}

fun writePlies(
    out: File,
    result: RunResult,
) {
    out.parentFile?.mkdirs()
    out.writeText(
        result.plies
            .mapIndexed { i, p ->
                """{"ply": ${i + 1}, "san": "${p.san}", "frame": ${p.frame}, "tsMs": ${fixed(p.tsMs, 1)}}"""
            }.joinToString(System.lineSeparator(), postfix = System.lineSeparator()),
    )
}

private const val ALIGN_EVERY = 30

private const val NANOS_PER_SECOND = 1_000_000_000.0

package com.chesslab.tracker.games

import com.chesslab.engine.api.DebugDecision
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.move.Move
import com.github.bhlangonijr.chesslib.move.MoveGenerator

/** One move as it was committed, plus the position it produced (the undo probe below needs it). */
private data class LiveMove(
    val move: StoredMove,
    val fenAfter: String,
)

/**
 * Accumulates the running game from the tracker's committed moves so it can be saved when it ends.
 *
 * Pure state, no Android, no I/O: the engine publishes moves as events and its position as a FEN,
 * and everything the library stores is derivable from those two.
 */
class LiveGame(
    private val startFen: String,
    private val startedAtEpochMs: Long,
    private val profileName: String,
) {
    private val moves = mutableListOf<LiveMove>()

    val moveCount: Int get() = moves.size

    /**
     * One commit, one or more plies — a `SequenceCommitted` (fast play, CNN recovery) is a single
     * event carrying several.
     *
     * [decision] is why the tracker believed this move. It rides on the LAST ply, because that is
     * where the engine records it (`Commit.kt:157`). The caller decides how rich it is: the decider
     * always, its full evidence only while the debug payload is armed.
     */
    fun onCommitted(
        ucis: List<String>,
        sans: List<String>,
        fenAfter: String,
        tsEpochMs: Long,
        decision: MoveProvenance?,
    ) {
        val fens = positionsAfter(ucis, fenAfter)
        for (i in ucis.indices) {
            val last = i == ucis.lastIndex
            moves +=
                LiveMove(
                    StoredMove(
                        ply = moves.size + 1,
                        san = sans[i],
                        uci = ucis[i],
                        tsEpochMs = tsEpochMs,
                        provenance = if (last) decision else null,
                    ),
                    fenAfter = fens[i],
                )
        }
    }

    /**
     * Does [ucis] continue THIS record's own position line?
     *
     * The engine can never commit an illegal move — its board validates every one. A record can
     * still go illegal, because the engine's board may JUMP between two commits: a desync alarm
     * being resolved, a FEN resync, an accepted CNN recovery. The recorder sees none of those (it
     * handles `MoveCommitted`, `SequenceCommitted` and `ReAnchored`, and drops `Alarm` /
     * `AlarmCleared`), so it used to append the plies after the jump onto the line from before it.
     *
     * Measured on the device: four of five recorded games were not legal sequences from their own
     * `startFen` — one broke at ply 1, the others at 2, 18 and 28. Such a file is unusable as a
     * game AND as labeled training data, because every FEN after the seam is wrong.
     *
     * Checking the first ply is enough: a sequence commit is generated from one position by the
     * engine, so if its head fits, the rest of it does.
     */
    fun continues(ucis: List<String>): Boolean {
        val board = Board().apply { loadFromFen(fenBefore(moves.size)) }
        val wanted = ucis.firstOrNull() ?: return true
        return MoveGenerator.generateLegalMoves(board).any { it.toString() == wanted }
    }

    /**
     * A sequence carries only its FINAL position, so the ones in between are replayed. [onFen]
     * compares against them, and without them an undo straight after a fast-play pair is missed.
     */
    private fun positionsAfter(
        ucis: List<String>,
        fenAfter: String,
    ): List<String> {
        if (ucis.size == 1) return listOf(fenAfter)
        val board = Board().apply { loadFromFen(fenBefore(moves.size)) }
        return ucis.mapIndexed { i, uci ->
            runCatching { board.doMove(Move(uci, board.sideToMove)) }
            if (i == ucis.lastIndex) fenAfter else board.fen
        }
    }

    /**
     * Detects an undo from the published position, because the engine emits no undo event
     * (`TrackerEngine.undo` only sets a note). A position that equals the one BEFORE the last move
     * can only mean the last move was taken back — and a taken-back move must not survive in the
     * library or as labeled training data.
     */
    fun onFen(fen: String): Boolean {
        val last = moves.lastOrNull() ?: return false
        if (fen == last.fenAfter || fen != fenBefore(moves.size - 1)) return false
        moves.removeAt(moves.size - 1)
        return true
    }

    fun finish(
        id: String,
        finishedAtEpochMs: Long,
        sessionId: String? = null,
    ): StoredGame =
        StoredGame(
            id = id,
            startFen = startFen,
            startedAtEpochMs = startedAtEpochMs,
            finishedAtEpochMs = finishedAtEpochMs,
            profileName = profileName,
            result = resultFromFen(moves.lastOrNull()?.fenAfter ?: startFen),
            moves = moves.map { it.move },
            sessionId = sessionId,
        )

    private fun fenBefore(index: Int): String = if (index == 0) startFen else moves[index - 1].fenAfter
}

fun DebugDecision.toProvenance(): MoveProvenance =
    MoveProvenance(
        decider = decider,
        reason = reason,
        priorUsed = priorUsed,
        best = bestScore,
        second = secondScore,
        margin = margin,
        changed = changed,
        shadowVetoed = shadowVetoed,
        occludedVetoed = occludedVetoed,
        cnnAgreement = cnnAgreement,
        verifyOutcomes = listOfNotNull(verifyOutcome),
    )

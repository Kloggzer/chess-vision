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

/** One legal line being played. See [StoredGame.segments] for why a game is a list of them. */
private class LiveSegment(
    val startFen: String,
    val enteredBy: SeamOrigin?,
) {
    val moves = mutableListOf<LiveMove>()

    val currentFen: String get() = moves.lastOrNull()?.fenAfter ?: startFen

    /** The position before the move at [index] — the start when there is no earlier move. */
    fun fenBefore(index: Int): String = if (index == 0) startFen else moves[index - 1].fenAfter
}

/**
 * Accumulates the running game from the tracker's committed moves so it can be saved when it ends.
 *
 * Pure state, no Android, no I/O: the engine publishes moves as events and its position as a FEN,
 * and everything the library stores is derivable from those two.
 *
 * A game is one record for as long as it is played, seams included ([openSegment]) — the user reads
 * the library, and "eine Naht in der Game-Historie ist für mich als Nutzer unverständlich".
 */
class LiveGame(
    private val startFen: String,
    private val startedAtEpochMs: Long,
    private val profileName: String,
) {
    private val segments = mutableListOf(LiveSegment(startFen, enteredBy = null))

    private val current get() = segments.last()

    val moveCount: Int get() = segments.sumOf { it.moves.size }

    /** The position this record currently stands on — its last move's, or its last segment's start. */
    val currentFen: String get() = current.currentFen

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
        // The DECIDER belongs to every ply of the sequence — one decision produced them all — while
        // the EVIDENCE was recorded against the last one only (`Commit.kt:157`) and would be a
        // fabrication on the others. Writing `null` for the earlier plies lost the decider too: a
        // tally over 16 stored games read 89 of 113 plies as "unknown", which is exactly the
        // information needed to see how many plies recovery is responsible for.
        val shared = decision?.let { MoveProvenance(it.decider, it.reason, it.priorUsed) }
        for (i in ucis.indices) {
            val last = i == ucis.lastIndex
            current.moves +=
                LiveMove(
                    StoredMove(
                        // Numbered across the WHOLE game, not per segment: the flattened `moves`
                        // list is what every reader uses, and duplicate plies in it are a broken
                        // list key on the detail screen.
                        ply = moveCount + 1,
                        san = sans[i],
                        uci = ucis[i],
                        // One event, one instant: a sequence is observed as a whole and there is no
                        // per-ply time to report. Spreading invented timestamps would read as
                        // measurement.
                        tsEpochMs = tsEpochMs,
                        provenance = if (last) decision else shared,
                    ),
                    fenAfter = fens[i],
                )
        }
    }

    /**
     * Does [ucis] continue the CURRENT SEGMENT's position line?
     *
     * The engine can never commit an illegal move — its board validates every one. A record can
     * still go illegal, because the engine's board may JUMP between two commits: a desync alarm
     * being resolved, a FEN resync, an accepted CNN recovery. The recorder sees none of those (it
     * handles `MoveCommitted`, `SequenceCommitted` and `ReAnchored`, and drops `Alarm` /
     * `AlarmCleared`), so it used to append the plies after the jump onto the line from before it.
     *
     * Measured on the device: four of five recorded games were not legal sequences from their own
     * `startFen` — one broke at ply 1, the others at 2, 18 and 28. Such a line is unusable as a
     * game AND as labeled training data, because every FEN after the seam is wrong.
     *
     * Checking the first ply is enough: a sequence commit is generated from one position by the
     * engine, so if its head fits, the rest of it does.
     */
    fun continues(ucis: List<String>): Boolean {
        val board = Board().apply { loadFromFen(currentFen) }
        val wanted = ucis.firstOrNull() ?: return true
        return MoveGenerator.generateLegalMoves(board).any { it.toString() == wanted }
    }

    /**
     * The engine's board jumped to [fenAfter] and [seam] is what it committed to get there. The
     * plies fit no line this record holds — that is what a seam IS — so they open a new one instead
     * of ending the record. They stay OUT of every move list and are kept on the segment, because
     * appending them would make the segment's own FENs wrong from its first ply.
     */
    fun openSegment(
        fenAfter: String,
        seam: SeamOrigin,
    ) {
        segments += LiveSegment(fenAfter, seam)
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
        val board = Board().apply { loadFromFen(currentFen) }
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
     *
     * Undoing the only move of a segment removes the segment too: a segment with no moves claims
     * the app rebuilt the board for nothing, and the detail screen would render its seam note above
     * an empty list. The first segment stays whatever happens — it carries the record's `startFen`.
     */
    fun onFen(fen: String): Boolean {
        val moves = current.moves
        val last = moves.lastOrNull() ?: return false
        if (fen == last.fenAfter || fen != current.fenBefore(moves.size - 1)) return false
        moves.removeAt(moves.size - 1)
        if (moves.isEmpty() && segments.size > 1) segments.removeAt(segments.size - 1)
        return true
    }

    /**
     * The LIVE source. Identical in type to what a stored game replays to, so the review screen and
     * the LAN page cannot tell a running game from a finished one except by [GameView.live].
     *
     * No replay is needed here: every ply already carries the position it produced.
     */
    fun view(): GameView =
        GameView(
            id = "",
            live = true,
            startFen = startFen,
            result = resultFromFen(currentFen),
            segments =
                segments.map { segment ->
                    ReviewSegment(
                        startFen = segment.startFen,
                        plies =
                            segment.moves.map {
                                ReviewPly(it.move.ply, it.move.san, it.move.uci, it.fenAfter, it.move.provenance?.decider)
                            },
                        enteredBy = segment.enteredBy,
                    )
                },
        )

    /**
     * [white] and [black] are asked for in the end-game dialog, which already interrupts. Nothing is
     * asked before the first move — the model has carried these two fields since 08a and nothing
     * ever wrote them, so every stored game read `? vs ?` on the device.
     */
    fun finish(
        id: String,
        finishedAtEpochMs: Long,
        sessionId: String? = null,
        white: String = UNKNOWN,
        black: String = UNKNOWN,
    ): StoredGame =
        StoredGame(
            id = id,
            startFen = startFen,
            startedAtEpochMs = startedAtEpochMs,
            finishedAtEpochMs = finishedAtEpochMs,
            profileName = profileName,
            result = resultFromFen(currentFen),
            moves = segments.flatMap { segment -> segment.moves.map { it.move } },
            white = white,
            black = black,
            sessionId = sessionId,
            segments = segments.map { GameSegment(it.startFen, it.moves.map { move -> move.move }, it.enteredBy) },
        )
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

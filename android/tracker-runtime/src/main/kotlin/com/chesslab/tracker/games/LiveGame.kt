package com.chesslab.tracker.games

import com.chesslab.engine.api.DebugDecision
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.move.Move
import com.github.bhlangonijr.chesslib.move.MoveGenerator

private data class LiveMove(
    val move: StoredMove,
    val fenAfter: String,
)

private class LiveSegment(
    val startFen: String,
    val enteredBy: SeamOrigin?,
) {
    val moves = mutableListOf<LiveMove>()

    val currentFen: String get() = moves.lastOrNull()?.fenAfter ?: startFen

    fun fenBefore(index: Int): String = if (index == 0) startFen else moves[index - 1].fenAfter
}

/** One record for as long as it is played, seams included ([openSegment]). */
class LiveGame(
    private val startFen: String,
    private val startedAtEpochMs: Long,
    private val profileName: String,
    private val hintsRecorded: Boolean = false,
) {
    private val segments = mutableListOf(LiveSegment(startFen, enteredBy = null))

    private val current get() = segments.last()

    val moveCount: Int get() = segments.sumOf { it.moves.size }

    val currentFen: String get() = current.currentFen

    /** [decision] rides on the LAST ply, where the engine records it. */
    fun onCommitted(
        ucis: List<String>,
        sans: List<String>,
        fenAfter: String,
        tsEpochMs: Long,
        decision: MoveProvenance?,
        /** Rides on the FIRST ply: a sequence is committed out of ONE position, the one a tip was bound to. */
        hint: MoveHint? = null,
    ) {
        val fens = positionsAfter(ucis, fenAfter)
        // The DECIDER belongs to every ply of the sequence, the EVIDENCE only to the last: null for the earlier
        // plies read 89 of 113 plies as "unknown".
        val shared = decision?.let { MoveProvenance(it.decider, it.reason, it.priorUsed) }
        for (i in ucis.indices) {
            val last = i == ucis.lastIndex
            current.moves +=
                LiveMove(
                    StoredMove(
                        // Across the WHOLE game: duplicate plies are a broken list key on the detail screen.
                        ply = moveCount + 1,
                        san = sans[i],
                        uci = ucis[i],
                        // One event, one instant: invented per-ply timestamps would read as measurement.
                        tsEpochMs = tsEpochMs,
                        provenance = if (last) decision else shared,
                        hint = if (i == 0) hint else null,
                    ),
                    fenAfter = fens[i],
                )
        }
    }

    /** The engine's board may JUMP between two commits (alarm resolved, resync, CNN recovery) and the recorder
     *  sees none of those: four of five recorded games were not legal from their own `startFen`. The head
     *  suffices, a sequence is generated from one position. */
    fun continues(ucis: List<String>): Boolean {
        val board = Board().apply { loadFromFen(currentFen) }
        val wanted = ucis.firstOrNull() ?: return true
        return MoveGenerator.generateLegalMoves(board).any { it.toString() == wanted }
    }

    /** A CNN recovery normally leaves exactly one legal sequence to its position; [seamBridge] answers only then.
     *  Only [LIVE_BRIDGE_PLIES] deep, on the commit itself; `closeSeams` goes deeper when the game is opened. */
    fun closeGapBefore(
        ucis: List<String>,
        fenAfter: String,
        tsEpochMs: Long,
        decider: String,
    ): Boolean {
        val bridge = seamBridge(currentFen, ucis, fenAfter, LIVE_BRIDGE_PLIES) ?: return false
        val plies = playedFrom(currentFen, bridge) ?: return false
        plies.forEach { ply ->
            current.moves +=
                LiveMove(
                    StoredMove(
                        ply = moveCount + 1,
                        san = ply.san,
                        uci = ply.uci,
                        tsEpochMs = tsEpochMs,
                        provenance = provenanceOf(derived = true, decider = decider),
                    ),
                    fenAfter = ply.fenAfter,
                )
        }
        return true
    }

    /** The plies stay OUT of every move list: appending them would make the segment's own FENs wrong. */
    fun openSegment(
        fenAfter: String,
        seam: SeamOrigin,
    ) {
        segments += LiveSegment(fenAfter, seam)
    }

    /** Without the in-between positions an undo straight after a fast-play pair is missed. */
    private fun positionsAfter(
        ucis: List<String>,
        fenAfter: String,
    ): List<String> {
        if (ucis.size == 1) return listOf(fenAfter)
        val board = Board().apply { loadFromFen(currentFen) }
        return ucis.mapIndexed { i, uci ->
            // Erzeugen statt `doMove` versuchen: chesslib wendet `e2e5` auch unter `fullValidation` an.
            if (MoveGenerator.generateLegalMoves(board).any { it.toString() == uci }) {
                board.doMove(Move(uci, board.sideToMove))
            }
            if (i == ucis.lastIndex) fenAfter else board.fen
        }
    }

    /** Looking like it is NOT enough: a status sampled before a commit and delivered after it is bit-for-bit a
     *  take-back. `GameSessionController.onStatus` turns this into a decision. */
    fun wouldUndo(fen: String): Boolean = undoDepth(fen) > 0

    /** `TrackerEngine.undo` poppt `lastCommitSize` Plies auf einmal: nur den letzten zu pruefen liess ein Paar-Undo
     *  unsichtbar, beide Plies wurden Trainingsmaterial. */
    private fun undoDepth(fen: String): Int {
        val moves = current.moves
        if (moves.isEmpty() || fen == moves.last().fenAfter) return 0
        for (k in 1..minOf(MAX_UNDO_PLIES, moves.size)) {
            if (fen == current.fenBefore(moves.size - k)) return k
        }
        return 0
    }

    /** A taken-back move must not survive as labeled data. An emptied segment goes too, except the first. */
    fun onFen(fen: String): Boolean {
        val depth = undoDepth(fen)
        if (depth == 0) return false
        val moves = current.moves
        repeat(depth) { moves.removeAt(moves.size - 1) }
        if (moves.isEmpty() && segments.size > 1) segments.removeAt(segments.size - 1)
        return true
    }

    /** Identical in type to a stored game's view, so review and LAN page differ only by [GameView.live]. */
    fun view(): GameView =
        GameView(
            id = "",
            live = true,
            hintsRecorded = hintsRecorded,
            startFen = startFen,
            result = resultFromFen(currentFen).tag,
            segments =
                segments.map { segment ->
                    ReviewSegment(
                        startFen = segment.startFen,
                        plies =
                            segment.moves.map {
                                ReviewPly(
                                    it.move.ply,
                                    it.move.san,
                                    it.move.uci,
                                    it.fenAfter,
                                    it.move.provenance?.decider,
                                    it.move.hint,
                                )
                            },
                        enteredBy = segment.enteredBy,
                    )
                },
        )

    /** Asked in the end-game dialog: nothing ever wrote these fields, so every stored game read `? vs ?`. */
    fun finish(
        id: String,
        finishedAtEpochMs: Long,
        sessionId: String? = null,
        white: String = UNKNOWN,
        black: String = UNKNOWN,
        /** Null = read it off the board; `resultFromFen` sees only terminal positions, so a resignation was stored
         *  as "unfinished". */
        result: GameResult? = null,
        /** Null reads as NOT RECORDED, not as unaided. */
        hints: HintRecord? = null,
    ): StoredGame =
        StoredGame(
            id = id,
            startFen = startFen,
            startedAtEpochMs = startedAtEpochMs,
            finishedAtEpochMs = finishedAtEpochMs,
            profileName = profileName,
            result = (result ?: resultFromFen(currentFen)).tag,
            moves = segments.flatMap { segment -> segment.moves.map { it.move } },
            white = white,
            black = black,
            sessionId = sessionId,
            segments = segments.map { GameSegment(it.startFen, it.moves.map { move -> move.move }, it.enteredBy) },
            hints = hints,
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

/** Weiter zurueck zu greifen hiesse, eine Stellungswiederholung fuer ein Undo zu halten. */
private const val MAX_UNDO_PLIES = 3

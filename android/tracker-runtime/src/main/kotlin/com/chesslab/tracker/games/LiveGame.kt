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
    /** Whether tips were watched for at all — see [HintRecord] for why absence is not innocence. */
    private val hintsRecorded: Boolean = false,
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
        /** Rides on the FIRST ply: a sequence is committed out of ONE position, and that is the
         *  one a tip was bound to. The plies behind it were never told to anybody. */
        hint: MoveHint? = null,
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
                        hint = if (i == 0) hint else null,
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
     * The engine committed [ucis] from a position this record cannot reach, and this closes the gap
     * BEFORE giving up and opening a segment.
     *
     * A CNN recovery is the normal cause, and it is normally no mystery: the tracker missed a ply or
     * two behind a hand, and there is exactly one legal sequence that reaches the position the
     * recovery committed from. Those plies happened — [seamBridge] refuses to answer unless they are
     * the only ones that can have — so they are appended as real plies under their own decider and
     * the record simply carries on. Only a gap nothing explains becomes a seam.
     *
     * It searches to [LIVE_BRIDGE_PLIES] rather than the full depth: this runs on the commit itself,
     * and a deeper gap is closed by `closeSeams` when the finished game is opened.
     */
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
            // Erzeugen statt `doMove` versuchen: chesslib wendet `e2e5` auch unter `fullValidation`
            // an (gemessen 2026-08-03) und schrieb den teleportierten Bauern als Zwischenstellung in
            // den Record. `GameView.replay` fuehrt dieselbe Pruefung aus demselben Grund.
            if (MoveGenerator.generateLegalMoves(board).any { it.toString() == uci }) {
                board.doMove(Move(uci, board.sideToMove))
            }
            if (i == ucis.lastIndex) fenAfter else board.fen
        }
    }

    /**
     * Does [fen] look like the last recorded ply was taken back — i.e. is it the position BEFORE it?
     *
     * Looking like it is NOT enough to act on, and that is the whole point of splitting this out of
     * [onFen]. The engine emits no undo event (`TrackerEngine.undo` only sets a note), so the record
     * reads the published position — and that position is sampled and delivered by a different
     * coroutine than the commit events. A status sampled a moment BEFORE a commit and delivered a
     * moment after it is bit-for-bit the same thing as a take-back. See
     * `GameSessionController.onStatus` for what turns this into a decision.
     */
    fun wouldUndo(fen: String): Boolean = undoDepth(fen) > 0

    /**
     * Wie viele Plies die Engine gerade zurueckgenommen hat, 0 wenn keiner.
     *
     * `TrackerEngine.undo` poppt `lastCommitSize` Plies auf einmal — ein Schnellspiel-Paar
     * oder die CNN-Bruecke sind mehr als einer. Nur den letzten zu pruefen liess ein
     * Paar-Undo unsichtbar, beide Plies blieben im Record und wurden Trainingsmaterial.
     */
    private fun undoDepth(fen: String): Int {
        val moves = current.moves
        if (moves.isEmpty() || fen == moves.last().fenAfter) return 0
        for (k in 1..minOf(MAX_UNDO_PLIES, moves.size)) {
            if (fen == current.fenBefore(moves.size - k)) return k
        }
        return 0
    }

    /**
     * Takes the last ply back. A taken-back move must not survive in the library or as labeled
     * training data.
     *
     * Undoing the only move of a segment removes the segment too: a segment with no moves claims
     * the app rebuilt the board for nothing, and the detail screen would render its seam note above
     * an empty list. The first segment stays whatever happens — it carries the record's `startFen`.
     */
    fun onFen(fen: String): Boolean {
        val depth = undoDepth(fen)
        if (depth == 0) return false
        val moves = current.moves
        repeat(depth) { moves.removeAt(moves.size - 1) }
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
        /**
         * What the players SAY happened. Null means read it off the board, which is right for a
         * mate and for the service's own auto-save — and wrong for every other way a game ends,
         * which is why it can be given at all: `resultFromFen` can only see terminal positions, so
         * a resignation and an agreed draw were both stored as "unfinished" and read, in the
         * library, as "Game in progress".
         */
        result: GameResult? = null,
        /** Null keeps an older caller's game unmarked — which reads as NOT RECORDED, not as
         *  unaided. `GameSessionController` passes its ledger's log. */
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

/** So weit poppt `TrackerEngine.undo` hoechstens: die `FAST_PLIES` der Paar-Suche. Weiter
 *  zurueck zu greifen hiesse, eine Stellungswiederholung fuer ein Undo zu halten. */
private const val MAX_UNDO_PLIES = 3

package com.chesslab.engine

import com.chesslab.engine.api.CnnEvaluator
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.ResyncResult
import com.chesslab.engine.api.TrackerEvent
import com.github.bhlangonijr.chesslib.move.Move

private const val CNN_STATUS_OK = "ok"

private const val OUTCOME_SHADOW = "shadow"

private const val OUTCOME_COMMIT = "commit"

private const val OUTCOME_COLOUR = "colour"

/** Below this, agreement is 0.0, never "the fraction of what we have": two lucky squares must not pass. */
private const val MIN_CHECKED_FOR_AGREEMENT = 3

/** A conflict that already existed against the CURRENT position cannot discriminate "moved" from "not moved"
 *  and must not veto — the all-or-nothing match livelocked. */
internal object VerifyPair {
    fun tick(
        state: EngineState,
        cnn: CnnEvaluator,
        moves: List<Move>,
        boardSnap: Game,
        snap: CnnSnapshot,
    ): List<TrackerEvent> {
        val obs = snap.obs
        val before = cnn.resyncCheck(boardSnap.fen(), obs)
        val afterBoard = boardSnap.copy()
        for (mv in moves) afterBoard.push(mv)
        val after = cnn.resyncCheck(afterBoard.fen(), obs)
        val conf = confidentMask(obs, cnn.confThr)
        // LOCAL: only the squares the pair changes. `nConf` is the WHOLE board — not interchangeable.
        val touched = touchedMask(boardSnap, moves)
        val checked = touched and conf
        val pairAgree = pairAgreement(obs, afterBoard, checked)
        val wrongColour = pairColourConflicts(obs, afterBoard, checked, cnn.confThr)
        val nConf = conf.countOneBits()

        state.cnnAgreement = after.agreement
        val pend = state.pending
        if (pend == null || state.board.fen() != pend.fen) return emptyList()
        pend.frames++
        pend.lastTickS = state.nowS
        // Inside the motion hold no verdict until both moves' squares were SEEN settled — `a5` committed under the hand.
        if (state.earlyCommit && !state.sightSettled(boardSnap, moves)) {
            state.note = "early: waiting to see the pair settled (${state.sights.size} sights)"
            return emptyList()
        }
        // Dieselbe Grenze wie in `VerifySingle`: eine zutreffende Sprosse ohne Stimmen hielt den Kandidaten sonst
        // unbegrenzt. `state.pending` ist das Zeichen, dass keine Sprosse abschloss.
        val bound = pend.frames >= state.config.verifyWindow || state.verifyExpired(pend)

        fun atEnd() = state.pairWindowEnd(moves, pend, state.pairReadable(checked, touched), before, after)
        return when {
            before.match && nConf >= cnn.minConfidentBoard ->
                state.acceptShadow(pend).let { if (bound && state.pending != null) atEnd() else it }
            // Ein Farbwiderspruch auf einem sicher gelesenen Feld heisst: nach dem Paar staende etwas anderes.
            wrongColour.isNotEmpty() -> state.colourReject(moves, wrongColour)
            (after.match && nConf >= cnn.minConfidentBoard) || pairAgree >= cnn.minAgreement ->
                if (state.pendingVoted(OUTCOME_COMMIT, COMMIT_VOTES)) {
                    state.commitPair(pend, DECIDER_CNN_PAIR)
                } else if (bound) {
                    atEnd()
                } else {
                    emptyList()
                }
            bound -> atEnd()
            else -> {
                // Siehe `VerifySingle`: die Serie muss aufeinanderfolgend sein.
                pend.voteOutcome = null
                pend.voteCount = 0
                state.note =
                    "checking double move ${pairKey(moves)} via CNN… (${pend.frames}/${state.config.verifyWindow}) " +
                    colourTrace(obs, afterBoard, touched, checked)
                emptyList()
            }
        }
    }
}

/** `minConfidentBoard` is the blind-glance guard: under a hand `resyncCheck` matches VACUOUSLY and a
 *  near-blind glance would re-anchor onto the covered image. */
private fun EngineState.acceptShadow(pend: PendingVerify): List<TrackerEvent> {
    if (!pendingVoted(OUTCOME_SHADOW, config.verifyObsVotes)) return emptyList()
    recordRejection(pend.ucis.joinToString(" "), "$VERIFY_STATE_SHADOW — Shadow/no move (CNN: board unchanged)", foldConsecutive = false)
    pending = null
    confirmer.reset()
    clearStuck()
    // Invariant 5: the verify path anchors on the averaged frame the candidate was raised from.
    setRef(pend.cur, pend.curBgr, fromCommit = true)
    verifyState = VERIFY_STATE_SHADOW
    cnnStatus = VERIFY_STATE_SHADOW
    cnnConflicts = emptyList()
    note = "Shadow/no move (CNN: board unchanged)"
    return emptyList()
}

/** Ueber [applyVerdict], damit `pending` VOR den Zeilen faellt: sonst erbte jede Ebene `pend.voteOutcome`. */
private fun EngineState.commitPair(
    pend: PendingVerify,
    decider: String,
): List<TrackerEvent> {
    cnnStatus = CNN_STATUS_OK
    cnnConflicts = emptyList()
    return applyVerdict(VerifyVerdict.For(decider), pend)
}

private fun EngineState.pairReadable(
    checked: Long,
    touched: Long,
): Boolean = if (config.windowEndBothEnds) checked == touched else checked != 0L

/** NOT vote-gated: the window is the damping. Pre-existing conflicts are chronic misreads; a touched square
 *  that was never readable is an occlusion timeout — never auto-accept under a hand. */
private fun EngineState.pairWindowEnd(
    moves: List<Move>,
    pend: PendingVerify,
    readable: Boolean,
    before: ResyncResult,
    after: ResyncResult,
): List<TrackerEvent> {
    val key = pairKey(moves)
    val preexisting = ofSquares(after.conflicts).without(ofSquares(before.conflicts)) == 0L
    return when {
        readable && preexisting -> {
            val events = commitPair(pend, DECIDER_DIFF_AFTER_VERIFY)
            note = "Double move $key accepted (CNN conflicts pre-existed the candidate)"
            events
        }
        !readable -> {
            rejectPair(key, "Verification timed out under occlusion — no move committed", emptyList())
            emptyList()
        }
        else -> {
            rejectPair(key, "Double move $key not confirmed by CNN — discarded", after.conflicts)
            emptyList()
        }
    }
}

/** Auch die Farbachse entscheidet nie auf EINEN Blick gegen den Diff (Invariante 13). */
private fun EngineState.colourReject(
    moves: List<Move>,
    wrongColour: List<String>,
): List<TrackerEvent> {
    if (pendingVoted(OUTCOME_COLOUR, config.verifyObsVotes)) {
        val key = pairKey(moves)
        rejectPair(key, "Double move $key contradicted on colour — discarded", wrongColour)
    }
    return emptyList()
}

/** Protokolliert: eine still verworfene Hypothese ist von einer nie gesehenen nicht zu unterscheiden. */
private fun EngineState.rejectPair(
    key: String,
    noteText: String,
    conflicts: List<String>,
) {
    recordRejection(key, "$VERIFY_STATE_GHOST — $noteText", foldConsecutive = false)
    // A pair with a phantom second half was re-proposed until the alarm: the single it shadows never got its turn.
    rejectedPair = key
    rejectedPairFen = board.fen()
    pending = null
    confirmer.reset()
    // NICHT `recoveryConfirmer.reset()`: das Paar bestand nur seine lokale Pruefung nicht.
    verifyState = VERIFY_STATE_GHOST
    cnnStatus = VERIFY_STATE_GHOST
    cnnConflicts = conflicts
    note = noteText
}

/** EVERY half-move, each on its predecessors' board: with two only, a three-ply exchange dropped the third
 *  origin and committed while the model read a piece there. */
private fun touchedMask(
    boardSnap: Game,
    moves: List<Move>,
): Long {
    val board = boardSnap.copy()
    var mask = 0L
    for (mv in moves) {
        mask = mask or moveTouchedMask(board, mv)
        board.push(mv)
    }
    return mask
}

private fun confidentMask(
    obs: CnnObservation,
    thr: Double,
): Long {
    var mask = 0L
    for (i in 0 until Squares.COUNT) {
        if (obs.confident(Squares.ALL[i], thr)) mask = mask.with(i)
    }
    return mask
}

/** `~` marks a square under the confidence threshold: there the colour axis is silent. */
private fun colourTrace(
    obs: CnnObservation,
    afterBoard: Game,
    touched: Long,
    checked: Long,
): String {
    val parts = ArrayList<String>()
    touched.forEachSquare { i ->
        val name = Squares.ALL[i]
        val want = afterBoard.pieceCharAt(i)?.toString() ?: "-"
        val sure = if (checked.has(i)) "" else "~"
        parts += "$name$sure want=$want read=${obs.label(name) ?: "?"}@${(obs.conf(name) * PERCENT).toInt()}"
    }
    return "colour[${parts.joinToString(" ")}]"
}

/** Die zweite Achse neben [pairAgreement]: `f3e5 c6e5` und `f3e5 c6d4` trennt allein die Farbe auf e5. */
private fun pairColourConflicts(
    obs: CnnObservation,
    afterBoard: Game,
    checked: Long,
    thr: Double,
): List<String> {
    val out = ArrayList<String>()
    checked.forEachSquare { i ->
        val name = Squares.ALL[i]
        val want = afterBoard.pieceCharAt(i) ?: return@forEachSquare
        val label = obs.label(name)
        // Sicher LEER, wo das Paar eine Figur behauptet, ist der schaerfste Widerspruch (Belegtheit); die FARBE ist
        // die schwaechste Achse und zaehlt nur label-konfident.
        when {
            !obs.occupied(name) -> out += name
            label != null && obs.labelConfident(name, thr) && label.startsWith("w") != want.isUpperCase() -> out += name
        }
    }
    return out
}

private fun pairAgreement(
    obs: CnnObservation,
    afterBoard: Game,
    checked: Long,
): Double {
    val n = checked.countOneBits()
    if (n < MIN_CHECKED_FOR_AGREEMENT) return 0.0
    var hits = 0
    checked.forEachSquare { i ->
        if (obs.occupied(Squares.ALL[i]) == (afterBoard.pieceCharAt(i) != null)) hits++
    }
    return hits.toDouble() / n
}

private fun pairKey(moves: List<Move>): String = moves.joinToString(" ") { uciOf(it) }

private const val PERCENT = 100

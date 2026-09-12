package com.chesslab.engine

import com.chesslab.engine.api.CnnEvaluator
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.ResyncResult
import com.chesslab.engine.api.TrackerEvent
import com.github.bhlangonijr.chesslib.move.Move

private const val CNN_STATUS_OK = "ok"

/** Vote keys of the two vote-gated terminals. */
private const val OUTCOME_SHADOW = "shadow"

private const val OUTCOME_COMMIT = "commit"

private const val OUTCOME_COLOUR = "colour"

/**
 * A real local majority: below this many confident touched squares the agreement is 0.0, never "the
 * fraction of what we have" — two lucky squares must not reach `cnnMinAgreement`.
 */
private const val MIN_CHECKED_FOR_AGREEMENT = 3

/**
 * Occupancy verify of a PAIR candidate (fast play: half-move + reply); upstream guards ran in
 * `VerifySingle`. A conflict that already existed against the CURRENT position cannot discriminate
 * "moved" from "did not move" and must not veto — the all-or-nothing match before it livelocked.
 */
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
        // The LOCAL axis: only the squares the pair physically changes, so a stale misread
        // elsewhere is irrelevant. `nConf` is the WHOLE board — the two are not interchangeable.
        val touched = touchedMask(boardSnap, moves)
        val checked = touched and conf
        val pairAgree = pairAgreement(obs, afterBoard, checked)
        val wrongColour = pairColourConflicts(obs, afterBoard, checked, cnn.confThr)
        val nConf = conf.countOneBits()

        state.cnnAgreement = after.agreement
        val pend = state.pending
        // Only the base-truth FEN can still have moved on while the CNN calls ran.
        if (pend == null || state.board.fen() != pend.fen) return emptyList()
        pend.frames++
        pend.lastTickS = state.nowS
        // Same rule as the single ladder: inside the motion hold no verdict until both moves'
        // squares were SEEN settled — `a5` was a pair commit under the hand (233929, 2026-09-13).
        if (state.nowS < state.refHoldUntil && !state.sightSettled(boardSnap, moves)) {
            state.note = "early: waiting to see the pair settled (${state.sights.size} sights)"
            return emptyList()
        }
        return when {
            before.match && nConf >= cnn.minConfidentBoard -> state.acceptShadow(pend)
            // Vor jeder Annahme: ein Farbwiderspruch auf einem sicher gelesenen Feld heisst, dass
            // die Stellung NACH dem Paar eine andere waere — dann ist es nicht dieses Paar.
            wrongColour.isNotEmpty() -> state.colourReject(moves, wrongColour)
            (after.match && nConf >= cnn.minConfidentBoard) || pairAgree >= cnn.minAgreement ->
                if (state.pendingVoted(OUTCOME_COMMIT, COMMIT_VOTES)) {
                    state.commitPair(pend, DECIDER_CNN_PAIR)
                } else {
                    emptyList()
                }
            pend.frames >= state.config.verifyWindow || state.verifyExpired(pend) ->
                state.pairWindowEnd(moves, pend, state.pairReadable(checked, touched), before, after)
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

/**
 * Rung 1 — the board still matches the CURRENT position on plenty of confident squares, so nothing
 * moved. `minConfidentBoard` in the caller is the blind-glance guard: under a hand `resyncCheck`
 * matches VACUOUSLY and a near-blind glance would re-anchor the reference onto the covered image.
 */
private fun EngineState.acceptShadow(pend: PendingVerify): List<TrackerEvent> {
    if (!pendingVoted(OUTCOME_SHADOW, config.verifyObsVotes)) return emptyList()
    recordRejection(pend.ucis.joinToString(" "), "$VERIFY_STATE_SHADOW — Shadow/no move (CNN: board unchanged)", foldConsecutive = false)
    pending = null
    confirmer.reset()
    // also resets the recovery confirmer
    clearStuck()
    // Invariant 5: the verify path anchors on the averaged frame the candidate was raised from.
    setRef(pend.cur, pend.curBgr, fromCommit = true)
    verifyState = VERIFY_STATE_SHADOW
    cnnStatus = VERIFY_STATE_SHADOW
    cnnConflicts = emptyList()
    note = "Shadow/no move (CNN: board unchanged)"
    return emptyList()
}

/**
 * Rung 2 / the window-end accept; `commitSequence` sets `verifyState`. Ueber [applyVerdict], damit
 * `pending` VOR den Zeilen faellt: sonst erbte jede Ebene des Paars `pend.voteOutcome`, wo genau eine
 * ihn tragen soll (`Commit.recordDecision`).
 */
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

/**
 * Rung 3 — the window is up, NOT vote-gated: the window itself is the damping. Post-move conflicts
 * that all pre-existed are chronic misreads and cannot discriminate, so the diff evidence stands; a
 * touched square that was never readable is an occlusion timeout — never auto-accept under a hand.
 */
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

/**
 * Drop the candidate; base truth stays where it is. Protokolliert wie `VerifySingle.reject`: eine
 * still verworfene Hypothese ist von einer nie gesehenen nicht zu unterscheiden.
 */
private fun EngineState.rejectPair(
    key: String,
    noteText: String,
    conflicts: List<String>,
) {
    recordRejection(key, "$VERIFY_STATE_GHOST — $noteText", foldConsecutive = false)
    pending = null
    confirmer.reset()
    // NICHT `recoveryConfirmer.reset()`, wie in `VerifySingle.reject`: diese Ablehnung sagt nur,
    // dass das Paar seine lokale Pruefung nicht bestand, nichts ueber den Brett-Vote.
    verifyState = VERIFY_STATE_GHOST
    cnnStatus = VERIFY_STATE_GHOST
    cnnConflicts = conflicts
    note = noteText
}

/**
 * The squares EVERY half-move touches, each on the board its predecessors created. All plies, not
 * two: a three-ply exchange (`FAST_PLIES`) dropped the third move's origin from `checked` and the
 * local arm committed it while the model read a piece there.
 */
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

/**
 * Was das Modell auf den beruehrten Feldern liest, gegen das, was das Paar dort behauptet. `~` markiert
 * ein Feld unter der Konfidenzschwelle, das aus [checked] faellt — dort schweigt die Farbachse.
 */
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

/**
 * Beruehrte Felder, deren GRUPPE der Stellung nach beiden Halbzuegen widerspricht — die zweite Achse
 * neben [pairAgreement]: `f3e5 c6e5` und `f3e5 c6d4` sind ueber Belegtheit ununterscheidbar, getrennt
 * allein durch die Farbe auf e5 (2026-08-30 live das falsche committet, `TODO.md` Doppelschlag).
 */
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
        // Sicher LEER, wo das Paar eine Figur behauptet, ist der schaerfste Widerspruch — und er
        // liegt auf der Belegtheitsachse, die [checked] schon sicher gelesen hat. Die FARBE dagegen
        // ist die schwaechste Achse des Modells und zaehlt nur label-konfident.
        when {
            !obs.occupied(name) -> out += name
            label != null && obs.labelConfident(name, thr) && label.startsWith("w") != want.isUpperCase() -> out += name
        }
    }
    return out
}

/** Occupancy agreement of the confident touched squares with the position after BOTH half-moves. */
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

/** Konfidenz als ganze Prozent — zwei Nachkommastellen sind in einer Logzeile Rauschen. */
private const val PERCENT = 100

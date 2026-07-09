package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.Decision
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerEvent
import com.github.bhlangonijr.chesslib.move.Move

/** A confirmed candidate parked for safeguard verification (ports tracker.py `self._pending`). */
internal class PendingVerify(
    val ucis: List<String>,
    val fen: String,
    val curGray: GrayImage,
    val curBgr: BgrImage?,
    val priorUsed: Boolean,
)

/** A promotion waiting for the user's piece choice (ports tracker.py `self._promo_pending`). */
internal class PromoPending(
    val fromSquare: String,
    val toSquare: String,
    val curGray: GrayImage,
    val curBgr: BgrImage?,
    val fen: String,
)

/**
 * All mutable detection state of one tracker session. Invariant (tracker.py:1696): the base
 * truth is the (reference image, FEN) pair — [setRef] is the only place both are written.
 */
internal class EngineState {
    var game = Game()
    val noise = SquareNoise()
    var refGray: GrayImage? = null
    var refBgr: BgrImage? = null
    var refFen: String? = null
    var refCensus: ByteArray? = null
    var state = "init"
    val history = mutableListOf<String>()
    var lastMove: String? = null
    var note = ""
    var stuckReason: String? = null
    var stuckCount = 0
    var motion = 0.0
    var motionSinceRef = false
    var lastMotionTs = 0.0
    var holdUntil = 0.0
    var stableCount = 0
    var bestScore = 0.0
    var secondScore = 0.0
    var candidateUci: String? = null
    var priorLast = false
    var changed: List<String> = emptyList()
    var changedVals: List<Pair<String, Double>> = emptyList()
    var shadowVetoed: List<String> = emptyList()
    var occludedVetoed: List<String> = emptyList()
    val occlusionExpiry = mutableMapOf<String, Double>()
    var motionOccluded: Set<String> = emptySet()
    val tainted = mutableMapOf<String, Double>()
    var pending: PendingVerify? = null
    var promoPending: PromoPending? = null
    var lastDecision: Decision? = null

    fun markStuck(reason: String) {
        stuckCount = if (stuckReason == reason) stuckCount + 1 else 1
        stuckReason = reason
    }

    fun clearStuck() {
        stuckReason = null
        stuckCount = 0
    }

    /** Set base truth as (image, FEN) pair; requires new motion before the next commit. */
    fun setRef(
        curGray: GrayImage,
        curBgr: BgrImage?,
    ) {
        refGray = curGray
        if (curBgr != null) refBgr = curBgr
        refFen = game.fen()
        refCensus = null
        motionSinceRef = false
    }

    fun invalidateRef() {
        refGray = null
        refBgr = null
        refFen = null
        refCensus = null
    }

    /** Provenance snapshot of the evidence behind a decision (ports tracker.py:1777). */
    fun buildDecision(
        decider: String,
        priorUsed: Boolean,
    ): Decision =
        Decision(
            decider = decider,
            reason = decider + if (priorUsed) " + prior tie-break" else "",
            best = bestScore,
            second = secondScore,
            margin = bestScore - secondScore,
            changed = changed,
            shadowVeto = shadowVetoed,
            occluded = occludedVetoed,
            priorUsed = priorUsed,
        )

    /**
     * Apply a confirmed move (or fast-play sequence) and anchor the new base truth on the
     * decision frame (ports tracker.py:1733 `_commit_move` / :1613 `_commit_sequence`).
     */
    fun commit(
        moves: List<Move>,
        frame: Pair<GrayImage, BgrImage?>,
        decided: Pair<String, Boolean>,
        events: MutableList<TrackerEvent>,
    ) {
        val (decider, priorUsed) = decided
        val sans = game.sanSequence(moves)
        val decision = buildDecision(decider, priorUsed)
        for ((i, mv) in moves.withIndex()) {
            game.push(mv)
            history.add(sans[i])
            events.add(TrackerEvent.MoveCommitted(sans[i], game.fen(), decision))
        }
        lastMove = uciOf(moves.last())
        lastDecision = decision
        setRef(frame.first, frame.second)
        state = "move"
        clearStuck()
        pending = null
        promoPending = null
        priorLast = priorUsed
        note = "Move detected: ${sans.joinToString(" + ")}" +
            (if (priorUsed) " (decided by prior — undo if needed)" else "")
        if (game.result().checkmate) note += " — Checkmate!"
    }
}

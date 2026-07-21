package com.chesslab.engine

import com.chesslab.engine.api.AlarmState
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
    val seq: Int = 0,
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

    // Structural evidence channel: census change z-scored by its own noise model.
    // init_std 8 (not the gray channel's 6): flat empty squares produce census tie-flip
    // noise from frame one (sensor noise + CLAHE); starting wide keeps the channel quiet
    // right after a baseline until the model has SEEN each square (slow lane converges
    // within seconds; floor 2.5 keeps sensitivity — ports tracker.py census_noise).
    val censusNoise = SquareNoise(initStd = CENSUS_INIT_STD, stdFloor = CENSUS_STD_FLOOR)
    var refGray: GrayImage? = null
    var refBgr: BgrImage? = null
    var refFen: String? = null
    var refCensus: ByteArray? = null
    private var refGamutMemo: OcclusionGamut.Gamut? = null
    private var refGamutPending = false

    // Census codes of the newest CURRENT frame (identity-keyed): a quiet re-anchor promotes
    // exactly that frame to reference, so its codes become refCensus for free (2026-07-22).
    private var curCensusFor: GrayImage? = null
    private var curCensusCodes: ByteArray? = null
    var state = "init"
    val history = mutableListOf<String>()
    val uciHistory = mutableListOf<String>()
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
    var structVals: List<Pair<String, Double>> = emptyList()
    var shadowVetoed: List<String> = emptyList()

    /** Candidate UCIs rejected because a destination square was shadow-vetoed (debug). */
    var shadowBlocked: List<String> = emptyList()
    var occludedVetoed: List<String> = emptyList()
    val occlusionExpiry = mutableMapOf<String, Double>()

    /** RAW (undilated) occluded core keep-alive — the occluded-state gate counts THIS set. */
    val occlCoreExpiry = mutableMapOf<String, Double>()
    var motionOccluded: Set<String> = emptySet()
    val tainted = mutableMapOf<String, Double>()
    var pending: PendingVerify? = null
    var promoPending: PromoPending? = null
    var lastDecision: Decision? = null

    /** Illegal-move desync alarm — blocks all commits and re-anchors while set. */
    var alarm: AlarmState? = null

    /** Frame seq of the newest processed frame (seq contract, Spec 11). */
    var frameSeq: Int = 0

    /** Monotonic identity of the visual reference, used by Android to couple warp geometry to it. */
    var referenceVersion: Long = 0
        private set

    /** Occluded-dominant squares of the last safeguard observation (resting-hand veto). */
    var cnnOccluded: Set<String> = emptySet()

    /** Engine-time the last safeguard observation was captured (negative = never). */
    var cnnOccludedTsS: Double = Double.NEGATIVE_INFINITY

    /**
     * Squares where a CONFIDENT safeguard read disagrees with the believed occupancy of the
     * CURRENT game state (quiet re-anchor veto, ports 21cf63c). Cleared with [setRef] — a new
     * (reference, FEN) pair invalidates conflicts computed against the previous position.
     */
    var cnnOccupancyConflicts: Set<String> = emptySet()

    /** Engine-time the conflict observation was captured (negative = never). */
    var cnnConflictsTsS: Double = Double.NEGATIVE_INFINITY

    /** Census codes of the current reference, cached (ports tracker.py `_ref_census_codes`). */
    fun refCensusCodes(): ByteArray = refCensus ?: Census.transform(refGray!!).also { refCensus = it }

    /** Remember the census codes of [cur] so a re-anchor on the same frame reuses them. */
    fun cacheCurCensus(
        cur: GrayImage,
        codes: ByteArray,
    ) {
        curCensusFor = cur
        curCensusCodes = codes
    }

    /** The reference was patched in place: all census caches keyed on it are stale. */
    fun onRefPatched() {
        refCensus = null
        curCensusFor = null
        curCensusCodes = null
    }

    /**
     * Color gamut of the reference board, built LAZILY on first use (only motion/occlusion
     * frames consume it) — the eager build on every quiet re-anchor cost ~14 ms/frame
     * on-device for a result that idle frames never read (2026-07-22). [setRef] materializes
     * a pending build before the reference it belongs to is replaced or patched, so the
     * produced gamut is identical to the former eager build in all paths.
     */
    fun refGamut(): OcclusionGamut.Gamut? {
        if (refGamutPending) {
            refGamutPending = false
            val bgr = refBgr
            val gray = refGray
            refGamutMemo =
                if (bgr != null && gray != null) {
                    EnginePerf.stage("gamut") { OcclusionGamut.boardColorGamut(bgr, BoardGeometry(gray.width)) }
                } else {
                    null
                }
        }
        return refGamutMemo
    }

    fun markStuck(reason: String) {
        stuckCount = if (stuckReason == reason) stuckCount + 1 else 1
        stuckReason = reason
    }

    fun clearStuck() {
        stuckReason = null
        stuckCount = 0
    }

    /**
     * Set base truth as (image, FEN) pair; requires new motion before the next commit.
     * A quiet re-anchor (`fromCommit=false`) is a verifiably clean board: (re)build the color
     * gamut the baseline occlusion classifier uses to tell flat hands from cast shadows
     * (ports tracker.py `_set_ref` gamut rebuild, b3d3825).
     */
    fun setRef(
        curGray: GrayImage,
        curBgr: BgrImage?,
        fromCommit: Boolean = false,
    ) {
        // A commit keeps the previous quiet-anchor gamut: materialize a still-pending build
        // from the OLD reference before that reference is replaced below (lazy == eager).
        if (fromCommit) refGamut()
        refGray = curGray
        if (curBgr != null) {
            refBgr = curBgr
            if (!fromCommit) {
                refGamutMemo = null
                refGamutPending = true
            }
        }
        refFen = game.fen()
        referenceVersion++
        // A quiet re-anchor promotes the frame whose census codes were just computed for
        // detection — reuse them instead of re-encoding the new reference next frame.
        refCensus = if (curGray === curCensusFor) curCensusCodes else null
        motionSinceRef = false
        // A new base truth invalidates conflicts computed against the previous pairing
        // (covers commit, quiet re-anchor, and CNN resync in one place).
        cnnOccupancyConflicts = emptySet()
        cnnConflictsTsS = Double.NEGATIVE_INFINITY
    }

    fun invalidateRef() {
        refGray = null
        refBgr = null
        refFen = null
        refCensus = null
        refGamutMemo = null
        refGamutPending = false
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
            uciHistory.add(uciOf(mv))
            events.add(TrackerEvent.MoveCommitted(sans[i], game.fen(), decision))
        }
        lastMove = uciOf(moves.last())
        lastDecision = decision
        setRef(frame.first, frame.second, fromCommit = true)
        state = "move"
        clearStuck()
        pending = null
        promoPending = null
        priorLast = priorUsed
        note = "Move detected: ${sans.joinToString(" + ")}" +
            (if (priorUsed) " (decided by prior — undo if needed)" else "")
        if (game.result().checkmate) note += " — Checkmate!"
    }

    private companion object {
        const val CENSUS_INIT_STD = 8.0
        const val CENSUS_STD_FLOOR = 2.5
    }
}

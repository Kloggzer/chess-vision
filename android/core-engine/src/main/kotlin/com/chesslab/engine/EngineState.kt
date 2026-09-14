package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEvent

/**
 * The ONE mutable state object of the engine — everything that survives between frames. Plain
 * `var`s: exactly one thread drives `:core-engine`, so no `synchronized`, no `Atomic*`, no `Mutex`
 * and no `@Volatile` anywhere (entry.md hard rule 2). **Binding:** [nowS] is the only clock.
 */
internal class EngineState(
    // live-tunable
    var config: TrackerConfig,
    startFen: String = STARTPOS,
    val whitePov: Boolean = true,
    /** Every decision row, the moment it is recorded. See [DecisionLog]. */
    private val decisionSink: (DebugDecision) -> Unit = {},
) {
    // -- clock ------------------------------------------------------------------------------------

    /** The engine's only clock; set once per frame by [FrameLoop.step] from the frame timestamp. */
    var nowS: Double = 0.0

    // -- base truth (image, FEN) pair ------------------------------------------------------------

    var refGray: GrayImage? = null
    var refBgr: BgrImage? = null
    var refFen: String? = null
    var refCorners: FloatArray? = null
    var lastCorners: FloatArray? = null

    private var gamutValue: ColorGamut? = null
    private var gamutPending: BgrImage? = null

    /**
     * **Built on read, not on write.** The quiet re-anchor fires on every stable frame and each
     * rebuild is a full BGR->Lab plus BGR->HSV pass (88 ms of a 247 ms phone frame) while the only
     * consumer reads it in `moving`/`occluded`; [markGamutStale] pins the plane, so it stays exact.
     */
    var refGamut: ColorGamut?
        get() {
            gamutPending?.let {
                gamutValue = buildGamut(it)
                gamutPending = null
            }
            return gamutValue
        }
        set(value) {
            gamutValue = value
            gamutPending = null
        }

    /** The quiet re-anchor's half of [refGamut]: remember the plane, pay for it only if read. */
    fun markGamutStale(bgr: BgrImage) {
        gamutPending = bgr
    }

    /**
     * A baseline from a previous detection plane is not comparable with the next frame. The pending
     * candidate goes with it: verified against the OLD geometry, a yes would anchor `pend.cur` as the
     * reference, paired with the current corners where `cornersJumped` cannot see it.
     */
    fun discardVisualReference() {
        refGray = null
        refBgr = null
        refFen = null
        refCorners = null
        refGamut = null
        refCensus = null
        refCensusFor = null
        curCensus = null
        curCensusFor = null
        grayBuf.clear()
        bgrBuf.clear()
        cnnSnap = null
        pending = null
        promoPending = null
        verifyState = null
        confirmer.reset()
        state = STATE_WAITING
    }

    /** Cached census codes of [refGray]. */
    var refCensus: ByteArray? = null

    /** IDENTITY key of [refCensus] — identity, never equality. */
    var refCensusFor: GrayImage? = null

    /** The codes `computeEvidence` derived for the current frame, and their IDENTITY key. */
    var curCensus: ByteArray? = null
    var curCensusFor: GrayImage? = null

    // -- frame loop -------------------------------------------------------------------------------

    var frameSeq: Long = 0

    /** The previous frame's `FrameInput.seq`; invariant 14 — a frame is never delivered twice. */
    var lastInputSeq: Long = -1

    var prevGray: GrayImage? = null

    // Declared before the averaging buffers: [avgFrames] is CNN-conditional, so they are sized from it.
    var cnnRun: Boolean = false

    // The window the buffers are sized for. Tracked so a CNN attach resizes them too, not only a
    // config change — otherwise the loop waited for a third frame the mean never needed.
    private var avgWindow: Int = avgFrames
    val grayBuf: RunningMeanGray = RunningMeanGray(avgWindow)
    val bgrBuf: RunningMeanBgr = RunningMeanBgr(avgWindow)

    /** No-op when the window did not move; a resize drops what is buffered. */
    fun syncAvgWindow() {
        val want = avgFrames
        if (want == avgWindow) return
        avgWindow = want
        grayBuf.resize(want)
        bgrBuf.resize(want)
    }

    var stableCount: Int = 0
    var lastFrameGate: String? = null
    var holdUntil: Double = 0.0
    var lastCur: GrayImage? = null
    var lastCurBgr: BgrImage? = null
    var state: String = STATE_WAITING // waiting | moving | occluded | move

    // Zaehlt STELLUNGSWECHSEL, nicht Bewegungsereignisse — am Bewegungsbeginn gezaehlt waren es
    // 14x so viele (Haende, Schatten); `ready` entprellt ueber settleFrames + motionHoldS.
    var motionEpoch: Long = 0
    var lastEvalEpoch: Long = -1
    var restSettled: Boolean = false
    var motion: Double = 0.0
    var lastMotionTs: Double = 0.0

    /** The full motion hold; `holdUntil` may open detection earlier (`commitHoldS`). */
    var refHoldUntil: Double = 0.0

    /** > 0: the reference came from an early commit and is re-captured at this time. */
    var refProvisionalUntil: Double = 0.0

    /**
     * A commit that only `commitHoldS` makes possible: the motion hold has not run out AND the
     * commit hold is the shorter one. At defaults this is never true, so the evidence gates in
     * VerifySingle/VerifyPair leave the default behaviour bytewise alone (2026-09-13).
     */
    val earlyCommit: Boolean
        get() = (config.commitHoldS ?: config.motionHoldS) < config.motionHoldS && nowS < refHoldUntil
    var motionSinceRef: Boolean = false
    var occlGridActive: Boolean = false
    var gridCoverage: Double = 1.0
    var fps: Double = 0.0
    var lastLoopTs: Double = 0.0

    /**
     * Per-stage wall time in ms. The engine NEVER writes a measured duration in here: measuring one
     * would need a wall clock, which this module must not have. `:app` fills it from outside.
     */
    val stageTimingsMs: MutableMap<String, Double> = mutableMapOf()

    // -- occlusion / taint --------------------------------------------------------------------------

    /**
     * Expiry timestamp of the DILATED occlusion keep-alive, per square. An untouched slot is `0.0`,
     * which is always in the past, so there is no separate latch mask and nothing to prune.
     */
    val occlusionExpiry = DoubleArray(Squares.COUNT)

    /** The RAW UNDILATED core; the `>2 -> occluded` gate counts THIS. */
    val occlCoreExpiry = DoubleArray(Squares.COUNT)

    var motionOccluded: Long = 0L

    /**
     * The LATCHED squares. Unlike the expiry-only sets above this needs its own mask: a taint
     * outlives its timer until the release rule in `Taint.kt` fires.
     */
    var tainted: Long = 0L

    /** The subset of [tainted] that came from the motion keep-alive, not from a resting hand. */
    var keepaliveTainted: Long = 0L

    /** Expiry timestamp per tainted square; only meaningful for squares set in [tainted]. */
    val taintExpiry = DoubleArray(Squares.COUNT)

    var occludedVetoed: Long = 0L
    var shadowVetoed: Long = 0L

    /** Candidate ucis rejected because their destination was vetoed. */
    val shadowBlocked: MutableList<String> = mutableListOf()

    // -- evidence -----------------------------------------------------------------------------------

    val noise: SquareNoise = SquareNoise() // the GRAY lane

    /** The CENSUS lane; the two lanes must never be unified. */
    val censusNoise: SquareNoise =
        SquareNoise(initStd = CENSUS_NOISE_INIT_STD, stdFloor = CENSUS_NOISE_STD_FLOOR)

    /**
     * The RAW census channel, the shadow veto's threshold input (invariant 8). Points at
     * [censValues] while the channel ran this frame, `null` otherwise.
     */
    var censRaw: DoubleArray? = null

    /** normalized gray channel — noise learning and the status heatmap read it too. */
    val lastDiffs = DoubleArray(Squares.COUNT)

    /** normalized census channel, or `null` when the channel was off / dropped this frame. */
    var lastCens: DoubleArray? = null

    /** fused z — the one evidence array every gate and the LL scoring read. */
    val lastZ = DoubleArray(Squares.COUNT)

    // Per-frame evidence scratch, owned per engine so two engines can never alias each other.
    val diffRaw = DoubleArray(Squares.COUNT)
    val zGray = DoubleArray(Squares.COUNT)
    val censValues = DoubleArray(Squares.COUNT)
    val censNorm = DoubleArray(Squares.COUNT)
    val zCensus = DoubleArray(Squares.COUNT)

    // The same policy, for the three pixel stages whose scratch used to live at FILE scope — roughly
    // 11.5 MB of it, shared by every engine in the process.
    val baselineScratch = BaselineScratch()
    val shadowVetoScratch = ShadowVetoScratch()
    val gamutScratch = GamutScratch()

    var changed: Long = 0L
    var changedVals: List<Pair<String, Double>> = emptyList() // top 8

    // -- scoring / hypothesis -----------------------------------------------------------------------

    var bestScore: Double = 0.0
    var secondScore: Double = 0.0
    var candidateUci: String? = null

    // -- game state ---------------------------------------------------------------------------------

    /**
     * The [Game] wrapper, NOT a raw chesslib `Board`: `Game.fen()` is `getFen(true, true)`, the only
     * spelling that matches python-chess.
     */
    var board: Game = Game(startFen)

    val history: MutableList<String> = mutableListOf() // SAN
    var lastMove: String? = null // uci

    /**
     * How many plies the LAST commit pushed; what `undo` takes back (the four-ply bridge of
     * 2026-08-02 used to need four presses). A count, not a record, so it cannot drift out of step
     * with the history, and `undo` bounds it by `history.size` — a stale value after `setFen` is inert.
     */
    var lastCommitSize: Int = 0

    /** The FEN `undo` last returned to — the engine's only memory of a human rejection ([recoveryHeld]). */
    var takenBack: String? = null

    var note: String? = null
    var priorLast: Boolean = false
    var recoveredLast: Boolean = false

    // -- pending / promotion / confirmation ----------------------------------------------------------

    var pending: PendingVerify? = null
    var promoPending: PromoPending? = null
    var verifyState: String? = null // null | "verifying" | "confirmed" | "ghost"

    /**
     * Der Spruch der Verify-Leiter, der das Loeschen von [pending] ueberlebt. Ohne ihn trug
     * ausgerechnet die Zeile, die der Leiter entschied, `verify=` leer, und leer hiess zweierlei:
     * 205 leere Zeilen lasen sich als "der Verifier haengt" statt als "nie gefragt".
     */
    var verdictOutcome: String? = null

    /**
     * The window both confirmers are currently built for — the same defect [avgWindow] had. The CNN
     * attaches asynchronously and `cnnVerify` is live-tunable, so a confirmer built for
     * `cnnOn = false` (2) stayed unreconciled while the live gate ([confirmFrames]) already read 1.
     */
    private var confirmWindow: Int = confirmFrames

    var confirmer: Confirmer = Confirmer(confirmWindow)

    /** The recovery-commit voting confirmer (specs/39 02). */
    var recoveryConfirmer: Confirmer = Confirmer(maxOf(RECOVERY_MIN_VOTES, confirmWindow))

    /** The threshold [recoveryConfirmer] is built for, so the status note prints the right one. */
    val recoveryVotes: Int get() = maxOf(RECOVERY_MIN_VOTES, confirmFrames)

    /**
     * The `seq` of the last snapshot the recovery confirmer counted — one snapshot, one vote.
     * Distinct arrivals carry distinct seqs by construction, but a defence does not assume that.
     */
    var lastRecoveryVoteSeq: Long = -1L

    /** specs/37-02 auto-resync: the candidate FEN the consecutive looks agree on, and how many. */
    var resyncFen: String? = null
    var resyncVotes: Int = 0

    /** One snapshot, one resync vote — the [lastRecoveryVoteSeq] pattern, its own ledger. */
    var lastResyncVoteSeq: Long = -1L

    /**
     * Rebuild both confirmers when [confirmFrames] moved. A rebuild DROPS the in-flight streak,
     * which is why this is a no-op when the window did not move; when it did move, dropping is
     * correct — a streak counted towards two confirmations means nothing once one is required.
     */
    fun syncConfirmWindow() {
        val want = confirmFrames
        if (want == confirmWindow) return
        confirmWindow = want
        confirmer = Confirmer(want)
        recoveryConfirmer = Confirmer(maxOf(RECOVERY_MIN_VOTES, want))
    }

    // -- stuck / anomaly -------------------------------------------------------------------------------

    var stuckReason: String? = null
    var stuckCount: Int = 0

    // Derselbe Kandidat, wieder und wieder am Evidenzboden abgewiesen. Zaehlt REPEATS, wie
    // `stuckCount` — nur ueberlebt dieser das Flattern, weil er an der Ablehnung haengt.
    var refusedKey: String? = null
    var refusedStreak: Int = 0

    /** The pair verify rejected in THIS position (`rejectedPairFen`): never re-proposed, the single gets its turn. */
    var rejectedPair: String? = null
    var rejectedPairFen: String? = null

    /** Squares persistently changed but unexplained, and since when. */
    var anomalySince: Long = 0L

    val anomalyStart = DoubleArray(Squares.COUNT)

    // -- CNN coupling ------------------------------------------------------------------------------------

    var cnnSnap: CnnSnapshot? = null

    /** The last few observations as bitboards: which squares were seen, and what they showed. */
    val sights = ArrayDeque<SquareSight>()

    var lastCnnTs: Double = 0.0 // recovery-observation cooldown anchor
    var cnnStatus: String? = null // null | "ok" | "mismatch"
    var cnnConflicts: List<String> = emptyList()
    var cnnAgreement: Double = 0.0

    /**
     * How many CNN reads were taken, and how many were thrown away as stale. [cnnAgreement] alone
     * cannot be read: 0.0 means "disagreed everywhere", "never asked" and "asked, but the board moved
     * on" alike — three faults, one number. Taken counts actual evaluations; stale counts snapshots
     * rejected before evaluation because their FEN no longer matches.
     */
    var cnnReadsTaken: Long = 0L

    var cnnReadsStale: Long = 0L

    /**
     * Where every CNN snapshot went, because `cnnReads=0` has four possible causes: no snapshot at
     * all, a pending candidate routing it to `VerifySingle`, `cnn == null`, or `evaluationDue()`
     * turning it away. Which of the four gates closed is four different investigations.
     */
    var cnnSnapsSeen: Long = 0L

    var cnnSnapsToVerify: Long = 0L

    var cnnSnapsNoEvaluator: Long = 0L

    var cnnSnapsNotDue: Long = 0L
    var cnnBestMove: String? = null

    /** The latch. Non-null freezes noise learning and blocks every commit (invariant 9). */
    var alarm: TrackerEvent.Alarm? = null

    /** Kept separately because the seam's `Alarm` carries no timestamp. */
    var alarmSince: Double = 0.0

    var desyncObs: Int = 0 // consecutive desync observations
    var desyncConflicts: Long = 0L // the stable conflict set of the streak

    /** Last observation seq counted (dedup). */
    var desyncLastSeq: Long? = null

    /** Wall time the current streak started; the held-for note reads it. */
    var desyncSince: Double = 0.0

    // -- provenance -----------------------------------------------------------------------------------

    // Ring-capped (see DecisionLog); the list contract is unchanged.
    val decisionLog: MutableList<DecisionRecord> = DecisionLog(sink = { decisionSink(it.toDebugDecision()) })
    var pendingCapture: PendingCapture? = null

    // -- derived geometry (cached, rebuilt on a detSize / overhang change) -----------------------------

    var detBoxes: SquareBoxes = squareBoxes(config.detSize, whitePov) // extendUp = 0.0

    /** The evidence boxes, `extendUp = config.overhang`. */
    var evidenceBoxes: SquareBoxes = squareBoxes(config.detSize, whitePov, config.overhang)

    /** Rebuild both box sets after `detSize` / `overhang` changed (live tuning). */
    fun rebuildBoxes() {
        detBoxes = squareBoxes(config.detSize, whitePov)
        evidenceBoxes = squareBoxes(config.detSize, whitePov, config.overhang)
    }

    // -- CNN-conditional derived knobs ----------------------------------------------------------------
    val cnnOn: Boolean get() = config.cnnVerify && cnnRun

    val settleFrames: Int get() = config.settleFrames(cnnOn)

    val avgFrames: Int get() = config.avgFrames(cnnOn)

    val confirmFrames: Int get() = config.confirmFrames(cnnOn)

    val detSize: Int get() = config.detSize
}

/**
 * The recovery confirmer's floor, whatever `confirmFrames` says: with `cnnOn` that is 1, so a
 * four-ply rewrite confirmed on the FIRST glance in every shipped configuration. The diff channel's
 * 1 is right for a candidate that passed the LL floor, the margin and the motion gate — this passes none.
 */
private const val RECOVERY_MIN_VOTES = 2

/** Tracker `state` values; `"move"` and `"occluded"` are the two that suppress detection. */
internal const val STATE_WAITING = "waiting"

internal const val STATE_MOVING = "moving"

internal const val STATE_OCCLUDED = "occluded"

internal const val STATE_MOVE = "move"

/**
 * A confirmed diff candidate awaiting CNN verification. [voteOutcome]/[voteCount] are the
 * multi-glance vote (entry.md invariant 13 — never act on one glance); [cur]/[curBgr] are the
 * AVERAGED frame the candidate was raised from and the verify path's only legal anchor (invariant 5).
 */
internal data class PendingVerify(
    val ucis: List<String>,
    val uci: String,
    val fen: String,
    val cur: GrayImage,
    val curBgr: BgrImage?,
    var frames: Int,
    val priorUsed: Boolean,
    val seq: Long,
    var voteOutcome: String? = null,
    var voteCount: Int = 0,
    /** `nowS` at dispatch and at the last tick — the two ends of [TrackerConfig.verifyTimeoutS]. */
    var startedS: Double = 0.0,
    var lastTickS: Double = 0.0,
)

/** Waits for the user's promotion answer. */
internal data class PromoPending(
    val from: String,
    val to: String,
    val cur: GrayImage,
    val curBgr: BgrImage?,
    val fen: String,
    var cnnPiece: Char? = null,
    var cnnVotes: Int = 0,
    var lastCnnSeq: Long = -1L,
    /** Distinct glances that read [to] confidently empty — the prompt's way out. */
    var emptyVotes: Int = 0,
)

/** The per-move provenance row. */
internal data class DecisionRecord(
    val tsS: Double,
    val ply: Int,
    val move: String?,
    val san: String?,
    val fenBefore: String?,
    val fenAfter: String,
    val decider: String,
    val reason: String,
    val priorUsed: Boolean,
    val bestScore: Double,
    val secondScore: Double,
    val margin: Double,
    val changed: List<String>,
    val changedVals: List<Pair<String, Double>>,
    val shadowVetoed: List<String>,
    val occludedVetoed: List<String>,
    val gridCoverage: Double,
    val zThr: Double,
    val motion: Double,
    val cnnRun: Boolean,
    val cnnAgreement: Double,
    /** Carried through to `DebugDecision`, where the reason they exist is written down. */
    val cnnReadsTaken: Long,
    val cnnReadsStale: Long,
    val cnnSnaps: Long,
    val cnnSnapsToVerify: Long,
    val cnnSnapsNoEvaluator: Long,
    val cnnSnapsNotDue: Long,
    val cnnBestMove: String?,
    // Defaulted so the existing construction sites keep their exact shape; `accepted = false` marks
    // a REJECTED candidate.
    val stuckReason: String? = null,
    val verifyOutcome: String? = null,
    val accepted: Boolean = true,
    val refProvisional: Boolean = false,
)

/** The deferred auto-labeled session photo. */
internal data class PendingCapture(
    val san: String,
    val fen: String,
)

/** One observation reduced to bitboards: visible = neither hand arm flagged the square. */
internal class SquareSight(
    val seq: Long,
    val visible: Long,
    val confident: Long,
    val occupied: Long,
    /** The position the observation was taken under; `null` = unscoped, for hand-built sights in tests. */
    val fen: String? = null,
)

internal const val SIGHT_DEPTH = 8

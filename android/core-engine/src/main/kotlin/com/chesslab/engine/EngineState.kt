package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEvent

/** The ONE mutable state object. Plain `var`s: exactly one thread drives `:core-engine`, so no
 *  `synchronized`, `Atomic*`, `Mutex` or `@Volatile` (entry.md hard rule 2). [nowS] is the only clock. */
internal class EngineState(
    var config: TrackerConfig,
    startFen: String = STARTPOS,
    val whitePov: Boolean = true,
    private val decisionSink: (DebugDecision) -> Unit = {},
) {
    /** Set once per frame by [FrameLoop.step] from the frame timestamp. */
    var nowS: Double = 0.0

    var refGray: GrayImage? = null
    var refBgr: BgrImage? = null
    var refFen: String? = null
    var refCorners: FloatArray? = null
    var lastCorners: FloatArray? = null

    private var gamutValue: ColorGamut? = null
    private var gamutPending: BgrImage? = null

    /** **Built on read**: the quiet re-anchor fires every stable frame, and a rebuild costs 88 ms of a 247 ms
     *  phone frame while only `moving`/`occluded` read it. [markGamutStale] pins the plane, so it stays exact. */
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

    fun markGamutStale(bgr: BgrImage) {
        gamutPending = bgr
    }

    /** The pending candidate goes too: verified against the OLD geometry, a yes would anchor `pend.cur` beside
     *  the current corners, where `cornersJumped` cannot see it. */
    fun discardVisualReference() {
        refGray = null
        refBgr = null
        refFen = null
        refCorners = null
        refGamut = null
        refProvisionalUntil = 0.0
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
        recoveryConfirmer.reset()
        // Ein gegen die alte Ebene gestarteter Zeitgeber waere gegen die erste neue Referenz sofort faellig.
        anomalySince = 0L
        state = STATE_WAITING
    }

    var refCensus: ByteArray? = null

    /** IDENTITY key — identity, never equality. */
    var refCensusFor: GrayImage? = null

    var curCensus: ByteArray? = null
    var curCensusFor: GrayImage? = null

    var frameSeq: Long = 0

    /** Invariant 14 — a frame is never delivered twice. */
    var lastInputSeq: Long = -1

    var prevGray: GrayImage? = null

    // Declared before the averaging buffers: [avgFrames] is CNN-conditional, so they are sized from it.
    var cnnRun: Boolean = false

    // Tracked so a CNN attach resizes the buffers too, not only a config change.
    private var avgWindow: Int = avgFrames
    val grayBuf: RunningMeanGray = RunningMeanGray(avgWindow)
    val bgrBuf: RunningMeanBgr = RunningMeanBgr(avgWindow)

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

    // Zaehlt STELLUNGSWECHSEL, nicht Bewegungsereignisse — am Bewegungsbeginn waren es 14x so viele.
    var motionEpoch: Long = 0
    var lastEvalEpoch: Long = -1
    var restSettled: Boolean = false
    var motion: Double = 0.0
    var lastMotionTs: Double = 0.0

    var refHoldUntil: Double = 0.0

    /** > 0: an early-commit reference, re-captured at this time. Cleared with the reference itself — surviving
     *  it, the next quiet frame overwrote a fresh baseline via `setRef(fromCommit = true)` (invariant 6). */
    var refProvisionalUntil: Double = 0.0

    /** LIVE at the shipped defaults (0,067 gegen 0,20), also sind die Beweis-Riegel in VerifySingle/VerifyPair scharf. */
    val earlyCommit: Boolean
        get() = (config.commitHoldS ?: config.motionHoldS) < config.motionHoldS && nowS < refHoldUntil
    var motionSinceRef: Boolean = false
    var occlGridActive: Boolean = false
    var gridCoverage: Double = 1.0
    var fps: Double = 0.0
    var lastLoopTs: Double = 0.0

    /** Never written by the engine: measuring needs a wall clock, which this module must not have. */
    val stageTimingsMs: MutableMap<String, Double> = mutableMapOf()

    /** An untouched slot is `0.0`, always in the past: no latch mask, nothing to prune. */
    val occlusionExpiry = DoubleArray(Squares.COUNT)

    /** The RAW UNDILATED core; the `>2 -> occluded` gate counts THIS. */
    val occlCoreExpiry = DoubleArray(Squares.COUNT)

    var motionOccluded: Long = 0L

    /** Its own mask: a taint outlives its timer until the release rule in `Taint.kt` fires. */
    var tainted: Long = 0L

    var keepaliveTainted: Long = 0L

    val taintExpiry = DoubleArray(Squares.COUNT)

    /** Aus `expiry - occluderHoldS` zurueckgerechnet wanderte der Beginn mit dem Regler. */
    val taintStart = DoubleArray(Squares.COUNT)

    var occludedVetoed: Long = 0L
    var shadowVetoed: Long = 0L

    val shadowBlocked: MutableList<String> = mutableListOf()

    val noise: SquareNoise = SquareNoise() // the GRAY lane

    /** The CENSUS lane; the two lanes must never be unified. */
    val censusNoise: SquareNoise =
        SquareNoise(initStd = CENSUS_NOISE_INIT_STD, stdFloor = CENSUS_NOISE_STD_FLOOR)

    /** The shadow veto's threshold input (invariant 8); `null` when the channel did not run this frame. */
    var censRaw: DoubleArray? = null

    val lastDiffs = DoubleArray(Squares.COUNT)

    /** `null` when the channel was off or dropped this frame. */
    var lastCens: DoubleArray? = null

    val lastZ = DoubleArray(Squares.COUNT)

    // Owned per engine, so two engines can never alias each other's scratch.
    val diffRaw = DoubleArray(Squares.COUNT)
    val zGray = DoubleArray(Squares.COUNT)
    val censValues = DoubleArray(Squares.COUNT)
    val censNorm = DoubleArray(Squares.COUNT)
    val zCensus = DoubleArray(Squares.COUNT)

    // The three pixel stages' scratch used to live at FILE scope — ~11.5 MB shared by every engine.
    val baselineScratch = BaselineScratch()
    val shadowVetoScratch = ShadowVetoScratch()
    val gamutScratch = GamutScratch()

    var changed: Long = 0L
    var changedVals: List<Pair<String, Double>> = emptyList() // top 8

    var bestScore: Double = 0.0
    var secondScore: Double = 0.0
    var candidateUci: String? = null

    /** [Game], NOT a raw chesslib `Board`: `Game.fen()` is the only spelling that matches python-chess. */
    var board: Game = Game(startFen)

    val history: MutableList<String> = mutableListOf() // SAN
    var lastMove: String? = null // uci

    /** A count, not a record, so it cannot drift from the history; `undo` bounds it by `history.size`. */
    var lastCommitSize: Int = 0

    /** The engine's only memory of a human rejection ([recoveryHeld]). */
    var takenBack: String? = null

    var note: String? = null
    var priorLast: Boolean = false
    var recoveredLast: Boolean = false

    var pending: PendingVerify? = null
    var promoPending: PromoPending? = null
    var verifyState: String? = null // null | "verifying" | "confirmed" | "ghost"

    /** Ueberlebt das Loeschen von [pending]: ohne ihn trug die Zeile, die die Leiter entschied, `verify=` leer —
     *  und leer hiess auch "nie gefragt". */
    var verdictOutcome: String? = null

    /** `applyVerdict` loescht `pending`, BEVOR `commitMove` seine Zeile schreibt. */
    var verdictShadowVetoed: Long? = null
    var verdictOccludedVetoed: Long? = null

    /** The CNN attaches asynchronously and `cnnVerify` is live: a confirmer built for `cnnOn = false` stayed
     *  unreconciled while [confirmFrames] already read 1. */
    private var confirmWindow: Int = confirmFrames

    var confirmer: Confirmer = Confirmer(confirmWindow)

    var recoveryConfirmer: Confirmer = Confirmer(maxOf(RECOVERY_MIN_VOTES, confirmWindow))

    val recoveryVotes: Int get() = maxOf(RECOVERY_MIN_VOTES, confirmFrames)

    /** One snapshot, one vote — a defence that does not assume distinct seqs. */
    var lastRecoveryVoteSeq: Long = -1L

    var resyncFen: String? = null
    var resyncVotes: Int = 0

    var lastResyncVoteSeq: Long = -1L

    /** A rebuild DROPS the streak, hence a no-op when the window did not move; when it did, a streak counted
     *  towards another threshold means nothing. */
    fun syncConfirmWindow() {
        val want = confirmFrames
        if (want == confirmWindow) return
        confirmWindow = want
        confirmer = Confirmer(want)
        recoveryConfirmer = Confirmer(maxOf(RECOVERY_MIN_VOTES, want))
    }

    var stuckReason: String? = null
    var stuckCount: Int = 0

    // Derselbe Kandidat, wieder am Evidenzboden abgewiesen; ueberlebt das Flattern, weil er an der Ablehnung haengt.
    var refusedKey: String? = null
    var refusedStreak: Int = 0

    /** Never re-proposed in THIS position (`rejectedPairFen`): the single gets its turn. */
    var rejectedPair: String? = null
    var rejectedPairFen: String? = null

    var anomalySince: Long = 0L

    val anomalyStart = DoubleArray(Squares.COUNT)

    var cnnSnap: CnnSnapshot? = null

    val sights = ArrayDeque<SquareSight>()

    var lastCnnTs: Double = 0.0 // recovery-observation cooldown anchor
    var cnnStatus: String? = null // null | "ok" | "mismatch"
    var cnnConflicts: List<String> = emptyList()
    var cnnAgreement: Double = 0.0

    /** [cnnAgreement] alone is 0.0 for "disagreed everywhere", "never asked" and "board moved on" alike. Taken
     *  counts evaluations; stale counts snapshots whose FEN no longer matched. */
    var cnnReadsTaken: Long = 0L

    var cnnReadsStale: Long = 0L

    /** `cnnReads=0` has four causes: no snapshot, routed to `VerifySingle`, `cnn == null`, or `evaluationDue()`. */
    var cnnSnapsSeen: Long = 0L

    var cnnSnapsToVerify: Long = 0L

    var cnnSnapsNoEvaluator: Long = 0L

    var cnnSnapsNotDue: Long = 0L
    var cnnBestMove: String? = null

    /** Non-null freezes noise learning and blocks every commit (invariant 9). */
    var alarm: TrackerEvent.Alarm? = null

    /** The seam's `Alarm` carries no timestamp. */
    var alarmSince: Double = 0.0

    var desyncObs: Int = 0 // consecutive desync observations
    var desyncConflicts: Long = 0L // the stable conflict set of the streak

    var desyncLastSeq: Long? = null

    var desyncSince: Double = 0.0

    val decisionLog: MutableList<DecisionRecord> = DecisionLog(sink = { decisionSink(it.toDebugDecision()) })
    var pendingCapture: PendingCapture? = null

    var detBoxes: SquareBoxes = squareBoxes(config.detSize, whitePov) // extendUp = 0.0

    var evidenceBoxes: SquareBoxes = squareBoxes(config.detSize, whitePov, config.overhang)

    fun rebuildBoxes() {
        detBoxes = squareBoxes(config.detSize, whitePov)
        evidenceBoxes = squareBoxes(config.detSize, whitePov, config.overhang)
    }

    val cnnOn: Boolean get() = config.cnnVerify && cnnRun

    val settleFrames: Int get() = config.settleFrames(cnnOn)

    val avgFrames: Int get() = config.avgFrames(cnnOn)

    val confirmFrames: Int get() = config.confirmFrames(cnnOn)

    val detSize: Int get() = config.detSize
}

/** With `cnnOn` `confirmFrames` is 1, so a four-ply rewrite confirmed on the FIRST glance. The diff's 1 is
 *  right after the LL floor, margin and motion gate — a bridge passes none of them. */
private const val RECOVERY_MIN_VOTES = 2

internal const val STATE_WAITING = "waiting"

internal const val STATE_MOVING = "moving"

internal const val STATE_OCCLUDED = "occluded"

internal const val STATE_MOVE = "move"

/** [voteOutcome]/[voteCount]: never act on one glance (invariant 13). [cur]/[curBgr] are the AVERAGED frame
 *  of the candidate and the verify path's only legal anchor (invariant 5). */
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
    var startedS: Double = 0.0,
    var lastTickS: Double = 0.0,
    /** Eingefroren beim HEBEN: waehrend `pending` steht, bricht `tryDetect` vor `applyVetoes` ab, der
     *  Baseline-Arm schreibt aber weiter — die Zeile mischte sonst zwei Frames. */
    val shadowVetoedAtLift: Long = 0L,
    val occludedVetoedAtLift: Long = 0L,
)

internal data class PromoPending(
    val from: String,
    val to: String,
    val cur: GrayImage,
    val curBgr: BgrImage?,
    val fen: String,
    var cnnPiece: Char? = null,
    var cnnVotes: Int = 0,
    var lastCnnSeq: Long = -1L,
    var emptyVotes: Int = 0,
)

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
    val cnnReadsTaken: Long,
    val cnnReadsStale: Long,
    val cnnSnaps: Long,
    val cnnSnapsToVerify: Long,
    val cnnSnapsNoEvaluator: Long,
    val cnnSnapsNotDue: Long,
    val cnnBestMove: String?,
    // `accepted = false` marks a REJECTED candidate.
    val stuckReason: String? = null,
    val verifyOutcome: String? = null,
    val accepted: Boolean = true,
    val refProvisional: Boolean = false,
)

internal data class PendingCapture(
    val san: String,
    val fen: String,
)

/** Visible = neither hand arm flagged the square. */
internal class SquareSight(
    val seq: Long,
    val visible: Long,
    val confident: Long,
    val occupied: Long,
    val fen: String? = null,
)

internal const val SIGHT_DEPTH = 8

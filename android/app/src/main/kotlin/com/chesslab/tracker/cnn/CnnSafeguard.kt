package com.chesslab.tracker.cnn

import com.chesslab.engine.Game
import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.MoveCandidate
import com.chesslab.engine.api.OccupancySafeguard
import com.chesslab.engine.api.VerifyVerdict
import com.chesslab.engine.uciOf
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.util.concurrent.atomic.AtomicBoolean

/**
 * One CNN observation input: the 64 square crops (in [ALL_SQUARES] order) plus
 * the detect-resolution gray/BGR of the SAME frame — the frame a recovery
 * decision anchors the new base truth on (tracker.py:1376-1388: never the live
 * buffer, which may already contain the opponent's next move).
 */
class ObservationInput(
    val crops: List<SquareCrop>,
    val gray: GrayImage,
    val bgr: BgrImage?,
    /** Engine frame seq at capture (seq contract, Spec 11 adapted). */
    val seq: Int = 0,
    /** Capture wall time (safeguard clock) for the observation freshness bound. */
    val timestampNs: Long = 0L,
)

/**
 * One CNN observation paired with the exact frame it saw (ports `CnnSnapshot`):
 * consumers of a decision made at frame N may only use `seq >= N`.
 */
class CnnSnapshot(
    val obs: OccupancyObservation,
    val seq: Int,
    val timestampNs: Long,
    val inferMs: Double,
    val gray: GrayImage,
    val bgr: BgrImage?,
)

/** Applied recovery outcome handed to the service wiring. */
sealed interface RecoveryAction {
    /** Commit these recovered half-moves and re-anchor on the observed frame. */
    data class Moves(
        val ucis: List<String>,
        val agreement: Double,
        val gray: GrayImage,
        val bgr: BgrImage?,
        /** True when the sequence resolves ALL alarm conflict squares (commit gate while alarmed). */
        val resolvesAlarm: Boolean = false,
    ) : RecoveryAction

    /** Board unchanged — pull the reference forward when stuck, no move; clears an alarm. */
    data class BoardUnchanged(
        val gray: GrayImage,
        val bgr: BgrImage?,
    ) : RecoveryAction

    /**
     * Illegal-move referee alarm (b80a03c/e867df1/f6960f8): `desyncObsN` distinct stable
     * identity-mismatch observations WITH at least one occupancy conflict.
     */
    data class Alarm(
        val conflicts: List<String>,
        val guessUci: String?,
    ) : RecoveryAction
}

/**
 * ONNX-backed [OccupancySafeguard]: NON-BLOCKING pre-commit verification of diff
 * candidates plus stuck-state recovery (ports the `_cnn_worker` /`_verify_tick`
 * /`_cnn_tick` scheduling of tracker.py:1259-1310 with a single worker coroutine
 * and busy-flag serialization instead of a thread).
 *
 * [requestVerify] only launches a coroutine and returns — the frame loop never
 * awaits the safeguard. One observation runs at a time ([busy]); verify has
 * priority over recovery (`tracker.py:1303`).
 */
class CnnSafeguard(
    private val classifier: SquareClassifier,
    private val frameProvider: suspend () -> ObservationInput?,
    private val scope: CoroutineScope,
    private val config: CnnConfig = CnnConfig(),
    private val clock: () -> Long = System::nanoTime,
    /** Diagnostic sink (injected — android.util.Log is unavailable in JVM unit tests). */
    private val log: (String) -> Unit = {},
) : OccupancySafeguard {
    private val verifier = OccupancyVerifier(config)
    private val recovery = CnnRecovery(config)
    private val busy = AtomicBoolean(false)
    private val inferenceLock = Any()
    private var active = true
    private var verifyJob: Job? = null

    @Volatile
    private var lastCnnTs = Double.NEGATIVE_INFINITY

    /** Newest observation snapshot (free-running observer, Spec 11 adapted). */
    @Volatile
    var lastSnapshot: CnnSnapshot? = null
        private set

    /** Wired by the integration: called with every fresh observation (resting-hand taint). */
    @Volatile
    var onObservation: ((CnnSnapshot) -> Unit)? = null

    // Illegal-move desync counting (b80a03c + e065051): distinct observations only.
    private var desyncObs = 0
    private var desyncConflicts: Set<String> = emptySet()
    private var desyncLastSeq: Int? = null

    private val verdictFlow = MutableSharedFlow<VerifyVerdict>(extraBufferCapacity = VERDICT_BUFFER)

    override val verdicts: Flow<VerifyVerdict> = verdictFlow

    /** Non-blocking: schedules the multi-observation verify worker and returns. */
    override fun requestVerify(
        move: MoveCandidate,
        touched: List<String>,
    ) {
        if (verifyJob?.isActive == true) log("verify ${move.ucis}: cancelling previous still-active verify job")
        verifyJob?.cancel()
        verifyJob =
            scope.launch {
                log("verify ${move.ucis} start: seq>=${move.seq} touched=$touched")
                var framesSeen = 0
                var attempts = 0
                var nullFrames = 0
                var staleOrDup = 0
                // Vote gate (83a1e88): no verify decision on a single CNN glance — the SAME
                // outcome must be seen on `verifyObsVotes` consecutive observations; a
                // different outcome resets the count. Window/pair resolutions (votes=false)
                // decide single-shot, exactly like the Python ladder.
                var outcome: String? = null
                var votes = 0
                var lastAcceptedSeq: Int? = null
                val maxAttempts = (config.verifyWindow + config.verifyObsVotes) * MAX_ATTEMPT_FACTOR
                try {
                    while (attempts < maxAttempts) {
                        attempts++
                        val snap = observeOnce()
                        // Seq contract (e065051): an observation OLDER than the frame the
                        // candidate was decided on must neither confirm nor reject it.
                        if (snap == null || snap.seq < move.seq || snap.seq == lastAcceptedSeq) {
                            if (snap == null) nullFrames++ else staleOrDup++
                            delay(if (snap == null) RETRY_DELAY_MS else OBSERVATION_GAP_MS)
                        } else {
                            lastAcceptedSeq = snap.seq
                            framesSeen++
                            val step = verifier.evaluate(move.fenBefore, move.ucis, snap.obs, framesSeen)
                            val endpoints = endpointStats(move.ucis, snap.obs)
                            if (step is VerifyStep.Decided) {
                                votes = if (outcome == step.outcome) votes + 1 else 1
                                outcome = step.outcome
                                log(
                                    "verify ${move.ucis} obs#$framesSeen seq=${snap.seq}: " +
                                        "outcome=${step.outcome} votes=$votes/${config.verifyObsVotes} " +
                                        "single-shot=${!step.votes} infer=${"%.0f".format(snap.inferMs)}ms $endpoints",
                                )
                                if (!step.votes || votes >= config.verifyObsVotes) {
                                    log("verify ${move.ucis} DECIDED: ${step.verdict}")
                                    verdictFlow.emit(step.verdict)
                                    return@launch
                                }
                            } else {
                                log("verify ${move.ucis} obs#$framesSeen seq=${snap.seq}: undecided (window) $endpoints")
                            }
                            delay(OBSERVATION_GAP_MS)
                        }
                    }
                } catch (e: kotlinx.coroutines.CancellationException) {
                    log("verify ${move.ucis} CANCELLED after $attempts attempts (no verdict emitted)")
                    throw e
                } catch (t: Throwable) {
                    // A crashed worker must never leave the engine's pending latched.
                    log("verify ${move.ucis} CRASHED: $t — emitting Timeout")
                    verdictFlow.emit(VerifyVerdict.Timeout(move.ucis))
                    return@launch
                }
                // Defensive: evaluate() decides at the window; never leave a candidate hanging.
                log(
                    "verify ${move.ucis} TIMEOUT after $attempts attempts " +
                        "(obs=$framesSeen nullFrames=$nullFrames staleOrDup=$staleOrDup lastOutcome=$outcome votes=$votes)",
                )
                verdictFlow.emit(VerifyVerdict.Timeout(move.ucis))
            }
    }

    /**
     * Event-driven recovery/periodic check (ports `_cnn_tick` gating,
     * tracker.py:1349-1361): stuck -> after [CnnConfig.cooldownS]; quiet tracking
     * -> after [CnnConfig.checkIntervalS]. Returns null when it is not due, a
     * verify is running, or the observation is inconclusive.
     */
    suspend fun recoveryTick(
        fen: String,
        stuck: Boolean,
        alarmConflicts: List<String>? = null,
    ): RecoveryAction? {
        val input = (if (recoveryDue(stuck)) frameProvider() else null) ?: return null
        return observe(input)?.let { snap ->
            lastCnnTs = clock() / NS_PER_S
            when (val outcome = recovery.evaluate(fen, snap.obs)) {
                is RecoveryOutcome.Moves -> movesAction(fen, snap, input, outcome, alarmConflicts)
                is RecoveryOutcome.BoardUnchanged -> {
                    val restored = alarmConflicts == null || alarmSquaresMatch(Game(fen), snap.obs, alarmConflicts)
                    if (restored) {
                        resetDesync()
                        RecoveryAction.BoardUnchanged(input.gray, input.bgr)
                    } else {
                        null
                    }
                }
                is RecoveryOutcome.Inconclusive -> {
                    resetDesync() // occlusion breaks the desync streak
                    null
                }
                is RecoveryOutcome.Conflicts -> conflictsAction(fen, snap, outcome.squares, alarmConflicts)
            }
        }
    }

    /** While alarmed, recovery commits only when the sequence resolves ALL conflict squares. */
    private fun movesAction(
        fen: String,
        snap: CnnSnapshot,
        input: ObservationInput,
        outcome: RecoveryOutcome.Moves,
        alarmConflicts: List<String>?,
    ): RecoveryAction? {
        if (alarmConflicts == null) {
            return RecoveryAction.Moves(outcome.ucis, outcome.agreement, input.gray, input.bgr)
        }
        val after = Game(fen)
        for (u in outcome.ucis) after.push(after.legalMoves().first { uciOf(it) == u })
        val labelOk = snap.obs.labelConfident(config.confThr)
        val unresolved =
            alarmConflicts.filter { sq ->
                labelOk[sq] != true || snap.obs.label.getValue(sq) != expectedLabel(after, sq)
            }
        return if (unresolved.isNotEmpty()) {
            null // withhold — the sequence would not resolve the alarm conflicts
        } else {
            resetDesync()
            RecoveryAction.Moves(outcome.ucis, outcome.agreement, input.gray, input.bgr, resolvesAlarm = true)
        }
    }

    /**
     * Desync counting (b80a03c, seq-deduped per e065051): a stable conflict-set streak of
     * `desyncObsN` DISTINCT observations WITH at least one occupancy conflict rings the
     * alarm; identity-only misreads never do (f6960f8).
     */
    private fun conflictsAction(
        fen: String,
        snap: CnnSnapshot,
        conflicts: List<String>,
        alarmConflicts: List<String>?,
    ): RecoveryAction? {
        val confSet = conflicts.toSet()
        if (snap.seq != desyncLastSeq) {
            val stable =
                desyncConflicts == confSet ||
                    confSet.containsAll(desyncConflicts) ||
                    desyncConflicts.containsAll(confSet)
            desyncObs = if (stable) desyncObs + 1 else 1
            desyncConflicts = confSet
            desyncLastSeq = snap.seq
        }
        val game = Game(fen)
        if (alarmConflicts == null &&
            desyncObs >= config.desyncObsN &&
            recovery.hasOccupancyConflict(game, snap.obs, conflicts)
        ) {
            return RecoveryAction.Alarm(conflicts, recovery.guessIllegalMove(game, snap.obs))
        }
        return null
    }

    private fun resetDesync() {
        desyncObs = 0
        desyncConflicts = emptySet()
        desyncLastSeq = null
    }

    /** Alarm evidence is resolved only when every original conflict is visible and correct. */
    private fun alarmSquaresMatch(
        game: Game,
        obs: OccupancyObservation,
        conflicts: List<String>,
    ): Boolean {
        val labelOk = obs.labelConfident(config.confThr)
        return conflicts.all { sq ->
            labelOk[sq] == true && obs.label.getValue(sq) == expectedLabel(game, sq)
        }
    }

    /**
     * Free-running observer (35e3f3e adapted): observe continuously while enabled,
     * respecting [CnnConfig.observerIntervalMs]; each snapshot feeds [onObservation]
     * (resting-hand taint) and [lastSnapshot].
     */
    suspend fun observerLoop() {
        while (currentCoroutineContext().isActive) {
            // A pending move owns the classifier. Without this gate the free observer can
            // repeatedly win the busy flag and starve verification until its watchdog fires.
            if (verifyJob?.isActive != true) {
                observeOnce()?.let { snap -> onObservation?.invoke(snap) }
            }
            delay(config.observerIntervalMs.coerceAtLeast(OBSERVER_MIN_GAP_MS))
        }
    }

    /** Verify has priority (`tracker.py:1303`); stuck uses the cooldown, quiet the interval. */
    private fun recoveryDue(stuck: Boolean): Boolean {
        if (verifyJob?.isActive == true) return false
        val nowS = clock() / NS_PER_S
        val gate = if (stuck) config.cooldownS else config.checkIntervalS
        return nowS - lastCnnTs >= gate
    }

    /** What the CNN saw on the candidate's endpoint squares — diagnoses ghost/crop issues. */
    private fun endpointStats(
        ucis: List<String>,
        obs: OccupancyObservation,
    ): String {
        val squares = ucis.flatMap { listOf(it.substring(0, 2), it.substring(2, 4)) }.distinct()
        return squares.joinToString(" ") { sq ->
            "%s[%s c=%.2f occ=%.2f emp=%.2f ocl=%.2f]".format(
                sq,
                obs.label.getValue(sq),
                obs.conf.getValue(sq),
                obs.pOcc.getValue(sq),
                obs.pEmpty.getValue(sq),
                obs.pOccluded.getValue(sq),
            )
        }
    }

    private suspend fun observeOnce(): CnnSnapshot? {
        val input = frameProvider() ?: return null
        return observe(input)
    }

    /**
     * One classifier pass over the 64 crops; busy-flag serialized (`_cnn_busy`).
     * Inference time is measured on every observation path (d318689).
     */
    private fun observe(input: ObservationInput): CnnSnapshot? {
        if (!busy.compareAndSet(false, true)) return null
        return try {
            synchronized(inferenceLock) {
                if (!active || input.crops.size != ALL_SQUARES.size) {
                    null
                } else {
                    val t0 = clock()
                    val probs = classifier.predict(input.crops)
                    val inferMs = (clock() - t0) / NS_PER_MS
                    val perSquare = ALL_SQUARES.withIndex().associate { (i, sq) -> sq to probs[i] }
                    val obs = OccupancyObservation.fromProbs(perSquare, classifier.spec.classes)
                    CnnSnapshot(obs, input.seq, input.timestampNs, inferMs, input.gray, input.bgr)
                        .also { lastSnapshot = it }
                }
            }
        } finally {
            busy.set(false)
        }
    }

    /** Prevent new inference and wait for an in-flight classifier call before its session closes. */
    fun shutdown() {
        synchronized(inferenceLock) { active = false }
        verifyJob?.cancel()
    }

    private companion object {
        const val VERDICT_BUFFER = 4
        const val MAX_ATTEMPT_FACTOR = 4
        const val RETRY_DELAY_MS = 200L
        const val OBSERVATION_GAP_MS = 150L
        const val OBSERVER_MIN_GAP_MS = 100L
        const val NS_PER_S = 1e9
        const val NS_PER_MS = 1e6
    }
}

package com.chesslab.tracker.cnn

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.MoveCandidate
import com.chesslab.engine.api.OccupancySafeguard
import com.chesslab.engine.api.VerifyVerdict
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
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
)

/** Applied recovery outcome handed to the service wiring. */
sealed interface RecoveryAction {
    val gray: GrayImage
    val bgr: BgrImage?

    /** Commit these recovered half-moves and re-anchor on the observed frame. */
    data class Moves(
        val ucis: List<String>,
        val agreement: Double,
        override val gray: GrayImage,
        override val bgr: BgrImage?,
    ) : RecoveryAction

    /** Board unchanged — pull the reference forward when stuck, no move. */
    data class BoardUnchanged(
        override val gray: GrayImage,
        override val bgr: BgrImage?,
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
) : OccupancySafeguard {
    private val verifier = OccupancyVerifier(config)
    private val recovery = CnnRecovery(config)
    private val busy = AtomicBoolean(false)
    private var verifyJob: Job? = null

    @Volatile
    private var lastCnnTs = Double.NEGATIVE_INFINITY

    private val verdictFlow = MutableSharedFlow<VerifyVerdict>(extraBufferCapacity = VERDICT_BUFFER)

    override val verdicts: Flow<VerifyVerdict> = verdictFlow

    /** Non-blocking: schedules the multi-observation verify worker and returns. */
    override fun requestVerify(
        move: MoveCandidate,
        touched: List<String>,
    ) {
        verifyJob?.cancel()
        verifyJob =
            scope.launch {
                var framesSeen = 0
                var attempts = 0
                // Vote gate (83a1e88): no verify decision on a single CNN glance — the SAME
                // outcome must be seen on `verifyObsVotes` consecutive observations; a
                // different outcome resets the count. Window/pair resolutions (votes=false)
                // decide single-shot, exactly like the Python ladder.
                var outcome: String? = null
                var votes = 0
                val maxAttempts = (config.verifyWindow + config.verifyObsVotes) * MAX_ATTEMPT_FACTOR
                while (attempts < maxAttempts) {
                    attempts++
                    val obs = observeOnce()
                    if (obs == null) {
                        delay(RETRY_DELAY_MS)
                    } else {
                        framesSeen++
                        val step = verifier.evaluate(move.fenBefore, move.ucis, obs, framesSeen)
                        if (step is VerifyStep.Decided) {
                            votes = if (outcome == step.outcome) votes + 1 else 1
                            outcome = step.outcome
                            if (!step.votes || votes >= config.verifyObsVotes) {
                                verdictFlow.emit(step.verdict)
                                return@launch
                            }
                        }
                        delay(OBSERVATION_GAP_MS)
                    }
                }
                // Defensive: evaluate() decides at the window; never leave a candidate hanging.
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
    ): RecoveryAction? {
        val input = (if (recoveryDue(stuck)) frameProvider() else null) ?: return null
        return observe(input)?.let { obs ->
            lastCnnTs = clock() / NS_PER_S
            when (val outcome = recovery.evaluate(fen, obs)) {
                is RecoveryOutcome.Moves -> RecoveryAction.Moves(outcome.ucis, outcome.agreement, input.gray, input.bgr)
                is RecoveryOutcome.BoardUnchanged -> RecoveryAction.BoardUnchanged(input.gray, input.bgr)
                is RecoveryOutcome.Inconclusive, is RecoveryOutcome.Conflicts -> null
            }
        }
    }

    /** Verify has priority (`tracker.py:1303`); stuck uses the cooldown, quiet the interval. */
    private fun recoveryDue(stuck: Boolean): Boolean {
        if (verifyJob?.isActive == true) return false
        val nowS = clock() / NS_PER_S
        val gate = if (stuck) config.cooldownS else config.checkIntervalS
        return nowS - lastCnnTs >= gate
    }

    private suspend fun observeOnce(): OccupancyObservation? {
        val input = frameProvider() ?: return null
        return observe(input)
    }

    /** One classifier pass over the 64 crops; busy-flag serialized (`_cnn_busy`). */
    private fun observe(input: ObservationInput): OccupancyObservation? {
        if (!busy.compareAndSet(false, true)) return null
        return try {
            if (input.crops.size != ALL_SQUARES.size) {
                null
            } else {
                val probs = classifier.predict(input.crops)
                val perSquare = ALL_SQUARES.withIndex().associate { (i, sq) -> sq to probs[i] }
                OccupancyObservation.fromProbs(perSquare, classifier.spec.classes)
            }
        } finally {
            busy.set(false)
        }
    }

    private companion object {
        const val VERDICT_BUFFER = 4
        const val MAX_ATTEMPT_FACTOR = 4
        const val RETRY_DELAY_MS = 200L
        const val OBSERVATION_GAP_MS = 150L
        const val NS_PER_S = 1e9
    }
}

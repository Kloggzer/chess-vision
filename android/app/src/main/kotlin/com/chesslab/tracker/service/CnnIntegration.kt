package com.chesslab.tracker.service

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerState
import com.chesslab.tracker.cnn.ALL_SQUARES
import com.chesslab.tracker.cnn.BoardCropper
import com.chesslab.tracker.cnn.CnnConfig
import com.chesslab.tracker.cnn.CnnModelStore
import com.chesslab.tracker.cnn.CnnSafeguard
import com.chesslab.tracker.cnn.ObservationInput
import com.chesslab.tracker.cnn.OnnxClassifier
import com.chesslab.tracker.cnn.RecoveryAction
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.opencv.core.Mat
import java.io.File

/**
 * Phase 05 wiring: builds the ONNX classifier + [CnnSafeguard] from the imported
 * model and plugs it into [TrackerCoordinator.safeguard]; also drives the
 * recovery/periodic tick loop (the port of `_cnn_worker` scheduling). Detached,
 * the tracker runs the plain diff path unchanged (null safeguard).
 *
 * Observations use an owned clone of the exact full-resolution warped board that
 * the engine just consumed. This keeps crop geometry, orientation, and frame sequence
 * identical to diff detection and avoids a competing CameraX still-capture pipeline.
 */
class CnnIntegration(
    private val coordinator: TrackerCoordinator,
    private val frameProvider: () -> CnnFrame?,
    private val scope: CoroutineScope,
    private val modelStore: CnnModelStore,
    /** When set, every Against verdict dumps the warped board + endpoint crops here (crop-alignment debug). */
    private val debugDumpDir: File? = null,
) {
    private var classifier: OnnxClassifier? = null
    private var safeguard: CnnSafeguard? = null
    private val jobs = mutableListOf<Job>()

    val attached: Boolean get() = safeguard != null

    /**
     * Attach the safeguard when enabled AND a model is imported; detach otherwise
     * (null path = pure diff tracking, unchanged). A confidence-threshold change
     * re-attaches with the new [CnnConfig].
     */
    fun reconcile(
        prev: TrackerSettings,
        next: TrackerSettings,
    ) {
        val wantAttached = next.cnnEnabled && modelStore.isInstalled()
        val thrChanged = attached && next.cnnConfThr != prev.cnnConfThr
        when {
            wantAttached && (!attached || thrChanged) -> attach(modelStore.modelDir, next.cnnConfThr)
            !wantAttached && attached -> detach()
            else -> Unit
        }
    }

    /** Load the model and attach the safeguard; false when the model is unusable. */
    fun attach(
        modelDir: File,
        confThr: Double,
    ): Boolean {
        detach()
        val loaded =
            runCatching { OnnxClassifier(modelDir) }.getOrElse { return false }
        val cropper = BoardCropper(loaded.spec.outWidth, loaded.spec.outHeight)
        val config = CnnConfig(confThr = confThr)
        val guard =
            CnnSafeguard(loaded, { observationInput(cropper) }, scope, config, log = { msg ->
                android.util.Log.i(CNN_TAG, msg)
            })
        classifier = loaded
        safeguard = guard
        coordinator.safeguard = guard
        // Resting-hand seam: every fresh observation feeds the occluded-dominant squares
        // (p > 0.5) into the engine's taint latch (cf31c81).
        var probeDumped = false
        guard.onObservation = { snap ->
            if (!probeDumped && debugDumpDir != null) {
                probeDumped = true
                dumpProbe()
            }
            val occluded = ALL_SQUARES.filterTo(mutableSetOf()) { snap.obs.pOccluded.getValue(it) > OCCLUDED_P }
            val ageS = ((System.nanoTime() - snap.timestampNs).coerceAtLeast(0L)) / NS_PER_S
            coordinator.reportOccluded(occluded, ageS)
        }
        jobs +=
            scope.launch {
                guard.verdicts.collect {
                    android.util.Log.i(CNN_TAG, "verdict -> engine: $it")
                    if (it is com.chesslab.engine.api.VerifyVerdict.Against) dumpRejectDebug(it.ucis)
                    coordinator.onVerifyVerdict(it)
                }
            }
        jobs += scope.launch { guard.observerLoop() }
        jobs += scope.launch { recoveryLoop(guard) }
        return true
    }

    /** Detach and release (null safeguard path unchanged). */
    fun detach() {
        coordinator.safeguard = null
        safeguard?.shutdown()
        for (job in jobs) job.cancel()
        jobs.clear()
        safeguard = null
        classifier?.close()
        classifier = null
    }

    private suspend fun recoveryLoop(guard: CnnSafeguard) {
        while (scope.isActive) {
            delay(RECOVERY_POLL_MS)
            val state = coordinator.uiState.value
            val stuck = state.trackerState == TrackerState.STUCK
            val tracking = state.trackerState == TrackerState.TRACKING
            if (!stuck && !tracking) continue
            when (val action = guard.recoveryTick(state.fen, stuck, coordinator.alarmConflicts)) {
                is RecoveryAction.Moves ->
                    coordinator.applyRecovery(action.ucis, state.fen, action.gray, action.bgr, action.resolvesAlarm)
                is RecoveryAction.BoardUnchanged -> {
                    // Take-back detected while alarmed: clear first, then the stuck resync.
                    if (coordinator.alarmConflicts != null) coordinator.clearAlarm()
                    if (stuck) coordinator.pullReferenceForward(state.fen, action.gray, action.bgr)
                }
                is RecoveryAction.Alarm -> coordinator.raiseAlarm(action.conflicts, action.guessUci)
                null -> Unit
            }
        }
    }

    /**
     * Crop-alignment probe: on a rejected candidate, write the full warped board plus the
     * endpoint square crops (exact [BoardCropper.cropRect] geometry) as PNGs. Pull with
     * `adb pull /sdcard/Android/data/<pkg>/files/cnn_debug` and eyeball whether the crop
     * named d3 actually shows d3.
     */
    private fun dumpRejectDebug(ucis: List<String>) {
        val squares = ucis.flatMap { listOf(it.substring(0, 2), it.substring(2, 4)) }.distinct()
        dumpCrops("reject_${ucis.joinToString("_")}", squares)
    }

    /** One-time startup probe: full board + ALL 64 crops — verifies crop-grid alignment. */
    private fun dumpProbe() {
        dumpCrops("probe", ALL_SQUARES)
    }

    private fun dumpCrops(
        tag: String,
        squares: List<String>,
    ) {
        val dir = debugDumpDir ?: return
        val frame = frameProvider() ?: return
        try {
            val out = File(dir, "${tag}_seq${frame.seq}")
            out.mkdirs()
            org.opencv.imgcodecs.Imgcodecs.imwrite(File(out, "board.png").absolutePath, frame.boardBgr)
            for (sq in squares) {
                val r = BoardCropper.cropRect(sq, frame.boardBgr.rows())
                val sub = frame.boardBgr.submat(org.opencv.core.Rect(r.x, r.y, r.width, r.height))
                org.opencv.imgcodecs.Imgcodecs.imwrite(File(out, "$sq.png").absolutePath, sub)
                sub.release()
            }
            android.util.Log.i(CNN_TAG, "crop debug dumped: ${out.absolutePath}")
        } catch (t: Exception) {
            android.util.Log.w(CNN_TAG, "crop debug dump failed: $t")
        } finally {
            frame.boardBgr.release()
        }
    }

    /** Exact engine-frame board -> 64 crops; the provider transfers ownership of [CnnFrame.boardBgr]. */
    private suspend fun observationInput(cropper: BoardCropper): ObservationInput? {
        val frame = frameProvider() ?: return null
        return try {
            val crops = cropper.crops(frame.boardBgr)
            ObservationInput(
                crops,
                frame.gray,
                frame.bgr,
                seq = frame.seq,
                timestampNs = frame.timestampNs,
            )
        } finally {
            frame.boardBgr.release()
        }
    }

    private companion object {
        const val RECOVERY_POLL_MS = 500L
        const val OCCLUDED_P = 0.5
        const val NS_PER_S = 1e9
        const val CNN_TAG = "chesslabCnn"
    }
}

/** Snapshot of the exact warped frame most recently consumed by the engine. */
class CnnFrame(
    val boardBgr: Mat,
    val gray: GrayImage,
    val bgr: BgrImage,
    val seq: Int,
    val timestampNs: Long,
)

/** Owns exactly one native board snapshot; every reader receives an owned clone. */
class CnnFrameStore {
    private val lock = Any()
    private var frame: CnnFrame? = null

    fun update(
        processed: ProcessedFrame,
        seq: Int,
    ) {
        synchronized(lock) {
            frame?.boardBgr?.release()
            frame =
                CnnFrame(
                    boardBgr = processed.boardBgr.clone(),
                    gray = processed.gray,
                    bgr = processed.bgr,
                    seq = seq,
                    // Freshness uses the same monotonic clock as CnnSafeguard; CameraX's
                    // sensor timestamp is not guaranteed to share System.nanoTime's timebase.
                    timestampNs = System.nanoTime(),
                )
        }
    }

    /** Caller owns the returned board Mat and must release it. */
    fun latest(): CnnFrame? =
        synchronized(lock) {
            frame?.let { CnnFrame(it.boardBgr.clone(), it.gray, it.bgr, it.seq, it.timestampNs) }
        }

    fun clear() {
        synchronized(lock) {
            frame?.boardBgr?.release()
            frame = null
        }
    }
}

package com.chesslab.tracker.capture

import android.os.SystemClock
import com.chesslab.tracker.sync.SyncPrefs
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class CaptureUi(
    val loading: Boolean = false,
    val plan: CapturePlan? = null,
    val coverage: CaptureCoverage? = null,
    /** The one thing that went wrong, whichever screen is showing. Cleared when a shot opens. */
    val message: String? = null,
    /** Which shot is being taken, and how far the turning has got. */
    val shotIndex: Int = -1,
    val ply: Int = 0,
    val recording: Boolean = false,
)

/**
 * The three screens are one flow across three back-stack entries, so its state cannot live in any
 * one of them — the same reason `GameSessionHost` exists. The run itself is the service's; this
 * only holds which shot is open and which turn is due.
 */
object CaptureHost {
    private val ui = MutableStateFlow(CaptureUi())

    val state: StateFlow<CaptureUi> = ui

    private var active: CaptureRun? = null

    /** The schema's `elapsed_ns` for the step now being asked for. */
    private var stepStartedNs = 0L

    fun load(
        scope: CoroutineScope,
        prefs: () -> SyncPrefs,
    ) {
        if (ui.value.loading) return
        ui.value = ui.value.copy(loading = true, message = null)
        scope.launch {
            when (val answer = fetchCapturePlan(prefs())) {
                is PlanAnswer.Refused -> ui.value = ui.value.copy(loading = false, message = answer.message)
                is PlanAnswer.Loaded ->
                    ui.value =
                        ui.value.copy(loading = false, plan = answer.plan, coverage = fetchCaptureCoverage(prefs()))
            }
        }
    }

    fun shotAt(index: Int): Shot? {
        val shots = ui.value.plan?.shots ?: return null
        return shots.getOrNull(index)
    }

    fun open(index: Int) {
        ui.value = ui.value.copy(shotIndex = index, ply = 0, message = null)
    }

    /** "Aufbau steht": the bundle opens here, and step 0's clock starts with it. */
    fun begin(
        index: Int,
        recorder: CaptureRecorder?,
        clock: () -> Long = SystemClock::elapsedRealtimeNanos,
    ): Boolean {
        val shot = shotAt(index) ?: return false
        val started = recorder?.begin(shot)
        active = started
        stepStartedNs = clock()
        val refusal = if (started == null) NOT_RECORDING else null
        ui.value = ui.value.copy(shotIndex = index, ply = 0, recording = started != null, message = refusal)
        return started != null
    }

    /**
     * "Aufgenommen": one still, one `steps` row, and the next step's clock starts immediately.
     * A lost frame does NOT advance the turn — the step is still open and keeps its own start.
     */
    fun record(
        index: Int,
        clock: () -> Long = SystemClock::elapsedRealtimeNanos,
    ): Boolean {
        val shot = shotAt(index) ?: return false
        val running = active
        if (running == null) {
            ui.value = ui.value.copy(message = NOT_RECORDING)
            return false
        }
        val ply = ui.value.ply
        if (!running.step(ply, shot.orientationDeg(ply), shot.boardFen(), stepStartedNs)) {
            ui.value = ui.value.copy(message = FRAME_LOST)
            return false
        }
        stepStartedNs = clock()
        ui.value = ui.value.copy(ply = ply + 1, message = null)
        return true
    }

    fun finish() {
        active?.finish()
        active = null
        ui.value = ui.value.copy(shotIndex = -1, ply = 0, recording = false)
    }
}

private const val NOT_RECORDING =
    "Nothing is being recorded — switch Recording on under Settings and give the camera a moment."
private const val FRAME_LOST = "The last frame could not be written."

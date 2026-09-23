package com.chesslab.tracker.capture

import android.os.SystemClock
import com.chesslab.tracker.camera.CaptureObserved
import com.chesslab.tracker.sync.SyncPrefs
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class CaptureUi(
    val loading: Boolean = false,
    val plan: CapturePlan? = null,
    val coverage: CaptureCoverage? = null,
    val message: String? = null,
    val shotIndex: Int = -1,
    val ply: Int = 0,
    val recording: Boolean = false,
    val observed: CaptureObserved? = null,
    /** Festgehaltene Felder; null heisst, die Messung darf sie noch verschieben. */
    val frozen: List<Target>? = null,
)

/** One flow across three back-stack entries, so its state cannot live in any of them (like `GameSessionHost`). */
object CaptureHost {
    private val ui = MutableStateFlow(CaptureUi())

    val state: StateFlow<CaptureUi> = ui

    private var active: CaptureRun? = null

    private var stepStartedNs = 0L

    private var placed: List<Target> = emptyList()

    fun place(targets: List<Target>) {
        placed = targets
    }

    /** Festhalten, bevor der Mensch baut: eine Figur verschiebt den Crop-Mittelwert ihres Feldes um bis zu
     *  61 Grauwerte und wuerfelte die Belegung sonst neu. Ab hier nur [refit]. */
    fun freeze(targets: List<Target>) {
        placed = targets
        ui.value = ui.value.copy(frozen = targets)
    }

    fun thaw() {
        ui.value = ui.value.copy(frozen = null)
    }

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
        ui.value = ui.value.copy(shotIndex = index, ply = 0, message = null, frozen = null)
    }

    /** Early, so the camera has rebound and the encoder re-armed before the first turn is taken. */
    fun prepare(recorder: CaptureRecorder?) {
        recorder?.prepare()
        refresh(recorder)
    }

    /** Leaving WITHOUT starting restores the profile; a BEGUN run keeps it — `capture.json` states its profile. */
    fun releaseIfIdle(recorder: CaptureRecorder?) {
        if (ui.value.recording) return
        recorder?.release()
        ui.value = ui.value.copy(observed = null)
    }

    fun refresh(recorder: CaptureRecorder?) {
        ui.value = ui.value.copy(observed = recorder?.observed())
    }

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
        ui.value =
            ui.value.copy(
                shotIndex = index,
                ply = 0,
                recording = started != null,
                message = refusal,
                observed = recorder?.observed(),
            )
        return started != null
    }

    /** A lost frame does NOT advance the turn: the step stays open and keeps its own start. */
    fun record(
        index: Int,
        clock: () -> Long = SystemClock::elapsedRealtimeNanos,
    ): Boolean {
        val ply = ui.value.ply
        val shot = shotAt(index)
        val running = active
        val written =
            shot != null &&
                running != null &&
                running.step(ply, shot.orientationDeg(ply), fenOfTargets(placed), stepStartedNs)
        if (written) {
            stepStartedNs = clock()
            ui.value = ui.value.copy(ply = ply + 1, message = null)
        } else if (shot != null) {
            ui.value = ui.value.copy(message = if (running == null) NOT_RECORDING else FRAME_LOST)
        }
        return written
    }

    /** The run closes FIRST — `capture.json` states the capture profile, not the restored one. */
    fun finish(recorder: CaptureRecorder?) {
        // A throwing close (a full disk) must not keep the 4K capture profile on the camera the
        // tracker goes back to, nor leave the screen claiming it is still recording.
        val failed = runCatching { active?.finish(placed) }.exceptionOrNull()
        active = null
        recorder?.release()
        ui.value =
            ui.value.copy(
                shotIndex = -1,
                ply = 0,
                recording = false,
                observed = null,
                message = failed?.let { NOT_CLOSED },
            )
    }
}

private const val NOT_RECORDING =
    "Nothing is being recorded — switch Recording on under Settings and give the camera a moment."
private const val FRAME_LOST = "The last frame could not be written."
private const val NOT_CLOSED = "The recording could not be closed — check the free space before the next shot."

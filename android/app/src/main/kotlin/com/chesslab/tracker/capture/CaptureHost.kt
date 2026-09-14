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
    /** The one thing that went wrong, whichever screen is showing. Cleared when a shot opens. */
    val message: String? = null,
    /** Which shot is being taken, and how far the turning has got. */
    val shotIndex: Int = -1,
    val ply: Int = 0,
    val recording: Boolean = false,
    /** What the camera really does under the capture profile — measured, never assumed. */
    val observed: CaptureObserved? = null,
    /** Festgehaltene Felder; null heisst, die Messung darf sie noch verschieben. */
    val frozen: List<Target>? = null,
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

    /** Die Belegung, wie der Aufbau-Schirm sie gemessen hat. */
    private var placed: List<Target> = emptyList()

    /** Der Aufbau-Schirm meldet, was seine Messung ergeben hat. */
    fun place(targets: List<Target>) {
        placed = targets
    }

    /**
     * Die Felder festhalten, bevor der Mensch baut — ab hier nur noch [refit].
     *
     * Ohne das wuerfelt die erste hingestellte Figur die Belegung neu: sie verschiebt den
     * Crop-Mittelwert ihres Feldes um bis zu 61 Grauwerte, ein ganzes Band.
     */
    fun freeze(targets: List<Target>) {
        placed = targets
        ui.value = ui.value.copy(frozen = targets)
    }

    /** Zurueck ans Licht-Stellen: die Felder duerfen wieder wandern. */
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

    /**
     * The setup screen's own job besides showing the order: put the capture profile on early enough
     * that the camera has rebound and the encoder re-armed before the first turn is taken.
     */
    fun prepare(recorder: CaptureRecorder?) {
        recorder?.prepare()
        refresh(recorder)
    }

    /**
     * Leaving the setup screen WITHOUT starting puts the capture profile back. The forward path
     * leaves the same composition, so a run that has BEGUN keeps it — `capture.json` must state
     * the profile its frames were taken under.
     */
    fun releaseIfIdle(recorder: CaptureRecorder?) {
        if (ui.value.recording) return
        recorder?.release()
        ui.value = ui.value.copy(observed = null)
    }

    /** Poll what the device settled on — the screen calls this while the human is still building. */
    fun refresh(recorder: CaptureRecorder?) {
        ui.value = ui.value.copy(observed = recorder?.observed())
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

    /**
     * "Aufgenommen": one still, one `steps` row, and the next step's clock starts immediately.
     * A lost frame does NOT advance the turn — the step is still open and keeps its own start.
     */
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

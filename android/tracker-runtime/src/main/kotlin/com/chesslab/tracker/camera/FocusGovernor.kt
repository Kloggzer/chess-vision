package com.chesslab.tracker.camera

import com.chesslab.engine.api.BgrImage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlin.math.abs
import kotlin.math.roundToInt

/** Woran der Fokus gerade ist — die eine Zeile, die der Kameraschirm rendert. */
sealed interface FocusState {
    /** Nie gemessen: der Fokus steht auf dem, was der Nutzer oder die Automatik gewaehlt hat. */
    data object Idle : FocusState

    /** Die Kamera stellt selbst scharf; ihr Ergebnis wird danach gegengeprueft. */
    data object Seeking : FocusState

    data class Sweeping(
        val done: Int,
        val total: Int,
    ) : FocusState

    data class Locked(
        val focus: Float,
        val sharpness: Float,
    ) : FocusState

    /** Gemessen weich gegen das gefundene Optimum — der Fall, fuer den es den Sweep gibt. */
    data class Soft(
        val sharpness: Float,
        val reference: Float,
    ) : FocusState

    /** No repeatable peak; the previous focus has been restored. */
    data object Failed : FocusState
}

/** Dass das Bild weich geworden ist, in Worten fuer den Spieler. */
data class FocusNotice(
    val sharpness: Float,
    val reference: Float,
)

/**
 * Was ein Schirm mit dem Fokus darf: den Sweep AUSLOESEN und abbrechen.
 *
 * Ausloesen und nicht anlaufen lassen: die automatische Konvergenz flog 2026-08-02, weil sie sich
 * auf ein noch nicht aufgestelltes Brett eingestellt hat (`OpticsLock`).
 */
interface FocusTuner {
    val state: StateFlow<FocusState>

    /** Die zuletzt gemessene Schaerfe des Bretts, oder null wenn noch keine vorliegt. */
    val sharpness: StateFlow<Float?>

    /** Kamera fragen, gegenpruefen, halten — der schnelle Weg. */
    fun start()

    /** Die volle Reihe, ohne die Kamera zu fragen: langsamer, aber sie sieht jede Stufe. */
    fun sweep() = Unit

    fun cancel()

    /**
     * Ob ein Schirm zusieht.
     *
     * Nur dann wird im Leerlauf gemessen: ein 1024er Warp je Messung ist nichts, was ohne
     * Zuschauer laufen sollte.
     */
    fun watch(on: Boolean) = Unit

    companion object {
        val NONE: FocusTuner =
            object : FocusTuner {
                override val state = MutableStateFlow<FocusState>(FocusState.Idle)
                override val sharpness = MutableStateFlow<Float?>(null)

                override fun start() = Unit

                override fun cancel() = Unit
            }
    }
}

/**
 * Wer nach jedem Frame am Fokus messen darf.
 *
 * Eine Schnittstelle mit einem Nichtstun wie [ExposureGovernor], damit Replay und Clip-Sim
 * unveraendert bleiben: die stellen keine Linse.
 */
interface FocusGovernor {
    /** Waehrend eines Sweeps haelt die Belichtungsregelung still — siehe `TrackerCoordinator`. */
    val sweeping: Boolean get() = false

    /** True once a focus change has settled and the tracker can capture a new baseline. */
    fun onBoard(
        seq: Long,
        quiet: Boolean,
        region: FocusRegion?,
        board: () -> BgrImage?,
    ): Boolean

    companion object {
        val NONE: FocusGovernor =
            object : FocusGovernor {
                override fun onBoard(
                    seq: Long,
                    quiet: Boolean,
                    region: FocusRegion?,
                    board: () -> BgrImage?,
                ) = false
            }
    }
}

/**
 * Serializes UI edits with the analyzer's sweep. The public camera port must be this wrapper:
 * checking the raw port alone cannot prevent a UI edit between a reading and the next lens move.
 */
class BoardFocusGovernor(
    private val port: CameraLookPort,
    private val settleFrames: Int = SETTLE_FRAMES,
    private val everyFrames: Long = WATCH_INTERVAL,
    private val onSoft: (FocusNotice) -> Unit = {},
    private val onSample: (FocusSample) -> Unit = {},
) : FocusGovernor,
    FocusTuner,
    CameraLookPort {
    private val phase = MutableStateFlow<FocusState>(FocusState.Idle)
    private val reading = MutableStateFlow<Float?>(null)
    private var against = 0f
    private var watched = false
    private var sweep: FocusSweep? = null
    private var locking = false
    private var armed = true
    private var byUser = false
    private var candidate: FocusSample? = null
    private var region: FocusRegion? = null
    private var seedWaiting = 0
    private var seeded = false
    private var watch: FocusWatch? = null
    private var locked: FocusSample? = null
    private var expected: CameraLook? = null
    private var before: CameraLook? = null
    private val readings = ArrayList<Float>(READINGS)
    private var settle = 0
    private var waiting = 0
    private var baselinePending = false
    private var due = 0L
    private var previousSeq = -1L

    init {
        require(settleFrames >= 0)
        require(everyFrames > 0)
    }

    override val state: StateFlow<FocusState> = phase.asStateFlow()
    override val sharpness: StateFlow<Float?> = reading.asStateFlow()

    @Synchronized
    override fun watch(on: Boolean) {
        watched = on
    }

    override val look: StateFlow<CameraLook> get() = port.look
    override val abilities: StateFlow<CameraAbilities?> get() = port.abilities

    override val sweeping: Boolean
        @Synchronized get() =
            sweep != null || locking || candidate != null || seedWaiting > 0 || baselinePending

    @Synchronized
    override fun start() {
        // Ein Tastendruck verdraengt den laufenden Vorgabe-Lock; nur ein anderer Nutzerlauf nicht.
        if (sweeping && byUser) return
        byUser = true
        if (abilities.value?.canFocus != true) {
            phase.value = FocusState.Failed
            return
        }
        before = look.value
        watch = null
        locked = null
        candidate = null
        readings.clear()
        due = 0L
        locking = false
        // Um den Punkt der Kamera herum statt ueber den ganzen Bereich: die neun Feinstufen decken
        // eine Grobstufe nach jeder Seite ab und finden den Gipfel in einem Drittel der Zeit.
        seeded = askDevice()
        seedWaiting = if (seeded) MAX_SEED_FRAMES else 0
        if (seeded) phase.value = FocusState.Seeking else beginSweep()
    }

    /** Den Geraete-Autofokus aufs Brett richten. False, wenn er sich nicht steuern laesst. */
    private fun askDevice(): Boolean {
        val where = region ?: return false
        port.setLook(look.value.copy(focus = null))
        expected = look.value
        settle = settleFrames
        return port.focusOn(where)
    }

    private fun beginSweep() {
        seeded = false
        sweep = FocusSweep()
        phase.value = FocusState.Sweeping(0, requireNotNull(sweep).total + 1)
        apply(0f)
    }

    @Synchronized
    override fun sweep() {
        if (sweeping && byUser) return
        byUser = true
        if (abilities.value?.canFocus != true) {
            phase.value = FocusState.Failed
            return
        }
        before = look.value
        watch = null
        locked = null
        candidate = null
        readings.clear()
        due = 0L
        seedWaiting = 0
        locking = false
        armed = false
        beginSweep()
    }

    @Synchronized
    override fun cancel() {
        // An `sweeping`, nicht am Sweep-Objekt: in der Geraetesuche und in der Bestaetigung
        // ist `sweep` null, `sweeping` aber true — Abbrechen tat dort lautlos nichts und die
        // manuelle Distanz kam nie zurueck, waehrend der Lauf die Linse trotzdem sperrte.
        if (!sweeping) return
        restore(FocusState.Idle)
    }

    /** A user edit wins atomically; never restore an earlier look over it. */
    @Synchronized
    override fun setLook(next: CameraLook) {
        if (next != look.value) {
            val wasSweeping = sweep != null
            clearMeasurement()
            baselinePending = baselinePending || wasSweeping
            settle = settleFrames
            phase.value = FocusState.Idle
        }
        port.setLook(next)
        expected = null
    }

    @Synchronized
    override fun onBoard(
        seq: Long,
        quiet: Boolean,
        region: FocusRegion?,
        board: () -> BgrImage?,
    ): Boolean {
        // A tracker restart resets its sequence, but this governor survives the restart.
        if (seq < previousSeq) due = seq
        previousSeq = seq
        if (region != null) this.region = region
        checkExternalEdit()
        return when {
            settling() -> false
            baselinePending -> {
                baselinePending = false
                true
            }
            seedWaiting > 0 -> awaitDevice()
            locking -> lockStep(board)
            candidate != null -> confirmStep(board)
            sweep != null -> step(requireNotNull(sweep), board)
            armed && canArm() -> armAutoLock()
            else -> watchBoard(seq, quiet, board)
        }
    }

    /**
     * Auf die Konvergenz warten.
     *
     * Der Vorgabe-Lock nimmt den Punkt, wie er ist; "Auto" sucht neun Feinstufen um ihn herum.
     * Bleibt die Konvergenz aus, uebernimmt die volle Reihe.
     */
    private fun awaitDevice(): Boolean {
        val settledAt = port.autoFocus()
        if (settledAt == null) {
            seedWaiting--
            if (seedWaiting <= 0) {
                if (locking) restore(FocusState.Idle) else beginSweep()
            }
            return false
        }
        seedWaiting = 0
        if (locking) {
            apply(settledAt)
            return false
        }
        val run = FocusSweep(around = settledAt)
        sweep = run
        phase.value = FocusState.Sweeping(0, run.total + 1)
        apply(run.next() ?: settledAt)
        return false
    }

    /** Ob der eine automatische Lock jetzt laufen darf. */
    private fun canArm(): Boolean = region != null && look.value.focus == null && locked == null

    /**
     * Der Vorgabefall: Kamera scharfstellen lassen, Ergebnis einfrieren, fertig.
     *
     * Gegen 2026-08-02 abgesichert, wo genau das auf ein noch nicht aufgestelltes Brett scharfstellte:
     * ohne erkannte Brettecken passiert hier nichts.
     */
    private fun armAutoLock(): Boolean {
        byUser = false
        before = look.value
        // Erst NACH der Zusage entwaffnen: ein abgelehnter Versuch (Kamera noch nicht gebunden,
        // Region verweigert) toetete sonst den einen Vorgabe-Lock bis zum Prozessende, und der
        // Regler ueberlebt einen Tracker-Neustart. Den Erfolg haelt `canArm`s `locked == null`.
        if (!askDevice()) return false
        armed = false
        locking = true
        seedWaiting = MAX_SEED_FRAMES
        phase.value = FocusState.Seeking
        return false
    }

    /** Eine Messung an der gestellten Distanz, und die ist der Bezug fuer die Aufsicht. */
    private fun lockStep(board: () -> BgrImage?): Boolean {
        val sharp = sample(board) ?: return false
        val at = look.value.focus ?: return false
        onSample(FocusSample(at, sharp))
        locking = false
        locked = FocusSample(at, sharp)
        watch = FocusWatch(sharp)
        phase.value = FocusState.Locked(at, sharp)
        return true
    }

    private fun confirmStep(board: () -> BgrImage?): Boolean {
        val sharp = sample(board) ?: return false
        val best = requireNotNull(candidate)
        onSample(FocusSample(best.focus, sharp))
        return confirm(best, sharp)
    }

    /**
     * Der Gewinner wird gestellt und muss dort seine EIGENE Zahl wiederholen.
     *
     * Das traegt erst, seit die Probe ihren Startpunkt zuletzt misst und die Wartezeit mit dem Weg
     * waechst: vorher las dieselbe Distanz 131 und dann 104, und die Huerde war eine Muenzwurf.
     */
    private fun pick(best: FocusSample) {
        candidate = best
        against = best.sharpness
        apply(best.focus)
    }

    private fun settling(): Boolean {
        if (sweep != null && !port.focusReady()) {
            waiting++
            if (waiting >= MAX_WAIT_FRAMES) restore(FocusState.Failed)
            settle = settleFrames
            return true
        }
        waiting = 0
        val pending = settle > 0
        if (pending) settle--
        return pending
    }

    private fun checkExternalEdit() {
        val held = expected ?: return
        val current = look.value
        // Exposure regulation continues after locking; it must not silently disable the watch.
        if (current.focus != held.focus || current.zoomRatio != held.zoomRatio) {
            val wasSweeping = sweep != null
            clearMeasurement()
            baselinePending = baselinePending || wasSweeping
            settle = settleFrames
            phase.value = FocusState.Idle
        }
    }

    private fun watchBoard(
        seq: Long,
        quiet: Boolean,
        board: () -> BgrImage?,
    ): Boolean {
        val watching = watch
        val held = locked
        // Die ANZEIGE braucht kein ruhiges Bild, die Weich-Warnung schon: `quiet` haelt sie von
        // Zuegen und Commits fern, sperrte aber auch den Anzeiger auf einem plaudernden Brett.
        val wanted = watched || (watching != null && quiet)
        val raster = if (wanted && seq >= due) board() else null
        if (raster == null) return false
        due = seq + everyFrames
        val sharp = meterSharpness(raster)
        reading.value = sharp
        if (watching == null || held == null || !quiet) return false
        if (watching.observe(sharp)) onSoft(FocusNotice(sharp, watching.reference))
        phase.value =
            if (watching.soft) FocusState.Soft(sharp, watching.reference) else FocusState.Locked(held.focus, held.sharpness)
        return false
    }

    private fun step(
        run: FocusSweep,
        board: () -> BgrImage?,
    ): Boolean {
        val sharp = sample(board) ?: return false
        onSample(FocusSample(requireNotNull(look.value.focus), sharp))
        run.observe(sharp)
        val next = run.next()
        if (next != null) {
            apply(next)
            phase.value = FocusState.Sweeping(run.done, run.total + 1)
        } else {
            sweep = null
            val best = run.best
            if (best == null) {
                // Der lokale Lauf sah nur Unschaerfe: die Kamera stand grob daneben, also die
                // ganze Reihe. `beginSweep` raeumt `seeded` ab, ein zweiter Anlauf entfaellt.
                if (seeded) beginSweep() else restore(FocusState.Failed)
            } else {
                pick(best)
                phase.value = FocusState.Sweeping(run.done, run.total + 1)
            }
        }
        return false
    }

    private fun sample(board: () -> BgrImage?): Float? {
        val raster = board() ?: return null
        readings += meterSharpness(raster)
        if (readings.size < READINGS) return null
        // A single transient frame must not win the search or reject its final confirmation.
        readings.sort()
        val sharp = readings[READINGS / 2]
        readings.clear()
        reading.value = sharp
        return sharp
    }

    private fun confirm(
        best: FocusSample,
        sharp: Float,
    ): Boolean {
        if (sharp < against * CONFIRM_FRACTION) {
            candidate = null
            // Der Punkt der Kamera laesst sich nicht wiederholen — das beantwortet die volle Reihe,
            // nicht ein Fehlschlag. `beginSweep` raeumt `seeded` ab, ein zweiter Anlauf entfaellt.
            if (seeded) beginSweep() else restore(FocusState.Failed)
            return false
        }
        sweep = null
        candidate = null
        locked = FocusSample(best.focus, sharp)
        watch = FocusWatch(sharp)
        phase.value = FocusState.Locked(best.focus, sharp)
        // The final distance has settled AND reproduced its reading before the baseline is reset.
        return true
    }

    private fun restore(state: FocusState) {
        // Only focus belongs to the sweep. Preserve other camera changes made in the meantime.
        val originalFocus = before?.focus
        clearMeasurement()
        port.setLook(look.value.copy(focus = originalFocus))
        baselinePending = true
        settle = settleFrames
        phase.value = state
    }

    private fun clearMeasurement() {
        sweep = null
        locking = false
        byUser = false
        seedWaiting = 0
        seeded = false
        candidate = null
        watch = null
        locked = null
        expected = null
        readings.clear()
    }

    private fun apply(focus: Float) {
        val from = look.value.focus
        port.setLook(look.value.copy(focus = focus))
        expected = look.value
        settle = settleFor(from, focus)
        waiting = 0
    }

    /**
     * Je weiter die Linse faehrt, desto laenger schwingt sie nach — die Metadaten melden schon
     * `STATIONARY`, waehrend das Bild noch weich ist.
     *
     * Gemessen am Geraet 2026-09-09: dieselbe Distanz 0,167 las 68,5 nach einem Grobschritt (0,083)
     * und 105,8 nach einem Feinschritt (0,021); die Bestaetigung sprang 0,0625 und las 29 statt 110.
     */
    private fun settleFor(
        from: Float?,
        to: Float,
    ): Int {
        if (settleFrames == 0) return 0
        val travel = if (from == null) 1f else abs(to - from)
        return (settleFrames + (travel * TRAVEL_FRAMES).roundToInt()).coerceAtMost(MAX_SETTLE_FRAMES)
    }

    private companion object {
        // Drain queued image frames AFTER metadata confirms the requested stationary lens.
        const val SETTLE_FRAMES = 3
        const val WATCH_INTERVAL = 30L
        const val READINGS = 3
        const val MAX_WAIT_FRAMES = 60

        /** Wie lange auf die Kamera gewartet wird, bevor die eigene Reihe uebernimmt. */
        const val MAX_SEED_FRAMES = 45

        /** Zusatzframes fuer die volle Spanne; ein Grobschritt bekommt damit fuenf. */
        const val TRAVEL_FRAMES = 60

        const val MAX_SETTLE_FRAMES = 15

        // Allow measurement noise, but reject a winner that cannot reproduce most of its score.
        const val CONFIRM_FRACTION = 0.8f
    }
}

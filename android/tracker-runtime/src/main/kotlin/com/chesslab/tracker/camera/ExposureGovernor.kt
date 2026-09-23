package com.chesslab.tracker.camera

import com.chesslab.engine.api.BgrImage

/** Sie greift in das Bild ein, aus dem der Tracker liest — der Spieler soll nicht raten, warum es heller wurde. */
data class ExposureNotice(
    val evAboveBase: Double,
)

/** Mit Vorgabe-Nichtstun: eine Belichtungsaenderung mitten im Replay waere eine Eingabe, die in der Datei nicht steht. */
fun interface ExposureGovernor {
    /** `true` heisst: die Pixel-Referenz verwerfen. [board] wird nur ausgewertet, wenn gemessen wird;
     *  `quiet == false` heisst, der Frame beschaeftigte die Engine — dann wird nicht gestellt. */
    fun onBoard(
        seq: Long,
        quiet: Boolean,
        board: () -> BgrImage?,
    ): Boolean

    companion object {
        val NONE = ExposureGovernor { _, _, _ -> false }
    }
}

/** Faehrt traege, weil jede Verstellung die Pixel-Referenz kostet — einen Zug, nicht ein Bild. */
class BoardExposureGovernor(
    private val port: CameraLookPort,
    private val policy: ExposurePolicy = ExposurePolicy(),
    private val everyFrames: Long = DEFAULT_INTERVAL,
    private val holdFrames: Long = DEFAULT_HOLD,
    /** Einmal je Episode, nicht je Schritt. */
    private val onBrighten: (ExposureNotice) -> Unit = {},
) : ExposureGovernor {
    private var state: ExposureState? = null
    private var due = 0L
    private var hold = 0L

    private var baseEv = 0.0

    /** Alles andere kam vom Nutzer. */
    private var lastSet: Int? = null
    private var brightening = false

    val ev: Double? get() = state?.ev

    override fun onBoard(
        seq: Long,
        quiet: Boolean,
        board: () -> BgrImage?,
    ): Boolean {
        // Nicht mitten in einer Zugentscheidung stellen, und eine Weile danach auch nicht: die neue Referenz
        // muss erst stehen.
        if (!quiet) hold = seq + holdFrames
        if (seq < due || seq < hold) return false
        val range = port.abilities.value?.exposure ?: return false
        val raster = board() ?: return false
        due = seq + everyFrames
        // Der Startpunkt ist der Schieber: sonst spraenge der erste Schritt an der Nutzerkorrektur vorbei.
        val look = port.look.value
        if (look.evIndex != lastSet) {
            baseEv = look.evIndex * range.stepEv.toDouble()
            state = null
            brightening = false
        }
        val current = state ?: ExposureState(baseEv)
        val next = nextExposure(current, meterBoard(raster), range.evLimits(), policy, baseEv) ?: return false
        state = next
        val index = range.indexFor(next.ev)
        if (index == look.evIndex) return false
        port.setLook(look.copy(evIndex = index))
        lastSet = index
        announce(next.ev)
        return true
    }

    private fun announce(ev: Double) {
        val lifting = ev > baseEv + policy.deadbandEv
        if (lifting && !brightening) onBrighten(ExposureNotice(ev - baseEv))
        brightening = lifting
    }

    private companion object {
        /** Zwei Sekunden bei 15 fps — schnell genug fuer einen Lichtschalter, traege genug fuers Spiel. */
        const val DEFAULT_INTERVAL = 30L

        const val DEFAULT_HOLD = 60L
    }
}

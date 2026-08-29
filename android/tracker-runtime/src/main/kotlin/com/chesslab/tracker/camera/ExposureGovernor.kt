package com.chesslab.tracker.camera

import com.chesslab.engine.api.BgrImage

/**
 * Wer nach jedem Frame entscheiden darf, ob die Belichtung nachgestellt wird.
 *
 * Eine Schnittstelle mit einem Vorgabe-Nichtstun, damit sich fuer Replay und Clip-Sim nichts
 * aendert: die stellen keine Kamera, und eine Belichtungsaenderung mitten im Replay waere eine
 * Eingabe, die in der Datei nicht steht.
 */
fun interface ExposureGovernor {
    /**
     * `true`, wenn wirklich gestellt wurde — dann muss der Aufrufer die Pixel-Referenz verwerfen.
     *
     * [board] wird nur ausgewertet, wenn ueberhaupt gemessen wird: der Warp ist memoisiert, aber
     * nicht gratis, und die Regelung schaut nur jeden n-ten Frame hin. `quiet == false` heisst,
     * dass dieser Frame die Engine beschaeftigt hat — dann wird nicht gestellt.
     */
    fun onBoard(
        seq: Long,
        quiet: Boolean,
        board: () -> BgrImage?,
    ): Boolean

    companion object {
        val NONE = ExposureGovernor { _, _, _ -> false }
    }
}

/**
 * Die Automatik: misst das Brett, stellt die Belichtungskorrektur, und sagt wann die
 * Referenz hin ist.
 *
 * Sie faehrt traege, weil jede Verstellung die Pixel-Referenz kostet — also einen Zug und
 * nicht ein Bild (`docs/board-exposure.md`).
 */
class BoardExposureGovernor(
    private val port: CameraLookPort,
    private val policy: ExposurePolicy = ExposurePolicy(),
    private val everyFrames: Long = DEFAULT_INTERVAL,
    /** So lange nach einem unruhigen Frame bleibt die Regelung still. */
    private val holdFrames: Long = DEFAULT_HOLD,
) : ExposureGovernor {
    private var state: ExposureState? = null
    private var due = 0L
    private var hold = 0L

    /** Der zuletzt gestellte Versatz in EV, oder null solange die Regelung nichts getan hat. */
    val ev: Double? get() = state?.ev

    override fun onBoard(
        seq: Long,
        quiet: Boolean,
        board: () -> BgrImage?,
    ): Boolean {
        // Nicht mitten in einer Zugentscheidung stellen: die Pixel-Referenz danach zu verwerfen
        // heisst, dem Entscheidungspfad genau die Grundlage wegzuziehen, auf der er rechnet. Und
        // nicht nur waehrenddessen — auch eine Weile danach, damit die neue Referenz erst steht.
        if (!quiet) hold = seq + holdFrames
        if (seq < due || seq < hold) return false
        val range = port.abilities.value?.exposure ?: return false
        val raster = board() ?: return false
        due = seq + everyFrames
        // Der Startpunkt ist, was auf dem Schieber steht — sonst spraenge der erste Schritt an
        // einer vom Nutzer gesetzten Korrektur vorbei.
        val current = state ?: ExposureState(port.look.value.evIndex * range.stepEv.toDouble())
        val next = nextExposure(current, meterBoard(raster), range.evLimits(), policy) ?: return false
        state = next
        val index = range.indexFor(next.ev)
        if (index == port.look.value.evIndex) return false
        port.setLook(port.look.value.copy(evIndex = index))
        return true
    }

    private companion object {
        /** Zwei Sekunden bei 15 fps — schnell genug fuer einen Lichtschalter, traege genug fuers Spiel. */
        const val DEFAULT_INTERVAL = 30L

        /** Vier Sekunden Ruhe nach einem Ereignis, bevor wieder gestellt werden darf. */
        const val DEFAULT_HOLD = 60L
    }
}

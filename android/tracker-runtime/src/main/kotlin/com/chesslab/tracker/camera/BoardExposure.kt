package com.chesslab.tracker.camera

import kotlin.math.abs
import kotlin.math.ln
import kotlin.math.pow
import kotlin.math.roundToInt

/**
 * Belichtung, die das BRETT misst statt des Bildes — `docs/board-exposure.md`.
 *
 * Die Geraete-Automatik hat eine Zahl fuer den ganzen Rahmen, ein Frame spannt aber 11- bis
 * 163-fach. Gestellt wird die Belichtungskorrektur und nicht Zeit/ISO: manuell faellt die
 * ISP-Verstaerkung weg, und das kostete live 23 luma-Punkte.
 */
data class ExposureReading(
    /** Mittelwerte der 64 Felder auf dem rektifizierten Brett, in den 8-bit-Werten des Frames. */
    val cellMeans: FloatArray,
    /** Der Brett-Pixelwert am oberen Perzentil, das [ExposurePolicy.clipCap] noch zulaesst. */
    val highlightLevel: Float,
    /** Anteil der Brettpixel bei/ueber [CLIP_LEVEL]. */
    val clippedFraction: Float,
) {
    init {
        require(cellMeans.size == CELLS) { "erwarte $CELLS Felder, bekam ${cellMeans.size}" }
    }

    fun darkFraction(floor: Float): Float = cellMeans.count { it < floor } / CELLS.toFloat()

    override fun equals(other: Any?): Boolean =
        this === other ||
            (
                other is ExposureReading &&
                    cellMeans.contentEquals(other.cellMeans) &&
                    highlightLevel == other.highlightLevel &&
                    clippedFraction == other.clippedFraction
            )

    override fun hashCode(): Int = 31 * (31 * cellMeans.contentHashCode() + highlightLevel.hashCode()) + clippedFraction.hashCode()

    companion object {
        const val CELLS = 64

        /** Ab hier ist ein Pixel ausgebrannt und traegt gar nichts mehr. */
        const val CLIP_LEVEL = 250f
    }
}

/** Die Regel. Jede Zahl ist ein benannter Handel, kein Geschmack. */
data class ExposurePolicy(
    /** Unter diesem Mittelwert gilt ein Feld als nicht mehr lesbar. */
    val floor: Float = 34f,
    /** So viel Saettigung ist der Preis, den Aufhellen kosten darf. */
    val clipCap: Float = 0.02f,
    /** Unter diesem Anteil dunkler Felder ist nichts mehr zu holen. */
    val darkTarget: Float = 0.05f,
    /** Groesster Sprung je Schritt in EV — langsam, weil jeder Schritt die Pixel-Referenz kostet. */
    val maxStepEv: Double = 0.7,
    /** Unter diesem Betrag wird NICHT gestellt, in EV. */
    val deadbandEv: Double = 0.25,
    /** So weit faellt die Sperrklinke je Schritt, solange die Saettigung ueber der Schranke liegt. */
    val clipBackoffEv: Double = 0.4,
    /**
     * So viel Luft muss der Spitzenwert zeigen, damit die Klinke wieder aufmacht — das heisst "die
     * Szene ist dunkler geworden", nicht "ich haette gern mehr Licht".
     */
    val ceilingRelease: Float = 0.85f,
    /**
     * Die Kennlinie des Bildes: der Frame ist gamma-codiert, die Belichtung linear. Ein Feld von
     * 12 auf 34 kostet 3,4 EV und nicht 1,5; ohne das stellt die Regelung zu wenig.
     */
    val gamma: Double = 2.2,
)

/**
 * Stellwert in EV plus Sperrklinke.
 *
 * Die Klinke ist noetig, weil Saettigung die Information zerstoert, die man zum Gegensteuern
 * braeuchte — ein Regler pendelte hier (`docs/board-exposure.md`).
 */
data class ExposureState(
    val ev: Double = 0.0,
    val ceilingEv: Double = Double.MAX_VALUE,
)

/**
 * Der naechste Stellwert, oder `null` wenn nichts zu tun ist.
 *
 * `null` ist der haeufige und der wichtige Fall: jede Aenderung kostet die Pixel-Referenz, also
 * Totband und Schrittdeckel statt eines Reglers, der jeden Frame nachfuehrt. [baseEv] ist der
 * Boden des Nutzers — die Regelung hellt darueber auf und blendet nie darunter ab.
 */
fun nextExposure(
    state: ExposureState,
    reading: ExposureReading,
    limitEv: ClosedFloatingPointRange<Double>,
    policy: ExposurePolicy = ExposurePolicy(),
    baseEv: Double = limitEv.start,
): ExposureState? {
    val ceiling = updatedCeiling(state, reading, policy)
    // Die Klinke begrenzt nur die EIGENE Aufhellung: sie blendete sonst ein gut belichtetes Brett
    // ab, sobald Spitzlichter ueber `clipCap` lagen (`docs/board-exposure.md`, 2026-08-30).
    val floorEv = maxOf(limitEv.start, baseEv)
    val wanted = minOf(state.ev + desiredStepEv(reading, policy), ceiling).coerceIn(floorEv, limitEv.endInclusive)
    val step = wanted - state.ev
    if (abs(step) <= policy.deadbandEv) {
        return state.copy(ceilingEv = ceiling).takeIf { it.ceilingEv != state.ceilingEv }
    }
    val next = (state.ev + step.coerceIn(-policy.maxStepEv, policy.maxStepEv)).coerceIn(floorEv, limitEv.endInclusive)
    return ExposureState(next, ceiling).takeIf { it.ev != state.ev }
}

/**
 * Die Klinke: faellt bei Saettigung, oeffnet nur bei echter Luft in den Spitzlichtern.
 *
 * Das Oeffnen haengt am gemessenen Spitzenwert und NICHT am Aufhellwunsch — sonst waere es
 * derselbe Regelkreis wie vorher, nur langsamer.
 */
private fun updatedCeiling(
    state: ExposureState,
    reading: ExposureReading,
    policy: ExposurePolicy,
): Double =
    when {
        reading.clippedFraction > policy.clipCap -> minOf(state.ceilingEv, state.ev - policy.clipBackoffEv)
        reading.highlightLevel < ExposureReading.CLIP_LEVEL * policy.ceilingRelease -> Double.MAX_VALUE
        else -> state.ceilingEv
    }

/**
 * Um wie viel EV das Licht daneben liegt.
 *
 * Die Luft in den Spitzlichtern ist eine DECKE, keine Gegenkorrektur — `min(Wunsch, Decke)` hat
 * einen Fixpunkt. Aufgehellt wird auf ein Perzentil, nicht auf das dunkelste Feld.
 */
private fun desiredStepEv(
    reading: ExposureReading,
    policy: ExposurePolicy,
): Double {
    val headroom = evFor(ExposureReading.CLIP_LEVEL, reading.highlightLevel, policy)
    if (reading.darkFraction(policy.floor) <= policy.darkTarget) return minOf(0.0, headroom)
    val at = reading.cellMeans.sorted()[(ExposureReading.CELLS * DARK_PERCENTILE).toInt()]
    return minOf(evFor(policy.floor, at, policy), headroom)
}

/** Wie viele EV ein gamma-codierter Wert braucht, um [target] zu erreichen. */
private fun evFor(
    target: Float,
    current: Float,
    policy: ExposurePolicy,
): Double = policy.gamma * ln(target.toDouble() / current.toDouble().coerceAtLeast(1.0)) / LN2

/**
 * Der Index, den die Belichtungskorrektur des Geraets dafuer braucht.
 *
 * Der Schritt ist eine GERAETEeigenschaft und keine Blende: auf diesem Telefon ist er 1/6 EV, also
 * bedeutet der beworbene Bereich [-24, 24] genau +-4 EV (siehe [ExposureRange]).
 */
fun ExposureRange.indexFor(ev: Double): Int = (ev / stepEv).roundToInt().coerceIn(indices.first, indices.last)

/** Was dieser Bereich an EV hergibt — die Grenzen, gegen die [nextExposure] klemmt. */
fun ExposureRange.evLimits(): ClosedFloatingPointRange<Double> = (indices.first * stepEv).toDouble()..(indices.last * stepEv).toDouble()

/** Nur fuer Tests und Simulation: der Lichtfaktor hinter einem EV-Versatz. */
internal fun lightOf(ev: Double): Double = 2.0.pow(ev)

private const val DARK_PERCENTILE = 0.12
private val LN2 = ln(2.0)

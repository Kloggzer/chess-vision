package com.chesslab.tracker.camera

import kotlin.math.abs
import kotlin.math.ln
import kotlin.math.roundToInt

/** Belichtung, die das BRETT misst statt des Bildes — `docs/camera.md`. Gestellt wird die Korrektur, nicht
 *  Zeit/ISO: manuell faellt die ISP-Verstaerkung weg, und das kostete live 23 luma-Punkte. */
data class ExposureReading(
    val cellMeans: FloatArray,
    /** Der Brett-Pixelwert am oberen Perzentil, das [ExposurePolicy.clipCap] noch zulaesst. */
    val highlightLevel: Float,
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

        const val CLIP_LEVEL = 250f
    }
}

data class ExposurePolicy(
    val floor: Float = 34f,
    /** So viel Saettigung ist der Preis, den Aufhellen kosten darf. */
    val clipCap: Float = 0.02f,
    /** Unter diesem Anteil dunkler Felder ist nichts mehr zu holen. */
    val darkTarget: Float = 0.05f,
    /** Langsam, weil jeder Schritt die Pixel-Referenz kostet. */
    val maxStepEv: Double = 0.7,
    val deadbandEv: Double = 0.25,
    val clipBackoffEv: Double = 0.4,
    /** Luft im Spitzenwert heisst "die Szene ist dunkler geworden", nicht "ich haette gern mehr Licht". */
    val ceilingRelease: Float = 0.85f,
    /** Der Frame ist gamma-codiert, die Belichtung linear: 12 auf 34 kostet 3,4 EV und nicht 1,5. */
    val gamma: Double = 2.2,
)

/** Die Sperrklinke ist noetig, weil Saettigung die Information zerstoert, die man zum Gegensteuern braeuchte —
 *  ein Regler pendelte hier. */
data class ExposureState(
    val ev: Double = 0.0,
    val ceilingEv: Double = Double.MAX_VALUE,
)

/** `null` ist der haeufige Fall: jede Aenderung kostet die Pixel-Referenz. [baseEv] ist der Boden des Nutzers —
 *  die Regelung hellt darueber auf und blendet nie darunter ab. */
fun nextExposure(
    state: ExposureState,
    reading: ExposureReading,
    limitEv: ClosedFloatingPointRange<Double>,
    policy: ExposurePolicy = ExposurePolicy(),
    baseEv: Double = limitEv.start,
): ExposureState? {
    val ceiling = updatedCeiling(state, reading, policy)
    // Die Klinke begrenzt nur die EIGENE Aufhellung: sonst blendete sie ein gut belichtetes Brett ab.
    val floorEv = maxOf(limitEv.start, baseEv)
    val wanted = minOf(state.ev + desiredStepEv(reading, policy), ceiling).coerceIn(floorEv, limitEv.endInclusive)
    val step = wanted - state.ev
    if (abs(step) <= policy.deadbandEv) {
        return state.copy(ceilingEv = ceiling).takeIf { it.ceilingEv != state.ceilingEv }
    }
    val next = (state.ev + step.coerceIn(-policy.maxStepEv, policy.maxStepEv)).coerceIn(floorEv, limitEv.endInclusive)
    return ExposureState(next, ceiling).takeIf { it.ev != state.ev }
}

/** Das Oeffnen haengt am gemessenen Spitzenwert, NICHT am Aufhellwunsch — sonst derselbe Regelkreis, nur langsamer. */
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

/** Die Luft in den Spitzlichtern ist eine DECKE, keine Gegenkorrektur: `min(Wunsch, Decke)` hat einen Fixpunkt. */
private fun desiredStepEv(
    reading: ExposureReading,
    policy: ExposurePolicy,
): Double {
    val headroom = evFor(ExposureReading.CLIP_LEVEL, reading.highlightLevel, policy)
    if (reading.darkFraction(policy.floor) <= policy.darkTarget) return minOf(0.0, headroom)
    // DASSELBE Perzentil, an dem entschieden wird: ein eigenes traf eine helle Ankerzelle und blendete ab.
    val at = reading.cellMeans.sorted()[(ExposureReading.CELLS * policy.darkTarget).toInt()]
    return minOf(evFor(policy.floor, at, policy), headroom)
}

private fun evFor(
    target: Float,
    current: Float,
    policy: ExposurePolicy,
): Double = policy.gamma * ln(target.toDouble() / current.toDouble().coerceAtLeast(1.0)) / LN2

/** Der Schritt ist eine GERAETEeigenschaft: auf diesem Telefon 1/6 EV, also [-24, 24] genau +-4 EV. */
fun ExposureRange.indexFor(ev: Double): Int = (ev / stepEv).roundToInt().coerceIn(indices.first, indices.last)

fun ExposureRange.evLimits(): ClosedFloatingPointRange<Double> = (indices.first * stepEv).toDouble()..(indices.last * stepEv).toDouble()

private val LN2 = ln(2.0)
